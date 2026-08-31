import { create } from "zustand";
import { clamp, MIN_DIST_RS, MAX_DIST_RS } from "../physics/constants";
import type { ProbeParams, ProbeOutcome } from "../physics/engine";
import { sound } from "../audio/sound";

export type Phase = "intro" | "entering" | "sim";
export type Quality = "cinematic" | "balanced" | "performance";
export type Density = "low" | "medium" | "high";
export type LabelKey = "horizon" | "disk" | "photon" | "lensing";

export interface ExpoCaption {
  title: string;
  sub: string;
}

interface SimStore {
  phase: Phase;
  quality: Quality;
  massSolar: number;
  targetDistRs: number;

  lensing: boolean;
  lensingStrength: number;
  starfield: boolean;
  disk: boolean;
  labels3d: boolean;
  density: Density;
  soundOn: boolean;
  paused: boolean;

  approach: boolean;
  approachSpeed: number;
  horizonHold: boolean;
  observatory: boolean;
  expo: boolean;
  expoCaption: ExpoCaption | null;
  expoProgress: number;

  panelOpen: boolean;
  physicsOpen: boolean;
  graphsOpen: boolean;
  clocksOpen: boolean;
  probeOpen: boolean;
  experimentsOpen: boolean;
  archiveOpen: boolean;
  telemetryOpen: boolean;
  tidalViz: boolean;
  labelInfo: LabelKey | null;
  graphHoverRs: number | null;

  probeParams: ProbeParams;
  probeSeq: number;
  probeOutcome: ProbeOutcome | null;
  probeTrailCleared: number;

  enter: () => void;
  finishEntry: () => void;
  reset: () => void;
  patch: (p: Partial<SimStore>) => void;
  setMass: (m: number) => void;
  setTargetDist: (d: number) => void;
  toggle: (k: keyof SimStore) => void;
  startApproach: () => void;
  stopApproach: () => void;
  returnFromHorizon: () => void;
  launchProbe: () => void;
}

const isCoarse = typeof window !== "undefined" &&
  (window.matchMedia?.("(max-width: 820px)").matches ||
    (navigator.hardwareConcurrency ?? 8) <= 4);

const DEFAULTS = {
  quality: (isCoarse ? "balanced" : "cinematic") as Quality,
  massSolar: 10,
  targetDistRs: 100,
  lensing: true,
  lensingStrength: 1,
  starfield: true,
  disk: true,
  labels3d: true,
  density: (isCoarse ? "medium" : "high") as Density,
  soundOn: false,
  paused: false,
  approach: false,
  approachSpeed: 0.4,
  horizonHold: false,
  observatory: false,
  expo: false,
  panelOpen: false,
  physicsOpen: false,
  graphsOpen: false,
  clocksOpen: false,
  probeOpen: false,
  experimentsOpen: false,
  archiveOpen: false,
  telemetryOpen: false,
  tidalViz: false,
  labelInfo: null as LabelKey | null,
  graphHoverRs: null as number | null,
  probeParams: { vFrac: 1.0, r0Rs: 12, angleDeg: 12 } as ProbeParams,
  probeSeq: 0,
  probeOutcome: null as ProbeOutcome | null,
  probeTrailCleared: 0,
};

export const useStore = create<SimStore>((set, get) => ({
  phase: "intro",
  expoCaption: null,
  expoProgress: 0,
  ...DEFAULTS,

  enter: () => {
    sound.init();
    sound.setEnabled(get().soundOn);
    sound.enter();
    set({ phase: "entering", targetDistRs: 90 });
  },

  finishEntry: () => set({ phase: "sim" }),

  reset: () => {
    sound.click();
    set({
      ...DEFAULTS,
      phase: get().phase === "intro" ? "intro" : "sim",
      quality: "cinematic",
      density: "high",
      expoCaption: null,
      expoProgress: 0,
      soundOn: get().soundOn,
    });
  },

  patch: (p) => set(p),

  setMass: (m) => set({ massSolar: clamp(m, 1, 100) }),

  setTargetDist: (d) =>
    set({ targetDistRs: clamp(d, MIN_DIST_RS, MAX_DIST_RS), horizonHold: false }),

  toggle: (k) => {
    const cur = get()[k];
    if (typeof cur === "boolean") {
      sound.click();
      set({ [k]: !cur } as Partial<SimStore>);
    }
  },

  startApproach: () => {
    sound.click();
    set({
      approach: true,
      horizonHold: false,
      telemetryOpen: true,
      targetDistRs: Math.max(get().targetDistRs, 3),
    });
  },

  stopApproach: () => set({ approach: false }),

  returnFromHorizon: () => {
    sound.click();
    set({ targetDistRs: 40, horizonHold: false, approach: false });
  },

  launchProbe: () => {
    sound.click();
    set((s) => ({
      probeSeq: s.probeSeq + 1,
      probeOutcome: null,
      probeOpen: true,
    }));
  },
}));

export const storeApi = useStore;
