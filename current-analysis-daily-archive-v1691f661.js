;(() => {
'use strict';
if (window.__AT_CURRENT_ANALYSIS_DAILY_ARCHIVE_V1691F661__) return;
window.__AT_CURRENT_ANALYSIS_DAILY_ARCHIVE_V1691F661__ = true;

const VERSION = 'CURRENT-ANALYSIS-DAILY-ARCHIVE-V16.9.1F60.61';
const DB_NAME = 'at_ai_daily_current_archive_v1';
const DB_VERSION = 1;
const STORE = 'entries';
const $ = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc = v => clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dbPromise = null;
let runBusy = false;

function st() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  return window.state || null;
}
function cityName() {
  try { if (typeof getCityName === 'function') return clean(getCityName()); } catch {}
  const s = st();
  const id = clean(s?.city);
  return clean((Array.isArray(s?.cities)?s.cities:[]).find(x=>clean(x?.id)===id)?.name) || id;
}
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch { return resolve(null); }
    req.onupgradeneeded = () => {
      const db = req.result;
      let store;
      if (!db.objectStoreNames.contains(STORE)) store = db.createObjectStore(STORE, { keyPath:'key' });
      else store = req.transaction.objectStore(STORE);
      if (!store.indexNames.contains('date')) store.createIndex('date','date',{unique:false});
      if (!store.indexNames.contains('city')) store.createIndex('city','city',{unique:false});
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { try { db.close(); } catch {} dbPromise = null; };
      resolve(db);
    };
    req.onerror = req.onblocked = () => { dbPromise = null; resolve(null); };
  });
  return dbPromise;
}
async function put(rec) {
  const db = await openDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(rec);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function get(key) {
  const db = await openDb(); if (!db) return null;
  return new Promise(resolve => {
    try {
      const q = db.transaction(STORE,'readonly').objectStore(STORE).get(key);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function del(key) {
  const db = await openDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function list(date, city) {
  const db = await openDb(); if (!db) return [];
  return new Promise(resolve => {
    const out = [];
    try {
      const store = db.transaction(STORE,'readonly').objectStore(STORE);
      const req = store.indexNames.contains('date')
        ? store.index('date').openCursor(IDBKeyRange.only(clean(date)))
        : store.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        const v = c.value;
        if (clean(v?.date) === clean(date) && clean(v?.city) === clean(city)) out.push(v);
        c.continue();
      };
      req.onerror = () => resolve(out);
      req.transaction.oncomplete = () => resolve(out);
      req.transaction.onerror = req.transaction.onabort = () => resolve(out);
    } catch { resolve(out); }
  });
}
function raceScoreRows(race) {
  const rows = [];
  for (const candidate of [race?.rows,race?.ranking,race?.horses,race?.items]) {
    if (Array.isArray(candidate) && candidate.length) {
      for (const row of candidate) {
        const horse = row?.horse || row;
        const score = Number(row?.score ?? row?.puan ?? row?.totalScore ?? row?.finalScore);
        rows.push({
          no:horse?.no ?? row?.no ?? '',
          name:clean(horse?.name ?? row?.name ?? row?.horseName),
          score:Number.isFinite(score) ? score : null
        });
      }
      break;
    }
  }
  return rows.sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity)||Number(a.no||999)-Number(b.no||999));
}
async function saveResult(result, raceValue = 'all') {
  const s = st();
  if (!s || result?.type !== 'current' || !Array.isArray(result?.races) || !result.races.length) return { saved:0, skipped:'no-current-result' };
  const chosen = clean(raceValue || result?.calculatedRace || 'all') || 'all';
  const races = chosen === 'all' ? result.races : result.races.filter(r=>String(r?.no)===String(chosen));
  let saved = 0;
  for (const race of races) {
    const no = Number(race?.no ?? race?.raceNo ?? 0) || 0;
    if (!no) continue;
    const rec = {
      key:`current|${clean(result.date || s.date)}|${clean(result.city || s.city)}|${no}`,
      kind:'current-race',
      date:clean(result.date || s.date),
      city:clean(result.city || s.city),
      cityName:clean(result.cityName || cityName()),
      raceNo:no,
      version:VERSION,
      generatedAt:result.generatedAt || new Date().toISOString(),
      archivedAt:new Date().toISOString(),
      meta:{
        type:'current',
        sourceModel:result.sourceModel || '',
        rule:result.rule || '',
        agfPolicy:result.agfPolicy || '',
        coverage:result.coverage || '',
        calculatedRace:result.calculatedRace || chosen
      },
      race:typeof structuredClone === 'function' ? structuredClone(race) : JSON.parse(JSON.stringify(race))
    };
    if (await put(rec)) saved++;
  }
  try { window.dispatchEvent(new CustomEvent('at-ai:daily-current-archive-updated',{detail:{saved,version:VERSION}})); } catch {}
  return { saved, total:races.length };
}
async function saveVisible() {
  const s = st();
  const result = s?.analyses?.current;
  if (!result) return {saved:0,skipped:'no-state'};
  return saveResult(result, clean($('analysisRace')?.value || result?.calculatedRace || 'all'));
}
function ensureButton() {
  const toolbar = document.querySelector('#analysisDialog .toolbar');
  if (!toolbar) return null;
  let btn = $('currentArchiveOpenV661');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'currentArchiveOpenV661';
    btn.type = 'button';
    btn.className = 'secondary small';
    btn.innerHTML = 'Günlük Arşiv <span id="currentArchiveCountV661"></span>';
    btn.onclick = () => void openArchive();
    toolbar.appendChild(btn);
  }
  const view = $('analysisDialog')?.dataset?.view || '';
  btn.style.display = view === 'current' ? '' : 'none';
  if (view === 'current') void refreshBadge();
  return btn;
}
function ensureDialog() {
  let dlg = $('currentArchiveDialogV661');
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.id = 'currentArchiveDialogV661';
  dlg.style.cssText = 'width:min(94vw,760px);max-height:88vh;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;padding:0;';
  dlg.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px;border-bottom:1px solid #21384b">
      <div><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#65c9ff">AT AI ANALİZ</div><h2 style="margin:5px 0 0">Günlük Güncel Analiz Arşivi</h2></div>
      <button id="currentArchiveCloseV661" type="button" style="border:0;border-radius:12px;background:#15314a;color:white;font-size:24px;width:46px;height:46px">✕</button>
    </div>
    <div id="currentArchiveStatusV661" style="padding:10px 18px;color:#9eb6c9;font-size:13px"></div>
    <div id="currentArchiveListV661" style="padding:0 14px 18px;overflow:auto;max-height:70vh"></div>`;
  document.body.appendChild(dlg);
  $('currentArchiveCloseV661').onclick = () => dlg.close();
  return dlg;
}
async function refreshBadge() {
  const s = st(); if (!s) return 0;
  const rows = await list(clean(s.date), clean(s.city));
  const badge = $('currentArchiveCountV661');
  if (badge) badge.textContent = rows.length ? `(${rows.length})` : '';
  return rows.length;
}
async function renderDialog(saveInfo = null) {
  const s = st();
  const rows = await list(clean(s?.date), clean(s?.city));
  rows.sort((a,b)=>Number(a?.raceNo||0)-Number(b?.raceNo||0));
  const status = $('currentArchiveStatusV661');
  const host = $('currentArchiveListV661');
  if (status) status.textContent = `${clean(s?.date)} · ${cityName()} · ${rows.length} kayıt${saveInfo?.saved ? ` · ${saveInfo.saved} kayıt güncellendi` : ''}`;
  const badge = $('currentArchiveCountV661');
  if (badge) badge.textContent = rows.length ? `(${rows.length})` : '';
  if (!rows.length) {
    host.innerHTML = '<div style="padding:16px;border:1px solid #27445d;border-radius:14px;color:#c5d5e2">Bu gün/şehir için Güncel Analiz kaydı yok. Güncel Analiz → Analizi Hesapla tamamlandığında kayıt otomatik oluşturulur.</div>';
    return;
  }
  host.innerHTML = rows.map(rec => {
    const ranking = raceScoreRows(rec.race);
    const lead = ranking[0];
    const when = rec.archivedAt ? new Date(rec.archivedAt).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
    return `<div style="padding:14px;margin-top:10px;border:1px solid #29465d;border-radius:14px;background:#0b1b29">
      <div style="font-size:17px;font-weight:800">${esc(rec.cityName || rec.city)} · ${esc(rec.raceNo)}. Koşu</div>
      <div style="margin-top:5px;color:#9eb6c9;font-size:13px">${lead ? `Lider: ${esc(lead.no)}. ${esc(lead.name)}${lead.score===null?'':` · ${esc(lead.score.toFixed(2))}`}` : 'Güncel analiz sonucu kaydedildi'}${when ? ` · ${esc(when)}` : ''}</div>
      <div style="display:flex;gap:8px;margin-top:11px"><button type="button" data-current-open="${esc(rec.key)}" style="flex:1;padding:10px;border-radius:10px;border:1px solid #35617d;background:#143653;color:white;font-weight:700">Aç</button><button type="button" data-current-del="${esc(rec.key)}" style="padding:10px 14px;border-radius:10px;border:1px solid #75404a;background:#361d24;color:#ffd6db;font-weight:700">Sil</button></div>
    </div>`;
  }).join('');
  host.querySelectorAll('[data-current-open]').forEach(btn => btn.onclick = async () => {
    const rec = await get(btn.dataset.currentOpen);
    if (!rec?.race) return;
    const s2 = st(); if (!s2) return;
    const old = s2.analyses?.current || {};
    const map = new Map((Array.isArray(old?.races)?old.races:[]).map(r=>[String(r?.no),r]));
    map.set(String(rec.raceNo), rec.race);
    s2.analyses = s2.analyses || {};
    s2.analyses.current = {
      ...old,
      ...rec.meta,
      type:'current',
      date:rec.date,
      city:rec.city,
      cityName:rec.cityName,
      calculatedRace:String(rec.raceNo),
      coverage:'partial',
      races:[...map.values()].sort((a,b)=>Number(a?.no||0)-Number(b?.no||0)),
      generatedAt:rec.generatedAt || rec.archivedAt,
      restoredFromCurrentArchive:true
    };
    const sel = $('analysisRace');
    if (sel && [...sel.options].some(o=>String(o.value)===String(rec.raceNo))) sel.value = String(rec.raceNo);
    try { if (typeof gRenderCurrentV1657 === 'function') gRenderCurrentV1657(s2.analyses.current, String(rec.raceNo)); }
    catch (e) { console.warn('[AT AI]', VERSION, 'archive render warning', e); }
    ensureDialog().close();
  });
  host.querySelectorAll('[data-current-del]').forEach(btn => btn.onclick = async () => {
    await del(btn.dataset.currentDel);
    await renderDialog();
  });
}
async function openArchive() {
  const dlg = ensureDialog();
  if (!dlg.open) dlg.showModal();
  let info = null;
  try { info = await saveVisible(); } catch {}
  await renderDialog(info);
}

try {
  if (typeof runAnalysis === 'function') {
    const baseRunAnalysisV661 = runAnalysis;
    runAnalysis = async function(...args) {
      const view = $('analysisDialog')?.dataset?.view || 'current';
      const result = await baseRunAnalysisV661.apply(this,args);
      if (view === 'current') {
        try {
          const current = st()?.analyses?.current;
          if (current?.type === 'current' && Array.isArray(current?.races) && current.races.length) {
            await saveResult(current, clean($('analysisRace')?.value || current?.calculatedRace || 'all'));
            await refreshBadge();
          }
        } catch (error) {
          console.warn('[AT AI]', VERSION, 'autosave warning', error);
        }
      }
      return result;
    };
    const runBtn = $('runAnalysis');
    if (runBtn) runBtn.onclick = runAnalysis;
  }
} catch (error) {
  console.warn('[AT AI]', VERSION, 'runAnalysis hook warning', error);
}

function install() { ensureButton(); }
setTimeout(install,0);
setTimeout(install,500);
setTimeout(install,1500);
try {
  const dlg = $('analysisDialog');
  if (dlg) new MutationObserver(()=>setTimeout(install,0)).observe(dlg,{attributes:true,attributeFilter:['data-view','open']});
} catch {}
window.addEventListener('at-ai:daily-current-archive-updated',()=>refreshBadge().catch(()=>{}));
window.ATCurrentAnalysisDailyArchiveV661 = { version:VERSION, open:openArchive, save:saveVisible, list, refresh:refreshBadge };
console.info('[AT AI]', VERSION, 'aktif — Güncel Analiz sonucu koşu bazında Günlük Arşive otomatik kaydedilir; ana hesap ve save yöntemi değiştirilmez.');
})();
