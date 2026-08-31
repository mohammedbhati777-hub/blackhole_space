import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { sound } from "../audio/sound";

interface Keyframe {
  at: number;
  title: string;
  sub: string;
  run: (api: ReturnType<typeof useStore.getState>) => void;
  tween?: { param: "mass" | "dist"; to: number; dur: number };
}

const KF: Keyframe[] = [
  {
    at: 0, title: "BEGIN TRANSMISSION", sub: "Automated demonstration — TAKE CONTROL at any moment",
    run: (a) => a.patch({ targetDistRs: 700, lensing: true, disk: true, starfield: true, observatory: false }),
  },
  {
    at: 9, title: "STELLAR COLLAPSE", sub: "Ten solar masses compressed inside a 29.5 km radius",
    run: (a) => { a.setMass(10); a.setTargetDist(110); },
    tween: { param: "dist", to: 110, dur: 6 },
  },
  {
    at: 21, title: "ACCRETION DISK", sub: "Infalling gas orbits at Keplerian speed, heated to millions of kelvin",
    run: () => {},
    tween: { param: "dist", to: 34, dur: 7 },
  },
  {
    at: 34, title: "GRAVITATIONAL LENSING", sub: "Mass curves spacetime — light itself follows the curvature",
    run: (a) => a.patch({ lensingStrength: 0 }),
    tween: { param: "dist", to: 26, dur: 4 },
  },
  {
    at: 47, title: "MASS ×3", sub: "The horizon radius grows linearly with mass: Rs = 2GM/c²",
    run: () => {},
    tween: { param: "mass", to: 30, dur: 5 },
  },
  {
    at: 60, title: "THE EQUATIONS", sub: "Every readout in this instrument is computed live",
    run: (a) => { a.setMass(10); a.patch({ physicsOpen: true, lensingStrength: 1 }); },
  },
  {
    at: 71, title: "APPROACH", sub: "Falling freely — gravity follows the inverse-square law",
    run: (a) => { a.patch({ physicsOpen: false, telemetryOpen: true, approachSpeed: 0.75 }); a.startApproach(); },
  },
  {
    at: 86, title: "TIME DILATION", sub: "√(1 − Rs/r): your clock now ticks slower than a distant observer's",
    run: (a) => a.patch({ clocksOpen: true }),
  },
  {
    at: 100, title: "TIDAL FORCES", sub: "Gravity at your feet exceeds gravity at your head — a stretching, not a sucking",
    run: (a) => a.patch({ tidalViz: true, approachSpeed: 1.1 }),
  },
  {
    at: 114, title: "EVENT HORIZON", sub: "Escape velocity reaches c — no signal returns from beyond this boundary",
    run: () => {},
  },
  {
    at: 126, title: "MEASURE IT", sub: "g, τ and tidal acceleration against distance — hover to inspect any radius",
    run: (a) => { a.patch({ clocksOpen: false, tidalViz: false, graphsOpen: true }); a.returnFromHorizon(); },
    tween: { param: "dist", to: 40, dur: 5 },
  },
  {
    at: 140, title: "END OF DEMONSTRATION", sub: "Take manual control — the instrument is yours",
    run: (a) => a.patch({ graphsOpen: false, expo: false, expoCaption: null }),
  },
];

const TOTAL = 150;

/* Runs inside the Canvas (needs useFrame). */
export function ExpoRunner() {
  const expo = useStore((s) => s.expo);
  const time = useRef(0);
  const fired = useRef(-1);
  const tween = useRef<{ param: "mass" | "dist"; from: number; to: number; t0: number; dur: number } | null>(null);

  useEffect(() => {
    if (expo) {
      time.current = 0;
      fired.current = -1;
      tween.current = null;
      sound.click();
    }
  }, [expo]);

  useFrame((_, delta) => {
    const st = useStore.getState();
    if (!st.expo || st.paused) return;
    const dt = Math.min(delta, 0.05);
    time.current += dt;

    // fire keyframes
    for (let i = 0; i < KF.length; i++) {
      if (i > fired.current && time.current >= KF[i].at) {
        fired.current = i;
        const kf = KF[i];
        kf.run(st);
        st.patch({ expoCaption: { title: kf.title, sub: kf.sub } });
        if (kf.tween) {
          const cur = kf.tween.param === "mass" ? st.massSolar : st.targetDistRs;
          tween.current = { param: kf.tween.param, from: cur, to: kf.tween.to, t0: time.current, dur: kf.tween.dur };
        }
      }
    }

    // apply tween
    if (tween.current) {
      const tw = tween.current;
      const k = Math.min((time.current - tw.t0) / tw.dur, 1);
      const e = k * k * (3 - 2 * k);
      const v = tw.from + (tw.to - tw.from) * e;
      if (tw.param === "mass") useStore.getState().setMass(v);
      else useStore.getState().setTargetDist(v);
      if (k >= 1) tween.current = null;
    }

    useStore.getState().patch({ expoProgress: Math.min(time.current / TOTAL, 1) });
    if (time.current >= TOTAL) {
      useStore.getState().patch({ expo: false, expoCaption: null });
    }
  });

  return null;
}

/* DOM overlay: caption + presenter controls. */
export function ExpoOverlay() {
  const expo = useStore((s) => s.expo);
  const caption = useStore((s) => s.expoCaption);
  const progress = useStore((s) => s.expoProgress);
  const patch = useStore((s) => s.patch);

  if (!expo) return null;

  return (
    <div className="fixed inset-x-0 bottom-14 z-40 flex flex-col items-center pointer-events-none">
      {caption && (
        <div key={caption.title} className="anim-fade-up text-center px-6 mb-4">
          <div className="font-disp text-[15px] md:text-[19px] font-medium tracking-[0.3em] uppercase text-white">
            {caption.title}
          </div>
          <div className="font-inst text-[10px] md:text-[10.5px] tracking-[0.14em] mt-2" style={{ color: "var(--dim)" }}>
            {caption.sub}
          </div>
        </div>
      )}
      <div className="w-[280px] max-w-[70vw] h-px pointer-events-auto" style={{ background: "var(--line-strong)" }}>
        <div className="h-px transition-all duration-500" style={{ width: `${progress * 100}%`, background: "var(--amber)" }} />
      </div>
      <button
        className="btn-inst mt-3 pointer-events-auto"
        onClick={() => { sound.click(); patch({ expo: false, expoCaption: null }); }}
      >
        Take control
      </button>
    </div>
  );
}
