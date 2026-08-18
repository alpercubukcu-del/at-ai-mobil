import * as cheerio from 'cheerio';

const VERSION = 'TJK-EXACT-HISTORY-V7';
const TJK = 'https://www.tjk.org';
const PAGE_URL = `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;
const DATA_URL = `${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;
const ROWS_URL = `${TJK}/TR/YarisSever/Query/DataRows/KosuSorgulama`;
const SORT = 'Tarih desc, Sehir asc, KosuSirasi asc';
const DEFAULT_MIN_YEAR = 2000;
const DAY_WINDOW = 45;

const HEADERS = {
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:PAGE_URL
};

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function upper(v = '') {
  return clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I');
}

function normalizeLetters(v = '') {
  return upper(v)
    .replace(/HANDIKAP/g, 'HANDIKAP')
    .replace(/SARTLI/g, 'SARTLI')
    .replace(/INGILIZ/g, 'INGILIZ');
}

function normalizeClass(v = '') {
  return normalizeLetters(v)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCity(v = '') {
  return normalizeLetters(v).replace(/[^A-Z0-9]/g, '');
}

function normalizeTrack(v = '') {
  const t = normalizeLetters(v);
  if (t.includes('SENTETIK')) return 'SENTETIK';
  if (t.includes('CIM')) return 'CIM';
  if (t.includes('KUM')) return 'KUM';
  return t;
}

function parseAgeGroup(v = '') {
  const t = normalizeLetters(v).replace(/\s+/g, ' ');
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
  const a = parseAgeGroup(v);
  if (!a.breed || a.min === null || a.max === null) return normalizeLetters(v).replace(/\s+/g, '');
  return `${a.breed}:${a.min}:${a.max}`;
}

function parseDateDisplay(value = '') {
  const m = clean(value).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const dd = String(m[1]).padStart(2, '0');
  const mm = String(m[2]).padStart(2, '0');
  return { display:`${dd}.${mm}.${m[3]}`, iso:`${m[3]}-${mm}-${dd}` };
}

function parseIso(value = '') {
  const m = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year:Number(m[1]), month:Number(m[2]), day:Number(m[3]), iso:clean(value) };
}

function isoToDisplay(iso = '') {
  const p = parseIso(iso);
  return p ? `${String(p.day).padStart(2,'0')}.${String(p.month).padStart(2,'0')}.${p.year}` : '';
}

function dateUtcMs(iso) {
  const p = parseIso(iso);
  return p ? Date.UTC(p.year, p.month - 1, p.day) : NaN;
}

function daysBetween(a, b) {
  const x = dateUtcMs(a);
  const y = dateUtcMs(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Math.round(Math.abs(x - y) / 86400000);
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

function exactCondition(target, row) {
  return (
    normalizeCity(target.city) === normalizeCity(row.city) &&
    normalizeClass(target.class) === normalizeClass(row.class) &&
    ageKey(target.ageGroup) === ageKey(row.ageGroup) &&
    Number(target.distance) === Number(row.distance) &&
    normalizeTrack(target.track) === normalizeTrack(row.track)
  );
}

function parseRaceFamily(value = '') {
  const t = normalizeClass(value);
  let m = t.match(/HANDIKAP\s*(\d+)/);
  if (m) return { family:'HANDIKAP', level:Number(m[1]) };
  m = t.match(/SARTLI\s*(\d+)/);
  if (m) return { family:'SARTLI', level:Number(m[1]) };
  m = t.match(/\bKV[- ]*(\d+)\b/);
  if (m) return { family:'KV', level:Number(m[1]) };
  m = t.match(/\bG([123])\b/);
  if (m) return { family:'GROUP', level:Number(m[1]) };
  if (t.includes('MAIDEN')) return { family:'MAIDEN', level:0 };
  if (t.includes('SATIS')) return { family:'SATIS', level:0 };
  return { family:t.split('/')[0], level:null };
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

function findCityOption(options, targetCity) {
  return options.find(x => normalizeCity(x.text) === normalizeCity(targetCity)) || null;
}

function findTrackOption(options, targetTrack) {
  return options.find(x => normalizeTrack(x.text) === normalizeTrack(targetTrack)) || null;
}

function findGroupOption(options, targetAgeGroup) {
  const key = ageKey(targetAgeGroup);
  return options.find(x => ageKey(x.text) === key) || null;
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers:HEADERS, redirect:'follow' });
  if (!response.ok) throw new Error(`TJK GET HTTP ${response.status}`);
  return response.text();
}

async function resolveFilters(target) {
  const html = await fetchHtml(PAGE_URL);
  const $ = cheerio.load(html);
  return {
    raceClass:findClassOption(optionList($, '#QueryParameter_KosuCinsiId'), target.class),
    city:findCityOption(optionList($, '#QueryParameter_SehirId'), target.city),
    track:findTrackOption(optionList($, '#QueryParameter_PistId'), target.track),
    group:findGroupOption(optionList($, '#QueryParameter_GrupId'), target.ageGroup)
  };
}

async function postForm(url, data) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    body.set(key, String(value));
  }
  const response = await fetch(url, {
    method:'POST',
    headers:{ ...HEADERS, 'content-type':'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with':'XMLHttpRequest' },
    body:body.toString(),
    redirect:'follow'
  });
  if (!response.ok) throw new Error(`TJK POST HTTP ${response.status}`);
  return response.text();
}

function getHeaders($, table) {
  return $(table).find('thead th').map((_, th) => clean($(th).text())).get();
}

function headerIndex(headers, re) {
  return headers.findIndex(x => re.test(clean(x)));
}

function parseQueryTable(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $('table').each((_, table) => {
    const headers = getHeaders($, table);
    const dateIx = headerIndex(headers, /^Tarih$/i);
    const cityIx = headerIndex(headers, /^Şehir$|^Sehir$/i);
    const raceIx = headerIndex(headers, /^Koşu$|^Kosu$/i);
    const ageIx = headerIndex(headers, /^Grup$/i);
    const classIx = headerIndex(headers, /Koşu Cinsi|Kosu Cinsi/i);
    const distanceIx = headerIndex(headers, /^Mesafe$/i);
    const trackIx = headerIndex(headers, /^Pist$/i);
    if ([dateIx,cityIx,raceIx,ageIx,classIx,distanceIx,trackIx].some(x => x < 0)) return;

    $(table).find('tbody tr').each((__, tr) => {
      const cells = $(tr).find('td').map((___, td) => clean($(td).text())).get();
      const pd = parseDateDisplay(cells[dateIx]);
      if (!pd) return;
      const raceNo = Number(String(cells[raceIx] || '').match(/\d+/)?.[0] || 0);
      const distance = Number(String(cells[distanceIx] || '').match(/\d{3,4}/)?.[0] || 0);
      rows.push({
        date:pd.display, isoDate:pd.iso, city:clean(cells[cityIx]), raceNo,
        ageGroup:clean(cells[ageIx]), class:clean(cells[classIx]), distance,
        track:clean(cells[trackIx])
      });
    });
  });
  return rows;
}

function parseRowsFragment(html) {
  const direct = parseQueryTable(html);
  if (direct.length) return direct;
  const wrapped = `<table><thead><tr><th>Tarih</th><th>Şehir</th><th>Koşu</th><th>Grup</th><th>Koşu Cinsi</th><th>Mesafe</th><th>Pist</th></tr></thead><tbody>${html}</tbody></table>`;
  return parseQueryTable(wrapped);
}

function rowKey(r) {
  return [r.isoDate, normalizeCity(r.city), r.raceNo, normalizeClass(r.class), ageKey(r.ageGroup), r.distance, normalizeTrack(r.track)].join('|');
}

function buildForm(target, filters, minYear) {
  return {
    QueryParameter_Tarih_Start:`01.01.${minYear}`,
    QueryParameter_Tarih_End:isoToDisplay(target.date),
    QueryParameter_SehirId:filters.city?.value || '',
    QueryParameter_IrkId:'',
    QueryParameter_GrupId:filters.group?.value || '',
    QueryParameter_KosuCinsiId:filters.raceClass?.value || '',
    QueryParameter_Cinsiyet:'',
    QueryParameter_APRANTIKODU:'',
    QueryParameter_Mesafe:String(target.distance),
    QueryParameter_PistId:filters.track?.value || '',
    QueryParameter_BabaAdi:'',
    QueryParameter_AnneAdi:'',
    Era:'past',
    Sort:SORT
  };
}

async function fetchAllRows(form, maxPages) {
  const seen = new Set();
  const rows = [];
  const diagnostics = [];

  function consume(incoming, page) {
    let added = 0;
    for (const row of incoming) {
      const key = rowKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
      added++;
    }
    diagnostics.push({ page, rows:incoming.length, newRows:added, status:incoming.length ? (added ? 'TAMAM' : 'TEKRAR') : 'BOS' });
    return added;
  }

  const firstHtml = await postForm(DATA_URL, form);
  const first = parseQueryTable(firstHtml);
  consume(first, 1);
  if (!first.length) return { rows, diagnostics };

  for (let page = 2; page <= maxPages; page++) {
    const html = await postForm(ROWS_URL, { ...form, PageNumber:page, Sort:SORT });
    const incoming = parseRowsFragment(html);
    const added = consume(incoming, page);
    if (!incoming.length || !added) break;
  }

  return { rows, diagnostics };
}

function matchAnchorYear(targetDate, historicalIso, minYear) {
  const target = parseIso(targetDate);
  const hist = parseIso(historicalIso);
  if (!target || !hist || historicalIso >= targetDate) return null;

  let best = null;
  for (const year of [hist.year - 1, hist.year, hist.year + 1]) {
    if (year >= target.year || year < minYear) continue;
    const anchor = anchorIso(targetDate, year);
    const diff = daysBetween(anchor, historicalIso);
    if (diff === null || diff > DAY_WINDOW) continue;
    if (!best || diff < best.dayDifference) best = { sourceYear:year, anchorDate:anchor, dayDifference:diff };
  }
  return best;
}

export default async function handler(req, res) {
  try {
    const date = clean(req.query.date || '');
    const city = clean(req.query.city || '');
    const raceClass = clean(req.query.class || '');
    const ageGroup = clean(req.query.ageGroup || '');
    const track = clean(req.query.track || '');
    const distance = Number(req.query.distance || 0);
    const maxPages = Math.min(Math.max(Number(req.query.maxPages || 40), 1), 80);
    const targetParts = parseIso(date);
    if (!targetParts) return res.status(400).json({ ok:false, version:VERSION, error:'date YYYY-MM-DD biçiminde gerekli.' });
    if (!city || !raceClass || !ageGroup || !track || !Number.isFinite(distance) || distance <= 0) {
      return res.status(400).json({ ok:false, version:VERSION, error:'city, class, ageGroup, track ve distance gerekli.' });
    }

    const requestedMinYear = Number(req.query.minYear || DEFAULT_MIN_YEAR);
    const minYear = Math.min(targetParts.year - 1, Math.max(1950, Number.isFinite(requestedMinYear) ? requestedMinYear : DEFAULT_MIN_YEAR));
    const target = { date, city, class:raceClass, ageGroup, track, distance };
    const filters = await resolveFilters(target);

    if (!filters.raceClass) throw new Error(`TJK Koşu Cinsi bulunamadı: ${raceClass}`);
    if (!filters.track) throw new Error(`TJK Pist filtresi bulunamadı: ${track}`);

    const form = buildForm(target, filters, minYear);
    const scan = await fetchAllRows(form, maxPages);

    const exactMatches = [];
    for (const row of scan.rows) {
      if (row.isoDate >= target.date) continue;
      if (!exactCondition(target, row)) continue;
      const anchor = matchAnchorYear(target.date, row.isoDate, minYear);
      if (!anchor) continue;
      exactMatches.push({
        date:row.isoDate,
        dateDisplay:row.date,
        city:row.city,
        raceNo:row.raceNo,
        class:row.class,
        ageGroup:row.ageGroup,
        distance:row.distance,
        track:row.track,
        sourceYear:anchor.sourceYear,
        anchorDate:anchor.anchorDate,
        calendarDayDifference:anchor.dayDifference,
        similarity:100,
        raceConditionSimilarity:100,
        exact:true,
        exactFields:{ city:true, class:true, ageGroup:true, distance:true, track:true }
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

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok:true,
      version:VERSION,
      target,
      rules:{
        mode:'EXACT_ONLY',
        pastDateOnly:true,
        yearByYear:true,
        calendarWindowDays:DAY_WINDOW,
        exactFields:['city','class','ageGroup','distance','track'],
        partialConditionScores:false,
        conditionSimilarityForAcceptedRace:100,
        minYear
      },
      resolvedFilters:{ raceClass:filters.raceClass, city:filters.city, group:filters.group, track:filters.track },
      diagnostics:{ pagesRead:scan.diagnostics.length, scanned:scan.rows.length, exactMatchCount:exactMatches.length, pageDiagnostics:scan.diagnostics },
      searchedYears:{ from:targetParts.year - 1, to:minYear, count:Math.max(0, targetParts.year - minYear) },
      yearResults,
      years:yearResults,
      matchCount:exactMatches.length,
      returned:exactMatches.length,
      matches:exactMatches,
      source:'TJK_KOSU_SORGULAMA_EXACT_YEAR_WINDOW'
    });
  } catch (e) {
    console.error('tjk-similar exact V7:', e);
    return res.status(500).json({ ok:false, version:VERSION, error:e?.message || 'Tam tarihsel eşleşme hesaplanamadı.' });
  }
}
