import * as cheerio from 'cheerio';

const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.1';
const TJK = 'https://www.tjk.org';
const PAGE_URL = `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;
const DATA_URL = `${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;
const SORT = 'Tarih desc, Sehir asc, KosuSirasi asc';
const DAY_WINDOW = 45;
const DEFAULT_MIN_YEAR = 2000;
const INTERNAL_RETRIES = 3;
const YEAR_CONCURRENCY = 2;
const RACE_CONCURRENCY = 2;
const CAREER_CONCURRENCY = 2;

const HEADERS = {
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:PAGE_URL
};

function clean(v = '') { return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
function upper(v = '') { return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); }
function normalizeClass(v = '') { return upper(v).replace(/\s*\/\s*/g, '/').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim(); }
function normalizeCity(v = '') { return upper(v).replace(/[^A-Z0-9]/g, ''); }
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
function parseRaceFamily(v = '') {
  const t = normalizeClass(v);
  let m = t.match(/HANDIKAP\s*(\d+)/); if (m) return { family:'HANDIKAP', level:Number(m[1]) };
  m = t.match(/SARTLI\s*(\d+)/); if (m) return { family:'SARTLI', level:Number(m[1]) };
  m = t.match(/\bKV[- ]*(\d+)\b/); if (m) return { family:'KV', level:Number(m[1]) };
  m = t.match(/\bG([123])\b/); if (m) return { family:'GROUP', level:Number(m[1]) };
  if (t.includes('MAIDEN')) return { family:'MAIDEN', level:0 };
  if (t.includes('SATIS')) return { family:'SATIS', level:0 };
  return { family:t.split('/')[0], level:null };
}
function classCoreKey(v = '') {
  const normalized = normalizeClass(v);
  const family = parseRaceFamily(normalized);
  const suffix = normalized.split('/').slice(1)
    .map(x => clean(x).replace(/\s+/g, ''))
    .filter(Boolean)
    .filter(x => !/^Y-?\d+$/.test(x));
  return `${family.family}:${family.level ?? ''}|${suffix.join('/')}`;
}
function parseDisplayDate(v = '') {
  const m = clean(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const dd = String(m[1]).padStart(2, '0');
  const mm = String(m[2]).padStart(2, '0');
  return { display:`${dd}.${mm}.${m[3]}`, iso:`${m[3]}-${mm}-${dd}` };
}
function parseIso(v = '') {
  const m = clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { year:Number(m[1]), month:Number(m[2]), day:Number(m[3]) } : null;
}
function isoFromDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function isoToDisplay(iso = '') {
  const p = parseIso(iso);
  return p ? `${String(p.day).padStart(2,'0')}.${String(p.month).padStart(2,'0')}.${p.year}` : '';
}
function daysInMonth(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
function anchorIso(targetIso, year) {
  const p = parseIso(targetIso);
  if (!p) return null;
  const day = Math.min(p.day, daysInMonth(year, p.month));
  return `${year}-${String(p.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function addDays(iso, amount) {
  const p = parseIso(iso);
  if (!p) return null;
  return isoFromDate(new Date(Date.UTC(p.year, p.month - 1, p.day + amount)));
}
function daysBetween(a, b) {
  const x = parseIso(a), y = parseIso(b);
  if (!x || !y) return null;
  return Math.round(Math.abs(Date.UTC(x.year,x.month-1,x.day) - Date.UTC(y.year,y.month-1,y.day)) / 86400000);
}
function optionList($, selector) {
  return $(selector).find('option').map((_, option) => ({ value:clean($(option).attr('value') || ''), text:clean($(option).text()) })).get();
}
function findClassOption(options, targetClass) {
  const target = parseRaceFamily(targetClass);
  return options.find(x => {
    const f = parseRaceFamily(x.text);
    return f.family === target.family && f.level === target.level;
  }) || null;
}
async function resolveFilters(target) {
  const response = await fetch(PAGE_URL, { headers:HEADERS, redirect:'follow' });
  if (!response.ok) throw new Error(`TJK GET HTTP ${response.status}`);
  const $ = cheerio.load(await response.text());
  return {
    raceClass:findClassOption(optionList($, '#QueryParameter_KosuCinsiId'), target.class),
    city:optionList($, '#QueryParameter_SehirId').find(x => normalizeCity(x.text) === normalizeCity(target.city)) || null,
    group:optionList($, '#QueryParameter_GrupId').find(x => ageKey(x.text) === ageKey(target.ageGroup)) || null,
    track:optionList($, '#QueryParameter_PistId').find(x => normalizeTrack(x.text) === normalizeTrack(target.track)) || null
  };
}
async function postForm(data) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) body.set(key, String(value ?? ''));
  let lastError = null;
  for (let attempt = 1; attempt <= INTERNAL_RETRIES; attempt++) {
    try {
      const response = await fetch(DATA_URL, {
        method:'POST',
        headers:{ ...HEADERS, 'content-type':'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with':'XMLHttpRequest' },
        body:body.toString(), redirect:'follow'
      });
      if (!response.ok) throw new Error(`TJK POST HTTP ${response.status}`);
      return response.text();
    } catch (e) {
      lastError = e;
      if (attempt < INTERNAL_RETRIES) await new Promise(r => setTimeout(r, 250 * attempt));
    }
  }
  throw lastError || new Error('TJK sorgusu başarısız.');
}
function parseQueryTable(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const rows = [];
  $('table').each((_, table) => {
    const headers = $(table).find('thead th').map((__, th) => clean($(th).text())).get();
    const ix = re => headers.findIndex(x => re.test(clean(x)));
    const dateIx=ix(/^Tarih$/i), cityIx=ix(/^Şehir$|^Sehir$/i), raceIx=ix(/^Koşu$|^Kosu$/i), ageIx=ix(/^Grup$/i), classIx=ix(/Koşu Cinsi|Kosu Cinsi/i), distanceIx=ix(/^Mesafe$/i), trackIx=ix(/^Pist$/i);
    if ([dateIx,cityIx,raceIx,ageIx,classIx,distanceIx,trackIx].some(x => x < 0)) return;
    $(table).find('tbody tr').each((__, tr) => {
      const cells = $(tr).find('td').map((___, td) => clean($(td).text())).get();
      const pd = parseDisplayDate(cells[dateIx]);
      if (!pd) return;
      rows.push({
        date:pd.display, isoDate:pd.iso, city:cells[cityIx],
        raceNo:Number(String(cells[raceIx] || '').match(/\d+/)?.[0] || 0),
        ageGroup:cells[ageIx], class:cells[classIx], distance:normalizeDistance(cells[distanceIx]), track:cells[trackIx]
      });
    });
  });
  return rows;
}
function rowKey(r) {
  return [r.isoDate, normalizeCity(r.city), r.raceNo, classCoreKey(r.class), ageKey(r.ageGroup), r.distance, normalizeTrack(r.track)].join('|');
}
function baseForm(target, filters, mode, startIso, endIso) {
  return {
    QueryParameter_Tarih_Start:isoToDisplay(startIso),
    QueryParameter_Tarih_End:isoToDisplay(endIso),
    QueryParameter_SehirId:mode === 'SAME_CITY_FAMILY' ? filters.city.value : '',
    QueryParameter_IrkId:'',
    QueryParameter_GrupId:filters.group.value,
    QueryParameter_KosuCinsiId:filters.raceClass.value,
    QueryParameter_Cinsiyet:'', QueryParameter_APRANTIKODU:'',
    QueryParameter_Mesafe:mode === 'CONDITION_TWIN' ? String(target.distance) : '',
    QueryParameter_PistId:mode === 'CONDITION_TWIN' ? filters.track.value : '',
    QueryParameter_BabaAdi:'', QueryParameter_AnneAdi:'', Era:'past', Sort:SORT
  };
}
async function fetchRange(target, filters, mode, startIso, endIso, depth = 0) {
  const rows = parseQueryTable(await postForm(baseForm(target, filters, mode, startIso, endIso)));
  const diagnostics = [{ mode, start:startIso, end:endIso, rows:rows.length, splitDepth:depth }];
  if (rows.length < 50 || depth >= 4 || startIso >= endIso) return { rows, diagnostics };

  const a = parseIso(startIso), b = parseIso(endIso);
  const startMs = Date.UTC(a.year,a.month-1,a.day), endMs = Date.UTC(b.year,b.month-1,b.day);
  const midIso = isoFromDate(new Date(Math.floor((startMs + endMs) / 2)));
  const rightStart = addDays(midIso, 1);
  if (!rightStart || rightStart > endIso) return { rows, diagnostics };
  const [left, right] = await Promise.all([
    fetchRange(target, filters, mode, startIso, midIso, depth + 1),
    fetchRange(target, filters, mode, rightStart, endIso, depth + 1)
  ]);
  const seen = new Map();
  for (const row of [...left.rows, ...right.rows]) seen.set(rowKey(row), row);
  return { rows:[...seen.values()], diagnostics:[...diagnostics, ...left.diagnostics, ...right.diagnostics] };
}
function distancePenalty(diffPct) {
  const pct = Math.max(0, Number(diffPct) || 0);
  if (pct <= 10) return Math.round(pct * 0.7);
  return Math.min(45, Math.round(7 + (pct - 10)));
}
function calendarPenalty(days) { return days <= 7 ? 0 : days <= 21 ? 3 : 5; }
function classifyCandidate(target, row, sourceYear, anchorDate) {
  const coreClass = classCoreKey(target.class) === classCoreKey(row.class);
  const age = ageKey(target.ageGroup) === ageKey(row.ageGroup);
  if (!coreClass || !age) return null;
  const city = normalizeCity(target.city) === normalizeCity(row.city);
  const distance = Number(target.distance) === Number(row.distance);
  const track = normalizeTrack(target.track) === normalizeTrack(row.track);
  let referenceType = null;
  if (city && distance && track) referenceType = 'EXACT';
  else if (city) referenceType = 'RACE_FAMILY';
  else if (distance && track) referenceType = 'CONDITION_TWIN';
  else return null;

  const calendarDayDifference = daysBetween(anchorDate, row.isoDate);
  if (calendarDayDifference === null || calendarDayDifference > DAY_WINDOW) return null;
  const distanceDiff = Math.abs(Number(target.distance) - Number(row.distance));
  const distanceDiffPct = target.distance ? (distanceDiff / Number(target.distance)) * 100 : 100;
  let score = 100;
  if (!city) score -= 15;
  score -= distancePenalty(distanceDiffPct);
  if (!track) score -= 35;
  score -= calendarPenalty(calendarDayDifference);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = score >= 85 ? 'HIGH' : score >= 70 ? 'MEDIUM' : score >= 50 ? 'SUPPORT' : 'LOW';
  const color = tier === 'HIGH' ? 'GREEN' : tier === 'MEDIUM' ? 'YELLOW' : tier === 'SUPPORT' ? 'ORANGE' : 'RED';
  const label = referenceType === 'EXACT' ? 'TAM TARİHSEL EŞLEŞME' : referenceType === 'CONDITION_TWIN' ? 'KOŞUL İKİZİ' : 'AYNI YARIŞ AİLESİ';
  const explanation = [
    label,
    city ? 'aynı hipodrom' : `hipodrom farklı (${row.city})`,
    distance ? `mesafe aynı ${row.distance} m` : `mesafe ${row.distance} m → hedef ${target.distance} m (fark %${Math.round(distanceDiffPct)})`,
    track ? 'pist aynı' : `pist farklı (${row.track} → ${target.track})`,
    `takvim farkı ${calendarDayDifference} gün`
  ].join(' · ');
  return {
    date:row.isoDate, dateDisplay:row.date, city:row.city, raceNo:row.raceNo,
    class:row.class, ageGroup:row.ageGroup, distance:row.distance, track:row.track,
    sourceYear, anchorDate, calendarDayDifference,
    referenceType, referenceLabel:label,
    transferabilityScore:score, transferabilityTier:tier, transferabilityColor:color,
    explanation,
    exactConditionMatch:referenceType === 'EXACT',
    exactFields:{ city, class:coreClass, ageGroup:age, distance, track },
    distanceDifference:distanceDiff, distanceDifferencePct:Math.round(distanceDiffPct)
  };
}
function selectBest(candidates) {
  const priority = { EXACT:3, CONDITION_TWIN:2, RACE_FAMILY:1 };
  return [...candidates].sort((a,b) =>
    b.transferabilityScore - a.transferabilityScore ||
    (priority[b.referenceType] - priority[a.referenceType]) ||
    a.calendarDayDifference - b.calendarDayDifference ||
    b.date.localeCompare(a.date)
  )[0] || null;
}
async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }
  const count = Math.min(Math.max(1, limit), items.length || 1);
  await Promise.all(Array.from({ length:count }, () => run()));
  return output;
}
function getBaseUrl(req) {
  const host = clean(req.headers?.['x-forwarded-host']) || clean(req.headers?.host) || 'at-ai-mobil.vercel.app';
  const protocol = clean(req.headers?.['x-forwarded-proto']) || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}
async function fetchJson(url, timeoutMs = 30000, attempts = INTERNAL_RETRIES) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers:{ Accept:'application/json, text/plain, */*' }, signal:controller.signal });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; }
      catch { throw new Error(`JSON olmayan cevap (${response.status}): ${text.slice(0,160)}`); }
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      return data;
    } catch (e) {
      lastError = e?.name === 'AbortError' ? new Error('İstek zaman aşımına uğradı.') : e;
      if (attempt < attempts) await new Promise(r => setTimeout(r, 300 * attempt));
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error('İstek başarısız.');
}
function normalizeTop3Horse(raw) {
  const finish = Number(raw?.finish ?? raw?.rank ?? raw?.sira ?? 0);
  if (!finish || finish < 1 || finish > 3) return null;
  return {
    finish,
    horseId:clean(raw?.horseId ?? raw?.atId ?? raw?.id),
    horseName:clean(raw?.horseName ?? raw?.atAdi ?? raw?.name),
    programNo:Number(raw?.programNo ?? raw?.number ?? raw?.no) || null,
    margin:clean(raw?.margin ?? raw?.fark ?? raw?.distanceBehind ?? raw?.behind) || null
  };
}
async function buildHistoricalHorseCareer({ baseUrl, horse, historicalDateIso }) {
  const result = {
    finish:horse.finish, horseId:horse.horseId, horseName:horse.horseName,
    programNo:horse.programNo, margin:horse.margin || null,
    career:{ ok:false, cutoffExclusive:historicalDateIso, winsBefore:[], top5Before:[], preparationPathBefore:[] }
  };
  if (!horse.horseId) { result.career.error = 'At ID bulunamadı.'; return result; }
  try {
    const url = new URL('/api/tjk-career-v10', baseUrl);
    url.searchParams.set('horseId', horse.horseId);
    url.searchParams.set('before', historicalDateIso);
    const career = await fetchJson(url.toString(), 45000, INTERNAL_RETRIES);
    if (!career?.ok) throw new Error(career?.error || 'At kariyeri okunamadı.');
    result.career = {
      ok:true, cutoffExclusive:historicalDateIso,
      careerVersion:career.version || null, analysisMode:career.analysisMode || null,
      winsBefore:Array.isArray(career.wins) ? career.wins : [],
      top5Before:Array.isArray(career.top5) ? career.top5 : [],
      preparationPathBefore:Array.isArray(career.preparationPath) ? career.preparationPath : [],
      audit:career.audit || {}, counts:career.counts || {}
    };
    return result;
  } catch (e) {
    result.career.error = e?.message || 'Kariyer hazırlanamadı.';
    return result;
  }
}
async function buildHistoricalRace({ baseUrl, candidate }) {
  const output = {
    ok:false,
    date:candidate.date, city:candidate.city, raceNo:candidate.raceNo,
    sourceYear:candidate.sourceYear, anchorDate:candidate.anchorDate,
    calendarDayDifference:candidate.calendarDayDifference,
    referenceType:candidate.referenceType, referenceLabel:candidate.referenceLabel,
    transferabilityScore:candidate.transferabilityScore, transferabilityTier:candidate.transferabilityTier,
    transferabilityColor:candidate.transferabilityColor, explanation:candidate.explanation,
    exactConditionMatch:candidate.exactConditionMatch, exactFields:candidate.exactFields,
    raceConditionSimilarity:candidate.transferabilityScore,
    distanceDifference:candidate.distanceDifference, distanceDifferencePct:candidate.distanceDifferencePct,
    alternatives:candidate.alternatives || [],
    candidateCondition:{ class:candidate.class, ageGroup:candidate.ageGroup, track:candidate.track, distance:candidate.distance },
    top3:[]
  };
  try {
    const historyUrl = new URL('/api/tjk-history', baseUrl);
    historyUrl.searchParams.set('date', candidate.date);
    historyUrl.searchParams.set('city', candidate.city);
    historyUrl.searchParams.set('raceNo', candidate.raceNo);
    const history = await fetchJson(historyUrl.toString(), 35000, INTERNAL_RETRIES);
    if (!history?.ok) throw new Error(history?.error || 'Geçmiş yarış sonucu okunamadı.');
    output.condition = {
      class:clean(history.class || candidate.class),
      ageGroup:clean(history.ageGroup || candidate.ageGroup),
      distance:normalizeDistance(history.distance || candidate.distance),
      track:clean(history.track || candidate.track),
      raw:clean(history.conditionRaw) || null
    };
    const top3 = Array.isArray(history.top3)
      ? history.top3.map(normalizeTop3Horse).filter(Boolean).sort((a,b)=>a.finish-b.finish).slice(0,3)
      : [];
    if (!top3.length) throw new Error('Tarihsel yarışın gerçek ilk 3 verisi bulunamadı.');
    output.top3 = await mapLimit(top3, CAREER_CONCURRENCY, horse => buildHistoricalHorseCareer({ baseUrl, horse, historicalDateIso:candidate.date }));
    output.top3Count = output.top3.length;
    output.ok = true;
    return output;
  } catch (e) {
    output.error = e?.message || 'Tarihsel yarış hazırlanamadı.';
    return output;
  }
}
async function scanYear(target, filters, year) {
  const anchorDate = anchorIso(target.date, year);
  const startIso = addDays(anchorDate, -DAY_WINDOW);
  const endIso = addDays(anchorDate, DAY_WINDOW);
  const [familyScan, twinScan] = await Promise.all([
    fetchRange(target, filters, 'SAME_CITY_FAMILY', startIso, endIso),
    fetchRange(target, filters, 'CONDITION_TWIN', startIso, endIso)
  ]);
  const seen = new Map();
  for (const row of [...familyScan.rows, ...twinScan.rows]) seen.set(rowKey(row), row);
  const matches = [];
  for (const row of seen.values()) {
    if (row.isoDate >= target.date) continue;
    const candidate = classifyCandidate(target, row, year, anchorDate);
    if (candidate) matches.push(candidate);
  }
  const best = selectBest(matches);
  return {
    year, anchorDate, startIso, endIso, windowDays:DAY_WINDOW,
    matchCount:matches.length,
    best,
    matches:[...matches].sort((a,b)=>b.transferabilityScore-a.transferabilityScore||a.calendarDayDifference-b.calendarDayDifference).slice(0,8),
    diagnostics:[...familyScan.diagnostics, ...twinScan.diagnostics]
  };
}
function getRules(minYear) {
  return {
    targetRaceSource:'TJK Günlük Yarış Programı',
    historicalRaceSource:'TJK Yarış Sonuçları / Koşu Sorgulama',
    pastDateOnly:true,
    yearByYear:true,
    calendarWindowDays:DAY_WINDOW,
    scanStrategy:'EACH_SOURCE_YEAR_HAS_ITS_OWN_PM45_DATE_QUERY',
    exactReference:'same city + class core + age/breed + distance + track',
    raceFamilyReference:'same city + class core + age/breed; distance/track may differ',
    conditionTwinReference:'different city + same class core + age/breed + distance + track',
    classCoreNote:'Y-1/Y-2 gibi jokey alt şartları yarış ailesi çekirdeğinden çıkarılır',
    transferability:'distance + track + city + calendar penalties',
    careerWinPath:'finish=1',
    preparationPath:'finish 1..5; no-win horses use preparation path',
    minYear
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const date=clean(req.query.date || ''), city=clean(req.query.city || ''), raceClass=clean(req.query.class || ''), ageGroup=clean(req.query.ageGroup || ''), track=clean(req.query.track || ''), distance=normalizeDistance(req.query.distance);
    const targetParts = parseIso(date);
    if (!targetParts) return res.status(400).json({ ok:false, version:VERSION, error:'date YYYY-MM-DD biçiminde gerekli.' });
    if (!city || !raceClass || !ageGroup || !track || !distance) return res.status(400).json({ ok:false, version:VERSION, error:'city, class, ageGroup, track ve distance gerekli.' });

    const requestedMinYear = Number(req.query.minYear || DEFAULT_MIN_YEAR);
    const minYear = Math.min(targetParts.year - 1, Math.max(1950, Number.isFinite(requestedMinYear) ? requestedMinYear : DEFAULT_MIN_YEAR));
    const target = { date, city, class:raceClass, ageGroup, track, distance };
    const filters = await resolveFilters(target);
    if (!filters.raceClass) throw new Error(`TJK Koşu Cinsi bulunamadı: ${raceClass}`);
    if (!filters.city) throw new Error(`TJK Şehir filtresi bulunamadı: ${city}`);
    if (!filters.group) throw new Error(`TJK Yaş grubu filtresi bulunamadı: ${ageGroup}`);
    if (!filters.track) throw new Error(`TJK Pist filtresi bulunamadı: ${track}`);

    const years = [];
    for (let year = targetParts.year - 1; year >= minYear; year--) years.push(year);
    const yearResults = await mapLimit(years, YEAR_CONCURRENCY, year => scanYear(target, filters, year));
    const selected = yearResults.filter(x => x.best).map(x => ({
      ...x.best,
      alternatives:x.matches.filter(m => rowKey(m) !== rowKey(x.best)).slice(0,3).map(m => ({
        date:m.date, city:m.city, raceNo:m.raceNo, referenceType:m.referenceType,
        transferabilityScore:m.transferabilityScore, distance:m.distance, track:m.track
      }))
    }));

    const baseUrl = getBaseUrl(req);
    const historicalRaces = await mapLimit(selected, RACE_CONCURRENCY, candidate => buildHistoricalRace({ baseUrl, candidate }));
    return res.status(200).json({
      ok:true,
      version:VERSION,
      target,
      rules:getRules(minYear),
      diagnostics:{
        scannedYearCount:years.length,
        selectedYearCount:selected.length,
        acceptedCandidateCount:yearResults.reduce((s,y)=>s+y.matchCount,0),
        queryDiagnostics:yearResults.flatMap(y=>y.diagnostics.map(d=>({ year:y.year, ...d })))
      },
      yearResults,
      historicalRaces,
      byYear:historicalRaces.map(r => ({
        year:r.sourceYear, ok:r.ok, date:r.date, city:r.city, raceNo:r.raceNo,
        referenceType:r.referenceType, transferabilityScore:r.transferabilityScore,
        top3:r.top3, error:r.error || null
      })),
      warning:selected.length ? '' : '±45 gün içinde tam eşleşme, aynı yarış ailesi veya koşul ikizi bulunamadı.'
    });
  } catch (e) {
    console.error('adaptive roadmap V10.1:', e);
    return res.status(500).json({ ok:false, version:VERSION, error:e?.message || 'Uyarlanabilir tarihsel yol oluşturulamadı.' });
  }
}
