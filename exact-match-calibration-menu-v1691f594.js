/* AT AI Mobil — V16.9.1F59.4 TAM EŞLEŞME 5 MODEL KALİBRASYONU
   - 4. Model Kalibrasyonu menüsünü Yıllık Arşiv / Tam Eşleşme tabanlı backtest merkezine çevirir.
   - Seçili koşuda kullanıcı Yıllık Arşiv filtrelerini ve geçmiş yarış seçimini belirler.
   - Tüm koşularda yerel yıllık arşivdeki TAM eşleşmeler otomatik bulunur ve sırayla işlenir.
   - Gerçek kazananın 5 Model sırası için Top1 / Top2 / Top3 / Top5 ve ortalama sıra tutulur.
   - Sonuçlar IndexedDB kalibrasyon arşivine yazılır; aynı geçmiş yarış tekrar hesaplanmaz.
   - Kupon motoru bu sürümde değiştirilmez. Yeni timeout/watchdog eklenmez.
*/
(() => {
'use strict';
if (window.__AT_EXACT_MATCH_CALIBRATION_MENU_V1691F594__) return;
window.__AT_EXACT_MATCH_CALIBRATION_MENU_V1691F594__ = true;

const VERSION = 'EXACT-MATCH-CALIBRATION-MENU-V16.9.1F59.4';
const ENGINE = 'F59.4-CURRENT-FIVE-MODEL-WINNER-BACKTEST-V1';
const DB_NAME = 'at_ai_5model_calibration_v1';
const DB_VERSION = 1;
const STORE_ENTRIES = 'entries';
const STORE_BACKTESTS = 'backtests';
const ANNUAL_DB = 'at_ai_tjk_annual_archive_v13';
const ANNUAL_STORE = 'races';
const MODEL_IDS = ['composite','exact','twin','family','career'];
const MODEL_LABELS = { composite:'Bileşik', exact:'Tam', twin:'İkiz', family:'Aile', career:'Kariyer' };
let dbPromise = null;
let busy = false;
const programCache = new Map();

const $ = id => document.getElementById(id);
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'').trim();
const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

function finite(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function stateRef() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}
function cityName() {
  try { if (typeof getCityName === 'function') return clean(getCityName()); } catch {}
  const s = stateRef();
  const id = clean(s?.city);
  return clean((Array.isArray(s?.cities) ? s.cities : []).find(c => clean(c?.id) === id)?.name)
    || clean($('citySelect')?.selectedOptions?.[0]?.textContent)
    || id;
}
function currentDate() {
  const s = stateRef();
  return clean(s?.date || $('raceDate')?.value);
}
function currentRaces() {
  const s = stateRef();
  return Array.isArray(s?.races) ? s.races : [];
}
function raceNo(r) { return Number(r?.no ?? r?.raceNo ?? r?.kosuNo ?? 0) || 0; }
function trackKey(v) {
  const f = fold(v);
  if (f.includes('CIM')) return 'CIM';
  if (f.includes('KUM')) return 'KUM';
  if (f.includes('SENTETIK')) return 'SENTETIK';
  return f;
}
function classKey(v) {
  try {
    const k = window.canonicalClassKeyV125?.(v);
    if (clean(k)) return fold(k);
  } catch {}
  return fold(v);
}
function raceMeta(race) {
  let meta = null;
  try { if (typeof programRaceMeta === 'function') meta = programRaceMeta(race); } catch {}
  meta = meta || {};
  return {
    classRaw:clean(meta.class || race?.class || race?.raceClass || race?.yaradi1),
    ageGroup:clean(meta.ageGroup || race?.ageGroup || race?.group || race?.yaradi2),
    distance:Number(meta.distance || race?.distance || race?.mesafe || 0) || 0,
    track:clean(meta.track || race?.track || race?.pist),
    raceName:clean(race?.raceName || race?.name || race?.kosuIsmi || race?.yaradi3)
  };
}
function targetContext(race) {
  const m = raceMeta(race);
  return {
    date:currentDate(), city:cityName(), raceNo:raceNo(race),
    classRaw:m.classRaw, ageGroup:m.ageGroup, distance:m.distance, track:m.track, raceName:m.raceName
  };
}
function targetKey(ctx) { return [ctx?.date, fold(ctx?.city), Number(ctx?.raceNo)||0].join('|'); }
function backtestKey(row) { return [ENGINE, row?.date, fold(row?.city), Number(row?.raceNo)||0].join('|'); }
function profileText(ctx) {
  return [ctx?.classRaw, ctx?.ageGroup, ctx?.distance && ctx?.track ? `${ctx.distance} ${ctx.track}` : (ctx?.distance || ctx?.track), ctx?.raceName]
    .filter(Boolean).join(' · ');
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let q;
    try { q = indexedDB.open(DB_NAME, DB_VERSION); } catch { return resolve(null); }
    q.onupgradeneeded = () => {
      const db = q.result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) db.createObjectStore(STORE_ENTRIES, { keyPath:'key' });
      if (!db.objectStoreNames.contains(STORE_BACKTESTS)) db.createObjectStore(STORE_BACKTESTS, { keyPath:'key' });
    };
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => { dbPromise = null; resolve(null); };
  });
  return dbPromise;
}
async function dbGet(store, key) {
  const db = await openDb(); if (!db) return null;
  return new Promise(resolve => {
    try {
      const q = db.transaction(store,'readonly').objectStore(store).get(key);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function dbPut(store, value) {
  const db = await openDb(); if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(store,'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}
async function dbAll(store) {
  const db = await openDb(); if (!db) return [];
  return new Promise(resolve => {
    try {
      const q = db.transaction(store,'readonly').objectStore(store).getAll();
      q.onsuccess = () => resolve(q.result || []);
      q.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}
async function annualRowsLocal() {
  if (!('indexedDB' in window)) return [];
  const db = await new Promise(resolve => {
    let q; try { q = indexedDB.open(ANNUAL_DB); } catch { return resolve(null); }
    q.onsuccess = () => resolve(q.result); q.onerror = () => resolve(null);
  });
  if (!db || !db.objectStoreNames.contains(ANNUAL_STORE)) return [];
  return new Promise(resolve => {
    try {
      const q = db.transaction(ANNUAL_STORE,'readonly').objectStore(ANNUAL_STORE).getAll();
      q.onsuccess = () => resolve((q.result || []).map(x => x?.value ?? x).filter(Boolean));
      q.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}

function exactRowsForTarget(rows, ctx) {
  const ckey = classKey(ctx.classRaw), akey = fold(ctx.ageGroup), tkey = trackKey(ctx.track), city = fold(ctx.city);
  return (Array.isArray(rows) ? rows : []).filter(row => {
    if (!row?.date || row.date >= ctx.date) return false;
    return fold(row.city) === city &&
      classKey(row.classRaw) === ckey &&
      fold(row.groupRaw) === akey &&
      Number(row.distance) === Number(ctx.distance) &&
      trackKey(row.track) === tkey;
  }).sort((a,b) => String(b.date).localeCompare(String(a.date)) || Number(a.raceNo||99) - Number(b.raceNo||99));
}

function sameHorse(h, w) {
  if (!h || !w) return false;
  const hid = clean(h?.id ?? h?.horseId ?? h?.At_ID), wid = clean(w?.id ?? w?.horseId ?? w?.At_ID);
  if (hid && wid && hid === wid) return true;
  const hn = finite(h?.no ?? h?.programNo ?? h?.Program_No), wn = finite(w?.no ?? w?.programNo ?? w?.Program_No);
  if (hn !== null && wn !== null && hn === wn) return true;
  return Boolean(fold(h?.name ?? h?.horseName ?? h?.At_Adı ?? h?.At_Adi) && fold(h?.name ?? h?.horseName ?? h?.At_Adı ?? h?.At_Adi) === fold(w?.name ?? w?.horseName ?? w?.At_Adı ?? w?.At_Adi));
}
function historyWinner(data) {
  const list = Array.isArray(data?.top3) ? data.top3 : (Array.isArray(data?.rows) ? data.rows : []);
  if (!list.length) return null;
  const row = list.find(x => Number(x?.finish ?? x?.rank ?? x?.sira ?? x?.Bitiriş ?? x?.bitiris) === 1) || list[0];
  return {
    id:clean(row?.horseId ?? row?.At_ID ?? row?.id),
    no:finite(row?.programNo ?? row?.Program_No ?? row?.no),
    name:clean(row?.horseName ?? row?.At_Adı ?? row?.At_Adi ?? row?.name ?? row?.atAdi)
  };
}

async function fetchProgram(date, wantedCity) {
  const key = `${date}|${fold(wantedCity)}`;
  if (programCache.has(key)) return programCache.get(key);
  const promise = (async () => {
    const res = await fetch(`/api/tjk-program?date=${encodeURIComponent(date)}`, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Program API ${res.status}`);
    const cities = Array.isArray(data?.cities) ? data.cities : [];
    const city = cities.find(c => fold(c?.name) === fold(wantedCity));
    if (!city) throw new Error(`${wantedCity} ${date} programında bulunamadı.`);
    let races = [];
    try { if (typeof getCurrentRaceList === 'function') races = getCurrentRaceList(data, city.id); } catch {}
    if (!Array.isArray(races) || !races.length) races = data?.racesByCity?.[String(city.id)] || data?.racesByCity?.[Number(city.id)] || [];
    return { data, cities, city, races:Array.isArray(races) ? races : [] };
  })();
  programCache.set(key, promise);
  try { return await promise; } catch (e) { programCache.delete(key); throw e; }
}

async function backtestHistorical(row, progress) {
  const key = backtestKey(row);
  const cached = await dbGet(STORE_BACKTESTS, key);
  if (cached?.ok && cached?.engine === ENGINE) return { ...cached, cacheHit:true };
  if (!row?.date || !row?.city || !Number(row?.raceNo)) return { ok:false, error:'Geçmiş yarışın koşu numarası çözümlenmemiş.', row };
  if (typeof prepareRaceModelsV11 !== 'function' || typeof rankRaceForModelV11 !== 'function') return { ok:false, error:'5 Model motoru hazır değil.', row };

  const program = await fetchProgram(row.date, row.city);
  const race = program.races.find(r => raceNo(r) === Number(row.raceNo));
  if (!race) return { ok:false, error:`${row.date} ${row.city} ${row.raceNo}.K programda bulunamadı.`, row };

  const s = stateRef();
  if (!s) return { ok:false, error:'Uygulama state bulunamadı.', row };
  const snapshot = { date:s.date, city:s.city, cities:s.cities, races:s.races, selectedRace:s.selectedRace, analyses:s.analyses };
  let oldGetCityName = null;
  let cityWrapped = false;
  try {
    try {
      if (typeof getCityName === 'function') {
        oldGetCityName = getCityName;
        getCityName = () => row.city;
        cityWrapped = true;
      }
    } catch {}
    s.date = row.date;
    s.city = String(program.city.id);
    s.cities = program.cities;
    s.races = program.races;
    s.selectedRace = String(row.raceNo);
    s.analyses = { ...(snapshot.analyses || {}), career:{} };
    try { if (typeof careerModelCacheV112 !== 'undefined' && careerModelCacheV112?.clear) careerModelCacheV112.clear(); } catch {}

    progress?.(`5 Model sıralaması donduruluyor…`);
    const modelData = await prepareRaceModelsV11(race);
    if (!modelData?.roadmapOk) return { ok:false, error:modelData?.roadmapError || 'Tarihsel 5 Model roadmap üretilemedi.', row };

    const rankings = {};
    for (const id of MODEL_IDS) {
      rankings[id] = (rankRaceForModelV11(modelData, id) || []).filter(x => finite(x?.score) !== null);
    }

    progress?.(`Gerçek kazanan doğrulanıyor…`);
    let hres=null, history=null, historyError=null;
    for (let attempt=1; attempt<=3; attempt++) {
      try {
        progress?.(`Gerçek kazanan doğrulanıyor… (${attempt}/3)`);
        hres = await fetch(`/api/tjk-history?date=${encodeURIComponent(row.date)}&city=${encodeURIComponent(row.city)}&raceNo=${encodeURIComponent(row.raceNo)}&retry=${attempt}`, { cache:'no-store' });
        history = await hres.json();
        if (hres.ok && history?.ok !== false) { historyError=null; break; }
        historyError = new Error(history?.error || `Tarihsel sonuç ${hres.status}`);
      } catch (error) { historyError=error; }
      if (attempt<3) await new Promise(resolve=>setTimeout(resolve, attempt*600));
    }
    if (historyError || !hres?.ok || history?.ok === false) return { ok:false, error:`HISTORY · /api/tjk-history · ${historyError?.message || history?.error || hres?.status || 'Failed to fetch'} (3 deneme)`, row };
    const winner = historyWinner(history);
    if (!winner) return { ok:false, error:'Gerçek kazanan bulunamadı.', row };

    const ranks = {};
    const modelSizes = {};
    for (const id of MODEL_IDS) {
      const ranking = rankings[id] || [];
      modelSizes[id] = ranking.length;
      const idx = ranking.findIndex(x => sameHorse(x?.horse, winner));
      ranks[id] = idx >= 0 ? idx + 1 : null;
    }
    const result = {
      key, engine:ENGINE, version:VERSION, ok:true,
      date:row.date, city:row.city, raceNo:Number(row.raceNo), annualArchiveId:row.id || null,
      classRaw:clean(row.classRaw), groupRaw:clean(row.groupRaw), distance:Number(row.distance)||0, track:clean(row.track),
      winner, ranks, modelSizes, modelCounts:modelData?.modelCounts || {}, testedAt:new Date().toISOString()
    };
    await dbPut(STORE_BACKTESTS, result);
    return result;
  } catch (e) {
    return { ok:false, error:e?.message || String(e), row };
  } finally {
    s.date = snapshot.date; s.city = snapshot.city; s.cities = snapshot.cities; s.races = snapshot.races; s.selectedRace = snapshot.selectedRace; s.analyses = snapshot.analyses;
    if (cityWrapped) { try { getCityName = oldGetCityName; } catch {} }
  }
}

function metric(tests, modelId) {
  const ranks = (tests || []).map(t => finite(t?.ranks?.[modelId])).filter(n => Number.isInteger(n) && n >= 1);
  const coverage = ranks.length;
  const count = limit => ranks.filter(n => n <= limit).length;
  return {
    sample:(tests || []).length, coverage,
    top1:count(1), top2:count(2), top3:count(3), top5:count(5),
    top1Rate:coverage ? count(1)/coverage : 0,
    top2Rate:coverage ? count(2)/coverage : 0,
    top3Rate:coverage ? count(3)/coverage : 0,
    top5Rate:coverage ? count(5)/coverage : 0,
    averageRank:coverage ? Math.round((ranks.reduce((a,b)=>a+b,0)/coverage)*100)/100 : null
  };
}
function summarize(tests) {
  const out = {};
  for (const id of MODEL_IDS) out[id] = metric(tests, id);
  return out;
}

async function resolveRows(ids, preserveSelection=true) {
  const api = window.ATAnnualArchiveV13;
  if (!api || typeof api.getRow !== 'function') return [];
  const set = api.selectionSet;
  const before = set && typeof set.values === 'function' ? [...set] : [];
  try {
    if (set && typeof set.clear === 'function') {
      set.clear();
      ids.forEach(id => set.add(id));
    }
    if (typeof api.resolveSelected === 'function') await api.resolveSelected();
    return (await Promise.all(ids.map(id => api.getRow(id)))).filter(Boolean);
  } finally {
    if (preserveSelection && set && typeof set.clear === 'function') {
      set.clear(); before.forEach(id => set.add(id));
    }
  }
}

async function calibrateTarget(ctx, rows, mode, status) {
  const unique = [...new Map((rows || []).filter(Boolean).map(r => [r.id || `${r.date}|${fold(r.city)}|${r.raceNo}`, r])).values()];
  const tests = [], errors = [];
  let cacheHits = 0;
  for (let i=0; i<unique.length; i++) {
    const row = unique[i];
    status?.(`${ctx.raceNo}.K · ${i+1}/${unique.length} · ${row.date} ${row.city} ${row.raceNo || '?'}.K`);
    const test = await backtestHistorical(row, text => status?.(`${ctx.raceNo}.K · ${i+1}/${unique.length} · ${text}`));
    if (test?.ok) { tests.push(test); if (test.cacheHit) cacheHits++; }
    else errors.push({ id:row.id || null, date:row.date, city:row.city, raceNo:row.raceNo || null, error:test?.error || 'Hata' });
    await frame();
  }
  const entry = {
    key:targetKey(ctx), version:VERSION, engine:ENGINE, mode,
    target:{...ctx}, selectedHistoricalIds:unique.map(r => r.id).filter(Boolean),
    historicalCount:unique.length, validCount:tests.length, errorCount:errors.length, cacheHits,
    stats:summarize(tests), errors:errors.slice(0,30), updatedAt:new Date().toISOString()
  };
  await dbPut(STORE_ENTRIES, entry);
  return entry;
}

function pct(n) { return `${Math.round((Number(n)||0)*100)}%`; }
function metricCell(m, key, rateKey) {
  return m?.coverage ? `${m[key]}/${m.coverage} · ${pct(m[rateKey])}` : '—';
}
function statsTable(stats) {
  return `<div class="xcal-scroll"><table class="xcal-table"><thead><tr><th>Model</th><th>Top1</th><th>Top2</th><th>Top3</th><th>Top5</th><th>Ort. sıra</th><th>Kapsama</th></tr></thead><tbody>${MODEL_IDS.map(id => {
    const m = stats?.[id] || {};
    return `<tr><td><b>${esc(MODEL_LABELS[id])}</b></td><td>${metricCell(m,'top1','top1Rate')}</td><td>${metricCell(m,'top2','top2Rate')}</td><td>${metricCell(m,'top3','top3Rate')}</td><td>${metricCell(m,'top5','top5Rate')}</td><td>${m.averageRank ?? '—'}</td><td>${m.coverage ?? 0}/${m.sample ?? 0}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function entryHtml(entry, compact=false) {
  if (!entry) return '<div class="xcal-note">Henüz kalibrasyon kaydı yok.</div>';
  const t = entry.target || {};
  return `<div class="xcal-card xcal-entry"><div class="xcal-head"><div><b>${esc(t.city || '-')} · ${esc(t.raceNo || '?')}.K · ${esc(t.date || '')}</b><small>${esc(profileText(t) || 'Koşu profili')}</small></div><span>${entry.mode === 'MANUAL_SELECTED' ? 'MANUEL' : 'OTOMATİK'}</span></div><div class="xcal-chips"><i>${entry.validCount ?? 0}/${entry.historicalCount ?? 0} yarış</i><i>${entry.cacheHits ?? 0} cache</i>${entry.errorCount ? `<i class="warn">${entry.errorCount} hata</i>`:''}</div>${compact ? '' : statsTable(entry.stats)}</div>`;
}

async function refreshArchive(hostId='xcalArchiveList') {
  const host = $(hostId); if (!host) return;
  const rows = (await dbAll(STORE_ENTRIES)).sort((a,b) => String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  host.innerHTML = rows.length ? rows.slice(0,30).map(e => entryHtml(e, true)).join('') : '<div class="xcal-note">Kalibrasyon arşivi henüz boş.</div>';
}
async function refreshCurrentResult(ctx) {
  const host = $('xcalCurrentResult'); if (!host) return;
  const entry = await dbGet(STORE_ENTRIES, targetKey(ctx));
  host.innerHTML = entry ? entryHtml(entry, false) : '<div class="xcal-note">Bu koşu için kayıtlı Tam Eşleşme kalibrasyonu yok.</div>';
}
function selectedRaceFromUi() {
  const no = Number($('xcalRace')?.value || 0);
  return currentRaces().find(r => raceNo(r) === no) || null;
}
function persistSelected(no) {
  const s = stateRef(); if (!s || !no) return;
  s.selectedRace = String(no);
  try { if (typeof save === 'function') save(); } catch {}
}
function statusText(text, kind='') {
  const el = $('xcalStatus'); if (!el) return;
  el.textContent = text; el.dataset.kind = kind;
}
function setBusy(value) {
  busy = Boolean(value);
  ['xcalOpenAnnual','xcalRunSelected','xcalRunAll'].forEach(id => { const b=$(id); if (b) b.disabled=busy; });
}

function injectStyle() {
  if ($('xcalStyleF594')) return;
  const s = document.createElement('style'); s.id='xcalStyleF594';
  s.textContent = `
  .xcal-wrap{display:grid;gap:12px;padding:2px 0 26px;min-width:0}.xcal-card{border:1px solid rgba(114,213,255,.18);background:rgba(8,24,39,.72);border-radius:15px;padding:13px;min-width:0}.xcal-card h3{margin:0 0 7px;font-size:15px}.xcal-card p{margin:5px 0;color:#b7c9da;line-height:1.45;font-size:12px}.xcal-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.xcal-head b{display:block}.xcal-head small{display:block;margin-top:4px;color:#9fb2c5;line-height:1.35}.xcal-head>span{font-size:10px;font-weight:900;border:1px solid rgba(114,213,255,.22);border-radius:999px;padding:5px 7px;white-space:nowrap}.xcal-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:9px;margin-top:10px}.xcal-grid select,.xcal-grid button{width:100%;min-height:44px;box-sizing:border-box}.xcal-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.xcal-chips i{font-style:normal;font-size:10px;border:1px solid rgba(114,213,255,.18);border-radius:999px;padding:5px 7px;color:#cfe6f8}.xcal-chips i.warn{color:#ffbd82}.xcal-note{font-size:11px;color:#aebfd0;line-height:1.45;padding:8px 2px}.xcal-status{border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px;font-size:11px;line-height:1.4;color:#c5d8e9}.xcal-status[data-kind="ok"]{border-color:rgba(126,226,168,.25);color:#a9efc7}.xcal-status[data-kind="error"]{border-color:rgba(255,150,130,.25);color:#ffb2a2}.xcal-scroll{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:10px}.xcal-table{width:max-content;min-width:730px;border-collapse:collapse;font-size:10px}.xcal-table th,.xcal-table td{padding:7px 6px;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap;text-align:center}.xcal-table th:first-child,.xcal-table td:first-child{text-align:left}.xcal-entry{margin-top:9px}.xcal-archive{display:grid;gap:7px}.xcal-archive .xcal-entry{margin-top:0}.xcal-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}.xcal-secondary{background:rgba(255,255,255,.055)!important;border:1px solid rgba(255,255,255,.12)!important}.xcal-sep{height:1px;background:rgba(255,255,255,.07);margin:11px 0}.xcal-hint{font-size:10px;color:#8fa4b8;line-height:1.45}.xcal-badge{font-size:10px;font-weight:900;color:#7ee2a8}.xcal-card button:disabled{opacity:.5;pointer-events:none}
  @media(max-width:560px){.xcal-card{padding:11px}.xcal-table{font-size:9px;min-width:680px}}
  `;
  document.head.appendChild(s);
}

async function openAnnualForSelected() {
  const race = selectedRaceFromUi();
  if (!race) { statusText('Önce bir koşu seçin.','error'); return; }
  const no = raceNo(race); persistSelected(no);
  const api = window.ATAnnualArchiveV13;
  if (!api?.open) { statusText('TJK Yıllık Arşiv modülü hazır değil.','error'); return; }
  try {
    api.open();
    await frame();
    $('aaFillCurrent')?.click();
    await frame();
    document.querySelector(`#aaCurrentRaceChoices [data-aa-race="${no}"]`)?.click();
    await frame();
    if (typeof api.search === 'function') await api.search();
    statusText(`${no}. koşu Yıllık Arşive aktarıldı. Tam eşleşmelerden kullanacaklarını işaretle; arşivi kapatıp bu ekrandaki “Seçilen Tam Eşleşmeleri Kalibre Et” düğmesine bas.`,'ok');
  } catch (e) {
    statusText(`Yıllık Arşiv açılamadı: ${e?.message || e}`,'error');
  }
}

async function runSelected() {
  if (busy) return;
  const race = selectedRaceFromUi();
  if (!race) return statusText('Önce bir koşu seçin.','error');
  const api = window.ATAnnualArchiveV13;
  const ids = api?.getSelectedIds?.() || [];
  if (!ids.length) return statusText('Yıllık Arşivde kalibre edilecek geçmiş yarışları önce işaretleyin.','error');
  setBusy(true);
  try {
    statusText(`${ids.length} seçili yarışın koşu numaraları doğrulanıyor…`);
    const rows = await resolveRows(ids, false);
    const resolved = rows.filter(r => Number(r?.raceNo) > 0);
    if (!resolved.length) throw new Error('Seçili yarışların koşu numarası çözümlenemedi.');
    const ctx = targetContext(race);
    const entry = await calibrateTarget(ctx, resolved, 'MANUAL_SELECTED', text => statusText(text));
    statusText(`${ctx.raceNo}.K kalibrasyonu tamamlandı: ${entry.validCount}/${entry.historicalCount} geçmiş yarış geçerli.`,'ok');
    await refreshCurrentResult(ctx); await refreshArchive();
  } catch (e) { statusText(`Kalibrasyon hatası: ${e?.message || e}`,'error'); }
  finally { setBusy(false); }
}

async function runAll() {
  if (busy) return;
  const races = currentRaces();
  if (!races.length) return statusText('Önce ana ekrandan günün programını yükleyin.','error');
  setBusy(true);
  try {
    statusText('Yerel TJK Yıllık Arşivi okunuyor…');
    const local = await annualRowsLocal();
    if (!local.length) throw new Error('Yerel yıllık arşiv boş. Önce TJK Yıllık Yarış Arşivinde gerekli yılları güncelleyin.');
    const api = window.ATAnnualArchiveV13;
    const original = api?.selectionSet && typeof api.selectionSet.values === 'function' ? [...api.selectionSet] : [];
    let done = 0, noMatch = 0;
    try {
      for (let i=0; i<races.length; i++) {
        const race = races[i], ctx = targetContext(race);
        let exact = exactRowsForTarget(local, ctx);
        if (!exact.length) { noMatch++; statusText(`${ctx.raceNo}.K · Tam eşleşme yok (${i+1}/${races.length})`); await frame(); continue; }
        const ids = exact.map(r => r.id).filter(Boolean);
        if (ids.length && api) exact = await resolveRows(ids, false);
        exact = exact.filter(r => Number(r?.raceNo) > 0);
        if (!exact.length) { noMatch++; statusText(`${ctx.raceNo}.K · Eşleşmelerin koşu no çözümü yok (${i+1}/${races.length})`); await frame(); continue; }
        await calibrateTarget(ctx, exact, 'AUTO_EXACT', text => statusText(`Günün ${i+1}/${races.length} koşusu · ${text}`));
        done++;
        await frame();
      }
    } finally {
      if (api?.selectionSet?.clear) { api.selectionSet.clear(); original.forEach(id => api.selectionSet.add(id)); }
    }
    statusText(`Gün kalibrasyonu tamamlandı: ${done} koşu kaydedildi${noMatch ? ` · ${noMatch} koşuda yerel Tam eşleşme yok` : ''}.`,'ok');
    const race = selectedRaceFromUi(); if (race) await refreshCurrentResult(targetContext(race));
    await refreshArchive();
  } catch (e) { statusText(`Gün kalibrasyonu hatası: ${e?.message || e}`,'error'); }
  finally { setBusy(false); }
}

function renderHome() {
  injectStyle();
  const content = $('analysisContent'); if (!content) return;
  const races = currentRaces();
  const s = stateRef();
  const preferred = Number(s?.selectedRace || 0);
  const initial = races.some(r => raceNo(r) === preferred) ? preferred : (raceNo(races[0]) || 0);
  if ($('dialogEyebrow')) $('dialogEyebrow').textContent = 'TAM EŞLEŞME BACKTEST';
  if ($('dialogTitle')) $('dialogTitle').textContent = 'Model Kalibrasyonu';
  content.classList.remove('empty');
  content.innerHTML = `<div class="xcal-wrap">
    <section class="xcal-card"><div class="xcal-head"><div><b>TAM EŞLEŞME 5 MODEL KALİBRASYONU</b><small>Yıllık Arşivdeki geçmiş yarışların gerçek kazananı, o yarıştan önceki verilerle üretilen 5 Model sırasına karşı ölçülür.</small></div><span>F59.4</span></div><div class="xcal-chips"><i>${esc(currentDate() || 'Tarih yok')}</i><i>${esc(cityName() || 'Şehir yok')}</i><i>${races.length} koşu</i><i>Top1 · Top2 · Top3 · Top5</i></div></section>
    <section class="xcal-card"><h3>Seçili Koşu</h3><p>Koşuyu seç; Yıllık Arşiv mevcut İl / Grup / Koşu Cinsi / Mesafe / Pist filtreleriyle açılır. İstersen filtreleri değiştir, kalibrasyona girecek geçmiş yarışları kendin işaretle.</p>${races.length ? `<div class="xcal-grid"><select id="xcalRace">${races.map(r => { const m=raceMeta(r), n=raceNo(r); return `<option value="${n}" ${n===initial?'selected':''}>${n}. Koşu · ${esc(m.classRaw)} · ${esc(m.ageGroup)} · ${esc(m.distance ? m.distance+' '+m.track : m.track)}</option>`; }).join('')}</select><button class="primary" id="xcalOpenAnnual">Yıllık Arşivde Tam Eşleşmeleri Aç</button><button class="xcal-secondary" id="xcalRunSelected">Seçilen Tam Eşleşmeleri Kalibre Et</button></div>` : '<div class="xcal-note">Önce ana ekrandan günün programını yükleyin.</div>'}<div id="xcalCurrentResult"></div></section>
    <section class="xcal-card"><h3>Günün Tüm Koşularını Kalibre Et</h3><p>Sistem yerel Yıllık Arşivde her koşunun <b>Tam Eşleşmelerini</b> kendi bulur ve koşuları sırayla işler. Aynı geçmiş yarış daha önce test edilmişse ağır hesap yeniden yapılmaz.</p><button class="primary" id="xcalRunAll" ${races.length?'':'disabled'}>Günün Tüm Koşularını Kalibre Et</button><div class="xcal-hint">Otomatik Tam Eşleşme: aynı şehir + aynı sınıf/ek şart + aynı grup + aynı mesafe + aynı pist. Yalnız hedef tarihten önceki yarışlar kullanılır.</div></section>
    <div id="xcalStatus" class="xcal-status">Hazır. Kupon motoru bu aşamada değiştirilmez; önce kalibrasyon verisini üretip arşivliyoruz.</div>
    <section class="xcal-card"><div class="xcal-head"><div><b>Kalibrasyon Arşivi</b><small>Koşu bazında son kayıt. Manuel seçim aynı koşunun otomatik kaydının üzerine bilinçli olarak geçer.</small></div><span class="xcal-badge">IndexedDB</span></div><div id="xcalArchiveList" class="xcal-archive"><div class="xcal-note">Arşiv okunuyor…</div></div></section>
  </div>`;
  $('xcalOpenAnnual')?.addEventListener('click', openAnnualForSelected);
  $('xcalRunSelected')?.addEventListener('click', runSelected);
  $('xcalRunAll')?.addEventListener('click', runAll);
  $('xcalRace')?.addEventListener('change', async () => {
    const race = selectedRaceFromUi(); if (!race) return;
    persistSelected(raceNo(race));
    // F60.18.2: geçmiş yarış seçimi hedef koşuya aittir; önceki koşudan taşınamaz.
    const annual = window.ATAnnualArchiveV13;
    if (annual?.selectionSet?.clear) annual.selectionSet.clear();
    try { window.dispatchEvent(new CustomEvent('at-ai:annual-archive-selection',{detail:{selected:0,targetRaceNo:raceNo(race)}})); } catch {}
    statusText(`${raceNo(race)}. koşu seçildi. Bu koşuya benzeyen geçmiş yarışları Yıllık Arşivden yeniden seçin.`);
    await refreshCurrentResult(targetContext(race));
  });
  const race = selectedRaceFromUi(); if (race) refreshCurrentResult(targetContext(race));
  refreshArchive();
}

try { renderCalibrationHomeV116 = renderHome; } catch (e) { console.warn('[AT AI]', VERSION, 'render hook kurulamadı', e); }
window.ATExactMatchCalibrationV1691F594 = {
  version:VERSION, engine:ENGINE,
  getForRace:async (date, city, no) => dbGet(STORE_ENTRIES, [date,fold(city),Number(no)||0].join('|')),
  list:async () => (await dbAll(STORE_ENTRIES)).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))),
  models:[...MODEL_IDS],
  render:renderHome
};

window.addEventListener('at-ai:annual-archive-selection', event => {
  const count = Number(event?.detail?.selected ?? window.ATAnnualArchiveV13?.getSelectedIds?.().length ?? 0);
  const status = $('xcalStatus');
  if (status && count >= 0 && !busy) status.textContent = count ? `Yıllık Arşivde ${count} geçmiş yarış seçili. Arşivi kapatıp “Seçilen Tam Eşleşmeleri Kalibre Et” düğmesine bas.` : 'Yıllık Arşiv seçimi boş.';
});

console.info('[AT AI]', VERSION, 'aktif — Menü 4 Tam Eşleşme 5 Model backtest + kalibrasyon arşivi; kupon mantığı değişmedi; yeni timeout yok.');
})();