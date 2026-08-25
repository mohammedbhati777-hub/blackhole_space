import type { ReactNode } from "react";
import { useStore } from "../state/store";
import { sound } from "../audio/sound";

/* ── minimal line diagrams ───────────────────────────────────────────── */

const stroke = "rgba(232,230,225,0.5)";
const amber = "#ff9a3c";

const Diag = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 120 70" className="w-full h-auto" style={{ maxWidth: 210 }}>
    {children}
  </svg>
);

const DIAGRAMS: Record<string, ReactNode> = {
  hole: (
    <Diag>
      <circle cx="60" cy="35" r="12" fill="none" stroke={amber} strokeWidth="1" />
      <circle cx="60" cy="35" r="7" fill="#000" stroke={stroke} strokeWidth="0.7" />
      <ellipse cx="60" cy="35" rx="26" ry="6" fill="none" stroke={stroke} strokeWidth="0.7" strokeDasharray="3 2" />
      <text x="60" y="62" textAnchor="middle" fontSize="5" fill={stroke} fontFamily="IBM Plex Mono">escape velocity &gt; c</text>
    </Diag>
  ),
  horizon: (
    <Diag>
      <circle cx="60" cy="35" r="14" fill="none" stroke={amber} strokeWidth="1" />
      <path d="M20 20 L48 33" stroke={stroke} strokeWidth="0.8" />
      <path d="M48 33 L38 44" stroke={stroke} strokeWidth="0.8" strokeDasharray="2 2" />
      <path d="M100 50 L73 38" stroke={stroke} strokeWidth="0.8" />
      <path d="M73 38 L84 26" stroke={stroke} strokeWidth="0.8" strokeDasharray="2 2" />
      <text x="60" y="62" textAnchor="middle" fontSize="5" fill={stroke} fontFamily="IBM Plex Mono">light cones tip inward</text>
    </Diag>
  ),
  rs: (
    <Diag>
      <line x1="60" y1="8" x2="60" y2="58" stroke={stroke} strokeWidth="0.8" />
      <line x1="55" y1="8" x2="65" y2="8" stroke={stroke} strokeWidth="0.8" />
      <line x1="55" y1="58" x2="65" y2="58" stroke={stroke} strokeWidth="0.8" />
      <text x="72" y="36" fontSize="6" fill={amber} fontFamily="IBM Plex Mono">Rs = 2GM/c²</text>
      <circle cx="30" cy="33" r="4" fill="none" stroke={stroke} strokeWidth="0.8" />
      <text x="30" y="48" textAnchor="middle" fontSize="4.5" fill={stroke} fontFamily="IBM Plex Mono">M</text>
    </Diag>
  ),
  lens: (
    <Diag>
      <circle cx="60" cy="35" r="8" fill="#000" stroke={amber} strokeWidth="1" />
      <path d="M10 22 Q 40 30 52 29 Q 44 33 10 40" fill="none" stroke={stroke} strokeWidth="0.8" />
      <path d="M110 22 Q 80 30 68 29 Q 76 33 110 40" fill="none" stroke={stroke} strokeWidth="0.8" />
      <path d="M10 52 L48 39" stroke={stroke} strokeWidth="0.8" />
      <path d="M110 52 L72 39" stroke={stroke} strokeWidth="0.8" />
    </Diag>
  ),
  time: (
    <Diag>
      <rect x="22" y="16" width="24" height="34" fill="none" stroke={stroke} strokeWidth="0.8" />
      <line x1="34" y1="33" x2="34" y2="23" stroke={amber} strokeWidth="1" />
      <line x1="34" y1="33" x2="40" y2="36" stroke={amber} strokeWidth="1" />
      <rect x="74" y="16" width="24" height="34" fill="none" stroke={stroke} strokeWidth="0.8" />
      <line x1="86" y1="33" x2="86" y2="21" stroke={stroke} strokeWidth="1" />
      <line x1="86" y1="33" x2="94" y2="30" stroke={stroke} strokeWidth="1" />
      <text x="34" y="60" textAnchor="middle" fontSize="4.5" fill={amber} fontFamily="IBM Plex Mono">at r</text>
      <text x="86" y="60" textAnchor="middle" fontSize="4.5" fill={stroke} fontFamily="IBM Plex Mono">far away</text>
    </Diag>
  ),
  tidal: (
    <Diag>
      <circle cx="20" cy="35" r="9" fill="#000" stroke={amber} strokeWidth="1" />
      <line x1="52" y1="35" x2="36" y2="35" stroke={amber} strokeWidth="1.4" />
      <path d="M38 32 L34 35 L38 38" fill="none" stroke={amber} strokeWidth="1" />
      <line x1="68" y1="35" x2="58" y2="35" stroke={stroke} strokeWidth="1.2" />
      <path d="M60 32 L56 35 L60 38" fill="none" stroke={stroke} strokeWidth="1" />
      <rect x="52" y="29" width="16" height="12" fill="none" stroke={stroke} strokeWidth="0.8" />
      <line x1="84" y1="35" x2="79" y2="35" stroke={stroke} strokeWidth="1" />
      <path d="M81 32 L77 35 L81 38" fill="none" stroke={stroke} strokeWidth="1" />
      <text x="60" y="60" textAnchor="middle" fontSize="4.5" fill={stroke} fontFamily="IBM Plex Mono">Δa ≈ 2GMΔr/r³</text>
    </Diag>
  ),
  disk: (
    <Diag>
      <circle cx="60" cy="35" r="7" fill="#000" stroke={stroke} strokeWidth="0.8" />
      <ellipse cx="60" cy="35" rx="34" ry="9" fill="none" stroke={amber} strokeWidth="1" />
      <ellipse cx="60" cy="35" rx="22" ry="5.5" fill="none" stroke={amber} strokeWidth="0.7" opacity="0.7" />
      <ellipse cx="60" cy="35" rx="13" ry="3" fill="none" stroke={amber} strokeWidth="0.6" opacity="0.5" />
      <path d="M94 35 a34 9 0 0 1 -8 6" fill="none" stroke={stroke} strokeWidth="0.8" />
      <text x="60" y="62" textAnchor="middle" fontSize="4.5" fill={stroke} fontFamily="IBM Plex Mono">ISCO at 3 Rs</text>
    </Diag>
  ),
};

/* ── content ─────────────────────────────────────────────────────────── */

const ENTRIES = [
  {
    id: "01", d: "hole", t: "What is a black hole?",
    f: "v·escape > c",
    body: "A region where so much mass is concentrated in so little volume that nothing — not even light — can climb out of its gravity well. Crucially, a black hole does not “suck”: at ordinary distances its gravity is exactly the gravity its mass always had. Replace the Sun with a 1 M☉ black hole and the planets keep their orbits.",
  },
  {
    id: "02", d: "horizon", t: "What is the event horizon?",
    f: "r = Rs",
    body: "The boundary of no return. It is not a surface — an astronaut crossing it would notice nothing locally. But every future light cone inside points inward, so no signal sent from within can ever reach the outside universe.",
  },
  {
    id: "03", d: "rs", t: "What is the Schwarzschild radius?",
    f: "Rs = 2GM/c²",
    body: "The horizon radius of a non-rotating black hole, found by Karl Schwarzschild in 1916. It scales linearly with mass: the Sun would need to be compressed to ≈ 2.95 km, the Earth to ≈ 9 mm. Double the mass, double the radius.",
  },
  {
    id: "04", d: "lens", t: "What is gravitational lensing?",
    f: "α ≈ 4GM/(c²b)",
    body: "Mass curves spacetime, and light follows that curvature. Stars seen near a black hole's edge appear displaced, stretched into arcs, and can form a full Einstein ring. The dark “shadow” is ringed by light that orbited the hole before escaping.",
  },
  {
    id: "05", d: "time", t: "What is time dilation?",
    f: "Δτ = Δt·√(1 − Rs/r)",
    body: "Clocks deeper in a gravitational well tick slower as measured by a distant observer. At 4 Rs your clock runs at half speed; at the horizon the factor reaches zero. This is measured daily — GPS satellites correct for it.",
  },
  {
    id: "06", d: "tidal", t: "What are tidal forces?",
    f: "Δa ≈ 2GMΔr/r³",
    body: "Gravity weakens with distance, so your feet are pulled harder than your head — a stretch, the same effect that raises Earth's ocean tides. For a stellar-mass black hole this “spaghettification” is lethal far outside the horizon; for a supermassive one you could cross the horizon comfortably.",
  },
  {
    id: "07", d: "disk", t: "What is an accretion disk?",
    f: "T ∝ r^(−3/4)",
    body: "Infalling gas carries angular momentum, so it spirals rather than plunges. Friction heats it to millions of kelvin, glowing from white-hot at the inner edge (the ISCO, at 3 Rs) to dull red outside. The approaching side appears brighter — relativistic beaming.",
  },
];

export default function Archive() {
  const open = useStore((s) => s.archiveOpen);
  const patch = useStore((s) => s.patch);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 anim-fade-in" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[880px] mx-auto px-6 py-14">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="panel-title mb-3">Scientific archive</div>
              <h2 className="font-disp font-light uppercase text-white" style={{ fontSize: "clamp(22px,4vw,36px)", letterSpacing: "0.24em" }}>
                Field notes on<br /><span style={{ color: "var(--amber)" }}>extreme gravity</span>
              </h2>
            </div>
            <button className="btn-inst" onClick={() => { sound.click(); patch({ archiveOpen: false }); }}>Close</button>
          </div>
          <p className="font-inst text-[10px] leading-relaxed max-w-xl mb-10" style={{ color: "var(--faint)" }}>
            Seven concepts, kept short. Every formula here drives the live simulation behind this page.
          </p>

          <div className="space-y-px">
            {ENTRIES.map((e) => (
              <div key={e.id} className="grid md:grid-cols-[64px_190px_1fr] gap-5 py-7 items-start group" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="font-inst text-[11px] pt-1" style={{ color: "var(--faint)" }}>{e.id}</div>
                <div className="transition-opacity duration-300 opacity-80 group-hover:opacity-100">{DIAGRAMS[e.d]}</div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-3 mb-2">
                    <h3 className="font-disp text-[16px] font-medium text-white tracking-wide">{e.t}</h3>
                    <span className="font-inst text-[9.5px] px-2 py-0.5" style={{ color: "var(--amber)", border: "1px solid rgba(255,154,60,0.35)" }}>{e.f}</span>
                  </div>
                  <p className="font-inst text-[10.5px] leading-[1.8]" style={{ color: "var(--dim)" }}>{e.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="py-8" style={{ borderTop: "1px solid var(--line)" }}>
            <p className="font-inst text-[8.5px] leading-relaxed" style={{ color: "var(--faint)" }}>
              BLACK HOLE LAB · a college Skill Expo project. Simplified models — Newtonian exterior gravity, exact
              Schwarzschild time dilation, Paczyński–Wiita orbits, screen-space lensing approximation. An educational
              visualization, not a research-grade relativistic simulator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
