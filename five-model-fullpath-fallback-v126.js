/* AT AI Mobil — V12.6 Five-Model Full-Path + Exact Fallback
   - 5 model skorunda güncel ve tarihsel atlar için wins/roadmap yerine tam kariyer history yolu kullanılır.
   - V11 model-roadmap TJK sorgu tablosundaki Y1 gibi eksilen koşullar yüzünden boş dönerse,
     doğrulanmış /api/tjk-roadmap yarışları EXACT kanalına otomatik eklenir.
   - İkiz/Aile verisi V11'den geliyorsa korunur; veri olmayan kanal Bileşik'te sıfır sayılmaz.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_FULLPATH_V126__) return;
window.__AT_FIVE_MODEL_FULLPATH_V126__ = true;

const VERSION = 'FIVE-MODEL-FULLPATH-FALLBACK-V12.6';
const careerCache = new Map();

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function iso(row = {}) {
  const x = clean(row?.isoDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const raw = clean(row?.date);
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return raw;
  m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : raw;
}

function chronological(rows) {
  return (Array.isArray(rows) ? [...rows] : []).filter(Boolean).sort((a,b) => iso(a).localeCompare(iso(b)));
}

function firstRows(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return chronological(value);
  }
  return [];
}

function fullCareerPath(career = {}) {
  return firstRows(
    career.fullPathBefore,
    career.historyBefore,
    career.comparisonPathBefore,
    career.roadmapBefore,
    career.history,
    career.fullPath,
    career.comparisonPath,
    career.races,
    career.roadmap,
    career.preparationPath,
    career.top5,
    career.wins
  );
}

function currentMode(career = {}) {
  return fullCareerPath(career).length ? 'FULL_PATH' : 'DEBUT';
}

// 5-model ana fonksiyonları classic-script global bağlarıdır; çalışma anında tam yol sürümüne çevrilir.
try {
  analysisModeV11 = function(career = {}) { return currentMode(career); };
  modeLabelV11 = function(mode) { return mode === 'DEBUT' ? 'Debut' : 'Tam Kariyer Yolu'; };
  referencePathV11 = function(ref) { return fullCareerPath(ref?.career || {}); };

  scoreRowsV11 = function(currentCareer, historicalRaces, useCondition = true) {
    const path = fullCareerPath(currentCareer || {});
    const mode = path.length ? 'FULL_PATH' : 'DEBUT';
    if (!path.length) {
      return { score:null, rows:[], mode, strongYears:0, supportYears:0, latestScore:null, coverageYears:0 };
    }

    const byYear = new Map();
    for (const race of Array.isArray(historicalRaces) ? historicalRaces : []) {
      if (race?.ok === false) continue;
      const year = Number(race?.sourceYear || String(race?.date || '').slice(0,4)) || null;
      if (!year) continue;
      const conditionScore = useCondition
        ? Math.max(0, Math.min(100, Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 0))
        : 100;
      let best = null;
      for (const ref of Array.isArray(race?.top3) ? race.top3 : []) {
        const refPath = fullCareerPath(ref?.career || {});
        if (!refPath.length) continue;
        const raw = typeof orderedPathSimilarity === 'function' ? orderedPathSimilarity(path, refPath) : 0;
        const pathScore = Math.round(Math.max(0, Math.min(1, Number(raw) || 0)) * 100);
        const effective = Math.round(pathScore * conditionScore / 100);
        const candidate = {
          year,
          score:effective,
          pathScore,
          conditionScore,
          historicalHorse:ref?.horseName || '',
          historicalFinish:Number(ref?.finish || 0) || null,
          raceDate:race?.date || '',
          raceCity:race?.city || '',
          raceNo:race?.raceNo || '',
          referenceType:race?.referenceType || '',
          referenceLabel:race?.referenceLabel || '',
          calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
          currentPathCount:path.length,
          referencePathCount:refPath.length
        };
        if (!best || candidate.score > best.score ||
            (candidate.score === best.score && candidate.pathScore > best.pathScore) ||
            (candidate.score === best.score && candidate.pathScore === best.pathScore && Number(candidate.historicalFinish || 99) < Number(best.historicalFinish || 99))) {
          best = candidate;
        }
      }
      if (!best) continue;
      const previous = byYear.get(year);
      if (!previous || best.score > previous.score || (best.score === previous.score && best.pathScore > previous.pathScore)) byYear.set(year, best);
    }

    const rows = [...byYear.values()].sort((a,b) => b.year - a.year);
    if (!rows.length) return { score:null, rows:[], mode, strongYears:0, supportYears:0, latestScore:null, coverageYears:0 };
    const strongest = [...rows].sort((a,b) => b.score-a.score || b.pathScore-a.pathScore || b.year-a.year)[0];
    return {
      score:strongest.score,
      strongest,
      rows,
      mode,
      strongYears:rows.filter(x => x.score >= 85).length,
      supportYears:rows.filter(x => x.score >= 70).length,
      latestScore:rows[0]?.score ?? null,
      coverageYears:rows.length
    };
  };
} catch (e) {
  console.warn('[AT AI] V12.6 skor fonksiyonu bağlama uyarısı:', e?.message || e);
}

async function fetchFullCareer(horseId, before) {
  const id = clean(horseId), cutoff = clean(before);
  if (!id || !cutoff) return null;
  const key = `${id}|${cutoff}`;
  if (careerCache.has(key)) return careerCache.get(key);
  const promise = (async () => {
    const res = await fetch(`/api/tjk-career-v10?horseId=${encodeURIComponent(id)}&before=${encodeURIComponent(cutoff)}&t=${Date.now()}`, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.error || `Kariyer API ${res.status}`);
    const full = chronological(Array.isArray(data.history) ? data.history : []);
    return {
      ...data,
      analysisMode:full.length ? 'FULL_PATH' : 'DEBUT',
      fullPathBefore:full,
      historyBefore:full,
      comparisonPathBefore:full,
      roadmapBefore:full,
      fullPathBeforeCount:full.length,
      fullReferencePathVersion:VERSION
    };
  })();
  careerCache.set(key, promise);
  try { return await promise; }
  catch (e) { careerCache.delete(key); throw e; }
}

async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length); let cursor = 0;
  async function run(){ while(true){ const i=cursor++; if(i>=list.length)return; out[i]=await worker(list[i],i); } }
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length||1)},()=>run()));
  return out;
}

async function enrichExactRace(race) {
  if (!race || race.ok === false) return race;
  const top3 = await mapLimit(race.top3 || [], 3, async ref => {
    if (!ref?.horseId) return ref;
    try { return { ...ref, career:await fetchFullCareer(ref.horseId, race.date) }; }
    catch (e) { return { ...ref, career:{...(ref.career||{}), ok:false, fullPathError:e?.message || 'Tam kariyer alınamadı.'} }; }
  });
  return {
    ...race,
    referenceType:'EXACT',
    referenceLabel:'TAM TARİHSEL EŞLEŞME',
    transferabilityScore:Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 100,
    top3,
    top3Count:top3.length,
    fullReferencePathV126:true
  };
}

function modelCount(data) {
  const m = data?.models || {};
  return ['EXACT','CONDITION_TWIN','RACE_FAMILY'].reduce((s,k) => s + (Array.isArray(m[k]) ? m[k].length : 0), 0);
}

const fetchModelRoadmapBeforeV126 = typeof fetchModelRoadmapV11 === 'function' ? fetchModelRoadmapV11 : null;
if (fetchModelRoadmapBeforeV126) {
  fetchModelRoadmapV11 = async function(race) {
    let base = null;
    try { base = await fetchModelRoadmapBeforeV126(race); }
    catch (e) { base = {ok:false,error:e?.message || String(e),models:{EXACT:[],CONDITION_TWIN:[],RACE_FAMILY:[]}}; }

    const existingModels = base?.models || {};
    const hasExact = Array.isArray(existingModels.EXACT) && existingModels.EXACT.length > 0;
    if (hasExact) return base;

    const meta = typeof programRaceMeta === 'function'
      ? programRaceMeta(race)
      : {ok:true,class:race?.class,ageGroup:race?.ageGroup,track:race?.track,distance:race?.distance};
    if (!meta?.ok) return base;

    try {
      const city = typeof getCityName === 'function' ? getCityName() : clean(state?.city);
      const classText = typeof window.canonicalClassDisplayV125 === 'function'
        ? window.canonicalClassDisplayV125(meta.class || '')
        : clean(meta.class || '');
      const url =
        `/api/tjk-roadmap` +
        `?date=${encodeURIComponent(state.date)}` +
        `&city=${encodeURIComponent(city)}` +
        `&class=${encodeURIComponent(classText)}` +
        `&ageGroup=${encodeURIComponent(meta.ageGroup || '')}` +
        `&track=${encodeURIComponent(meta.track || '')}` +
        `&distance=${encodeURIComponent(meta.distance || '')}` +
        `&minYear=2000&t=${Date.now()}`;
      const res = await fetch(url, {cache:'no-store'});
      const exact = await res.json();
      if (!res.ok || !exact?.ok || !Array.isArray(exact.historicalRaces) || !exact.historicalRaces.length) return base;

      const exactRaces = await mapLimit(exact.historicalRaces, 3, enrichExactRace);
      return {
        ...(base || {}),
        ok:true,
        version:`${base?.version || 'TJK-MODEL-ROADMAP'}+EXACT-FALLBACK-V12.6`,
        target:base?.target || exact.target || null,
        models:{
          EXACT:exactRaces,
          CONDITION_TWIN:Array.isArray(existingModels.CONDITION_TWIN) ? existingModels.CONDITION_TWIN : [],
          RACE_FAMILY:Array.isArray(existingModels.RACE_FAMILY) ? existingModels.RACE_FAMILY : []
        },
        counts:{
          EXACT:exactRaces.length,
          CONDITION_TWIN:Array.isArray(existingModels.CONDITION_TWIN) ? existingModels.CONDITION_TWIN.length : 0,
          RACE_FAMILY:Array.isArray(existingModels.RACE_FAMILY) ? existingModels.RACE_FAMILY.length : 0
        },
        exactFallbackV126:true,
        exactFallbackSourceVersion:exact.version || null,
        previousModelCount:modelCount(base)
      };
    } catch (e) {
      return { ...(base || {}), exactFallbackErrorV126:e?.message || String(e) };
    }
  };
}

try {
  if (typeof state === 'object' && state && state.fiveModelFullPathVersion !== VERSION) {
    state.fiveModelFullPathVersion = VERSION;
    if (state.analyses && typeof state.analyses === 'object') {
      state.analyses.career = {};
      state.analyses.historical = {};
    }
    try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}
    if (typeof save === 'function') save();
  }
} catch (e) {
  console.warn('[AT AI] V12.6 cache temizleme uyarısı:', e?.message || e);
}

console.info('[AT AI]', VERSION, 'aktif — 5 model tam kariyer + exact fallback');
})();
