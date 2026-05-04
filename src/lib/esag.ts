// ESAG (Elliptically Symmetric Angular Gaussian) distribution on S^2
// Following Paine, Preston, Tsagris, Wood (2018), Stat Comput 28, 689-697.
// Parameterisation of section 2.3 in terms of unrestricted gamma = (g1, g2).

export type Vec3 = [number, number, number];
export type Mat3 = number[]; // row-major length 9

const SQRT_2PI = Math.sqrt(2 * Math.PI);

// Standard normal pdf and cdf (Abramowitz & Stegun erf approximation).
export function phi(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function Phi(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// M_2(alpha) = (1+alpha^2)*Phi(alpha) + alpha*phi(alpha)   — eq. (4) for d=3
export function M2(alpha: number): number {
  return (1 + alpha * alpha) * Phi(alpha) + alpha * phi(alpha);
}

// Build orthonormal frame (xi1_tilde, xi2_tilde, xi3) from mu, eq. (14).
function frame(mu: Vec3): { xi1: Vec3; xi2: Vec3; xi3: Vec3; alpha: number } {
  const [m1, m2, m3] = mu;
  const alpha = Math.hypot(m1, m2, m3);
  const xi3: Vec3 = [m1 / alpha, m2 / alpha, m3 / alpha];
  let mu0 = Math.hypot(m2, m3);
  // Handle indeterminacy when mu2=mu3=0: rotate slightly.
  if (mu0 < 1e-9) {
    // Use canonical orthogonal frame to xi3.
    // Pick any vector not parallel to xi3.
    const a: Vec3 = Math.abs(xi3[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const x1 = cross(a, xi3);
    const n1 = norm(x1);
    const xi1: Vec3 = [x1[0] / n1, x1[1] / n1, x1[2] / n1];
    const xi2 = cross(xi3, xi1);
    return { xi1, xi2, xi3, alpha };
  }
  const xi1: Vec3 = [-(mu0 * mu0) / (mu0 * alpha), (m1 * m2) / (mu0 * alpha), (m1 * m3) / (mu0 * alpha)];
  const xi2: Vec3 = [0, -m3 / mu0, m2 / mu0];
  return { xi1, xi2, xi3, alpha };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Compute V^{-1} per eq. (18) given mu and gamma.
// Returns 3x3 symmetric matrix (row-major).
export function VinvFromParams(mu: Vec3, gamma: [number, number]): Mat3 {
  const { xi1, xi2, xi3 } = frame(mu);
  const [g1, g2] = gamma;
  const s = Math.sqrt(g1 * g1 + g2 * g2 + 1) - 1;

  const M = new Array(9).fill(0) as number[];
  // I3
  M[0] = 1;
  M[4] = 1;
  M[8] = 1;

  const add = (coef: number, u: Vec3, v: Vec3) => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        M[i * 3 + j] += coef * u[i] * v[j];
      }
    }
  };
  // gamma1 (xi1 xi1^T - xi2 xi2^T)
  add(g1, xi1, xi1);
  add(-g1, xi2, xi2);
  // gamma2 (xi1 xi2^T + xi2 xi1^T)
  add(g2, xi1, xi2);
  add(g2, xi2, xi1);
  // s (xi1 xi1^T + xi2 xi2^T)
  add(s, xi1, xi1);
  add(s, xi2, xi2);
  return M;
}

function quad(M: Mat3, y: Vec3): number {
  // y^T M y
  let s = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      s += y[i] * M[i * 3 + j] * y[j];
    }
  }
  return s;
}

function matVec(M: Mat3, y: Vec3): Vec3 {
  return [
    M[0] * y[0] + M[1] * y[1] + M[2] * y[2],
    M[3] * y[0] + M[4] * y[1] + M[5] * y[2],
    M[6] * y[0] + M[7] * y[1] + M[8] * y[2],
  ];
}

// ESAG density on S^2, eq. (7) with d=3.
// C_d = 1 / (2*pi)^((d-1)/2) = 1/(2*pi) for d=3.
const C3 = 1 / (2 * Math.PI);

export interface ESAGContext {
  mu: Vec3;
  Vinv: Mat3;
  alpha2: number; // ||mu||^2
  alpha: number;
}

export function makeESAG(mu: Vec3, gamma: [number, number]): ESAGContext {
  const Vinv = VinvFromParams(mu, gamma);
  const alpha2 = mu[0] * mu[0] + mu[1] * mu[1] + mu[2] * mu[2];
  return { mu, Vinv, alpha2, alpha: Math.sqrt(alpha2) };
}

export function esagDensity(ctx: ESAGContext, y: Vec3): number {
  const { mu, Vinv, alpha2 } = ctx;
  const q = quad(Vinv, y); // y^T V^-1 y
  const ymu = dot(y, mu);
  const denom = Math.pow(q, 1.5);
  const ratio = ymu / Math.sqrt(q);
  const expPart = Math.exp(0.5 * ((ymu * ymu) / q - alpha2));
  return (C3 / denom) * expPart * M2(ratio);
}

// IAG (isotropic): gamma=0, V=I -> Vinv=I.
export function iagDensity(mu: Vec3, y: Vec3): number {
  const ctx = makeESAG(mu, [0, 0]);
  return esagDensity(ctx, y);
}

// --- Kent (FB5) distribution for comparison.
// f(y) = c(kappa, beta)^-1 exp{ kappa * gamma3.y + beta [(gamma1.y)^2 - (gamma2.y)^2] }
// Here gamma3 = mean direction, gamma1, gamma2 are major/minor axes orthogonal to gamma3.
// We compute the density unnormalized and normalize numerically over a sphere mesh
// the dashboard uses, so normalization constant is consistent across comparisons.
export interface KentContext {
  g1: Vec3;
  g2: Vec3;
  g3: Vec3;
  kappa: number;
  beta: number;
}

export function makeKentFromESAG(mu: Vec3, gamma: [number, number]): KentContext {
  // Match concentration via kappa = ||mu||^2 (large-alpha tangent variance is mu-driven),
  // and ovalness via beta = 0.5 * ||gamma|| * kappa heuristic — purely for visual comparison.
  const f = frame(mu);
  const kappa = f.alpha * f.alpha;
  const beta = 0.25 * kappa * Math.hypot(gamma[0], gamma[1]);
  // Rotate axes by half the angle of gamma to align ellipse orientation.
  const psi = 0.5 * Math.atan2(gamma[1], gamma[0]);
  const c = Math.cos(psi);
  const s = Math.sin(psi);
  const g1: Vec3 = [c * f.xi1[0] + s * f.xi2[0], c * f.xi1[1] + s * f.xi2[1], c * f.xi1[2] + s * f.xi2[2]];
  const g2: Vec3 = [-s * f.xi1[0] + c * f.xi2[0], -s * f.xi1[1] + c * f.xi2[1], -s * f.xi1[2] + c * f.xi2[2]];
  return { g1, g2, g3: f.xi3, kappa, beta };
}

export function kentUnnorm(ctx: KentContext, y: Vec3): number {
  const a = dot(ctx.g3, y);
  const b = dot(ctx.g1, y);
  const c = dot(ctx.g2, y);
  return Math.exp(ctx.kappa * a + ctx.beta * (b * b - c * c));
}

// Mode of ESAG (used for camera focus): closest grid sample to mu/||mu||.
export function esagModeDir(mu: Vec3): Vec3 {
  const a = norm(mu);
  return [mu[0] / a, mu[1] / a, mu[2] / a];
}

export { dot, norm, cross, frame };