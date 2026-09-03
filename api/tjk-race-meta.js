import * as cheerio from 'cheerio';

const VERSION = 'TJK-FOREIGN-PROGRAM-V11.4';
const TJK_BASE = 'https://www.tjk.org/TR/YarisSever/Info/Sehir/GunlukYarisProgrami';
const TIMEOUT_MS = 25000;

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function norm(v = '') {
  return clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I');
}

function key(v = '') {
  return norm(v).replace(/[^A-Z0-9]/g, '');
}

function toTjkDate(iso = '') {
  const m = clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function parseDecimal(v) {
  const t = clean(v);
  if (!t || /^[-–—]$/.test(t)) return null;
  const m = t.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseInteger(v) {
  const n = parseDecimal(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

async function fetchHtmlOnce(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache:'no-store',
      redirect:'follow',
      signal:controller.signal,
      headers:{
        'User-Agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36',
        Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.6',
        'Cache-Control':'no-cache'
      }
    });
    if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
    const html = await response.text();
    if (!html || html.length < 300) throw new Error('TJK program sayfası boş döndü.');
    return html;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await fetchHtmlOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
  throw lastError || new Error('TJK programı iki denemede alınamadı.');
}

function raceNoFromText(text = '') {
  const m = clean(text).match(/\b(\d{1,2})\s*\.\s*Koşu\b/i);
  return m ? Number(m[1]) : null;
}

function raceTimeFromText(text = '') {
  const m = clean(text).match(/\b\d{1,2}\s*\.\s*Koşu\b\s*:?\s*(\d{1,2}[.:]\d{2})?/i);
  return m?.[1] ? m[1].replace('.', ':') : '';
}

function headersForTable($, table) {
  let best = [];
  $(table).find('tr').each((_, tr) => {
    const cells = $(tr).find('th,td').toArray();
    if (!cells.length) return;
    const values = cells.map(c => clean($(c).text()));
    const ks = values.map(key);
    const looks = ks.some(x => x.includes('ATISMI') || x.includes('ATADI')) &&
      (ks.some(x => x.includes('JOKEY')) || ks.some(x => x.includes('SIKLET') || x.includes('KILO')));
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

function nearestRaceHeading($, table) {
  const all = $('body *').toArray();
  const tableIndex = all.indexOf(table);
  for (let i = tableIndex - 1; i >= 0; i -= 1) {
    const el = all[i];
    const tag = String(el.tagName || '').toLowerCase();
    if (!/^h[1-6]$/.test(tag)) continue;
    const text = clean($(el).text());
    const no = raceNoFromText(text);
    if (no) return { no, time:raceTimeFromText(text), text };
  }
  return null;
}

function nearestConditionText($, table, raceNo) {
  const all = $('body *').toArray();
  const tableIndex = all.indexOf(table);
  let condition = '';
  for (let i = tableIndex - 1; i >= 0; i -= 1) {
    const el = all[i];
    const tag = String(el.tagName || '').toLowerCase();
    if (!/^h[1-6]$/.test(tag)) continue;
    const text = clean($(el).text());
    const no = raceNoFromText(text);
    if (no) break;
    if (!condition && /\d{3,4}\s*(?:Çim|Kum|Sentetik|Dirt|Turf|All Weather|Polytrack)\b/i.test(text)) {
      condition = text;
    }
  }
  return condition;
}

function parseMeta(text = '') {
  const raw = clean(text);
  const distanceMatch = raw.match(/\b(\d{3,4})\s*(Çim|Kum|Sentetik|Dirt|Turf|All Weather|Polytrack)\b/i);
  const ageMatch = raw.match(/\b(\d+\s*(?:ve\s*Yukarı)?\s*(?:Yaşlı\s*)?(?:İngilizler|Araplar)|\d+\s*Yaşlı\s*(?:İngilizler|Araplar))\b/i);
  const parts = raw.split(',').map(clean).filter(Boolean);
  let raceClass = parts[0] || '';
  if (/^\d+\s*\.\s*Koşu/i.test(raceClass)) raceClass = parts[1] || '';
  return {
    class:raceClass,
    ageGroup:ageMatch?.[1] || '',
    distance:distanceMatch?.[1] || '',
    track:distanceMatch?.[2] || ''
  };
}

function rowText($, cell) {
  const clone = $(cell).clone();
  clone.find('script,style,.tooltip,.tooltiptextt,.popover,[title]').remove();
  return clean(clone.text());
}

function parseHorseRows($, table, headers) {
  const idxNo = headerIndex(headers, ['N','At No','No','Sıra']);
  const idxName = headerIndex(headers, ['At İsmi','At Adı','At']);
  const idxAge = headerIndex(headers, ['Yaş','Yas']);
  const idxWeight = headerIndex(headers, ['Sıklet','Siklet','Kilo']);
  const idxJockey = headerIndex(headers, ['Jokey','Jockey']);
  const idxOwner = headerIndex(headers, ['Sahip','Owner']);
  const idxTrainer = headerIndex(headers, ['Antrenör','Antrenor','Trainer']);
  const idxSt = headerIndex(headers, ['St','Start','Kulvar']);
  const idxHp = headerIndex(headers, ['HP','H']);
  const idxLast6 = headerIndex(headers, ['Son 6 Y.','Son 6','Son6']);
  const idxKgs = headerIndex(headers, ['KGS']);
  const idxS20 = headerIndex(headers, ['s20','S20']);
  const idxBest = headerIndex(headers, ['En İyi D.','En Iyi D.','En İyi Derece']);
  const idxGny = headerIndex(headers, ['Gny','Ganyan','Muhtemel']);
  const idxAgf = headerIndex(headers, ['AGF']);
  const idxOrigin = headerIndex(headers, ['Orijin(Baba - Anne)','Orijin']);

  const horses = [];
  $(table).find('tr').each((_, tr) => {
    const cells = $(tr).find('td').toArray();
    if (!cells.length) return;
    const values = cells.map(c => rowText($, c));
    const get = idx => idx >= 0 && idx < values.length ? values[idx] : '';
    let no = parseInteger(get(idxNo));
    if (!no) {
      for (const value of values.slice(0, 3)) {
        const n = parseInteger(value);
        if (n && n > 0 && n < 100) { no = n; break; }
      }
    }
    let name = clean(get(idxName));
    if (!name) return;
    name = name.replace(/\s+\b(?:KG|SK|DB|KUL|GKR|SGKR)\b.*$/i, '').trim();
    if (!no || !name) return;

    let id = null;
    const atLink = $(tr).find('a[href*="QueryParameter_AtId="],a[href*="AtKosuBilgileri"]').first();
    if (atLink.length) {
      const href = atLink.attr('href') || '';
      const m = href.match(/(?:QueryParameter_AtId|AtId)=([0-9]+)/i);
      if (m) id = Number(m[1]);
    }

    horses.push({
      no,
      id,
      name,
      age:get(idxAge),
      origin:get(idxOrigin),
      weight:parseDecimal(get(idxWeight)),
      weightText:get(idxWeight),
      jockey:get(idxJockey),
      owner:get(idxOwner),
      trainer:get(idxTrainer),
      st:parseInteger(get(idxSt)),
      hp:parseInteger(get(idxHp)),
      last6:get(idxLast6),
      kgs:parseInteger(get(idxKgs)),
      s20:parseDecimal(get(idxS20)),
      best:get(idxBest),
      odds:parseDecimal(get(idxGny)),
      gny:parseDecimal(get(idxGny)),
      agf:parseDecimal(get(idxAgf)),
      foreignNoAtId:!id
    });
  });

  return [...new Map(horses.map(h => [`${h.no}|${h.id || norm(h.name)}`, h])).values()]
    .sort((a,b) => a.no - b.no);
}

function parseRaces(html) {
  const $ = cheerio.load(html);
  $('script,style,noscript').remove();
  const out = new Map();

  $('table').each((_, table) => {
    const headers = headersForTable($, table);
    if (!headers.length) return;
    const heading = nearestRaceHeading($, table);
    if (!heading?.no) return;
    const horses = parseHorseRows($, table, headers);
    if (!horses.length) return;
    const conditionText = nearestConditionText($, table, heading.no);
    const meta = parseMeta(conditionText);
    const race = {
      no:heading.no,
      time:heading.time || '',
      class:meta.class,
      yaradi1:meta.class,
      ageGroup:meta.ageGroup,
      yaradi2:meta.ageGroup,
      condition:'',
      yaradi3:'',
      distance:meta.distance,
      mesafe:meta.distance,
      track:meta.track,
      pist:meta.track,
      betStarts:[],
      horses,
      programLoaded:true,
      detailsLoaded:true,
      source:'TJK Günlük Yarış Programı — AtId bağımsız tablo parserı'
    };
    const current = out.get(race.no);
    if (!current || horses.length > current.horses.length) out.set(race.no, race);
  });

  return [...out.values()].sort((a,b) => a.no - b.no);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
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
    const horseCount = races.reduce((sum, r) => sum + (r.horses?.length || 0), 0);
    return res.status(200).json({
      ok:true,
      version:VERSION,
      date,
      cityId,
      cityName,
      raceCount:races.length,
      horseCount,
      races,
      sourceUrl:url.toString()
    });
  } catch (e) {
    return res.status(502).json({
      ok:false,
      version:VERSION,
      error:e?.name === 'AbortError' ? 'TJK yabancı program sayfası zaman aşımına uğradı.' : (e?.message || 'Yabancı yarış programı alınamadı.')
    });
  }
}
