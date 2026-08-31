import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useStore } from "../state/store";
import { live } from "../state/live";
import { RS_SCENE, sysScaleFor, mapRsToScene, PHOTON_RS, DISK_INNER_RS } from "../physics/constants";
import { computeTrajectory, type Trajectory } from "../physics/engine";

/* ── Probe — real integrated trajectory (Paczyński–Wiita) ────────────── */

export function ProbeSystem() {
  const seq = useStore((s) => s.probeSeq);
  const cleared = useStore((s) => s.probeTrailCleared);
  const groupRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Mesh>(null!);
  const trajRef = useRef<Trajectory | null>(null);
  const playT = useRef(0);
  const playing = useRef(false);

  const [geo, lineObj] = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    g.setDrawRange(0, 0);
    const m = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xffd9a0),
      transparent: true,
      opacity: 0.65,
    });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return [g, l];
  }, []);

  useEffect(() => () => { geo.dispose(); (lineObj.material as THREE.Material).dispose(); }, [geo, lineObj]);

  useEffect(() => {
    if (seq === 0) return;
    const p = useStore.getState().probeParams;
    const traj = computeTrajectory(p);
    trajRef.current = traj;
    const pos = new Float32Array(traj.count * 3);
    for (let i = 0; i < traj.count; i++) {
      pos[i * 3] = traj.points[i * 2];
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = traj.points[i * 2 + 1];
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setDrawRange(0, 0);
    playT.current = 0;
    playing.current = true;
    useStore.getState().patch({ probeOutcome: null });
  }, [seq, geo]);

  useEffect(() => {
    if (cleared === 0) return;
    geo.setDrawRange(0, 0);
    playT.current = 0;
    playing.current = false;
    trajRef.current = null;
    useStore.getState().patch({ probeOutcome: null });
    if (headRef.current) headRef.current.visible = false;
  }, [cleared, geo]);

  useFrame((_, delta) => {
    const st = useStore.getState();
    const s = sysScaleFor(st.massSolar);
    groupRef.current.scale.setScalar(RS_SCENE * s);
    groupRef.current.visible = st.probeOpen || playing.current;
    if (!playing.current || !trajRef.current || st.paused) return;

    const traj = trajRef.current;
    const speed = traj.totalT / 14; // play full path in ~14 s
    playT.current += delta * speed;
    const idx = Math.min(Math.floor(playT.current / traj.h), traj.count - 1);
    geo.setDrawRange(0, idx + 1);

    const px = traj.points[idx * 2];
    const pz = traj.points[idx * 2 + 1];
    headRef.current.position.set(px, 0, pz);
    headRef.current.visible = true;

    if (idx >= traj.count - 1) {
      playing.current = false;
      st.patch({ probeOutcome: traj.outcome });
    } else if (st.probeOutcome !== "RUNNING" && idx > 10) {
      st.patch({ probeOutcome: "RUNNING" });
    }
  });

  return (
    <group ref={groupRef} rotation={[0.24, 0, 0.1]}>
      <primitive object={lineObj} />
      <mesh ref={headRef} visible={false}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial color={0xffffff} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ── Tidal differential — schematic probe with field arrows ──────────── */

function TidalArrow({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.64, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <coneGeometry args={[0.055, 0.18, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function TidalViz() {
  const on = useStore((s) => s.tidalViz);
  const group = useRef<THREE.Group>(null!);
  const arrows = [useRef<THREE.Group>(null!), useRef<THREE.Group>(null!), useRef<THREE.Group>(null!)];
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    group.current.visible = on;
    if (!on) return;
    const s = sysScaleFor(useStore.getState().massSolar);
    const rRs = Math.max(live.distRs * 0.94, 1.6);
    const R = mapRsToScene(rRs, s);
    const az = Math.atan2(camera.position.z, camera.position.x) + 0.85;
    group.current.position.set(Math.cos(az) * R, R * 0.24, Math.sin(az) * R);

    dir.copy(group.current.position).multiplyScalar(-1).normalize();
    q.setFromUnitVectors(up, dir);
    const offsets = [0.55, 0, -0.55]; // toward BH, center, away
    for (let i = 0; i < 3; i++) {
      const rr = R + offsets[i] * s;
      // exaggerate the differential so it is legible (schematic, not to scale)
      const gRel = Math.pow(R / Math.max(rr, 0.5), 2);
      const L = 0.35 + (gRel - 0.6) * 1.15;
      const a = arrows[i].current;
      a.position.copy(dir).multiplyScalar(offsets[i] * s);
      a.quaternion.copy(q);
      a.scale.setScalar(Math.max(0.2, L));
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[0.1, 0.1, 1.4]} />
        <meshBasicMaterial color={0x8b8b92} toneMapped={false} />
      </mesh>
      <group ref={arrows[0]}><TidalArrow color="#ff5a3c" /></group>
      <group ref={arrows[1]}><TidalArrow color="#e8e6e1" /></group>
      <group ref={arrows[2]}><TidalArrow color="#9fc4ff" /></group>
      <Html position={[0, 1.15, 0]} center zIndexRange={[20, 0]}>
        <div className="hud-label whitespace-nowrap" style={{ color: "var(--dim)" }}>
          TIDAL DIFFERENTIAL · SCHEMATIC
        </div>
      </Html>
    </group>
  );
}

/* ── Ghost ring — linked to graph hover ──────────────────────────────── */

export function GhostRing() {
  const ref = useRef<THREE.LineLoop>(null!);
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(() => {
    const st = useStore.getState();
    const hr = st.graphHoverRs;
    const show = hr !== null && st.phase === "sim";
    ref.current.visible = show;
    if (show && hr) {
      const s = sysScaleFor(st.massSolar);
      ref.current.scale.setScalar(mapRsToScene(hr, s));
    }
  });

  return (
    <lineLoop ref={ref} geometry={geo} visible={false}>
      <lineBasicMaterial color={0x9fc4ff} transparent opacity={0.55} toneMapped={false} />
    </lineLoop>
  );
}

/* ── Observatory coordinate grid ─────────────────────────────────────── */

function circle(rs: number, color: string, opacity: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * rs * RS_SCENE, 0, Math.sin(a) * rs * RS_SCENE));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false });
  return new THREE.LineLoop(g, m);
}

export function ObservatoryGrid() {
  const on = useStore((s) => s.observatory);
  const group = useRef<THREE.Group>(null!);

  const items = useMemo(() => {
    const arr: THREE.Object3D[] = [
      circle(1, "#ff6b35", 0.5),
      circle(PHOTON_RS, "#9fc4ff", 0.4),
      circle(DISK_INNER_RS, "#ff9a3c", 0.35),
      circle(6, "#52525a", 0.3),
      circle(10, "#52525a", 0.28),
      circle(20, "#52525a", 0.24),
      circle(40, "#3a3a40", 0.2),
    ];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(Math.cos(a) * RS_SCENE, 0, Math.sin(a) * RS_SCENE),
        new THREE.Vector3(Math.cos(a) * 40 * RS_SCENE, 0, Math.sin(a) * 40 * RS_SCENE),
      ];
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({ color: "#3a3a40", transparent: true, opacity: 0.16, toneMapped: false });
      arr.push(new THREE.Line(g, m));
    }
    return arr;
  }, []);

  useEffect(() => () => {
    items.forEach((o) => {
      const l = o as THREE.Line;
      l.geometry?.dispose();
      (l.material as THREE.Material)?.dispose?.();
    });
  }, [items]);

  useFrame(() => {
    group.current.visible = on;
    if (on) group.current.scale.setScalar(sysScaleFor(useStore.getState().massSolar));
  });

  return (
    <group ref={group}>
      {items.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
      {on && (
        <>
          <Html position={[RS_SCENE * 1.06, 0.2, 0]} zIndexRange={[20, 0]}>
            <span className="hud-label" style={{ color: "#ff6b35" }}>HORIZON 1 Rs</span>
          </Html>
          <Html position={[PHOTON_RS * RS_SCENE * 1.06, 0.2, 0]} zIndexRange={[20, 0]}>
            <span className="hud-label" style={{ color: "#9fc4ff" }}>PHOTON 1.5</span>
          </Html>
          <Html position={[DISK_INNER_RS * RS_SCENE * 1.04, 0.2, 0]} zIndexRange={[20, 0]}>
            <span className="hud-label" style={{ color: "#ff9a3c" }}>ISCO 3</span>
          </Html>
        </>
      )}
    </group>
  );
}
