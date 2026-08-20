const VERSION = 'TJK-MODEL-ROADMAP-V11.10';
const INTERNAL_RETRIES = 2;
const RACE_CONCURRENCY = 2;
const CAREER_CONCURRENCY = 3;
const VERIFY_CONCURRENCY = 2;
const MODEL_TYPES = ['EXACT', 'CONDITION_TWIN', 'RACE_FAMILY'];

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function upper(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}
function getBaseUrl(req) {
  const host = clean(req.headers?.['x-forwarded-host']) || clean(req.headers?.host) || 'at-ai-mobil.vercel.app';
  const protocol = clean(req.headers?.['x-forwarded-proto']) || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}
function normalizeType(v = '') {
  const t = upper(v);
  if (t === 'SAME_RACE_FAMILY') return 'RACE_FAMILY';
  return MODEL_TYPES.includes(t) ? t : '';
}
function typeLabel(type) {
  if (type === 'EXACT') return 'TAM TARİHSEL EŞLEŞME';
  if (type === 'CONDITION_TWIN') return 'KOŞUL İKİZİ';
  return 'AYNI YARIŞ AİLESİ';
}
function normalizeCity(v = '') {
  return upper(v).replace(/[^A-Z0-9]/g, '');
}
function normalizeTrack(v = '') {
  const t = upper(v);
  if (t.includes('SENTETIK')) return 'SENTETIK';
  if (t.includes('CIM')) return 'CIM';
  if (t.includes('KUM')) return 'KUM';
  return t;
}
function normalizeDistance(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  const m = clean(v).match(/\d{3,4}/);
  return m ? Number.parseInt(m[0], 10) : 0;
}
function parseAge(v = '') {
  const t = upper(v).replace(/\s+/g, ' ');
  let breed = '';
  if (t.includes('INGILIZ')) breed = 'I';
  else if (t.includes('ARAP')) breed = 'A';
  let m = t.match(/(\d+)\s*VE\s*YUKARI/);
  if (m) return { breed, min:Number(m[1]), max:99 };
  m = t.match(/(\d+)\s*YASLI/);
  if (m) return { breed, min:Number(m[1]), max:Number(m[1]) };
  m = t.replace(/\s+/g, '').match(/^(\d+)(\+)?([IA])$/);
  if (m) return { breed:m[3], min:Number(m[1]), max:m[2] ? 99 : Number(m[1]) };
  return { breed, min:null, max:null };
}
function ageKey(v = '') {
  const a = parseAge(v);
  if (a.breed && a.min !== null && a.max !== null) return `${a.breed}:${a.min}:${a.max}`;
  return upper(v).replace(/\s+/g, '');
}
function normalizeClass(v = '') {
  return upper(v)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}
function parseRaceFamily(v = '') {
  const t = normalizeClass(v);
  let m = t.match(/\bHANDIKAP\s*(\d+)\b/); if (m) return { family:'HANDIKAP', level:Number(m[1]) };
  m = t.match(/\bSARTLI\s*(\d+)\b/); if (m) return { family:'SARTLI', level:Number(m[1]) };
  m = t.match(/\bKV[- ]*(\d+)\b/); if (m) return { family:'KV', level:Number(m[1]) };
  m = t.match(/\b(?:G|GRUP)\s*-?\s*([123])\b/); if (m) return { family:'GROUP', level:Number(m[1]) };
  m = t.match(/^SATIS\s*(\d+)\b/); if (m) return { family:'SATIS', level:Number(m[1]) };
  if (/^OPSIYONEL\s+SATIS\b/.test(t)) return { family:'OPSIYONEL_SATIS', level:null };
  if (/^MAIDEN\b/.test(t)) return { family:'MAIDEN', level:0 };
  if (/^SATIS\b/.test(t)) return { family:'SATIS', level:null };
  return { family:t.split('/')[0], level:null };
}
function canonicalDecoratorToken(v = '') {
  const t = upper(v).replace(/\s+/g, '');
  if (t === 'D' || t === 'DISI') return 'DISI';
  return t;
}
function classTokens(v = '') {
  return normalizeClass(v).split('/').slice(1)
    .map(canonicalDecoratorToken)
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .sort();
}
function classCoreKey(v = '') {
  const f = parseRaceFamily(v);
  return `${f.family}:${f.level ?? ''}|${classTokens(v).join('/')}`;
}
function candidateKey(x = {}) {
  return [clean(x.date), normalizeCity(x.city), Number(x.raceNo || 0)].join('|');
}
function candidateModelKey(x = {}) {
  return `${candidateKey(x)}|${normalizeType(x.referenceType)}`;
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
function chronological(rows = []) {
  return [...rows].sort((a,b) => String(a?.isoDate || a?.date || '').localeCompare(String(b?.isoDate || b?.date || '')));
}
function careerEnvelope(career = {}) {
  const full = chronological(Array.isArray(career.history) ? career.history : []);
  const wins = chronological(Array.isArray(career.wins) ? career.wins : full.filter(r => Number(r?.finish ?? r?.rank ?? r?.sira) === 1));
  const top5 = chronological(Array.isArray(career.top5) ? career.top5 : full.filter(r => {
    const f = Number(r?.finish ?? r?.rank ?? r?.sira);
    return f >= 1 && f <= 5;
  }));
  const prep = chronological(Array.isArray(career.preparationPath) ? career.preparationPath : top5);
  return {
    ok:Boolean(career.ok),
    error:career?.ok ? null : (career?.error || 'Kariyer alınamadı.'),
    cutoffExclusive:career.before || null,
    fullPathBefore:full,
    historyBefore:full,
    roadmapBefore:full,
    fullPathBeforeCount:full.length,
    winsBefore:wins,
    winsBeforeCount:wins.length,
    top5Before:top5,
    top5BeforeCount:top5.length,
    preparationPathBefore:prep,
    preparationPathBeforeCount:prep.length,
    analysisMode:career.analysisMode || (wins.length ? 'WIN_PATH' : full.length ? 'PREPARATION_PATH' : 'DEBUT'),
    audit:career.audit || null,
    version:career.version || null,
    pathRule:'Tarihsel atın referans yarıştan önceki TÜM yarışları; yalnız galibiyet satırlarına daraltılmaz.'
  };
}
async function buildHistoricalHorse(baseUrl, horse, date) {
  const result = { ...horse, career:{ ok:false, fullPathBefore:[], historyBefore:[], winsBefore:[], top5Before:[], preparationPathBefore:[] } };
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
    distance:normalizeDistance(raw.distance),
    track:clean(raw.track || ''),
    class:clean(raw.authoritativeClass || raw.class || ''),
    ageGroup:clean(raw.ageGroup || ''),
    _history:raw._history || null
  };
}
async function fetchHistoricalSnapshot(baseUrl, candidate, cache) {
  const key = candidateKey(candidate);
  if (cache.has(key)) return cache.get(key);
  const promise = (async () => {
    const url = new URL('/api/tjk-history', baseUrl);
    url.searchParams.set('date', candidate.date);
    url.searchParams.set('city', candidate.city);
    url.searchParams.set('raceNo', String(candidate.raceNo));
    return fetchJson(url.toString(), 45000, INTERNAL_RETRIES);
  })();
  cache.set(key, promise);
  try { return await promise; }
  catch (e) { cache.delete(key); throw e; }
}
function verifyCandidate(target, candidate, history) {
  const authoritativeClass = clean(history?.class || '');
  const authoritativeAge = clean(history?.ageGroup || candidate.ageGroup || '');
  const authoritativeDistance = normalizeDistance(history?.distance || candidate.distance);
  const authoritativeTrack = clean(history?.track || candidate.track || '');
  const fullClassMatch = Boolean(authoritativeClass) && classCoreKey(target.class) === classCoreKey(authoritativeClass);
  const ageMatch = ageKey(target.ageGroup) === ageKey(authoritativeAge);
  const cityMatch = normalizeCity(target.city) === normalizeCity(candidate.city);
  const distanceMatch = Number(target.distance) === Number(authoritativeDistance);
  const trackMatch = normalizeTrack(target.track) === normalizeTrack(authoritativeTrack);
  const type = normalizeType(candidate.referenceType);
  const structuralMatch = type === 'EXACT'
    ? cityMatch && distanceMatch && trackMatch
    : type === 'RACE_FAMILY'
      ? cityMatch
      : type === 'CONDITION_TWIN'
        ? distanceMatch && trackMatch
        : false;
  return {
    ok:fullClassMatch && ageMatch && structuralMatch,
    fullClassMatch, ageMatch, cityMatch, distanceMatch, trackMatch,
    authoritativeClass, authoritativeAge, authoritativeDistance, authoritativeTrack,
    targetFullClassKey:classCoreKey(target.class), historyFullClassKey:classCoreKey(authoritativeClass)
  };
}
async function verifyOne(baseUrl, target, candidate, historyCache) {
  try {
    const history = candidate._history || await fetchHistoricalSnapshot(baseUrl, candidate, historyCache);
    if (!history?.ok) return null;
    const verification = verifyCandidate(target, candidate, history);
    if (!verification.ok) return null;
    return {
      ...candidate,
      class:verification.authoritativeClass,
      ageGroup:verification.authoritativeAge,
      distance:verification.authoritativeDistance,
      track:verification.authoritativeTrack,
      authoritativeClass:verification.authoritativeClass,
      fullClassVerified:true,
      verification,
      _history:history
    };
  } catch {
    return null;
  }
}
function candidatesForType(yearResult, type) {
  const pool = [];
  if (yearResult?.best) pool.push(yearResult.best);
  for (const m of Array.isArray(yearResult?.matches) ? yearResult.matches : []) pool.push(m);
  const seen = new Set();
  return pool
    .map(x => normalizeCandidate(x, yearResult?.year))
    .filter(x => x.referenceType === type && x.date && x.city && x.raceNo)
    .filter(x => {
      const k = candidateKey(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a,b) =>
      Number(b.transferabilityScore || 0) - Number(a.transferabilityScore || 0) ||
      Number(a.calendarDayDifference || 999) - Number(b.calendarDayDifference || 999) ||
      String(b.date).localeCompare(String(a.date))
    );
}
async function findVerifiedForType(baseUrl, target, yearResult, type, historyCache) {
  for (const candidate of candidatesForType(yearResult, type)) {
    const verified = await verifyOne(baseUrl, target, candidate, historyCache);
    if (verified) return verified;
  }
  return null;
}
async function buildHistoricalRace(baseUrl, target, candidate, historyCache) {
  const output = { ...candidate, ok:false, top3:[] };
  try {
    const verified = candidate.fullClassVerified
      ? candidate
      : await verifyOne(baseUrl, target, candidate, historyCache);
    if (!verified) throw new Error('Tarihsel aday TJK sonuç sayfasındaki tam sınıfla doğrulanamadı.');
    const history = verified._history || await fetchHistoricalSnapshot(baseUrl, verified, historyCache);
    output.classVerification = 'TJK_HISTORY_FULL_CLASS';
    output.authoritativeClass = verified.authoritativeClass || history.class || null;
    output.condition = {
      class:history.class || verified.class || '',
      ageGroup:history.ageGroup || verified.ageGroup || '',
      distance:history.distance || verified.distance || '',
      track:history.track || verified.track || '',
      raw:history.conditionRaw || null
    };
    const top3 = (Array.isArray(history.top3) ? history.top3 : [])
      .map(normalizeHorse)
      .filter(h => h.finish >= 1 && h.finish <= 3)
      .sort((a,b) => a.finish - b.finish)
      .slice(0,3);
    if (!top3.length) throw new Error('Tarihsel yarışın gerçek ilk 3 verisi bulunamadı.');
    output.top3 = await mapLimit(top3, CAREER_CONCURRENCY, h => buildHistoricalHorse(baseUrl, h, verified.date));
    output.top3Count = output.top3.length;
    output.ok = true;
    output.fullClassVerified = true;
    output.pathRule = 'İlk 3 atın referans yarıştan önceki tüm yarış geçmişi dondurularak kullanılır.';
    delete output._history;
    return output;
  } catch (e) {
    output.error = e?.message || 'Model tarihsel yarışı hazırlanamadı.';
    delete output._history;
    return output;
  }
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

    const target = {
      date:clean(source?.target?.date || req.query?.date || ''),
      city:clean(source?.target?.city || req.query?.city || ''),
      class:clean(source?.target?.class || req.query?.class || ''),
      ageGroup:clean(source?.target?.ageGroup || req.query?.ageGroup || ''),
      track:clean(source?.target?.track || req.query?.track || ''),
      distance:normalizeDistance(source?.target?.distance || req.query?.distance)
    };
    const historyCache = new Map();
    const selected = new Map();

    for (const raw of Array.isArray(source.historicalRaces) ? source.historicalRaces : []) {
      if (raw?.ok === false) continue;
      const c = normalizeCandidate(raw, raw?.sourceYear);
      if (!c.referenceType || !c.date || !c.city || !c.raceNo) continue;
      const verified = await verifyOne(baseUrl, target, c, historyCache);
      if (verified) selected.set(candidateModelKey(verified), verified);
    }

    const yearResults = Array.isArray(source.yearResults) ? source.yearResults : [];
    const perYear = await mapLimit(yearResults, VERIFY_CONCURRENCY, async yr => {
      const found = [];
      for (const type of MODEL_TYPES) {
        const already = [...selected.values()].some(c => Number(c.sourceYear) === Number(yr.year) && c.referenceType === type);
        if (already) continue;
        const verified = await findVerifiedForType(baseUrl, target, yr, type, historyCache);
        if (verified) found.push(verified);
      }
      return found;
    });
    for (const list of perYear) for (const c of list || []) selected.set(candidateModelKey(c), c);

    const unique = [...selected.values()];
    const built = await mapLimit(unique, RACE_CONCURRENCY, c => buildHistoricalRace(baseUrl, target, c, historyCache));
    const models = { EXACT:[], CONDITION_TWIN:[], RACE_FAMILY:[] };
    for (const race of built) {
      if (!race?.ok) continue;
      const type = normalizeType(race.referenceType);
      if (type && models[type]) models[type].push(race);
    }
    for (const type of MODEL_TYPES) {
      models[type].sort((a,b) => Number(b.sourceYear || 0) - Number(a.sourceYear || 0));
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({
      ok:true,
      version:VERSION,
      sourceVersion:source.version || null,
      target,
      classIdentity:{ strategy:'FULL_CLASS_IDENTITY', fullClassKey:classCoreKey(target.class), decoratorsPreserved:true, numberedSalesPreserved:true, optionalSaleSeparated:true },
      rules:{
        yearWindow:'target month/day ±45 days, every historical year separately',
        independentModels:true,
        modelTypes:MODEL_TYPES,
        candidateRule:'Her yıl/model tipinde adaylar sırayla TJK gerçek sonuç sayfasında tam sınıfla doğrulanır; ilk yanlış varyant yılı düşürmez.',
        top3CareerFreeze:'historical horse career only before historical race date',
        pathComparison:'FULL_PRE_RACE_HISTORY',
        pathNote:'Kazanan/ikinci/üçüncünün yalnız eski galibiyetleri değil, referans yarıştan önceki bütün yarış yolu kullanılır.'
      },
      models,
      counts:Object.fromEntries(MODEL_TYPES.map(type => [type, models[type].length])),
      diagnostics:{
        sourceYears:yearResults.length,
        sourceVerifiedRaces:Array.isArray(source.historicalRaces) ? source.historicalRaces.length : 0,
        verifiedCandidateCount:unique.length,
        builtCount:built.filter(x => x?.ok).length,
        failedBuildCount:built.filter(x => !x?.ok).length,
        durationMs:Date.now()-startedAt,
        warning:unique.length ? '' : 'Tam sınıfı doğrulanmış tarihsel aday üretilemedi.'
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
