import type { ReactNode } from "react";
import { clamp } from "../physics/constants";
import { sound } from "../audio/sound";

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="panel-title shrink-0">{title}</span>
          <span className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        {right}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  log?: boolean;
  display: string;
  sub?: string;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min, max, step = 0.01, log, display, sub, onChange }: SliderProps) {
  const v = clamp(value, min, max);
  const t = log
    ? Math.log(v / min) / Math.log(max / min)
    : (v - min) / (max - min);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="hud-label">{label}</span>
        <span className="font-inst text-[11px] num-tab" style={{ color: "var(--ink)" }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1000}
        step={step}
        value={Math.round(t * 1000)}
        style={{ ["--fill" as any]: `${t * 100}%` }}
        onChange={(e) => {
          const tt = Number(e.target.value) / 1000;
          const nv = log ? min * Math.pow(max / min, tt) : min + (max - min) * tt;
          onChange(nv);
        }}
      />
      {sub && <div className="hud-label mt-0.5" style={{ color: "var(--faint)" }}>{sub}</div>}
    </div>
  );
}

export function Toggle({ label, on, onClick, small }: { label: string; on: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={() => { sound.click(); onClick(); }}
      className="flex items-center justify-between w-full group cursor-pointer"
      style={{ background: "none", border: "none", padding: 0 }}
    >
      <span className={`hud-label group-hover:text-white transition-colors ${small ? "" : "!text-[10px]"}`}>{label}</span>
      <span
        className="relative inline-block transition-colors duration-200"
        style={{
          width: 26, height: 12,
          border: `1px solid ${on ? "rgba(255,154,60,0.7)" : "var(--line-strong)"}`,
          background: on ? "rgba(255,154,60,0.12)" : "transparent",
        }}
      >
        <span
          className="absolute top-[2px] transition-all duration-200"
          style={{
            left: on ? 15 : 2, width: 7, height: 7,
            background: on ? "var(--amber)" : "var(--faint)",
            boxShadow: on ? "0 0 8px rgba(255,154,60,0.7)" : "none",
          }}
        />
      </span>
    </button>
  );
}

export function Seg<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="hud-label mb-1.5">{label}</div>
      <div className="flex" style={{ border: "1px solid var(--line)" }}>
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => { sound.click(); onChange(o.v); }}
            className="flex-1 font-inst text-[9px] tracking-[0.14em] uppercase py-1.5 transition-all duration-200 cursor-pointer"
            style={{
              background: value === o.v ? "rgba(255,154,60,0.12)" : "transparent",
              color: value === o.v ? "var(--amber)" : "var(--dim)",
              borderLeft: "1px solid var(--line)",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Readout({ label, value, unit, big, warn }: {
  label: string; value: string; unit?: string; big?: boolean; warn?: boolean;
}) {
  return (
    <div>
      <div className="hud-label mb-0.5">{label}</div>
      <div
        className={`font-inst num-tab leading-tight ${big ? "text-[19px]" : "text-[13px]"}`}
        style={{ color: warn ? "var(--warn)" : "var(--ink)" }}
      >
        {value}
        {unit && <span className="ml-1 text-[10px]" style={{ color: "var(--dim)" }}>{unit}</span>}
      </div>
    </div>
  );
}

export function PanelFrame({ title, onClose, children, wide, note }: {
  title: string; onClose: () => void; children: ReactNode; wide?: boolean; note?: string;
}) {
  return (
    <div className={`panel flex flex-col max-h-full ${wide ? "w-[420px]" : "w-[300px]"} max-w-[92vw]`}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
        <span className="panel-title" style={{ color: "var(--dim)" }}>{title}</span>
        <button onClick={onClose} className="cursor-pointer transition-colors hover:text-white" style={{ color: "var(--dim)", background: "none", border: "none" }} aria-label="close">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
      </div>
      <div className="px-4 py-4 overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {children}
      </div>
      {note && (
        <div className="px-4 py-2 font-inst text-[8.5px] leading-relaxed" style={{ color: "var(--faint)", borderTop: "1px solid var(--line)" }}>
          {note}
        </div>
      )}
    </div>
  );
}
