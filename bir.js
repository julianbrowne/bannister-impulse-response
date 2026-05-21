import { WEEKLY, DAILY, simulate, LOADS, LOADS_NOVICE } from './model.js';

const dark = matchMedia('(prefers-color-scheme: dark)').matches;
const gridCol = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
const textCol = dark ? '#9c9a92' : '#73726c';

const scenarios = {
  steady: {
    // Session-level view: each data point is one day.
    // Sessions every 3 days (load > 0); rest days have load = 0.
    // Uses DAILY params so acute fatigue (τ₂≈1.4d) clears in 2 rest days.
    // Weekly Bannister params can't show this — τ₂=14d only clears ~40% per week.
    params: DAILY,
    labels: ['Pre','D1','D2','D3','D4','D5','D6','D7','D8','D9','D10',
             'D11','D12','D13','D14','D15','D16','D17','D18','D19','D20'],
    loads: LOADS.steady,
    note: 'Each session spikes fatigue; two rest days clear nearly all of it. The next session catches fitness near its peak — this is the timing that makes steady build work.',
    events: [
      { cls:'fat',  week:'Day 1–3',   text:'First session spikes fatigue to 10. Two rest days clear it to ~2.5 — almost back to zero before the next run.' },
      { cls:'fit',  week:'Day 4–12',  text:'Each session adds a fitness increment that outlasts the fatigue spike. Readiness is positive on every pre-session rest day.' },
      { cls:'perf', week:'Day 12+',   text:'Pre-session readiness grows with each cycle as fitness compounds. The gap between fitness and fatigue widens — the steady build payoff.' },
    ],
    novice: {
      loads: LOADS_NOVICE.steady,
      note: 'Each session is followed by three rest days — more recovery than an athlete needs, but right for a beginner. Fatigue clears almost entirely before each run.',
      events: [
        { cls:'fat',  week:'Day 1–4',   text:'First session spikes fatigue. Three rest days bring it close to zero — the next run starts nearly fresh.' },
        { cls:'fit',  week:'Day 5–16',  text:'Each session adds a small but lasting fitness gain. Readiness is clearly positive on every pre-session day.' },
        { cls:'perf', week:'Day 17+',   text:'Pre-session readiness climbs steadily. Lower peak loads than an athlete plan, but the same compounding logic applies.' },
      ]
    }
  },
  taper: {
    loads: LOADS.taper,
    raceDay: 18,
    note: 'Sixteen-week training block then a sharp two-week taper. Fatigue clears faster than fitness decays — readiness peaks just before race day (◆ Wk 19).',
    events: [
      { cls:'fit',  week:'Week 1–16', text:'Progressive training block peaking at week 15. Fitness and fatigue both high — runner feels tired despite improving.' },
      { cls:'fat',  week:'Week 17–18',text:'Load cut sharply. Fatigue drops by more than half in two weeks. Fitness holds — it decays far more slowly.' },
      { cls:'perf', week:'Week 18–19',text:'Readiness peaks as fatigue clears. The two-week taper window is the optimal time to race a 10k.' },
      { cls:'perf', week:'Week 19 ◆', text:'Race day. The high effort spikes fatigue, but readiness was at its peak going in. Recovery follows.' },
    ],
    novice: {
      loads: LOADS_NOVICE.taper,
      note: 'Sixteen-week build at beginner loads, then a two-week taper. The taper dynamics are identical to an athlete plan — readiness peaks just before race day (◆ Wk 19).',
      events: [
        { cls:'fit',  week:'Week 1–16', text:'Progressive build at novice loads, peaking around week 15. Fatigue stays manageable — the runner feels tired but not overwhelmed.' },
        { cls:'fat',  week:'Week 17–18',text:'Load cut sharply. Fatigue drops by more than half. Fitness holds — the same taper benefit as an athlete, from a lower base.' },
        { cls:'perf', week:'Week 18–19',text:'Readiness peaks as fatigue clears. The two-week window is the optimal time to race.' },
        { cls:'perf', week:'Week 19 ◆', text:'Race day. Lower absolute fitness than an athlete, but readiness was optimised — the best a novice can bring to the start line.' },
      ]
    }
  },
  overreach: {
    loads: LOADS.overreach,
    forcedRest: 14,
    note: 'Load escalates too fast. Readiness stays deeply negative during the build-up — the runner digs a hole that takes weeks to escape.',
    events: [
      { cls:'fat',  week:'Week 1–7',  text:'Rapid load escalation: fatigue accumulates faster than fitness can compensate. Readiness goes deeply negative.' },
      { cls:'fit',  week:'Week 8–14', text:'Loads plateau and fitness eventually catches up — but not before a long stretch of suppressed readiness and poor race-day form.' },
      { cls:'perf', week:'Week 15+ ◆',text:'Forced rest clears fatigue quickly. Readiness rebounds, but those weeks of poor form could have been avoided with a steadier ramp.' },
    ],
    novice: {
      loads: LOADS_NOVICE.overreach,
      note: 'Even at beginner loads, ramping too fast causes the same overtraining trap. The hole is shallower, but it still takes weeks to climb out.',
      events: [
        { cls:'fat',  week:'Week 1–7',  text:'Too-fast escalation drives fatigue above fitness even at modest loads. Readiness turns negative — a warning sign at any level.' },
        { cls:'fit',  week:'Week 8–14', text:'Loads plateau. Fitness closes the gap slowly. For a novice with less base, this stretch of suppressed readiness is a significant setback.' },
        { cls:'perf', week:'Week 15+ ◆',text:'Forced rest clears fatigue. Readiness rebounds — but a slower ramp would have kept readiness positive throughout.' },
      ]
    }
  },
  rest: {
    loads: LOADS.rest,
    note: 'Training stops for several weeks — illness, holiday, life. Both fitness and fatigue decay, but fitness decays more slowly.',
    events: [
      { cls:'fit',  week:'Week 1–4',  text:'Good form coming in. Then training stops. Fatigue clears within days.' },
      { cls:'fat',  week:'Week 5–12', text:'Extended rest. Readiness looks high — but fitness is quietly decaying underneath.' },
      { cls:'perf', week:'Week 13+',  text:'Return to training. Fitness lower than it appears. Building back takes longer than the break.' },
    ],
    novice: {
      loads: LOADS_NOVICE.rest,
      note: 'Starting from a lower training base, the rest period follows the same pattern. Fatigue clears quickly, fitness decays slowly — the readiness signal is just as misleading.',
      events: [
        { cls:'fit',  week:'Week 1–4',  text:'Moderate form coming in from lower training loads. Training stops. Fatigue clears quickly.' },
        { cls:'fat',  week:'Week 5–12', text:'Extended rest. Readiness looks fine. For a novice, the fitness base was already modest — the hidden decay matters more.' },
        { cls:'perf', week:'Week 13+',  text:'Return to training. Fitness is lower than it felt during rest. Rebuilding from a smaller base takes proportionally longer.' },
      ]
    }
  }
};

// Default labels for weekly scenarios (21 entries: baseline + 20 weeks)
const weeklyLabels = ['Start', ...Array.from({length:20},(_,i)=>`Wk ${i+1}`)];
let chart;
let currentScenario = 'steady';
let currentProfile  = 'athlete';

function setProfile(p) {
  currentProfile = p;
  setScenario(currentScenario);
}

function setScenario(key) {
  currentScenario = key;
  document.querySelectorAll('.bir-btn').forEach(b => {
    const map = { steady:'Steady', taper:'taper', overreach:'Over', rest:'rest' };
    b.classList.toggle('active', b.textContent.includes(map[key]));
  });

  const base = scenarios[key];
  const s = (currentProfile === 'novice' && base.novice)
    ? { ...base, ...base.novice }
    : base;
  const { fits, fats, perfs } = simulate(s.loads, s.params);

  // Prepend zero so the chart always starts from a clean baseline before any load.
  const dFits  = [0, ...fits];
  const dFats  = [0, ...fats];
  const dPerfs = [0, ...perfs];
  const labels = s.labels || weeklyLabels;

  const raceDayData = Array(labels.length).fill(null);
  if (s.raceDay != null) raceDayData[s.raceDay + 1] = dPerfs[s.raceDay + 1];

  const forcedRestData = Array(labels.length).fill(null);
  if (s.forcedRest != null) forcedRestData[s.forcedRest + 1] = dFats[s.forcedRest + 1];

  document.getElementById('birNote').textContent = s.note;

  const eventsEl = document.getElementById('birEvents');
  eventsEl.innerHTML = s.events.map(e =>
    `<div class="bir-event ${e.cls}"><span class="bir-event-week">${e.week}</span><span>${e.text}</span></div>`
  ).join('');

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = dFits;
    chart.data.datasets[1].data = dFats;
    chart.data.datasets[2].data = dPerfs;
    chart.data.datasets[3].data = raceDayData;
    chart.data.datasets[4].data = forcedRestData;
    chart.update('active');
  } else {
    const ctx = document.getElementById('birChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'Fitness',   data:dFits,  borderColor:'#1D9E75', backgroundColor:'rgba(29,158,117,0.08)', fill:true, tension:.4, pointRadius:0, borderWidth:2 },
          { label:'Fatigue',   data:dFats,  borderColor:'#E24B4A', backgroundColor:'rgba(226,75,74,0.08)',  fill:true, tension:.4, pointRadius:0, borderWidth:2 },
          { label:'Readiness', data:dPerfs, borderColor:'#378ADD', backgroundColor:'rgba(55,138,221,0.1)',   fill:true, tension:.4, pointRadius:3, pointBackgroundColor:'#378ADD', borderWidth:2.5 },
          { label:'Race day',    data:raceDayData,    borderColor:'#F5A623', backgroundColor:'#F5A623', pointStyle:'rectRot', pointRadius:9, pointHoverRadius:11, showLine:false },
          { label:'Forced rest', data:forcedRestData, borderColor:'#8B5CF6', backgroundColor:'#8B5CF6', pointStyle:'rectRot', pointRadius:9, pointHoverRadius:11, showLine:false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor: dark ? '#2c2c2a' : '#fff',
            borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            borderWidth: 0.5,
            titleColor: dark ? '#e0ded4' : '#1a1a18',
            bodyColor: dark ? '#9c9a92' : '#73726c',
            padding: 10,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          x: { grid:{ color:gridCol }, ticks:{ color:textCol, font:{size:11} } },
          y: {
            grid: { color:gridCol },
            ticks: { color:textCol, font:{size:11} },
            title: { display:true, text:'Relative units', color:textCol, font:{size:11} }
          }
        }
      }
    });
  }
}

window.setScenario = setScenario;
window.setProfile  = setProfile;
setScenario('steady');
