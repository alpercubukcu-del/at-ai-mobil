import * as cheerio from 'cheerio';

const VERSION = 'CAREER-WINS-V9.4';
const BASE_URL = 'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri';
const PAGE_SIZE = 50;
const TIMEOUT_MS = 20000;
const MIN_SCAN_YEAR = 1950;
const SEMANTIC_YEAR_RETRIES = 3;

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function upper(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseNumber(v) {
  const m = clean(v).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseIntValue(v) {
  const n = parseNumber(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseDate(v = '') {
  const s = clean(v);
  let m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? s : null;
}

function displayDate(iso = '') {
  const m = clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : clean(iso);
}

function normalizeHeader(v = '') {
  const k = upper(v).replace(/[^A-Z0-9]+/g, '');
  const aliases = {
    TARIH:'tarih', SEHIR:'sehir', MSF:'mesafe', MESAFE:'mesafe', PIST:'pist_raw',
    S:'sira', SIRA:'sira', DERECE:'derece', SIKLET:'siklet', TAKI:'taki', JOKEY:'jokey',
    ST:'st', GNY:'ganyan', GRUP:'grup', KNOKADI:'kosu_no_adi', KNOADI:'kosu_no_adi',
    KCINS:'kcins', ANT:'antrenor', ANTRENOR:'antrenor', SAHIP:'sahip', HP:'hp',
    IKRAMIYE:'ikramiye', S20:'s20'
  };
  return aliases[k] || k.toLowerCase();
}

function normalizeAgeGroup(v = '') {
  const x = clean(v).toLocaleUpperCase('tr-TR').replace(/\s+/g, '');
  const map = {
    '2İ':'2 Yaşlı İngilizler','2I':'2 Yaşlı İngilizler','3İ':'3 Yaşlı İngilizler','3I':'3 Yaşlı İngilizler',
    '3+İ':'3 ve Yukarı İngilizler','3+I':'3 ve Yukarı İngilizler','4İ':'4 Yaşlı İngilizler','4I':'4 Yaşlı İngilizler',
    '4+İ':'4 ve Yukarı İngilizler','4+I':'4 ve Yukarı İngilizler','2A':'2 Yaşlı Araplar','3A':'3 Yaşlı Araplar',
    '4A':'4 Yaşlı Araplar','4+A':'4 ve Yukarı Araplar','5+A':'5 ve Yukarı Araplar'
  };
  return map[x] || clean(v);
}

function normalizeClass(v = '') {
  return clean(v).replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ');
}

function splitTrack(v = '') {
  const raw = clean(v);
  const n = upper(raw);
  let surface = '';
  if (n.startsWith('C') || n.includes('CIM')) surface = 'Çim';
  else if (n.startsWith('K') || n.includes('KUM')) surface = 'Kum';
  else if (n.startsWith('S') || n.includes('SENTETIK')) surface = 'Sentetik';
  return { surface, condition:raw.includes(':') ? clean(raw.split(':').slice(1).join(':')) : '' };
}

function createSession() {
  return { cookie:'' };
}

function updateCookie(session, response) {
  let values = [];
  if (response.headers && typeof response.headers.getSetCookie === 'function') values = response.headers.getSetCookie();
  else {
    const raw = response.headers.get('set-cookie');
    if (raw) values = [raw];
  }
  if (!values.length) return;

  const jar = {};
  for (const pair of clean(session.cookie).split(';')) {
    const i = pair.indexOf('=');
    if (i > 0) jar[clean(pair.slice(0, i))] = clean(pair.slice(i + 1));
  }
  for (const header of values) {
    const pair = String(header).split(';')[0];
    const i = pair.indexOf('=');
    if (i > 0) jar[clean(pair.slice(0, i))] = clean(pair.slice(i + 1));
  }
  session.cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal:controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function downloadHorsePage(session, horseId, year = null) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const params = new URLSearchParams({ '1':'1', Era:'today', QueryParameter_AtId:String(horseId) });
      if (year) params.set('QueryParameter_Yil', String(year));

      const headers = {
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.6',
        Accept:'text/html, */*; q=0.01',
        Referer:'https://www.tjk.org/',
        'Cache-Control':'no-cache',
        Pragma:'no-cache'
      };
      if (session.cookie) headers.Cookie = session.cookie;

      const response = await fetchWithTimeout(`${BASE_URL}?${params.toString()}`, { headers, redirect:'follow' });
      updateCookie(session, response);
      if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);

      const html = await response.text();
      if (!html) throw new Error('TJK boş cevap döndürdü.');
      return { html, url:response.url };
    } catch (e) {
      lastError = e;
      if (attempt < 4) await sleep(attempt * 300);
    }
  }
  throw new Error(`At sayfası indirilemedi: ${lastError?.message || lastError}`);
}

function findHistoryTable($) {
  let found = null;
  $('table').each((_, table) => {
    if (found) return;
    const headers = $(table).find('th').map((__, th) => normalizeHeader($(th).text())).get();
    if (['tarih','sehir','mesafe','pist_raw','sira'].every(x => headers.includes(x))) found = { table, headers };
  });
  return found;
}

function extractHorseName($) {
  for (const selector of ['.horse-name','h2','h1','title']) {
    const t = clean($(selector).first().text());
    if (t) return t;
  }
  return '';
}

function extractMetadata(html) {
  const $ = cheerio.load(html);
  let careerTotal = null;
  const yearTotals = {};
  const listedYears = new Set();

  $('table').each((_, table) => {
    const tableText = upper($(table).text());
    if (!tableText.includes('INCILIK') || !tableText.includes('KAZANC')) return;
    $(table).find('tr').each((__, tr) => {
      const c = $(tr).find('th,td').map((___, cell) => clean($(cell).text())).get();
      if (c.length < 2) return;
      const first = upper(c[0]);
      const count = parseIntValue(c[1]);
      if (first === 'TOPLAM' && count !== null) careerTotal = count;
      const ym = first.match(/^((?:19|20)\d{2})(?: YILI)?$/);
      if (ym) {
        listedYears.add(Number(ym[1]));
        if (count !== null) yearTotals[ym[1]] = count;
      }
    });
  });

  $('select[name="QueryParameter_Yil"] option, select#QueryParameter_Yil option').each((_, option) => {
    const value = clean($(option).attr('value'));
    const text = clean($(option).text());
    const candidate = /^(?:19|20)\d{2}$/.test(value)
      ? value
      : (text.match(/(?:19|20)\d{2}/)?.[0] || '');
    if (candidate) listedYears.add(Number(candidate));
  });

  return {
    careerTotal,
    yearTotals,
    listedYears:[...listedYears].filter(Number.isFinite).sort((a, b) => b - a)
  };
}

function parseHistory(html, horseId, sourceUrl, fallbackHeaders = []) {
  const $ = cheerio.load(html);
  const horseName = extractHorseName($);
  const found = findHistoryTable($);
  const headers = found?.headers?.length ? found.headers : fallbackHeaders;
  if (!headers?.length) return { horseName, headers:[], rows:[] };

  let bodyRows = found ? $(found.table).find('tbody tr').toArray() : $('tbody tr').toArray();
  if (!bodyRows.length && found) bodyRows = $(found.table).find('tr').slice(1).toArray();
  if (!bodyRows.length && !found) bodyRows = $('tr').toArray();

  const rows = [];
  for (const tr of bodyRows) {
    const cells = $(tr).find('td').toArray();
    if (cells.length < 5) continue;

    const values = cells.map(td => clean($(td).text()));
    const record = {};
    for (let i = 0; i < Math.min(headers.length, values.length); i++) record[headers[i]] = values[i];

    const isoDate = parseDate(record.tarih);
    if (!isoDate) continue;

    const finish = parseIntValue(record.sira) ?? 0;
    const distance = parseIntValue(record.mesafe) ?? 0;
    const trk = splitTrack(record.pist_raw);
    const uniqueKey = [String(horseId), isoDate, upper(record.sehir), distance, finish, clean(record.derece)].join('|');

    rows.push({
      uniqueKey,
      horseId:String(horseId),
      horseName:horseName || '',
      isoDate,
      date:displayDate(isoDate),
      city:clean(record.sehir),
      distance,
      msf:distance,
      mesafe:distance,
      track:trk.surface,
      pist:trk.surface,
      trackRaw:clean(record.pist_raw),
      trackCondition:trk.condition,
      finish,
      rank:finish,
      sira:finish,
      degree:clean(record.derece) || null,
      weight:parseNumber(record.siklet),
      equipment:clean(record.taki) || null,
      jockey:clean(record.jokey) || null,
      startNo:parseIntValue(record.st),
      odds:parseNumber(record.ganyan),
      groupRaw:clean(record.grup) || null,
      ageGroup:normalizeAgeGroup(record.grup),
      raceNoName:clean(record.kosu_no_adi) || null,
      classRaw:clean(record.kcins) || null,
      class:normalizeClass(record.kcins),
      raceClass:normalizeClass(record.kcins),
      trainer:clean(record.antrenor) || null,
      owner:clean(record.sahip) || null,
      hp:parseNumber(record.hp),
      prize:parseNumber(record.ikramiye),
      s20:parseNumber(record.s20),
      sourceUrl
    });
  }
  return { horseName, headers, rows };
}

function uniqueHistory(rows = []) {
  const map = new Map();
  for (const row of rows) if (row?.uniqueKey) map.set(row.uniqueKey, row);
  return [...map.values()].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
}

function countsByYear(rows = []) {
  const out = {};
  for (const row of rows) {
    const year = String(row?.isoDate || '').slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    out[year] = (out[year] || 0) + 1;
  }
  return out;
}

async function readYearWithSemanticRetry({ horseId, year, headers, summaryExpected, sharedSession }) {
  let last = { rows:[], rawRows:0, attempts:0, semanticMismatch:false, error:null };

  for (let attempt = 1; attempt <= SEMANTIC_YEAR_RETRIES; attempt++) {
    try {
      const session = attempt === 1 ? sharedSession : createSession();
      const page = await downloadHorsePage(session, horseId, year);
      const parsed = parseHistory(page.html, horseId, page.url, headers);
      const allRows = uniqueHistory(parsed.rows);
      const sameYearRows = allRows.filter(row => row.isoDate.startsWith(`${year}-`));

      last = {
        rows:sameYearRows,
        rawRows:allRows.length,
        attempts:attempt,
        semanticMismatch:Number.isFinite(summaryExpected) && sameYearRows.length !== summaryExpected,
        error:null
      };

      if (!Number.isFinite(summaryExpected) || sameYearRows.length === summaryExpected) return last;
      if (attempt < SEMANTIC_YEAR_RETRIES) await sleep(250 * attempt);
    } catch (e) {
      last = {
        rows:[],
        rawRows:0,
        attempts:attempt,
        semanticMismatch:false,
        error:e?.message || String(e)
      };
      if (attempt < SEMANTIC_YEAR_RETRIES) await sleep(300 * attempt);
    }
  }

  return last;
}

async function collectCompleteHistory(horseId) {
  const session = createSession();
  const first = await downloadHorsePage(session, horseId);
  const parsedFirst = parseHistory(first.html, horseId, first.url);
  const metadata = extractMetadata(first.html);

  if (metadata.careerTotal === null) {
    throw new Error('TJK TAM GEÇMİŞ KONTROLÜ: kariyer toplamı okunamadı.');
  }

  const firstRows = uniqueHistory(parsedFirst.rows);
  const expectedFirst = Math.min(PAGE_SIZE, metadata.careerTotal);
  if (firstRows.length !== expectedFirst) {
    throw new Error(`TJK TAM GEÇMİŞ KONTROLÜ: ilk sayfada ${expectedFirst} kayıt beklenirken ${firstRows.length} kayıt ayrıştırıldı.`);
  }

  if (firstRows.length === metadata.careerTotal) {
    const yearCounts = countsByYear(firstRows);
    return {
      horseName:parsedFirst.horseName,
      history:firstRows,
      audit:{
        ...metadata,
        firstPageCount:firstRows.length,
        collectedTotal:firstRows.length,
        missingCount:0,
        strategy:'FIRST_PAGE',
        coverageStatus:'TAM',
        yearCounts,
        scannedYears:[],
        yearDiagnostics:[]
      }
    };
  }

  const oldestFirstYear = Number(firstRows[firstRows.length - 1]?.isoDate?.slice(0, 4));
  if (!Number.isFinite(oldestFirstYear)) {
    throw new Error('TJK TAM GEÇMİŞ KONTROLÜ: ilk 50 satırın en eski yılı belirlenemedi.');
  }

  // En kritik V9.4 farkı: ilk 50 satır ana havuzun parçasıdır.
  // Yıl filtresi bazı atlarda bir yılı boş/yanlış döndürse bile ilk 50 içindeki doğrulanmış kayıtlar kaybolmaz.
  const union = new Map(firstRows.map(row => [row.uniqueKey, row]));
  const scannedYears = [];
  const yearDiagnostics = [];

  // Eksik kayıtlar kronolojik olarak ilk sayfanın en eski satırından daha eskidir.
  // Bu yüzden en yeni yıldan 1950'ye kadar gereksiz tarama yerine yalnız sınır yıldan geriye gideriz.
  for (let year = oldestFirstYear; year >= MIN_SCAN_YEAR && union.size < metadata.careerTotal; year--) {
    const summaryExpected = metadata.yearTotals[String(year)];
    const result = await readYearWithSemanticRetry({
      horseId,
      year,
      headers:parsedFirst.headers,
      summaryExpected,
      sharedSession:session
    });

    const beforeSize = union.size;
    for (const row of result.rows) union.set(row.uniqueKey, row);
    const added = union.size - beforeSize;

    scannedYears.push(year);
    yearDiagnostics.push({
      year,
      summaryExpected:Number.isFinite(summaryExpected) ? summaryExpected : null,
      rawRows:result.rawRows,
      sameYearRows:result.rows.length,
      newRowsAdded:added,
      attempts:result.attempts,
      semanticMismatch:result.semanticMismatch,
      error:result.error
    });

    if (union.size > metadata.careerTotal) {
      throw new Error(`TJK TAM GEÇMİŞ KONTROLÜ: toplanan satır ${union.size}, TJK kariyer toplamı ${metadata.careerTotal}; fazla kayıt oluştu.`);
    }

    if (union.size < metadata.careerTotal) await sleep(80);
  }

  const collected = uniqueHistory([...union.values()]);
  if (collected.length !== metadata.careerTotal) {
    throw new Error(
      `TJK TAM GEÇMİŞ KONTROLÜ: sınır yıldan geriye tamamlama eksik; kariyer ${metadata.careerTotal}, ` +
      `toplanan ${collected.length}; taranan yıllar ${JSON.stringify(yearDiagnostics)}.`
    );
  }

  const yearCounts = countsByYear(collected);
  const summaryMismatches = Object.entries(metadata.yearTotals || {})
    .map(([year, expected]) => ({ year:Number(year), expected:Number(expected), collected:Number(yearCounts[year] || 0) }))
    .filter(x => Number.isFinite(x.expected) && x.expected !== x.collected);

  return {
    horseName:parsedFirst.horseName,
    history:collected,
    audit:{
      ...metadata,
      firstPageCount:firstRows.length,
      collectedTotal:collected.length,
      missingCount:0,
      strategy:'FIRST50_PLUS_BOUNDARY_YEAR_SCAN',
      coverageStatus:'TAM',
      yearCounts,
      scannedYears,
      yearDiagnostics,
      summaryMismatches
    }
  };
}

function applyBefore(rows, beforeIso) {
  return beforeIso ? rows.filter(row => row.isoDate < beforeIso) : rows;
}

function onlyWins(rows) {
  return rows.filter(row => Number(row.finish) === 1);
}

function buildSummary(wins) {
  return {
    totalWins:wins.length,
    totalTop5:wins.length,
    first:wins.length,
    second:0,
    third:0,
    fourth:0,
    fifth:0
  };
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  try {
    const horseId = clean(req.query.horseId || req.query.id || '');
    const beforeRaw = clean(req.query.before || '');
    if (!horseId) return res.status(400).json({ ok:false, version:VERSION, error:'horseId gerekli.' });

    const beforeIso = beforeRaw ? parseDate(beforeRaw) : '';
    if (beforeRaw && !beforeIso) {
      return res.status(400).json({ ok:false, version:VERSION, error:'before YYYY-MM-DD veya DD.MM.YYYY biçiminde olmalı.' });
    }

    const complete = await collectCompleteHistory(horseId);
    const frozenHistory = applyBefore(complete.history, beforeIso);
    const wins = onlyWins(frozenHistory);
    const futureLeakCount = beforeIso ? wins.filter(row => row.isoDate >= beforeIso).length : 0;
    if (futureLeakCount) throw new Error('Tarih sızıntısı tespit edildi.');

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      ok:true,
      version:VERSION,
      horseId:String(horseId),
      horseName:complete.horseName || null,
      before:beforeIso || null,
      rules:{
        source:'TJK AtKosuBilgileri',
        completeCareerRequired:true,
        historicalFreeze:beforeIso ? 'career_race_date < before' : 'NO_BEFORE_FILTER',
        historicalRaceDayExcluded:Boolean(beforeIso),
        finishFilter:'finish === 1',
        leakageProtection:Boolean(beforeIso),
        paginationReplacement:'first 50 + boundary-year descending scan until collectedTotal === TJK careerTotal',
        semanticYearRetry:SEMANTIC_YEAR_RETRIES
      },
      counts:{
        tjkCareerTotal:complete.audit.careerTotal,
        collectedTotal:complete.audit.collectedTotal,
        frozenCareerTotal:frozenHistory.length,
        wins:wins.length,
        top5:wins.length,
        distanceFilled:wins.filter(x => x.distance > 0).length,
        distanceMissing:wins.filter(x => !x.distance).length
      },
      summary:buildSummary(wins),
      audit:complete.audit,
      validation:{
        futureLeakCount,
        invalidFinishCount:wins.filter(x => x.finish !== 1).length,
        distanceMissingCount:wins.filter(x => !x.distance).length,
        ageGroupMissingCount:wins.filter(x => !clean(x.ageGroup)).length,
        classMissingCount:wins.filter(x => !clean(x.class)).length,
        valid:futureLeakCount === 0 && wins.every(x => x.finish === 1) && complete.audit.collectedTotal === complete.audit.careerTotal
      },
      roadmap:wins,
      wins,
      top5:wins,
      races:wins,
      source:{
        type:'TJK_AT_KOSU_BILGILERI',
        endpoint:BASE_URL,
        columns:{ date:'Tarih', city:'Şehir', distance:'Msf', track:'Pist', finish:'S', ageGroup:'Grup', class:'Kcins' },
        collection:{
          pageSize:PAGE_SIZE,
          strategy:complete.audit.strategy,
          firstPageSeeded:true,
          boundaryYearScan:true,
          semanticYearRetry:SEMANTIC_YEAR_RETRIES
        }
      },
      durationMs:Date.now() - startedAt
    });
  } catch (e) {
    console.error('tjk-career V9.4:', e);
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.message || 'At kariyer geçmişi alınamadı.',
      durationMs:Date.now() - startedAt
    });
  }
}
