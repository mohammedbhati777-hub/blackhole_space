import { useStore, type LabelKey } from "../state/store";
import { sound } from "../audio/sound";

const INFO: Record<LabelKey, { title: string; body: string; extra?: string }> = {
  horizon: {
    title: "Event horizon",
    body: "The boundary where escape velocity equals the speed of light (vₑ ≈ c). Not a physical surface — locally, crossing it feels like nothing at all. But every light cone inside tips inward: no information can propagate outward again.",
    extra: "For this hole: r = Rs = 2GM/c².",
  },
  disk: {
    title: "Accretion disk",
    body: "Gas with angular momentum spirals inward through the disk, shearing and heating as it falls. Temperature follows T ∝ r^(−3/4): white-hot near the inner edge, cool red outside. Inner edge sits at the ISCO — 3 Rs — inside which stable orbits are impossible.",
    extra: "The approaching side is brighter: relativistic Doppler beaming.",
  },
  photon: {
    title: "Photon region",
    body: "At 1.5 Rs gravity is strong enough that light itself can orbit the black hole. These orbits are unstable — a photon nudged inward falls through the horizon; one nudged outward escapes, forming the bright photon ring you see outlining the shadow.",
    extra: "The apparent shadow edge lies at ≈ 2.6 Rs (the critical impact parameter).",
  },
  lensing: {
    title: "Gravitational lensing",
    body: "Mass curves spacetime, so light passing near the hole follows bent paths. Background stars are displaced outward, smeared into arcs, and compressed into an Einstein ring at the shadow's edge. Deflection scales as α ∝ Rs / impact parameter.",
    extra: "Toggle LENSING in Controls to compare lensed vs. unlensed sky.",
  },
};

export default function LabelInfo() {
  const key = useStore((s) => s.labelInfo);
  const patch = useStore((s) => s.patch);
  if (!key) return null;
  const d = INFO[key];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
      <div className="panel pointer-events-auto w-[380px] max-w-[92vw] anim-fade-up">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
          <span className="panel-title" style={{ color: "var(--amber)" }}>{d.title}</span>
          <button
            onClick={() => { sound.click(); patch({ labelInfo: null }); }}
            className="cursor-pointer transition-colors hover:text-white"
            style={{ color: "var(--dim)", background: "none", border: "none" }}
            aria-label="close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
        </div>
        <div className="px-4 py-4">
          <p className="font-inst text-[10.5px] leading-[1.85]" style={{ color: "var(--dim)" }}>{d.body}</p>
          {d.extra && (
            <p className="font-inst text-[9.5px] mt-3 pt-3 leading-relaxed" style={{ color: "var(--faint)", borderTop: "1px dashed var(--line)" }}>
              ▸ {d.extra}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
