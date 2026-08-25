/* AT AI Mobil — V16.9.15 Kupon: yalniz Kariyer / Hazirlik Siralamasi
   - Kupon puan/sira kaynagi yalniz Kariyer Yol Haritasi ekraninda kullanilan
     galibiyetBenzerligi.score siralamasidir.
   - 5 Model, Guncel, Kazanan Yolu, Senaryo ve Kalibrasyon kupon icin zorunlu degildir.
   - Kupon olusturulurken 5 Model endpointi / prepareRaceModelsV11 cagrilmaz.
   - Mevcut bahis baslangici, butce, birim fiyat, tek sayisi ve kolon daraltma
     mekanigi korunur; yalniz siralama kaynagi degisir.
*/
(() => {
'use strict';
if (window.__AT_COUPON_CAREER_ONLY_V16915__) return;
window.__AT_COUPON_CAREER_ONLY_V16915__ = true;

const VERSION = 'COUPON-CAREER-RANKING-ONLY-V16.9.15';
const SCREEN_ID = 'couponDecisionGateV1671';
const BODY_ID = 'cdgBodyV1671';
const SOURCE_ID = 'CAREER_PREPARATION_RANKING';
let busy = false;

const $ = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = v => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const numberValueLocal = (v, fallback) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };

function canonicalDate(value) {
  const s = clean(value);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[.\/-](\d{2})[.\/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}
function sameDate(a, b) { return canonicalDate(a) === canonicalDate(b); }
function cityName() {
  try { return typeof getCityName === 'function' ? clean(getCityName()) : clean($('citySelect')?.selectedOptions?.[0]?.textContent); }
  catch { return clean($('citySelect')?.selectedOptions?.[0]?.textContent); }
}
function selectedTypes() { return [...document.querySelectorAll('.bet-check:checked')].map(x => clean(x.value)).filter(Boolean); }
function plans() {
  return selectedTypes().map(type => {
    try { return typeof resolveBetStartV11 === 'function' ? resolveBetStartV11(type) : { ok:false, desc:{type}, error:'Bahis baslangic cozumleyicisi bulunamadi.' }; }
    catch (e) { return { ok:false, desc:{type}, error:e?.message || String(e) }; }
  });
}
function requiredRaceNos() {
  const out = new Set();
  for (const plan of plans()) if (plan?.ok) for (const race of (plan.legs || [])) {
    const no = Number(race?.no); if (Number.isFinite(no) && no > 0) out.add(no);
  }
  return [...out].sort((a,b) => a-b);
}
function careerResult() { return state?.analyses?.career || null; }
function careerRace(no) {
  const c = careerResult();
  return (Array.isArray(c?.races) ? c.races : []).find(r => String(r?.no) === String(no)) || null;
}
function careerMode(item) { return clean(item?.career?.analysisMode || item?.galibiyetBenzerligi?.analysisMode || ''); }
function careerScore(item) { return finite(item?.galibiyetBenzerligi?.score); }
function scoreRows(no) {
  const r = careerRace(no);
  return (Array.isArray(r?.horses) ? r.horses : [])
    .map(item => ({ item, score:careerScore(item) }))
    .filter(x => x.score !== null)
    .sort((a,b) => b.score-a.score || Number(a?.item?.horse?.no || 999)-Number(b?.item?.horse?.no || 999));
}

function audit() {
  const raceNos = requiredRaceNos();
  const issues = [];
  const types = selectedTypes();
  if (!types.length) issues.push({ id:'bet', label:'Bahis turu', detail:'En az bir bahis turu secilmeli.' });
  if (!Array.isArray(state?.races) || !state.races.length) issues.push({ id:'program', label:'TJK Programi', detail:'Program yuklenmemis.' });
  const invalidPlans = plans().filter(p => !p?.ok);
  if (types.length && invalidPlans.length) issues.push({ id:'plan', label:'Bahis baslangici', detail:invalidPlans.map(p => p?.error || 'Baslangic bulunamadi.').join(' · ') });

  const career = careerResult();
  if (!career || !sameDate(career?.date, state?.date)) {
    if (raceNos.length) issues.push({ id:'career', label:'Kariyer / Hazirlik Siralamasi', detail:`Eksik ayak: ${raceNos.map(x => `${x}.K`).join(', ')}` });
  } else {
    const missing = raceNos.filter(no => !careerRace(no));
    if (missing.length) issues.push({ id:'career', label:'Kariyer / Hazirlik Siralamasi', detail:`Eksik ayak: ${missing.map(x => `${x}.K`).join(', ')}` });
    const scoreless = raceNos.filter(no => careerRace(no) && !scoreRows(no).length);
    if (scoreless.length) issues.push({ id:'career-score', label:'Kariyer / Hazirlik puani', detail:`Siralamasi olusmayan ayak: ${scoreless.map(x => `${x}.K`).join(', ')}` });
  }
  return { raceNos, issues, ready:issues.length === 0, types, checkedAt:new Date().toISOString() };
}

function ensureScreen() {
  let s = $(SCREEN_ID);
  if (!s) {
    s = document.createElement('section');
    s.id = SCREEN_ID;
    s.setAttribute('aria-hidden','true');
    s.innerHTML = `<div class="cdg-head"><div><div class="cdg-ey">KARIYER / HAZIRLIK · TEK KAYNAK</div><h2>Kupon Veri Denetimi</h2></div><button id="cdgCloseV1671" class="cdg-close">×</button></div><div class="cdg-body" id="${BODY_ID}"></div>`;
    document.body.appendChild(s);
  }
  const ey = s.querySelector('.cdg-ey'); if (ey) ey.textContent = 'KARIYER / HAZIRLIK · TEK KAYNAK';
  const h2 = s.querySelector('.cdg-head h2'); if (h2) h2.textContent = 'Kupon · Kariyer/Hazirlik';
  const close = s.querySelector('#cdgCloseV1671');
  if (close && close.dataset.v16915 !== '1') {
    close.dataset.v16915 = '1';
    close.addEventListener('click', () => {
      if (busy) return;
      s.classList.remove('open'); s.setAttribute('aria-hidden','true');
    });
  }
  return s;
}

function statusRow(ok, label, detail) {
  return `<div class="cdg-row"><span class="cdg-icon">${ok?'✅':'⚠️'}</span><div><b>${esc(label)}</b><small>${esc(detail)}</small></div></div>`;
}
function renderGate(message='') {
  const a = audit();
  const s = ensureScreen();
  s.classList.add('open'); s.setAttribute('aria-hidden','false');
  const b = $(BODY_ID); if (!b) return a;
  const career = careerResult();
  const rows = a.raceNos.map(no => {
    const r = career && sameDate(career?.date,state?.date) ? careerRace(no) : null;
    const ranked = r ? scoreRows(no) : [];
    return statusRow(!!ranked.length, `${no}. Kosu`, ranked.length ? `${ranked.length} at · lider ${ranked[0]?.item?.horse?.no || ''}. ${ranked[0]?.item?.horse?.name || ''} · %${ranked[0]?.score ?? '-'}` : 'Kariyer/Hazirlik siralamasi eksik');
  }).join('');
  b.innerHTML = `${message?`<div class="cdg-card"><h3>${esc(message)}</h3></div>`:''}
    <div class="cdg-card"><h3>Tek kupon kaynagi</h3><p>Kupon artik yalniz <b>Kariyer/Hazirlik Siralamasi</b> ile kurulur. 5 Model, Guncel Analiz, Kazanan Yolu, Senaryo ve Kalibrasyon kupon puanina girmez ve kupon icin hesaplanmaz.</p><div class="cdg-chipbox"><span class="cdg-chip">${esc(state?.date || '')}</span><span class="cdg-chip">${esc(cityName())}</span><span class="cdg-chip">${a.raceNos.length} ayak</span></div></div>
    <div class="cdg-card"><h3>${a.ready?'✅ Kariyer/Hazirlik verisi hazir':'Eksik veri'}</h3>${rows || statusRow(false,'Bahis ayagi','Once bahis turunu secin.')}${a.issues.filter(x=>!['career','career-score'].includes(x.id)).map(x=>statusRow(false,x.label,x.detail)).join('')}</div>
    <div class="cdg-card"><h3>Kupon kurali</h3><p>At sirasi, Kariyer Yol Haritasi ekraninda gordugunuz <b>galibiyetBenzerligi.score</b> sirasi ile birebir aynidir. Butce, birim fiyat ve tek sayisi ayarlari mevcut kupon mekaniginde korunur.</p></div>
    <div class="cdg-actions">${a.issues.some(x=>x.id==='career'||x.id==='career-score')?'<button class="cdg-btn primary wide" id="careerOnlyCompleteV16915">Eksik Kariyer Siralamasini Tamamla</button>':''}<button class="cdg-btn" id="careerOnlyCheckV16915">Tekrar Kontrol Et</button><button class="cdg-btn good" id="careerOnlyBuildV16915" ${a.ready?'':'disabled'}>Kuponu Olustur</button></div>`;
  $('careerOnlyCheckV16915')?.addEventListener('click',()=>renderGate());
  $('careerOnlyCompleteV16915')?.addEventListener('click',()=>void completeCareer());
  $('careerOnlyBuildV16915')?.addEventListener('click',()=>void buildCareerTickets());
  return a;
}

async function waitPaint() { return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }
async function completeCareerRace(no) {
  if (typeof runAnalysis !== 'function') throw new Error('Kariyer hesaplama fonksiyonu bulunamadi.');
  const dialog = $('analysisDialog'), selector = $('analysisRace');
  const oldView = dialog?.dataset?.view, oldVal = selector?.value;
  try {
    if (dialog) dialog.dataset.view = 'career';
    if (selector) {
      selector.value = String(no);
      if (selector.value !== String(no)) throw new Error(`${no}.K analiz secicisinde bulunamadi.`);
    }
    await waitPaint(); await runAnalysis(); await waitPaint();
    if (!careerRace(no) || !scoreRows(no).length) throw new Error(`${no}.K Kariyer/Hazirlik siralamasi olusmadi.`);
  } finally {
    if (dialog) { if (oldView) dialog.dataset.view = oldView; else delete dialog.dataset.view; }
    if (selector && oldVal !== undefined) selector.value = oldVal;
  }
}
async function completeCareer() {
  if (busy) return; busy = true;
  try {
    const a = audit();
    const list = a.raceNos.filter(no => !careerRace(no) || !sameDate(careerResult()?.date,state?.date) || !scoreRows(no).length);
    for (let i=0;i<list.length;i++) {
      renderGate(`Kariyer/Hazirlik tamamlaniyor · ${i+1}/${list.length} · ${list[i]}.K`);
      await completeCareerRace(list[i]);
    }
    renderGate('Kariyer/Hazirlik siralamalari tamamlandi.');
  } catch (e) {
    renderGate(`Tamamlama hatasi: ${e?.message || e}`);
  } finally { busy = false; }
}

function syntheticRaceData(no) {
  const r = careerRace(no);
  const horses = (Array.isArray(r?.horses) ? r.horses : []).map(item => {
    const sim = item?.galibiyetBenzerligi || {};
    const score = careerScore(item);
    const mode = careerMode(item);
    const rows = Array.isArray(sim?.rows) ? sim.rows : [];
    return {
      horse:item?.horse || {},
      careerOk:true,
      careerError:null,
      scores:{
        career:{
          score,
          rawScore:score,
          coverageYears:Number(sim?.coverageYears || rows.length || 0),
          strongYears:Number(sim?.strongYears || rows.filter(x=>Number(x?.score)>=85).length || 0),
          supportYears:Number(sim?.supportYears || rows.filter(x=>Number(x?.score)>=70).length || 0),
          latestScore:finite(sim?.latestScore ?? rows[0]?.score),
          mode
        },
        analysisMode:mode
      }
    };
  });
  return { no:Number(no), roadmapOk:true, roadmapError:null, modelCounts:{}, horses, source:SOURCE_ID };
}

function cleanupTicketUi() {
  try {
    document.querySelectorAll('#tickets .ticket-group-v11 summary small').forEach(el => el.textContent = 'Kariyer/Hazirlik siralamasi');
    document.querySelectorAll('#tickets .ticket-group-v11 summary > span').forEach(el => el.textContent = 'Kariyer kaynagi ▾');
    document.querySelectorAll('#tickets .ticket-model-tab-v11').forEach(el => { if (clean(el.textContent) === 'Kariyer') el.textContent = 'Kariyer/Hazirlik'; });
  } catch {}
}

async function buildCareerTickets() {
  if (busy) return;
  const a = audit(); if (!a.ready) { renderGate(); return; }
  busy = true;
  try {
    if (typeof buildOneTicketV11 !== 'function' || typeof resolveBetStartV11 !== 'function') throw new Error('Kupon altyapisi bulunamadi.');
    const types = selectedTypes();
    const ps = types.map(resolveBetStartV11);
    const budget = Math.max(1, numberValueLocal($('budget')?.value, 500));
    const unitPrice = Math.max(0.01, numberValueLocal($('unitPrice')?.value, 1));
    const requestedSingles = Math.max(0, Math.min(7, Math.floor(numberValueLocal($('singleCount')?.value, 1))));
    const map = new Map(a.raceNos.map(no => [String(no), syntheticRaceData(no)]));
    const model = { id:'career', label:'Kariyer / Hazirlik Siralamasi', short:'Kariyer/Hazirlik', weight:1 };
    const tickets = [];
    ps.forEach((plan, index) => {
      const type = plan?.desc?.type || types[index] || 'Bahis';
      if (!plan?.ok) {
        tickets.push({ version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'FIVE-TICKET-MODELS-V11.0', type, modelId:'career', modelLabel:model.label, available:false, city:cityName(), date:state?.date, error:plan?.error || 'Bahis baslangici bulunamadi.', source:SOURCE_ID });
        return;
      }
      const ticket = buildOneTicketV11(plan, model, map, budget, unitPrice, requestedSingles);
      ticket.source = SOURCE_ID;
      ticket.sourceVersion = VERSION;
      ticket.scoreRule = 'Yalniz Kariyer/Hazirlik galibiyetBenzerligi.score siralamasi';
      tickets.push(ticket);
    });
    state.tickets = tickets;
    state.analyses = state.analyses || {};
    state.analyses.ticketV11 = {
      version:typeof TICKET_V11_VERSION!=='undefined'?TICKET_V11_VERSION:'FIVE-TICKET-MODELS-V11.0',
      scoreVersion:VERSION,
      source:SOURCE_ID,
      date:state?.date,
      city:state?.city,
      generatedAt:new Date().toISOString(),
      raceNos:a.raceNos
    };
    try { if (typeof save === 'function') save(); } catch {}
    if (typeof renderTicketsV11 === 'function') renderTicketsV11(); else if (typeof renderTickets === 'function') renderTickets();
    cleanupTicketUi();
    renderGate('Kupon hazir · yalniz Kariyer/Hazirlik siralamasi kullanildi.');
    setTimeout(() => {
      try { $('cdgCloseV1671')?.click(); } catch {}
      try { $('tickets')?.scrollIntoView?.({behavior:'smooth',block:'start'}); } catch {}
      cleanupTicketUi();
    }, 250);
  } catch (e) {
    renderGate(`Kupon olusturulamadi: ${e?.message || e}`);
  } finally { busy = false; }
}

async function openCareerOnly() {
  try { await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.(); } catch {}
  renderGate();
}

function patchSetupText() {
  try {
    const note = document.querySelector('#couponCenterDialog .five-model-note-v11');
    if (note) note.innerHTML = '<b>Kupon kaynagi: Kariyer / Hazirlik Siralamasi</b><span>5 Model kupon uretiminden cikarildi. Kupon, Kariyer Yol Haritasi puan/sirasini kullanir.</span>';
    document.querySelectorAll('#couponCenterDialog .manual-models-v117').forEach(el => el.style.setProperty('display','none','important'));
    const btn = $('buildAllBtn'); if (btn) btn.textContent = 'Kariyer/Hazirliktan Kupon Olustur';
  } catch {}
}

const oldApi = window.ATCouponDecisionV1671 || {};
window.ATCouponDecisionV1671 = {
  ...oldApi,
  VERSION,
  audit,
  open:openCareerOnly,
  computeDecisions:() => ({ source:SOURCE_ID, raceNos:requiredRaceNos(), plans:plans() })
};

try { buildTicketsV11 = buildCareerTickets; } catch {}
try { buildTickets = buildCareerTickets; } catch {}

const mo = new MutationObserver(() => { patchSetupText(); cleanupTicketUi(); });
try { mo.observe(document.documentElement,{subtree:true,childList:true}); } catch {}
patchSetupText(); cleanupTicketUi();
window.ATCouponCareerOnlyV16915 = { VERSION, SOURCE_ID, audit, buildCareerTickets, syntheticRaceData };
console.info('[AT AI]', VERSION, 'aktif — kupon yalniz Kariyer/Hazirlik siralamasindan uretilir; 5 Model kupon kaynagi iptal.');
})();
