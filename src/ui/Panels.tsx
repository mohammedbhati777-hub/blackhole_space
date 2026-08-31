import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { live } from "../state/live";
import { PanelFrame, Section, Slider, Toggle, Seg, Readout } from "./atoms";
import { fmtNum, fmtDist, MIN_DIST_RS, MAX_DIST_RS } from "../physics/constants";
import {
  schwarzschildRadiusM, gravAccel, escapeVelocity, dilationFactor, tidalAccel,
} from "../physics/engine";
import { sound } from "../audio/sound";

/* ── Control panel ───────────────────────────────────────────────────── */

export function ControlPanel() {
  const st = useStore();
  if (!st.panelOpen || st.phase === "intro") return null;
  const rsM = schwarzschildRadiusM(st.massSolar);

  return (
    <div className="slide-r fixed right-4 top-16 z-40 anim-fade-up">
      <PanelFrame
        title="Instrument controls"
        onClose={() => st.patch({ panelOpen: false })}
        note="View mapping is compressed for exploration; telemetry always reports proper distance."
      >
        <Section title="Black hole">
          <Slider
            label="Mass"
            log
            min={1}
            max={100}
            value={st.massSolar}
            display={`${fmtNum(st.massSolar, 1)} M☉`}
            sub={`Rs = ${fmtNum(rsM / 1000, 2)} km · solar masses`}
            onChange={(v) => st.setMass(v)}
          />
        </Section>

        <Section title="Observation">
          <Slider
            label="Distance"
            log
            min={MIN_DIST_RS}
            max={MAX_DIST_RS}
            value={st.targetDistRs}
            display={`${fmtNum(st.targetDistRs, st.targetDistRs < 10 ? 2 : 0)} Rs`}
            sub={`${fmtDist(st.targetDistRs * rsM)} from singularity`}
            onChange={(v) => st.setTargetDist(v)}
          />
        </Section>

        <Section title="Visualization">
          <Toggle label="Gravitational lensing" on={st.lensing} onClick={() => st.toggle("lensing")} />
          {st.lensing && (
            <Slider
              label="Lensing strength"
              min={0}
              max={1.5}
              value={st.lensingStrength}
              display={fmtNum(st.lensingStrength, 2)}
              onChange={(v) => st.patch({ lensingStrength: v })}
            />
          )}
          <Toggle label="Star field" on={st.starfield} onClick={() => st.toggle("starfield")} />
          <Toggle label="Accretion disk" on={st.disk} onClick={() => st.toggle("disk")} />
          <Toggle label="3D labels" on={st.labels3d} onClick={() => st.toggle("labels3d")} />
          <Seg
            label="Particle density"
            options={[{ v: "low", label: "Low" }, { v: "medium", label: "Med" }, { v: "high", label: "High" }]}
            value={st.density}
            onChange={(v) => st.patch({ density: v })}
          />
          <Seg
            label="Render quality"
            options={[{ v: "cinematic", label: "Cine" }, { v: "balanced", label: "Bal" }, { v: "performance", label: "Perf" }]}
            value={st.quality}
            onChange={(v) => st.patch({ quality: v })}
          />
        </Section>

        <Section title="Simulation">
          <div className="flex gap-2">
            <button className="btn-inst flex-1" onClick={() => { sound.click(); st.patch({ paused: !st.paused }); }}>
              {st.paused ? "Resume" : "Pause"}
            </button>
            <button className="btn-inst flex-1" onClick={() => st.reset()}>Reset simulation</button>
          </div>
          <Toggle label="Approach mode" on={st.approach} onClick={() => (st.approach ? st.stopApproach() : st.startApproach())} />
          {st.approach && (
            <Slider
              label="Descent rate"
              min={0.15}
              max={1.4}
              value={st.approachSpeed}
              display={`${fmtNum(st.approachSpeed, 2)}×`}
              onChange={(v) => st.patch({ approachSpeed: v })}
            />
          )}
          <Toggle label="Tidal force probe" on={st.tidalViz} onClick={() => st.toggle("tidalViz")} />
          <Toggle label="Observatory mode" on={st.observatory} onClick={() => st.toggle("observatory")} />
          <Toggle label="Telemetry HUD" on={st.telemetryOpen} onClick={() => st.toggle("telemetryOpen")} />
        </Section>
      </PanelFrame>
    </div>
  );
}

/* ── Probe panel ─────────────────────────────────────────────────────── */

export function ProbePanel() {
  const st = useStore();
  if (!st.probeOpen || st.phase === "intro") return null;
  const p = st.probeParams;
  const rsM = schwarzschildRadiusM(st.massSolar);

  return (
    <div className="slide-r fixed left-4 top-16 z-40 anim-fade-up">
      <PanelFrame
        title="Probe trajectory"
        onClose={() => st.patch({ probeOpen: false })}
        note="Integrator: Paczyński–Wiita pseudo-Newtonian potential — reproduces ISCO and horizon capture of the Schwarzschild metric."
      >
        <Section title="Launch parameters">
          <Slider
            label="Initial velocity"
            min={0.2}
            max={2}
            value={p.vFrac}
            display={`${fmtNum(p.vFrac, 2)} × v·circ`}
            onChange={(v) => st.patch({ probeParams: { ...p, vFrac: v } })}
          />
          <Slider
            label="Starting distance"
            log
            min={4}
            max={60}
            value={p.r0Rs}
            display={`${fmtNum(p.r0Rs, 1)} Rs`}
            sub={fmtDist(p.r0Rs * rsM)}
            onChange={(v) => st.patch({ probeParams: { ...p, r0Rs: v } })}
          />
          <Slider
            label="Approach angle"
            min={0}
            max={90}
            step={1}
            value={p.angleDeg}
            display={`${fmtNum(p.angleDeg, 0)}°`}
            sub="0° tangential → 90° radial plunge"
            onChange={(v) => st.patch({ probeParams: { ...p, angleDeg: v } })}
          />
        </Section>

        <div className="flex gap-2 mb-4">
          <button className="btn-inst flex-1 !text-[var(--amber)]" onClick={() => st.launchProbe()}>Send probe</button>
          <button className="btn-inst flex-1" onClick={() => { sound.click(); st.patch({ probeTrailCleared: st.probeTrailCleared + 1 }); }}>Clear trail</button>
          <button className="btn-inst flex-1" onClick={() => { sound.click(); st.patch({ probeParams: { vFrac: 1, r0Rs: 12, angleDeg: 12 }, probeTrailCleared: st.probeTrailCleared + 1 }); }}>Reset orbit</button>
        </div>

        <Section title="Result">
          <div className="font-inst text-[12px] tracking-[0.12em] py-2 px-3 text-center"
            style={{
              border: `1px solid ${st.probeOutcome === "HORIZON CROSSING" ? "rgba(255,75,51,0.5)" : st.probeOutcome ? "rgba(255,154,60,0.4)" : "var(--line)"}`,
              color: st.probeOutcome === "HORIZON CROSSING" ? "var(--warn)" : st.probeOutcome ? "var(--amber)" : "var(--faint)",
            }}>
            {st.probeOutcome ?? "AWAITING LAUNCH"}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Readout label="r / Rs now" value={fmtNum(live.distRs, 2)} />
            <Readout label="Local g" value={fmtNum(live.g, 2)} unit="m/s²" />
          </div>
        </Section>
      </PanelFrame>
    </div>
  );
}

/* ── Experiments ─────────────────────────────────────────────────────── */

interface Experiment {
  id: string;
  question: string;
  kind: "mass" | "dist";
  factor: number; // multiplier, or absolute Rs when kind=dist & abs
  abs?: number;
}

const EXPERIMENTS: Experiment[] = [
  { id: "m2", question: "What happens if the mass doubles?", kind: "mass", factor: 2 },
  { id: "m5", question: "What if it were 5× more massive?", kind: "mass", factor: 5 },
  { id: "d2", question: "What if we fall to half the distance?", kind: "dist", factor: 0.5 },
  { id: "d10", question: "What changes at 10 Rs?", kind: "dist", abs: 10, factor: 1 },
  { id: "isco", question: "What happens near the ISCO (3 Rs)?", kind: "dist", abs: 3.2, factor: 1 },
];

interface Snapshot { mass: number; dist: number; rs: number; g: number; ve: number; tau: number; tidal: number }

function snap(mass: number, dist: number): Snapshot {
  const rs = schwarzschildRadiusM(mass);
  const r = dist * rs;
  return {
    mass, dist,
    rs: rs / 1000,
    g: gravAccel(mass, r),
    ve: escapeVelocity(mass, r) / 299792458,
    tau: dilationFactor(dist),
    tidal: tidalAccel(mass, r, 2),
  };
}

export function ExperimentsPanel() {
  const st = useStore();
  const [sel, setSel] = useState<Experiment>(EXPERIMENTS[0]);
  const [before, setBefore] = useState<Snapshot | null>(null);
  const [after, setAfter] = useState<Snapshot | null>(null);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  if (!st.experimentsOpen || st.phase === "intro") return null;

  const run = () => {
    if (running) return;
    const s = useStore.getState();
    const b = snap(s.massSolar, s.targetDistRs);
    const a =
      sel.kind === "mass"
        ? snap(Math.min(b.mass * sel.factor, 100), b.dist)
        : snap(b.mass, sel.abs ?? Math.max(b.dist * sel.factor, MIN_DIST_RS));
    setBefore(b);
    setAfter(a);
    setRunning(true);
    const t0 = performance.now();
    const dur = 2400;
    const step = (now: number) => {
      const k = Math.min((now - t0) / dur, 1);
      const e = k * k * (3 - 2 * k);
      const cur = useStore.getState();
      cur.setMass(b.mass + (a.mass - b.mass) * e);
      cur.setTargetDist(b.dist + (a.dist - b.dist) * e);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else setRunning(false);
    };
    raf.current = requestAnimationFrame(step);
  };

  const Row = ({ l, v, accent }: { l: string; v: string; accent?: boolean }) => (
    <div className="flex justify-between py-1" style={{ borderBottom: "1px solid var(--line)" }}>
      <span className="hud-label">{l}</span>
      <span className="font-inst text-[10.5px] num-tab" style={{ color: accent ? "var(--amber)" : "var(--ink)" }}>{v}</span>
    </div>
  );

  return (
    <div className="slide-r fixed left-4 bottom-16 z-40 anim-fade-up">
      <PanelFrame title="Experiment mode" onClose={() => st.patch({ experimentsOpen: false })} wide
        note="Before/after values are computed by the same engine that drives the simulation."
      >
        <div className="space-y-1 mb-4">
          {EXPERIMENTS.map((e) => (
            <button
              key={e.id}
              onClick={() => { sound.click(); setSel(e); setBefore(null); setAfter(null); }}
              className="w-full text-left font-inst text-[10px] px-3 py-2 transition-colors cursor-pointer"
              style={{
                color: sel.id === e.id ? "var(--amber)" : "var(--dim)",
                background: sel.id === e.id ? "rgba(255,154,60,0.07)" : "transparent",
                border: "1px solid",
                borderColor: sel.id === e.id ? "rgba(255,154,60,0.35)" : "var(--line)",
              }}
            >
              <span style={{ color: "var(--faint)" }}>Q · </span>
              {e.question}
            </button>
          ))}
        </div>

        <button className="btn-primary w-full mb-4 !py-2.5" onClick={run} disabled={running}>
          {running ? "Running…" : "Run experiment"}
        </button>

        {before && after && (
          <div className="grid grid-cols-2 gap-3 anim-fade-up">
            {[{ t: "Before", s: before }, { t: "After", s: after }].map(({ t, s }) => (
              <div key={t}>
                <div className="panel-title mb-2" style={{ color: t === "After" ? "var(--amber)" : "var(--faint)" }}>{t}</div>
                <Row l="Mass" v={`${fmtNum(s.mass, 1)} M☉`} accent={t === "After"} />
                <Row l="Rs" v={`${fmtNum(s.rs, 2)} km`} accent={t === "After"} />
                <Row l="Distance" v={`${fmtNum(s.dist, 1)} Rs`} />
                <Row l="g" v={`${fmtNum(s.g, 2)} m/s²`} />
                <Row l="v·escape" v={`${fmtNum(s.ve, 3)} c`} />
                <Row l="Δτ/Δt" v={fmtNum(s.tau, 4)} />
                <Row l="Tidal Δa" v={`${fmtNum(s.tidal, 2)} m/s²`} />
              </div>
            ))}
          </div>
        )}
      </PanelFrame>
    </div>
  );
}
