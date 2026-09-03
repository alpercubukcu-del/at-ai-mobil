/* AT AI Mobil — V14.6 Günlük Kariyer Arşivi
   - Kariyer sonucu ve 5 Model verisini IndexedDB'de saklar.
   - Aynı tarih/şehir/koşu tekrar açıldığında ağır hesabı atlar.
   - Arşiv görüntüleme, seçili kaydı silme, günü silme ve PDF/print export sağlar.
   - Mevcut puan formüllerine müdahale etmez.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CAREER_ARCHIVE_V146__) return;
window.__AT_DAILY_CAREER_ARCHIVE_V146__ = true;

const VERSION = 'DAILY-CAREER-ARCHIVE-V14.6';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const ENGINE = typeof CAREER_UI_VERSION !== 'undefined' ? CAREER_UI_VERSION : 'CAREER-UI';
const MODEL_ENGINE = typeof CAREER_MODEL_TABS_VERSION !== 'undefined' ? CAREER_MODEL_TABS_VERSION : 'CAREER-MODEL';
const $a = id => document.getElementById(id);
const cleanA = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const escA = v => typeof escapeHtml === 'function' ? escapeHtml(v) : cleanA(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finiteA = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Number(v);
let dbPromiseA = null;
let bypassArchiveOnceA = false;

function openArchiveDbA() {
  if (dbPromiseA) return dbPromiseA;
  dbPromiseA = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch { return resolve(null); }
    req.onupgradeneeded = () => {
      const db = req.result;
      const store = db.objectStoreNames.contains(STORE)
        ? req.transaction.objectStore(STORE)
        : db.createObjectStore(STORE, { keyPath:'key' });
      if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
      if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromiseA;
}

async function idbGetA(key) {
  const db = await openArchiveDbA();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function idbPutA(value) {
  const db = await openArchiveDbA();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function idbDeleteA(key) {
  const db = await openArchiveDbA();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function listDateA(date) {
  const db = await openArchiveDbA();
  if (!db) return [];
  return new Promise(resolve => {
    const out = [];
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const index = store.index('date');
      const req = index.openCursor(IDBKeyRange.only(String(date || '')));
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        out.push(c.value);
        c.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = tx.onabort = () => resolve(out);
    } catch { resolve(out); }
  });
}

async function deleteDateA(date) {
  const rows = await listDateA(date);
  await Promise.all(rows.map(row => idbDeleteA(row.key)));
  return rows.length;
}

function currentCityNameA() {
  try { return typeof getCityName === 'function' ? cleanA(getCityName()) : ''; } catch { return ''; }
}
function raceKeyA(date, city, raceNo) { return `race|${cleanA(date)}|${cleanA(city)}|${cleanA(raceNo)}`; }
function modelKeyA(date, city, raceNo) { return `model|${cleanA(date)}|${cleanA(city)}|${cleanA(raceNo)}`; }

function raceFingerprintA(race) {
  if (!race) return '';
  const horses = (Array.isArray(race.horses) ? race.horses : [])
    .map(h => [cleanA(h?.no), cleanA(h?.id), cleanA(h?.name).toLocaleUpperCase('tr-TR')].join(':'))
    .sort();
  return [
    cleanA(race.no), cleanA(race.class || race.yaradi1), cleanA(race.ageGroup || race.yaradi2),
    cleanA(race.distance || race.mesafe), cleanA(race.track || race.pist), horses.join('|')
  ].join('||');
}

function currentRaceA(raceNo) {
  return (Array.isArray(state?.races) ? state.races : []).find(r => String(r?.no) === String(raceNo)) || null;
}

function recordMatchesProgramA(record) {
  if (!record || record.kind !== 'race') return false;
  if (cleanA(record.date) !== cleanA(state?.date) || cleanA(record.city) !== cleanA(state?.city)) return false;
  const race = currentRaceA(record.raceNo);
  return Boolean(race && record.fingerprint && record.fingerprint === raceFingerprintA(race));
}

function resultMetaA(result = {}) {
  return {
    type: result.type || 'career',
    version: result.version || ENGINE,
    careerApiVersion: result.careerApiVersion || null,
    roadmapApiVersion: result.roadmapApiVersion || null,
    raceMetaApiVersion: result.raceMetaApiVersion || null,
    date: result.date || state?.date || '',
    city: result.city || state?.city || '',
    cityName: result.cityName || currentCityNameA(),
    rule: result.rule || null,
    similarityMethod: result.similarityMethod || null,
    similarityNote: result.similarityNote || null
  };
}

async function archiveRaceA(result, race) {
  if (!result || !race?.no) return false;
  const current = currentRaceA(race.no);
  const date = cleanA(result.date || state?.date);
  const city = cleanA(result.city || state?.city);
  const record = {
    key: raceKeyA(date, city, race.no),
    kind: 'race',
    schemaVersion: VERSION,
    engine: ENGINE,
    date,
    city,
    cityName: cleanA(result.cityName || currentCityNameA()),
    raceNo: String(race.no),
    fingerprint: raceFingerprintA(current || race),
    meta: resultMetaA(result),
    race,
    generatedAt: result.generatedAt || new Date().toISOString(),
    archivedAt: new Date().toISOString()
  };
  return idbPutA(record);
}

async function archiveCalculatedResultA(result, selectedRaces = [], raceValue = 'all') {
  if (!result || !Array.isArray(result.races) || !result.races.length) return;
  const wanted = raceValue === 'all'
    ? new Set((Array.isArray(selectedRaces) ? selectedRaces : []).map(r => String(r?.no)))
    : new Set([String(raceValue)]);
  const races = result.races.filter(r => wanted.size ? wanted.has(String(r?.no)) : true);
  await Promise.all(races.map(r => archiveRaceA(result, r)));
  updateArchiveToolbarA().catch(() => {});
}

function restoreRecordIntoStateA(record, extraRecords = []) {
  const records = [record, ...extraRecords].filter(Boolean);
  if (!records.length) return null;
  const base = records[0];
  const existing = (() => {
    try { return typeof isValidCareerCache === 'function' && isValidCareerCache(state?.analyses?.career) ? state.analyses.career : null; }
    catch { return null; }
  })();
  const map = new Map();
  if (existing?.races) for (const r of existing.races) map.set(String(r.no), r);
  for (const rec of records) if (rec?.race) map.set(String(rec.raceNo), rec.race);
  const meta = base.meta || {};
  const result = {
    ...meta,
    type: 'career',
    version: ENGINE,
    date: cleanA(base.date),
    city: cleanA(base.city),
    cityName: cleanA(base.cityName || meta.cityName),
    coverage: map.size >= (Array.isArray(state?.races) ? state.races.length : 999) ? 'all' : 'partial',
    calculatedRace: records.length > 1 ? 'all' : String(base.raceNo),
    races: [...map.values()].sort((a,b) => Number(a?.no || 0) - Number(b?.no || 0)),
    generatedAt: base.generatedAt || base.archivedAt,
    restoredFromArchive: true,
    archiveVersion: VERSION
  };
  state.analyses = state.analyses || {};
  state.analyses.career = result;
  return result;
}

function showArchiveToastA(text) {
  let el = $a('careerArchiveToastV146');
  if (!el) {
    el = document.createElement('div');
    el.id = 'careerArchiveToastV146';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(showArchiveToastA.timer);
  showArchiveToastA.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

async function tryRestoreSelectedA() {
  const dialog = $a('analysisDialog');
  if (dialog?.dataset.view !== 'career') return false;
  const raceValue = $a('analysisRace')?.value || 'all';
  const date = cleanA(state?.date), city = cleanA(state?.city);
  if (!date || !city) return false;

  if (raceValue !== 'all') {
    const rec = await idbGetA(raceKeyA(date, city, raceValue));
    if (!recordMatchesProgramA(rec)) return false;
    const result = restoreRecordIntoStateA(rec);
    if (!result) return false;
    if (typeof renderCareerAnalysis === 'function') renderCareerAnalysis(result, raceValue);
    showArchiveToastA(`${raceValue}. Koşu günlük arşivden açıldı.`);
    return true;
  }

  const programRaces = Array.isArray(state?.races) ? state.races : [];
  if (!programRaces.length) return false;
  const records = [];
  for (const race of programRaces) {
    const rec = await idbGetA(raceKeyA(date, city, race.no));
    if (!recordMatchesProgramA(rec)) return false;
    records.push(rec);
  }
  const result = restoreRecordIntoStateA(records[0], records.slice(1));
  if (!result) return false;
  if (typeof renderCareerAnalysis === 'function') renderCareerAnalysis(result, 'all');
  showArchiveToastA(`${records.length} koşu günlük arşivden açıldı.`);
  return true;
}

async function clearSelectedCacheForRecomputeA() {
  const raceValue = $a('analysisRace')?.value || 'all';
  const date = cleanA(state?.date), city = cleanA(state?.city);
  if (!state?.analyses) return;
  if (raceValue === 'all') {
    state.analyses.career = {};
    const rows = await listDateA(date);
    await Promise.all(rows.filter(r => cleanA(r.city) === city).map(r => idbDeleteA(r.key)));
    try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}
    return;
  }
  const c = state.analyses.career;
  if (c?.races) c.races = c.races.filter(r => String(r?.no) !== String(raceValue));
  if (!c?.races?.length) state.analyses.career = {};
  await idbDeleteA(raceKeyA(date, city, raceValue));
  await idbDeleteA(modelKeyA(date, city, raceValue));
  try {
    if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.delete([date, city, raceValue].join('|'));
  } catch {}
}

/* Ana kariyer motoru aynen çalışır; yalnız tamamlanan sonucu arşivler. */
try {
  if (typeof runCareerAnalysis === 'function') {
    const baseRunCareerA = runCareerAnalysis;
    runCareerAnalysis = async function(selectedRaces, raceValue) {
      const out = await baseRunCareerA(selectedRaces, raceValue);
      try { await archiveCalculatedResultA(state?.analyses?.career, selectedRaces, raceValue); }
      catch (e) { console.warn('[AT AI] Kariyer arşiv kaydı yapılamadı:', e); }
      return out;
    };
  }
} catch (e) { console.warn('[AT AI] Kariyer arşiv hook kurulamadı:', e); }

/* 5 Model de ayrı saklanır; formüle dokunulmaz. */
try {
  if (typeof getCareerRaceModelsV112 === 'function') {
    const baseGetModelsA = getCareerRaceModelsV112;
    getCareerRaceModelsV112 = async function(race) {
      const date = cleanA(state?.date), city = cleanA(state?.city), raceNo = cleanA(race?.no);
      const key = modelKeyA(date, city, raceNo);
      if (!bypassArchiveOnceA) {
        const cached = await idbGetA(key);
        if (cached?.kind === 'model' && cached.engine === MODEL_ENGINE && cached.fingerprint === raceFingerprintA(race) && cached.data?.roadmapOk !== false && Array.isArray(cached.data?.horses) && cached.data.horses.length) {
          return cached.data;
        }
      }
      const data = await baseGetModelsA(race);
      if (data?.roadmapOk !== false && Array.isArray(data?.horses) && data.horses.length) {
        await idbPutA({
          key, kind:'model', schemaVersion:VERSION, engine:MODEL_ENGINE,
          date, city, cityName:currentCityNameA(), raceNo,
          fingerprint:raceFingerprintA(race), data,
          archivedAt:new Date().toISOString()
        });
        updateArchiveToolbarA().catch(() => {});
      } else {
        try { await idbDeleteA(key); } catch {}
      }
      return data;
    };
  }
} catch (e) { console.warn('[AT AI] 5 Model arşiv hook kurulamadı:', e); }

/* Analizi Hesapla: önce kalıcı günlük arşive bakar. */
try {
  if (typeof runAnalysis === 'function') {
    const baseRunAnalysisA = runAnalysis;
    const wrappedRunAnalysisA = async function() {
      const dialog = $a('analysisDialog');
      if (dialog?.dataset.view === 'career' && !bypassArchiveOnceA) {
        try { if (await tryRestoreSelectedA()) return; } catch (e) { console.warn('[AT AI] Arşivden geri yükleme uyarısı:', e); }
      }
      const force = bypassArchiveOnceA;
      try { return await baseRunAnalysisA(); }
      finally { if (force) bypassArchiveOnceA = false; }
    };
    runAnalysis = wrappedRunAnalysisA;
    if ($a('runAnalysis')) $a('runAnalysis').onclick = wrappedRunAnalysisA;
  }
} catch (e) { console.warn('[AT AI] Analiz arşiv yönlendirmesi kurulamadı:', e); }

function ensureArchiveUiA() {
  const toolbar = $a('analysisDialog')?.querySelector('.toolbar');
  if (toolbar && !$a('careerArchiveToolbarV146')) {
    const box = document.createElement('div');
    box.id = 'careerArchiveToolbarV146';
    box.innerHTML = `
      <button type="button" id="careerArchiveOpenV146" class="secondary small">📁 Günlük Arşiv <span id="careerArchiveCountV146"></span></button>
      <button type="button" id="careerArchivePdfV146" class="secondary small">📄 Günün PDF'i</button>
      <button type="button" id="careerArchiveRecalcV146" class="secondary small">↻ Yeniden Hesapla</button>`;
    toolbar.appendChild(box);
    $a('careerArchiveOpenV146').onclick = openArchiveDialogA;
    $a('careerArchivePdfV146').onclick = () => exportDatePdfA(cleanA(state?.date));
    $a('careerArchiveRecalcV146').onclick = async () => {
      if (!confirm('Seçili kariyer analizini arşivden kullanmadan yeniden hesaplayalım mı?')) return;
      await clearSelectedCacheForRecomputeA();
      bypassArchiveOnceA = true;
      showArchiveToastA('Yeniden hesaplama başlatılıyor…');
      await runAnalysis();
    };
  }

  if (!$a('careerArchiveDialogV146')) {
    const dlg = document.createElement('dialog');
    dlg.id = 'careerArchiveDialogV146';
    dlg.innerHTML = `
      <div class="career-archive-head-v146">
        <div><div class="eyebrow">AT AI ANALİZ</div><h2>Günlük Kariyer Arşivi</h2></div>
        <button type="button" class="icon-btn" id="careerArchiveCloseV146">✕</button>
      </div>
      <div class="career-archive-actions-v146">
        <button type="button" class="secondary small" id="careerArchiveDayPdfV146">📄 Günün PDF'i</button>
        <button type="button" class="danger-ghost" id="careerArchiveDeleteDayV146">Günün Tümünü Sil</button>
      </div>
      <div id="careerArchiveStorageV146" class="career-archive-storage-v146"></div>
      <div id="careerArchiveListV146" class="career-archive-list-v146"></div>`;
    document.body.appendChild(dlg);
    $a('careerArchiveCloseV146').onclick = () => dlg.close();
    $a('careerArchiveDayPdfV146').onclick = () => exportDatePdfA(cleanA(state?.date));
    $a('careerArchiveDeleteDayV146').onclick = async () => {
      const date = cleanA(state?.date);
      if (!date || !confirm(`${date} tarihindeki tüm kariyer arşivini silmek istiyor musunuz?`)) return;
      const n = await deleteDateA(date);
      showArchiveToastA(`${n} arşiv kaydı silindi.`);
      await renderArchiveDialogA();
      await updateArchiveToolbarA();
    };
  }
}

async function updateArchiveToolbarA() {
  ensureArchiveUiA();
  const holder = $a('careerArchiveToolbarV146');
  const careerOpen = $a('analysisDialog')?.dataset.view === 'career';
  if (holder) holder.style.display = careerOpen ? 'flex' : 'none';
  if (!careerOpen) return;
  const date = cleanA(state?.date), city = cleanA(state?.city);
  const rows = (await listDateA(date)).filter(r => r.kind === 'race' && cleanA(r.city) === city);
  const count = $a('careerArchiveCountV146');
  if (count) count.textContent = rows.length ? `(${rows.length})` : '';
}

async function storageTextA() {
  try {
    if (!navigator.storage?.estimate) return '';
    const e = await navigator.storage.estimate();
    const used = Number(e.usage || 0) / 1024 / 1024;
    const quota = Number(e.quota || 0) / 1024 / 1024;
    return `Tarayıcı depolaması: ${used.toFixed(1)} MB kullanılıyor${quota ? ` / ${quota.toFixed(0)} MB` : ''}.`;
  } catch { return ''; }
}

async function openArchiveDialogA() {
  ensureArchiveUiA();
  await renderArchiveDialogA();
  const dlg = $a('careerArchiveDialogV146');
  if (dlg && !dlg.open) dlg.showModal();
}

async function renderArchiveDialogA() {
  const date = cleanA(state?.date);
  const list = $a('careerArchiveListV146');
  const storage = $a('careerArchiveStorageV146');
  if (!list) return;
  if (storage) storage.textContent = await storageTextA();
  const all = await listDateA(date);
  const races = all.filter(r => r.kind === 'race').sort((a,b) => cleanA(a.cityName).localeCompare(cleanA(b.cityName),'tr') || Number(a.raceNo)-Number(b.raceNo));
  if (!races.length) {
    list.innerHTML = `<div class="career-archive-empty-v146"><b>${escA(date || 'Seçili gün')}</b> için kayıtlı kariyer analizi yok.<br>Bir koşuyu hesapladığınızda otomatik kaydedilecek.</div>`;
    return;
  }
  list.innerHTML = races.map(rec => {
    const scoreRows = rankingRowsA(rec.race);
    const leader = scoreRows[0];
    return `<div class="career-archive-row-v146" data-key="${escA(rec.key)}">
      <div class="career-archive-row-main-v146">
        <b>${escA(rec.cityName || rec.city)} · ${escA(rec.raceNo)}. Koşu</b>
        <small>${escA(rec.date)}${leader ? ` · Lider: ${escA(leader.name)}${leader.score===null?'':` %${escA(leader.score)}`}` : ''}</small>
        <small>Kaydedildi: ${escA(formatTimeA(rec.archivedAt))}</small>
      </div>
      <div class="career-archive-row-actions-v146">
        <button type="button" class="secondary small" data-open="${escA(rec.key)}">Aç</button>
        <button type="button" class="secondary small" data-pdf="${escA(rec.key)}">PDF</button>
        <button type="button" class="danger-ghost" data-del="${escA(rec.key)}">Sil</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-open]').forEach(btn => btn.onclick = async () => {
    const rec = await idbGetA(btn.dataset.open);
    if (!rec) return;
    if (!recordMatchesProgramA(rec)) {
      alert(`Bu kaydı açmak için önce ${rec.date} / ${rec.cityName || rec.city} programını yükleyin. Program koşu listesi de arşivdeki kayıtla aynı olmalıdır.`);
      return;
    }
    const select = $a('analysisRace');
    if (select && [...select.options].some(o => String(o.value) === String(rec.raceNo))) select.value = String(rec.raceNo);
    const result = restoreRecordIntoStateA(rec);
    if (result && typeof renderCareerAnalysis === 'function') renderCareerAnalysis(result, String(rec.raceNo));
    $a('careerArchiveDialogV146')?.close();
    showArchiveToastA(`${rec.raceNo}. Koşu arşivden açıldı.`);
  });
  list.querySelectorAll('[data-pdf]').forEach(btn => btn.onclick = () => exportRecordPdfA(btn.dataset.pdf));
  list.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
    const rec = await idbGetA(btn.dataset.del);
    if (!rec || !confirm(`${rec.cityName || rec.city} ${rec.raceNo}. Koşu arşiv kaydı silinsin mi?`)) return;
    await idbDeleteA(rec.key);
    await idbDeleteA(modelKeyA(rec.date, rec.city, rec.raceNo));
    await renderArchiveDialogA();
    await updateArchiveToolbarA();
  });
}

function formatTimeA(v) {
  try { return new Date(v).toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }
  catch { return cleanA(v); }
}
function careerRowsOfA(item = {}) {
  const c = item.career || {};
  for (const rows of [c.fullPathBefore,c.historyBefore,c.comparisonPathBefore,c.roadmapBefore,c.history,c.roadmap,c.top5]) {
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}
function rankingRowsA(race = {}) {
  return (Array.isArray(race.horses) ? race.horses : []).map(item => ({
    no: item?.horse?.no ?? '', name: cleanA(item?.horse?.name),
    score: finiteA(item?.galibiyetBenzerligi?.score),
    mode: cleanA(item?.career?.analysisMode || item?.galibiyetBenzerligi?.analysisMode),
    careerCount: careerRowsOfA(item).length,
    item
  })).sort((a,b) => (b.score ?? -1) - (a.score ?? -1) || Number(a.no || 999)-Number(b.no || 999));
}
function modeTextA(mode) {
  try { if (typeof modeLabelV11 === 'function') return modeLabelV11(mode); } catch {}
  return mode === 'FULL_PATH' ? 'Tam Kariyer Yolu' : mode === 'WIN_PATH' ? 'Galibiyet Yolu' : mode === 'PREPARATION_PATH' ? 'Hazırlık / İlk 5' : (mode || 'Kariyer');
}

function pdfRaceHtmlA(rec, modelRec) {
  const race = rec.race || {};
  const ranking = rankingRowsA(race);
  const modelIds = ['composite','exact','twin','family','career'];
  const modelNames = {composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career:'Kariyer'};
  let models = '';
  if (modelRec?.data) {
    models = `<h3>5 Model Kariyer Sıralaması</h3>` + modelIds.map(id => {
      let rows = [];
      try { if (typeof modelRankingV112 === 'function') rows = modelRankingV112(modelRec.data, id); } catch {}
      return `<div class="pdf-model-v146"><b>${modelNames[id]}</b><div>${rows.length ? rows.map((x,i) => `${i+1}. ${escA(x?.horse?.no || '')}. ${escA(x?.horse?.name || '')} — %${escA(x.displayScore ?? '-')}`).join('<br>') : 'Kayıt yok'}</div></div>`;
    }).join('');
  }
  return `<section class="pdf-race-v146">
    <h2>${escA(rec.cityName || rec.city)} · ${escA(rec.raceNo)}. Koşu</h2>
    <div class="pdf-meta-v146">${escA(race.class || race.meta?.class || '')} · ${escA(race.ageGroup || race.meta?.ageGroup || '')} · ${escA(race.distance || race.meta?.distance || '')} ${escA(race.track || race.meta?.track || '')}</div>
    ${models}
    <h3>Kariyer / Hazırlık Sıralaması</h3>
    <table><thead><tr><th>Sıra</th><th>At</th><th>Puan</th><th>Yol</th><th>Kariyer yarışı</th></tr></thead><tbody>
      ${ranking.map((r,i) => `<tr><td>${i+1}</td><td>${escA(r.no)}. ${escA(r.name)}</td><td>${r.score===null?'—':'%'+escA(r.score)}</td><td>${escA(modeTextA(r.mode))}</td><td>${escA(r.careerCount)}</td></tr>`).join('')}
    </tbody></table>
    <h3>At Kariyer Yolları</h3>
    ${ranking.map(r => {
      const path = careerRowsOfA(r.item);
      return `<div class="pdf-horse-v146"><b>${escA(r.no)}. ${escA(r.name)}${r.score===null?'':' · %'+escA(r.score)}</b><div>${path.length ? path.map(x => `${escA(x?.date || x?.isoDate || '')} ${escA(x?.city || '')} · ${escA(x?.finish ?? x?.rank ?? x?.sira ?? '-')}.'lik · ${escA(x?.class || x?.raceClass || '')} · ${escA(x?.distance || x?.mesafe || '')} ${escA(x?.track || x?.pist || '')}`).join('<br>') : 'Kariyer yolu kaydı yok.'}</div></div>`;
    }).join('')}
  </section>`;
}

function pdfDocumentHtmlA(date, pairs) {
  return `<div id="careerArchivePdfRootV146">
    <h1>AT AI — Günlük Kariyer Analizi</h1>
    <div class="pdf-date-v146">${escA(date)} · ${pairs.length} koşu</div>
    ${pairs.map(p => pdfRaceHtmlA(p.race, p.model)).join('')}
    <div class="pdf-foot-v146">${escA(VERSION)} · PDF arşivdeki hesaplanmış sonuçlardan oluşturuldu; puanlar yeniden hesaplanmadı.</div>
  </div>`;
}

async function loadHtml2PdfA() {
  if (window.html2pdf) return window.html2pdf;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
    s.onload = () => resolve(window.html2pdf);
    s.onerror = () => reject(new Error('PDF kitaplığı yüklenemedi.'));
    document.head.appendChild(s);
  });
}

function safeFileA(v) { return cleanA(v).replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_') || 'AT_AI'; }

async function makePdfA(date, pairs, suffix='KARIYER_ANALIZI') {
  if (!pairs.length) { alert('PDF için arşivlenmiş kariyer analizi bulunamadı.'); return; }
  const host = document.createElement('div');
  host.className = 'career-archive-pdf-host-v146';
  host.innerHTML = pdfDocumentHtmlA(date, pairs);
  document.body.appendChild(host);
  const filename = `${safeFileA(date)}_${safeFileA(suffix)}.pdf`;
  try {
    const lib = await loadHtml2PdfA();
    if (!lib) throw new Error('PDF kitaplığı kullanılamıyor.');
    await lib().set({
      margin:[8,8,10,8], filename,
      image:{type:'jpeg',quality:0.95},
      html2canvas:{scale:1.35,useCORS:true,backgroundColor:'#ffffff'},
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      pagebreak:{mode:['css','legacy']}
    }).from(host.firstElementChild).save();
    showArchiveToastA('PDF hazırlandı.');
  } catch (e) {
    console.warn('[AT AI] PDF doğrudan üretilemedi, yazdırma görünümü açılıyor:', e);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escA(filename)}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:5px;font-size:11px}.pdf-race-v146{break-after:page;margin-bottom:22px}.pdf-horse-v146{margin:8px 0;font-size:10px;line-height:1.4}</style></head><body>${host.innerHTML}<script>setTimeout(()=>window.print(),400)<\/script></body></html>`);
      w.document.close();
    } else alert(e?.message || 'PDF hazırlanamadı.');
  } finally { host.remove(); }
}

async function exportRecordPdfA(key) {
  const rec = await idbGetA(key);
  if (!rec) return;
  const model = await idbGetA(modelKeyA(rec.date, rec.city, rec.raceNo));
  await makePdfA(rec.date, [{race:rec, model}], `${rec.cityName || rec.city}_${rec.raceNo}K_KARIYER_ANALIZI`);
}

async function exportDatePdfA(date) {
  const rows = await listDateA(date);
  const races = rows.filter(r => r.kind === 'race').sort((a,b) => cleanA(a.cityName).localeCompare(cleanA(b.cityName),'tr') || Number(a.raceNo)-Number(b.raceNo));
  const modelMap = new Map(rows.filter(r => r.kind === 'model').map(r => [`${r.city}|${r.raceNo}`,r]));
  const pairs = races.map(r => ({race:r, model:modelMap.get(`${r.city}|${r.raceNo}`) || null}));
  await makePdfA(date, pairs, 'GUNLUK_KARIYER_ANALIZI');
}

function observeViewA() {
  const dlg = $a('analysisDialog');
  if (!dlg) return;
  const mo = new MutationObserver(() => updateArchiveToolbarA().catch(() => {}));
  mo.observe(dlg, {attributes:true, attributeFilter:['data-view','open']});
}

(async () => {
  ensureArchiveUiA();
  observeViewA();
  try { if (navigator.storage?.persist) navigator.storage.persist().catch(() => {}); } catch {}
  await updateArchiveToolbarA();
})();

console.info('[AT AI]', VERSION, 'aktif — IndexedDB günlük arşiv + PDF');
})();
