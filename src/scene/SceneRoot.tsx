import { Canvas } from "@react-three/fiber";
import { useStore } from "../state/store";
import Starfield from "./Starfield";
import AccretionDisk from "./AccretionDisk";
import BlackHole from "./BlackHole";
import PostFX from "./PostFX";
import CameraRig from "./CameraRig";
import Labels3D from "./Labels3D";
import { ProbeSystem, TidalViz, GhostRing, ObservatoryGrid } from "./Dynamics";
import IntroFX from "./IntroFX";
import { ExpoRunner } from "../ui/ExpoMode";
import { mapRsToScene, sysScaleFor } from "../physics/constants";

export default function SceneRoot() {
  const quality = useStore((s) => s.quality);
  const dpr =
    quality === "cinematic"
      ? [1, 2]
      : quality === "balanced"
        ? [1, 1.5]
        : [0.75, 1];

  const s = sysScaleFor(10);
  const start = mapRsToScene(820, s);

  return (
    <Canvas
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      dpr={dpr as [number, number]}
      camera={{ fov: 47, near: 0.05, far: 3000, position: [start * 0.87, start * 0.36, start * 0.33] }}
      style={{ position: "fixed", inset: 0, zIndex: 0, background: "#000" }}
    >
      <color attach="background" args={["#000000"]} />
      <Starfield />
      <IntroFX />
      <BlackHole />
      <AccretionDisk />
      <ObservatoryGrid />
      <ProbeSystem />
      <TidalViz />
      <GhostRing />
      <Labels3D />
      <CameraRig />
      <ExpoRunner />
      <PostFX />
    </Canvas>
  );
}
