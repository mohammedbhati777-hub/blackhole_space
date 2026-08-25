import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useStore } from "../state/store";
import { live } from "../state/live";
import {
  mapRsToScene, sceneToRs, sysScaleFor, damp, smoothstep, clamp,
  MIN_DIST_RS,
} from "../physics/constants";
import {
  schwarzschildRadiusM, gravAccel, escapeVelocity, dilationFactor,
  tidalAccel, regionFor,
} from "../physics/engine";
import { sound } from "../audio/sound";

export default function CameraRig() {
  const controls = useRef<any>(null);
  const fovRef = useRef(50);
  const entryRef = useRef<{ t: number; from: number } | null>(null);
  const horizonSounded = useRef(false);
  /* cinematic staging — off-center framing + slow parallax drift in the intro */
  const offRef = useRef(0.17);
  const angRef = useRef(0);
  const angPrev = useRef(0);
  const tgt = useRef(new THREE.Vector3(-16, 4, 0));
  const Y_AXIS = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const rel = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const st = useStore.getState();
    const cam = state.camera as THREE.PerspectiveCamera;
    const ctl = controls.current;
    if (!ctl) return;

    const s = sysScaleFor(st.massSolar);
    live.sysScale = s;
    live.massSolar = st.massSolar;

    ctl.minDistance = 2.04 * s;
    ctl.maxDistance = 118 * s;

    /* entry dolly: far space → 90 Rs */
    if (st.phase === "entering") {
      if (!entryRef.current) entryRef.current = { t: 0, from: cam.position.length() };
      entryRef.current.t += dt / 5.6;
      const k = smoothstep(0, 1, Math.min(entryRef.current.t, 1));
      const ease = k * k * (3 - 2 * k);
      const target = mapRsToScene(100, s);
      const r = THREE.MathUtils.lerp(entryRef.current.from, target, ease);
      cam.position.setLength(Math.max(r, 2.1 * s));
      if (entryRef.current.t >= 1) {
        entryRef.current = null;
        st.finishEntry();
      }
    }

    /* eased radial follow of targetDistRs */
    if (st.phase === "sim") {
      if (st.approach && !st.paused) {
        const rate = 0.24 * st.approachSpeed * (live.distRs < 6 ? 0.55 : 1);
        const next = st.targetDistRs * Math.exp(-dt * rate);
        if (next <= MIN_DIST_RS + 0.001) {
          st.patch({ targetDistRs: MIN_DIST_RS, approach: false, horizonHold: true });
          sound.warn();
        } else {
          st.patch({ targetDistRs: next });
        }
      }
      const desired = mapRsToScene(clamp(st.targetDistRs, MIN_DIST_RS, 1000), s);
      const cur = cam.position.length();
      if (Math.abs(cur - desired) > 0.002 * cur) {
        const next = damp(cur, desired, st.approach ? 1.1 : 2.6, dt);
        cam.position.multiplyScalar(next / cur);
      }
    }

    /* soft clamp inside controls bounds (prevents snapping when mass rescales space) */
    {
      const r0 = cam.position.length();
      const lo = 2.05 * s, hi = 117 * s;
      if (r0 < lo) cam.position.multiplyScalar(damp(r0, lo, 4, dt) / r0);
      else if (r0 > hi) cam.position.multiplyScalar(damp(r0, hi, 4, dt) / r0);
    }

    /* ── intro staging: frame the anomaly right of center, drift, then
          swing back to dead-center as we fall in ── */
    {
      const R = cam.position.length();
      const isIntro = st.phase === "intro";
      offRef.current = damp(offRef.current, isIntro ? 0.17 : 0, isIntro ? 0.7 : 0.85, dt);
      const t = state.clock.elapsedTime;
      angRef.current = damp(angRef.current, isIntro ? Math.sin(t * 0.055) * 0.11 + 0.045 : 0, 0.8, dt);
      tgt.current.x = damp(tgt.current.x, -offRef.current * R, 2.2, dt);
      tgt.current.y = damp(tgt.current.y, offRef.current * R * 0.24, 2.2, dt);
      tgt.current.z = damp(tgt.current.z, 0, 2.2, dt);
      ctl.target.copy(tgt.current);

      const dAng = angRef.current - angPrev.current;
      angPrev.current = angRef.current;
      if (Math.abs(dAng) > 1e-6) {
        rel.copy(cam.position).sub(tgt.current).applyAxisAngle(Y_AXIS, dAng);
        cam.position.copy(rel.add(tgt.current));
      }
    }

    ctl.update();

    /* derive proper distance from camera radius */
    const radius = cam.position.length();
    const distRs = sceneToRs(radius, s);
    live.distRs = distRs;
    live.sceneRadius = radius;

    /* FOV — widens as you fall, with a velocity punch on entry */
    let fovTarget = 47 + 26 * smoothstep(24, 3.2, distRs);
    if (st.phase === "entering" && entryRef.current) {
      fovTarget += Math.sin(Math.min(entryRef.current.t, 1) * Math.PI) * 11;
    }
    fovRef.current = damp(fovRef.current, fovTarget, 2.0, dt);
    if (Math.abs(cam.fov - fovRef.current) > 0.02) {
      cam.fov = fovRef.current;
      cam.updateProjectionMatrix();
    }

    /* physics → telemetry bus (SI) */
    const rsM = schwarzschildRadiusM(st.massSolar);
    const rM = distRs * rsM;
    live.rsKm = rsM / 1000;
    live.rKm = rM / 1000;
    live.g = gravAccel(st.massSolar, rM);
    const ve = escapeVelocity(st.massSolar, rM);
    live.ve = ve;
    live.veC = ve / 299792458;
    live.dilation = dilationFactor(distRs);
    live.tidal = tidalAccel(st.massSolar, rM, 2);
    live.region = regionFor(distRs);
    live.fps = damp(live.fps, 1 / Math.max(rawDelta, 1e-4), 2, dt);

    if (!st.paused) {
      live.farTime += dt;
      live.localTime += dt * live.dilation;
    }

    if (live.region === "EVENT HORIZON" && !horizonSounded.current) {
      horizonSounded.current = true;
    }
    if (live.region !== "EVENT HORIZON") horizonSounded.current = false;
  });

  /* user wheel/drag → keep target in sync with actual camera radius */
  const syncFromUser = () => {
    const st = useStore.getState();
    if (st.phase !== "sim" || st.approach || st.expo) return;
    const cam = (controls.current as any)?.object as THREE.PerspectiveCamera | undefined;
    if (!cam) return;
    const d = sceneToRs(cam.position.length(), sysScaleFor(st.massSolar));
    if (Math.abs(d - st.targetDistRs) / st.targetDistRs > 0.004) {
      st.patch({ targetDistRs: clamp(d, MIN_DIST_RS, 1000), horizonHold: false });
    }
  };

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      minDistance={2.1}
      maxDistance={118}
      onChange={syncFromUser}
    />
  );
}
