import { useStore } from "../state/store";
import { useLive } from "../state/live";
import { fmtNum, fmtDist, clamp } from "../physics/constants";
import { schwarzschildRadiusM } from "../physics/engine";
import { sound } from "../audio/sound";

const REGIONS = ["FAR FIELD", "INTERMEDIATE", "STRONG GRAVITY", "EXTREME", "EVENT HORIZON"] as const;

export default function HUD() {
  const st = useStore();
  const t = useLive(100);
  if (st.phase === "intro") return null;
  const visible = st.phase === "sim";
  const rsM = schwarzschildRadiusM(st.massSolar);

  const gaugeY = 1 - (Math.log(clamp(t.distRs, 1.01, 1000)) / Math.log(1000));

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* ── top left : identity ── */}
      <div className="absolute top-5 left-6 anim-fade-up d1">
        <div className="font-disp text-[13px] font-semibold tracking-[0.32em] uppercase text-white">
          Black Hole Lab
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="inline-block anim-pulse-dot" style={{ width: 5, height: 5, background: "var(--warn)" }} />
          <span className="hud-label">Live simulation</span>
          <span className="hud-label" style={{ color: "var(--faint)" }}>· {Math.round(t.fps)} FPS</span>
          <span className="hud-label" style={{ color: "var(--faint)" }}>· {st.quality}</span>
        </div>
      </div>

      {/* ── top right : primary readouts ── */}
      <div className="absolute top-5 right-6 text-right anim-fade-up d2 pointer-events-auto">
        <div className="hud-label">Mass</div>
        <div className="font-inst num-tab text-[17px] leading-tight text-white">
          {fmtNum(st.massSolar, 1)} <span className="text-[11px]" style={{ color: "var(--amber)" }}>M☉</span>
        </div>
        <div className="hud-label mt-2">Distance</div>
        <div className="font-inst num-tab text-[17px] leading-tight text-white">
          {fmtNum(t.distRs, t.distRs < 10 ? 2 : 1)} <span className="text-[11px]" style={{ color: "var(--amber)" }}>Rs</span>
        </div>
        <div className="font-inst num-tab text-[10px] mt-0.5" style={{ color: "var(--dim)" }}>
          {fmtDist(t.distRs * rsM)}
        </div>
      </div>

      {/* ── left : region gauge (approach) ── */}
      {(st.approach || st.telemetryOpen || st.expo) && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 anim-fade-in hidden md:block">
          <div className="relative" style={{ height: 220, width: 130 }}>
            <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: "var(--line-strong)" }} />
            {REGIONS.map((r, i) => {
              const y = (i / (REGIONS.length - 1)) * 100;
              const active = t.region === r;
              const danger = r === "EVENT HORIZON" && active;
              return (
                <div key={r} className="absolute left-0 flex items-center gap-2" style={{ top: `${y}%`, transform: "translateY(-50%)" }}>
                  <span className="inline-block" style={{ width: active ? 14 : 7, height: 1, background: active ? (danger ? "var(--warn)" : "var(--amber)") : "var(--faint)" }} />
                  <span
                    className={`font-inst text-[8px] tracking-[0.18em] transition-colors duration-300 ${danger ? "anim-warn" : ""}`}
                    style={{ color: danger ? "var(--warn)" : active ? "var(--ink)" : "var(--faint)" }}
                  >
                    {r}
                  </span>
                </div>
              );
            })}
            <div
              className="absolute transition-all duration-200"
              style={{ left: -3, top: `${gaugeY * 100}%`, width: 7, height: 7, transform: "translateY(-50%) rotate(45deg)", background: "var(--amber)", boxShadow: "0 0 10px rgba(255,154,60,0.8)" }}
            />
          </div>
        </div>
      )}

      {/* ── bottom left : distance scale ruler ── */}
      <div className="absolute bottom-6 left-6 hidden sm:block anim-fade-up d3">
        <div className="hud-label mb-2">Radial scale · log</div>
        <div className="relative" style={{ width: 190, height: 14 }}>
          <div className="absolute left-0 right-0 top-[6px] h-px" style={{ background: "var(--line-strong)" }} />
          {[1, 10, 100, 1000].map((v) => {
            const x = (Math.log10(v) / 3) * 100;
            return (
              <div key={v} className="absolute" style={{ left: `${x}%`, top: 0 }}>
                <div className="w-px h-[13px]" style={{ background: "var(--faint)" }} />
                <div className="font-inst text-[8px] mt-1 -translate-x-1/2" style={{ color: "var(--faint)" }}>{v}</div>
              </div>
            );
          })}
          <div
            className="absolute transition-all duration-150"
            style={{
              left: `${(Math.log10(clamp(t.distRs, 1, 1000)) / 3) * 100}%`,
              top: 1, width: 1, height: 11,
              background: "var(--amber)", boxShadow: "0 0 8px rgba(255,154,60,0.9)",
            }}
          />
        </div>
        <div className="font-inst text-[8.5px] mt-1.5" style={{ color: "var(--faint)" }}>
          1 Rs ≈ {fmtNum(t.rsKm, 2)} km · view uses compressed radial mapping
        </div>
      </div>

      {/* ── bottom center : approach ── */}
      <div className="absolute bottom-[74px] left-1/2 -translate-x-1/2 pointer-events-auto anim-fade-up d4">
        {st.horizonHold ? (
          <button className="btn-primary anim-warn" style={{ borderColor: "rgba(255,75,51,0.7)", color: "var(--warn)", background: "rgba(255,75,51,0.07)" }} onClick={() => st.returnFromHorizon()}>
            Horizon limit · Return
          </button>
        ) : st.approach ? (
          <button className="btn-primary" onClick={() => st.stopApproach()}>
            Hold position
          </button>
        ) : (
          <button className="btn-primary" onClick={() => st.startApproach()}>
            Approach the black hole
          </button>
        )}
      </div>

      {/* ── bottom strip : instrument controls ── */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto anim-fade-up d5">
        <div className="flex items-stretch justify-center" style={{ borderTop: "1px solid var(--line)", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center gap-1 overflow-x-auto px-2 py-2 max-w-full" style={{ scrollbarWidth: "none" }}>
            <StripBtn on={st.panelOpen} label="Controls" onClick={() => st.toggle("panelOpen")} />
            <StripBtn on={st.physicsOpen} label="Physics" onClick={() => st.toggle("physicsOpen")} />
            <StripBtn on={st.graphsOpen} label="Graphs" onClick={() => st.toggle("graphsOpen")} />
            <StripBtn on={st.clocksOpen} label="Clocks" onClick={() => st.toggle("clocksOpen")} />
            <Sep />
            <StripBtn on={st.probeOpen} label="Probe" onClick={() => st.toggle("probeOpen")} />
            <StripBtn on={st.tidalViz} label="Tidal" onClick={() => st.toggle("tidalViz")} />
            <StripBtn on={st.experimentsOpen} label="Experiments" onClick={() => st.toggle("experimentsOpen")} />
            <Sep />
            <StripBtn on={st.observatory} label="Observatory" onClick={() => st.toggle("observatory")} />
            <StripBtn on={st.expo} label="Expo mode" onClick={() => { if (st.expo) st.patch({ expo: false, expoCaption: null }); else { sound.click(); st.patch({ expo: true, expoProgress: 0, expoCaption: null }); } }} />
            <StripBtn on={st.archiveOpen} label="Archive" onClick={() => st.toggle("archiveOpen")} />
            <Sep />
            <StripBtn on={st.soundOn} label="Sound" onClick={() => { sound.init(); st.toggle("soundOn"); setTimeout(() => sound.setEnabled(useStore.getState().soundOn), 30); }} />
            <StripBtn label="Reset" onClick={() => st.reset()} />
          </div>
        </div>
      </div>

      {t.region === "EVENT HORIZON" && <div className="horizon-vignette" />}
    </div>
  );
}

function StripBtn({ label, on, onClick }: { label: string; on?: boolean; onClick: () => void }) {
  return (
    <button className={`btn-inst ${on ? "on" : ""}`} onClick={onClick} style={{ border: "none", padding: "7px 10px" }}>
      {label}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 self-center" style={{ width: 1, height: 16, background: "var(--line)" }} />;
}
