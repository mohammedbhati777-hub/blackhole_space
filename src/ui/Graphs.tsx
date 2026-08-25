import { useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { useLive } from "../state/live";
import { PanelFrame } from "./atoms";
import { sampleCurve } from "../physics/engine";
import { fmtNum, clamp } from "../physics/constants";
import { sound } from "../audio/sound";

type Kind = "g" | "dilation" | "tidal";

const META: Record<Kind, { title: string; y: string; log: boolean; unit: string }> = {
  g: { title: "Gravitational acceleration g(r)", y: "m/s²", log: true, unit: "g = GM/r²" },
  dilation: { title: "Time dilation factor Δτ/Δt", y: "ratio", log: false, unit: "√(1 − Rs/r)" },
  tidal: { title: "Tidal Δa across 2 m", y: "m/s²", log: true, unit: "2GMΔr/r³" },
};

const W = 300, H = 170, PL = 10, PR = 10, PT = 12, PB = 20;

export default function Graphs() {
  const st = useStore();
  const t = useLive(140);
  const [kind, setKind] = useState<Kind>("g");
  const [hover, setHover] = useState<{ rs: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const curve = useMemo(() => sampleCurve(kind, st.massSolar, 130), [kind, st.massSolar]);

  const { path, area, yMin, yMax } = useMemo(() => {
    const vals = curve.vals;
    let lo: number, hi: number;
    if (META[kind].log) {
      lo = Math.min(...vals.map((v) => Math.log10(Math.max(v, 1e-30))));
      hi = Math.max(...vals.map((v) => Math.log10(Math.max(v, 1e-30))));
      lo = Math.min(lo, hi - 0.5);
    } else {
      lo = 0;
      hi = 1;
    }
    const xOf = (rs: number) => PL + ((Math.log10(rs) - Math.log10(1.05)) / (2 - Math.log10(1.05))) * (W - PL - PR);
    const yOf = (v: number) => {
      const lv = META[kind].log ? Math.log10(Math.max(v, 1e-30)) : v;
      return PT + (1 - (lv - lo) / (hi - lo || 1)) * (H - PT - PB);
    };
    let d = "";
    curve.rs.forEach((rs, i) => {
      d += `${i === 0 ? "M" : "L"}${xOf(rs).toFixed(1)},${yOf(vals[i]).toFixed(1)}`;
    });
    const a = d + `L${xOf(curve.rs[curve.rs.length - 1]).toFixed(1)},${H - PB}L${xOf(curve.rs[0]).toFixed(1)},${H - PB}Z`;
    return { path: d, area: a, yMin: lo, yMax: hi };
  }, [curve, kind]);

  const hoverVal = useMemo(() => {
    if (!hover) return null;
    const i = clamp(Math.round(((Math.log10(hover.rs) - Math.log10(1.05)) / (2 - Math.log10(1.05))) * (curve.rs.length - 1)), 0, curve.rs.length - 1);
    return curve.vals[i];
  }, [hover, curve]);

  if (!st.graphsOpen || st.phase === "intro") return null;

  const xOfRs = (rs: number) => PL + ((Math.log10(clamp(rs, 1.05, 100)) - Math.log10(1.05)) / (2 - Math.log10(1.05))) * (W - PL - PR);
  const curX = xOfRs(t.distRs);

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const frac = clamp((x - PL) / (W - PL - PR), 0, 1);
    const rs = 1.05 * Math.pow(100 / 1.05, frac);
    setHover({ rs, x, y: e.clientY - rect.top });
    st.patch({ graphHoverRs: rs });
  };

  return (
    <div className="fixed left-4 bottom-16 z-40 anim-fade-up">
      <PanelFrame title="Field graphs · computed live" onClose={() => { st.patch({ graphsOpen: false, graphHoverRs: null }); }}
        note="Hover to project a marker ring into the simulation."
      >
        <div className="flex gap-1 mb-3">
          {(Object.keys(META) as Kind[]).map((k) => (
            <button key={k} className={`btn-inst flex-1 !px-2 ${kind === k ? "on" : ""}`} onClick={() => { sound.click(); setKind(k); }}>
              {k === "g" ? "g(r)" : k === "dilation" ? "τ(r)" : "Δa(r)"}
            </button>
          ))}
        </div>

        <div className="hud-label mb-1">{META[kind].title}</div>
        <div className="hud-label mb-2" style={{ color: "var(--faint)" }}>{META[kind].unit} · M = {fmtNum(st.massSolar, 1)} M☉</div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,0.015)" }}
          onPointerMove={onMove}
          onPointerLeave={() => { setHover(null); st.patch({ graphHoverRs: null }); }}
        >
          {/* grid */}
          {[1, 10, 100].map((rs) => (
            <g key={rs}>
              <line x1={xOfRs(rs)} y1={PT} x2={xOfRs(rs)} y2={H - PB} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
              <text x={xOfRs(rs)} y={H - 7} fill="#52525a" fontSize="7" fontFamily="IBM Plex Mono" textAnchor="middle">{rs} Rs</text>
            </g>
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PL} y1={PT + f * (H - PT - PB)} x2={W - PR} y2={PT + f * (H - PT - PB)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}

          <path d={area} fill="rgba(255,154,60,0.07)" />
          <path d={path} fill="none" stroke="#ff9a3c" strokeWidth="1.4" />

          {/* current position */}
          <line x1={curX} y1={PT} x2={curX} y2={H - PB} stroke="#e8e6e1" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
          <circle cx={curX} cy={PT - 0} r="0" />

          {hover && hoverVal !== null && (
            <g>
              <line x1={hover.x} y1={PT} x2={hover.x} y2={H - PB} stroke="#9fc4ff" strokeWidth="1" opacity="0.6" />
              <circle cx={hover.x} cy={
                META[kind].log
                  ? PT + (1 - (Math.log10(Math.max(hoverVal, 1e-30)) - yMin) / (yMax - yMin || 1)) * (H - PT - PB)
                  : PT + (1 - (hoverVal - yMin) / (yMax - yMin || 1)) * (H - PT - PB)
              } r="3" fill="#9fc4ff" />
            </g>
          )}
        </svg>

        {hover && hoverVal !== null ? (
          <div className="flex justify-between mt-2 font-inst text-[9.5px] num-tab">
            <span style={{ color: "var(--cold)" }}>r = {fmtNum(hover.rs, 2)} Rs</span>
            <span style={{ color: "var(--ink)" }}>{META[kind].log ? fmtNum(hoverVal, 3) : fmtNum(hoverVal, 4)} {META[kind].y}</span>
          </div>
        ) : (
          <div className="mt-2 font-inst text-[9px]" style={{ color: "var(--faint)" }}>
            now · r = {fmtNum(t.distRs, 2)} Rs
          </div>
        )}
      </PanelFrame>
    </div>
  );
}
