import * as cheerio from 'cheerio';

const VERSION = 'CAREER-ADAPTIVE-V10.0';
const BASE_URL = 'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri';
const PAGE_SIZE = 50;
const TIMEOUT_MS = 20000;
const MIN_SCAN_YEAR = 1950;
const YEAR_RETRIES = 3;

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function upper(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
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
function createSession() { return { cookie:'' }; }
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
  try { return await fetch(url, { ...options, signal:controller.signal }); }
  finally { clearTimeout(timer); }
}
async function downloadHorsePage(session, horseId, year = null) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const params = new URLSearchParams({ '1':'1', Era:'today', QueryParameter_AtId:String(horseId) });
      if (year) params.set('QueryParameter_Yil', String(year));
      const headers = {
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.6', Accept:'text/html, */*; q=0.01',
        Referer:'https://www.tjk.org/', 'Cache-Control':'no-cache', Pragma:'no-cache'
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
    const candidate = /^(?:19|20)\d{2}$/.test(value) ? value : (text.match(/(?:19|20)\d{2}/)?.[0] || '');
    if (candidate) listedYears.add(Number(candidate));
  });
  return { careerTotal, yearTotals, listedYears:[...listedYears].filter(Number.isFinite).sort((a,b)=>b-a) };
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
    const uniqueKey = [String(horseId), isoDate, upper(record.sehir), distance, finish, clean(record.derece), normalizeClass(record.kcins)].join('|');
    rows.push({
      uniqueKey, horseId:String(horseId), horseName:horseName || '', isoDate, date:displayDate(isoDate),
      city:clean(record.sehir), distance, msf:distance, mesafe:distance, track:trk.surface, pist:trk.surface,
      trackRaw:clean(record.pist_raw), trackCondition:trk.condition, finish, rank:finish, sira:finish,
      degree:clean(record.derece) || null, weight:parseNumber(record.siklet), equipment:clean(record.taki) || null,
      jockey:clean(record.jokey) || null, startNo:parseIntValue(record.st), odds:parseNumber(record.ganyan),
      groupRaw:clean(record.grup) || null, ageGroup:normalizeAgeGroup(record.grup), raceNoName:clean(record.kosu_no_adi) || null,
      classRaw:clean(record.kcins) || null, class:normalizeClass(record.kcins), raceClass:normalizeClass(record.kcins),
      trainer:clean(record.antrenor) || null, owner:clean(record.sahip) || null, hp:parseNumber(record.hp),
      prize:parseNumber(record.ikramiye), s20:parseNumber(record.s20), sourceUrl
    });
  }
  return { horseName, headers, rows };
}
function uniqueHistory(rows = []) {
  const map = new Map();
  for (const row of rows) if (row?.uniqueKey) map.set(row.uniqueKey, row);
  return [...map.values()].sort((a,b)=>b.isoDate.localeCompare(a.isoDate));
}
function countsByYear(rows = []) {
  const out = {};
  for (const row of rows) {
    const year = String(row?.isoDate || '').slice(0,4);
    if (/^\d{4}$/.test(year)) out[year] = (out[year] || 0) + 1;
  }
  return out;
}
async function readYear({ horseId, year, headers, summaryExpected, sharedSession }) {
  let last = { rows:[], rawRows:0, attempts:0, semanticMismatch:false, error:null };
  for (let attempt = 1; attempt <= YEAR_RETRIES; attempt++) {
    try {
      const session = attempt === 1 ? sharedSession : createSession();
      const page = await downloadHorsePage(session, horseId, year);
      const parsed = parseHistory(page.html, horseId, page.url, headers);
      const allRows = uniqueHistory(parsed.rows);
      const sameYearRows = allRows.filter(row => row.isoDate.startsWith(`${year}-`));
      last = {
        rows:sameYearRows, rawRows:allRows.length, attempts:attempt,
        semanticMismatch:Number.isFinite(summaryExpected) && sameYearRows.length !== summaryExpected,
        error:null
      };
      if (!Number.isFinite(summaryExpected) || sameYearRows.length === summaryExpected) return last;
      if (attempt < YEAR_RETRIES) await sleep(250 * attempt);
    } catch (e) {
      last = { rows:[], rawRows:0, attempts:attempt, semanticMismatch:false, error:e?.message || String(e) };
      if (attempt < YEAR_RETRIES) await sleep(300 * attempt);
    }
  }
  return last;
}
async function collectHistory(horseId) {
  const session = createSession();
  const first = await downloadHorsePage(session, horseId);
  const parsedFirst = parseHistory(first.html, horseId, first.url);
  const metadata = extractMetadata(first.html);
  const firstRows = uniqueHistory(parsedFirst.rows);
  const expectedFirst = Number.isFinite(metadata.careerTotal) ? Math.min(PAGE_SIZE, metadata.careerTotal) : null;
  const union = new Map(firstRows.map(row => [row.uniqueKey, row]));
  const yearDiagnostics = [];
  const years = new Set(metadata.listedYears);
  for (const year of Object.keys(metadata.yearTotals || {})) years.add(Number(year));
  for (const row of firstRows) years.add(Number(row.isoDate.slice(0,4)));

  const sortedYears = [...years].filter(Number.isFinite).sort((a,b)=>b-a);
  for (const year of sortedYears) {
    const summaryExpected = metadata.yearTotals[String(year)];
    const currentCount = [...union.values()].filter(row => row.isoDate.startsWith(`${year}-`)).length;
    if (Number.isFinite(summaryExpected) && currentCount === summaryExpected) continue;
    const result = await readYear({ horseId, year, headers:parsedFirst.headers, summaryExpected, sharedSession:session });
    const beforeSize = union.size;
    for (const row of result.rows) union.set(row.uniqueKey, row);
    yearDiagnostics.push({
      year, summaryExpected:Number.isFinite(summaryExpected) ? summaryExpected : null,
      currentBefore:currentCount, rawRows:result.rawRows, sameYearRows:result.rows.length,
      newRowsAdded:union.size - beforeSize, attempts:result.attempts,
      semanticMismatch:result.semanticMismatch, error:result.error
    });
  }

  if (Number.isFinite(metadata.careerTotal) && union.size < metadata.careerTotal) {
    const oldest = Math.min(...[...union.values()].map(row => Number(row.isoDate.slice(0,4))).filter(Number.isFinite));
    if (Number.isFinite(oldest)) {
      for (let year = oldest; year >= MIN_SCAN_YEAR && union.size < metadata.careerTotal; year--) {
        if (sortedYears.includes(year)) continue;
        const result = await readYear({ horseId, year, headers:parsedFirst.headers, summaryExpected:metadata.yearTotals[String(year)], sharedSession:session });
        const beforeSize = union.size;
        for (const row of result.rows) union.set(row.uniqueKey, row);
        yearDiagnostics.push({
          year, summaryExpected:Number.isFinite(metadata.yearTotals[String(year)]) ? metadata.yearTotals[String(year)] : null,
          currentBefore:null, rawRows:result.rawRows, sameYearRows:result.rows.length,
          newRowsAdded:union.size - beforeSize, attempts:result.attempts,
          semanticMismatch:result.semanticMismatch, error:result.error, fallback:true
        });
        if (!result.rows.length && year < oldest - 12) break;
      }
    }
  }

  const history = uniqueHistory([...union.values()]);
  const collectedTotal = history.length;
  const careerTotal = metadata.careerTotal;
  let coverageStatus = 'TAM';
  let warning = null;
  if (Number.isFinite(careerTotal) && collectedTotal !== careerTotal) {
    coverageStatus = collectedTotal > 0 ? 'KISMİ' : 'HATA';
    warning = `TJK kariyer toplamı ${careerTotal}, doğrulanan kayıt ${collectedTotal}. Eksik kayıtlar analizde veri hatası olarak işaretlendi.`;
  } else if (!Number.isFinite(careerTotal)) {
    coverageStatus = collectedTotal > 0 ? 'KISMİ' : 'HATA';
    warning = 'TJK kariyer toplamı okunamadı; bulunan yarış satırlarıyla kısmi analiz yapıldı.';
  }

  if (!history.length && Number(careerTotal || 0) > 0) {
    throw new Error(`TJK geçmişi var fakat yarış satırları ayrıştırılamadı; kariyer toplamı ${careerTotal}.`);
  }

  return {
    horseName:parsedFirst.horseName,
    history,
    audit:{
      ...metadata,
      expectedFirst,
      firstPageCount:firstRows.length,
      firstPageMismatch:Number.isFinite(expectedFirst) ? firstRows.length !== expectedFirst : false,
      collectedTotal,
      missingCount:Number.isFinite(careerTotal) ? Math.max(0, careerTotal - collectedTotal) : null,
      strategy:'FIRST_PAGE_PLUS_YEAR_RECONCILIATION_V10',
      coverageStatus,
      warning,
      yearCounts:countsByYear(history),
      yearDiagnostics
    }
  };
}
function applyBefore(rows, beforeIso) { return beforeIso ? rows.filter(row => row.isoDate < beforeIso) : rows; }
function sortChronological(rows) { return [...rows].sort((a,b)=>a.isoDate.localeCompare(b.isoDate)); }
function onlyWins(rows) { return sortChronological(rows.filter(row => Number(row.finish) === 1)); }
function onlyTop5(rows) { return sortChronological(rows.filter(row => Number(row.finish) >= 1 && Number(row.finish) <= 5)); }
function recentForm(rows, limit = 5) {
  return [...rows].sort((a,b)=>b.isoDate.localeCompare(a.isoDate)).slice(0, limit).sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
}
function buildSummary(top5, wins) {
  return {
    totalWins:wins.length, totalTop5:top5.length,
    first:top5.filter(x=>x.finish===1).length,
    second:top5.filter(x=>x.finish===2).length,
    third:top5.filter(x=>x.finish===3).length,
    fourth:top5.filter(x=>x.finish===4).length,
    fifth:top5.filter(x=>x.finish===5).length
  };
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  try {
    const horseId = clean(req.query.horseId || req.query.id || '');
    const beforeRaw = clean(req.query.before || '');
    if (!horseId) return res.status(400).json({ ok:false, version:VERSION, errorType:'INPUT', error:'horseId gerekli.' });
    const beforeIso = beforeRaw ? parseDate(beforeRaw) : '';
    if (beforeRaw && !beforeIso) return res.status(400).json({ ok:false, version:VERSION, errorType:'INPUT', error:'before YYYY-MM-DD veya DD.MM.YYYY biçiminde olmalı.' });

    const complete = await collectHistory(horseId);
    const frozenHistory = applyBefore(complete.history, beforeIso);
    const wins = onlyWins(frozenHistory);
    const top5 = onlyTop5(frozenHistory);
    const formPath = recentForm(frozenHistory, 5);
    const preparationPath = top5.length ? top5 : formPath;
    const analysisMode = wins.length ? 'WIN_PATH' : frozenHistory.length ? 'PREPARATION_PATH' : 'DEBUT';
    const futureLeakCount = beforeIso ? frozenHistory.filter(row => row.isoDate >= beforeIso).length : 0;
    if (futureLeakCount) throw new Error('Tarih sızıntısı tespit edildi.');

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      ok:true, version:VERSION, horseId:String(horseId), horseName:complete.horseName || null,
      before:beforeIso || null, analysisMode,
      rules:{
        source:'TJK AtKosuBilgileri', historicalFreeze:beforeIso ? 'career_race_date < before' : 'NO_BEFORE_FILTER',
        dataStateSeparation:true, winPath:'finish === 1', preparationPath:'finish 1..5; if none, latest 5 form rows',
        debut:'no race before cutoff', leakageProtection:Boolean(beforeIso)
      },
      counts:{
        tjkCareerTotal:complete.audit.careerTotal, collectedTotal:complete.audit.collectedTotal,
        frozenCareerTotal:frozenHistory.length, wins:wins.length, top5:top5.length,
        preparationRows:preparationPath.length, distanceFilled:preparationPath.filter(x=>x.distance>0).length
      },
      summary:buildSummary(top5, wins), audit:complete.audit,
      validation:{ futureLeakCount, coverageStatus:complete.audit.coverageStatus, valid:futureLeakCount===0 && complete.audit.coverageStatus!=='HATA' },
      history:frozenHistory,
      wins,
      top5,
      preparationPath,
      recentForm:formPath,
      roadmap:wins.length ? wins : preparationPath,
      races:wins.length ? wins : preparationPath,
      source:{ type:'TJK_AT_KOSU_BILGILERI', endpoint:BASE_URL },
      durationMs:Date.now()-startedAt
    });
  } catch (e) {
    console.error('tjk-career adaptive V10:', e);
    return res.status(500).json({
      ok:false, version:VERSION, errorType:'RETRIEVAL_ERROR',
      error:e?.message || 'At kariyer geçmişi alınamadı.', durationMs:Date.now()-startedAt
    });
  }
}
