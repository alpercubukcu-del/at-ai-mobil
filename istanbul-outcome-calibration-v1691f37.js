/* AT AI Mobil - V16.9.1F37 ISTANBUL OUTCOME CALIBRATION
   - Uses the 2025-08-29 Istanbul backtest only for coupon coverage decisions.
   - Keeps Career screen scores unchanged; calibratedScoreF37 is a coupon-only score.
   - Strengthens K/H top-2, market anchors, and wider coverage for young/sales/conditional/handicap/KV risk races.
*/
(() => {
'use strict';
if (window.__AT_ISTANBUL_OUTCOME_CALIBRATION_V1691F37__) return;
window.__AT_ISTANBUL_OUTCOME_CALIBRATION_V1691F37__ = true;

const VERSION = 'ISTANBUL-OUTCOME-CALIBRATION-V16.9.1F37';
const SCORE_VERSION = 'CAREER-COUPON-V16.9.1F37-ISTANBUL-OUTCOME';
const SOURCE = 'DAILY_ARCHIVE_CAREER_PREPARATION_PLUS_CURRENT_F6011';
const UNCALIBRATED_SOURCE_F6023 = 'CAREER_ROADMAP_RANKING_RAW_EVIDENCE_F6023';
const CAREER_WEIGHT_F6011 = 0.70;
const CURRENT_WEIGHT_F6011 = 0.30;
const BODY_ID = 'cdgBodyV1671';
const BACKTEST = {
  date:'2025-08-29',
  city:'Istanbul',
  note:'K/H winner top2 6/10, top5 7/10; 5-model strongest on older handicap only.',
  kh:{usable:10,top1:2,top2:6,top5:7,avgRank:3.8},
  composite:{usable:9,top1:1,top2:2,top3:3,top5:5,avgRank:5.33},
  career:{usable:9,top1:1,top2:2,top3:2,top5:5,avgRank:6.0}
};

let busy = false;

function timeoutF6015(promise, ms, label) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} ${Math.round(ms / 1000)} saniyede tamamlanmadı.`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

function setBuildStatusF6015(text, kind = '') {
  const button = $('buildAllBtn') || $('careerOnlyBuildV1691F1');
  if (button) {
    button.textContent = text;
    button.dataset.fusionStatus = kind;
  }
  let status = $('couponFusionStatusF6015');
  const host = $('couponCenterDialog')?.querySelector?.('.coupon-menu-panel-v1681') || $('couponCenterDialog');
  if (!status && host) {
    status = document.createElement('div');
    status.id = 'couponFusionStatusF6015';
    status.style.cssText = 'margin:10px 0;padding:11px;border:1px solid rgba(114,213,255,.32);border-radius:10px;line-height:1.45;font-weight:700;';
    host.appendChild(status);
  }
  if (status) {
    status.textContent = text;
    status.style.color = kind === 'error' ? '#ff9cab' : kind === 'ok' ? '#7ee2a8' : '#dcefff';
  }
}

const previousHybridScoreRows = (() => {
  try {
    return window.ATCouponHybridV1691F8?.scoreRows?.bind(window.ATCouponHybridV1691F8) || null;
  } catch {
    return null;
  }
})();
const previousCareerScoreRows = (() => {
  try {
    return window.ATCouponCareerOnlyV1691F1?.scoreRows?.bind(window.ATCouponCareerOnlyV1691F1) || null;
  } catch {
    return null;
  }
})();
const previousHybridEnsureDebut = (() => {
  try {
    return window.ATCouponHybridV1691F8?.ensureDebutCurrent?.bind(window.ATCouponHybridV1691F8) || null;
  } catch {
    return null;
  }
})();
const previousGateOpen = (() => {
  try {
    return window.ATCouponDecisionV1671?.open?.bind(window.ATCouponDecisionV1671) || null;
  } catch {
    return null;
  }
})();

const $ = id => {
  try { return document.getElementById(id); } catch { return null; }
};
const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const product = counts => counts.reduce((total, count) => total * Math.max(0, Number(count) || 0), 1);
const money = (counts, unit) => {
  const combinations = product(counts);
  return { combinations, cost:Number((combinations * unit).toFixed(2)) };
};

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const source = clean(value).replace('%', '').replace(',', '.');
  const match = source.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  return clean(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function currentState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

function canonicalDate(value) {
  const s = clean(value);
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = s.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return s;
}

function sameDate(a, b) {
  return canonicalDate(a) === canonicalDate(b);
}

function cityName() {
  try {
    if (typeof getCityName === 'function') return clean(getCityName());
  } catch {}
  return clean($('citySelect')?.selectedOptions?.[0]?.textContent || currentState()?.city || '');
}

function outcomeCalibrationActiveF6017() {
  // F60.18: 29.08.2025 sabit İstanbul profili otomatik uygulanmaz.
  // Kalibrasyon yalnız kullanıcının Günün Koşu Kalibrasyonu menüsünde seçtiği geçmiş yarışlardan gelir.
  return false;
}

function selectedTypes() {
  try {
    const manual = typeof manualTicketV117 !== 'undefined' ? clean(manualTicketV117?.betType) : '';
    if (manual) return [manual];
    const checked = [...document.querySelectorAll('.bet-check:checked')].map(x => clean(x.value)).filter(Boolean);
    return [...new Set(checked)];
  } catch {
    return [];
  }
}

function safePlan(type) {
  try {
    return typeof resolveBetStartV11 === 'function'
      ? resolveBetStartV11(type)
      : { ok:false, error:'Bahis başlangıcı bulunamadı.', desc:{ type } };
  } catch (error) {
    return { ok:false, error:error?.message || String(error), desc:{ type } };
  }
}

function requiredRaceNos() {
  const set = new Set();
  for (const type of selectedTypes()) {
    const plan = safePlan(type);
    if (!plan?.ok) continue;
    for (const race of plan.legs || []) {
      const no = Number(race?.no);
      if (Number.isFinite(no) && no > 0) set.add(no);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function careerResult() {
  return currentState()?.analyses?.career || null;
}

function careerRace(no) {
  const st = currentState();
  const career = careerResult();
  if (!career || (st?.date && career?.date && !sameDate(career.date, st.date))) return null;
  return (Array.isArray(career?.races) ? career.races : [])
    .find(race => String(race?.no) === String(no)) || null;
}

function programRace(no) {
  const st = currentState();
  return (Array.isArray(st?.races) ? st.races : [])
    .find(race => String(race?.no) === String(no)) || null;
}

function currentRace(no) {
  const st = currentState();
  const cur = st?.analyses?.current;
  if (!cur || (st?.date && cur?.date && !sameDate(cur.date, st.date))) return null;
  return (Array.isArray(cur?.races) ? cur.races : [])
    .find(race => String(race?.no) === String(no)) || null;
}

function horseOf(row) {
  return row?.horse || row?.item?.horse || row || {};
}

function horseNo(row) {
  const horse = horseOf(row);
  return finite(horse?.no ?? horse?.programNo ?? horse?.sira ?? row?.no ?? row?.programNo);
}

function horseName(row) {
  const horse = horseOf(row);
  return clean(horse?.name ?? horse?.atAdi ?? horse?.adi ?? row?.name ?? row?.atAdi ?? row?.adi);
}

function sameHorse(a, b) {
  const ah = horseOf(a), bh = horseOf(b);
  const aid = clean(ah?.id ?? ah?.horseId ?? a?.id ?? a?.horseId);
  const bid = clean(bh?.id ?? bh?.horseId ?? b?.id ?? b?.horseId);
  if (aid && bid) return aid === bid;
  const an = horseNo(a), bn = horseNo(b);
  if (an !== null && bn !== null) return an === bn;
  const at = normalizeText(horseName(a));
  const bt = normalizeText(horseName(b));
  return Boolean(at && bt && at === bt);
}

function currentRow(no, row) {
  const rows = Array.isArray(currentRace(no)?.horses) ? currentRace(no).horses : [];
  return rows.find(candidate => sameHorse(candidate?.horse || candidate, row?.horse || row?.item || row)) || null;
}

function programHorse(no, row) {
  const rows = Array.isArray(programRace(no)?.horses) ? programRace(no).horses : [];
  return rows.find(candidate => sameHorse(candidate?.horse || candidate, row?.horse || row?.item || row)) || null;
}

function parseOdds(source) {
  const candidates = [
    source?.ganyan,
    source?.Ganyan,
    source?.gny,
    source?.Gny,
    source?.odds,
    source?.oran,
    source?.currentRow?.ganyan,
    source?.horse?.ganyan,
    source?.item?.horse?.ganyan
  ];
  for (const value of candidates) {
    const n = finite(value);
    if (n !== null && n > 0 && n < 1000) return n;
  }
  return null;
}

function parseAgf(source) {
  const candidates = [
    source?.agf,
    source?.AGF,
    source?.agf1,
    source?.['agf.1'],
    source?.currentRow?.agf,
    source?.horse?.agf,
    source?.item?.horse?.agf
  ];
  for (const value of candidates) {
    const n = finite(value);
    if (n !== null && n >= 0 && n <= 100) return n;
  }
  return null;
}

function raceText(no) {
  const r = programRace(no) || careerRace(no) || {};
  return normalizeText([
    r.class,
    r.raceClass,
    r.name,
    r.title,
    r.condition,
    r.ageGroup,
    r.gender,
    r.distance,
    r.track
  ].filter(Boolean).join(' '));
}

function distanceOf(no) {
  const r = programRace(no) || careerRace(no) || {};
  const values = [r.distance, r.mesafe, r.name, r.class];
  for (const value of values) {
    const match = clean(value).match(/\b(8\d{2}|9\d{2}|1\d{3}|2\d{3})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

function raceTags(no, ranking = []) {
  const text = raceText(no);
  const distance = distanceOf(no);
  const young = /\b2\s*yas|\b2\s*yasli|\b3\s*yas|\b3\s*yasli/.test(text);
  const juvenile = /\b2\s*yas|\b2\s*yasli/.test(text);
  const maiden = text.includes('maiden');
  const sales = text.includes('satis');
  const conditional = text.includes('sartli') || text.includes('sartli 19') || text.includes('sartli-19');
  const handicap = text.includes('handikap') || text.includes('handicap');
  const kv = /\bkv\b|\bkv-|\bkv\s*\d/.test(text);
  const filly = text.includes('disi') || text.includes('kisirak') || text.includes('taylar');
  const tags = [];
  if (young && (maiden || sales)) tags.push('YOUNG_MAIDEN_OR_SALES');
  if (young && conditional) tags.push('YOUNG_SARTLI');
  if (handicap) tags.push('HANDICAP');
  if (juvenile && kv && filly) tags.push('JUVENILE_KV_FILLY');
  if (kv && distance !== null && distance <= 1200) tags.push('SPRINT_KV');
  if (ranking.some(row => parseOdds(row?.programRow || row?.currentRow || row) !== null && parseOdds(row?.programRow || row?.currentRow || row) <= 1.8)) {
    tags.push('MARKET_ANCHOR');
  }
  if (tags.includes('SPRINT_KV') && tags.includes('MARKET_ANCHOR')) tags.push('SPRINT_MARKET_ANCHOR');
  return [...new Set(tags)];
}

function currentScoreRowsF6011(no) {
  const race = currentRace(no);
  return (Array.isArray(race?.horses) ? race.horses : [])
    .map(row => {
      const score = finite(row?.programAnalizSkoru ?? row?.score ?? row?.puan);
      if (score === null) return null;
      return { row, horse:row?.horse || row, score };
    })
    .filter(Boolean);
}

function deriveRows(no) {
  const race = careerRace(no);
  const careerItems = Array.isArray(race?.horses) ? race.horses : [];
  const currentRows = currentScoreRowsF6011(no);
  const programHorses = Array.isArray(programRace(no)?.horses) ? programRace(no).horses : [];
  const seeds = programHorses.length ? programHorses : careerItems.map(item => item?.horse || item);

  return seeds.map(horse => {
    const item = careerItems.find(candidate => sameHorse(candidate?.horse || candidate, horse)) || null;
    const cur = currentRows.find(candidate => sameHorse(candidate?.horse || candidate?.row, horse)) || null;
    const careerScore = finite(item?.galibiyetBenzerligi?.score);
    const currentScore = finite(cur?.score);

    if (careerScore === null && currentScore === null) return null;
    const hasCareer = careerScore !== null;
    const score = hasCareer && currentScore !== null
      ? Math.round(careerScore * CAREER_WEIGHT_F6011 + currentScore * CURRENT_WEIGHT_F6011)
      : hasCareer ? Math.round(careerScore) : Math.round(currentScore);

    return {
      item,
      horse:item?.horse || cur?.horse || horse || {},
      currentRow:cur?.row || null,
      careerScoreF6011:careerScore,
      currentScoreF6011:currentScore,
      fusionWeightsF6011:hasCareer && currentScore !== null ? { career:70, current:30 } : { career:0, current:100 },
      score,
      debut:!hasCareer,
      scoreSource:hasCareer && currentScore !== null
        ? 'DAILY_ARCHIVE_CAREER_PREPARATION_70+CURRENT_ANALYSIS_30'
        : hasCareer
          ? 'DAILY_ARCHIVE_CAREER_PREPARATION'
          : 'CURRENT_ANALYSIS_NO_CAREER'
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.score - a.score || (horseNo(a) ?? 999) - (horseNo(b) ?? 999));
}


/* F60.23
   Kalibresiz kupon, Kariyer Yol Haritasi ekraninda gorulen sirayi birebir kullanir.
   Ekrandaki "Kanit" sirasi rankingRawScore ile belirlenir; yuvarlanmis yesil yuzde
   sadece goruntuleme puanidir. Guncel Analiz bu akisa karistirilmaz.
*/
const TRUE_DEBUT_CURRENT_SOURCE_F6030 = 'CURRENT_ANALYSIS_TRUE_DEBUT_F6030';

function explicitCareerCountF6030(item, current) {
  const direct = [
    current?.history?.rowCount,
    current?.history?.count,
    current?.careerCount,
    current?.historyCount,
    item?.career?.raceCount,
    item?.career?.historyCount,
    item?.career?.fullPathBeforeCount,
    item?.galibiyetBenzerligi?.fallbackMetrics?.careerCount
  ];
  for (const value of direct) {
    const n = finite(value);
    if (n !== null && n >= 0) return n;
  }

  const c = item?.career || {};
  const arrays = [c.fullPathBefore,c.history,c.fullHistory,c.roadmap,c.races,c.preparationPath,c.top5,c.recentForm]
    .filter(Array.isArray);
  if (arrays.length) return Math.max(...arrays.map(a => a.length));
  return null;
}

function isRealDebutF6030(item, current) {
  const count = explicitCareerCountF6030(item, current);
  if (count === null) return false;
  const verified = current?.careerOk === true || item?.career?.ok === true;
  return verified && count === 0;
}

function isConditionalOneF6030(no) {
  const race = programRace(no) || careerRace(no) || {};
  const text = normalizeText([race?.class,race?.raceClass,race?.yaradi1,race?.name].filter(Boolean).join(' '));
  return /(^| )sartli[ -]*1( |$)/.test(text);
}

function needsCurrentForTrueDebutF6030(no) {
  const program = programRace(no);
  const programCount = Array.isArray(program?.horses) ? program.horses.length : 0;
  const currentCount = currentScoreRowsF6011(no).length;
  if (programCount > 0 && currentCount >= programCount) return false;

  const race = careerRace(no);
  const items = Array.isArray(race?.horses) ? race.horses : [];
  if (isConditionalOneF6030(no)) return true;

  return items.some(item => {
    const sim = item?.galibiyetBenzerligi || {};
    return finite(sim?.rankingRawScore) === null && finite(sim?.score) === null;
  });
}

function careerRoadmapRowsF6023(no) {
  const race = careerRace(no);
  const items = Array.isArray(race?.horses) ? race.horses : [];
  const programHorses = Array.isArray(programRace(no)?.horses) ? programRace(no).horses : [];
  const seeds = programHorses.length ? programHorses : items.map(item => item?.horse || item);
  const currentRows = currentScoreRowsF6011(no);

  const rows = seeds.map(seed => {
    const item = items.find(candidate => sameHorse(candidate?.horse || candidate, seed)) || null;
    const cur = currentRows.find(candidate => sameHorse(candidate?.horse || candidate?.row, seed)) || null;
    const sim = item?.galibiyetBenzerligi || {};
    const displayScore = finite(sim?.score);
    const rawEvidence = finite(sim?.rankingRawScore);
    const evidenceScore = rawEvidence !== null ? rawEvidence : displayScore;

    const currentScore = finite(cur?.score);
    const realDebut = evidenceScore === null && isRealDebutF6030(item, cur?.row);
    const finalScore = evidenceScore !== null ? evidenceScore : (realDebut ? currentScore : null);
    if (finalScore === null) return null;

    const programRow = programHorse(no, item || seed) || seed || null;
    const marketRow = programRow || item?.horse || cur?.horse || item || seed;

    return {
      item,
      horse:item?.horse || cur?.horse || programRow || seed || {},
      programRow,
      currentRow:cur?.row || null,
      careerScoreF6011:displayScore,
      currentScoreF6011:realDebut ? currentScore : null,
      fusionWeightsF6011:realDebut ? { career:0, current:100 } : { career:100, current:0 },
      careerDisplayScoreF6023:displayScore,
      careerEvidenceScoreF6023:evidenceScore,
      score:finalScore,
      debut:realDebut,
      scoreSource:realDebut ? TRUE_DEBUT_CURRENT_SOURCE_F6030 : UNCALIBRATED_SOURCE_F6023,
      oddsF37:parseOdds(marketRow),
      agfF37:parseAgf(marketRow),
      calibrationAdjustmentF37:0,
      calibrationTagsF37:realDebut ? ['TRUE_DEBUT_CURRENT_ANALYSIS_F6030'] : []
    };
  })
  .filter(Boolean)
  .sort((a, b) =>
    b.score - a.score ||
    (b.careerEvidenceScoreF6023 ?? -1) - (a.careerEvidenceScoreF6023 ?? -1) ||
    (b.careerDisplayScoreF6023 ?? -1) - (a.careerDisplayScoreF6023 ?? -1) ||
    (horseNo(a) ?? 999) - (horseNo(b) ?? 999)
  );

  return rows.map((row, index) => ({
    ...row,
    baseScoreF37:row.score,
    baseRankF37:index + 1,
    roadmapRankF6023:index + 1
  }));
}

function baseScoreRows(no) {
  return deriveRows(no);
}

async function runCurrentRaceF6011(no) {
  if (typeof runAnalysis !== 'function') throw new Error('Güncel Analiz hesaplama fonksiyonu bulunamadı.');
  const dialog = $('analysisDialog');
  const select = $('analysisRace');
  const oldView = dialog?.dataset?.view;
  const oldValue = select?.value;
  try {
    if (dialog) dialog.dataset.view = 'current';
    if (select) {
      select.value = String(no);
      if (select.value !== String(no)) throw new Error(`${no}.K Güncel Analiz seçicisinde bulunamadı.`);
    }
    await new Promise(resolve => setTimeout(resolve, 0));
    await timeoutF6015(runAnalysis(), 45000, `${no}.K Güncel Analiz`);
    await new Promise(resolve => setTimeout(resolve, 0));
  } finally {
    if (dialog) {
      if (oldView) dialog.dataset.view = oldView;
      else delete dialog.dataset.view;
    }
    if (select && oldValue !== undefined) select.value = oldValue;
  }
}

async function ensureCurrentAllF6011(raceNos) {
  for (const no of raceNos || []) {
    const programCount = Array.isArray(programRace(no)?.horses) ? programRace(no).horses.length : 0;
    const readyCount = currentScoreRowsF6011(no).length;
    if (programCount > 0 && readyCount >= programCount) continue;
    await runCurrentRaceF6011(no);
  }
}

function marketBoost(odds, agf) {
  if (odds !== null) {
    if (odds <= 1.8) return 14;
    if (odds <= 2.5) return 10;
    if (odds <= 3.5) return 7;
    if (odds <= 5) return 4;
  }
  if (agf !== null) {
    if (agf >= 35) return 10;
    if (agf >= 25) return 7;
    if (agf >= 18) return 4;
  }
  return 0;
}

function calibratedScoreRows(no) {
  const base = baseScoreRows(no);
  const enriched = base.map((row, index) => {
    const programRow = programHorse(no, row);
    const curRow = row?.currentRow || currentRow(no, row);
    const sourceForOdds = programRow || curRow || row;
    const odds = parseOdds(sourceForOdds);
    const agf = parseAgf(sourceForOdds);
    const baseScore = finite(row?.score) ?? 0;
    const tags = raceTags(no, base);
    const baseRank = index + 1;
    const outcomeActiveF6017 = outcomeCalibrationActiveF6017();
    let adjustment = outcomeActiveF6017 ? marketBoost(odds, agf) : 0;

    if (outcomeActiveF6017 && tags.includes('YOUNG_MAIDEN_OR_SALES') || tags.includes('YOUNG_SARTLI')) {
      if (baseRank <= 2) adjustment += 3;
      else if (baseRank <= 4) adjustment += 1;
    }
    if (outcomeActiveF6017 && tags.includes('HANDICAP')) {
      if (baseRank <= 3) adjustment += 1;
      if (odds !== null && odds <= 3.5) adjustment += 2;
    }
    if (outcomeActiveF6017 && tags.includes('JUVENILE_KV_FILLY') && baseRank <= 6) adjustment += 2;
    if (outcomeActiveF6017 && tags.includes('SPRINT_MARKET_ANCHOR') && odds !== null && odds <= 1.8) adjustment += 8;

    const score = Number(clamp(Math.round(baseScore + adjustment), 0, 99).toFixed(0));
    return {
      ...row,
      horse:row?.horse || row?.item?.horse || {},
      currentRow:curRow || row?.currentRow || null,
      programRow:programRow || null,
      baseScoreF37:baseScore,
      baseRankF37:baseRank,
      oddsF37:odds,
      agfF37:agf,
      calibrationAdjustmentF37:adjustment,
      calibratedScoreF37:score,
      calibrationTagsF37:tags,
      score,
      scoreSource:[row?.scoreSource, 'ISTANBUL_OUTCOME_F37'].filter(Boolean).join('+')
    };
  });

  return enriched.sort((a, b) =>
    b.score - a.score ||
    (a.baseRankF37 || 999) - (b.baseRankF37 || 999) ||
    (horseNo(a) ?? 999) - (horseNo(b) ?? 999)
  );
}

function calibrationRiskMeta(no) {
  const race = careerRace(no);
  const meta = race?.chronoRiskCalibrationF34 || {};
  const tags = Array.isArray(meta?.riskTags) ? meta.riskTags : [];
  return {
    tags,
    singleConfidence:clean(meta?.singleConfidence || meta?.confidence || '')
  };
}

function minWidthForRace(no, ranking) {
  if (!outcomeCalibrationActiveF6017()) return Math.min(Math.max(1, ranking.length), 2);
  const tags = raceTags(no, ranking);
  const meta = calibrationRiskMeta(no);
  let min = 2;
  if (tags.includes('JUVENILE_KV_FILLY')) min = Math.max(min, 6);
  if (tags.includes('SPRINT_MARKET_ANCHOR')) min = Math.max(min, 4);
  if (tags.includes('YOUNG_MAIDEN_OR_SALES') || tags.includes('YOUNG_SARTLI')) min = Math.max(min, 3);
  if (tags.includes('HANDICAP')) min = Math.max(min, 3);
  if (normalizeText(meta.singleConfidence).includes('dusuk')) min = Math.max(min, 4);
  if (normalizeText(meta.singleConfidence).includes('orta')) min = Math.max(min, 3);
  return Math.min(Math.max(1, ranking.length), min);
}

function riskyTags(tags) {
  return tags.some(tag => [
    'JUVENILE_KV_FILLY',
    'YOUNG_MAIDEN_OR_SALES',
    'YOUNG_SARTLI',
    'HANDICAP',
    'SPRINT_MARKET_ANCHOR'
  ].includes(tag));
}

function singleInfo(no, ranking) {
  if (ranking.length === 1) return { qualified:true, strength:999, gap:999 };
  const tags = outcomeCalibrationActiveF6017() ? raceTags(no, ranking) : [];
  const top = ranking[0]?.score ?? 0;
  const second = ranking[1]?.score ?? 0;
  const gap = top - second;
  const risk = riskyTags(tags);
  const qualified = risk ? (top >= 95 && gap >= 16) : (top >= 93 && gap >= 12);
  return { qualified, strength:top + gap * 1.5 - (risk ? 8 : 0), gap };
}

function naturalWidth(no, ranking) {
  const n = ranking.length;
  if (n <= 2) return n;
  const tags = outcomeCalibrationActiveF6017() ? raceTags(no, ranking) : [];
  const min = minWidthForRace(no, ranking);
  const top = ranking[0]?.score ?? 0;
  const gap = top - (ranking[1]?.score ?? 0);
  let count = ranking.filter(row => row.score >= top - 10).length;
  count = Math.max(min, Math.min(5, count));

  if (tags.includes('JUVENILE_KV_FILLY')) count = Math.max(count, 6);
  if (tags.includes('SPRINT_MARKET_ANCHOR')) count = Math.max(count, 4);
  if (gap >= 10) count = Math.min(count, riskyTags(tags) ? Math.max(min, 3) : 2);
  else if (gap >= 6) count = Math.min(count, Math.max(min, 3));
  else if (gap <= 2) count = Math.max(count, Math.min(n, min + 1));

  const anchorIndex = marketAnchorIndex(no, ranking, tags);
  if (anchorIndex >= 0) count = Math.max(count, anchorIndex + 1);
  return Math.min(n, Math.max(min, count));
}

function marketAnchorIndex(no, ranking, tags = raceTags(no, ranking)) {
  let best = -1;
  ranking.forEach((row, index) => {
    const odds = row?.oddsF37 ?? parseOdds(row?.programRow || row?.currentRow || row);
    if (odds === null) return;
    if (odds <= 1.8 && index <= 6) best = best < 0 ? index : Math.min(best, index);
    else if (
      odds <= 3.5 &&
      index <= 4 &&
      (tags.includes('YOUNG_MAIDEN_OR_SALES') || tags.includes('YOUNG_SARTLI') || tags.includes('HANDICAP'))
    ) best = best < 0 ? index : Math.min(best, index);
  });
  return best;
}

function nextAllowed(no, ranking, index) {
  const row = ranking[index];
  if (!row) return false;
  const tags = raceTags(no, ranking);
  const top = ranking[0]?.score ?? 0;
  const band = riskyTags(tags) ? 26 : 20;
  return row.score >= Math.max(35, top - band);
}

function legWarning(no, ranking, count) {
  const tags = outcomeCalibrationActiveF6017() ? raceTags(no, ranking) : [];
  const pieces = [];
  if (tags.includes('YOUNG_MAIDEN_OR_SALES')) pieces.push('genç/satış/maiden riskinde min 3 at');
  if (tags.includes('YOUNG_SARTLI')) pieces.push('genç şartlı riskinde min 3 at');
  if (tags.includes('HANDICAP')) pieces.push('handikap riskinde min 3 at');
  if (tags.includes('JUVENILE_KV_FILLY')) pieces.push('2 yaş KV/dişi sürpriz bandında min 6 at');
  if (tags.includes('SPRINT_MARKET_ANCHOR')) pieces.push('kısa mesafe KV favorisi korunur');
  if (count === 1) pieces.push('yalnız çok güçlü liderlikte tek');
  return pieces;
}

function hardIssues(base) {
  return (base?.issues || []).filter(issue => issue?.id !== 'career-score');
}

function buildTicket(plan, type, budget, unitPrice, maxSingles) {
  if (!plan?.ok) {
    return {
      version:typeof TICKET_V11_VERSION !== 'undefined' ? TICKET_V11_VERSION : 'V11',
      careerCouponVersion:SCORE_VERSION,
      type,
      modelId:'career',
      modelLabel:'Kariyer Yol Haritası',
      available:false,
      city:cityName(),
      date:currentState()?.date,
      error:plan?.error || 'Bahis başlangıcı bulunamadı.',
      source:UNCALIBRATED_SOURCE_F6023
    };
  }

  const legsData = (plan.legs || []).map(race => ({
    race,
    ranking:careerRoadmapRowsF6023(race.no)
  }));
  const noData = legsData.filter(item => !item.ranking.length);
  if (noData.length) {
    return {
      version:typeof TICKET_V11_VERSION !== 'undefined' ? TICKET_V11_VERSION : 'V11',
      careerCouponVersion:SCORE_VERSION,
      type,
      modelId:'career',
      modelLabel:'Kariyer Yol Haritası',
      available:false,
      city:cityName(),
      date:currentState()?.date,
      startRace:plan.startRace,
      error:`${noData.map(item => `${item.race.no}.K`).join(', ')} için kupon sıralaması oluşmadı.`,
      source:UNCALIBRATED_SOURCE_F6023
    };
  }

  const candidates = legsData
    .map((item, index) => ({ index, ...singleInfo(item.race.no, item.ranking) }))
    .sort((a, b) => Number(b.qualified) - Number(a.qualified) || b.strength - a.strength)
    .slice(0, Math.min(Math.max(0, maxSingles), legsData.length));
  const singles = new Set(candidates.map(item => item.index));
  const counts = legsData.map((item, index) => singles.has(index) ? 1 : naturalWidth(item.race.no, item.ranking));
  let m = money(counts, unitPrice);

  while (m.cost > budget) {
    let drop = null;
    for (let index = 0; index < legsData.length; index++) {
      const min = singles.has(index) ? 1 : minWidthForRace(legsData[index].race.no, legsData[index].ranking);
      if (counts[index] <= min) continue;
      const last = legsData[index].ranking[counts[index] - 1];
      const top = legsData[index].ranking[0];
      const value = (last?.score ?? 0) - (top?.score ?? 0);
      if (!drop || value < drop.value) drop = { index, value };
    }
    if (!drop) break;
    counts[drop.index] -= 1;
    m = money(counts, unitPrice);
  }

  if (m.cost <= budget) {
    while (true) {
      let best = null;
      for (let index = 0; index < legsData.length; index++) {
        if (singles.has(index)) continue;
        const ranking = legsData[index].ranking;
        if (counts[index] >= ranking.length || !nextAllowed(legsData[index].race.no, ranking, counts[index])) continue;
        const trial = [...counts];
        trial[index] += 1;
        const nm = money(trial, unitPrice);
        if (nm.cost > budget) continue;
        const next = ranking[counts[index]];
        const extra = Math.max(0.0001, nm.cost - m.cost);
        const value = (next?.score ?? 0) / extra;
        if (!best || value > best.value) best = { index, value, nm };
      }
      if (!best) break;
      counts[best.index] += 1;
      m = best.nm;
    }
  }

  const legs = legsData.map((item, index) => {
    const count = counts[index];
    const warnings = legWarning(item.race.no, item.ranking, count);
    return {
      raceNo:item.race.no,
      raceClass:item.race.class || item.race.raceClass || '',
      distance:item.race.distance || '',
      track:item.race.track || '',
      single:count === 1,
      calibrationTags:raceTags(item.race.no, item.ranking),
      warnings,
      selections:item.ranking.slice(0, count).map((row, rank) => ({
        no:row.horse?.no,
        name:row.horse?.name,
        id:row.horse?.id || null,
        score:row.score,
        displayScore:row.careerDisplayScoreF6023,
        evidenceScore:row.careerEvidenceScoreF6023,
        baseScore:row.baseScoreF37,
        modelRank:rank + 1,
        baseRank:row.baseRankF37,
        odds:row.oddsF37,
        scoreSource:row.scoreSource,
        analysisMode:row.debut
          ? 'CURRENT_ANALYSIS_DEBUT_V16.5.7'
          : row.item?.galibiyetBenzerligi?.fallback
            ? 'CURRENT_CAREER_PREPARATION_FALLBACK_V1'
            : 'HISTORICAL_CAREER_SIMILARITY'
      })),
      ranking:item.ranking.map((row, rank) => ({
        no:row.horse?.no,
        name:row.horse?.name,
        score:row.score,
        displayScore:row.careerDisplayScoreF6023,
        evidenceScore:row.careerEvidenceScoreF6023,
        baseScore:row.baseScoreF37,
        rank:rank + 1,
        baseRank:row.baseRankF37,
        odds:row.oddsF37,
        scoreSource:row.scoreSource,
        calibrationTags:row.calibrationTagsF37 || []
      }))
    };
  });

  const debutCountF6030 = legs.reduce((sum, leg) => sum + leg.ranking.filter(row => row.scoreSource === TRUE_DEBUT_CURRENT_SOURCE_F6030).length, 0);
  const warnings = ['Kupon: kariyeri olan atlarda Kariyer Yol Haritası “Kanıt” sırası kullanıldı; yalnız gerçek debut atlarda Güncel Analiz puanı kullanıldı.'];
  if (debutCountF6030) warnings.push(`${debutCountF6030} gerçek debut at Güncel Analiz puanıyla sıralamaya dahil edildi.`);
  if (maxSingles > 0 && candidates.length < maxSingles) {
    warnings.push(`İstenen ${maxSingles} tekten ${candidates.length} ayak oluşturulabildi.`);
  }
  if (m.cost > budget) {
    warnings.push('Minimum kupon genişlikleri korununca kupon maliyeti bütçeyi aşıyor.');
  }
  if (plan.inferred) warnings.push('Bahis başlangıcı TJK etiketinden doğrulanamadı; sıra tahmini kullanıldı.');

  return {
    version:typeof TICKET_V11_VERSION !== 'undefined' ? TICKET_V11_VERSION : 'V11',
    careerCouponVersion:SCORE_VERSION,
    scoreVersion:VERSION,
    type,
    modelId:'career',
    modelLabel:'Kariyer Yol Haritası',
    available:true,
    city:cityName(),
    date:currentState()?.date,
    startRace:plan.startRace,
    startLabel:plan.startLabel,
    startInferred:plan.inferred,
    budget,
    unitPrice,
    requestedSingles:maxSingles,
    actualSingles:legs.filter(leg => leg.single).length,
    combinations:m.combinations,
    cost:m.cost,
    overBudget:m.cost > budget,
    minimumCostExceeded:m.cost > budget,
    warnings,
    legs,
    source:UNCALIBRATED_SOURCE_F6023,
    fusionRule:'CAREER_ROADMAP_RAW_EVIDENCE; TRUE_DEBUT=CURRENT_ANALYSIS_F6030',
    backtest:BACKTEST,
    generatedAt:new Date().toISOString()
  };
}

async function buildCalibratedTickets() {
  if (busy) {
    setBuildStatusF6015('Önceki kupon işlemi sıfırlandı; yeniden başlatılıyor.', 'warn');
    busy = false;
  }
  busy = true;
  try {
    setBuildStatusF6015('1/3 · Kupon ayakları belirleniyor…');
    const raceNos = requiredRaceNos();
    if (!raceNos.length) throw new Error('Önce bahis türünü seçin; kupon ayakları belirlenemedi.');
    setBuildStatusF6015(`2/3 · Kariyer Kanıtı / gerçek debut Güncel puanı doğrulanıyor (0/${raceNos.length})…`);
    for (let index = 0; index < raceNos.length; index++) {
      const no = raceNos[index];
      if (needsCurrentForTrueDebutF6030(no)) {
        try {
          setBuildStatusF6015(`2/3 · ${no}.K gerçek debutlar için Güncel Analiz hazırlanıyor (${index + 1}/${raceNos.length})…`);
          await runCurrentRaceF6011(no);
        } catch (currentError) {
          console.warn('[AT AI] F60.30 debut current analysis skipped', no, currentError?.message || currentError);
        }
      }
      careerRoadmapRowsF6023(no);
      setBuildStatusF6015(`2/3 · Kariyer Kanıtı / debut Güncel doğrulandı (${index + 1}/${raceNos.length})…`);
    }
    setBuildStatusF6015('3/3 · Kupon Kariyer Kanıtı + yalnız gerçek debutlarda Güncel Analiz ile oluşturuluyor…');

    const empty = raceNos.filter(no => !careerRoadmapRowsF6023(no).length);
    if (empty.length) throw new Error(`${empty.map(no => `${no}.K`).join(', ')} için Kariyer Yol Haritası sıralaması yok. Önce Kariyer Yol Haritasını hesaplayın.`);

    const types = selectedTypes();
    const plans = types.map(safePlan);
    const budget = Math.max(1, finite($('budget')?.value) || 500);
    const unitPrice = Math.max(0.01, finite($('unitPrice')?.value) || 1);
    const maxSingles = Math.max(0, Math.min(7, Math.floor(finite($('singleCount')?.value) ?? 0)));
    const tickets = plans.map((plan, index) => buildTicket(plan, plan?.desc?.type || types[index] || 'Bahis', budget, unitPrice, maxSingles));

    const st = currentState();
    if (st) {
      st.tickets = tickets;
      st.analyses = st.analyses || {};
      st.analyses.ticketV11 = {
        version:SCORE_VERSION,
        scoreVersion:VERSION,
        source:UNCALIBRATED_SOURCE_F6023,
        fusionRule:'CAREER_ROADMAP_RANKING_RAW_EVIDENCE_ONLY',
        dailyArchiveFirst:true,
        uncalibratedRoadmapRank:true,
        fiveModelUsed:false,
        calibrationBacktest:BACKTEST.note,
        khTop2:`${BACKTEST.kh.top2}/${BACKTEST.kh.usable}`,
        date:st.date,
        city:st.city,
        generatedAt:new Date().toISOString(),
        raceNos
      };
    }
    try { if (typeof save === 'function') save(); } catch {}
    if (typeof renderTicketsV11 === 'function') renderTicketsV11();
    else if (typeof renderTickets === 'function') renderTickets();
    setBuildStatusF6015('Kupon hazır · aşağıdaki sonuç bölümüne yazıldı.', 'ok');
    decorateGate('Kupon hazır · Kalibresiz sıralama Kariyer Yol Haritasından alındı.');
    setTimeout(() => {
      try { $('cdgCloseV1671')?.click(); } catch {}
      try { $('tickets')?.scrollIntoView?.({ behavior:'smooth', block:'start' }); } catch {}
    }, 240);
  } catch (error) {
    console.error('[AT AI] F60.15 coupon fusion', error);
    setBuildStatusF6015(`Kupon oluşturulamadı: ${error?.message || error}`, 'error');
    try {
      if (typeof alert === 'function') alert(`Kupon oluşturulamadı: ${error?.message || error}`);
    } catch {}
  } finally {
    busy = false;
    setTimeout(() => {
      const button = $('buildAllBtn') || $('careerOnlyBuildV1691F1');
      if (button && button.dataset.fusionStatus !== 'ok' && button.dataset.fusionStatus !== 'error') {
        button.textContent = 'Kalibresiz + Kalibreli İki Kupon Oluştur';
      }
    }, 500);
  }
}

let dualBuildBusyF6018 = false;
const BUILD_COMPAT_VERSION_F6018 = 'CAREER-COUPON-V16.9.1F60.18-DUAL';

function cleanTicketTypeF6025(value) {
  return clean(value)
    .replace(/(?:\s*·\s*(?:Kalibresiz|Kalibreli))+\s*$/gi, '')
    .trim();
}

function usableCalibratedTicketF6025(ticket) {
  if (!ticket || ticket.available === false) return false;
  const legs = Array.isArray(ticket?.legs) ? ticket.legs : [];
  if (!legs.length) return false;
  return legs.every(leg => Array.isArray(leg?.selections) && leg.selections.length > 0);
}

async function buildDualTicketsF6018() {
  if (dualBuildBusyF6018) return;
  dualBuildBusyF6018 = true;
  try {
    setBuildStatusF6015('1/2 · Kalibresiz kupon hazırlanıyor…');
    await buildCalibratedTickets();
    const st = currentState();

    const baseline = (Array.isArray(st?.tickets) ? st.tickets : [])
      .filter(ticket => ticket?.available !== false && Array.isArray(ticket?.legs) && ticket.legs.length)
      .map(ticket => ({
        ...ticket,
        type:`${cleanTicketTypeF6025(ticket.type)} · Kalibresiz`,
        modelId:'career',
        modelLabel:'1. Kalibresiz · Kariyer Yol Haritası',
        calibrationVariant:'UNCALIBRATED_SELECTED_HISTORY',
        warnings:[
          'Kalibresiz kupon: Kariyer Yol Haritası “Kanıt” sırası kullanıldı; Güncel Analiz karıştırılmadı.',
          ...(Array.isArray(ticket?.warnings)
            ? ticket.warnings.filter(w => !clean(w).includes('F37') && !/5 Model arşiv/i.test(clean(w)))
            : [])
        ]
      }));

    if (!baseline.length) throw new Error('Kalibresiz Kariyer Yol Haritası kuponu oluşturulamadı.');

    setBuildStatusF6015('2/2 · Seçili geçmiş yarışlarla kalibreli kupon hazırlanıyor…');
    const calibrationApi = window.ATExactMatchCalibrationCouponV1691F595;
    if (typeof calibrationApi?.build !== 'function') {
      if (st) st.tickets = baseline;
      try { if (typeof save === 'function') save(); } catch {}
      if (typeof renderTicketsV11 === 'function') renderTicketsV11();
      else if (typeof renderTickets === 'function') renderTickets();
      setBuildStatusF6015('Hazır · kalibresiz Kariyer Yol Haritası kuponu oluşturuldu. 5 Model arşiv motoru hazır değil.', 'ok');
      return;
    }

    const calibratedResult = await calibrationApi.build({skipAudit:true,caller:'F60.18-DUAL'});
    const calibratedSource = Array.isArray(calibratedResult)
      ? calibratedResult
      : (Array.isArray(st?.tickets) ? st.tickets : []);

    // F60.13 build zinciri bu tamamlanma imzasını 5 Model sürümüne genişletir.
    const calibratedCompleted = calibratedSource.length && calibratedSource.every(ticket =>
      String(ticket?.careerCouponVersion||'').includes('F59.5-EXACT-CALIBRATED') ||
      Object.prototype.hasOwnProperty.call(ticket||{},'calibratedLegs')
    );

    const calibratedUsable = calibratedSource.filter(usableCalibratedTicketF6025);
    const missingMessages = [...new Set(
      calibratedSource
        .filter(ticket => !usableCalibratedTicketF6025(ticket))
        .map(ticket => clean(ticket?.error))
        .filter(Boolean)
    )];

    const calibrated = calibratedUsable.map(ticket => ({
      ...ticket,
      type:`${cleanTicketTypeF6025(ticket.type)} · Kalibreli`,
      modelLabel:'2. Kalibreli · Seçilen Geçmiş Yarışlar',
      calibrationVariant:'SELECTED_HISTORY_TOP1_TOP2_TOP3_TOP5',
      warnings:[
        `Kalibreli kupon: ${Number(ticket?.calibratedLegs)||0}/${Array.isArray(ticket?.legs)?ticket.legs.length:0} ayakta seçili geçmiş yarış profili kullanıldı.`,
        ...(Array.isArray(ticket?.warnings) ? ticket.warnings : [])
      ]
    }));

    if (st) {
      // F60.25: 5 Model arşivi eksikse kalibresiz kuponu ASLA bozma.
      // Eksik model kartları sonuç listesine eklenmez.
      st.tickets = [...baseline, ...calibrated];
      st.analyses = st.analyses || {};
      st.analyses.ticketV11 = {
        ...(st.analyses.ticketV11 || {}),
        version:'CAREER-COUPON-V16.9.1F60.25-ARCHIVE-SAFE',
        f37Applied:false,
        calibratedCompleted:Boolean(calibratedCompleted),
        calibratedAvailable:calibrated.length,
        calibratedMissing:Math.max(0, calibratedSource.length - calibratedUsable.length),
        variants:[
          'UNCALIBRATED',
          ...(calibrated.length ? ['SELECTED_HISTORY_CALIBRATED'] : [])
        ],
        generatedAt:new Date().toISOString()
      };
    }

    try { if (typeof save === 'function') save(); } catch {}
    if (typeof renderTicketsV11 === 'function') renderTicketsV11();
    else if (typeof renderTickets === 'function') renderTickets();

    if (!calibrated.length) {
      const detail = missingMessages.length
        ? ` Eksik: ${missingMessages.join(' ')}`
        : ' 5 Model arşiv kayıtları bu kupon ayakları için hazır değil.';
      setBuildStatusF6015(`Hazır · kalibresiz Kariyer Yol Haritası kuponu oluşturuldu. Kalibrasyonlu kuponlar atlandı.${detail}`, 'ok');
    } else {
      setBuildStatusF6015(`Hazır · 1 kalibresiz + ${calibrated.length} model kalibrasyonlu kupon oluşturuldu.`, 'ok');
    }
  } catch (error) {
    console.error('[AT AI] F60.25 arşiv güvenli çift kupon', error);
    setBuildStatusF6015(`Kupon oluşturulamadı: ${error?.message || error}`, 'error');
    try { alert(`Kupon oluşturulamadı: ${error?.message || error}`); } catch {}
  } finally {
    dualBuildBusyF6018 = false;
  }
}

function decorateGate(message = '') {
  const body = $(BODY_ID);
  if (!body) return;
  let card = $('couponIstanbulCalibrationF37');
  const html = `
    ${message ? `<h3>${esc(message)}</h3>` : '<h3>Kalibresiz kupon · Kariyer Yol Haritası</h3>'}
    <p>Kalibresiz kupon, Kariyer Yol Haritasındaki “Kanıt” sırasını kullanır. Güncel Analiz kalibresiz kupona karıştırılmaz.</p>
    <div class="cdg-chipbox">
      <span class="cdg-chip">K/H ilk 2: ${BACKTEST.kh.top2}/${BACKTEST.kh.usable}</span>
      <span class="cdg-chip">K/H ilk 5: ${BACKTEST.kh.top5}/${BACKTEST.kh.usable}</span>
      <span class="cdg-chip">5 Model: kupon dışı</span>
    </div>`;
  if (card) {
    card.innerHTML = html;
    return;
  }
  card = document.createElement('div');
  card.id = 'couponIstanbulCalibrationF37';
  card.className = 'cdg-card';
  card.innerHTML = html;
  body.insertBefore(card, body.firstChild || null);
}

function patchCouponText() {
  try {
    const note = document.querySelector('#couponCenterDialog .five-model-note-v11');
    if (note) {
      note.innerHTML = '<b>İki kupon birlikte oluşturulur</b><span>1) Kalibresiz Kariyer Yol Haritası. 2) Günün Koşu Kalibrasyonu menüsünde seçilen geçmiş yarışlarla kalibreli.</span>';
    }
    const button = $('buildAllBtn');
    if (button && button.textContent !== 'Kalibresiz + Kalibreli İki Kupon Oluştur') button.textContent = 'Kalibresiz + Kalibreli İki Kupon Oluştur';
  } catch {}
}

const oldApi = window.ATCouponCareerOnlyV1691F1;
if (oldApi) {
  oldApi.scoreRows = calibratedScoreRows;
  oldApi.buildCareerTickets = buildDualTicketsF6018;
}
const oldHybrid = window.ATCouponHybridV1691F8;
if (oldHybrid) {
  oldHybrid.scoreRows = calibratedScoreRows;
  oldHybrid.build = buildDualTicketsF6018;
}
try { buildTicketsV11 = buildDualTicketsF6018; } catch {}
try { buildTickets = buildDualTicketsF6018; } catch {}

if (window.ATCouponDecisionV1671 && previousGateOpen) {
  window.ATCouponDecisionV1671.open = async function(...args) {
    const result = await previousGateOpen(...args);
    decorateGate();
    patchCouponText();
    return result;
  };
}

window.addEventListener('click', event => {
  const build = event.target?.closest?.('#buildAllBtn,#careerOnlyBuildV1691F1');
  if (!build) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void buildDualTicketsF6018();
}, true);

document.addEventListener('click', event => {
  const direct = event.target?.closest?.('#buildAllBtn');
  if (!direct) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void buildDualTicketsF6018();
}, true);

document.addEventListener('click', event => {
  const build = event.target?.closest?.('#careerOnlyBuildV1691F1');
  if (!build) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void buildDualTicketsF6018();
}, true);

document.addEventListener('click', event => {
  if (event.target?.closest?.('#buildAllBtn,#careerOnlyCheckV1691F1')) {
    setTimeout(() => {
      decorateGate();
      patchCouponText();
    }, 80);
  }
}, true);

patchCouponText();
window.ATIstanbulOutcomeCalibrationV1691F37 = {
  version:VERSION,
  source:SOURCE,
  backtest:BACKTEST,
  fusionRule:'CAREER_PREPARATION_70_CURRENT_30; NO_CAREER_CURRENT_100',
  uncalibratedSource:UNCALIBRATED_SOURCE_F6023,
  uncalibratedRule:'CAREER_ROADMAP_RAW_EVIDENCE; TRUE_DEBUT=CURRENT_ANALYSIS_F6030',
  uncalibratedScoreRows:careerRoadmapRowsF6023,
  trueDebutRule:'VERIFIED_ZERO_PREVIOUS_RACES_USES_CURRENT_ANALYSIS_F6030',
  needsCurrentForTrueDebut:needsCurrentForTrueDebutF6030,
  ensureCurrent:ensureCurrentAllF6011,
  scoreRows:calibratedScoreRows,
  build:buildDualTicketsF6018,
  minWidthForRace,
  raceTags,
  profile:() => ({ ...BACKTEST })
};

console.info('[AT AI]', VERSION, 'F60.18 active - static F37 disabled; selected-history calibrated and uncalibrated coupons enabled.');
})();
