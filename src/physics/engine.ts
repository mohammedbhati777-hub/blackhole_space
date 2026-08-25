/* ── Physics engine — pure functions, SI units internally ──────────────
   Model notes (scientific honesty):
   • Exterior gravity: Newtonian g = GM/r²  (valid far from the horizon)
   • Time dilation: exact Schwarzschild exterior factor √(1 − Rs/r)
   • Probe orbits: Paczyński–Wiita pseudo-Newtonian potential
     Φ = −GM/(r − Rs), which reproduces the ISCO, marginally bound orbit
     and horizon of a Schwarzschild black hole to good approximation.
   • Lensing in the renderer is a physically-motivated screen-space
     deflection (α ∝ Rs/b), not a full geodesic ray-trace.               */

import { G, C, M_SUN, RS_SUN, clamp, safe } from "./constants";

export const massKg = (massSolar: number) => clamp(massSolar, 0.1, 1e6) * M_SUN;

export function schwarzschildRadiusM(massSolar: number): number {
  return RS_SUN * clamp(massSolar, 0.1, 1e6);
}

export function gravAccel(massSolar: number, rMeters: number): number {
  const r = Math.max(rMeters, schwarzschildRadiusM(massSolar) * 1.0001);
  return safe((G * massKg(massSolar)) / (r * r));
}

export function escapeVelocity(massSolar: number, rMeters: number): number {
  const r = Math.max(rMeters, schwarzschildRadiusM(massSolar));
  return safe(Math.sqrt((2 * G * massKg(massSolar)) / r));
}

/** rRs = r / Rs — returns Δτ/Δt for a stationary clock at r. */
export function dilationFactor(rRs: number): number {
  return safe(Math.sqrt(Math.max(0, 1 - 1 / Math.max(rRs, 1.0000001))));
}

/** Δa ≈ 2GM·Δr / r³ across a body of length Δr. */
export function tidalAccel(massSolar: number, rMeters: number, deltaMeters = 2): number {
  const r = Math.max(rMeters, schwarzschildRadiusM(massSolar) * 1.0001);
  return safe((2 * G * massKg(massSolar) * deltaMeters) / (r * r * r));
}

export type Region = "FAR FIELD" | "INTERMEDIATE" | "STRONG GRAVITY" | "EXTREME" | "EVENT HORIZON";

export function regionFor(distRs: number): Region {
  if (distRs >= 50) return "FAR FIELD";
  if (distRs >= 12) return "INTERMEDIATE";
  if (distRs >= 4) return "STRONG GRAVITY";
  if (distRs >= 1.35) return "EXTREME";
  return "EVENT HORIZON";
}

/* ── Graph samplers (log-spaced over 1.05 … 100 Rs) ──────────────────── */

export interface Curve {
  rs: number[];
  vals: number[];
}

export function sampleCurve(
  kind: "g" | "dilation" | "tidal",
  massSolar: number,
  n = 110
): Curve {
  const rs: number[] = [];
  const vals: number[] = [];
  const Rs = schwarzschildRadiusM(massSolar);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const rRs = 1.05 * Math.pow(100 / 1.05, t);
    const r = rRs * Rs;
    rs.push(rRs);
    vals.push(
      kind === "g"
        ? gravAccel(massSolar, r)
        : kind === "dilation"
          ? dilationFactor(rRs)
          : tidalAccel(massSolar, r, 2)
    );
  }
  return { rs, vals };
}

/* ── Probe trajectories — Paczyński–Wiita, normalized units ────────────
   Units: Rs = 1, c = 1  →  GM = c²·Rs/2 = 0.5.                           */

export type ProbeOutcome =
  | "RUNNING"
  | "ESCAPE"
  | "ORBIT"
  | "CLOSE APPROACH"
  | "HORIZON CROSSING";

export interface Trajectory {
  points: Float32Array; // flat x,z pairs (Rs units, orbital plane)
  count: number;
  h: number; // integration step (normalized time)
  outcome: ProbeOutcome;
  minR: number;
  v0C: number; // launch speed as fraction of c
  energy: number; // specific orbital energy (c² units)
  totalT: number; // normalized duration
}

export interface ProbeParams {
  vFrac: number; // × local Newtonian circular speed
  r0Rs: number; // launch distance in Rs
  angleDeg: number; // 0 = tangential … 90 = radial plunge
}

const GM_N = 0.5;

export function computeTrajectory(p: ProbeParams): Trajectory {
  const r0 = clamp(p.r0Rs, 2, 200);
  const ang = (clamp(p.angleDeg, 0, 90) * Math.PI) / 180;
  const vCirc = Math.sqrt(GM_N / r0); // Newtonian circular speed (c = 1)
  const v0 = clamp(p.vFrac, 0.05, 3) * vCirc;

  const phi = 2.45; // launch azimuth in the orbital plane
  let x = r0 * Math.cos(phi);
  let z = r0 * Math.sin(phi);
  // tangential (prograde) and inward-radial unit vectors
  const tx = -Math.sin(phi), tz = Math.cos(phi);
  const ix = -Math.cos(phi), iz = -Math.sin(phi);
  let vx = v0 * (Math.cos(ang) * tx + Math.sin(ang) * ix);
  let vz = v0 * (Math.cos(ang) * tz + Math.sin(ang) * iz);

  const h = 0.0022;
  const maxSteps = 60000;
  const cap = Math.max(30000, maxSteps);
  const pts = new Float32Array(cap * 2);
  let n = 0;
  let minR = r0;

  const accel = (px: number, pz: number): [number, number] => {
    const r = Math.max(Math.hypot(px, pz), 1.000001);
    const g = GM_N / ((r - 1) * (r - 1)); // Paczyński–Wiita
    return [(-g * px) / r, (-g * pz) / r];
  };

  let outcome: ProbeOutcome = "RUNNING";
  const energy = 0.5 * (vx * vx + vz * vz) - GM_N / (r0 - 1);

  for (let i = 0; i < maxSteps && outcome === "RUNNING"; i++) {
    // velocity-Verlet with substepping near the hole
    const r = Math.hypot(x, z);
    minR = Math.min(minR, r);
    const sub = r < 3 ? 4 : r < 8 ? 2 : 1;
    const hh = h / sub;
    for (let s = 0; s < sub; s++) {
      const [ax1, az1] = accel(x, z);
      const nx = x + vx * hh + 0.5 * ax1 * hh * hh;
      const nz = z + vz * hh + 0.5 * az1 * hh * hh;
      const [ax2, az2] = accel(nx, nz);
      vx += 0.5 * (ax1 + ax2) * hh;
      vz += 0.5 * (az1 + az2) * hh;
      x = nx; z = nz;
    }
    const rr = Math.hypot(x, z);
    if (rr <= 1.002) { outcome = "HORIZON CROSSING"; x = x / rr * 1.001; z = z / rr * 1.001; }
    else if (rr > Math.max(3 * r0, 60) && energy >= 0) outcome = "ESCAPE";
    if (n < cap) { pts[n * 2] = x; pts[n * 2 + 1] = z; n++; }
    if (outcome === "RUNNING" && rr <= 1.002) outcome = "HORIZON CROSSING";
  }

  if (outcome === "RUNNING") {
    outcome = energy >= 0 ? "ESCAPE" : minR < 2.6 ? "CLOSE APPROACH" : "ORBIT";
  }

  return { points: pts, count: n, h, outcome, minR, v0C: v0, energy, totalT: n * h };
}
