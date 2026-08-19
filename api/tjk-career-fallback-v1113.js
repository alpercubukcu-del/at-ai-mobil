import * as cheerio from 'cheerio';

const VERSION = 'CAREER-FALLBACK-V11.13';
const BASE_URL = 'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri';
const TIMEOUT_MS = 12000;

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function upper(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}
function parseNumber(v) {
  const s = clean(v).replace(/\./g, '').replace(',', '.');
  const m = s.match(/-?\d+(?:\.\d+)?/);
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

async function fetchHorseHtml(horseId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const params = new URLSearchParams({ '1':'1', Era:'today', QueryParameter_AtId:String(horseId) });
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      signal:controller.signal,
      redirect:'follow',
      cache:'no-store',
      headers:{
        'User-Agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/139 Safari/537.36',
        'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.7',
        Accept:'text/html, */*;q=0.8',
        Referer:'https://www.tjk.org/'
      }
    });
    if (!res.ok) throw new Error(`TJK HTTP ${res.status}`);
    const html = await res.text();
    if (!html) throw new Error('TJK boş cevap döndürdü.');
    return html;
  } finally {
    clearTimeout(timer);
  }
}

function extractMetadata($) {
  let careerTotal = null;
  const yearTotals = {};
  $('table').each((_, table) => {
    const text = upper($(table).text());
    if (!text.includes('INCILIK') || !text.includes('KAZANC')) return;
    $(table).find('tr').each((__, tr) => {
      const cells = $(tr).find('th,td').map((___, cell) => clean($(cell).text())).get();
      if (cells.length < 2) return;
      const label = upper(cells[0]);
      const count = parseIntValue(cells[1]);
      if (label === 'TOPLAM' && count !== null) careerTotal = count;
      const y = label.match(/^((?:19|20)\d{2})(?: YILI)?$/)?.[1];
      if (y && count !== null) yearTotals[y] = count;
    });
  });
  return { careerTotal, yearTotals };
}

function findHistoryTable($) {
  let found = null;
  $('table').each((_, table) => {
    if (found) return;
    const headers = $(table).find('th').map((__, th) => normalizeHeader($(th).text())).get();
    if (['tarih','sehir','mesafe','pist_raw','sira'].every(x => headers.includes(x))) {
      found = { table, headers };
    }
  });
  return found;
}

function parseHistory($, horseId) {
  const found = findHistoryTable($);
  if (!found) return [];
  let trs = $(found.table).find('tbody tr').toArray();
  if (!trs.length) trs = $(found.table).find('tr').slice(1).toArray();
  const rows = [];
  for (const tr of trs) {
    const values = $(tr).find('td').map((_, td) => clean($(td).text())).get();
    if (values.length < 5) continue;
    const record = {};
    for (let i = 0; i < Math.min(values.length, found.headers.length); i++) record[found.headers[i]] = values[i];
    const isoDate = parseDate(record.tarih);
    if (!isoDate) continue;
    const finish = parseIntValue(record.sira) ?? 0;
    const distance = parseIntValue(record.mesafe) ?? 0;
    const trk = splitTrack(record.pist_raw);
    rows.push({
      horseId:String(horseId), isoDate, date:displayDate(isoDate), city:clean(record.sehir),
      distance, msf:distance, mesafe:distance, track:trk.surface, pist:trk.surface,
      trackRaw:clean(record.pist_raw), trackCondition:trk.condition,
      finish, rank:finish, sira:finish, degree:clean(record.derece) || null,
      weight:parseNumber(record.siklet), equipment:clean(record.taki) || null,
      jockey:clean(record.jokey) || null, startNo:parseIntValue(record.st), odds:parseNumber(record.ganyan),
      groupRaw:clean(record.grup) || null, ageGroup:normalizeAgeGroup(record.grup),
      raceNoName:clean(record.kosu_no_adi) || null, classRaw:clean(record.kcins) || null,
      class:normalizeClass(record.kcins), raceClass:normalizeClass(record.kcins),
      trainer:clean(record.antrenor) || null, owner:clean(record.sahip) || null,
      hp:parseNumber(record.hp), prize:parseNumber(record.ikramiye), s20:parseNumber(record.s20)
    });
  }
  const unique = new Map();
  for (const row of rows) {
    const key = [row.isoDate, upper(row.city), row.distance, row.finish, upper(row.raceNoName), upper(row.class)].join('|');
    unique.set(key, row);
  }
  return [...unique.values()].sort((a,b) => b.isoDate.localeCompare(a.isoDate));
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
    if (beforeRaw && !beforeIso) return res.status(400).json({ ok:false, version:VERSION, errorType:'INPUT', error:'before tarihi geçersiz.' });

    const html = await fetchHorseHtml(horseId);
    const $ = cheerio.load(html);
    const meta = extractMetadata($);
    const allRows = parseHistory($, horseId);
    const history = beforeIso ? allRows.filter(row => row.isoDate < beforeIso) : allRows;

    if (!history.length && Number(meta.careerTotal || 0) > 0) {
      throw new Error(`TJK kariyer toplamı ${meta.careerTotal}, fakat yarış satırı ayrıştırılamadı.`);
    }
    if (!history.length && meta.careerTotal === null) {
      throw new Error('TJK kariyer özeti okunamadı; boş geçmiş debut kabul edilmedi.');
    }

    const chronological = [...history].sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
    const wins = chronological.filter(row => row.finish === 1);
    const top5 = chronological.filter(row => row.finish >= 1 && row.finish <= 5);
    const recentForm = [...history].sort((a,b)=>b.isoDate.localeCompare(a.isoDate)).slice(0,5).sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
    const preparationPath = top5.length ? top5 : recentForm;
    const analysisMode = wins.length ? 'WIN_PATH' : history.length ? 'PREPARATION_PATH' : 'DEBUT';
    const horseName = clean($('.horse-name').first().text()) || clean($('h2').first().text()) || null;
    const coverageStatus = Number.isFinite(meta.careerTotal) && allRows.length >= meta.careerTotal ? 'TAM' : (allRows.length ? 'KISMİ' : 'TAM');

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({
      ok:true, version:VERSION, fallback:true, dataState:'OK', horseId:String(horseId), horseName,
      before:beforeIso || null, analysisMode,
      counts:{
        tjkCareerTotal:meta.careerTotal, collectedTotal:allRows.length, frozenCareerTotal:history.length,
        wins:wins.length, top5:top5.length, preparationRows:preparationPath.length
      },
      summary:buildSummary(top5, wins),
      audit:{ careerTotal:meta.careerTotal, collectedTotal:allRows.length, coverageStatus, warning:coverageStatus==='KISMİ' ? 'Hızlı geri dönüş katmanı ilk sayfadaki doğrulanmış yarışları kullandı.' : null },
      validation:{ valid:true, coverageStatus, futureLeakCount:0 },
      history, wins, top5, preparationPath, recentForm,
      roadmap:wins.length ? wins : preparationPath,
      races:wins.length ? wins : preparationPath,
      source:{ type:'TJK_AT_KOSU_BILGILERI_FALLBACK', endpoint:BASE_URL },
      durationMs:Date.now()-startedAt
    });
  } catch (e) {
    const message = e?.name === 'AbortError' ? 'TJK kariyer isteği zaman aşımına uğradı.' : (e?.message || 'Kariyer fallback alınamadı.');
    return res.status(502).json({ ok:false, version:VERSION, dataState:'ERROR', errorType:'RETRIEVAL_ERROR', error:message, durationMs:Date.now()-startedAt });
  }
}
