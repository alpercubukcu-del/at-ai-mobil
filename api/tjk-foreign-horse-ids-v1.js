import * as cheerio from 'cheerio';

const VERSION = 'TJK-FOREIGN-HORSE-IDS-V1';
const TJK_BASE = 'https://www.tjk.org/TR/YarisSever/Info/Sehir/GunlukYarisProgrami';
const TIMEOUT_MS = 20000;

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function norm(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
}
function key(v = '') { return norm(v).replace(/[^A-Z0-9]/g, ''); }
function toTjkDate(iso = '') {
  const m = clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function parseInteger(v) {
  const m = clean(v).match(/-?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function negativeAtId(href = '') {
  try {
    const u = new URL(href, 'https://www.tjk.org');
    const raw = clean(u.searchParams.get('QueryParameter_AtId') || u.searchParams.get('AtId'));
    if (/^-\d+$/.test(raw)) return Number(raw);
  } catch {}
  const m = String(href).match(/(?:QueryParameter_AtId|AtId)=(-\d+)/i);
  return m ? Number(m[1]) : null;
}
async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache:'no-store', redirect:'follow', signal:controller.signal,
      headers:{
        'User-Agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36',
        Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.6',
        'Cache-Control':'no-cache', Pragma:'no-cache'
      }
    });
    if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
    const html = await response.text();
    if (!html || html.length < 300) throw new Error('TJK yabancı program sayfası boş döndü.');
    return html;
  } finally { clearTimeout(timer); }
}
function raceNoFromText(text = '') {
  const m = clean(text).match(/\b(\d{1,2})\s*\.\s*Koşu\b/i);
  return m ? Number(m[1]) : null;
}
function nearestRaceHeading($, table) {
  const all = $('body *').toArray();
  const tableIndex = all.indexOf(table);
  for (let i = tableIndex - 1; i >= 0; i -= 1) {
    const el = all[i];
    const tag = String(el.tagName || '').toLowerCase();
    if (!/^h[1-6]$/.test(tag)) continue;
    const no = raceNoFromText($(el).text());
    if (no) return no;
  }
  return null;
}
function headersForTable($, table) {
  let best = [];
  $(table).find('tr').slice(0, 8).each((_, tr) => {
    const values = $(tr).find('th,td').map((__, c) => clean($(c).text())).get();
    const ks = values.map(key);
    const looks = ks.some(x => x.includes('ATISMI') || x.includes('ATADI') || x === 'AT') &&
      ks.some(x => x === 'N' || x === 'NO' || x.includes('SIRA'));
    if (looks && values.length > best.length) best = values;
  });
  return best;
}
function headerIndex(headers, aliases) {
  const hs = headers.map(key);
  for (const alias of aliases) {
    const a = key(alias);
    let i = hs.findIndex(h => h === a);
    if (i >= 0) return i;
    i = hs.findIndex(h => h.includes(a) || a.includes(h));
    if (i >= 0) return i;
  }
  return -1;
}
function parseRaces(html) {
  const $ = cheerio.load(html);
  const out = new Map();

  $('table').each((_, table) => {
    const links = $(table).find('a[href*="AtKosuBilgileri_Y"],a[href*="QueryParameter_AtId=-"]');
    if (!links.length) return;
    const raceNo = nearestRaceHeading($, table);
    if (!raceNo) return;
    const headers = headersForTable($, table);
    const idxNo = headerIndex(headers, ['N','No','At No','Sıra']);
    const idxName = headerIndex(headers, ['At İsmi','At Adı','At']);
    const horses = [];

    $(table).find('tr').each((__, tr) => {
      const atLink = $(tr).find('a[href*="AtKosuBilgileri_Y"],a[href*="QueryParameter_AtId=-"]').first();
      if (!atLink.length) return;
      const id = negativeAtId(atLink.attr('href') || '');
      if (!Number.isFinite(id) || id >= 0) return;
      const cells = $(tr).find('td').toArray();
      const values = cells.map(c => clean($(c).text()));
      const get = idx => idx >= 0 && idx < values.length ? values[idx] : '';
      let no = parseInteger(get(idxNo));
      if (!no) {
        for (const value of values.slice(0, 3)) {
          const n = parseInteger(value);
          if (n && n > 0 && n < 100) { no = n; break; }
        }
      }
      let name = clean(atLink.text()) || clean(get(idxName));
      name = name.replace(/\s+\b(?:KG|SK|DB|KUL|GKR|SGKR)\b.*$/i, '').trim();
      if (!no || !name) return;
      horses.push({ no, name, id, foreignCareerAvailable:true });
    });

    if (horses.length) {
      out.set(raceNo, {
        no:raceNo,
        horses:[...new Map(horses.map(h => [`${h.no}|${h.id}`, h])).values()].sort((a,b)=>a.no-b.no)
      });
    }
  });
  return [...out.values()].sort((a,b)=>a.no-b.no);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  try {
    const date = clean(req.query?.date || '');
    const cityId = clean(req.query?.cityId || '');
    const cityName = clean(req.query?.cityName || req.query?.city || '');
    const tjkDate = toTjkDate(date);
    if (!date || !tjkDate || !cityId || !cityName) {
      return res.status(400).json({ ok:false, version:VERSION, error:'date, cityId ve cityName zorunludur.' });
    }
    const url = new URL(TJK_BASE);
    url.searchParams.set('Era','today');
    url.searchParams.set('QueryParameter_Tarih',tjkDate);
    url.searchParams.set('SehirAdi',cityName);
    url.searchParams.set('SehirId',cityId);
    const html = await fetchHtml(url.toString());
    const races = parseRaces(html);
    const horseCount = races.reduce((sum,r)=>sum+(r.horses?.length||0),0);
    return res.status(200).json({ ok:true, version:VERSION, date, cityId, cityName, raceCount:races.length, horseCount, races, sourceUrl:url.toString() });
  } catch (e) {
    return res.status(502).json({ ok:false, version:VERSION, error:e?.name === 'AbortError' ? 'TJK yabancı program sayfası zaman aşımına uğradı.' : (e?.message || 'Yabancı at kimlikleri alınamadı.') });
  }
}
