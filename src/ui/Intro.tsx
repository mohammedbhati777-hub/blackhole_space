import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { useLive } from "../state/live";
import { clamp, fmtNum } from "../physics/constants";

/* Front page — an observatory lock-on, not a hero section.
   The anomaly sits right of frame; typography holds the left. */

export default function Intro() {
  const phase = useStore((s) => s.phase);
  const enter = useStore((s) => s.enter);
  const [stage, setStage] = useState(0);
  const [gone, setGone] = useState(false);
  const t = useLive(90);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 800),
      window.setTimeout(() => setStage(2), 3100),
      window.setTimeout(() => setStage(3), 5300),
      window.setTimeout(() => setStage(4), 6900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase === "sim") {
      const id = window.setTimeout(() => setGone(true), 1300);
      return () => clearTimeout(id);
    }
  }, [phase]);

  /* press ⏎ to enter */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && useStore.getState().phase === "intro") enter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter]);

  if (gone) return null;

  const leaving = phase !== "intro";
  const entering = phase === "entering";
  const progress = clamp((Math.log(820) - Math.log(Math.max(t.distRs, 1))) / (Math.log(820) - Math.log(100)), 0, 1);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* ── atmosphere: scrim left for type, window right for the anomaly ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.34) 34%, rgba(0,0,0,0.06) 58%, transparent 78%)," +
            "radial-gradient(ellipse at 66% 46%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.9) 100%)",
          opacity: leaving ? 0 : 1,
          transition: "opacity 1.3s ease",
        }}
      />

      {/* ── receiver chrome ── */}
      <div
        className="absolute top-6 left-7 md:top-8 md:left-9 font-inst text-[9px] tracking-[0.25em]"
        style={{ color: "var(--faint)", opacity: leaving ? 0 : 1, transition: "opacity 0.8s ease" }}
      >
        DEEP-FIELD RECEIVER · CH 07
      </div>
      <div
        className="absolute top-6 right-7 md:top-8 md:right-9 font-inst text-[9px] tracking-[0.25em] anim-pulse-dot"
        style={{ color: "var(--faint)", opacity: leaving ? 0 : 1, transition: "opacity 0.8s ease" }}
      >
        ● REC
      </div>

      {/* ── left column : log → title → entry ── */}
      <div
        className="absolute left-7 md:left-[8vw] top-1/2 -translate-y-1/2 max-w-[86vw] md:max-w-[58vw]"
        style={{ opacity: leaving ? 0 : 1, transform: leaving ? "translateY(-50%) translateX(-18px)" : "translateY(-50%)", transition: "opacity 0.9s ease, transform 1.1s cubic-bezier(0.22,1,0.36,1)" }}
      >
        <div className="space-y-2.5 mb-9 md:mb-12 font-inst text-[10px] md:text-[11px] tracking-[0.3em] uppercase" style={{ color: "var(--dim)" }}>
          {stage >= 1 && (
            <div className="log-line anim-fade-in" style={{ animationDuration: "1.4s" }}>
              <span style={{ color: "var(--faint)", letterSpacing: "0.12em" }}>T+00:04</span>
              <span>we are approaching</span>
            </div>
          )}
          {stage >= 2 && (
            <div className="log-line anim-fade-in" style={{ animationDuration: "1.4s" }}>
              <span style={{ color: "var(--faint)", letterSpacing: "0.12em" }}>T+00:09</span>
              <span>an object that does not emit light</span>
            </div>
          )}
        </div>

        {stage >= 3 && (
          <div>
            <h1
              className="font-disp uppercase leading-[0.98] text-white"
              style={{ fontSize: "clamp(42px, 8.5vw, 108px)", fontWeight: 300, letterSpacing: "0.14em" }}
            >
              <span className="reveal-line"><span style={{ animationDelay: "0.05s" }}>Black Hole</span></span>
              <span className="reveal-line">
                <span style={{ animationDelay: "0.22s", color: "var(--amber)", fontWeight: 600, letterSpacing: "0.42em", textShadow: "0 0 46px rgba(255,154,60,0.32)" }}>
                  Lab
                </span>
              </span>
            </h1>
            <div className="mt-6 md:mt-8 flex items-center gap-4">
              <span style={{ width: 44, height: 1, background: "rgba(255,154,60,0.6)" }} />
              <p className="font-inst text-[9px] md:text-[10px] tracking-[0.4em] uppercase anim-fade-in d3" style={{ color: "var(--dim)" }}>
                A journey into extreme gravity
              </p>
            </div>
            <p className="mt-2.5 ml-[60px] font-inst text-[8px] tracking-[0.3em] uppercase anim-fade-in d4 hidden sm:block" style={{ color: "var(--faint)" }}>
              Gravitational observatory · unit 07 · skill expo
            </p>
          </div>
        )}

        {stage >= 4 && (
          <div className="mt-10 md:mt-12 flex items-center gap-6 anim-fade-up">
            <button className="btn-primary pointer-events-auto" onClick={enter}>
              Enter
            </button>
            <span className="font-inst text-[8.5px] tracking-[0.24em] uppercase hidden md:block" style={{ color: "var(--faint)" }}>
              press ⏎ — then drag to orbit
            </span>
          </div>
        )}
      </div>

      {/* ── right : target acquisition readout ── */}
      {stage >= 2 && !leaving && (
        <div className="absolute right-7 md:right-[7vw] bottom-[13vh] hidden sm:block anim-fade-in text-right" style={{ animationDuration: "1.6s" }}>
          <div className="font-inst text-[9px] tracking-[0.28em] uppercase space-y-1.5" style={{ color: "var(--dim)" }}>
            <div className="flex items-center justify-end gap-2">
              <span className="anim-warn" style={{ color: "var(--amber)" }}>●</span>
              <span style={{ color: "var(--ink)" }}>Signal lock</span>
            </div>
            <div>OBJ — UNIDENTIFIED COMPACT</div>
            <div style={{ color: "var(--faint)" }}>M ≈ 10 M☉ · r ≈ {fmtNum(t.distRs, 0)} Rs</div>
            <div style={{ color: "var(--faint)" }}>LENSING DETECTED · v<sub>e</sub> ≥ c</div>
          </div>
        </div>
      )}

      {/* ── descent telemetry while the dolly runs ── */}
      <div
        className="absolute left-7 md:left-[8vw] bottom-[9vh] transition-opacity duration-700"
        style={{ opacity: entering ? 1 : 0 }}
      >
        <div className="font-inst text-[10px] tracking-[0.26em] uppercase" style={{ color: "var(--amber)" }}>
          Trajectory locked
        </div>
        <div className="mt-2 font-inst num-tab text-[13px] text-white" style={{ letterSpacing: "0.08em" }}>
          r&nbsp;&nbsp;{fmtNum(t.distRs, 1)} Rs
          <span className="ml-4" style={{ color: "var(--faint)", fontSize: 9, letterSpacing: "0.2em" }}>CLOSING</span>
        </div>
        <div className="mt-2.5 relative" style={{ width: 220, height: 1, background: "rgba(255,255,255,0.12)" }}>
          <div className="descent-bar absolute left-0 top-0 h-px transition-all duration-200" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-2 font-inst text-[8.5px] tracking-[0.22em] uppercase" style={{ color: "var(--faint)" }}>
          Hull stress nominal · lensing calibration OK
        </div>
      </div>
    </div>
  );
}
