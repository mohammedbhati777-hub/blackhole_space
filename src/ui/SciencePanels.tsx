import { useStore } from "../state/store";
import { useLive } from "../state/live";
import { PanelFrame, Readout } from "./atoms";
import { fmtNum, fmtClock, fmtDist, G, C, M_SUN } from "../physics/constants";
import { schwarzschildRadiusM } from "../physics/engine";
import { sound } from "../audio/sound";

/* ── SHOW THE PHYSICS — every number computed live ───────────────────── */

function Eq({ idx, title, formula, vars, current, result }: {
  idx: string; title: string; formula: string; vars: [string, string][]; current: string; result: string;
}) {
  return (
    <div className="p-4" style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,0.015)" }}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-inst text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--dim)" }}>{title}</span>
        <span className="font-inst text-[9px]" style={{ color: "var(--faint)" }}>{idx}</span>
      </div>
      <div className="font-disp text-[19px] font-light text-white mb-2 num-tab" style={{ letterSpacing: "0.02em" }}>{formula}</div>
      <div className="space-y-0.5 mb-2.5">
        {vars.map(([k, v]) => (
          <div key={k} className="flex gap-2 font-inst text-[9px]">
            <span style={{ color: "var(--amber)", minWidth: 14 }}>{k}</span>
            <span style={{ color: "var(--faint)" }}>{v}</span>
          </div>
        ))}
      </div>
      <div className="font-inst text-[9px] leading-relaxed num-tab" style={{ color: "var(--dim)", borderTop: "1px solid var(--line)", paddingTop: 6 }}>
        {current}
      </div>
      <div className="font-inst text-[13px] mt-1.5 num-tab" style={{ color: "var(--ink)" }}>
        <span style={{ color: "var(--faint)", fontSize: 9, letterSpacing: "0.2em" }}>RESULT&nbsp;&nbsp;</span>
        {result}
      </div>
    </div>
  );
}

export function PhysicsOverlay() {
  const st = useStore();
  const t = useLive(120);
  if (!st.physicsOpen || st.phase === "intro") return null;

  const rsM = schwarzschildRadiusM(st.massSolar);
  const rM = t.distRs * rsM;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
      <div className="panel pointer-events-auto w-[860px] max-w-[94vw] max-h-[86vh] overflow-y-auto anim-fade-up">
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--line)" }}>
          <div>
            <div className="panel-title" style={{ color: "var(--dim)" }}>The physics · live computation</div>
          </div>
          <button onClick={() => st.patch({ physicsOpen: false })} className="cursor-pointer transition-colors hover:text-white" style={{ color: "var(--dim)", background: "none", border: "none" }} aria-label="close">
            <svg width="11" height="11" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 p-5">
          <Eq
            idx="01" title="Schwarzschild radius" formula="Rs = 2GM / c²"
            vars={[["G", "gravitational constant"], ["M", "black hole mass"], ["c", "speed of light"]]}
            current={`Rs = 2 × ${G.toExponential(3)} × ${fmtNum(st.massSolar, 1)} × ${M_SUN.toExponential(3)} / (${C.toExponential(3)})²`}
            result={`Rs = ${fmtNum(rsM / 1000, 2)} km`}
          />
          <Eq
            idx="02" title="Gravitational acceleration" formula="g = GM / r²"
            vars={[["r", "radial distance from singularity"]]}
            current={`g = GM / (${fmtDist(rM)})²  ·  r = ${fmtNum(t.distRs, 2)} Rs`}
            result={`g = ${fmtNum(t.g, 3)} m/s²`}
          />
          <Eq
            idx="03" title="Escape velocity" formula="vₑ = √(2GM / r)"
            vars={[["vₑ", "speed needed to escape to infinity"]]}
            current={`vₑ = √(2GM / ${fmtDist(rM)})`}
            result={`vₑ = ${fmtNum(t.ve, 3)} m/s = ${fmtNum(t.veC, 3)} c`}
          />
          <Eq
            idx="04" title="Gravitational time dilation" formula="Δτ = Δt · √(1 − Rs / r)"
            vars={[["Δτ", "proper time at r"], ["Δt", "distant observer time"]]}
            current={`factor = √(1 − 1/${fmtNum(t.distRs, 2)})`}
            result={`Δτ/Δt = ${fmtNum(t.dilation, 4)} — 1 s local = ${fmtNum(1 / Math.max(t.dilation, 1e-6), 3)} s distant`}
          />
          <Eq
            idx="05" title="Tidal acceleration" formula="Δa ≈ 2GM·Δr / r³"
            vars={[["Δr", "body length (2 m here)"]]}
            current={`Δa = 2GM × 2 m / (${fmtDist(rM)})³`}
            result={`Δa = ${fmtNum(t.tidal, 3)} m/s² across 2 m`}
          />
          <div className="p-4 flex flex-col justify-between" style={{ border: "1px dashed var(--line)" }}>
            <div>
              <div className="panel-title mb-2" style={{ color: "var(--faint)" }}>Model honesty</div>
              <p className="font-inst text-[9.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
                This is an educational visualization, not a research-grade relativistic simulator.
                Gravity uses the Newtonian exterior; time dilation uses the exact Schwarzschild factor;
                probe orbits integrate the Paczyński–Wiita potential; lensing is a physically-motivated
                screen-space deflection (α ∝ Rs/b), not a geodesic ray-trace. Interior physics is not modeled.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Readout label="Current mass" value={fmtNum(st.massSolar, 2)} unit="M☉" />
              <Readout label="Current r" value={fmtNum(t.distRs, 2)} unit="Rs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── TIME DILATION — two clocks ──────────────────────────────────────── */

export function ClocksPanel() {
  const st = useStore();
  const t = useLive(90);
  if (!st.clocksOpen || st.phase === "intro") return null;

  return (
    <div className="fixed left-1/2 top-16 -translate-x-1/2 z-40 anim-fade-up">
      <div className="panel px-6 py-4 w-[340px] max-w-[92vw]">
        <div className="flex items-center justify-between mb-3">
          <span className="panel-title" style={{ color: "var(--dim)" }}>Time dilation · Schwarzschild</span>
          <button onClick={() => st.patch({ clocksOpen: false })} className="cursor-pointer" style={{ color: "var(--dim)", background: "none", border: "none" }}>
            <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="hud-label mb-1">Local clock</div>
            <div className="font-inst num-tab text-[24px] text-white">{fmtClock(t.localTime)}</div>
            <div className="font-inst text-[8.5px] mt-1" style={{ color: "var(--faint)" }}>with you, at r</div>
          </div>
          <div>
            <div className="hud-label mb-1">Distant observer</div>
            <div className="font-inst num-tab text-[24px]" style={{ color: "var(--amber)" }}>{fmtClock(t.farTime)}</div>
            <div className="font-inst text-[8.5px] mt-1" style={{ color: "var(--faint)" }}>far from the hole</div>
          </div>
        </div>
        <div className="mt-3 h-[3px] w-full" style={{ background: "var(--line)" }}>
          <div className="h-full transition-all duration-300" style={{ width: `${t.dilation * 100}%`, background: "var(--amber)", boxShadow: "0 0 8px rgba(255,154,60,0.6)" }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-inst text-[9px] num-tab" style={{ color: "var(--dim)" }}>Δτ/Δt = {fmtNum(t.dilation, 4)}</span>
          <button className="btn-ghost !text-[8.5px]" onClick={() => { sound.click(); t.localTime = 0; t.farTime = 0; }}>Reset clocks</button>
        </div>
        <p className="font-inst text-[8.5px] leading-relaxed mt-2" style={{ color: "var(--faint)" }}>
          Gravitational time dilation relative to a distant observer, simplified Schwarzschild exterior model.
        </p>
      </div>
    </div>
  );
}

/* ── GRAVITATIONAL TELEMETRY ─────────────────────────────────────────── */

export function TelemetryPanel() {
  const st = useStore();
  const t = useLive(90);
  if (!st.telemetryOpen || st.phase === "intro") return null;
  const danger = t.region === "EVENT HORIZON" || t.region === "EXTREME";

  const Row = ({ l, v, warn }: { l: string; v: string; warn?: boolean }) => (
    <div className="flex justify-between items-baseline py-[5px]" style={{ borderBottom: "1px solid var(--line)" }}>
      <span className="hud-label">{l}</span>
      <span className="font-inst text-[11px] num-tab" style={{ color: warn ? "var(--warn)" : "var(--ink)" }}>{v}</span>
    </div>
  );

  return (
    <div className="fixed right-4 bottom-16 z-40 anim-fade-up">
      <div className="panel w-[280px] max-w-[92vw] px-4 py-3.5">
        <div className="caption-line">
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--line-strong)" }}>
            <span className="panel-title" style={{ color: "var(--dim)" }}>Gravitational telemetry</span>
            <button onClick={() => st.patch({ telemetryOpen: false })} className="cursor-pointer" style={{ color: "var(--dim)", background: "none", border: "none" }}>
              <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" /></svg>
            </button>
          </div>
        </div>
        <div className="pt-2 space-y-0">
          <Row l="Mass" v={`${fmtNum(st.massSolar, 2)} M☉`} />
          <Row l="Schwarzschild radius" v={`${fmtNum(t.rsKm, 2)} km`} />
          <Row l="Distance" v={`${fmtDist(t.distRs * t.rsKm * 1000)}`} />
          <Row l="r / Rs" v={fmtNum(t.distRs, 2)} />
          <Row l="Grav. acceleration" v={`${fmtNum(t.g, 3)} m/s²`} />
          <Row l="Escape velocity" v={`${fmtNum(t.veC, 3)} c`} />
          <Row l="Time dilation factor" v={fmtNum(t.dilation, 4)} warn={danger} />
          <Row l="Tidal Δa (2 m)" v={`${fmtNum(t.tidal, 3)} m/s²`} warn={danger} />
          <div className="flex justify-between items-center pt-2.5">
            <span className="hud-label">Region</span>
            <span className={`font-inst text-[10px] tracking-[0.18em] ${danger ? "anim-warn" : ""}`} style={{ color: danger ? "var(--warn)" : "var(--amber)" }}>
              {t.region}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
