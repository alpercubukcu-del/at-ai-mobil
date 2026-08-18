import * as cheerio from 'cheerio';

const VERSION = 'TJK-BET-STARTS-V11.4-AGF';
const BASE_URL = 'https://www.tjk.org/TR/YarisSever/Info/Sehir/GunlukYarisProgrami';
const AGF_ROOT = 'https://www.tjk.org/AGFv2';
const TIMEOUT_MS = 25000;

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

function toTjkDate(iso = '') {
  const m = clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : clean(iso);
}

function toAgfDate(iso = '') {
  const m = clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}${m[2]}${m[1]}` : '';
}

function raceNoFromText(text = '') {
  const m = clean(text).match(/(?:^|\s)(\d{1,2})\s*\.\s*Koşu\b/i);
  return m ? Number(m[1]) : null;
}

function normalizeBetLabel(text = '') {
  const raw = clean(text);
  if (!/Bu\s+koşudan\s+başlar/i.test(raw)) return null;
  const before = clean(raw.split(/Bu\s+koşudan\s+başlar/i)[0]);
  const normalized = upper(before);
  if (!/(?:3|4|5|6|7)\s*['’]?\s*L[IU]/.test(normalized)) return null;
  if (!/(GANYAN|PLASE)/.test(normalized)) return null;

  const ordinal = before.match(/^\s*([12])\s*\./)?.[1] || '';
  const leg = normalized.match(/([34567])\s*['’]?\s*L[IU]/)?.[1] || '';
  const kind = /PLASE/.test(normalized) ? 'PLASE' : 'GANYAN';
  if (!leg) return null;
  const suffix = ['3','4'].includes(leg) ? "'LÜ" : "'Lİ";
  return `${ordinal ? `${ordinal}. ` : ''}${leg}${suffix} ${kind}`;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers:{
        'User-Agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36',
        'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.5',
        Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control':'no-cache'
      },
      redirect:'follow',
      cache:'no-store',
      signal:controller.signal
    });
    if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
    const html = await response.text();
    if (!html) throw new Error('TJK boş sayfa döndürdü.');
    return html;
  } finally {
    clearTimeout(timer);
  }
}

function parseHeadings(html) {
  const $ = cheerio.load(html);
  const starts = new Map();
  let currentRace = null;

  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const text = clean($(el).text());
    if (!text) return;
    const raceNo = raceNoFromText(text);
    if (raceNo) {
      currentRace = raceNo;
      if (!starts.has(currentRace)) starts.set(currentRace, []);
      return;
    }
    if (!currentRace) return;
    const label = normalizeBetLabel(text);
    if (!label) return;
    const list = starts.get(currentRace) || [];
    if (!list.includes(label)) list.push(label);
    starts.set(currentRace, list);
  });

  return starts;
}

function parseFallbackBlocks(html, existing) {
  const $ = cheerio.load(html);
  const starts = new Map(existing);
  let currentRace = null;

  $('body *').each((_, el) => {
    const $el = $(el);
    if ($el.children().length) return;
    const text = clean($el.text());
    if (!text || text.length > 180) return;
    const raceNo = raceNoFromText(text);
    if (raceNo) {
      currentRace = raceNo;
      if (!starts.has(currentRace)) starts.set(currentRace, []);
      return;
    }
    if (!currentRace) return;
    const label = normalizeBetLabel(text);
    if (!label) return;
    const list = starts.get(currentRace) || [];
    if (!list.includes(label)) list.push(label);
    starts.set(currentRace, list);
  });
  return starts;
}

function parseAgfHtml(html) {
  const $ = cheerio.load(html);
  $('script,style,noscript').remove();
  const text = $('body').text().replace(/\u00a0/g, ' ');
  const headers = [];
  const reHead = /(\d{1,2})\s*\.\s*AYAK\b/gi;
  let hm;
  while ((hm = reHead.exec(text))) {
    headers.push({ leg:Number(hm[1]), start:hm.index, end:reHead.lastIndex });
  }

  const legs = {};
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    const next = headers[i + 1]?.start ?? text.length;
    const segment = text.slice(h.end, next);
    const horses = {};
    const reHorse = /(\d{1,2})\s*\(\s*%\s*(\d+(?:[.,]\d+)?)\s*\)/g;
    let m;
    while ((m = reHorse.exec(segment))) {
      const no = Number(m[1]);
      const agf = Number(String(m[2]).replace(',', '.'));
      if (!Number.isFinite(no) || !Number.isFinite(agf)) continue;
      horses[String(no)] = agf;
    }
    if (Object.keys(horses).length) legs[String(h.leg)] = horses;
  }
  return legs;
}

function startRaceForPool(starts, poolNo) {
  const wanted = `${poolNo}. 6'LI GANYAN`;
  for (const [raceNo, labels] of starts.entries()) {
    if ((labels || []).some(label => upper(label) === upper(wanted))) return Number(raceNo);
  }
  return null;
}

async function loadAgfPool(cityId, date, poolNo, starts) {
  const compactDate = toAgfDate(date);
  if (!compactDate) return null;
  const startRace = startRaceForPool(starts, poolNo);
  if (!startRace) return null;

  const url = `${AGF_ROOT}/${encodeURIComponent(cityId)}/${compactDate}/TR/${poolNo}/1`;
  try {
    const html = await fetchHtml(url);
    const legs = parseAgfHtml(html);
    const byRace = {};
    for (const [legText, horseMap] of Object.entries(legs)) {
      const leg = Number(legText);
      if (!Number.isFinite(leg) || leg < 1) continue;
      byRace[String(startRace + leg - 1)] = horseMap;
    }
    return {
      poolNo,
      startRace,
      legs,
      byRace,
      sourceUrl:url,
      horseValueCount:Object.values(legs).reduce((sum, x) => sum + Object.keys(x || {}).length, 0)
    };
  } catch (e) {
    return {
      poolNo,
      startRace,
      legs:{},
      byRace:{},
      sourceUrl:url,
      error:e?.message || String(e),
      horseValueCount:0
    };
  }
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  try {
    const date = clean(req.query?.date || '');
    const cityId = clean(req.query?.cityId || '');
    const cityName = clean(req.query?.cityName || req.query?.city || '');
    if (!date || !cityId || !cityName) {
      return res.status(400).json({ ok:false, version:VERSION, error:'date, cityId ve cityName zorunludur.' });
    }

    const url = new URL(BASE_URL);
    url.searchParams.set('Era', 'today');
    url.searchParams.set('QueryParameter_Tarih', toTjkDate(date));
    url.searchParams.set('SehirAdi', cityName);
    url.searchParams.set('SehirId', cityId);

    const html = await fetchHtml(url.toString());
    let starts = parseHeadings(html);
    starts = parseFallbackBlocks(html, starts);

    const races = [...starts.entries()]
      .filter(([raceNo]) => Number.isFinite(Number(raceNo)))
      .sort((a,b) => Number(a[0])-Number(b[0]))
      .map(([raceNo, betStarts]) => ({ raceNo:Number(raceNo), betStarts }));

    const allStarts = races.flatMap(r => r.betStarts.map(label => ({ raceNo:r.raceNo, label })));

    const [agf1, agf2] = await Promise.all([
      loadAgfPool(cityId, date, 1, starts),
      loadAgfPool(cityId, date, 2, starts)
    ]);

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({
      ok:true,
      version:VERSION,
      date,
      cityId,
      cityName,
      races,
      allStarts,
      startCount:allStarts.length,
      agf:{ pool1:agf1, pool2:agf2 },
      sourceUrl:url.toString(),
      durationMs:Date.now()-startedAt
    });
  } catch (e) {
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.name === 'AbortError' ? 'TJK sayfası zaman aşımına uğradı.' : (e?.message || 'Bahis başlangıçları / AGF alınamadı.'),
      durationMs:Date.now()-startedAt
    });
  }
}
