import * as cheerio from 'cheerio';

const VERSION = 'CAREER-WINS-V9';
const BASE_URL = 'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri';
const PAGE_SIZE = 50;
const TIMEOUT_MS = 20000;

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

function isoDisplay(v = '') {
  const m = clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : clean(v);
}

function normalizeHeader(v = '') {
  const k = upper(v).replace(/[^A-Z0-9]+/g, '');
  const aliases = {
    TARIH: 'tarih', SEHIR: 'sehir', MSF: 'mesafe', MESAFE: 'mesafe',
    PIST: 'pist_raw', S: 'sira', SIRA: 'sira', DERECE: 'derece',
    SIKLET: 'siklet', TAKI: 'taki', JOKEY: 'jokey', ST: 'st', GNY: 'ganyan',
    GRUP: 'grup', KNOKADI: 'kosu_no_adi', KNOADI: 'kosu_no_adi',
    KCINS: 'kcins', ANT: 'antrenor', ANTRENOR: 'antrenor', SAHIP: 'sahip',
    HP: 'hp', IKRAMIYE: 'ikramiye', S20: 's20'
  };
  return aliases[k] || k.toLowerCase();
}

function splitTrack(v = '') {
  const raw = clean(v);
  const n = upper(raw);
  let surface = '';
  if (n.startsWith('C') || n.includes('CIM')) surface = 'Çim';
  else if (n.startsWith('K') || n.includes('KUM')) surface = 'Kum';
  else if (n.startsWith('S') || n.includes('SENTETIK')) surface = 'Sentetik';
  return { surface, condition: raw.includes(':') ? clean(raw.split(':').slice(1).join(':')) : '' };
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

function createSession() {
  return { cookie: '' };
}

function updateCookie(session, response) {
  let values = [];
  if (response.headers && typeof response.headers.getSetCookie === 'function') values = response.headers.getSetCookie();
  else {
    const v = response.headers.get('set-cookie');
    if (v) values = [v];
  }
  if (!values.length) return;
  const jar = {};
  for (const pair of clean(session.cookie).split(';')) {
    const i = pair.indexOf('=');
    if (i > 0) jar[clean(pair.slice(0, i))] = clean(pair.slice(i + 1));
  }
  for (const v of values) {
    const p = String(v).split(';')[0];
    const i = p.indexOf('=');
    if (i > 0) jar[clean(p.slice(0, i))] = clean(p.slice(i + 1));
  }
  session.cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function unwrapAjaxPayload(text) {
  const raw = String(text ?? '');
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return raw;
  try {
    const obj = JSON.parse(trimmed);
    const candidates = [];
    const walk = value => {
      if (typeof value === 'string') {
        if (/<(?:table|tbody|tr|td)\b/i.test(value)) candidates.push(value);
        else if (/\\u003c|&lt;|<tr/i.test(value)) candidates.push(value);
        return;
      }
      if (Array.isArray(value)) return value.forEach(walk);
      if (value && typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk(obj);
    if (candidates.length) return candidates.sort((a, b) => b.length - a.length)[0];
  } catch (_) {}
  return raw;
}

async function downloadHorsePage(session, horseId, { pageNumber = null, year = null } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const params = new URLSearchParams({ '1':'1', Era:'today', QueryParameter_AtId:String(horseId) });
      if (year) params.set('QueryParameter_Yil', String(year));
      if (pageNumber !== null) {
        params.set('PageNumber', String(pageNumber));
        params.set('Sort', 'Tarih Desc');
      }
      params.set('_v435', `${Date.now()}-${year || 'all'}-${pageNumber ?? 'first'}-${attempt}`);
      const headers = {
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.6',
        'Cache-Control':'no-cache', Pragma:'no-cache', Accept:'text/html, */*; q=0.01',
        Referer:`${BASE_URL}?1=1&Era=today&QueryParameter_AtId=${encodeURIComponent(horseId)}`
      };
      if (session.cookie) headers.Cookie = session.cookie;
      if (pageNumber !== null) headers['X-Requested-With'] = 'XMLHttpRequest';
      const response = await fetchWithTimeout(`${BASE_URL}?${params}`, { headers, redirect:'follow' });
      updateCookie(session, response);
      if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
      const raw = await response.text();
      if (!raw) throw new Error('TJK boş cevap döndürdü.');
      return { html: unwrapAjaxPayload(raw), raw, url: response.url };
    } catch (e) {
      lastError = e;
      if (attempt < 4) await sleep(attempt * 350);
    }
  }
  throw new Error(`At sayfası indirilemedi: ${lastError?.message || lastError}`);
}

function findHistoryTable($) {
  let found = null;
  $('table').each((_, table) => {
    if (found) return;
    const headers = $(table).find('th').map((__, th) => normalizeHeader($(th).text())).get();
    const required = ['tarih','sehir','mesafe','pist_raw','sira'];
    if (required.every(x => headers.includes(x))) found = { table, headers };
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
  $('table').each((_, table) => {
    const txt = upper($(table).text());
    if (!txt.includes('INCILIK') || !txt.includes('KAZANC')) return;
    $(table).find('tr').each((__, tr) => {
      const c = $(tr).find('th,td').map((___, cell) => clean($(cell).text())).get();
      if (c.length < 2) return;
      const first = upper(c[0]);
      const count = parseIntValue(c[1]);
      if (first === 'TOPLAM' && count !== null) careerTotal = count;
      const ym = first.match(/^((?:19|20)\d{2})(?: YILI)?$/);
      if (ym && count !== null) yearTotals[ym[1]] = count;
    });
  });
  return { careerTotal, yearTotals };
}

function parseHistory(html, horseId, sourceUrl, fallbackHeaders = []) {
  const normalizedHtml = unwrapAjaxPayload(html);
  const $ = cheerio.load(normalizedHtml);
  const horseName = extractHorseName($);
  const found = findHistoryTable($);
  let headers = found?.headers || fallbackHeaders || [];
  let bodyRows = [];
  if (found) {
    bodyRows = $(found.table).find('tbody tr').toArray();
    if (!bodyRows.length) bodyRows = $(found.table).find('tr').slice(1).toArray();
  } else if (headers.length) {
    bodyRows = $('tbody tr').toArray();
    if (!bodyRows.length) bodyRows = $('tr').toArray();
  }
  const rows = [];
  for (const tr of bodyRows) {
    const cells = $(tr).find('td').toArray();
    if (cells.length < 5) continue;
    const values = cells.map(td => clean($(td).text()));
    const r = {};
    for (let i = 0; i < Math.min(headers.length, values.length); i++) r[headers[i]] = values[i];
    const isoDate = parseDate(r.tarih);
    if (!isoDate) continue;
    const finish = parseIntValue(r.sira) ?? 0;
    const distance = parseIntValue(r.mesafe) ?? 0;
    const trk = splitTrack(r.pist_raw);
    const uniqueKey = [horseId, isoDate, upper(r.sehir), distance, finish, clean(r.derece)].join('|');
    rows.push({
      uniqueKey, horseId:String(horseId), horseName:horseName || '', isoDate, date:isoDisplay(isoDate),
      city:clean(r.sehir), distance, msf:distance, mesafe:distance, track:trk.surface, pist:trk.surface,
      trackRaw:clean(r.pist_raw), trackCondition:trk.condition, finish, rank:finish, sira:finish,
      degree:clean(r.derece) || null, weight:parseNumber(r.siklet), equipment:clean(r.taki) || null,
      jockey:clean(r.jokey) || null, startNo:parseIntValue(r.st), odds:parseNumber(r.ganyan),
      groupRaw:clean(r.grup) || null, ageGroup:normalizeAgeGroup(r.grup), raceNoName:clean(r.kosu_no_adi) || null,
      classRaw:clean(r.kcins) || null, class:normalizeClass(r.kcins), raceClass:normalizeClass(r.kcins),
      trainer:clean(r.antrenor) || null, owner:clean(r.sahip) || null, hp:parseNumber(r.hp),
      prize:parseNumber(r.ikramiye), s20:parseNumber(r.s20), sourceUrl
    });
  }
  return { horseName, headers, rows };
}

function uniqueHistory(rows = []) {
  const m = new Map();
  for (const r of rows) if (r?.uniqueKey) m.set(r.uniqueKey, r);
  return [...m.values()].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
}

async function collectByPagination(session, horseId, firstRows, headers, careerTotal) {
  let collected = uniqueHistory(firstRows);
  const existing = new Set(collected.map(x => x.uniqueKey));
  const scannedPages = [];
  const pageCounts = {};
  const totalPages = Math.ceil(careerTotal / PAGE_SIZE);
  for (let logical = 1; logical < totalPages; logical++) {
    const expected = Math.min(PAGE_SIZE, careerTotal - logical * PAGE_SIZE);
    let accepted = null;
    let lastProblem = '';
    for (const candidatePage of [...new Set([logical, logical + 1])]) {
      try {
        const page = await downloadHorsePage(session, horseId, { pageNumber:candidatePage });
        const parsed = parseHistory(page.html, horseId, page.url, headers);
        const all = uniqueHistory(parsed.rows);
        const fresh = all.filter(x => !existing.has(x.uniqueKey));
        if (fresh.length === expected) {
          accepted = fresh;
          scannedPages.push(candidatePage);
          pageCounts[candidatePage] = fresh.length;
          break;
        }
        lastProblem = `PageNumber=${candidatePage}: beklenen ${expected} yeni, gelen ${fresh.length} (ham ${all.length})`;
      } catch (e) {
        lastProblem = e?.message || String(e);
      }
    }
    if (!accepted) throw new Error(`TJK TAM GEÇMİŞ KONTROLÜ: devam sayfası ${logical} doğrulanamadı; ${lastProblem}.`);
    for (const r of accepted) existing.add(r.uniqueKey);
    collected = uniqueHistory([...collected, ...accepted]);
  }
  return { rows:collected, scannedPages, pageCounts, strategy:'PAGINATION' };
}

async function collectByYears(session, horseId, metadata, fallbackHeaders) {
  const entries = Object.entries(metadata.yearTotals || {}).sort((a, b) => Number(b[0]) - Number(a[0]));
  if (!entries.length) throw new Error('TJK yıl toplamları okunamadı.');
  const rows = [];
  const yearCounts = {};
  for (const [year, expected] of entries) {
    if (!expected) continue;
    if (expected > PAGE_SIZE) throw new Error(`${year} yılında ${expected} koşu var; yıllık sayfa 50 sınırını aşıyor.`);
    const page = await downloadHorsePage(session, horseId, { year });
    const parsed = parseHistory(page.html, horseId, page.url, fallbackHeaders);
    const yr = uniqueHistory(parsed.rows).filter(x => x.isoDate.startsWith(`${year}-`));
    if (yr.length !== expected) throw new Error(`${year} yılı doğrulanamadı; beklenen ${expected}, gelen ${yr.length}.`);
    yearCounts[year] = yr.length;
    rows.push(...yr);
    await sleep(80);
  }
  const collected = uniqueHistory(rows);
  if (collected.length !== metadata.careerTotal) {
    throw new Error(`Yıllık toplama eksik; kariyer ${metadata.careerTotal}, toplanan ${collected.length}.`);
  }
  return { rows:collected, yearCounts, strategy:'YEAR_FILTER' };
}

async function collectCompleteHistory(horseId) {
  const session = createSession();
  const first = await downloadHorsePage(session, horseId);
  const parsedFirst = parseHistory(first.html, horseId, first.url);
  const metadata = extractMetadata(first.html);
  if (metadata.careerTotal === null) throw new Error('TJK TAM GEÇMİŞ KONTROLÜ: kariyer toplamı okunamadı.');
  const firstRows = uniqueHistory(parsedFirst.rows);
  const expectedFirst = Math.min(PAGE_SIZE, metadata.careerTotal);
  if (firstRows.length !== expectedFirst) {
    throw new Error(`TJK TAM GEÇMİŞ KONTROLÜ: ilk sayfada ${expectedFirst} kayıt beklenirken ${firstRows.length} kayıt ayrıştırıldı.`);
  }
  if (firstRows.length === metadata.careerTotal) {
    return { horseName:parsedFirst.horseName, history:firstRows, audit:{ ...metadata, firstPageCount:firstRows.length, collectedTotal:firstRows.length, missingCount:0, coverageStatus:'TAM', strategy:'FIRST_PAGE', scannedPages:[], pageCounts:{} } };
  }

  let paginationError = null;
  try {
    const p = await collectByPagination(session, horseId, firstRows, parsedFirst.headers, metadata.careerTotal);
    if (p.rows.length === metadata.careerTotal) {
      return { horseName:parsedFirst.horseName, history:p.rows, audit:{ ...metadata, firstPageCount:firstRows.length, collectedTotal:p.rows.length, missingCount:0, coverageStatus:'TAM', strategy:p.strategy, scannedPages:p.scannedPages, pageCounts:p.pageCounts } };
    }
  } catch (e) {
    paginationError = e;
  }

  try {
    const y = await collectByYears(session, horseId, metadata, parsedFirst.headers);
    return { horseName:parsedFirst.horseName, history:y.rows, audit:{ ...metadata, firstPageCount:firstRows.length, collectedTotal:y.rows.length, missingCount:0, coverageStatus:'TAM', strategy:y.strategy, yearCounts:y.yearCounts, scannedPages:[], pageCounts:{} } };
  } catch (yearError) {
    throw new Error(`TJK TAM GEÇMİŞ KONTROLÜ: pagination başarısız [${paginationError?.message || 'bilinmiyor'}]; yıl filtresi başarısız [${yearError?.message || yearError}].`);
  }
}

function applyBefore(rows, beforeIso) {
  return beforeIso ? rows.filter(x => x.isoDate < beforeIso) : rows;
}

function onlyWins(rows) {
  return rows.filter(x => Number(x.finish) === 1);
}

function buildSummary(rows) {
  return { totalWins:rows.length, totalTop5:rows.length, first:rows.length, second:0, third:0, fourth:0, fifth:0 };
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  try {
    const horseId = clean(req.query.horseId || req.query.id || '');
    const beforeRaw = clean(req.query.before || '');
    if (!horseId) return res.status(400).json({ ok:false, version:VERSION, error:'horseId gerekli.' });
    const beforeIso = beforeRaw ? parseDate(beforeRaw) : '';
    if (beforeRaw && !beforeIso) return res.status(400).json({ ok:false, version:VERSION, error:'before YYYY-MM-DD veya DD.MM.YYYY biçiminde olmalı.' });

    const complete = await collectCompleteHistory(horseId);
    const frozenHistory = applyBefore(complete.history, beforeIso);
    const wins = onlyWins(frozenHistory);
    const futureLeak = beforeIso ? wins.filter(x => x.isoDate >= beforeIso) : [];
    if (futureLeak.length) throw new Error('Tarih sızıntısı tespit edildi.');

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      ok:true, version:VERSION, horseId:String(horseId), horseName:complete.horseName || null, before:beforeIso || null,
      rules:{ source:'TJK AtKosuBilgileri', completeCareerRequired:true, historicalFreeze:beforeIso ? 'career_race_date < before' : 'NO_BEFORE_FILTER', historicalRaceDayExcluded:Boolean(beforeIso), finishFilter:'finish === 1', leakageProtection:Boolean(beforeIso) },
      counts:{ tjkCareerTotal:complete.audit.careerTotal, collectedTotal:complete.audit.collectedTotal, frozenCareerTotal:frozenHistory.length, wins:wins.length, top5:wins.length, distanceFilled:wins.filter(x => x.distance > 0).length, distanceMissing:wins.filter(x => !x.distance).length },
      summary:buildSummary(wins), audit:complete.audit,
      validation:{ futureLeakCount:futureLeak.length, invalidFinishCount:wins.filter(x => x.finish !== 1).length, distanceMissingCount:wins.filter(x => !x.distance).length, ageGroupMissingCount:wins.filter(x => !clean(x.ageGroup)).length, classMissingCount:wins.filter(x => !clean(x.class)).length, valid:futureLeak.length === 0 && wins.every(x => x.finish === 1) },
      roadmap:wins, wins, top5:wins, races:wins,
      source:{ type:'TJK_AT_KOSU_BILGILERI', endpoint:BASE_URL, columns:{ date:'Tarih', city:'Şehir', distance:'Msf', track:'Pist', finish:'S', ageGroup:'Grup', class:'Kcins' }, pagination:{ pageSize:PAGE_SIZE, ajax:true, jsonAjaxUnwrap:true, yearFallback:true, strategy:complete.audit.strategy } },
      durationMs:Date.now() - startedAt
    });
  } catch (e) {
    console.error('tjk-career V9:', e);
    return res.status(500).json({ ok:false, version:VERSION, error:e?.message || 'At kariyer geçmişi alınamadı.', durationMs:Date.now() - startedAt });
  }
}
