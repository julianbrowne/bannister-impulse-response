// Bannister (1991) parameters — weekly timestep:
//   τ₁ (fitness)  ≈ 45 days  →  kFit = 7/45 ≈ 0.1/week
//   τ₂ (fatigue)  ≈ 15 days  →  kFat = 7/15 ≈ 0.5/week
//   k₂/k₁ ≈ 2 (published range 1.3–3.5; Fitz-Clarke et al. 1991)
export const WEEKLY = { kFit:0.1, kFat:0.5, wFit:1.0, wFat:2.0 };

// Session-level params for steady-build view (daily timestep):
//   τ₁ ≈ 45 days  →  kFit = 1/45 ≈ 0.022/day
//   τ₂ ≈ 1.4 days →  kFat = 0.7/day  (acute fatigue clears in 2 rest days)
export const DAILY  = { kFit:0.022, kFat:0.7, wFit:1.0, wFat:2.0 };

export function simulate(loads, p = WEEKLY) {
  let fit = 0, fat = 0;
  const fits = [], fats = [], perfs = [];
  loads.forEach(w => {
    fit = fit * Math.exp(-p.kFit) + p.wFit * w;
    fat = fat * Math.exp(-p.kFat) + p.wFat * w;
    fits.push(Math.round(fit * 10) / 10);
    fats.push(Math.round(fat * 10) / 10);
    perfs.push(Math.round((fit - fat) * 10) / 10);
  });
  return { fits, fats, perfs };
}
