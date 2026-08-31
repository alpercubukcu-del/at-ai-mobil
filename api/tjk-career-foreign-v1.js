import * as cheerio from 'cheerio';

const VERSION = 'CAREER-FOREIGN-TJK-V1.1';
const BASE_URL = 'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri_Y';
const TIMEOUT_MS = 20000;
const MAX_YEAR_FETCH = 12;

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function upper(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g,'I');
}
function key(v = '') { return upper(v).replace(/[^A-Z0-9]+/g, ''); }
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
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? s : null;
}
function displayDate(iso = '') {
  const m = clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : clean(iso);
}
function normalizeHeader(v = '') {
  const k = key(v);
  const aliases = {
    TARIH:'tarih', DATE:'tarih',
    SEHIR:'sehir', YER:'sehir', HIPODROM:'sehir', RACECOURSE:'sehir', TRACKNAME:'sehir',
    MSF:'mesafe', MESAFE:'mesafe', DISTANCE:'mesafe',
    PIST:'pist_raw', SURFACE:'pist_raw', TRACK:'pist_raw',
    S:'sira', SIRA:'sira', FINISH:'sira', POSITION:'sira', POS:'sira',
    DERECE:'derece', TIME:'derece',
    SIKLET:'siklet', KILO:'siklet', WEIGHT:'siklet',
    TAKI:'taki', EQUIPMENT:'taki',
    JOKEY:'jokey', JOCKEY:'jokey',
    ST:'st', START:'st', DRAW:'st',
    GNY:'ganyan', GANYAN:'ganyan', ODDS:'ganyan',
    GRUP:'grup', GROUP:'grup', AGEGROUP:'grup',
    KNOKADI:'kosu_no_adi', KNOADI:'kosu_no_adi', RACE:'kosu_no_adi', RACENAME:'kosu_no_adi',
    KCINS:'kcins', KOSUCINSI:'kcins', CLASS:'kcins', RACETYPE:'kcins',
    ANT:'antrenor', ANTRENOR:'antrenor', TRAINER:'antrenor',
    SAHIP:'sahip', OWNER:'sahip',
    HP:'hp', RATING:'hp', OR:'hp',
    IKRAMIYE:'ikramiye', PRIZE:'ikramiye',
    S20:'s20'
  };
  return aliases[k] || k.toLowerCase();
}
function normalizeAgeGroup(v = '') {
  const x = clean(v).toLocaleUpperCase('tr-TR').replace(/\s+/g, '');
  const map = {
    '2İ':'2 Yaşlı İngilizler','2I':'2 Yaşlı İngilizler',
    '3İ':'3 Yaşlı İngilizler','3I':'3 Yaşlı İngilizler',
    '3+İ':'3 ve Yukarı İngilizler','3+I':'3 ve Yukarı İngilizler',
    '4İ':'4 Yaşlı İngilizler','4I':'4 Yaşlı İngilizler',
    '4+İ':'4 ve Yukarı İngilizler','4+I':'4 ve Yukarı İngilizler',
    '2A':'2 Yaşlı Araplar','3A':'3 Yaşlı Araplar','4A':'4 Yaşlı Araplar',
    '4+A':'4 ve Yukarı Araplar','5+A':'5 ve Yukarı Araplar'
  };
  return map[x] || clean(v);
}
function normalizeClass(v = '') { return clean(v).replace(/\s*\/\s*/g,'/').replace(/\s+/g,' '); }
function splitTrack(v = '') {
  const raw = clean(v);
  const n = upper(raw);
  let surface = '';
  if (/^C(?::|$)/.test(n) || n.includes('TURF') || n.includes('CIM')) surface = 'Çim';
  else if (/^K(?::|$)/.test(n) || n.includes('DIRT') || n.includes('KUM')) surface = 'Kum';
  else if (/^[TS](?::|$)/.test(n) || n.includes('SENTETIK') || n.includes('SYNTHETIC') || n.includes('ALL WEATHER') || n.includes('ALLWEATHER') || n.includes('POLYTRACK') || n.includes('TAPETA') || /^AW\b/.test(n)) surface = 'Sentetik';
  return { surface:surface || raw, condition:raw.includes(':') ? clean(raw.split(':').slice(1).join(':')) : '' };
}
function createSession() { return { cookie:'' }; }
function updateCookie(session, response) {
  let values = [];
  if (response.headers && typeof response.headers.getSetCookie === 'function') values = response.headers.getSetCookie();
  else { const raw = response.headers.get('set-cookie'); if (raw) values = [raw]; }
  if (!values.length) return;
  const jar = {};
  for (const pair of clean(session.cookie).split(';')) {
    const i = pair.indexOf('='); if (i > 0) jar[clean(pair.slice(0,i))] = clean(pair.slice(i+1));
  }
  for (const header of values) {
    const pair = String(header).split(';')[0]; const i = pair.indexOf('=');
    if (i > 0) jar[clean(pair.slice(0,i))] = clean(pair.slice(i+1));
  }
  session.cookie = Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; ');
}
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), TIMEOUT_MS);
  try { return await fetch(url, { ...options, signal:controller.signal }); }
  finally { clearTimeout(timer); }
}
async function downloadHorsePage(session, horseId, year = null) {
  let lastError = null;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      const params = new URLSearchParams({ '1':'1', Era:'today', QueryParameter_AtId:String(horseId), QueryParameter_Y:'1' });
      if (year) params.set('QueryParameter_Yil', String(year));
      const headers = {
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.6', Accept:'text/html, */*; q=0.01',
        Referer:'https://www.tjk.org/', 'Cache-Control':'no-cache', Pragma:'no-cache'
      };
      if (session.cookie) headers.Cookie = session.cookie;
      const response = await fetchWithTimeout(`${BASE_URL}?${params.toString()}`, { headers, redirect:'follow', cache:'no-store' });
      updateCookie(session, response);
      if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
      const html = await response.text();
      if (!html || html.length < 200) throw new Error('TJK yabancı at geçmişi boş cevap döndürdü.');
      return { html, url:response.url };
    } catch (e) {
      lastError = e;
      if (attempt < 3) await sleep(250*attempt);
    }
  }
  throw new Error(`Yabancı at sayfası indirilemedi: ${lastError?.message || lastError}`);
}
function normalizedHeadersFromRow($, tr) {
  return $(tr).find('th,td').map((_,c)=>normalizeHeader($(c).text())).get();
}
function findHistoryTable($) {
  let best = null;
  $('table').each((_, table) => {
    $(table).find('tr').slice(0,8).each((__, tr) => {
      const headers = normalizedHeadersFromRow($, tr);
      const required = ['tarih','mesafe','sira'];
      const score = required.filter(x=>headers.includes(x)).length + (headers.includes('pist_raw')?1:0) + (headers.includes('sehir')?1:0);
      if (score >= 4 && (!best || headers.length > best.headers.length)) best = { table, headers, headerRow:tr };
    });
  });
  return best;
}
function extractHorseName($) {
  for (const selector of ['.horse-name','.atAdi','.at-adi','h2','h1','title']) {
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
  $('table').each((_,table)=>{
    const txt = upper($(table).text());
    if (!txt.includes('TOPLAM') && !txt.includes('TOTAL')) return;
    $(table).find('tr').each((__,tr)=>{
      const c = $(tr).find('th,td').map((___,cell)=>clean($(cell).text())).get();
      if (c.length < 2) return;
      const first = upper(c[0]);
      const count = parseIntValue(c[1]);
      if ((first === 'TOPLAM' || first === 'TOTAL') && count !== null && count >= 0) careerTotal = count;
      const ym = first.match(/^((?:19|20)\d{2})(?:\s+YILI)?$/);
      if (ym) { listedYears.add(Number(ym[1])); if (count !== null) yearTotals[ym[1]] = count; }
    });
  });
  $('select[name="QueryParameter_Yil"] option, select#QueryParameter_Yil option').each((_,option)=>{
    const value = clean($(option).attr('value'));
    const text = clean($(option).text());
    const y = /^(?:19|20)\d{2}$/.test(value) ? value : (text.match(/(?:19|20)\d{2}/)?.[0] || '');
    if (y) listedYears.add(Number(y));
  });
  return { careerTotal, yearTotals, listedYears:[...listedYears].filter(Number.isFinite).sort((a,b)=>b-a) };
}
function parseHistory(html, horseId, sourceUrl, fallbackHeaders = []) {
  const $ = cheerio.load(html);
  const horseName = extractHorseName($);
  const found = findHistoryTable($);
  const headers = found?.headers?.length ? found.headers : fallbackHeaders;
  if (!headers.length || !found) return { horseName, headers, rows:[] };
  const rows = [];
  const trs = $(found.table).find('tr').toArray();
  let passedHeader = false;
  for (const tr of trs) {
    if (tr === found.headerRow) { passedHeader = true; continue; }
    if (!passedHeader) continue;
    const cells = $(tr).find('td').toArray();
    if (cells.length < 4) continue;
    const values = cells.map(td=>clean($(td).text()));
    const record = {};
    for (let i=0;i<Math.min(headers.length, values.length);i++) record[headers[i]] = values[i];
    const isoDate = parseDate(record.tarih);
    if (!isoDate) continue;
    const finish = parseIntValue(record.sira) ?? 0;
    const distance = parseIntValue(record.mesafe) ?? 0;
    const trk = splitTrack(record.pist_raw);
    const uniqueKey = [String(horseId), isoDate, upper(record.sehir), distance, finish, clean(record.derece), normalizeClass(record.kcins)].join('|');
    rows.push({
      uniqueKey, horseId:String(horseId), horseName:horseName || '', isoDate, date:displayDate(isoDate),
      city:clean(record.sehir), distance, msf:distance, mesafe:distance,
      track:trk.surface, pist:trk.surface, trackRaw:clean(record.pist_raw), trackCondition:trk.condition,
      finish, rank:finish, sira:finish, degree:clean(record.derece)||null,
      weight:parseNumber(record.siklet), equipment:clean(record.taki)||null,
      jockey:clean(record.jokey)||null, startNo:parseIntValue(record.st), odds:parseNumber(record.ganyan),
      groupRaw:clean(record.grup)||null, ageGroup:normalizeAgeGroup(record.grup), raceNoName:clean(record.kosu_no_adi)||null,
      classRaw:clean(record.kcins)||null, class:normalizeClass(record.kcins), raceClass:normalizeClass(record.kcins),
      trainer:clean(record.antrenor)||null, owner:clean(record.sahip)||null, hp:parseNumber(record.hp),
      prize:parseNumber(record.ikramiye), s20:parseNumber(record.s20), sourceUrl, foreignSource:true
    });
  }
  return { horseName, headers, rows };
}
function uniqueHistory(rows = []) {
  const map = new Map();
  for (const row of rows) if (row?.uniqueKey) map.set(row.uniqueKey,row);
  return [...map.values()].sort((a,b)=>b.isoDate.localeCompare(a.isoDate));
}
function countsByYear(rows = []) {
  const out = {};
  for (const row of rows) {
    const y = String(row?.isoDate||'').slice(0,4);
    if (/^\d{4}$/.test(y)) out[y] = (out[y]||0)+1;
  }
  return out;
}
async function collectHistory(horseId) {
  const session = createSession();
  const first = await downloadHorsePage(session, horseId);
  const parsedFirst = parseHistory(first.html, horseId, first.url);
  const metadata = extractMetadata(first.html);
  const union = new Map(uniqueHistory(parsedFirst.rows).map(r=>[r.uniqueKey,r]));
  const yearDiagnostics = [];
  const years = metadata.listedYears.slice(0, MAX_YEAR_FETCH);
  for (const year of years) {
    try {
      const page = await downloadHorsePage(session, horseId, year);
      const parsed = parseHistory(page.html, horseId, page.url, parsedFirst.headers);
      const sameYear = uniqueHistory(parsed.rows).filter(r=>r.isoDate.startsWith(`${year}-`));
      const before = union.size;
      for (const row of sameYear) union.set(row.uniqueKey,row);
      yearDiagnostics.push({ year, rows:sameYear.length, newRowsAdded:union.size-before });
    } catch (e) {
      yearDiagnostics.push({ year, rows:0, newRowsAdded:0, error:e?.message||String(e) });
    }
  }
  const history = uniqueHistory([...union.values()]);
  const collectedTotal = history.length;
  const careerTotal = Number.isFinite(metadata.careerTotal) ? metadata.careerTotal : null;
  const coverageStatus = collectedTotal ? (careerTotal !== null && collectedTotal >= careerTotal ? 'TAM' : 'KISMİ') : 'HATA';
  let warning = null;
  if (careerTotal !== null && collectedTotal < careerTotal) warning = `TJK yabancı kariyer toplamı ${careerTotal}, doğrulanan kayıt ${collectedTotal}.`;
  else if (careerTotal === null && collectedTotal) warning = 'TJK yabancı kariyer toplamı okunamadı; sayfada sağlanan geçmiş kayıtlar kullanıldı.';
  if (!history.length) throw new Error('TJK yabancı at sayfasında geçmiş yarış satırı bulunamadı.');
  return {
    horseName:parsedFirst.horseName,
    history,
    audit:{ ...metadata, collectedTotal, missingCount:careerTotal===null?null:Math.max(0,careerTotal-collectedTotal), strategy:'TJK_FOREIGN_PAGE_PLUS_YEAR_OPTIONS_V1_1', coverageStatus, warning, yearCounts:countsByYear(history), yearDiagnostics, parsedHeaders:parsedFirst.headers }
  };
}
function applyBefore(rows, beforeIso) { return beforeIso ? rows.filter(r=>r.isoDate < beforeIso) : rows; }
function chronological(rows) { return [...rows].sort((a,b)=>a.isoDate.localeCompare(b.isoDate)); }
function onlyWins(rows) { return chronological(rows.filter(r=>Number(r.finish)===1)); }
function onlyTop5(rows) { return chronological(rows.filter(r=>Number(r.finish)>=1 && Number(r.finish)<=5)); }
function recentForm(rows, limit=5) { return [...rows].sort((a,b)=>b.isoDate.localeCompare(a.isoDate)).slice(0,limit).sort((a,b)=>a.isoDate.localeCompare(b.isoDate)); }
function buildSummary(top5,wins) {
  return { totalWins:wins.length, totalTop5:top5.length, first:top5.filter(x=>x.finish===1).length, second:top5.filter(x=>x.finish===2).length, third:top5.filter(x=>x.finish===3).length, fourth:top5.filter(x=>x.finish===4).length, fifth:top5.filter(x=>x.finish===5).length };
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  try {
    const horseId = clean(req.query?.horseId || req.query?.id || '');
    const numericId = Number(horseId);
    const beforeRaw = clean(req.query?.before || '');
    if (!horseId || !Number.isFinite(numericId) || numericId >= 0) return res.status(400).json({ ok:false, version:VERSION, errorType:'INPUT', error:'Negatif yabancı TJK horseId gerekli.' });
    const beforeIso = beforeRaw ? parseDate(beforeRaw) : '';
    if (beforeRaw && !beforeIso) return res.status(400).json({ ok:false, version:VERSION, errorType:'INPUT', error:'before YYYY-MM-DD veya DD.MM.YYYY biçiminde olmalı.' });
    const complete = await collectHistory(horseId);
    const frozenHistory = applyBefore(complete.history, beforeIso);
    const wins = onlyWins(frozenHistory);
    const top5 = onlyTop5(frozenHistory);
    const formPath = recentForm(frozenHistory,5);
    const preparationPath = top5.length ? top5 : formPath;
    const analysisMode = wins.length ? 'WIN_PATH' : frozenHistory.length ? 'PREPARATION_PATH' : 'DEBUT';
    const futureLeakCount = beforeIso ? frozenHistory.filter(r=>r.isoDate>=beforeIso).length : 0;
    if (futureLeakCount) throw new Error('Tarih sızıntısı tespit edildi.');
    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      ok:true, version:VERSION, horseId:String(horseId), horseName:complete.horseName||null,
      before:beforeIso||null, analysisMode,
      rules:{ source:'TJK AtKosuBilgileri_Y', historicalFreeze:beforeIso?'career_race_date < before':'NO_BEFORE_FILTER', dataStateSeparation:true, winPath:'finish === 1', preparationPath:'finish 1..5; if none, latest 5 form rows', debut:'no race before cutoff', leakageProtection:Boolean(beforeIso) },
      counts:{ tjkCareerTotal:complete.audit.careerTotal, collectedTotal:complete.audit.collectedTotal, frozenCareerTotal:frozenHistory.length, wins:wins.length, top5:top5.length, preparationRows:preparationPath.length, distanceFilled:preparationPath.filter(x=>x.distance>0).length },
      summary:buildSummary(top5,wins), audit:complete.audit,
      validation:{ futureLeakCount, coverageStatus:complete.audit.coverageStatus, valid:futureLeakCount===0 && complete.audit.coverageStatus!=='HATA' },
      history:frozenHistory, wins, top5, preparationPath, recentForm:formPath,
      roadmap:wins.length?wins:preparationPath, races:wins.length?wins:preparationPath,
      source:{ type:'TJK_AT_KOSU_BILGILERI_Y', endpoint:BASE_URL }, foreignCareer:true,
      durationMs:Date.now()-startedAt
    });
  } catch (e) {
    console.error('tjk-career foreign V1.1:', e);
    return res.status(500).json({ ok:false, version:VERSION, errorType:'RETRIEVAL_ERROR', error:e?.message||'Yabancı at kariyer geçmişi alınamadı.', durationMs:Date.now()-startedAt });
  }
}
