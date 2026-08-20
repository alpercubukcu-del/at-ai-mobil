import * as cheerio from 'cheerio';

const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.2.7-FULL-CLASS';
const TJK = 'https://www.tjk.org';
const PAGE_URL = `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;
const DATA_URL = `${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;
const RESULT_INDEX_URL = `${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari`;
const SORT = 'Tarih desc, Sehir asc, KosuSirasi asc';
const DAY_WINDOW = 45;
const DEFAULT_MIN_YEAR = 2000;
const INTERNAL_RETRIES = 3;
const YEAR_CONCURRENCY = 2;
const QUERY_CONCURRENCY = 2;
const MODEL_TYPES = ['EXACT', 'RACE_FAMILY', 'CONDITION_TWIN'];

const HEADERS = {
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:'https://www.tjk.org/',
  'cache-control':'no-cache'
};

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function upper(v = '') {
  return clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

/*
 * TAM YARIŞ SINIFI KİMLİĞİ
 * ------------------------
 * Program sayfasında yarış grubundan önce ne yazıyorsa sınıf odur.
 * Aile/seviye ayrıştırması, ek silme, token sıralama, alias ve kısaltma yoktur.
 * Yalnız Unicode/büyük-küçük harf, genel boşluk ve '/' çevresindeki boşluk
 * gösterim farkları karşılaştırma anahtarında normalize edilir.
 */
function fullClassKey(v = '') {
  return upper(v)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

/* TJK sorgu tablosundaki sınıf yalnız arama ÖNCELİĞİ için ipucudur. Kabul/eleme yapmaz. */
function queryHeadKey(v = '') {
  return fullClassKey(v).split('/')[0].trim();
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

function displayTrack(v = '') {
  const t = normalizeTrack(v);
  if (t === 'SENTETIK') return 'Sentetik';
  if (t === 'CIM') return 'Çim';
  if (t === 'KUM') return 'Kum';
  return clean(v);
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

function parseIso(v = '') {
  const m = clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { year:Number(m[1]), month:Number(m[2]), day:Number(m[3]) } : null;
}

function parseDisplayDate(v = '') {
  const m = clean(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const dd = String(m[1]).padStart(2, '0');
  const mm = String(m[2]).padStart(2, '0');
  return { display:`${dd}.${mm}.${m[3]}`, iso:`${m[3]}-${mm}-${dd}` };
}

function isoToDisplay(iso = '', separator = '.') {
  const p = parseIso(iso);
  return p ? `${String(p.day).padStart(2,'0')}${separator}${String(p.month).padStart(2,'0')}${separator}${p.year}` : '';
}

function isoFromDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function addDays(iso, amount) {
  const p = parseIso(iso);
  if (!p) return null;
  return isoFromDate(new Date(Date.UTC(p.year, p.month - 1, p.day + amount)));
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function anchorIso(targetIso, year) {
  const p = parseIso(targetIso);
  if (!p) return null;
  const day = Math.min(p.day, daysInMonth(year, p.month));
  return `${year}-${String(p.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function daysBetween(a, b) {
  const x = parseIso(a), y = parseIso(b);
  if (!x || !y) return null;
  return Math.round(Math.abs(
    Date.UTC(x.year,x.month-1,x.day) - Date.UTC(y.year,y.month-1,y.day)
  ) / 86400000);
}

function optionList($, selector) {
  return $(selector).find('option').map((_, option) => ({
    value:clean($(option).attr('value') || ''),
    text:clean($(option).text())
  })).get();
}

async function fetchText(url, options = {}, timeoutMs = 25000) {
  let lastError = null;
  for (let attempt = 1; attempt <= INTERNAL_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        headers:{ ...HEADERS, ...(options.headers || {}) },
        redirect:'follow',
        signal:controller.signal
      });
      if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
      return await response.text();
    } catch (e) {
      lastError = e?.name === 'AbortError' ? new Error('TJK isteği zaman aşımına uğradı.') : e;
      if (attempt < INTERNAL_RETRIES) await new Promise(r => setTimeout(r, 250 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('TJK isteği başarısız.');
}

async function resolveFilters(target) {
  const html = await fetchText(PAGE_URL);
  const $ = cheerio.load(html);
  return {
    raceClass:null,
    city:optionList($, '#QueryParameter_SehirId').find(x => normalizeCity(x.text) === normalizeCity(target.city)) || null,
    group:optionList($, '#QueryParameter_GrupId').find(x => ageKey(x.text) === ageKey(target.ageGroup)) || null,
    track:optionList($, '#QueryParameter_PistId').find(x => normalizeTrack(x.text) === normalizeTrack(target.track)) || null
  };
}

async function postQueryForm(data) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) body.set(key, String(value ?? ''));
  return fetchText(DATA_URL, {
    method:'POST',
    headers:{
      'content-type':'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with':'XMLHttpRequest',
      referer:PAGE_URL
    },
    body:body.toString()
  });
}

function parseQueryTable(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const rows = [];

  $('table').each((_, table) => {
    const headers = $(table).find('thead th').map((__, th) => clean($(th).text())).get();
    const ix = re => headers.findIndex(x => re.test(clean(x)));
    const dateIx=ix(/^Tarih$/i), cityIx=ix(/^Şehir$|^Sehir$/i), raceIx=ix(/^Koşu$|^Kosu$/i);
    const ageIx=ix(/^Grup$/i), classIx=ix(/Koşu Cinsi|Kosu Cinsi/i), distanceIx=ix(/^Mesafe$/i), trackIx=ix(/^Pist$/i);
    if ([dateIx,cityIx,raceIx,ageIx,classIx,distanceIx,trackIx].some(x => x < 0)) return;

    $(table).find('tbody tr').each((__, tr) => {
      const cells = $(tr).find('td').map((___, td) => clean($(td).text())).get();
      const pd = parseDisplayDate(cells[dateIx]);
      if (!pd) return;
      rows.push({
        date:pd.display,
        isoDate:pd.iso,
        city:cells[cityIx],
        raceNo:Number(String(cells[raceIx] || '').match(/\d+/)?.[0] || 0),
        ageGroup:cells[ageIx],
        queryClass:cells[classIx],
        distance:normalizeDistance(cells[distanceIx]),
        track:cells[trackIx]
      });
    });
  });
  return rows;
}

function rowKey(r) {
  return [r.isoDate, normalizeCity(r.city), Number(r.raceNo || 0)].join('|');
}

function baseForm(target, filters, mode, startIso, endIso) {
  return {
    QueryParameter_Tarih_Start:isoToDisplay(startIso),
    QueryParameter_Tarih_End:isoToDisplay(endIso),
    QueryParameter_SehirId:mode === 'SAME_CITY' ? filters.city.value : '',
    QueryParameter_IrkId:'',
    QueryParameter_GrupId:filters.group.value,
    /* Yarış sınıfı TJK sorgusunda BİLEREK boş: eksik/kısaltılmış sınıf filtresi veri kaybettirmesin. */
    QueryParameter_KosuCinsiId:'',
    QueryParameter_Cinsiyet:'',
    QueryParameter_APRANTIKODU:'',
    QueryParameter_Mesafe:mode === 'CONDITION_TWIN' ? String(target.distance) : '',
    QueryParameter_PistId:mode === 'CONDITION_TWIN' ? filters.track.value : '',
    QueryParameter_BabaAdi:'',
    QueryParameter_AnneAdi:'',
    Era:'past',
    Sort:SORT
  };
}

async function fetchRange(target, filters, mode, startIso, endIso, depth = 0) {
  const rows = parseQueryTable(await postQueryForm(baseForm(target, filters, mode, startIso, endIso)));
  const diagnostics = [{ mode, start:startIso, end:endIso, rows:rows.length, splitDepth:depth }];
  if (rows.length < 50 || depth >= 5 || startIso >= endIso) return { rows, diagnostics };

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

function parseCondition(value = '') {
  const text = clean(value);
  const parts = text.split(',').map(clean).filter(Boolean);
  const dm = text.match(/\b(\d{3,4})\s+(?:Çim|Kum|Sentetik)\b/i);
  return {
    class:parts[0] || '',
    ageGroup:parts[1] || '',
    distance:dm ? Number(dm[1]) : 0,
    track:displayTrack(text),
    raw:text
  };
}

function parseRaceConditionFromResult(html, requestedRaceNo) {
  const $ = cheerio.load(html);
  let activeRaceNo = null;
  let activeCondition = '';
  let result = null;

  $('h3, table').each((_, el) => {
    if (result) return;
    const tag = String(el.tagName || el.name || '').toLowerCase();
    if (tag === 'h3') {
      const text = clean($(el).text());
      const rm = text.match(/^(\d+)\.\s*Koşu\b/i);
      if (rm) {
        activeRaceNo = Number(rm[1]);
        activeCondition = '';
        return;
      }
      if (activeRaceNo && !activeCondition && /(?:Kum|Çim|Sentetik)/i.test(text)) activeCondition = text;
      return;
    }
    if (tag === 'table' && Number(activeRaceNo) === Number(requestedRaceNo) && activeCondition) {
      result = parseCondition(activeCondition);
    }
  });
  return result;
}

async function findCityResultUrl(dateIso, cityName, indexCache) {
  const cacheKey = dateIso;
  let promise = indexCache.get(cacheKey);
  if (!promise) {
    promise = fetchText(`${RESULT_INDEX_URL}?QueryParameter_Tarih=${encodeURIComponent(isoToDisplay(dateIso, '/'))}`, {}, 18000);
    indexCache.set(cacheKey, promise);
  }
  const html = await promise;
  const $ = cheerio.load(html);
  const target = upper(cityName);
  let found = '';
  $('a').each((_, a) => {
    if (found) return;
    const text = upper($(a).text());
    const href = String($(a).attr('href') || '');
    if (href.includes('GunlukYarisSonuclari') && text.startsWith(target)) found = new URL(href, TJK).toString();
  });
  if (!found) throw new Error(`${cityName} için ${dateIso} tarihli TJK yarış sonucu bulunamadı.`);
  return found;
}

async function fetchAuthoritativeCondition(row, caches) {
  const raceKey = rowKey(row);
  if (caches.race.has(raceKey)) return caches.race.get(raceKey);

  const promise = (async () => {
    const dayCityKey = `${row.isoDate}|${normalizeCity(row.city)}`;
    let htmlPromise = caches.dayCity.get(dayCityKey);
    if (!htmlPromise) {
      htmlPromise = (async () => {
        const resultUrl = await findCityResultUrl(row.isoDate, row.city, caches.index);
        return { resultUrl, html:await fetchText(resultUrl, {}, 18000) };
      })();
      caches.dayCity.set(dayCityKey, htmlPromise);
    }
    const { resultUrl, html } = await htmlPromise;
    const condition = parseRaceConditionFromResult(html, row.raceNo);
    if (!condition?.class) throw new Error('TJK sonuç sayfasında yarış sınıfı okunamadı.');
    return { ...condition, resultUrl };
  })();

  caches.race.set(raceKey, promise);
  try { return await promise; }
  catch (e) { caches.race.delete(raceKey); throw e; }
}

function structuralType(target, row) {
  if (ageKey(target.ageGroup) !== ageKey(row.ageGroup)) return null;
  const city = normalizeCity(target.city) === normalizeCity(row.city);
  const distance = Number(target.distance) === Number(row.distance);
  const track = normalizeTrack(target.track) === normalizeTrack(row.track);
  if (city && distance && track) return 'EXACT';
  if (city) return 'RACE_FAMILY';
  if (distance && track) return 'CONDITION_TWIN';
  return null;
}

function calendarPenalty(days) {
  return days <= 7 ? 0 : days <= 21 ? 3 : 5;
}

function transferability(target, row, type, calendarDayDifference) {
  const city = normalizeCity(target.city) === normalizeCity(row.city);
  const distance = Number(target.distance) === Number(row.distance);
  const track = normalizeTrack(target.track) === normalizeTrack(row.track);
  const distanceDiff = Math.abs(Number(target.distance) - Number(row.distance));
  const distanceDiffPct = target.distance ? (distanceDiff / Number(target.distance)) * 100 : 100;
  let score = 100;
  if (!city) score -= 15;
  score -= Math.min(45, Math.round(distanceDiffPct));
  if (!track) score -= 35;
  score -= calendarPenalty(calendarDayDifference);
  score = Math.max(0, Math.min(100, score));
  const tier = score >= 85 ? 'HIGH' : score >= 70 ? 'MEDIUM' : score >= 50 ? 'SUPPORT' : 'LOW';
  const color = tier === 'HIGH' ? 'GREEN' : tier === 'MEDIUM' ? 'YELLOW' : tier === 'SUPPORT' ? 'ORANGE' : 'RED';
  const label = type === 'EXACT' ? 'TAM TARİHSEL EŞLEŞME' : type === 'CONDITION_TWIN' ? 'KOŞUL İKİZİ' : 'AYNI YARIŞ AİLESİ';
  return { score, tier, color, label, city, distance, track, distanceDiff, distanceDiffPct:Math.round(distanceDiffPct) };
}

async function verifyCandidate(target, row, sourceYear, anchorDate, caches) {
  try {
    const authoritative = await fetchAuthoritativeCondition(row, caches);
    const classMatch = fullClassKey(target.class) === fullClassKey(authoritative.class);
    const ageMatch = ageKey(target.ageGroup) === ageKey(authoritative.ageGroup);

    if (!classMatch || !ageMatch) {
      return {
        accepted:null,
        reason:!classMatch ? 'FULL_CLASS_MISMATCH' : 'AGE_MISMATCH',
        authoritativeClass:authoritative.class,
        authoritativeClassKey:fullClassKey(authoritative.class)
      };
    }

    const authoritativeRow = {
      ...row,
      ageGroup:authoritative.ageGroup,
      distance:normalizeDistance(authoritative.distance || row.distance),
      track:authoritative.track || row.track
    };
    const type = structuralType(target, authoritativeRow);
    if (!type) return { accepted:null, reason:'STRUCTURE_MISMATCH', authoritativeClass:authoritative.class };

    const calendarDayDifference = daysBetween(anchorDate, row.isoDate);
    if (calendarDayDifference === null || calendarDayDifference > DAY_WINDOW) {
      return { accepted:null, reason:'CALENDAR_WINDOW_MISMATCH', authoritativeClass:authoritative.class };
    }

    const tr = transferability(target, authoritativeRow, type, calendarDayDifference);
    return {
      accepted:{
        date:row.isoDate,
        dateDisplay:row.date,
        city:row.city,
        raceNo:row.raceNo,
        sourceYear,
        anchorDate,
        calendarDayDifference,
        referenceType:type,
        referenceLabel:tr.label,
        transferabilityScore:tr.score,
        transferabilityTier:tr.tier,
        transferabilityColor:tr.color,
        explanation:`${tr.label} · tam sınıf TJK sonuç sayfasından doğrulandı`,
        exact:type === 'EXACT',
        exactConditionMatch:type === 'EXACT',
        class:authoritative.class,
        authoritativeClass:authoritative.class,
        fullClassVerified:true,
        ageGroup:authoritative.ageGroup,
        distance:authoritativeRow.distance,
        track:authoritativeRow.track,
        queryClass:row.queryClass || null,
        exactFields:{ city:tr.city, class:true, ageGroup:true, distance:tr.distance, track:tr.track },
        distanceDifference:tr.distanceDiff,
        distanceDifferencePct:tr.distanceDiffPct,
        classVerification:{
          strategy:'PROGRAM_TO_TJK_RESULT_FULL_TEXT',
          target:clean(target.class),
          targetKey:fullClassKey(target.class),
          result:authoritative.class,
          resultKey:fullClassKey(authoritative.class),
          queryTableClass:row.queryClass || null,
          queryTableClassUsedForAcceptance:false,
          resultUrl:authoritative.resultUrl
        }
      },
      reason:'ACCEPTED'
    };
  } catch (e) {
    return { accepted:null, reason:'RESULT_FETCH_FAILED', error:e?.message || String(e) };
  }
}

function candidatePriority(target, anchorDate, row) {
  const headHint = queryHeadKey(row.queryClass) === queryHeadKey(target.class) ? 0 : 1;
  const day = daysBetween(anchorDate, row.isoDate) ?? 999;
  return { headHint, day };
}

async function scanYear({ target, filters, year, caches }) {
  const anchorDate = anchorIso(target.date, year);
  const startIso = addDays(anchorDate, -DAY_WINDOW);
  const endIso = addDays(anchorDate, DAY_WINDOW);
  const modes = ['SAME_CITY', 'CONDITION_TWIN'];

  const scans = await Promise.all(modes.map(mode => fetchRange(target, filters, mode, startIso, endIso)));
  const seen = new Map();
  for (const scan of scans) {
    for (const row of scan.rows) {
      if (!row.isoDate || row.isoDate >= target.date || !row.raceNo) continue;
      if (!structuralType(target, row)) continue;
      seen.set(rowKey(row), row);
    }
  }

  const rows = [...seen.values()].sort((a,b) => {
    const pa = candidatePriority(target, anchorDate, a);
    const pb = candidatePriority(target, anchorDate, b);
    return pa.headHint - pb.headHint || pa.day - pb.day || b.isoDate.localeCompare(a.isoDate) || a.raceNo - b.raceNo;
  });

  const accepted = [];
  const attempts = [];
  const foundTypes = new Set();

  for (const row of rows) {
    const preliminaryType = structuralType(target, row);
    if (!preliminaryType || foundTypes.has(preliminaryType)) continue;
    const result = await verifyCandidate(target, row, year, anchorDate, caches);
    attempts.push({
      date:row.isoDate,
      city:row.city,
      raceNo:row.raceNo,
      preliminaryType,
      queryClass:row.queryClass || null,
      queryClassUsedForAcceptance:false,
      reason:result.reason,
      authoritativeClass:result.authoritativeClass || null,
      error:result.error || null
    });
    if (!result.accepted) continue;
    accepted.push(result.accepted);
    foundTypes.add(result.accepted.referenceType);
    if (foundTypes.size === MODEL_TYPES.length) break;
  }

  accepted.sort((a,b) =>
    Number(b.transferabilityScore || 0) - Number(a.transferabilityScore || 0) ||
    Number(a.calendarDayDifference || 999) - Number(b.calendarDayDifference || 999)
  );

  return {
    year,
    anchorDate,
    startIso,
    endIso,
    windowDays:DAY_WINDOW,
    candidatePoolCount:rows.length,
    matchCount:accepted.length,
    verifiedMatchCount:accepted.length,
    best:accepted[0] || null,
    matches:accepted,
    classVerificationAttempts:attempts,
    diagnostics:scans.flatMap((scan, i) => scan.diagnostics.map(d => ({ queryMode:modes[i], ...d })))
  };
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

function getRules(minYear) {
  return {
    pastDateOnly:true,
    yearByYear:true,
    calendarWindowDays:DAY_WINDOW,
    classFilterInTjkQuery:false,
    classFromProgramPreserved:true,
    authoritativeClassSource:'TJK_GUNLUK_YARIS_SONUCLARI',
    fullClassVerificationFromResultPage:true,
    queryTableClassForPriorityOnly:true,
    queryTableClassUsedForAcceptance:false,
    classIdentity:'Programdaki yarış grubundan önce yazan sınıfın TAM metni; ek/token silme veya aileye indirgeme yok.',
    harmlessNormalizationOnly:['Unicode büyük/küçük harf','boşluk','/ çevresindeki boşluk'],
    forbiddenClassTransforms:['family/level reduction','decorator removal','token sorting','D=Dişi alias','trailing slash removal','SATIŞ/Handikap/Şartlı kısaltma'],
    sameAgeGroupRequired:true,
    modelTypes:MODEL_TYPES,
    minYear
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const startedAt = Date.now();

  try {
    const date = clean(req.query?.date || '');
    const city = clean(req.query?.city || '');
    const raceClass = clean(req.query?.class || '');
    const ageGroup = clean(req.query?.ageGroup || '');
    const track = clean(req.query?.track || '');
    const distance = normalizeDistance(req.query?.distance);
    const targetParts = parseIso(date);

    if (!targetParts) return res.status(400).json({ ok:false, version:VERSION, error:'date YYYY-MM-DD biçiminde gerekli.' });
    if (!city || !raceClass || !ageGroup || !track || !distance) {
      return res.status(400).json({ ok:false, version:VERSION, error:'city, class, ageGroup, track ve distance gerekli.' });
    }

    const requestedMinYear = Number(req.query?.minYear || DEFAULT_MIN_YEAR);
    const minYear = Math.min(targetParts.year - 1, Math.max(1950, Number.isFinite(requestedMinYear) ? requestedMinYear : DEFAULT_MIN_YEAR));
    const target = { date, city, class:raceClass, ageGroup, track, distance };
    const filters = await resolveFilters(target);

    if (!filters.city) throw new Error(`TJK Şehir filtresi bulunamadı: ${city}`);
    if (!filters.group) throw new Error(`TJK Yaş grubu filtresi bulunamadı: ${ageGroup}`);
    if (!filters.track) throw new Error(`TJK Pist filtresi bulunamadı: ${track}`);

    const years = [];
    for (let year = targetParts.year - 1; year >= minYear; year--) years.push(year);
    const caches = { index:new Map(), dayCity:new Map(), race:new Map() };

    const yearResults = await mapLimit(
      years,
      YEAR_CONCURRENCY,
      year => scanYear({ target, filters, year, caches })
    );

    const verifiedHistoricalRaces = yearResults.flatMap(y => y.matches || []);
    const historicalRaces = [...verifiedHistoricalRaces];

    return res.status(200).json({
      ok:true,
      version:VERSION,
      target:{ ...target, fullClassText:raceClass, fullClassKey:fullClassKey(raceClass) },
      resolvedFilters:{
        raceClass:null,
        classFilterMode:'NONE',
        city:filters.city,
        group:filters.group,
        track:filters.track
      },
      rules:getRules(minYear),
      diagnostics:{
        scannedYearCount:years.length,
        yearsWithCandidates:yearResults.filter(y => y.candidatePoolCount > 0).length,
        selectedYearCount:yearResults.filter(y => y.matches?.length).length,
        verifiedYearCount:yearResults.filter(y => y.matches?.length).length,
        acceptedCandidateCount:verifiedHistoricalRaces.length,
        classVerificationAttempts:yearResults.reduce((s,y) => s + (y.classVerificationAttempts?.length || 0), 0),
        queryDiagnostics:yearResults.flatMap(y => y.diagnostics.map(d => ({ year:y.year, ...d }))),
        durationMs:Date.now() - startedAt
      },
      yearResults,
      historicalRaces,
      verifiedHistoricalRaces,
      byYear:verifiedHistoricalRaces.map(r => ({
        year:r.sourceYear,
        ok:true,
        date:r.date,
        city:r.city,
        raceNo:r.raceNo,
        referenceType:r.referenceType,
        transferabilityScore:r.transferabilityScore,
        authoritativeClass:r.authoritativeClass,
        fullClassVerified:true
      })),
      warning:verifiedHistoricalRaces.length ? '' : '±45 gün içinde programdaki tam sınıfı TJK sonuç sayfasında doğrulanmış tarihsel aday bulunamadı.'
    });
  } catch (e) {
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.message || 'Tam yarış sınıfı tarihsel taraması başarısız.',
      classMatching:{
        strategy:'PROGRAM_TO_TJK_RESULT_FULL_TEXT',
        classFilterInTjkQuery:false,
        shortening:false,
        decoratorsRemoved:false,
        queryTableClassUsedForAcceptance:false
      }
    });
  }
}
