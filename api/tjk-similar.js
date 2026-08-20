import * as cheerio from 'cheerio';

const VERSION = 'TJK-EXACT-HISTORY-V7.2.0';
const TJK = 'https://www.tjk.org';
const PAGE_URL = `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;
const DATA_URL = `${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;
const ROWS_URL = `${TJK}/TR/YarisSever/Query/DataRows/KosuSorgulama`;
const RESULT_INDEX_URL = `${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari`;
const SORT = 'Tarih desc, Sehir asc, KosuSirasi asc';
const DAY_WINDOW = 45;
const DEFAULT_MIN_YEAR = 2000;
const VERIFY_CONCURRENCY = 2;

const HEADERS = {
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:PAGE_URL,
  'cache-control':'no-cache'
};

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function upper(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
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

function isoToDisplay(iso = '', separator = '.') {
  const p = parseIso(iso);
  return p ? `${String(p.day).padStart(2,'0')}${separator}${String(p.month).padStart(2,'0')}${separator}${p.year}` : '';
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
  const xa = Date.UTC(x.year, x.month - 1, x.day);
  const ya = Date.UTC(y.year, y.month - 1, y.day);
  return Math.round(Math.abs(xa - ya) / 86400000);
}

function parseRaceFamily(v = '') {
  const t = normalizeClass(v);
  let m = t.match(/\bHANDIKAP\s*(\d+)\b/);
  if (m) return { family:'HANDIKAP', level:Number(m[1]) };
  m = t.match(/\bSARTLI\s*(\d+)\b/);
  if (m) return { family:'SARTLI', level:Number(m[1]) };
  m = t.match(/\bKV[- ]*(\d+)\b/);
  if (m) return { family:'KV', level:Number(m[1]) };
  m = t.match(/\b(?:G|GRUP)\s*-?\s*([123])\b/);
  if (m) return { family:'GROUP', level:Number(m[1]) };
  m = t.match(/^SATIS\s*-?\s*(\d+)\b/);
  if (m) return { family:'SATIS', level:Number(m[1]) };
  if (/^OPSIYONEL\s+SATIS\b/.test(t)) return { family:'OPSIYONEL_SATIS', level:null };
  if (/^MAIDEN\b/.test(t)) return { family:'MAIDEN', level:0 };
  if (/^SATIS\b/.test(t)) return { family:'SATIS', level:null };
  return { family:t.split('/')[0], level:null };
}

function canonicalDecoratorToken(v = '') {
  const t = upper(v).replace(/\s+/g, '');
  if (t === 'D' || t === 'DISI') return 'DISI';

  const y = t.match(/^Y-?(\d+)$/);
  if (y) return `Y${Number(y[1])}`;

  const h = t.match(/^H-?(\d+)$/);
  if (h) return `H${Number(h[1])}`;

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
  const family = parseRaceFamily(v);
  return `${family.family}:${family.level ?? ''}|${classTokens(v).join('/')}`;
}

/*
  TJK Koşu Sorgulama tablosu Y-0/Y-1/Y-2/Y-3 bilgisini bazı satırlarda
  Koşu Cinsi sütunundan düşürüyor. Bu anahtar yalnız ADAY bulmak içindir.
  Nihai kabul tam sonuç sayfasındaki koşu başlığıyla yapılır.
*/
function queryClassKey(v = '') {
  const family = parseRaceFamily(v);
  const tokens = classTokens(v).filter(x => !/^Y\d+$/.test(x));
  return `${family.family}:${family.level ?? ''}|${tokens.join('/')}`;
}

function optionList($, selector) {
  return $(selector).find('option').map((_, option) => ({
    value:clean($(option).attr('value') || ''),
    text:clean($(option).text())
  })).get();
}

function findClassOption(options, targetClass) {
  const target = parseRaceFamily(targetClass);
  return options.find(x => {
    const f = parseRaceFamily(x.text);
    return f.family === target.family && f.level === target.level;
  }) || null;
}

async function fetchText(url, options = {}, timeoutMs = 18000, attempts = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
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
      lastError = e?.name === 'AbortError' ? new Error('TJK doğrulama isteği zaman aşımına uğradı.') : e;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('TJK doğrulama isteği başarısız.');
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

async function postForm(url, data, allowMissingPage = false) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) body.set(key, String(value ?? ''));
  const response = await fetch(url, {
    method:'POST',
    headers:{
      ...HEADERS,
      'content-type':'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with':'XMLHttpRequest'
    },
    body:body.toString(),
    redirect:'follow'
  });

  if (allowMissingPage && response.status === 404) return null;
  if (!response.ok) throw new Error(`TJK POST HTTP ${response.status}`);
  return response.text();
}

function parseQueryTable(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const rows = [];

  $('table').each((_, table) => {
    const headers = $(table).find('thead th').map((__, th) => clean($(th).text())).get();
    const ix = re => headers.findIndex(x => re.test(clean(x)));
    const dateIx = ix(/^Tarih$/i);
    const cityIx = ix(/^Şehir$|^Sehir$/i);
    const raceIx = ix(/^Koşu$|^Kosu$/i);
    const ageIx = ix(/^Grup$/i);
    const classIx = ix(/Koşu Cinsi|Kosu Cinsi/i);
    const distanceIx = ix(/^Mesafe$/i);
    const trackIx = ix(/^Pist$/i);
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
        class:cells[classIx],
        distance:Number(String(cells[distanceIx] || '').match(/\d{3,4}/)?.[0] || 0),
        track:cells[trackIx]
      });
    });
  });
  return rows;
}

function parseRowsFragment(html) {
  if (!html) return [];
  const $ = cheerio.load(`<table><tbody>${html}</tbody></table>`);
  const rows = [];
  $('tr').each((_, tr) => {
    const cells = $(tr).find('td').map((__, td) => clean($(td).text())).get();
    if (cells.length < 8) return;
    const pd = parseDisplayDate(cells[0]);
    if (!pd) return;
    rows.push({
      date:pd.display,
      isoDate:pd.iso,
      city:cells[1],
      raceNo:Number(String(cells[2] || '').match(/\d+/)?.[0] || 0),
      ageGroup:cells[3],
      class:cells[4],
      distance:Number(String(cells[6] || '').match(/\d{3,4}/)?.[0] || 0),
      track:cells[7]
    });
  });
  return rows;
}

function rowKey(r) {
  return [r.isoDate, normalizeCity(r.city), r.raceNo, queryClassKey(r.class), ageKey(r.ageGroup), r.distance, normalizeTrack(r.track)].join('|');
}

function queryCondition(target, row) {
  return normalizeCity(target.city) === normalizeCity(row.city) &&
    queryClassKey(target.class) === queryClassKey(row.class) &&
    ageKey(target.ageGroup) === ageKey(row.ageGroup) &&
    Number(target.distance) === Number(row.distance) &&
    normalizeTrack(target.track) === normalizeTrack(row.track);
}

function exactCondition(target, condition) {
  return classCoreKey(target.class) === classCoreKey(condition.class) &&
    ageKey(target.ageGroup) === ageKey(condition.ageGroup) &&
    Number(target.distance) === Number(condition.distance) &&
    normalizeTrack(target.track) === normalizeTrack(condition.track);
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
  let promise = indexCache.get(dateIso);
  if (!promise) {
    const url = `${RESULT_INDEX_URL}?QueryParameter_Tarih=${encodeURIComponent(isoToDisplay(dateIso, '/'))}`;
    promise = fetchText(url, {}, 18000, 2);
    indexCache.set(dateIso, promise);
  }

  const html = await promise;
  const $ = cheerio.load(html);
  const target = upper(cityName);
  let found = '';

  $('a').each((_, a) => {
    if (found) return;
    const text = upper($(a).text());
    const href = String($(a).attr('href') || '');
    if (href.includes('GunlukYarisSonuclari') && text.startsWith(target)) {
      found = new URL(href, TJK).toString();
    }
  });

  if (!found) throw new Error(`${cityName} için ${dateIso} tarihli TJK sonuç sayfası bulunamadı.`);
  return found;
}

async function verifyCandidate(target, row, indexCache) {
  const resultUrl = await findCityResultUrl(row.isoDate, row.city, indexCache);
  const html = await fetchText(resultUrl, {}, 18000, 2);
  const condition = parseRaceConditionFromResult(html, row.raceNo);
  if (!condition) throw new Error(`${row.isoDate} ${row.city} ${row.raceNo}. koşu şartı sonuç sayfasından okunamadı.`);
  return {
    ok:exactCondition(target, condition),
    condition,
    resultUrl,
    fullClassKey:classCoreKey(condition.class)
  };
}

async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const output = new Array(list.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= list.length) return;
      output[index] = await worker(list[index], index);
    }
  }

  await Promise.all(Array.from({ length:Math.min(Math.max(1, limit), list.length || 1) }, () => run()));
  return output;
}

function sourceYearFor(targetDate, historicalIso, minYear) {
  const target = parseIso(targetDate);
  const historical = parseIso(historicalIso);
  if (!target || !historical || historicalIso >= targetDate) return null;
  let best = null;

  for (const year of [historical.year - 1, historical.year, historical.year + 1]) {
    if (year >= target.year || year < minYear) continue;
    const anchorDate = anchorIso(targetDate, year);
    const diff = daysBetween(anchorDate, historicalIso);
    if (diff === null || diff > DAY_WINDOW) continue;
    if (!best || diff < best.dayDifference) best = { sourceYear:year, anchorDate, dayDifference:diff };
  }
  return best;
}

async function fetchExactCandidateRows(target, filters, minYear, maxPages) {
  const form = {
    QueryParameter_Tarih_Start:`01.01.${minYear}`,
    QueryParameter_Tarih_End:isoToDisplay(target.date),
    QueryParameter_SehirId:filters.city.value,
    QueryParameter_IrkId:'',
    QueryParameter_GrupId:filters.group.value,
    QueryParameter_KosuCinsiId:filters.raceClass.value,
    QueryParameter_Cinsiyet:'',
    QueryParameter_APRANTIKODU:'',
    QueryParameter_Mesafe:String(target.distance),
    QueryParameter_PistId:filters.track.value,
    QueryParameter_BabaAdi:'',
    QueryParameter_AnneAdi:'',
    Era:'past',
    Sort:SORT
  };

  const first = parseQueryTable(await postForm(DATA_URL, form));
  const seen = new Map();
  first.forEach(row => seen.set(rowKey(row), row));
  const diagnostics = [{ page:1, rows:first.length, status:first.length ? 'TAMAM' : 'BOS' }];

  if (first.length < 50) return { rows:[...seen.values()], diagnostics };

  for (let page = 2; page <= maxPages; page++) {
    const raw = await postForm(ROWS_URL, { ...form, PageNumber:page, Sort:SORT }, true);
    if (raw === null) {
      diagnostics.push({ page, rows:0, status:'404_SAYFALAMA_BITTI' });
      break;
    }
    const rows = parseRowsFragment(raw);
    diagnostics.push({ page, rows:rows.length, status:rows.length ? 'TAMAM' : 'BOS' });
    if (!rows.length) break;
    const before = seen.size;
    rows.forEach(row => seen.set(rowKey(row), row));
    if (seen.size === before || rows.length < 50) break;
  }

  return { rows:[...seen.values()], diagnostics };
}

export default async function handler(req, res) {
  try {
    const date = clean(req.query.date || '');
    const city = clean(req.query.city || '');
    const raceClass = clean(req.query.class || '');
    const ageGroup = clean(req.query.ageGroup || '');
    const track = clean(req.query.track || '');
    const distance = Number(req.query.distance || 0);
    const targetParts = parseIso(date);

    if (!targetParts) return res.status(400).json({ ok:false, version:VERSION, error:'date YYYY-MM-DD biçiminde gerekli.' });
    if (!city || !raceClass || !ageGroup || !track || !Number.isFinite(distance) || distance <= 0) {
      return res.status(400).json({ ok:false, version:VERSION, error:'city, class, ageGroup, track ve distance gerekli.' });
    }

    const requestedMinYear = Number(req.query.minYear || DEFAULT_MIN_YEAR);
    const minYear = Math.min(targetParts.year - 1, Math.max(1950, Number.isFinite(requestedMinYear) ? requestedMinYear : DEFAULT_MIN_YEAR));
    const maxPages = Math.min(Math.max(Number(req.query.maxPages || 40), 1), 80);
    const target = { date, city, class:raceClass, ageGroup, track, distance };
    const filters = await resolveFilters(target);

    if (!filters.raceClass) throw new Error(`TJK Koşu Cinsi bulunamadı: ${raceClass}`);
    if (!filters.city) throw new Error(`TJK Şehir filtresi bulunamadı: ${city}`);
    if (!filters.group) throw new Error(`TJK Yaş grubu filtresi bulunamadı: ${ageGroup}`);
    if (!filters.track) throw new Error(`TJK Pist filtresi bulunamadı: ${track}`);

    const scan = await fetchExactCandidateRows(target, filters, minYear, maxPages);
    const coarseCandidates = [];

    for (const row of scan.rows) {
      if (row.isoDate >= target.date) continue;
      if (!queryCondition(target, row)) continue;
      const annual = sourceYearFor(target.date, row.isoDate, minYear);
      if (!annual) continue;
      coarseCandidates.push({ row, annual });
    }

    const indexCache = new Map();
    const verificationResults = await mapLimit(
      coarseCandidates,
      VERIFY_CONCURRENCY,
      async candidate => {
        try {
          const verification = await verifyCandidate(target, candidate.row, indexCache);
          return { ...candidate, verification, error:null };
        } catch (e) {
          return { ...candidate, verification:null, error:e?.message || String(e) };
        }
      }
    );

    const exactMatches = [];
    for (const item of verificationResults) {
      if (!item.verification?.ok) continue;
      const row = item.row;
      const annual = item.annual;
      const condition = item.verification.condition;
      exactMatches.push({
        date:row.isoDate,
        dateDisplay:row.date,
        city:row.city,
        raceNo:row.raceNo,
        class:condition.class,
        ageGroup:condition.ageGroup,
        distance:condition.distance,
        track:condition.track,
        sourceYear:annual.sourceYear,
        anchorDate:annual.anchorDate,
        calendarDayDifference:annual.dayDifference,
        similarity:100,
        raceConditionSimilarity:100,
        exact:true,
        exactFields:{ city:true, class:true, ageGroup:true, distance:true, track:true },
        queryClass:row.class,
        resultUrl:item.verification.resultUrl,
        verificationSource:'TJK_GUNLUK_YARIS_SONUCLARI'
      });
    }

    exactMatches.sort((a, b) => b.sourceYear - a.sourceYear || a.calendarDayDifference - b.calendarDayDifference || b.date.localeCompare(a.date));

    const yearResults = [];
    for (let year = targetParts.year - 1; year >= minYear; year--) {
      const matches = exactMatches.filter(x => x.sourceYear === year);
      yearResults.push({
        year,
        anchorDate:anchorIso(target.date, year),
        windowDays:DAY_WINDOW,
        matchCount:matches.length,
        matches
      });
    }

    const sampleRows = scan.rows.slice(0, 20).map(row => ({
      date:row.isoDate,
      city:row.city,
      raceNo:row.raceNo,
      ageGroup:row.ageGroup,
      class:row.class,
      distance:row.distance,
      track:row.track,
      normalizedClass:normalizeClass(row.class),
      classKey:classCoreKey(row.class),
      queryClassKey:queryClassKey(row.class),
      normalizedAge:ageKey(row.ageGroup),
      checks:{
        city:normalizeCity(target.city) === normalizeCity(row.city),
        queryClass:queryClassKey(target.class) === queryClassKey(row.class),
        fullClassFromQuery:classCoreKey(target.class) === classCoreKey(row.class),
        ageGroup:ageKey(target.ageGroup) === ageKey(row.ageGroup),
        distance:Number(target.distance) === Number(row.distance),
        track:normalizeTrack(target.track) === normalizeTrack(row.track)
      }
    }));

    const verificationDiagnostics = verificationResults.map(item => ({
      date:item.row.isoDate,
      city:item.row.city,
      raceNo:item.row.raceNo,
      queryClass:item.row.class,
      verified:item.verification?.ok === true,
      authoritativeClass:item.verification?.condition?.class || null,
      authoritativeClassKey:item.verification?.fullClassKey || null,
      error:item.error || null
    }));

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({
      ok:true,
      version:VERSION,
      target:{ ...target, classKey:classCoreKey(target.class), queryClassKey:queryClassKey(target.class) },
      rules:{
        mode:'EXACT_ONLY_WITH_AUTHORITATIVE_CLASS_VERIFY',
        pastDateOnly:true,
        yearByYear:true,
        calendarWindowDays:DAY_WINDOW,
        exactFields:['city','class','ageGroup','distance','track'],
        classIdentity:'family + level + canonical decorators; token order ignored; D=DİŞİ, Y-1=Y1, H-2=H2',
        queryTablePolicy:'Koşu Sorgulama Y-* tokenını düşürebildiği için Y-* yalnız aday bulmada opsiyoneldir; nihai sınıf TJK günlük sonuç sayfasından doğrulanır.',
        authoritativeVerification:'TJK Günlük Yarış Sonuçları tam koşu başlığı',
        partialConditionScores:false,
        conditionSimilarityForAcceptedRace:100,
        minYear
      },
      resolvedFilters:filters,
      diagnostics:{
        scanned:scan.rows.length,
        pagesRead:scan.diagnostics.length,
        pageDiagnostics:scan.diagnostics,
        coarseCandidateCount:coarseCandidates.length,
        verifiedCandidateCount:verificationResults.filter(x => x.verification?.ok).length,
        verificationErrorCount:verificationResults.filter(x => x.error).length,
        exactMatchCount:exactMatches.length,
        targetNormalized:{ class:normalizeClass(target.class), classKey:classCoreKey(target.class), queryClassKey:queryClassKey(target.class), ageGroup:ageKey(target.ageGroup), city:normalizeCity(target.city), track:normalizeTrack(target.track), distance:Number(target.distance) },
        sampleRows,
        verificationDiagnostics
      },
      searchedYears:{ from:targetParts.year - 1, to:minYear, count:Math.max(0, targetParts.year - minYear) },
      yearResults,
      years:yearResults,
      matchCount:exactMatches.length,
      returned:exactMatches.length,
      matches:exactMatches,
      source:'TJK_KOSU_SORGULAMA_CANDIDATE_PLUS_RESULT_PAGE_EXACT_VERIFY'
    });
  } catch (e) {
    console.error('tjk-similar exact V7.2.0:', e);
    return res.status(500).json({ ok:false, version:VERSION, error:e?.message || 'Tam tarihsel eşleşme hesaplanamadı.' });
  }
}
