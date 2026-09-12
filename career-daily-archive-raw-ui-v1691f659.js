;(() => {
'use strict';
if (window.__AT_CAREER_DAILY_ARCHIVE_RAW_UI_V1691F659__) return;
window.__AT_CAREER_DAILY_ARCHIVE_RAW_UI_V1691F659__ = true;

const VERSION = 'CAREER-DAILY-ARCHIVE-RAW-UI-V16.9.1F60.59';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => clean(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function st() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

function setupStore(db, tx) {
  const store = db.objectStoreNames.contains(STORE) ? tx.objectStore(STORE) : db.createObjectStore(STORE, { keyPath:'key' });
  if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
  if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
}

function openDb() {
  return new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME); } catch { return resolve(null); }
    req.onupgradeneeded = () => { try { setupStore(req.result, req.transaction); } catch {} };
    req.onsuccess = () => {
      const db = req.result;
      try { db.onversionchange = () => { try { db.close(); } catch {} }; } catch {}
      if (db.objectStoreNames.contains(STORE)) return resolve(db);
      const v = Number(db.version || 1) + 1;
      try { db.close(); } catch {}
      let repair;
      try { repair = indexedDB.open(DB_NAME, v); } catch { return resolve(null); }
      repair.onupgradeneeded = () => { try { setupStore(repair.result, repair.transaction); } catch {} };
      repair.onsuccess = () => resolve(repair.result);
      repair.onerror = repair.onblocked = () => resolve(null);
    };
    req.onerror = req.onblocked = () => resolve(null);
  });
}

async function listRows(date, city) {
  const db = await openDb();
  if (!db) return [];
  return new Promise(resolve => {
    const out = [];
    try {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE);
      const req = store.indexNames.contains('date')
        ? store.index('date').openCursor(IDBKeyRange.only(String(date || '')))
        : store.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        const v = c.value;
        if (v?.kind === 'race' && clean(v?.date) === clean(date) && clean(v?.city) === clean(city)) out.push(v);
        c.continue();
      };
      req.onerror = () => resolve(out);
      req.transaction.oncomplete = () => { try { db.close(); } catch {} resolve(out); };
      req.transaction.onerror = req.transaction.onabort = () => { try { db.close(); } catch {} resolve(out); };
    } catch { try { db.close(); } catch {} resolve(out); }
  });
}

async function getRow(key) {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => { const v = req.result || null; try { db.close(); } catch {} resolve(v); };
      req.onerror = () => { try { db.close(); } catch {} resolve(null); };
    } catch { try { db.close(); } catch {} resolve(null); }
  });
}

async function delRow(key) {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => { try { db.close(); } catch {} resolve(true); };
      tx.onerror = tx.onabort = () => { try { db.close(); } catch {} resolve(false); };
    } catch { try { db.close(); } catch {} resolve(false); }
  });
}

function score(item) {
  const sim = item?.galibiyetBenzerligi || {};
  const values = [
    sim.rankingRawScore, sim.score, sim.evidenceScore, sim.finalScore, sim.displayScore,
    sim?.strongest?.rankingRawScore, sim?.strongest?.score,
    sim.juvenileMaidenMarketConfirmationScore, sim.juvenileMaidenReadinessScore,
    sim.handicapWeightLeverageScore, sim.provenConditionWinScore, sim.candidateCareerScore,
    sim.partialSupportScore, sim.supportScore, item?.score, item?.displayScore
  ];
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(String(value).replace(/%/g,'').replace(',','.'));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function leaderOf(rec) {
  const rows = (Array.isArray(rec?.race?.horses) ? rec.race.horses : []).map(item => ({
    no:item?.horse?.no ?? '', name:clean(item?.horse?.name), score:score(item)
  })).sort((a,b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || Number(a.no || 999)-Number(b.no || 999));
  return rows[0] || null;
}

async function saveVisible() {
  const s = st();
  const result = s?.analyses?.career;
  if (!result?.races?.length) return {saved:0, failed:0, skipped:'no-career-state'};
  const raceValue = clean(document.getElementById('analysisRace')?.value || result.calculatedRace || 'all') || 'all';
  const api = window.ATCareerDailyArchivePerRaceV657;
  if (api?.savePerRace) {
    try { return await api.savePerRace(result, [], raceValue); }
    catch (error) { console.warn('[AT AI]', VERSION, 'primary archive save failed', error); }
  }
  const guard = window.ATCareerArchiveScoreGuardV1691F33;
  if (guard?.archive) {
    try { return await guard.archive(result, [], raceValue, 'raw-ui-fallback'); }
    catch (error) { console.warn('[AT AI]', VERSION, 'guard archive save failed', error); }
  }
  return {saved:0, failed:1, skipped:'no-writer'};
}

function ensureDialog() {
  let dlg = document.getElementById('careerArchiveDialogV659');
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.id = 'careerArchiveDialogV659';
  dlg.style.cssText = 'width:min(94vw,720px);max-height:86vh;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;padding:0;';
  dlg.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 18px 12px;border-bottom:1px solid #21384b">
      <div><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#65c9ff">AT AI ANALİZ</div><h2 style="margin:5px 0 0">Günlük Kariyer Arşivi</h2></div>
      <button id="careerArchiveCloseV659" type="button" style="border:0;border-radius:12px;background:#15314a;color:white;font-size:24px;width:46px;height:46px">✕</button>
    </div>
    <div id="careerArchiveStatusV659" style="padding:10px 18px;color:#9eb6c9;font-size:13px"></div>
    <div id="careerArchiveListV659" style="padding:0 14px 18px;overflow:auto;max-height:68vh"></div>`;
  document.body.appendChild(dlg);
  document.getElementById('careerArchiveCloseV659').onclick = () => dlg.close();
  return dlg;
}

async function refreshBadge() {
  const s = st();
  if (!s) return 0;
  const rows = await listRows(clean(s.date), clean(s.city));
  const badge = document.getElementById('careerArchiveCountV146');
  if (badge) badge.textContent = rows.length ? `(${rows.length})` : '';
  return rows.length;
}

async function renderDialog(saveResult) {
  const s = st();
  const dlg = ensureDialog();
  const status = document.getElementById('careerArchiveStatusV659');
  const list = document.getElementById('careerArchiveListV659');
  const rows = await listRows(clean(s?.date), clean(s?.city));
  rows.sort((a,b) => Number(a?.raceNo || 0) - Number(b?.raceNo || 0));
  if (status) {
    const msg = saveResult?.saved ? `${saveResult.saved} koşu arşive yazıldı ve doğrulandı.` : 'Mevcut hesap sonuçları kontrol edildi.';
    status.textContent = `${clean(s?.date)} · ${clean(s?.city)} · ${rows.length} kayıt · ${msg}`;
  }
  const badge = document.getElementById('careerArchiveCountV146');
  if (badge) badge.textContent = rows.length ? `(${rows.length})` : '';
  if (!rows.length) {
    list.innerHTML = '<div style="padding:18px;border:1px solid #27445d;border-radius:14px;color:#c5d5e2">Bu gün/şehir için arşiv kaydı bulunamadı. Ekranda Kariyer sonucu görünüyorsa Analizi Hesapla düğmesine bir kez dokunup tekrar Günlük Arşiv’i açın.</div>';
    return;
  }
  list.innerHTML = rows.map(rec => {
    const lead = leaderOf(rec);
    const when = rec?.archivedAt ? new Date(rec.archivedAt).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
    return `<div style="padding:14px;margin-top:10px;border:1px solid #29465d;border-radius:14px;background:#0b1b29">
      <div style="font-size:17px;font-weight:800">${esc(rec.cityName || rec.city)} · ${esc(rec.raceNo)}. Koşu</div>
      <div style="margin-top:5px;color:#9eb6c9;font-size:13px">${lead ? `Lider: ${esc(lead.no)}. ${esc(lead.name)}${lead.score===null?'':` · %${esc(lead.score)}`}` : 'Kariyer sonucu kaydedildi'}${when ? ` · ${esc(when)}` : ''}</div>
      <div style="display:flex;gap:8px;margin-top:11px"><button type="button" data-open-v659="${esc(rec.key)}" style="flex:1;padding:10px;border-radius:10px;border:1px solid #35617d;background:#143653;color:white;font-weight:700">Aç</button><button type="button" data-del-v659="${esc(rec.key)}" style="padding:10px 14px;border-radius:10px;border:1px solid #75404a;background:#361d24;color:#ffd6db;font-weight:700">Sil</button></div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-open-v659]').forEach(btn => btn.onclick = async () => {
    const rec = await getRow(btn.dataset.openV659);
    if (!rec?.race) return;
    const s2 = st();
    if (!s2) return;
    const old = s2.analyses?.career || {};
    const map = new Map((Array.isArray(old.races) ? old.races : []).map(r => [String(r?.no), r]));
    map.set(String(rec.raceNo), rec.race);
    s2.analyses = s2.analyses || {};
    s2.analyses.career = {
      ...(rec.meta || {}), ...old,
      type:'career', date:rec.date, city:rec.city, cityName:rec.cityName,
      calculatedRace:String(rec.raceNo), coverage:'partial',
      races:[...map.values()].sort((a,b)=>Number(a?.no||0)-Number(b?.no||0)),
      generatedAt:rec.generatedAt || rec.archivedAt, restoredFromArchive:true
    };
    const sel = document.getElementById('analysisRace');
    if (sel && [...sel.options].some(o => String(o.value) === String(rec.raceNo))) sel.value = String(rec.raceNo);
    try { if (typeof renderCareerAnalysis === 'function') renderCareerAnalysis(s2.analyses.career, String(rec.raceNo)); } catch {}
    dlg.close();
  });
  list.querySelectorAll('[data-del-v659]').forEach(btn => btn.onclick = async () => {
    await delRow(btn.dataset.delV659);
    await renderDialog({saved:0});
  });
}

async function openArchive() {
  const dlg = ensureDialog();
  const status = document.getElementById('careerArchiveStatusV659');
  if (status) status.textContent = 'Mevcut Kariyer sonucu arşive aktarılıyor…';
  if (!dlg.open) dlg.showModal();
  let result = null;
  try { result = await saveVisible(); } catch (error) { console.warn('[AT AI]', VERSION, error); }
  await renderDialog(result || {saved:0});
}

function install() {
  const btn = document.getElementById('careerArchiveOpenV146');
  if (btn && btn.dataset.rawArchiveV659 !== '1') {
    btn.dataset.rawArchiveV659 = '1';
    btn.onclick = openArchive;
  }
  refreshBadge().catch(()=>{});
}

setTimeout(install, 0);
setTimeout(install, 500);
setTimeout(install, 1500);
try {
  const dlg = document.getElementById('analysisDialog');
  if (dlg) new MutationObserver(() => setTimeout(install,0)).observe(dlg,{attributes:true,attributeFilter:['data-view','open']});
} catch {}
window.addEventListener('at-ai:daily-career-archive-updated', () => refreshBadge().catch(()=>{}));
window.ATCareerDailyArchiveRawUiV659 = { open:openArchive, refresh:refreshBadge, save:saveVisible, version:VERSION };
console.info('[AT AI]', VERSION, 'aktif — Günlük Arşiv ham IndexedDB kayıtlarını doğrudan gösterir ve açılışta mevcut Kariyer sonucunu kaydeder.');
})();