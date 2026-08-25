/* Mutable per-frame telemetry bus. Written by the simulation driver at
   60 Hz, read by UI via the useLive() hook at ~10 Hz — keeps React off
   the hot path. */

import { regionFor, type Region } from "../physics/engine";

export interface LiveTelemetry {
  distRs: number;
  sceneRadius: number;
  sysScale: number;
  massSolar: number;
  rsKm: number;
  rKm: number;
  g: number;
  ve: number;
  veC: number;
  dilation: number;
  tidal: number;
  region: Region;
  farTime: number;
  localTime: number;
  fps: number;
  diskTime: number;
}

export const live: LiveTelemetry = {
  distRs: 100,
  sceneRadius: 0,
  sysScale: 1,
  massSolar: 10,
  rsKm: 29.53,
  rKm: 2953,
  g: 0,
  ve: 0,
  veC: 0,
  dilation: 0.995,
  tidal: 0,
  region: regionFor(100),
  farTime: 0,
  localTime: 0,
  fps: 60,
  diskTime: 0,
};

import { useEffect, useReducer } from "react";

/** Re-render a component at a fixed cadence, returning the live bus. */
export function useLive(ms = 100): LiveTelemetry {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = window.setInterval(force, ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return live;
}
