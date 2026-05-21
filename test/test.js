// Bannister Impulse Response – model correctness tests
// Run with: node test.js

import { WEEKLY, DAILY, simulate, LOADS } from '../js/model.js';

const { steady: STEADY, taper: TAPER, overreach: OVERREACH, rest: REST } = LOADS;

// ── Test harness ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? `\n       ${detail}` : ''}`);
    failed++;
  }
}
function section(name) { console.log(`\n${name}`); }
const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;

// ── Weekly model invariants ───────────────────────────────────────────────────
section('Weekly model invariants (Bannister 1991)');

const { kFit, kFat, wFit, wFat } = WEEKLY;

assert(
  'Fitness decays slower than fatigue (τ₁ ≈ 45d > τ₂ ≈ 15d)',
  Math.exp(-kFit) > Math.exp(-kFat),
  `weekly retention: fit=${(Math.exp(-kFit)*100).toFixed(1)}%, fat=${(Math.exp(-kFat)*100).toFixed(1)}%`
);

const fitSSperLoad = wFit / (1 - Math.exp(-kFit));
const fatSSperLoad = wFat / (1 - Math.exp(-kFat));
assert(
  'Steady-state readiness positive at any constant load',
  fitSSperLoad > fatSSperLoad,
  `fit_ss=${fitSSperLoad.toFixed(2)}, fat_ss=${fatSSperLoad.toFixed(2)} per unit load`
);

const tauFitDays = (1 / kFit) * 7;
const tauFatDays = (1 / kFat) * 7;
assert('τ₁ (fitness) in published range 30–70 days', tauFitDays >= 30 && tauFitDays <= 70, `τ₁ = ${tauFitDays.toFixed(0)} days`);
assert('τ₂ (fatigue) in published range 10–21 days', tauFatDays >= 10 && tauFatDays <= 21, `τ₂ = ${tauFatDays.toFixed(0)} days`);
assert('k₂/k₁ ratio in published range 1.3–3.5', (wFat/wFit) >= 1.3 && (wFat/wFit) <= 3.5, `k₂/k₁ = ${(wFat/wFit).toFixed(1)}`);

// ── Daily model invariants ────────────────────────────────────────────────────
section('Daily (session-level) model invariants');

const dFitSSperLoad = DAILY.wFit / (1 - Math.exp(-DAILY.kFit));
const dFatSSperLoad = DAILY.wFat / (1 - Math.exp(-DAILY.kFat));
assert(
  'Daily model: steady-state readiness positive',
  dFitSSperLoad > dFatSSperLoad,
  `fit_ss=${dFitSSperLoad.toFixed(1)}, fat_ss=${dFatSSperLoad.toFixed(1)} per unit load`
);

// Two rest days (load=0) should clear most acute fatigue: exp(-2·kFat) < 0.30
const twoRestRetention = Math.exp(-2 * DAILY.kFat);
assert(
  'Two rest days clear ≥ 70% of acute fatigue (τ₂≈1.4d)',
  twoRestRetention < 0.30,
  `retention after 2 rest days: ${(twoRestRetention*100).toFixed(1)}%`
);

// Fitness barely changes in 2 rest days: exp(-2·kFit) > 0.95
const twoRestFitRetention = Math.exp(-2 * DAILY.kFit);
assert(
  'Fitness retained >95% over 2 rest days',
  twoRestFitRetention > 0.95,
  `retention: ${(twoRestFitRetention*100).toFixed(1)}%`
);

// ── Steady build (session-level) ──────────────────────────────────────────────
section('Steady build: fatigue clears near-zero between sessions');

const { fits: sFit, fats: sFat, perfs: sPerf } = simulate(STEADY, DAILY);

// Session days: indices 0,3,6,9,12,15,18  (load > 0)
// Pre-session rest days (second rest day before next session): indices 2,5,8,11,14,17
const sessionIdx    = [0, 3, 6, 9, 12, 15, 18];
const preSessionIdx = [2, 5, 8, 11, 14, 17];     // the 2nd rest day before each session

assert(
  'Fatigue starts at 0 before first session (simulate initialises at zero)',
  sFat[0] === DAILY.wFat * STEADY[0],
  `D1 fat=${sFat[0]} = wFat(${DAILY.wFat}) × load(${STEADY[0]}); pre-session state is always 0`
);

assert(
  'Session-day fatigue exceeds fitness on day 1 (acute spike visible)',
  sFat[0] > sFit[0],
  `D1: fit=${sFit[0]}, fat=${sFat[0]}`
);

// Pre-session fat should drop to < 30% of the preceding session's fat
const presessionRatios = preSessionIdx.map((pi, i) => sFat[pi] / sFat[sessionIdx[i]]);
assert(
  'Pre-session fatigue < 30% of preceding session peak (near-zero recovery)',
  presessionRatios.every(r => r < 0.30),
  `ratios: ${presessionRatios.map(r=>(r*100).toFixed(1)+'%').join(', ')}`
);

assert(
  'Fatigue minimum across all days is < 5 (visible near-zero on chart)',
  Math.min(...sFat) < 5,
  `min fatigue = ${Math.min(...sFat).toFixed(1)}`
);

assert(
  'Fitness rises across all sessions (compounding over rest days)',
  sessionIdx.every((si, i) => i === 0 || sFit[si] > sFit[sessionIdx[i-1]]),
  `session fits: ${sessionIdx.map(i=>sFit[i]).join(', ')}`
);

// Readiness on pre-session rest days should trend upward
const preReadiness = preSessionIdx.map(i => sPerf[i]);
assert(
  'Pre-session readiness trends upward (early sessions < later sessions)',
  preReadiness[0] < preReadiness[preReadiness.length - 1],
  `first pre-session r=${preReadiness[0].toFixed(1)}, last=${preReadiness.at(-1).toFixed(1)}`
);

assert(
  'Pre-session readiness positive from session 2 onwards',
  preReadiness.every(r => r > 0),
  `pre-session readiness: ${preReadiness.map(r=>r.toFixed(1)).join(', ')}`
);

// ── Race taper ────────────────────────────────────────────────────────────────
section('Race taper: readiness peaks during taper window');

const { fits: tFit, fats: tFat, perfs: tPerf } = simulate(TAPER);

const peakFit = Math.max(...tFit);
const taperWindowPeak    = Math.max(...tPerf.slice(14, 18));
const trainingBlockPeak  = Math.max(...tPerf.slice(0, 10));

assert(
  'Readiness peak is in taper window (wk15–18), not during training block',
  taperWindowPeak > trainingBlockPeak,
  `taper window peak=${taperWindowPeak.toFixed(1)}, training block peak=${trainingBlockPeak.toFixed(1)}`
);
assert(
  'Fitness well preserved at taper midpoint (wk16 ≥ 75% of peak)',
  tFit[15] >= 0.75 * peakFit,
  `wk16 fit=${tFit[15].toFixed(1)}, peak fit=${peakFit.toFixed(1)} (${(tFit[15]/peakFit*100).toFixed(1)}%)`
);
assert(
  'Fatigue drops >50% over 2-week taper: wk18 fat < 50% of wk16 fat',
  tFat[17] < 0.5 * tFat[15],
  `wk18 fat=${tFat[17].toFixed(1)}, wk16 fat=${tFat[15].toFixed(1)}`
);

// ── Overtraining ──────────────────────────────────────────────────────────────
section('Overtraining: deep readiness deficit during load escalation');

const { fits: oFit, fats: oFat, perfs: oPerf } = simulate(OVERREACH);

assert(
  'Readiness negative for all 7 weeks of rapid load escalation (wk1–7)',
  oPerf.slice(0, 7).every(r => r < 0),
  `readiness wk1–7: ${oPerf.slice(0,7).join(', ')}`
);
assert(
  'Overtraining deficit much deeper than steady build (min < −10)',
  Math.min(...oPerf) < -10,
  `minimum readiness = ${Math.min(...oPerf).toFixed(1)}`
);
assert(
  'Steady build pre-session readiness always positive; overtraining readiness deeply negative',
  Math.min(...sPerf.filter((_, i) => preSessionIdx.includes(i))) > 0 && Math.min(...oPerf) < -10,
  `steady pre-session min=${Math.min(...preSessionIdx.map(i=>sPerf[i])).toFixed(1)}, overtraining min=${Math.min(...oPerf).toFixed(1)}`
);
assert(
  'Recovery after rest: readiness improves once loads drop (wk17–19 avg > wk5–7 avg)',
  avg(oPerf.slice(16, 19)) > avg(oPerf.slice(4, 7)),
  `wk5–7 avg=${avg(oPerf.slice(4,7)).toFixed(1)}, wk17–19 avg=${avg(oPerf.slice(16,19)).toFixed(1)}`
);

// ── Long rest ─────────────────────────────────────────────────────────────────
section('Long rest: fitness outlasts fatigue during break');

const { fits: rFit, fats: rFat, perfs: rPerf } = simulate(REST);

const fitPctRetained = rFit[11] / rFit[4];
const fatPctRetained = rFat[11] / rFat[4];

assert(
  'Fitness decays more slowly than fatigue during 8-week rest',
  fitPctRetained > fatPctRetained,
  `fitness: ${(fitPctRetained*100).toFixed(1)}% retained, fatigue: ${(fatPctRetained*100).toFixed(1)}% retained`
);
assert(
  'Fatigue near-zero by end of rest block (< 5% of rest-start value)',
  fatPctRetained < 0.05,
  `fatigue wk5=${rFat[4].toFixed(1)}, wk12=${rFat[11].toFixed(1)}`
);
assert(
  'Readiness appears high mid-rest (wk10) while fitness quietly decays',
  rPerf[9] > 5 && rFit[9] < rFit[4],
  `wk10: readiness=${rPerf[9].toFixed(1)}, fitness ${rFit[4].toFixed(1)} → ${rFit[9].toFixed(1)}`
);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
