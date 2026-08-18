const VERSION = 'TJK-MODEL-ROADMAP-V11.0';
const INTERNAL_RETRIES = 2;
const RACE_CONCURRENCY = 2;
const CAREER_CONCURRENCY = 3;
const MODEL_TYPES = ['EXACT', 'CONDITION_TWIN', 'RACE_FAMILY'];

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getBaseUrl(req) {
  const host = clean(req.headers?.['x-forwarded-host']) || clean(req.headers?.host) || 'at-ai-mobil.vercel.app';
  const protocol = clean(req.headers?.['x-forwarded-proto']) || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

function candidateKey(x = {}) {
  return [clean(x.date), clean(x.city).toLocaleUpperCase('tr-TR'), Number(x.raceNo || 0)].join('|');
}

function normalizeType(v = '') {
  const t = clean(v).toUpperCase();
  if (t === 'SAME_RACE_FAMILY') return 'RACE_FAMILY';
  return MODEL_TYPES.includes(t) ? t : '';
}

function typeLabel(type) {
  if (type === 'EXACT') return 'TAM TARİHSEL EŞLEŞME';
  if (type === 'CONDITION_TWIN') return 'KOŞUL İKİZİ';
  return 'AYNI YARIŞ AİLESİ';
}

async function fetchJson(url, timeoutMs = 60000, attempts = INTERNAL_RETRIES) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers:{ Accept:'application/json, text/plain, */*', 'Cache-Control':'no-cache' },
        signal:controller.signal
      });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; }
      catch { throw new Error(`JSON olmayan cevap (${response.status}): ${text.slice(0,160)}`); }
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      return data;
    } catch (e) {
      lastError = e?.name === 'AbortError' ? new Error('İstek zaman aşımına uğradı.') : e;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('İstek başarısız.');
}

async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const i = cursor++;
      if (i >= list.length) return;
      out[i] = await worker(list[i], i);
    }
  }
  await Promise.all(Array.from({ length:Math.min(Math.max(1, limit), list.length || 1) }, () => run()));
  return out;
}

function normalizeHorse(raw = {}) {
  const finish = Number(raw.finish ?? raw.rank ?? raw.sira ?? 0) || null;
  return {
    finish,
    horseId:clean(raw.horseId ?? raw.atId ?? raw.id ?? ''),
    horseName:clean(raw.horseName ?? raw.atAdi ?? raw.name ?? ''),
    programNo:Number(raw.programNo ?? raw.number ?? raw.no ?? 0) || null,
    margin:clean(raw.margin ?? raw.fark ?? raw.distanceBehind ?? raw.behind ?? '') || null
  };
}

function careerEnvelope(career = {}) {
  const wins = Array.isArray(career.wins) ? career.wins : [];
  const top5 = Array.isArray(career.top5) ? career.top5 : [];
  const prep = Array.isArray(career.preparationPath) ? career.preparationPath : [];
  return {
    ok:Boolean(career.ok),
    error:career?.ok ? null : (career?.error || 'Kariyer alınamadı.'),
    cutoffExclusive:career.before || null,
    winsBefore:wins,
    winsBeforeCount:wins.length,
    top5Before:top5,
    top5BeforeCount:top5.length,
    preparationPathBefore:prep,
    preparationPathBeforeCount:prep.length,
    analysisMode:career.analysisMode || null,
    audit:career.audit || null,
    version:career.version || null
  };
}

async function buildHistoricalHorse(baseUrl, horse, date) {
  const result = { ...horse, career:{ ok:false, winsBefore:[], top5Before:[], preparationPathBefore:[] } };
  if (!horse.horseId) {
    result.career.error = 'At ID bulunamadı.';
    return result;
  }
  try {
    const url = new URL('/api/tjk-career-v10', baseUrl);
    url.searchParams.set('horseId', horse.horseId);
    url.searchParams.set('before', date);
    const data = await fetchJson(url.toString(), 50000, INTERNAL_RETRIES);
    result.career = careerEnvelope(data);
    return result;
  } catch (e) {
    result.career.error = e?.message || 'Tarihsel at kariyeri alınamadı.';
    return result;
  }
}

function normalizeCandidate(raw = {}, year = null) {
  const type = normalizeType(raw.referenceType);
  return {
    date:clean(raw.date || raw.isoDate || ''),
    city:clean(raw.city || ''),
    raceNo:Number(raw.raceNo || 0),
    sourceYear:Number(raw.sourceYear || year || String(raw.date || '').slice(0,4)) || null,
    anchorDate:clean(raw.anchorDate || ''),
    calendarDayDifference:Number(raw.calendarDayDifference ?? 999),
    referenceType:type,
    referenceLabel:raw.referenceLabel || typeLabel(type),
    transferabilityScore:Number(raw.transferabilityScore ?? raw.raceConditionSimilarity ?? 100),
    transferabilityTier:raw.transferabilityTier || null,
    transferabilityColor:raw.transferabilityColor || null,
    explanation:raw.explanation || '',
    distance:Number(raw.distance || 0) || null,
    track:raw.track || '',
    class:raw.class || '',
    ageGroup:raw.ageGroup || ''
  };
}

async function buildHistoricalRace(baseUrl, candidate) {
  const output = {
    ...candidate,
    ok:false,
    top3:[]
  };
  try {
    const historyUrl = new URL('/api/tjk-history', baseUrl);
    historyUrl.searchParams.set('date', candidate.date);
    historyUrl.searchParams.set('city', candidate.city);
    historyUrl.searchParams.set('raceNo', String(candidate.raceNo));
    const history = await fetchJson(historyUrl.toString(), 45000, INTERNAL_RETRIES);
    if (!history?.ok) throw new Error(history?.error || 'Geçmiş yarış sonucu okunamadı.');

    output.condition = {
      class:history.class || candidate.class || '',
      ageGroup:history.ageGroup || candidate.ageGroup || '',
      distance:history.distance || candidate.distance || '',
      track:history.track || candidate.track || '',
      raw:history.conditionRaw || null
    };

    const top3 = (Array.isArray(history.top3) ? history.top3 : [])
      .map(normalizeHorse)
      .filter(h => h.finish >= 1 && h.finish <= 3)
      .sort((a,b) => a.finish - b.finish)
      .slice(0,3);
    if (!top3.length) throw new Error('Tarihsel yarışın ilk 3 verisi bulunamadı.');

    output.top3 = await mapLimit(top3, CAREER_CONCURRENCY, h => buildHistoricalHorse(baseUrl, h, candidate.date));
    output.top3Count = output.top3.length;
    output.ok = true;
    return output;
  } catch (e) {
    output.error = e?.message || 'Model tarihsel yarışı hazırlanamadı.';
    return output;
  }
}

function chooseBestPerType(yearResult = {}) {
  const matches = Array.isArray(yearResult.matches) ? yearResult.matches : [];
  const out = {};
  for (const type of MODEL_TYPES) {
    const candidates = matches
      .map(x => normalizeCandidate(x, yearResult.year))
      .filter(x => x.referenceType === type && x.date && x.city && x.raceNo)
      .sort((a,b) =>
        Number(b.transferabilityScore || 0) - Number(a.transferabilityScore || 0) ||
        Number(a.calendarDayDifference || 999) - Number(b.calendarDayDifference || 999) ||
        String(b.date).localeCompare(String(a.date))
      );
    if (candidates.length) out[type] = candidates[0];
  }
  return out;
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  try {
    const baseUrl = getBaseUrl(req);
    const sourceUrl = new URL('/api/tjk-adaptive-roadmap-v102', baseUrl);
    for (const key of ['date','city','class','ageGroup','track','distance','minYear']) {
      const value = clean(req.query?.[key] || '');
      if (value) sourceUrl.searchParams.set(key, value);
    }
    sourceUrl.searchParams.set('t', String(Date.now()));

    const source = await fetchJson(sourceUrl.toString(), 120000, 1);
    if (!source?.ok) throw new Error(source?.error || 'V10.2 tarihsel tarama alınamadı.');

    const prebuilt = new Map();
    for (const race of Array.isArray(source.historicalRaces) ? source.historicalRaces : []) {
      prebuilt.set(candidateKey(race), race);
    }

    const candidates = [];
    for (const yr of Array.isArray(source.yearResults) ? source.yearResults : []) {
      const best = chooseBestPerType(yr);
      for (const type of MODEL_TYPES) if (best[type]) candidates.push(best[type]);
    }

    const unique = [];
    const seen = new Set();
    for (const c of candidates) {
      const key = `${candidateKey(c)}|${c.referenceType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }

    const built = await mapLimit(unique, RACE_CONCURRENCY, async candidate => {
      const existing = prebuilt.get(candidateKey(candidate));
      if (existing && normalizeType(existing.referenceType) === candidate.referenceType && Array.isArray(existing.top3)) {
        return {
          ...existing,
          referenceType:candidate.referenceType,
          referenceLabel:candidate.referenceLabel,
          transferabilityScore:candidate.transferabilityScore,
          sourceYear:candidate.sourceYear,
          calendarDayDifference:candidate.calendarDayDifference
        };
      }
      return buildHistoricalRace(baseUrl, candidate);
    });

    const models = { EXACT:[], CONDITION_TWIN:[], RACE_FAMILY:[] };
    for (const race of built) {
      const type = normalizeType(race?.referenceType);
      if (type && models[type]) models[type].push(race);
    }
    for (const type of MODEL_TYPES) {
      models[type].sort((a,b) => Number(b.sourceYear || 0) - Number(a.sourceYear || 0));
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({
      ok:true,
      version:VERSION,
      sourceVersion:source.version || null,
      target:source.target || null,
      classAlias:source.classAlias || null,
      rules:{
        yearWindow:'target month/day ±45 days, every historical year separately',
        independentModels:true,
        modelTypes:MODEL_TYPES,
        candidateRule:'best candidate of each reference type per year among V10.2 accepted matches',
        top3CareerFreeze:'historical horse career only before historical race date'
      },
      models,
      counts:Object.fromEntries(MODEL_TYPES.map(type => [type, models[type].length])),
      diagnostics:{
        sourceYears:Array.isArray(source.yearResults) ? source.yearResults.length : 0,
        candidateCount:unique.length,
        builtCount:built.length,
        durationMs:Date.now()-startedAt,
        warning:'V10.2 yearResults each year exposes its strongest accepted candidates; missing model type is reported as no data, never converted to zero.'
      }
    });
  } catch (e) {
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.message || 'V11 model yol haritası hazırlanamadı.',
      durationMs:Date.now()-startedAt
    });
  }
}
