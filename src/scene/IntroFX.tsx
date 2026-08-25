import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { RS_SCENE, SHADOW_RS, sysScaleFor, damp } from "../physics/constants";

/* ── Infalling dust — ambient matter drifting into the well.
      During the entry dolly it accelerates and brightens, reading as
      stars rushing past the hull. ── */

function InfallDust() {
  const N = 620;
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xbcd3ff,
        size: 0.34,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const geo = useMemo(() => {
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 18 + Math.random() * 132;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.55; // flatten toward the disk plane
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const vel = useMemo(() => {
    const v = new Float32Array(N);
    for (let i = 0; i < N; i++) v[i] = 3.2 + Math.random() * 4.5;
    return v;
  }, [geo]);

  const mult = useRef(1);

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const phase = useStore.getState().phase;
    mult.current = damp(mult.current, phase === "entering" ? 9 : 1, phase === "entering" ? 2.4 : 1.2, dt);
    mat.opacity = damp(mat.opacity, phase === "entering" ? 0.75 : 0.3, 2, dt);
    mat.size = damp(mat.size, phase === "entering" ? 0.62 : 0.34, 2, dt);

    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < N; i++) {
      const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2];
      const r = Math.sqrt(x * x + y * y + z * z) || 1;
      const step = (vel[i] * mult.current * dt) / r; // faster deeper in the well
      const k = 1 - step;
      let nx = x * k, ny = y * k, nz = z * k;
      const nrr = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nrr < 5) {
        const rr = 130 + Math.random() * 25;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        nx = rr * Math.sin(ph) * Math.cos(th);
        ny = rr * Math.cos(ph) * 0.55;
        nz = rr * Math.sin(ph) * Math.sin(th);
      }
      arr[i * 3] = nx; arr[i * 3 + 1] = ny; arr[i * 3 + 2] = nz;
    }
    attr.needsUpdate = true;
    void state;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/* ── Instrument lock-on reticle around the anomaly ── */

function LockReticle() {
  const group = useRef<THREE.Group>(null!);
  const brackets = useRef<THREE.Group>(null!);
  const age = useRef(0);
  const fade = useRef(0);

  const { circleMat, tickMat, mats, geos } = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    const circlePts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      // dashed look: drop every 5th segment via gaps
      const a = (i / 160) * Math.PI * 2;
      circlePts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePts);
    geos.push(circleGeo);
    const circleMat = new THREE.LineBasicMaterial({ color: 0xe8e6e1, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });

    const tickPts: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const long = i % 6 === 0;
      tickPts.push(new THREE.Vector3(Math.cos(a) * 1.04, 0, Math.sin(a) * 1.04));
      tickPts.push(new THREE.Vector3(Math.cos(a) * (long ? 1.16 : 1.09), 0, Math.sin(a) * (long ? 1.16 : 1.09)));
    }
    const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPts);
    geos.push(tickGeo);
    const tickMat = new THREE.LineBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });

    const brGeo = new THREE.BufferGeometry();
    const b = 1.32, l = 0.24;
    const corners: number[] = [];
    for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const) {
      corners.push(sx * (b - l), 0, sz * b, sx * b, 0, sz * b, sx * b, 0, sz * (b - l));
    }
    brGeo.setAttribute("position", new THREE.Float32BufferAttribute(corners, 3));
    geos.push(brGeo);
    const brMat = new THREE.LineBasicMaterial({ color: 0xe8e6e1, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });

    return { circleMat, tickMat, mats: [circleMat, tickMat, brMat], geos, brGeo };
  }, []);

  useEffect(() => () => { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); }, [geos, mats]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    age.current += dt;
    const st = useStore.getState();
    const target = age.current > 2.4 && (st.phase === "intro" || st.phase === "entering") ? 1 : 0;
    fade.current = damp(fade.current, target, 2.2, dt);

    const s = sysScaleFor(st.massSolar);
    group.current.scale.setScalar(SHADOW_RS * RS_SCENE * s * 1.75);
    group.current.visible = fade.current > 0.02;
    group.current.rotation.y += dt * 0.1;
    brackets.current.rotation.y -= dt * 0.22;

    const pulse = 0.72 + 0.28 * Math.sin(state.clock.elapsedTime * 2.1);
    circleMat.opacity = fade.current * 0.4 * pulse;
    tickMat.opacity = fade.current * 0.8 * pulse;
    mats[2].opacity = fade.current * 0.55;
  });

  return (
    <group ref={group} visible={false}>
      <lineLoop geometry={geos[0]} material={circleMat} />
      <lineSegments geometry={geos[1]} material={tickMat} />
      <group ref={brackets}>
        <lineSegments geometry={geos[2]} material={mats[2]} />
      </group>
    </group>
  );
}

export default function IntroFX() {
  return (
    <>
      <InfallDust />
      <LockReticle />
    </>
  );
}
