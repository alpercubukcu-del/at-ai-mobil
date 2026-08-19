import * as cheerio from 'cheerio';

const VERSION = 'TJK-BET-STARTS-V11.8-OFFICIAL';
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
  if (!raw) return null;

  /*
    TJK iki farklı gösterim kullanıyor:
    1) "1. 6'LI GANYAN Bu koşudan başlar"
    2) Yarışın bahis satırında bağımsız "4'LÜ GANYAN"

    İkinci biçim de o yarıştan başlayan resmi çok-ayaklı bahistir.
    Eski parser yalnız 1. biçimi kabul ettiği için 4'lü gibi bahisleri kaçırıp
    ön yüzde yanlışlıkla 1. koşudan tahmin ediyordu.
  */
  const marker = /Bu\s+koşudan\s+başlar/i;
  const before = marker.test(raw) ? clean(raw.split(marker)[0]) : raw;
  const normalized = upper(before);

  const legMatch = normalized.match(/(?:^|\s|,)([34567])\s*['’]?\s*L[IU](?:\s|,|$)/);
  if (!legMatch) return null;
  if (!/(GANYAN|PLASE)/.test(normalized)) return null;

  const leg = legMatch[1];
  const kind = /PLASE/.test(normalized) ? 'PLASE' : 'GANYAN';

  // Varyant yalnız bahis adının başında gerçekten varsa korunur (1. / 2. 6'lı gibi).
  const ordinal = before.match(/^\s*([12])\s*\.\s*(?=[34567]\s*['’]?\s*[Ll])/i)?.[1] || '';
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

function nearestAgfLegForTable($, table) {
  const all = $('body *').toArray();
  const tableIndex = all.indexOf(table);
  for (let i = tableIndex - 1; i >= 0; i -= 1) {
    const el = all[i];
    const text = clean($(el).clone().children().remove().end().text() || $(el).text());
    const m = text.match(/^(\d{1,2})\s*\.\s*AYAK\b/i);
    if (m) return Number(m[1]);
  }
  return null;
}

function parseAgfHtml(html) {
  const $ = cheerio.load(html);
  $('script,style,noscript').remove();
  const legs = {};

  $('table').each((_, table) => {
    const leg = nearestAgfLegForTable($, table);
    if (!leg) return;
    const horses = legs[String(leg)] || {};

    $(table).find('tr').each((__, tr) => {
      $(tr).find('td,th').each((___, cell) => {
        const text = clean($(cell).text());
        if (!text || !text.includes('%') || !text.includes('(')) return;
        const re = /(?:^|[^0-9])(\d{1,2})\s*\(\s*%\s*(\d+(?:[.,]\d+)?)\s*\)/g;
        let m;
        while ((m = re.exec(text))) {
          const no = Number(m[1]);
          const agf = Number(String(m[2]).replace(',', '.'));
          if (!Number.isFinite(no) || !Number.isFinite(agf) || no < 1 || no > 99) continue;
          horses[String(no)] = agf;
        }
      });
    });

    if (Object.keys(horses).length) legs[String(leg)] = horses;
  });

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
