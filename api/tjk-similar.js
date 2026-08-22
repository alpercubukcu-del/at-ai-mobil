import * as cheerio from 'cheerio';

const VERSION = 'TJK-EXACT-HISTORY-V7.2.1';
const TJK = 'https://www.tjk.org';
const PAGE_URL = `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;
const DATA_URL = `${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;
const ROWS_URL = `${TJK}/TR/YarisSever/Query/DataRows/KosuSorgulama`;
const RESULT_INDEX_URL = `${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari`;
const SORT = 'Tarih desc, Sehir asc, KosuSirasi asc';
const DAY_WINDOW = 45;
const DEFAULT_MIN_YEAR = 2000;
const VERIFY_CONCURRENCY = 2;

const HEADERS = {
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:PAGE_URL,
  'cache-control':'no-cache'
};

function clean(v = '') {
  return String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function upper(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeClass(v = '') {
  return upper(v)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCity(v = '') {
  return upper(v).replace(/[^A-Z0-9]/g, '');
}

function normalizeTrack(v = '') {
  const t = upper(v);
  if (t.includes('SENTETIK')) return 'SENTETIK';
  if (t.includes('CIM')) return 'CIM';
  if (t.includes('KUM')) return 'KUM';
  return t;
}

function displayTrack(v = '') {
  const t = normalizeTrack(v);
  if (t === 'SENTETIK') return 'Sentetik';
  if (t === 'CIM') return 'Çim';
  if (t === 'KUM') return 'Kum';
  return clean(v);
}

function parseAge(v = '') {
  const t = upper(v).replace(/\s+/g, ' ');
  let breed = '';
  if (t.includes('INGILIZ')) breed = 'I';
  else if (t.includes('ARAP')) breed = 'A';

  let m = t.match(/(\d+)\s*VE\s*YUKARI/);
  if (m) return { breed, min:Number(m[1]), max:99 };

  m = t.match(/(\d+)\s*YASLI/);
  if (m) return { breed, min:Number(m[1]), max:Number(m[1]) };

  m = t.replace(/\s+/g, '').match(/^(\d+)(\+)?([IA])$/);
  if (m) return { breed:m[3], min:Number(m[1]), max:m[2] ? 99 : Number(m[1]) };

  return { breed, min:null, max:null };
}

function ageKey(v = '') {
  const a = parseAge(v);
  if (a.breed && a.min !== null && a.max !== null) return `${a.breed}:${a.min}:${a.max}`;
  return upper(v).replace(/\s+/g, '');
}

function parseDisplayDate(v = '') {
  const m = clean(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const dd = String(m[1]).padStart(2, '0');
  const mm = String(m[2]).padStart(2, '0');
  return { display:`${dd}.${mm}.${m[3]}`, iso:`${m[3]}-${mm}-${dd}` };
}

function parseIso(v = '') {
  const m = clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { year:Number(m[1]), month:Number(m[2]), day:Number(m[3]) } : null;
}

function isoToDisplay(iso = '', separator = '.') {
  const p = parseIso(iso);
  return p ? `${String(p.day).padStart(2,'0')}${separator}${String(p.month).padStart(2,'0')}${separator}${p.year}` : '';
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function anchorIso(targetIso, year) {
  const p = parseIso(targetIso);
  if (!p) return null;
  const day = Math.min(p.day, daysInMonth(year, p.month));
  return `${year}-${String(p.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function daysBetween(a, b) {
  const x = parseIso(a), y = parseIso(b);
  if (!x || !y) return null;
  const xa = Date.UTC(x.year, x.month - 1, x.day);
  const ya = Date.UTC(y.year, y.month - 1, y.day);
  return Math.round(Math.abs(xa - ya) / 86400000);
}

function parseRaceFamily(v = '') {
  const t = normalizeClass(v);

  /*
    "Kısa Vade Handikap 24" bağımsız bir TJK sınıfıdır. Generic HANDİKAP
    kontrolünden önce yakalanmazsa geçmiş sorgusunda yanlışlıkla "Handikap 24"
    seçilir ve Kısa Vade referansları kaybolur.
  */
  let m = t.match(/\bKISA\s+VADE(?:LI)?\s+HANDIKAP\s*(\d+)\b/)
    || t.match(/\bKV\s+HANDIKAP\s*(\d+)\b/);
  if (m) return { family:'KISA_VADE_HANDIKAP', level:Number(m[1]) };

  m = t.match(/\bHANDIKAP\s*(\d+)\b/);
  if (m) return { family:'HANDIKAP', level:Number(m[1]) };
  m = t.match(/\bSARTLI\s*(\d+)\b/);
  if (m) return { family:'SARTLI', level:Number(m[1]) };
  m = t.match(/\bKV[- ]*(\d+)\b/);
  if (m) return { family:'KV', level:Number(m[1]) };
  m = t.match(/\b(?:G|GRUP)\s*-?\s*([123])\b/);
  if (m) return { family:'GROUP', level:Number(m[1]) };
  m = t.match(/^SATIS\s*-?\s*(\d+)\b/);
  if (m) return { family:'SATIS', level:Number(m[1]) };
  if (/^OPSIYONEL\s+SATIS\b/.test(t)) return { family:'OPSIYONEL_SATIS', level:null };
  if (/^MAIDEN\b/.test(t)) return { family:'MAIDEN', level:0 };
  if (/^SATIS\b/.test(t)) return { family:'SATIS', level:null };
  return { family:t.split('/')[0], level:null };
}

function canonicalDecoratorToken(v = '') {
  const t = upper(v).replace(/\s+/g, '');
  if (t === 'D' || t === 'DISI') return 'DISI';

  const y = t.match(/^Y-?(\d+)$/);
  if (y) return `Y${Number(y[1])}`;

  const h = t.match(/^H-?(\d+)$/);
  if (h) return `H${Number(h[1])}`;

  return t;
}

function classTokens(v = '') {
  return normalizeClass(v).split('/').slice(1)
    .map(canonicalDecoratorToken)
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .sort();
}

function classCoreKey(v = '') {
  const family = parseRaceFamily(v);
  return `${family.family}:${family.level ?? ''}|${classTokens(v).join('/')}`;
}

/*
  TJK Koşu Sorgulama tablosu Y-0/Y-1/Y-2/Y-3 bilgisini bazı satırlarda
  Koşu Cinsi sütunundan düşürüyor. Bu anahtar yalnız ADAY bulmak içindir.
  Nihai kabul tam sonuç sayfasındaki koşu başlığıyla yapılır.
*/
function queryClassKey(v = '') {
  const family = parseRaceFamily(v);
  const tokens = classTokens(v).filter(x => !/^Y\d+$/.test(x));
  return `${family.family}:${family.level ?? ''}|${tokens.join('/')}`;
}

function optionList($, selector) {
  return $(selector).find('option').map((_, option) => ({
    value:clean($(option).attr('value') || ''),
    text:clean($(option).text())
  })).get();
}

function classHead(v = '') {
  return normalizeClass(v).split('/')[0].trim();
}

function findClassOption(options, targetClass) {
  const targetNorm = normalizeClass(targetClass);
  const targetHead = classHead(targetClass);

  /* En güvenli yol: önce TJK seçeneğinin tam sınıf başlığını koru. */
  const exact = options.find(x => normalizeClass(x.text) === targetNorm);
  if (exact) return exact;

  const sameHead = options.find(x => classHead(x.text) === targetHead);
  if (sameHead) return sameHead;

  /* Yazım varyantları (Kısa Vade / Kısa Vadeli / KV Handikap) için aile fallback'i. */
  const target = parseRaceFamily(targetClass);
  return options.find(x => {
    const f = parseRaceFamily(x.text);
    return f.family === target.family && f.level === target.level;
  }) || null;
}

async function fetchText(url, options = {}, timeoutMs = 18000, attempts = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        headers:{ ...HEADERS, ...(options.headers || {}) },
        redirect:'follow',
        signal:controller.signal
      });
      if (!response.ok) throw new Error(`TJK HTTP ${response.status}`);
      return await response.text();
    } catch (e) {
      lastError = e?.name === 'AbortError' ? new Error('TJK doğrulama isteği zaman aşımına uğradı.') : e;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('TJK doğrulama isteği başarısız.');
}

async function resolveFilters(target) {
  const response = await fetch(PAGE_URL, { headers:HEADERS, redirect:'follow' });
  if (!response.ok) throw new Error(`TJK GET HTTP ${response.status}`);
  const $ = cheerio.load(await response.text());
  return {
    raceClass:findClassOption(optionList($, '#QueryParameter_KosuCinsiId'), target.class),
    city:optionList($, '#QueryParameter_SehirId').find(x => normalizeCity(x.text) === normalizeCity(target.city)) || null,
    group:optionList($, '#QueryParameter_GrupId').find(x => ageKey(x.text) === ageKey(target.ageGroup)) || null,
    track:optionList($, '#QueryParameter_PistId').find(x => normalizeTrack(x.text) === normalizeTrack(target.track)) || null
  };
}

async function postForm(url, data, allowMissingPage = false) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) body.set(key, String(value ?? ''));
  const response = await fetch(url, {
    method:'POST',
    headers:{
      ...HEADERS,
      'content-type':'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with':'XMLHttpRequest'
    },
    body:body.toString(),
    redirect:'follow'
  });

  if (allowMissingPage && response.status === 404) return null;
  if (!response.ok) throw new Error(`TJK POST HTTP ${response.status}`);
  return response.text();
}

function parseQueryTable(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const rows = [];

  $('table').each((_, table) => {
    const headers = $(table).find('thead th').map((__, th) => clean($(th).text())).get();
    const ix = re => headers.findIndex(x => re.test(clean(x)));
    const dateIx = ix(/^Tarih$/i);
    const cityIx = ix(/^Şehir$|^Sehir$/i);
    const raceIx = ix(/^Koşu$|^Kosu$/i);
    const ageIx = ix(/^Grup$/i);
    const classIx = ix(/Koşu Cinsi|Kosu Cinsi/i);
    const distanceIx = ix(/^Mesafe$/i);
    const trackIx = ix(/^Pist$/i);
    if ([dateIx,cityIx,raceIx,ageIx,classIx,distanceIx,trackIx].some(x => x < 0)) return;

    $(table).find('tbody tr').each((__, tr) => {
      const cells = $(tr).find('td').map((___, td) => clean($(td).text())).get();
      const pd = parseDisplayDate(cells[dateIx]);
      if (!pd) return;
      rows.push({
        date:pd.display,
        isoDate:pd.iso,
        city:cells[cityIx],
        raceNo:Number(String(cells[raceIx] || '').match(/\d+/)?.[0] || 0),
        ageGroup:cells[ageIx],
        class:cells[classIx],
        distance:Number(String(cells[distanceIx] || '').match(/\d{3,4}/)?.[0] || 0),
        track:cells[trackIx]
      });
    });
  });
  return rows;
}

function parseHeaders($, table) {
  return $(table).find('thead th').map((_, th) => clean($(th).text())).get();
}

function rowCell(cells, ix) {
  return ix >= 0 && ix < cells.length ? cells[ix] : '';
}

function findIndex(headers, regex) {
  return headers.findIndex(h => regex.test(clean(h)));
}

function normalizeHorseName(v = '') {
  return upper(v).replace(/\([^)]*\)/g, ' ').replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseFinish(v = '') {
  const n = Number(clean(v).match(/\d+/)?.[0] || 0);
  return n > 0 ? n : null;
}

function parseMoney(v = '') {
  const t = clean(v).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseWeight(v = '') {
  const n = Number(clean(v).replace(',', '.').match(/\d+(?:\.\d+)?/)?.[0] || NaN);
  return Number.isFinite(n) ? n : null;
}

function parseTime(v = '') {
  const t = clean(v);
  if (!t) return null;
  const m = t.match(/(?:(\d+)[.:])?(\d+)[.:](\d{1,2})/);
  if (m) {
    const min = Number(m[1] || 0), sec = Number(m[2] || 0), cs = Number(m[3] || 0);
    return min * 60 + sec + cs / (m[3].length === 1 ? 10 : 100);
  }
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseGanyan(v = '') {
  const n = Number(clean(v).replace(',', '.').match(/\d+(?:\.\d+)?/)?.[0] || NaN);
  return Number.isFinite(n) ? n : null;
}

function parseHrefId(v = '') {
  const href = clean(v);
  for (const re of [/AtId=(\d+)/i,/AtKodu=(\d+)/i,/horseId=(\d+)/i,/id=(\d+)/i]) {
    const m = href.match(re);
    if (m) return m[1];
  }
  return '';
}

function parseHorseRows($, table) {
  const headers = parseHeaders($, table);
  const ix = re => findIndex(headers, re);
  const noIx = ix(/^No$|^N$|At No|Forma/i);
  const horseIx = ix(/^At$|At İsmi|At Ismi|At Adı|At Adi/i);
  const finishIx = ix(/Derece|Sıra|Sira|Bitiriş|Bitiris|Sonuç|Sonuc/i);
  const weightIx = ix(/Kilo|Sıklet|Siklet/i);
  const jockeyIx = ix(/Jokey/i);
  const ownerIx = ix(/Sahip/i);
  const trainerIx = ix(/Antrenör|Antrenor/i);
  const timeIx = ix(/Müddet|Muddet|Derece Zaman|Zaman/i);
  const oddsIx = ix(/Ganyan|Gny/i);
  const hpIx = ix(/^HP$|Handikap Puan/i);
  const rows = [];

  $(table).find('tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const cells = $tr.find('td').map((__, td) => clean($(td).text())).get();
    if (!cells.length) return;
    const horseCell = horseIx >= 0 ? $tr.find('td').eq(horseIx) : null;
    const horseName = horseIx >= 0 ? rowCell(cells, horseIx) : '';
    if (!horseName) return;
    const href = horseCell?.find('a').first().attr('href') || '';
    rows.push({
      no: noIx >= 0 ? Number(rowCell(cells, noIx).match(/\d+/)?.[0] || 0) || null : null,
      horse:horseName,
      horseKey:normalizeHorseName(horseName),
      horseId:parseHrefId(href),
      finish:finishIx >= 0 ? parseFinish(rowCell(cells, finishIx)) : null,
      weight:weightIx >= 0 ? parseWeight(rowCell(cells, weightIx)) : null,
      jockey:jockeyIx >= 0 ? rowCell(cells, jockeyIx) : '',
      owner:ownerIx >= 0 ? rowCell(cells, ownerIx) : '',
      trainer:trainerIx >= 0 ? rowCell(cells, trainerIx) : '',
      time:timeIx >= 0 ? parseTime(rowCell(cells, timeIx)) : null,
      odds:oddsIx >= 0 ? parseGanyan(rowCell(cells, oddsIx)) : null,
      hp:hpIx >= 0 ? Number(rowCell(cells, hpIx).match(/\d+/)?.[0] || 0) || null : null
    });
  });

  return rows;
}

function parseRaceHeader(text = '') {
  const t = clean(text);
  const parts = t.split(',').map(clean).filter(Boolean);
  const classText = parts[0] || '';
  const ageGroup = parts[1] || '';
  const distanceTrack = parts.slice(2).join(' ');
  const distance = Number(distanceTrack.match(/\b(\d{3,4})\b/)?.[1] || 0) || null;
  const track = distanceTrack.match(/\b(Çim|Cim|Kum|Sentetik)\b/i)?.[1] || '';
  return { classText, ageGroup, distance, track };
}

function parseResultPage(html, source = {}) {
  const $ = cheerio.load(html || '');
  const bodyText = clean($.root().text());
  const heading = $('h1,h2,h3,h4,.title,.race-title,.kosuBaslik,.kosu-title').map((_, el) => clean($(el).text())).get().find(x => /\b\d{3,4}\b/.test(x) && /(Çim|Cim|Kum|Sentetik)/i.test(x)) || '';
  const meta = parseRaceHeader(heading || bodyText.match(/([^\n]{0,160}\b\d{3,4}\b[^\n]{0,100}(?:Çim|Cim|Kum|Sentetik))/i)?.[1] || '');

  let bestTable = null;
  let bestRows = [];
  $('table').each((_, table) => {
    const rows = parseHorseRows($, table);
    if (rows.length > bestRows.length) {
      bestRows = rows;
      bestTable = table;
    }
  });

  return {
    ...source,
    classText:meta.classText || source.class || '',
    ageGroup:meta.ageGroup || source.ageGroup || '',
    distance:meta.distance || source.distance || null,
    track:displayTrack(meta.track || source.track || ''),
    horses:bestRows,
    parsedTable:Boolean(bestTable)
  };
}

function buildResultUrl(row) {
  const date = clean(row.isoDate || '');
  if (!date || !row.city || !row.raceNo) return '';
  const params = new URLSearchParams({SehirAdi:row.city,QueryParameter_Tarih:isoToDisplay(date,'/'),Era:'past'});
  return `${RESULT_INDEX_URL}?${params.toString()}#${row.raceNo}`;
}

async function verifyRace(row, target) {
  const url = buildResultUrl(row);
  if (!url) return null;
  try {
    const html = await fetchText(url, {}, 18000, 2);
    const parsed = parseResultPage(html, row);
    const classMatch = classCoreKey(parsed.classText) === classCoreKey(target.class);
    const ageMatch = ageKey(parsed.ageGroup) === ageKey(target.ageGroup);
    const distanceMatch = Number(parsed.distance) === Number(target.distance);
    const trackMatch = normalizeTrack(parsed.track) === normalizeTrack(target.track);
    return {
      ...parsed,
      exactCondition:classMatch && ageMatch && distanceMatch && trackMatch,
      verification:{classMatch,ageMatch,distanceMatch,trackMatch,url}
    };
  } catch (e) {
    return {
      ...row,
      classText:row.class || '',
      exactCondition:false,
      verification:{classMatch:false,ageMatch:false,distanceMatch:false,trackMatch:false,url,error:e?.message || String(e)}
    };
  }
}

async function mapLimit(items, limit, mapper) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) break;
      out[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)}, worker));
  return out;
}

function targetFromQuery(query = {}) {
  return {
    date:clean(query.date),
    city:clean(query.city),
    class:clean(query.class),
    ageGroup:clean(query.ageGroup),
    track:displayTrack(query.track),
    distance:Number(query.distance || 0) || null,
    minYear:Number(query.minYear || DEFAULT_MIN_YEAR) || DEFAULT_MIN_YEAR,
    maxPages:Number(query.maxPages || 0) || 0
  };
}

function cacheKey(target) {
  return [VERSION,target.date,target.city,target.class,target.ageGroup,target.track,target.distance,target.minYear,target.maxPages].join('|');
}

const cache = new Map();

export async function queryExactHistoricalMatchesV9(targetInput = {}) {
  const target = targetFromQuery(targetInput);
  const required = ['date','city','class','ageGroup','track','distance'];
  const missing = required.filter(k => !target[k]);
  if (missing.length) throw new Error(`Eksik hedef koşu alanı: ${missing.join(', ')}`);

  const key = cacheKey(target);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < 10 * 60 * 1000) return cached.value;

  const filters = await resolveFilters(target);
  if (!filters.raceClass) throw new Error(`TJK koşu sınıfı filtresi bulunamadı: ${target.class}`);
  if (!filters.city) throw new Error(`TJK şehir filtresi bulunamadı: ${target.city}`);
  if (!filters.group) throw new Error(`TJK yaş/ırk filtresi bulunamadı: ${target.ageGroup}`);
  if (!filters.track) throw new Error(`TJK pist filtresi bulunamadı: ${target.track}`);

  const years = [];
  const targetDate = parseIso(target.date);
  if (!targetDate) throw new Error('Hedef tarih YYYY-MM-DD olmalı.');
  for (let y = targetDate.year - 1; y >= target.minYear; y--) years.push(y);

  const diagnostics = {yearsScanned:0,pagesScanned:0,queryRows:0,candidateRows:0,verifiedRows:0,rejectedRows:0,errors:[]};
  const all = [];

  for (const year of years) {
    diagnostics.yearsScanned++;
    const anchor = anchorIso(target.date, year);
    const beginIso = new Date(Date.parse(`${anchor}T00:00:00Z`) - DAY_WINDOW * 86400000).toISOString().slice(0,10);
    const endIso = new Date(Date.parse(`${anchor}T00:00:00Z`) + DAY_WINDOW * 86400000).toISOString().slice(0,10);
    let page = 1;
    let yearFound = 0;

    while (true) {
      if (target.maxPages && diagnostics.pagesScanned >= target.maxPages) break;
      diagnostics.pagesScanned++;
      const form = {
        'QueryParameter_BaslangicTarihi':isoToDisplay(beginIso,'/'),
        'QueryParameter_BitisTarihi':isoToDisplay(endIso,'/'),
        'QueryParameter_SehirId':filters.city.value,
        'QueryParameter_KosuCinsiId':filters.raceClass.value,
        'QueryParameter_GrupId':filters.group.value,
        'QueryParameter_PistId':filters.track.value,
        'QueryParameter_Mesafe':target.distance,
        'Sort':SORT,
        'Page':page
      };
      let html = null;
      try {
        html = await postForm(page === 1 ? DATA_URL : ROWS_URL, form, page > 1);
      } catch (e) {
        diagnostics.errors.push(`${year}/${page}: ${e?.message || e}`);
        break;
      }
      if (!html) break;
      const rows = parseQueryTable(html);
      if (!rows.length) break;
      diagnostics.queryRows += rows.length;

      const candidates = rows.filter(row =>
        normalizeCity(row.city) === normalizeCity(target.city) &&
        ageKey(row.ageGroup) === ageKey(target.ageGroup) &&
        queryClassKey(row.class) === queryClassKey(target.class) &&
        normalizeTrack(row.track) === normalizeTrack(target.track) &&
        Number(row.distance) === Number(target.distance)
      );
      diagnostics.candidateRows += candidates.length;
      if (!candidates.length && page > 1) break;

      const verified = await mapLimit(candidates, VERIFY_CONCURRENCY, row => verifyRace(row, target));
      for (const row of verified) {
        if (row?.exactCondition) {
          all.push(row);
          yearFound++;
          diagnostics.verifiedRows++;
        } else diagnostics.rejectedRows++;
      }

      const hasMore = /data-page\s*=\s*["']?\d+/i.test(html) || /Sonraki|Next|pagination/i.test(html);
      if (!hasMore || rows.length < 5) break;
      page++;
      if (page > 50) break;
    }

    if (target.maxPages && diagnostics.pagesScanned >= target.maxPages) break;
    if (yearFound >= 12 && diagnostics.yearsScanned >= 3) break;
  }

  const unique = [];
  const seen = new Set();
  for (const row of all.sort((a,b) => String(b.isoDate).localeCompare(String(a.isoDate)))) {
    const k = `${row.isoDate}|${normalizeCity(row.city)}|${row.raceNo}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(row);
  }

  const result = {
    version:VERSION,
    source:'TJK-KosuSorgulama',
    target,
    filters,
    matches:unique,
    diagnostics
  };
  cache.set(key,{ts:Date.now(),value:result});
  return result;
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  try {
    const result = await queryExactHistoricalMatchesV9(req.query || {});
    return res.status(200).json({ok:true,...result});
  } catch (e) {
    return res.status(500).json({ok:false,error:e?.message || String(e)});
  }
}
