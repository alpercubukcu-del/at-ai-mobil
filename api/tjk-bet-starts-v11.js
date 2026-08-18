import * as cheerio from 'cheerio';

const VERSION = 'TJK-BET-STARTS-V11.0';
const BASE_URL = 'https://www.tjk.org/TR/YarisSever/Info/Sehir/GunlukYarisProgrami';
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
      signal:controller.signal
    });
    if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
    const html = await response.text();
    if (!html) throw new Error('TJK boş program sayfası döndürdü.');
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

/*
  Bazı TJK şablonlarında bahis metni h4 yerine div/a içinde olabilir.
  İkinci geçişte DOM sırasını koruyup yalnız doğrudan metni olan blokları tararız.
*/
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

export default async function handler(req, res) {
  const startedAt = Date.now();
  try {
    const date = clean(req.query?.date || '');
    const cityId = clean(req.query?.cityId || '');
    const cityName = clean(req.query?.cityName || '');
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
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      ok:true,
      version:VERSION,
      date,
      cityId,
      cityName,
      races,
      allStarts,
      startCount:allStarts.length,
      sourceUrl:url.toString(),
      durationMs:Date.now()-startedAt
    });
  } catch (e) {
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.name === 'AbortError' ? 'TJK bahis başlangıç sayfası zaman aşımına uğradı.' : (e?.message || 'Bahis başlangıçları alınamadı.'),
      durationMs:Date.now()-startedAt
    });
  }
}
