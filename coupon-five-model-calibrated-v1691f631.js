/* AT AI Mobil — V16.9.1F60.31 1 baseline + 5 calibrated model coupons
   - Baseline stays: Career Roadmap raw evidence; verified true debut uses Current Analysis (F60.30).
   - Adds five independent calibrated coupons: Composite, Exact, Twin, Family, Career.
   - Five-model horse scores are read ONLY from the ready Daily 5 Model IndexedDB archive (F60.24).
   - Missing model data is unavailable, never 0 and never copied from another model.
   - Verified true-debut horses inherit the F60.30 Current Analysis score inside every model channel.
     This is an explicit debut rule, not a cross-model fallback.
*/
(() => {
'use strict';
if (window.__AT_COUPON_FIVE_MODEL_CALIBRATED_V1691F631__) return;
window.__AT_COUPON_FIVE_MODEL_CALIBRATED_V1691F631__ = true;

const VERSION = 'COUPON-FIVE-MODEL-CALIBRATED-V16.9.1F60.31';
const BASELINE_SOURCE = 'CAREER_ROADMAP_EVIDENCE_TRUE_DEBUT_CURRENT_F6030';
const MODEL_SOURCE = 'DAILY_5MODEL_ARCHIVE+DAILY_CALIBRATION_F6031';
const TRUE_DEBUT_SOURCE = 'CURRENT_ANALYSIS_TRUE_DEBUT_F6030';
const TRUE_DEBUT_MODEL_SOURCE = 'CURRENT_ANALYSIS_TRUE_DEBUT_IN_5MODEL_F6031';
const MODEL_IDS = ['composite','exact','twin','family','career'];
const MODEL_LABELS = {composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};
let busy = false;

const $ = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const finite = v => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
function st() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  return window.state || null;
}
function saveState() {
  try { if (typeof save === 'function') save(); } catch {}
}
function render() {
  try {
    if (typeof renderTicketsV11 === 'function') renderTicketsV11();
    else if (typeof renderTickets === 'function') renderTickets();
  } catch (e) {
    console.warn('[AT AI]', VERSION, 'render warning', e);
  }
  patchRenderedGroups();
}
function setStatus(text, kind='') {
  const box = $('couponFusionStatusF6015');
  if (box) {
    box.textContent = text;
    box.style.display = '';
    box.style.color = kind === 'error' ? '#ff9cab' : kind === 'ok' ? '#7ee2a8' : kind === 'warn' ? '#ffbd82' : '#dcefff';
  }
  const button = $('buildAllBtn');
  if (button) {
    button.disabled = kind === 'busy';
    button.textContent = text;
  }
}
function cleanType(value) {
  return clean(value)
    .replace(/(?:\s*·\s*(?:Kalibresiz(?:\s+Kariyer)?|5\s*Model\s*Kalibrasyonlu|Kalibreli))+\s*$/gi,'')
    .trim();
}
function horseKey(h = {}) {
  const x = h?.horse || h?.item?.horse || h;
  const id = clean(x?.id ?? x?.horseId ?? x?.atId);
  if (id) return 'ID:' + id;
  const no = clean(x?.no ?? x?.programNo ?? x?.pno);
  const name = fold(x?.name ?? x?.horseName ?? x?.atadi ?? x?.atismi);
  return 'N:' + no + '|' + name;
}
function programRace(no) {
  return (Array.isArray(st()?.races) ? st().races : []).find(r => String(r?.no) === String(no)) || null;
}
function usableTicket(ticket) {
  return ticket?.available !== false && Array.isArray(ticket?.legs) && ticket.legs.length &&
    ticket.legs.every(leg => Array.isArray(leg?.selections) && leg.selections.length);
}
function patchUi() {
  const note = document.querySelector('#couponCenterDialog .five-model-note-v11');
  if (note) {
    note.innerHTML =
      '<b>1 KALİBRESİZ + 5 MODEL KALİBRASYONLU</b>' +
      '<span>Kalibresiz: Kariyer Yol Haritası Kanıt sırası. Kalibrasyonlu: Bileşik · Tam · İkiz · Aile · Kariyer.</span>' +
      '<small>5 Model yalnız hazır Günlük 5 Model arşivinden okunur. Eksik model 0 sayılmaz / başka modelden kopyalanmaz. Gerçek debut = Güncel Analiz.</small>';
  }
  const button = $('buildAllBtn');
  if (button && !busy) {
    button.disabled = false;
    button.textContent = '1 Kalibresiz + 5 Model Kalibrasyonlu Oluştur';
  }
}
function patchRenderedGroups() {
  try {
    document.querySelectorAll('#tickets details.ticket-group-v11').forEach(group => {
      const title = clean(group.querySelector('summary b')?.textContent);
      const small = group.querySelector('summary small');
      const count = group.querySelector('summary > span');
      if (/Kalibresiz Kariyer/i.test(title)) {
        if (small) small.textContent = 'Kariyer Kanıt · gerçek debutta Güncel Analiz';
        if (count) count.textContent = 'hazır ▾';
      } else if (/5 Model Kalibrasyonlu/i.test(title)) {
        if (small) small.textContent = 'Bileşik · Tam · İkiz · Aile · Kariyer';
      }
    });
  } catch {}
}

function debutMapFromBaseline(tickets) {
  const map = new Map();
  for (const ticket of Array.isArray(tickets) ? tickets : []) {
    for (const leg of Array.isArray(ticket?.legs) ? ticket.legs : []) {
      const no = String(leg?.raceNo ?? '');
      if (!map.has(no)) map.set(no, new Map());
      const raceMap = map.get(no);
      for (const row of Array.isArray(leg?.ranking) ? leg.ranking : []) {
        if (clean(row?.scoreSource) !== TRUE_DEBUT_SOURCE) continue;
        const score = finite(row?.score);
        if (score === null) continue;
        raceMap.set(horseKey(row), {
          score,
          no:row?.no,
          name:row?.name,
          id:row?.id || null
        });
      }
    }
  }
  return map;
}
function countProgramHorses(no) {
  return Array.isArray(programRace(no)?.horses) ? programRace(no).horses.length : 0;
}
function patchedRanking(baseRank, debutMap) {
  return function(raceData, modelId) {
    const no = String(raceData?.no ?? raceData?.raceNo ?? '');
    const debut = debutMap.get(no) || new Map();
    let rows = [];

    try { rows = baseRank(raceData, modelId) || []; }
    catch (e) {
      console.warn('[AT AI]', VERSION, 'base model ranking warning', { raceNo:no, modelId, error:e?.message || e });
      rows = [];
    }

    // If the archive/model channel is absent, synthesize a ranking ONLY when every
    // program horse is a verified F60.30 true debut. Mixed races remain unavailable.
    const programCount = countProgramHorses(no);
    if ((!rows.length || !Array.isArray(raceData?.horses) || !raceData.horses.length) &&
        programCount > 0 && debut.size === programCount) {
      rows = [...debut.values()].map(item => ({
        horse:{ no:item.no, name:item.name, id:item.id || null },
        score:item.score,
        coverage:0,
        strongYears:0,
        supportYears:0,
        latestScore:null,
        analysisMode:'DEBUT',
        scoreSource:TRUE_DEBUT_MODEL_SOURCE,
        debutCurrentF6031:true
      }));
    } else {
      rows = (Array.isArray(rows) ? rows : []).map(row => {
        const d = debut.get(horseKey(row));
        if (!d) return row;
        return {
          ...row,
          score:d.score,
          coverage:0,
          strongYears:0,
          supportYears:0,
          latestScore:null,
          analysisMode:'DEBUT',
          mode:'DEBUT',
          scoreSource:TRUE_DEBUT_MODEL_SOURCE,
          debutCurrentF6031:true
        };
      });
    }

    return rows.sort((a,b) => {
      const as = finite(a?.score), bs = finite(b?.score);
      const av = as === null ? -1 : as, bv = bs === null ? -1 : bs;
      return bv-av ||
        (Number(b?.strongYears)||0)-(Number(a?.strongYears)||0) ||
        (Number(b?.supportYears)||0)-(Number(a?.supportYears)||0) ||
        Number(a?.horse?.no || 999)-Number(b?.horse?.no || 999);
    });
  };
}

function normalizeBaseline(tickets) {
  return (Array.isArray(tickets) ? tickets : [])
    .filter(usableTicket)
    .map(ticket => ({
      ...ticket,
      type:cleanType(ticket.type) + ' · Kalibresiz Kariyer',
      modelId:'career',
      modelLabel:'Kalibresiz · Kariyer/Hazırlık',
      calibrationVariant:'UNCALIBRATED_CAREER_EVIDENCE_F6031',
      source:BASELINE_SOURCE,
      fiveModelUsed:false,
      warnings:[
        'Kalibresiz: kariyeri olan at = Kariyer Yol Haritası Kanıt; doğrulanmış gerçek debut = Güncel Analiz.',
        ...(Array.isArray(ticket?.warnings)
          ? ticket.warnings.filter(w => !/5 Model kupon akışında kullanılmaz|5 Model: kupon dışı/i.test(clean(w)))
          : [])
      ]
    }));
}
function normalizeFive(tickets, debutMap) {
  return (Array.isArray(tickets) ? tickets : []).map(ticket => {
    const modelId = clean(ticket?.modelId);
    const debutUsed = (Array.isArray(ticket?.legs) ? ticket.legs : []).reduce((sum, leg) => {
      return sum + (Array.isArray(leg?.ranking) ? leg.ranking : []).filter(r => clean(r?.scoreSource) === TRUE_DEBUT_MODEL_SOURCE).length;
    }, 0);
    return {
      ...ticket,
      type:cleanType(ticket.type) + ' · 5 Model Kalibrasyonlu',
      modelLabel:(MODEL_LABELS[modelId] || ticket?.modelLabel || modelId) + ' · Kalibrasyonlu',
      scoreVersion:VERSION,
      calibrationVariant:'CALIBRATED_' + String(modelId || 'UNKNOWN').toUpperCase() + '_F6031',
      source:ticket?.available === false ? 'DAILY_5MODEL_ARCHIVE_MISSING_F6031' : MODEL_SOURCE,
      trueDebutRule:'VERIFIED_F6030_DEBUT_USES_CURRENT_ANALYSIS_IN_EACH_MODEL',
      trueDebutCount:debutUsed,
      fiveModelUsed:true,
      warnings:[
        ...(debutUsed ? [`${debutUsed} gerçek debut at bu modelde Güncel Analiz puanıyla sıralandı.`] : []),
        'Model kanalları bağımsızdır; veri yoksa 0 değildir ve başka modelden fallback yapılmaz.',
        ...(Array.isArray(ticket?.warnings) ? ticket.warnings : [])
      ]
    };
  });
}

async function buildAll() {
  if (busy) return [];
  busy = true;
  setStatus('1/3 · Kalibresiz Kariyer/Hazırlık hazırlanıyor…','busy');

  const state = st();
  if (!state) {
    busy = false;
    setStatus('Kupon durumu okunamadı.','error');
    patchUi();
    return [];
  }

  try {
    // Restore strict same-program Career archive after F24 before baseline build.
    try { await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.(); } catch (e) {
      console.warn('[AT AI]', VERSION, 'Career archive hydrate warning', e);
    }

    state.tickets = [];
    const careerBuilder = window.ATIstanbulOutcomeCalibrationV1691F37?.buildCareerOnly;
    if (typeof careerBuilder !== 'function') throw new Error('Kalibresiz Kariyer/Hazırlık kupon motoru bulunamadı.');

    await careerBuilder();
    const baseline = normalizeBaseline(state.tickets);
    if (!baseline.length) {
      throw new Error('Kalibresiz Kariyer/Hazırlık kuponu oluşturulamadı. Önce gerekli Kariyer Kanıtı / debut Güncel puanı hazır olmalı.');
    }

    const debutMap = debutMapFromBaseline(baseline);
    const debutCount = [...debutMap.values()].reduce((sum,m) => sum + m.size, 0);
    setStatus(`2/3 · Hazır 5 Model arşivi ve kalibrasyon kayıtları okunuyor${debutCount ? ` · ${debutCount} gerçek debut Güncel` : ''}…`,'busy');

    const fiveApi = window.ATFiveModelArchiveOnlyCouponsV624?.build
      ? window.ATFiveModelArchiveOnlyCouponsV624
      : window.ATFiveModelCalibratedCouponsV613;

    if (!fiveApi || typeof fiveApi.build !== 'function') {
      state.tickets = baseline;
      state.analyses = state.analyses || {};
      state.analyses.ticketV11 = {
        ...(state.analyses.ticketV11 || {}),
        version:VERSION,
        fiveModelUsed:false,
        fiveModelError:'5 Model kalibrasyonlu kupon motoru bulunamadı.',
        variants:['UNCALIBRATED_CAREER']
      };
      saveState();
      render();
      throw new Error('5 Model kalibrasyonlu kupon motoru bulunamadı; kalibresiz kupon korundu.');
    }

    if (!window.ATFiveModelArchiveOnlyCouponsV624?.build) {
      state.tickets = baseline;
      saveState();
      render();
      throw new Error('Güvenli arşiv-okuma modu hazır değil. Kupon sırasında 5 Model hesabı başlatılmadı.');
    }

    const hadRank = typeof rankRaceForModelV11 === 'function';
    if (!hadRank) throw new Error('5 Model sıralama fonksiyonu bulunamadı.');
    const originalRank = rankRaceForModelV11;

    let fiveRaw = [];
    try {
      rankRaceForModelV11 = patchedRanking(originalRank, debutMap);
      fiveRaw = await fiveApi.build({
        progress:text => setStatus('2/3 · ' + clean(text),'busy')
      });
    } finally {
      rankRaceForModelV11 = originalRank;
    }

    const five = normalizeFive(fiveRaw, debutMap);
    const availableFive = five.filter(usableTicket);
    const unavailableFive = five.filter(t => !usableTicket(t));

    setStatus(`3/3 · Kuponlar yazılıyor · ${availableFive.length}/${five.length || 5} 5 Model hazır…`,'busy');

    state.tickets = [...baseline, ...five];
    state.analyses = state.analyses || {};
    state.analyses.ticketV11 = {
      ...(state.analyses.ticketV11 || {}),
      version:VERSION,
      source:MODEL_SOURCE,
      baselineSource:BASELINE_SOURCE,
      fiveModelUsed:true,
      fiveModelArchiveOnly:true,
      trueDebutRule:'VERIFIED_F6030_DEBUT_USES_CURRENT_ANALYSIS_IN_EACH_MODEL',
      trueDebutCount:debutCount,
      variants:[
        'UNCALIBRATED_CAREER',
        'CALIBRATED_COMPOSITE',
        'CALIBRATED_EXACT',
        'CALIBRATED_TWIN',
        'CALIBRATED_FAMILY',
        'CALIBRATED_CAREER'
      ],
      availableFiveModelCoupons:availableFive.length,
      unavailableFiveModelCoupons:unavailableFive.length,
      unavailableReasons:[...new Set(unavailableFive.map(t => clean(t?.error)).filter(Boolean))],
      generatedAt:new Date().toISOString()
    };

    saveState();
    render();
    patchUi();

    const msg = unavailableFive.length
      ? `Hazır · kalibresiz + ${availableFive.length}/${five.length} 5 Model kalibrasyonlu. Eksik modeller 0 sayılmadı.`
      : `Hazır · 1 kalibresiz + ${availableFive.length} 5 Model kalibrasyonlu kupon oluşturuldu.`;
    setStatus(msg, unavailableFive.length ? 'warn' : 'ok');

    setTimeout(() => {
      try { $('tickets')?.scrollIntoView?.({behavior:'smooth',block:'start'}); } catch {}
    }, 180);

    return state.tickets;
  } catch (error) {
    console.error('[AT AI]', VERSION, 'build failed', error);
    const stateNow = st();
    const hasBaseline = Array.isArray(stateNow?.tickets) && stateNow.tickets.some(t => /Kalibresiz Kariyer/i.test(clean(t?.type)));
    setStatus(
      (hasBaseline ? 'Kalibresiz kupon korundu. 5 Model oluşturulamadı: ' : 'Kupon oluşturulamadı: ') + (error?.message || error),
      'error'
    );
    try { if (!hasBaseline) alert('Kupon oluşturulamadı: ' + (error?.message || error)); } catch {}
    render();
    return Array.isArray(stateNow?.tickets) ? stateNow.tickets : [];
  } finally {
    busy = false;
    patchUi();
  }
}

function route(event) {
  const target = event?.target?.closest?.('#buildAllBtn,#careerOnlyBuildV1691F1');
  if (!target) return;
  void buildAll();
}

window.ATCouponFiveModelCalibratedV631 = {
  version:VERSION,
  buildAll,
  route,
  mode:'BASELINE_PLUS_FIVE_CALIBRATED_ARCHIVE_ONLY',
  models:MODEL_IDS.map(id => ({id,label:MODEL_LABELS[id]}))
};

// Redirect public coupon entry points. F60.28 capture listener delegates here when present.
try { buildTicketsV11 = buildAll; } catch {}
try { buildTickets = buildAll; } catch {}
if (window.ATCouponCareerOnlyFinalV628) {
  window.ATCouponCareerOnlyFinalV628.build = buildAll;
  window.ATCouponCareerOnlyFinalV628.route = route;
}
if (window.ATCouponCareerOnlyV1691F1) window.ATCouponCareerOnlyV1691F1.buildCareerTickets = buildAll;
if (window.ATCouponHybridV1691F8) window.ATCouponHybridV1691F8.build = buildAll;

patchUi();
setTimeout(patchUi, 0);
console.info('[AT AI]', VERSION, 'active — 1 baseline + 5 independent calibrated model coupons; archive-only; verified debut uses Current Analysis.');
})();
