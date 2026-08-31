import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useStore, type LabelKey } from "../state/store";
import { RS_SCENE, PHOTON_RS, DISK_OUTER_RS, sysScaleFor } from "../physics/constants";
import { sound } from "../audio/sound";

const DEFS: { key: LabelKey; text: string; pos: [number, number, number] }[] = [
  { key: "horizon", text: "EVENT HORIZON", pos: [0, RS_SCENE * 1.55, 0] },
  { key: "disk", text: "ACCRETION DISK", pos: [DISK_OUTER_RS * RS_SCENE * 0.74, 0.35, DISK_OUTER_RS * RS_SCENE * 0.52] },
  { key: "photon", text: "PHOTON REGION", pos: [-PHOTON_RS * RS_SCENE * 0.95, RS_SCENE * 1.02, PHOTON_RS * RS_SCENE * 0.6] },
  { key: "lensing", text: "GRAVITATIONAL LENSING", pos: [-RS_SCENE * 3.4, RS_SCENE * 2.1, -RS_SCENE * 1.6] },
];

export default function Labels3D() {
  const on = useStore((s) => s.labels3d);
  const phase = useStore((s) => s.phase);
  const setInfo = useStore((s) => s.patch);
  const group = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (group.current) group.current.scale.setScalar(sysScaleFor(useStore.getState().massSolar));
  });

  if (!on || phase === "intro") return null;

  return (
    <group ref={group}>
      {DEFS.map((d) => (
        <Html key={d.key} position={d.pos} center zIndexRange={[20, 0]}>
          <button
            onClick={() => {
              sound.click();
              setInfo({ labelInfo: d.key });
            }}
            className="group flex items-center gap-2 cursor-pointer"
            style={{ background: "none", border: "none" }}
            title={d.text}
          >
            <span
              className="inline-block transition-all duration-300 group-hover:scale-150"
              style={{ width: 5, height: 5, background: "var(--amber)", boxShadow: "0 0 8px rgba(255,154,60,0.8)" }}
            />
            <span
              className="hud-label transition-colors duration-200"
              style={{ color: "rgba(232,230,225,0.55)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(232,230,225,0.55)")}
            >
              {d.text}
            </span>
          </button>
        </Html>
      ))}
    </group>
  );
}
