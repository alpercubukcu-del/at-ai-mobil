import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const moduleSource = fs.readFileSync(new URL('./coupon-career-only-final-v1691f626.js', import.meta.url), 'utf8');
const buildSource = fs.readFileSync(new URL('./build-runtime-v1691f626.cjs', import.meta.url), 'utf8');
const vercel = JSON.parse(fs.readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));

assert.doesNotThrow(() => new Function(moduleSource));
assert.match(moduleSource, /await hydrateCareerOnly\(\);[\s\S]*const check = audit\(\);/);
assert.match(moduleSource, /ATIstanbulOutcomeCalibrationV1691F37\?\.buildCareerOnly/);
assert.match(moduleSource, /fiveModelUsed:false/);
assert.match(moduleSource, /mode:'CAREER_ONLY_NO_FIVE_MODEL'/);
assert.doesNotMatch(moduleSource, /ATFiveModelCalibratedCouponsV613|prepareRaceModelsV11|readExactModel|buildArchiveOnly/);
assert.match(buildSource, /oldCallCount !== 3/);
assert.match(buildSource, /buildCareerOnly:buildCalibratedTickets/);
assert.match(buildSource, /ATCouponCareerOnlyFinalV626\?\.route/);
assert.equal(vercel.buildCommand, 'node build-runtime-v1691f626.cjs');

const note = { innerHTML:'' };
const button = { id:'buildAllBtn', dataset:{}, textContent:'' };
const fusionStatus = { textContent:'', style:{} };
const ticketHost = { scrollIntoView() {} };
const elements = new Map([
  ['buildAllBtn', button],
  ['couponFusionStatusF6015', fusionStatus],
  ['tickets', ticketHost]
]);
const state = { date:'2026-09-05', city:'3', tickets:[], analyses:{} };
let hydrated = 0;
let gateOpened = 0;
let rendered = 0;
let saved = 0;
const context = {
  console,
  state,
  alert(message) { throw new Error(`unexpected alert: ${message}`); },
  setTimeout(fn) { fn(); return 1; },
  clearTimeout() {},
  document:{
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) {
      return selector === '#couponCenterDialog .five-model-note-v11' ? note : null;
    }
  },
  ATCouponDecisionV1671:{ open:async () => { gateOpened += 1; } },
  ATCouponCareerOnlyV1691F1:{
    audit:() => ({ ready:true, raceNos:[2, 3, 4, 5, 6, 7], issues:[] })
  },
  ATCouponDailyArchiveV1691:{
    hydrateCurrent:async () => { hydrated += 1; return { careerLoaded:6 }; }
  },
  ATIstanbulOutcomeCalibrationV1691F37:{
    buildCareerOnly:async () => {
      state.tickets = [{
        available:true,
        type:'6lı Ganyan · Kalibresiz',
        modelLabel:'legacy',
        legs:[{ raceNo:2, selections:[{ no:1 }] }],
        warnings:['5 Model arşivi eksik.', 'Normal genişlik korundu.']
      }];
    }
  },
  save() { saved += 1; },
  renderTicketsV11() { rendered += 1; }
};
context.window = context;
vm.runInNewContext(moduleSource, context, { filename:'coupon-career-only-final-v1691f626.js' });

await context.ATCouponCareerOnlyFinalV626.open();
assert.equal(hydrated, 1);
assert.equal(gateOpened, 1);
assert.match(note.innerHTML, /5 Model kupon akışında kullanılmaz/);

const tickets = await context.ATCouponCareerOnlyFinalV626.build();
assert.equal(hydrated, 2);
assert.equal(tickets.length, 1);
assert.equal(tickets[0].type, '6lı Ganyan');
assert.equal(tickets[0].modelLabel, 'Kariyer/Hazırlık');
assert.equal(tickets[0].source, 'CAREER_ROADMAP_RANKING_RAW_EVIDENCE_F6023');
assert.equal(tickets[0].warnings.some(message => /5 Model/i.test(message)), false);
assert.equal(state.analyses.ticketV11.fiveModelUsed, false);
assert.equal(Array.from(state.analyses.ticketV11.variants).join(','), 'CAREER_PREPARATION');
assert.equal(saved, 1);
assert.equal(rendered, 1);

console.log('coupon-career-only-final-v1691f626 tests passed');
