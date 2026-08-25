import { useEffect, useState } from "react";
import { useStore } from "../state/store";

/* The approach: total darkness, a few stars, then language. */

export default function Intro() {
  const phase = useStore((s) => s.phase);
  const enter = useStore((s) => s.enter);
  const [stage, setStage] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 900),
      window.setTimeout(() => setStage(2), 3300),
      window.setTimeout(() => setStage(3), 5900),
      window.setTimeout(() => setStage(4), 7600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase === "entering") {
      const id = window.setTimeout(() => setGone(true), 1500);
      return () => clearTimeout(id);
    }
  }, [phase]);

  if (gone) return null;

  const leaving = phase !== "intro";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,${stage >= 2 ? 0.42 : 0.94}) 0%, rgba(0,0,0,${stage >= 1 ? 0.82 : 1}) 55%, #000 100%)`,
        opacity: leaving ? 0 : 1,
        transition: "opacity 1.5s ease, background 2.5s ease",
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      {/* hairline frame */}
      <div className="absolute inset-4 md:inset-6 pointer-events-none" style={{ border: "1px solid rgba(255,255,255,0.05)" }} />
      <div className="absolute top-8 left-8 font-inst text-[9px] tracking-[0.25em]" style={{ color: "var(--faint)" }}>
        DEEP-FIELD RECEIVER · CH 07
      </div>
      <div className="absolute top-8 right-8 font-inst text-[9px] tracking-[0.25em] anim-pulse-dot" style={{ color: "var(--faint)" }}>
        ● REC
      </div>

      <div className="text-center px-6 max-w-3xl">
        <div className="space-y-7 mb-12">
          {stage >= 1 && (
            <p className="anim-fade-in font-inst text-[11px] md:text-xs tracking-[0.5em] uppercase" style={{ color: "var(--dim)", animationDuration: "1.8s" }}>
              We are approaching
            </p>
          )}
          {stage >= 2 && (
            <p className="anim-fade-in font-inst text-[11px] md:text-xs tracking-[0.5em] uppercase" style={{ color: "var(--dim)", animationDuration: "1.8s" }}>
              an object that does not emit light
            </p>
          )}
        </div>

        {stage >= 3 && (
          <div className="anim-track-in">
            <h1
              className="font-disp font-light uppercase text-white"
              style={{ fontSize: "clamp(30px, 7vw, 74px)", letterSpacing: "0.34em", lineHeight: 1.05, textIndent: "0.34em" }}
            >
              Black Hole
              <span className="block font-semibold" style={{ color: "var(--amber)", textShadow: "0 0 44px rgba(255,154,60,0.35)" }}>
                Lab
              </span>
            </h1>
            <p className="mt-5 font-inst text-[10px] md:text-[11px] tracking-[0.42em] uppercase anim-fade-in d4" style={{ color: "var(--dim)" }}>
              A journey into extreme gravity
            </p>
          </div>
        )}

        {stage >= 4 && (
          <div className="mt-14 anim-fade-up">
            <button className="btn-primary" onClick={enter}>
              Enter
            </button>
            <p className="mt-6 font-inst text-[8.5px] tracking-[0.3em] uppercase anim-fade-in d3" style={{ color: "var(--faint)" }}>
              Live simulation · physics computed in real time
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="inline-block anim-pulse-dot" style={{ width: 3, height: 3, background: "var(--faint)", animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>
    </div>
  );
}
