/* AT AI Mobil — Annual Archive Five-Model Career V14.1
   Selected annual races + full-career five-model scoring.
   HARD RULE: each historical race contributes only finishers 1-2-3; today's horse
   is compared with all three pre-race career paths separately and only the best
   reference of each source year survives.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_CAREER_FIVE_MODEL_V14__) return;
window.__AT_ANNUAL_CAREER_FIVE_MODEL_V14__ = true;

const VERSION = 'TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.2-TIMEOUT-GUARD';
const ARCHIVE_DB = 'at_ai_tjk_annual_archive_v13';
const ARCHIVE_STORE = 'races';
const CAREER_DB = 'at_ai_tjk_annual_career_v138';
const CAREER_STORE = 'careers';
const STORAGE_KEY = 'at_ai_mobil_state_v2';
let archiveDbPromise = null, careerDbPromise = null, busy = false, sharedRunPromiseF6023 = null;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
const keyText = v => upper(v).replace(/[^A-Z0-9]+/g, '').trim();
const finite = v => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const finishNo = (ref, index = 0) => { const n = Number(ref?.finish ?? ref?.rank ?? ref?.sira); return Number.isFinite(n) && n > 0 ? n : index + 1; };

function withTimeout(promise, ms, label = 'İstek') {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} ${Math.round(ms / 1000)} saniyede tamamlanmadı.`)), ms);
    })
  ]).finally(() => { if (timer) clearTimeout(timer); });
}
async function fetchJsonTimed(url, ms, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { cache:'no-store', signal:controller.signal });
    let d = null;
    try { d = await r.json(); } catch {}
    if (!r.ok || d?.ok === false) throw new Error(d?.error || `${label} ${r.status}`);
    return d;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error(`${label} ${Math.round(ms / 1000)} saniyede tamamlanmadı.`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
function readState() {
  try { if (typeof state !== 'undefined' && state && typeof state === 'object') return state; } catch {}
  try { const x = localStorage.getItem(STORAGE_KEY); return x ? JSON.parse(x) : null; } catch { return null; }
}
function selectionSet() { const s = window.__AT_AA_SELECTED_IDS_V134__; return s && typeof s.values === 'function' ? s : null; }
function openArchiveDb() {
  if (archiveDbPromise) return archiveDbPromise;
  archiveDbPromise = new Promise(resolve => { try { const q = indexedDB.open(ARCHIVE_DB); q.onsuccess = () => resolve(q.result); q.onerror = () => resolve(null); } catch { resolve(null); } });
  return archiveDbPromise;
}
function openCareerDb() {
  if (careerDbPromise) return careerDbPromise;
  careerDbPromise = new Promise(resolve => {
    try {
      const q = indexedDB.open(CAREER_DB, 1);
      q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(CAREER_STORE)) q.result.createObjectStore(CAREER_STORE, { keyPath: 'key' }); };
      q.onsuccess = () => resolve(q.result); q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return careerDbPromise;
}
async function dbGet(dbFn, store, key) {
  const db = await dbFn(); if (!db) return null;
  return new Promise(resolve => { try { const q = db.transaction(store, 'readonly').objectStore(store).get(key); q.onsuccess = () => resolve(q.result?.value ?? null); q.onerror = () => resolve(null); } catch { resolve(null); } });
}
async function dbGetAll(dbFn, store) {
  const db = await dbFn(); if (!db || !db.objectStoreNames.contains(store)) return [];
  return new Promise(resolve => { try { const q = db.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => resolve((q.result || []).map(x => x?.value).filter(Boolean)); q.onerror = () => resolve([]); } catch { resolve([]); } });
}
async function dbPut(dbFn, store, key, value) {
  const db = await dbFn(); if (!db) return false;
  return new Promise(resolve => { try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put({ key, value, updatedAt: Date.now() }); tx.oncomplete = () => resolve(true); tx.onerror = tx.onabort = () => resolve(false); } catch { resolve(false); } });
}
async function selectedRows() {
  const s = selectionSet(); if (!s?.size) return [];
  const rows = await Promise.all([...s].map(id => dbGet(openArchiveDb, ARCHIVE_STORE, id)));
  return rows.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date) || Number(a.raceNo || 0) - Number(b.raceNo || 0));
}
function currentContext() {
  const s = readState(), races = Array.isArray(s?.races) ? s.races : [], selected = String(s?.selectedRace ?? '');
  const race = races.find(r => String(r?.no ?? r?.raceNo) === selected) || (races.length === 1 ? races[0] : null);
  if (!race) return null;
  const cityId = clean(s?.city);
  const city = clean((Array.isArray(s?.cities) ? s.cities : []).find(c => clean(c?.id) === cityId)?.name) || clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent) || cityId;
  let meta = null; try { if (typeof programRaceMeta === 'function') meta = programRaceMeta(race); } catch {}
  meta = meta || { ok: true, class: race.class || race.yaradi1 || '', ageGroup: race.ageGroup || race.yaradi2 || '', distance: race.distance || race.mesafe || '', track: race.track || race.pist || '' };
  return { raceNo: Number(race.no || race.raceNo || 0), city, date: clean(s?.date || document.getElementById('raceDate')?.value), meta, horses: (Array.isArray(race.horses) ? race.horses : []).filter(h => h?.id) };
}
function chronological(rows) {
  return (Array.isArray(rows) ? [...rows] : []).filter(Boolean).sort((a, b) => clean(a.isoDate || a.date).localeCompare(clean(b.isoDate || b.date)));
}
function envelope(data, before) {
  const full = chronological(data?.history || data?.fullPathBefore || data?.roadmap || []);
  const wins = chronological(data?.wins || full.filter(x => Number(x?.finish ?? x?.rank ?? x?.sira) === 1));
  const top5 = chronological(data?.top5 || full.filter(x => { const f = Number(x?.finish ?? x?.rank ?? x?.sira); return f >= 1 && f <= 5; }));
  return { ...data, ok: data?.ok !== false, cutoffExclusive: before, analysisMode: full.length ? 'FULL_PATH' : 'DEBUT', roadmap: full, fullPathBefore: full, historyBefore: full, comparisonPathBefore: full, roadmapBefore: full, fullPathBeforeCount: full.length, winsBefore: wins, top5Before: top5, preparationPathBefore: top5 };
}
async function career(horseId, before) {
  const key = `${clean(horseId)}|${clean(before)}`;
  const cached = await dbGet(openCareerDb, CAREER_STORE, key);
  if (cached?.ok && Array.isArray(cached.fullPathBefore)) return cached;
  const d = await fetchJsonTimed(
    `/api/tjk-career-v10?horseId=${encodeURIComponent(horseId)}&before=${encodeURIComponent(before)}`,
    25000,
    'Kariyer API'
  );
  const value = envelope(d, before); await dbPut(openCareerDb, CAREER_STORE, key, value); return value;
}
async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [], out = new Array(list.length); let cursor = 0;
  async function run() { while (true) { const i = cursor++; if (i >= list.length) return; out[i] = await worker(list[i], i); } }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), list.length || 1) }, run)); return out;
}
function sameClass(a, b) { try { if (typeof window.canonicalClassKeyV125 === 'function') return window.canonicalClassKeyV125(a) === window.canonicalClassKeyV125(b); } catch {} return keyText(a) === keyText(b); }
function sameAge(a, b) { return keyText(a) === keyText(b); }
function sameTrack(a, b) { const A = upper(a), B = upper(b); for (const t of ['CIM','KUM','SENTETIK']) if (A.includes(t) && B.includes(t)) return true; return keyText(a) === keyText(b); }
function conditionScore(ctx, row) {
  try {
    const m = ctx.meta || {};
    const c = typeof classSimilarity === 'function' ? classSimilarity(m.class, row.classRaw) : (sameClass(m.class, row.classRaw) ? 1 : .4);
    const a = typeof ageGroupSimilarity === 'function' ? ageGroupSimilarity(m.ageGroup, row.groupRaw) : (sameAge(m.ageGroup, row.groupRaw) ? 1 : .4);
    const d = typeof distanceSimilarity === 'function' ? distanceSimilarity(m.distance, row.distance) : Math.max(0, 1 - Math.abs(Number(m.distance) - Number(row.distance)) / 800);
    const t = typeof trackSimilarity === 'function' ? trackSimilarity(m.track, row.track) : (sameTrack(m.track, row.track) ? 1 : .12);
    const ci = typeof citySimilarity === 'function' ? citySimilarity(ctx.city, row.city) : (keyText(ctx.city) === keyText(row.city) ? 1 : .5);
    return Math.round(Math.max(0, Math.min(1, c * .30 + a * .25 + d * .18 + t * .17 + ci * .10)) * 100);
  } catch { return 50; }
}
function channel(ctx, row) {
  const m = ctx.meta || {};
  if (sameClass(m.class, row.classRaw) && sameAge(m.ageGroup, row.groupRaw) && Number(m.distance) === Number(row.distance) && sameTrack(m.track, row.track) && keyText(ctx.city) === keyText(row.city)) return 'EXACT';
  if (sameClass(m.class, row.classRaw) && sameAge(m.ageGroup, row.groupRaw)) return 'CONDITION_TWIN';
  return 'RACE_FAMILY';
}
async function resolveAnnualRaceNoF6022(row, all) {
  try {
    const r = await fetch(`/api/tjk-race-meta?date=${encodeURIComponent(row.date)}&cityId=${encodeURIComponent(row.cityId || '')}&cityName=${encodeURIComponent(row.city || '')}`, { cache:'no-store' });
    const day = await r.json();
    if (r.ok && day?.ok !== false) {
      const candidates = (Array.isArray(day?.races) ? day.races : []).filter(race =>
        sameClass(race?.class || race?.yaradi1, row.classRaw) &&
        sameAge(race?.ageGroup || race?.yaradi2, row.groupRaw) &&
        Number(race?.distance || race?.mesafe || 0) === Number(row.distance) &&
        sameTrack(race?.track || race?.pist, row.track)
      ).map(race => Number(race?.no || race?.raceNo)).filter(Boolean).sort((a,b)=>a-b);
      if (candidates.length) {
        const occurrence = Math.max(1, Number(row.occurrenceIndex || 1));
        return candidates[Math.min(occurrence - 1, candidates.length - 1)];
      }
    }
  } catch {}
  const sameDay = all.filter(x => x?.date === row.date && keyText(x?.city) === keyText(row.city))
    .sort((a,b) => Number(a?.page || 0) - Number(b?.page || 0) || Number(a?.rowIndex || 0) - Number(b?.rowIndex || 0));
  const idx = sameDay.findIndex(x => x?.id === row.id);
  return idx >= 0 ? idx + 1 : 0;
}
async function automaticExactRows(ctx) {
  const all = await dbGetAll(openArchiveDb, ARCHIVE_STORE);
  const exact = all.filter(row => row?.date < ctx.date && channel(ctx, row) === 'EXACT');
  await mapLimit(exact.filter(row => !(Number(row.raceNo) > 0)), 3, async row => {
    const raceNo = await resolveAnnualRaceNoF6022(row, all);
    if (!raceNo) return;
    row.raceNo = raceNo;
    row.permanentKey = `${row.date}|${row.cityId}|${row.raceNo}`;
    row.resolutionMethod = 'EXACT_DAILY_PROGRAM_AUTO_F6022';
    await dbPut(openArchiveDb, ARCHIVE_STORE, row.id, row);
  });
  return exact.filter(row => Number(row.raceNo) > 0)
    .sort((a,b) => a.date.localeCompare(b.date) || Number(a.raceNo) - Number(b.raceNo));
}
async function historicalRace(ctx, row) {
  const h = await fetchJsonTimed(
    `/api/tjk-history?date=${encodeURIComponent(row.date)}&city=${encodeURIComponent(row.city)}&raceNo=${encodeURIComponent(row.raceNo)}`,
    25000,
    `Tarihsel sonuç ${row.date} ${row.city} ${row.raceNo}.K`
  );
  const sourceTop3 = (Array.isArray(h?.top3) ? h.top3 : [])
    .map((ref, index) => ({ ...ref, finish: finishNo(ref, index) }))
    .filter(ref => Number(ref.finish) >= 1 && Number(ref.finish) <= 3)
    .sort((a, b) => Number(a.finish) - Number(b.finish))
    .slice(0, 3);
  const top3 = await mapLimit(sourceTop3, 3, async ref => {
    if (!ref?.horseId) return { ...ref, career: { ok: false, fullPathBefore: [] } };
    try { return { ...ref, career: await career(ref.horseId, row.date) }; } catch (e) { return { ...ref, career: { ok: false, fullPathBefore: [], error: e?.message || String(e) } }; }
  });
  const score = conditionScore(ctx, row), type = channel(ctx, row);
  return { ...h, ok: true, date: row.date, city: row.city, raceNo: row.raceNo, sourceYear: Number(row.year || row.date.slice(0, 4)), referenceType: type, raceConditionSimilarity: score, transferabilityScore: score, top3, top3Count: top3.length, annualArchiveId: row.id, annualReferenceRule: 'TOP3_ONLY' };
}
const ANNUAL_PARTIAL_SUPPORT_VERSION = 'ANNUAL-PARTIAL-SUPPORT-V16.9.1F19';
const ANNUAL_LEGACY_YEARBEST_TOKEN_V1691F19 = 'ANNUAL_TOP3_YEAR_BEST_V14_1';
function annualPartialScoreV1691F19(pathScore, condition, path, referencePath) {
  const cleanPathScore = Math.max(0, Math.min(100, Number(pathScore) || 0));
  const cleanCondition = Math.max(0, Math.min(100, Number(condition) || 0));
  const baseScore = Math.round(cleanPathScore * cleanCondition / 100);
  let support = null;
  try {
    if (typeof window.careerPartialSupportV1691F18 === 'function') {
      support = window.careerPartialSupportV1691F18(path, referencePath, cleanCondition);
    }
  } catch {}
  const partialSupportScore = Math.max(0, Math.min(100, Number(support?.score) || 0));
  return {
    score: Math.max(baseScore, partialSupportScore),
    baseScore,
    partialSupportScore,
    partialSupportUsed: partialSupportScore > baseScore,
    partialSupport: support || { score: 0, pairCount: 0, topPairAvg: 0, coveragePct: 0, gaps: 0 }
  };
}
function annualBetterReferenceV1691F19(item, prev) {
  if (!prev) return true;
  if (item.score !== prev.score) return item.score > prev.score;
  if (Number(item.baseScore || 0) !== Number(prev.baseScore || 0)) return Number(item.baseScore || 0) > Number(prev.baseScore || 0);
  if (Number(item.partialSupportScore || 0) !== Number(prev.partialSupportScore || 0)) return Number(item.partialSupportScore || 0) > Number(prev.partialSupportScore || 0);
  if (Number(item.pathScore || 0) !== Number(prev.pathScore || 0)) return Number(item.pathScore || 0) > Number(prev.pathScore || 0);
  return Number(item.historicalFinish || 99) < Number(prev.historicalFinish || 99);
}
function annualSortReferencesV1691F19(a, b) {
  return Number(b.score || 0) - Number(a.score || 0) ||
    Number(b.baseScore || 0) - Number(a.baseScore || 0) ||
    Number(b.partialSupportScore || 0) - Number(a.partialSupportScore || 0) ||
    Number(b.pathScore || 0) - Number(a.pathScore || 0) ||
    Number(a.historicalFinish || 99) - Number(b.historicalFinish || 99) ||
    Number(b.year || 0) - Number(a.year || 0);
}

function annualTop3YearBestScore(currentCareer, races, useCondition) {
  const path = currentCareer?.fullPathBefore || currentCareer?.roadmap || [];
  const byYear = new Map();
  let referencesEvaluated = 0;
  for (const race of Array.isArray(races) ? races : []) {
    if (race?.ok === false) continue;
    const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4)) || null;
    if (!year) continue;
    const refs = (Array.isArray(race?.top3) ? race.top3 : [])
      .filter(ref => { const f = Number(ref?.finish ?? ref?.rank ?? ref?.sira); return Number.isFinite(f) ? f >= 1 && f <= 3 : true; })
      .slice(0, 3);
    for (const ref of refs) {
      const rp = ref?.career?.fullPathBefore || ref?.career?.roadmap || [];
      if (!path.length || !rp.length) continue;
      referencesEvaluated++;
      const raw = typeof orderedPathSimilarity === 'function' ? orderedPathSimilarity(path, rp) : 0;
      const pathScore = Math.round(Math.max(0, Math.min(1, Number(raw) || 0)) * 100);
      const condition = useCondition ? Math.max(0, Math.min(100, Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 0)) : 100;
      const scored = annualPartialScoreV1691F19(pathScore, condition, path, rp);
      const item = {
        year, score: scored.score, baseScore: scored.baseScore, pathScore, conditionScore: condition,
        partialSupportScore: scored.partialSupportScore,
        partialSupportUsed: scored.partialSupportUsed,
        partialSupport: scored.partialSupport,
        partialSupportVersion: ANNUAL_PARTIAL_SUPPORT_VERSION,
        historicalHorse: ref?.horseName || '', historicalHorseId: ref?.horseId || '',
        historicalFinish: Number(ref?.finish ?? ref?.rank ?? ref?.sira) || null,
        raceDate: race?.date || '', raceCity: race?.city || '', raceNo: race?.raceNo || '',
        referenceType: race?.referenceType || '', currentPathCount: path.length,
        referencePathCount: rp.length, sourceRule: 'ANNUAL_TOP3_YEAR_BEST_WITH_PARTIAL_V19'
      };
      const prev = byYear.get(year);
      if (annualBetterReferenceV1691F19(item, prev)) {
        byYear.set(year, item);
      }
    }
  }
  const rows = [...byYear.values()].sort((a, b) => b.year - a.year);
  const strongest = rows.length ? [...rows].sort(annualSortReferencesV1691F19)[0] : null;
  return {
    score: strongest?.score ?? null, strongest, rows,
    baseScore: strongest?.baseScore ?? null,
    partialSupportScore: strongest?.partialSupportScore ?? 0,
    partialSupportUsed: !!strongest?.partialSupportUsed,
    partialSupport: strongest?.partialSupport ?? null,
    partialSupportVersion: ANNUAL_PARTIAL_SUPPORT_VERSION,
    coverageYears: rows.length,
    strongYears: rows.filter(x => x.score >= 85).length,
    supportYears: rows.filter(x => x.score >= 70).length,
    latestScore: rows[0]?.score ?? null,
    referencesEvaluated,
    yearAggregation: 'BEST_REFERENCE_PER_YEAR',
    referenceRule: 'EACH_HISTORICAL_RACE_TOP3_PRE_RACE_CAREER'
  };
}
function scoreRows(careerData, races, useCondition) { return annualTop3YearBestScore(careerData, races, useCondition); }
function composite(ch) {
  try { if (typeof compositeScoreV11 === 'function') return compositeScoreV11(ch); } catch {}
  const w = { exact: .4, twin: .25, family: .2, career: .15 }; let sum = 0, used = 0;
  for (const [k, weight] of Object.entries(w)) { const v = finite(ch[k]?.score); if (v === null) continue; sum += v * weight; used += weight; }
  return { score: used ? Math.round(sum / used) : null };
}
function modelScores(c, models) {
  const exact = scoreRows(c, models.EXACT, true), twin = scoreRows(c, models.CONDITION_TWIN, true), family = scoreRows(c, models.RACE_FAMILY, true);
  const all = [...models.EXACT, ...models.CONDITION_TWIN, ...models.RACE_FAMILY].filter((r, i, a) => a.findIndex(x => x.date === r.date && x.city === r.city && Number(x.raceNo) === Number(r.raceNo)) === i);
  const careerScore = scoreRows(c, all, false);
  return { exact, twin, family, career: careerScore, composite: composite({ exact, twin, family, career: careerScore }) };
}
function scoreVal(x, id) { return finite(x?.scores?.[id]?.score); }
function ranking(data, id) {
  return data.horses.map(x => {
    const detail = x?.scores?.[id] || {};
    return { ...x, displayScore: scoreVal(x, id), displayBaseScore: finite(detail.baseScore), displayPartialSupportScore: finite(detail.partialSupportScore), displayStrongYears: Number(detail.strongYears || 0), displaySupportYears: Number(detail.supportYears || 0) };
  }).filter(x => x.displayScore !== null).sort((a, b) => b.displayScore - a.displayScore || b.displayStrongYears - a.displayStrongYears || b.displaySupportYears - a.displaySupportYears || Number(b.displayBaseScore || 0) - Number(a.displayBaseScore || 0) || Number(b.displayPartialSupportScore || 0) - Number(a.displayPartialSupportScore || 0) || Number(a.horse.no || 999) - Number(b.horse.no || 999));
}
function modelLabel(id) { return ({ composite: 'Bileşik', exact: 'Tam', twin: 'İkiz', family: 'Aile', career: 'Kariyer' })[id] || id; }
function render(data, ctx, rows) {
  const out = document.getElementById('aaAnalysis'); if (!out) return;
  const ids = ['composite','exact','twin','family','career'];
  out.innerHTML = `<div class="aa-section"><h3>5 Model Kariyer Yol Haritası</h3><div class="aa-note"><b>${esc(ctx.raceNo)}. Koşu · ${esc(ctx.city)} · ${esc(ctx.date)}</b><br>${rows.length} seçilmiş tarihsel yarış kullanıldı.<br><b>Referans kuralı:</b> Her geçmiş yarışın 1.-2.-3. atı ayrı karşılaştırılır; her yıl için en yüksek kariyer yolu benzerliği tutulur.</div><div class="career-model-tabs-v112">${ids.map((id, i) => `<button class="career-model-tab-v112 ${i === 0 ? 'active' : ''}" data-v14-tab="${id}">${modelLabel(id)}</button>`).join('')}</div>${ids.map((id, i) => { const rank = ranking(data, id); return `<div class="career-model-panel-v112 ${i === 0 ? 'active' : ''}" data-v14-panel="${id}"><div class="career-model-panel-head-v112"><b>${modelLabel(id)}</b></div>${rank.length ? rank.map((x, n) => { const detail = x?.scores?.[id] || {}; const best = detail.strongest; const partial = detail.partialSupportUsed ? ` · parça %${esc(detail.partialSupportScore)}; tam yol %${esc(detail.baseScore)}` : ''; return `<div class="career-model-rank-v112" style="display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px"><span class="career-model-rank-no-v112">${n + 1}</span><div class="career-model-rank-horse-v112"><b>${esc(x.horse.no)}. ${esc(x.horse.name)}</b><small>${x.career?.fullPathBeforeCount || 0} kariyer yarışı${best ? ` · en iyi: ${esc(best.year)} ${esc(best.historicalHorse)} (${esc(best.historicalFinish)}.)` : ''}${partial}</small></div><div class="career-model-rank-score-v112"><strong>%${esc(x.displayScore)}</strong></div></div>`; }).join('') : '<div class="career-model-empty-v112">Bu model için karşılaştırılabilir veri yok.</div>'}</div>`; }).join('')}</div>`;
  out.querySelectorAll('[data-v14-tab]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.v14Tab;
    out.querySelectorAll('[data-v14-tab]').forEach(x => x.classList.toggle('active', x === btn));
    out.querySelectorAll('[data-v14-panel]').forEach(x => x.classList.toggle('active', x.dataset.v14Panel === id));
  }));
}
async function runInternalF6023() {
  if (busy) throw new Error('Yerel yıllık arşiv hesabı kilitli kaldı.');
  busy = true;
  const out = document.getElementById('aaAnalysis'); if (out) out.innerHTML = '<div class="aa-note">Seçilen yarışların ilk 3 atı ve yarış öncesi kariyerleri hazırlanıyor…</div>';
  try {
    const ctx = currentContext(); if (!ctx?.meta?.ok) throw new Error('Bugünkü programdan tek bir koşu seçin.');
    if (out) out.innerHTML = '<div class="aa-note">Yıllık arşivdeki tam eşleşmeler otomatik aranıyor…</div>';
    const manual = (await selectedRows()).filter(r => r.raceNo && r.date < ctx.date);
    const automatic = await automaticExactRows(ctx);
    const rowMap = new Map();
    for (const row of [...automatic, ...manual]) rowMap.set(row.id || `${row.date}|${row.city}|${row.raceNo}`, row);
    const rows = [...rowMap.values()];
    if (!rows.length) throw new Error('Yıllık arşivde koşu numarası belirlenebilen tam eşleşme bulunamadı.');
    let done = 0, failed = 0;
    const refs = (await mapLimit(rows, 2, async row => {
      const label = `${row.date} · ${row.city} · ${row.raceNo}.K`;
      if (out) out.innerHTML = `<div class="aa-note">İlk 3 referans yarışları: ${done}/${rows.length}${failed ? ` · ${failed} atlandı` : ''}<br>İşleniyor: ${esc(label)}</div>`;
      try {
        return await withTimeout(historicalRace(ctx, row), 45000, `Referans yarışı ${label}`);
      }
      catch (e) {
        failed++;
        console.warn('[AT AI]', VERSION, row.date, row.city, row.raceNo, e?.message || e);
        return null;
      }
      finally {
        done++;
        if (out) out.innerHTML = `<div class="aa-note">İlk 3 referans yarışları: ${done}/${rows.length}${failed ? ` · ${failed} atlandı` : ''}</div>`;
      }
    })).filter(Boolean);
    if (!refs.length) throw new Error('Yıllık arşiv eşleşmeleri bulundu fakat geçmiş yarış ayrıntıları alınamadı.');
    const models = { EXACT: [], CONDITION_TWIN: [], RACE_FAMILY: [] };
    for (const r of refs) models[r.referenceType]?.push(r);
    let hd = 0, horseFailed = 0;
    const horses = await mapLimit(ctx.horses, 2, async horse => {
      try {
        const c = await withTimeout(career(horse.id, ctx.date), 30000, `Bugünkü at kariyeri ${horse?.name || horse?.id || ''}`);
        return { horse, career: c, scores: modelScores(c, models) };
      }
      catch (e) {
        horseFailed++;
        return { horse, career: { ok: false, fullPathBefore: [] }, scores: { exact: { score: null }, twin: { score: null }, family: { score: null }, career: { score: null }, composite: { score: null } }, error: e?.message || String(e) };
      }
      finally {
        hd++;
        if (out) out.innerHTML = `<div class="aa-note">Bugünkü atlar: ${hd}/${ctx.horses.length}${horseFailed ? ` · ${horseFailed} atlandı` : ''}</div>`;
      }
    });
    const prepared = {
      no:Number(ctx.raceNo),
      roadmapOk:true,
      roadmapError:null,
      modelCounts:Object.fromEntries(Object.entries(models).map(([key,value])=>[key,Array.isArray(value)?value.length:0])),
      horses,
      annualArchiveSource:true,
      annualArchiveRows:rows.length,
      version:VERSION
    };
    try { window.ATFiveModelSharedCacheV1687?.storeReady?.(ctx.raceNo, prepared); } catch {}
    render({ horses }, ctx, rows);
    return prepared;
  } catch (e) {
    if (out) out.innerHTML = `<div class="aa-note" style="color:#ffbd82">${esc(e?.message || e)}</div>`;
    return null;
  } finally { busy = false; }
}
async function run() {
  if (sharedRunPromiseF6023) return sharedRunPromiseF6023;
  sharedRunPromiseF6023 = runInternalF6023();
  try { return await sharedRunPromiseF6023; }
  finally { sharedRunPromiseF6023 = null; }
}
function updateVersion() {
  const el = document.querySelector('#tjkAnnualArchiveDialog .aa-eyebrow');
  if (el) el.textContent = `AT AI SYSTEM · ${VERSION}`;
}
window.addEventListener('at-ai:annual-archive-created', updateVersion);
window.addEventListener('at-ai:annual-archive-open', updateVersion);
window.addEventListener('at-ai:annual-archive-render', updateVersion);
document.addEventListener('click', event => {
  const btn = event.target?.closest?.('#aaRunSelected');
  if (!btn || event.isTrusted) return;
  event.preventDefault(); event.stopImmediatePropagation(); run();
}, true);
window.ATAnnualCareerFiveModelV138 = { version: VERSION, run, pending: () => Boolean(sharedRunPromiseF6023), scoringRule: 'TOP3_EACH_RACE_THEN_BEST_PER_YEAR_WITH_PARTIAL_SUPPORT_F19' };
console.info('[AT AI]', VERSION, 'aktif — yıllık arşiv ilk 3 ayrı kariyer yolu + yılın en iyi referansı');
})();