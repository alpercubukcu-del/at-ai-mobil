import * as cheerio from 'cheerio';

const BASE = 'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri';

function clean(v = '') { return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
function upper(v = '') { return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); }
function headerKey(v = '') {
  const k = upper(v).replace(/[^A-Z0-9]+/g, '');
  const map = { TARIH:'date', SEHIR:'city', MSF:'distance', MESAFE:'distance', PIST:'track', S:'finish', SIRA:'finish', DERECE:'degree' };
  return map[k] || k.toLowerCase();
}
function parseDate(v = '') {
  const m = clean(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : null;
}
function parseIntValue(v) { const m = clean(v).match(/\d+/); return m ? Number(m[0]) : null; }
function findHistoryTable($) {
  let result = null;
  $('table').each((_, table) => {
    if (result) return;
    const headers = $(table).find('th').map((__, th) => headerKey($(th).text())).get();
    if (['date','city','distance','track','finish'].every(k => headers.includes(k))) result = { table, headers };
  });
  return result;
}
function parseRows(html) {
  const $ = cheerio.load(html);
  const found = findHistoryTable($);
  if (!found) return [];
  let trs = $(found.table).find('tbody tr').toArray();
  if (!trs.length) trs = $(found.table).find('tr').slice(1).toArray();
  const rows = [];
  for (const tr of trs) {
    const cells = $(tr).find('td').toArray().map(td => clean($(td).text()));
    const r = {};
    found.headers.forEach((h, i) => { r[h] = cells[i] ?? ''; });
    const iso = parseDate(r.date);
    if (!iso) continue;
    rows.push({ isoDate:iso, city:clean(r.city), distance:parseIntValue(r.distance) || 0, track:clean(r.track), finish:parseIntValue(r.finish) || 0, degree:clean(r.degree) });
  }
  return rows;
}
function metadata(html) {
  const $ = cheerio.load(html);
  let total = null;
  const summaryYears = {};
  const selectYears = new Set();
  $('table').each((_, table) => {
    const text = upper($(table).text());
    if (!text.includes('INCILIK') || !text.includes('KAZANC')) return;
    $(table).find('tr').each((__, tr) => {
      const c = $(tr).find('th,td').map((___, td) => clean($(td).text())).get();
      if (c.length < 2) return;
      const first = upper(c[0]);
      const count = parseIntValue(c[1]);
      if (first === 'TOPLAM' && count !== null) total = count;
      const ym = first.match(/^((?:19|20)\d{2})(?: YILI)?$/);
      if (ym && count !== null) summaryYears[ym[1]] = count;
    });
  });
  $('select[name="QueryParameter_Yil"] option, select#QueryParameter_Yil option').each((_, option) => {
    const value = clean($(option).attr('value'));
    const text = clean($(option).text());
    const y = /^(?:19|20)\d{2}$/.test(value) ? value : (text.match(/(?:19|20)\d{2}/)?.[0] || '');
    if (y) selectYears.add(Number(y));
  });
  return { total, summaryYears, selectYears:[...selectYears].sort((a,b) => b-a) };
}
function createSession() { return { cookie:'' }; }
function updateCookie(session, response) {
  let values = [];
  if (typeof response.headers.getSetCookie === 'function') values = response.headers.getSetCookie();
  else { const raw = response.headers.get('set-cookie'); if (raw) values = [raw]; }
  if (!values.length) return;
  const jar = {};
  for (const pair of clean(session.cookie).split(';')) { const i = pair.indexOf('='); if (i > 0) jar[clean(pair.slice(0,i))] = clean(pair.slice(i+1)); }
  for (const value of values) { const pair = String(value).split(';')[0]; const i = pair.indexOf('='); if (i > 0) jar[clean(pair.slice(0,i))] = clean(pair.slice(i+1)); }
  session.cookie = Object.entries(jar).map(([k,v]) => `${k}=${v}`).join('; ');
}
async function getPage(session, horseId, year = null) {
  const q = new URLSearchParams({ '1':'1', Era:'today', QueryParameter_AtId:String(horseId) });
  if (year) q.set('QueryParameter_Yil', String(year));
  const headers = {
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
    'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.6', Accept:'text/html, */*; q=0.01',
    Referer:'https://www.tjk.org/', 'Cache-Control':'no-cache', Pragma:'no-cache'
  };
  if (session.cookie) headers.Cookie = session.cookie;
  const response = await fetch(`${BASE}?${q}`, { headers, redirect:'follow' });
  updateCookie(session, response);
  if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
  return { html:await response.text(), url:response.url };
}
function key(r) { return [r.isoDate, upper(r.city), r.distance, r.finish, r.degree].join('|'); }

export default async function handler(req, res) {
  try {
    const horseId = clean(req.query.horseId || '84236');
    const minYear = Math.max(1990, Number(req.query.minYear || 2015));
    const session = createSession();
    const first = await getPage(session, horseId);
    const meta = metadata(first.html);
    const firstRows = parseRows(first.html);
    const newestYear = Number(firstRows[0]?.isoDate?.slice(0,4)) || new Date().getUTCFullYear();

    // TJK'nin select ve özet tablolarına güvenmiyoruz: yılları doğrudan deniyoruz.
    const years = [];
    for (let y = newestYear; y >= minYear; y--) years.push(y);

    const yearDiagnostics = [];
    const union = new Map();
    for (const year of years) {
      const page = await getPage(session, horseId, year);
      const parsed = parseRows(page.html);
      const sameYear = parsed.filter(r => r.isoDate.startsWith(`${year}-`));
      sameYear.forEach(r => union.set(key(r), r));
      yearDiagnostics.push({
        year,
        listedInSelect:meta.selectYears.includes(year),
        summaryExpected:meta.summaryYears[String(year)] ?? null,
        rawRows:parsed.length,
        sameYearRows:sameYear.length,
        firstDate:sameYear[0]?.isoDate || null,
        lastDate:sameYear[sameYear.length - 1]?.isoDate || null,
        wins:sameYear.filter(r => r.finish === 1).length
      });
    }

    const unionRows = [...union.values()].sort((a,b) => b.isoDate.localeCompare(a.isoDate));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok:true, version:'DEBUG-CAREER-V9-2', horseId, minYear,
      first:{ careerTotal:meta.total, parsedRows:firstRows.length, firstDate:firstRows[0]?.isoDate || null, lastDate:firstRows[firstRows.length - 1]?.isoDate || null, summaryYears:meta.summaryYears, selectYears:meta.selectYears },
      yearDiagnostics,
      union:{ rows:unionRows.length, wins:unionRows.filter(r => r.finish === 1).length, firstDate:unionRows[0]?.isoDate || null, lastDate:unionRows[unionRows.length - 1]?.isoDate || null, complete:meta.total !== null && unionRows.length === meta.total },
      winRows:unionRows.filter(r => r.finish === 1)
    });
  } catch (e) {
    return res.status(500).json({ ok:false, version:'DEBUG-CAREER-V9-2', error:e?.message || String(e) });
  }
}
