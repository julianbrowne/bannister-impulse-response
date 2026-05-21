// Bannister Impulse Response – model correctness tests
// Run with: node test/test.js  OR  open test/index.html in a browser

import { WEEKLY, DAILY, simulate, LOADS } from '../js/model.js';

const { steady: STEADY, taper: TAPER, overreach: OVERREACH, rest: REST } = LOADS;

// ── Output adapter ────────────────────────────────────────────────────────────
const isBrowser = typeof document !== 'undefined';
let container;
let passed = 0, failed = 0;

function section(name) {
  if (isBrowser) {
    const el = document.createElement('h3');
    el.className = 'test-section';
    el.textContent = name;
    container.appendChild(el);
  } else {
    console.log(`\n${name}`);
  }
}

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    if (isBrowser) {
      const el = document.createElement('div');
      el.className = 'test-result test-pass';
      el.textContent = `✓  ${label}`;
      container.appendChild(el);
    } else {
      console.log(`  ✓  ${label}`);
    }
  } else {
    failed++;
    if (isBrowser) {
      const el = document.createElement('div');
      el.className = 'test-result test-fail';
      el.innerHTML = `✗  ${label}${detail ? `<span class="test-detail">${detail}</span>` : ''}`;
      container.appendChild(el);
    } else {
      console.error(`  ✗  ${label}${detail ? `\n       ${detail}` : ''}`);
    }
  }
}

const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;

// ── Tests ─────────────────────────────────────────────────────────────────────
function runTests() {
  passed = 0;
  failed = 0;

  // ── Weekly model invariants ─────────────────────────────────────────────────
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

  // ── Daily model invariants ──────────────────────────────────────────────────
  section('Daily (session-level) model invariants');

  const dFitSSperLoad = DAILY.wFit / (1 - Math.exp(-DAILY.kFit));
  const dFatSSperLoad = DAILY.wFat / (1 - Math.exp(-DAILY.kFat));
  assert(
    'Daily model: steady-state readiness positive',
    dFitSSperLoad > dFatSSperLoad,
    `fit_ss=${dFitSSperLoad.toFixed(1)}, fat_ss=${dFatSSperLoad.toFixed(1)} per unit load`
  );

  const twoRestRetention = Math.exp(-2 * DAILY.kFat);
  assert(
    'Two rest days clear ≥ 70% of acute fatigue (τ₂≈1.4d)',
    twoRestRetention < 0.30,
    `retention after 2 rest days: ${(twoRestRetention*100).toFixed(1)}%`
  );

  const twoRestFitRetention = Math.exp(-2 * DAILY.kFit);
  assert(
    'Fitness retained >95% over 2 rest days',
    twoRestFitRetention > 0.95,
    `retention: ${(twoRestFitRetention*100).toFixed(1)}%`
  );

  // ── Steady build (session-level) ────────────────────────────────────────────
  section('Steady build: fatigue clears near-zero between sessions');

  const { fits: sFit, fats: sFat, perfs: sPerf } = simulate(STEADY, DAILY);
  const sessionIdx    = [0, 3, 6, 9, 12, 15, 18];
  const preSessionIdx = [2, 5, 8, 11, 14, 17];

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

  // ── Race taper ──────────────────────────────────────────────────────────────
  section('Race taper: readiness peaks during taper window');

  const { fits: tFit, fats: tFat, perfs: tPerf } = simulate(TAPER);
  const peakFit           = Math.max(...tFit);
  const taperWindowPeak   = Math.max(...tPerf.slice(14, 18));
  const trainingBlockPeak = Math.max(...tPerf.slice(0, 10));

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

  // ── Overtraining ────────────────────────────────────────────────────────────
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

  // ── Long rest ───────────────────────────────────────────────────────────────
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

  // ── Calvert et al. (1976): recursive formula validation ────────────────────
  section('Calvert et al. (1976): recursive formula validation');

  // Paper appendix Table I: daily loads [10,0,0,20,20,0,0,10,10,0], τ₃=15d
  // Fatigue only (wFit=wFat=1, kFit≈0 to isolate fatigue channel)
  const PAPER_PARAMS = { kFit: 1/50, kFat: 1/15, wFit: 1.0, wFat: 1.0 };
  const PAPER_LOADS  = [10, 0, 0, 20, 20, 0, 0, 10, 10, 0];
  const { fats: pFat } = simulate(PAPER_LOADS, PAPER_PARAMS);

  // Paper Table I fatigue values (rounded to 2dp in paper, we test to 1dp tolerance)
  const paperExpected = [10.0, 9.4, 8.7, 28.2, 46.4, 43.4, 40.6, 48.0, 54.9, 51.3];

  assert(
    'Day 1 fatigue matches paper (load=10 → f=10.0)',
    Math.abs(pFat[0] - paperExpected[0]) < 0.15,
    `got ${pFat[0]}, expected ${paperExpected[0]}`
  );
  assert(
    'Day 5 fatigue matches paper (two heavy days → f≈46.4)',
    Math.abs(pFat[4] - paperExpected[4]) < 0.2,
    `got ${pFat[4]}, expected ${paperExpected[4]}`
  );
  assert(
    'Day 10 fatigue matches paper (f≈51.3 after final rest day)',
    Math.abs(pFat[9] - paperExpected[9]) < 0.2,
    `got ${pFat[9]}, expected ${paperExpected[9]}`
  );

  const allClose = pFat.every((v, i) => Math.abs(v - paperExpected[i]) < 0.2);
  assert(
    'All 10 paper appendix fatigue values match within 0.2 units',
    allClose,
    `got [${pFat.join(', ')}], expected [${paperExpected.join(', ')}]`
  );

  assert(
    'Fatigue decays exponentially during rest: day ratios match e^(-1/τ₃) within 1%',
    (() => {
      const expected = Math.exp(-PAPER_PARAMS.kFat);
      const r1 = pFat[1] / pFat[0];
      const r2 = pFat[2] / pFat[1];
      return Math.abs(r1 - expected) < 0.01 && Math.abs(r2 - expected) < 0.01;
    })(),
    `day2/day1=${(pFat[1]/pFat[0]).toFixed(4)}, day3/day2=${(pFat[2]/pFat[1]).toFixed(4)}, e^(-1/15)=${Math.exp(-1/15).toFixed(4)}`
  );

  // ── Taper mechanism and K-factor (Calvert et al. 1976) ─────────────────────
  section('Taper mechanism and K-factor (Calvert et al. 1976)');

  assert(
    'τ₁/τ₃ ratio ≥ 2 (paper: 50d/15d=3.3; required for taper to work)',
    (1 / WEEKLY.kFit * 7) / (1 / WEEKLY.kFat * 7) >= 2,
    `ratio = ${((1/WEEKLY.kFit*7)/(1/WEEKLY.kFat*7)).toFixed(1)} (weekly params)`
  );

  // Peak readiness must occur after peak training load (taper mechanism)
  const peakLoadIdx  = tPerf.reduce((best, _, i) => TAPER[i] > TAPER[best] ? i : best, 0);
  const peakReadIdx  = tPerf.reduce((best, v, i) => v > tPerf[best] ? i : best, 0);
  assert(
    'Peak readiness occurs after week of peak training load (taper mechanism)',
    peakReadIdx > peakLoadIdx,
    `peak load at index ${peakLoadIdx} (wk${peakLoadIdx+1}), peak readiness at index ${peakReadIdx} (wk${peakReadIdx+1})`
  );

  // After training stops, readiness should improve (fatigue clears faster than fitness)
  const restStart = REST.findIndex(l => l === 0);
  assert(
    'Readiness improves immediately once training stops (fatigue clears faster than fitness)',
    rPerf[restStart + 1] > rPerf[restStart - 1],
    `readiness: pre-rest=${rPerf[restStart-1].toFixed(1)}, 2 weeks into rest=${rPerf[restStart+1].toFixed(1)}`
  );

  // Higher wFat (K factor in paper) deepens the readiness deficit under sustained load
  const pHigh = simulate(OVERREACH, { ...WEEKLY, wFat: WEEKLY.wFat * 2 });
  const pNorm = simulate(OVERREACH, WEEKLY);
  assert(
    'Higher K-factor (wFat) deepens readiness deficit under sustained heavy load',
    Math.min(...pHigh.perfs) < Math.min(...pNorm.perfs),
    `min readiness: K×2=${Math.min(...pHigh.perfs).toFixed(1)}, K×1=${Math.min(...pNorm.perfs).toFixed(1)}`
  );

  // ── Summary ─────────────────────────────────────────────────────────────────
  if (isBrowser) {
    const el = document.createElement('div');
    el.className = `test-summary ${failed > 0 ? 'test-fail' : 'test-pass'}`;
    el.textContent = `${passed + failed} tests: ${passed} passed, ${failed} failed`;
    container.appendChild(el);
  } else {
    console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
if (isBrowser) {
  document.addEventListener('DOMContentLoaded', () => {
    container = document.getElementById('test-results');
    runTests();
  });
} else {
  runTests();
}
