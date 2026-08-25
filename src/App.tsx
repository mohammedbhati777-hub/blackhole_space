import { useEffect, useState } from "react";
import SceneRoot from "./scene/SceneRoot";
import Intro from "./ui/Intro";
import HUD from "./ui/HUD";
import { ControlPanel, ProbePanel, ExperimentsPanel } from "./ui/Panels";
import { PhysicsOverlay, ClocksPanel, TelemetryPanel } from "./ui/SciencePanels";
import Graphs from "./ui/Graphs";
import { ExpoOverlay } from "./ui/ExpoMode";
import Archive from "./ui/Archive";
import LabelInfo from "./ui/LabelInfo";

export default function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setBooted(true), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ opacity: booted ? 1 : 0, transition: "opacity 1.2s ease" }}>
      <SceneRoot />
      <HUD />
      <ControlPanel />
      <ProbePanel />
      <ExperimentsPanel />
      <TelemetryPanel />
      <ClocksPanel />
      <PhysicsOverlay />
      <Graphs />
      <ExpoOverlay />
      <LabelInfo />
      <Archive />
      <Intro />
    </div>
  );
}
