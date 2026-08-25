/* ── Physical constants (SI) ─────────────────────────────────────────── */

export const G = 6.6743e-11; // m³ kg⁻¹ s⁻²
export const C = 299792458; // m s⁻¹
export const M_SUN = 1.98892e30; // kg
export const RS_SUN = (2 * G * M_SUN) / (C * C); // ≈ 2953.25 m — Schwarzschild radius of 1 M☉

/* ── Scene mapping ──────────────────────────────────────────────────────
   The scene works in units where 1 Rs = RS_SCENE world units.
   Camera radius uses a compressed radial mapping  r_scene ∝ (r/Rs)^0.58
   so that the full range 1…1000 Rs remains explorable. Telemetry always
   reports PROPER distance in Rs / km — the compression is view-only. */

export const RS_SCENE = 2;
export const RADIAL_EXP = 0.58;
export const DISK_INNER_RS = 3; // ISCO for a Schwarzschild black hole
export const DISK_OUTER_RS = 8;
export const PHOTON_RS = 1.5;
export const SHADOW_RS = 2.598; // critical impact parameter ≈ 1.5·√3 Rs
export const MIN_DIST_RS = 1.015;
export const MAX_DIST_RS = 1000;

export const sysScaleFor = (massSolar: number) => Math.pow(clamp(massSolar, 1, 100) / 10, 0.35);

export const mapRsToScene = (distRs: number, scale: number) =>
  RS_SCENE * scale * Math.pow(Math.max(distRs, 1), RADIAL_EXP);

export const sceneToRs = (sceneRadius: number, scale: number) =>
  Math.pow(Math.max(sceneRadius, 0.0001) / (RS_SCENE * Math.max(scale, 0.001)), 1 / RADIAL_EXP);

/* ── small math kit ──────────────────────────────────────────────────── */

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const safe = (x: number, fallback = 0) =>
  Number.isFinite(x) ? x : fallback;

/* ── formatting ──────────────────────────────────────────────────────── */

export function fmtNum(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return "—";
  const ax = Math.abs(x);
  if (ax !== 0 && (ax >= 1e5 || ax < 1e-2)) return x.toExponential(digits);
  return x.toFixed(digits);
}

export function fmtDist(rMeters: number): string {
  if (!Number.isFinite(rMeters)) return "—";
  if (rMeters >= 9.46e15) return `${fmtNum(rMeters / 9.46e15, 2)} ly`;
  if (rMeters >= 1.496e11) return `${fmtNum(rMeters / 1.496e11, 2)} AU`;
  if (rMeters >= 1e6) return `${fmtNum(rMeters / 1000, 1)} km`;
  if (rMeters >= 1000) return `${fmtNum(rMeters / 1000, 3)} km`;
  return `${fmtNum(rMeters, 1)} m`;
}

export function fmtClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}
