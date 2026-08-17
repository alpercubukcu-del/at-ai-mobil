import * as cheerio from 'cheerio';

const VERSION = 'TJK-PARSER-V10-DOM-RACE-BLOCKS';
const TJK_ROOT =
  'https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisProgrami';
const TJK_CITY =
  'https://www.tjk.org/TR/YarisSever/Info/Sehir/GunlukYarisProgrami';
const TJK_CDN =
  'https://medya-cdn.tjk.org/raporftp/TJKPDF';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/139 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language':
    'tr-TR,tr;q=0.9,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

function oneLine(v = '') {
  return String(v ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(v = '') {
  return oneLine(v)
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/Â/g, 'A')
    .replace(/Î/g, 'I')
    .replace(/Û/g, 'U');
}

function key(v = '') {
  return norm(v).replace(/[^A-Z0-9]/g, '');
}

function toIsoDate(v) {
  const s = String(v || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;

  return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

function dateParts(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  return {
    y: m[1],
    m: m[2],
    d: m[3],
    tr: `${m[3]}.${m[2]}.${m[1]}`
  };
}

function parseNumber(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === '-') return null;

  const n = Number(
    s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  );

  return Number.isFinite(n) ? n : null;
}

function parseInteger(v) {
  const n = parseNumber(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function extractQueryNumber(href, names = []) {
  if (!href) return null;

  try {
    const u = new URL(href, 'https://www.tjk.org');
    for (const name of names) {
      const val = u.searchParams.get(name);
      if (val && /^\d+$/.test(val)) return Number(val);
    }
  } catch {}

  for (const name of names) {
    const re = new RegExp(`${name}=([0-9]+)`, 'i');
    const m = String(href).match(re);
    if (m) return Number(m[1]);
  }

  return null;
}

async function fetchResponse(url, accept = '*/*') {
  const res = await fetch(url, {
    headers: {
      ...HEADERS,
      Accept: accept
    },
    redirect: 'follow',
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  return res;
}

async function fetchText(url) {
  const res = await fetchResponse(
    url,
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  );
  return await res.text();
}

async function fetchCsvText(url) {
  const res = await fetchResponse(
    url,
    'text/csv,text/plain,application/octet-stream,*/*'
  );

  const buf = Buffer.from(await res.arrayBuffer());

  // TJK CSV'leri tarihsel olarak Windows-1254 / UTF-8 karışık görülebiliyor.
  // Önce UTF-8; bozuk karakter yoğunluğu varsa latin1 tabanlı geri dönüş.
  let text = buf.toString('utf8');

  const bad = (text.match(/�/g) || []).length;
  if (bad > 2) {
    text = new TextDecoder('windows-1254').decode(buf);
  }

  return text.replace(/^\uFEFF/, '');
}

/* ---------------------------------------------------------
   ROOT -> ŞEHİRLER
--------------------------------------------------------- */

function extractCities(rootHtml, isoDate) {
  /*
    V7:
    Eski çalışan mobil ekrandaki davranış korunur.
    Şehir listesi at/CSV parserından TAMAMEN bağımsızdır.
    Bursa, Elazığ, Karma ve yurt dışı merkezleri root sayfadan ne geldiyse
    şehir listesine alınır.
  */
  const $ = cheerio.load(rootHtml);
  const out = new Map();

  $('a[href*="GunlukYarisProgrami"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const label = oneLine($(a).text());

    if (!label) return;

    let url;
    try {
      url = new URL(href, 'https://www.tjk.org');
    } catch {
      return;
    }

    const cityId =
      url.searchParams.get('SehirId') ||
      url.searchParams.get('sehirId');

    let city =
      url.searchParams.get('SehirAdi') ||
      url.searchParams.get('sehirAdi') ||
      '';

    if (!city) {
      city = label
        .replace(/\s*\(\s*\d+\.\s*Y\.?\s*G\.?\s*\)\s*$/i, '')
        .replace(/\s*\(\s*YD\s*\d+\s*\)\s*$/i, '')
        .trim();
    }

    if (!cityId || !city) return;

    const cityUrl =
      `${TJK_CITY}?Era=today` +
      `&QueryParameter_Tarih=${encodeURIComponent(
        isoDate.split('-').reverse().join('/')
      )}` +
      `&SehirAdi=${encodeURIComponent(city)}` +
      `&SehirId=${encodeURIComponent(cityId)}`;

    out.set(String(cityId), {
      id: String(cityId),
      name: city,
      label,
      url: cityUrl
    });
  });

  return [...out.values()];
}

/* ---------------------------------------------------------
   KOŞU NUMARALARI — AT TABLOSUNDAN BAĞIMSIZ
--------------------------------------------------------- */

function extractRaceNumbersAndTimes(cityHtml) {
  const $ = cheerio.load(cityHtml);
  $('script,style,noscript').remove();

  const found = new Map();

  /*
    1) Başlıklar: "1. Koşu 13.30"
  */
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const t = oneLine($(el).text());
    const m = t.match(/\b(\d{1,2})\.\s*Koşu\b(?:\s*:?\s*(\d{1,2}[.:]\d{2}))?/i);
    if (!m) return;

    const no = Number(m[1]);
    if (!no || no > 30) return;

    const time = (m[2] || '').replace('.', ':');
    if (!found.has(no)) found.set(no, { no, time });
    else if (!found.get(no).time && time) found.get(no).time = time;
  });

  /*
    2) Koşu sekmeleri / bağlantılar / sayfa navigasyonu.
       Eski çalışan ekranda koşu no'ları buradan görünüyordu.
  */
  $('a,button,option,li,span').each((_, el) => {
    const t = oneLine($(el).text());
    if (!t || t.length > 80) return;

    const m = t.match(/(?:^|\s)(\d{1,2})\.\s*Koşu\b(?:\s*:?\s*(\d{1,2}[.:]\d{2}))?/i);
    if (!m) return;

    const no = Number(m[1]);
    if (!no || no > 30) return;

    const time = (m[2] || '').replace('.', ':');
    if (!found.has(no)) found.set(no, { no, time });
    else if (!found.get(no).time && time) found.get(no).time = time;
  });

  /*
    3) Son çare: bütün görünen metin.
       Bu aşama koşu numarasını bulur; AT TABLOSU aramaz.
  */
  if (!found.size) {
    const body = oneLine($('body').text());
    const re = /(?:^|\s)(\d{1,2})\.\s*Koşu\b(?:\s*:?\s*(\d{1,2}[.:]\d{2}))?/gi;
    let m;

    while ((m = re.exec(body))) {
      const no = Number(m[1]);
      if (!no || no > 30) continue;

      const time = (m[2] || '').replace('.', ':');
      if (!found.has(no)) found.set(no, { no, time });
      else if (!found.get(no).time && time) found.get(no).time = time;
    }
  }

  return [...found.values()].sort((a, b) => a.no - b.no);
}

function makeRaceSkeletons(raceNumbers, city) {
  return raceNumbers.map(item => ({
    no: item.no,
    time: item.time || '',

    class: '',
    yaradi1: '',

    ageGroup: '',
    yaradi2: '',

    condition: '',
    yaradi3: '',

    distance: '',
    mesafe: '',

    track: '',
    pist: '',

    betStarts: [],
    horses: [],

    source: 'TJK Günlük Yarış Programı',
    sourceUrl: city.url,

    programLoaded: true,
    detailsLoaded: false
  }));
}

function mergeRaceDetails(skeletons, detailedRaces) {
  const byNo = new Map(
    skeletons.map(r => [Number(r.no), { ...r }])
  );

  for (const d of detailedRaces || []) {
    const no = Number(d?.no);
    if (!no) continue;

    const base = byNo.get(no) || {
      no,
      time: '',
      class: '',
      yaradi1: '',
      ageGroup: '',
      yaradi2: '',
      condition: '',
      yaradi3: '',
      distance: '',
      mesafe: '',
      track: '',
      pist: '',
      betStarts: [],
      horses: [],
      programLoaded: true,
      detailsLoaded: false
    };

    byNo.set(no, {
      ...base,
      ...d,
      time: d.time || base.time || '',
      detailsLoaded: true,
      programLoaded: true
    });
  }

  return [...byNo.values()].sort((a, b) => a.no - b.no);
}

/* ---------------------------------------------------------
   RESMİ CSV URL
--------------------------------------------------------- */

function buildCsvUrl(isoDate, cityName) {
  const p = dateParts(isoDate);
  if (!p) throw new Error('Geçersiz tarih');

  return (
    `${TJK_CDN}/${p.y}/${isoDate}/CSV/GunlukYarisProgrami/` +
    `${p.tr}-${encodeURIComponent(cityName)}-GunlukYarisProgrami-TR.csv`
  );
}

/* ---------------------------------------------------------
   CSV OKUYUCU
--------------------------------------------------------- */

function detectDelimiter(text) {
  const firstLines = String(text)
    .split(/\r?\n/)
    .filter(x => x.trim())
    .slice(0, 5);

  const candidates = [';', '\t', ','];

  let best = ';';
  let bestScore = -1;

  for (const d of candidates) {
    const score = firstLines.reduce(
      (sum, line) => sum + (line.split(d).length - 1),
      0
    );
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }

  return best;
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];

  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows.filter(r => r.some(c => String(c).trim()));
}

function findHeaderRow(rows) {
  let best = -1;
  let bestScore = -1;

  for (let i = 0; i < Math.min(rows.length, 40); i += 1) {
    const ks = rows[i].map(key);

    let score = 0;
    if (ks.some(x => /AT(ISMI|ADI)/.test(x))) score += 5;
    if (ks.some(x => /KOSU/.test(x))) score += 3;
    if (ks.some(x => /JOKEY/.test(x))) score += 2;
    if (ks.some(x => /SIKLET|KILO/.test(x))) score += 1;
    if (ks.some(x => /MESAFE/.test(x))) score += 1;
    if (ks.some(x => /PIST/.test(x))) score += 1;

    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }

  return bestScore >= 5 ? best : -1;
}

function rowObject(headers, values) {
  const obj = {};

  headers.forEach((h, i) => {
    obj[h] = values[i] ?? '';
  });

  return obj;
}

function valueByAliases(obj, aliases = []) {
  const entries = Object.entries(obj);
  const map = new Map(entries.map(([k, v]) => [key(k), v]));

  for (const alias of aliases) {
    const k = key(alias);
    if (map.has(k)) return map.get(k);
  }

  // Tam eşleşme yoksa kontrollü içerme.
  for (const alias of aliases) {
    const k = key(alias);
    if (!k) continue;

    for (const [hk, v] of map.entries()) {
      if (hk.includes(k) || k.includes(hk)) return v;
    }
  }

  return '';
}

function splitRaceConditionText(raw) {
  const text = oneLine(raw)
    .replace(/\s*,?\s*E\.?İ\.?D\.?\s*:.*$/i, '')
    .trim();

  const parts = text
    .split(',')
    .map(x => oneLine(x))
    .filter(Boolean);

  let raceClass = '';
  let ageGroup = '';
  let condition = '';
  let distance = '';
  let track = '';

  for (const p of parts) {
    if (!distance) {
      const m = p.match(/\b(\d{3,4})\s*(Çim|Kum|Sentetik)\b/i);
      if (m) {
        distance = m[1];
        track = m[2];
        continue;
      }
    }

    if (
      !ageGroup &&
      /(?:\d+\s*(?:ve\s*Yukarı)?\s*(?:Yaşlı\s*)?(?:İngilizler|Araplar)|\d+\s*Yaşlı\s*(?:İngilizler|Araplar)|\d+\+?\s*[İA]\b)/i.test(p)
    ) {
      ageGroup = p;
      continue;
    }

    if (
      !condition &&
      /\b(?:kg|kilo)\b/i.test(p)
    ) {
      condition = p;
      continue;
    }

    if (!raceClass) {
      raceClass = p;
    }
  }

  return {
    class: raceClass,
    yaradi1: raceClass,
    ageGroup,
    yaradi2: ageGroup,
    condition,
    yaradi3: condition,
    distance,
    mesafe: distance,
    track,
    pist: track
  };
}

/* ---------------------------------------------------------
   HTML'DEN KOŞU META + AT ID HARİTASI
   (CSV eksik alanlarını tamamlar)
--------------------------------------------------------- */

function parseHtmlRaceMeta(html) {
  const $ = cheerio.load(html);
  const headings = $('h1,h2,h3,h4,h5,h6').toArray();

  const byRace = {};
  let currentRace = null;

  for (const h of headings) {
    const t = oneLine($(h).text());

    const rm = t.match(/(?:^|\s)(\d{1,2})\.\s*Koşu\s*:?\s*(\d{1,2}[.:]\d{2})?/i);
    if (rm) {
      currentRace = Number(rm[1]);

      if (!byRace[currentRace]) {
        byRace[currentRace] = {
          no: currentRace,
          time: (rm[2] || '').replace('.', ':')
        };
      } else if (!byRace[currentRace].time && rm[2]) {
        byRace[currentRace].time = rm[2].replace('.', ':');
      }

      continue;
    }

    if (!currentRace) continue;

    if (/\d{3,4}\s*(?:Çim|Kum|Sentetik)\b/i.test(t)) {
      const meta = splitRaceConditionText(t);
      byRace[currentRace] = {
        ...byRace[currentRace],
        ...meta,
        rawCondition: t
      };
    }
  }

  return byRace;
}

function parseHtmlHorseIds(html) {
  const $ = cheerio.load(html);
  const byName = {};

  $('a[href*="QueryParameter_AtId="],a[href*="AtKosuBilgileri"]').each(
    (_, a) => {
      const name = oneLine($(a).text());
      const href = $(a).attr('href') || '';
      const id = extractQueryNumber(
        href,
        ['QueryParameter_AtId', 'AtId']
      );

      if (!name || !id) return;

      byName[norm(name)] = id;
    }
  );

  return byName;
}

/* ---------------------------------------------------------
   CSV -> KOŞULAR
--------------------------------------------------------- */

function parseProgramCsv(csvText, htmlMeta, horseIdByName, city) {
  /*
    V9:
    TJK CSV'sinde "Koşu No" sütunu yok.
    Gerçek yapı bloklar halinde ilerliyor:
      koşu başlığı / boş satır / at başlık satırı / atlar / sonraki blok.
    Bu nedenle CSV'yi KOŞU BLOKLARI olarak okuyoruz.
  */

  const rawRows = parseCsv(csvText);

  const races = [];
  let currentRaceNo = 0;
  let headers = null;
  let race = null;

  const isHorseHeader = row => {
    const ks = row.map(key);
    return (
      ks.some(x => /AT(ISMI|ADI)/.test(x)) &&
      ks.some(x => /ATNO|^N$|^NO$/.test(x))
    );
  };

  const looksLikeRaceMeta = row => {
    const t = oneLine(row.join(' '));
    return (
      /\b(?:ŞARTLI|Maiden|Handikap|KV-|KISA VADELİ|SATIŞ|SATIS|Listed|Grup|G[1-3])\b/i.test(t) &&
      /\b\d{3,4}\s*(?:Çim|Kum|Sentetik)\b/i.test(t)
    );
  };

  const finalize = () => {
    if (!race) return;

    race.horses = [...new Map(
      (race.horses || []).map(h => [
        `${h.no}|${h.id || norm(h.name)}`,
        h
      ])
    ).values()].sort((a, b) => a.no - b.no);

    races.push(race);
    race = null;
    headers = null;
  };

  for (let i = 0; i < rawRows.length; i += 1) {
    const row = rawRows[i].map(oneLine);

    if (!row.some(Boolean)) continue;

    if (looksLikeRaceMeta(row)) {
      finalize();

      currentRaceNo += 1;

      const metaText = oneLine(row.join(' '));
      const csvMeta = splitRaceConditionText(metaText);
      const hmeta = htmlMeta[currentRaceNo] || {};

      race = {
        no: currentRaceNo,
        time: hmeta.time || '',

        class:
          csvMeta.class ||
          hmeta.class ||
          '',

        yaradi1:
          csvMeta.yaradi1 ||
          hmeta.yaradi1 ||
          hmeta.class ||
          '',

        ageGroup:
          csvMeta.ageGroup ||
          hmeta.ageGroup ||
          '',

        yaradi2:
          csvMeta.yaradi2 ||
          hmeta.yaradi2 ||
          hmeta.ageGroup ||
          '',

        condition:
          csvMeta.condition ||
          hmeta.condition ||
          '',

        yaradi3:
          csvMeta.yaradi3 ||
          hmeta.yaradi3 ||
          hmeta.condition ||
          '',

        distance:
          csvMeta.distance ||
          hmeta.distance ||
          '',

        mesafe:
          csvMeta.mesafe ||
          hmeta.mesafe ||
          hmeta.distance ||
          '',

        track:
          csvMeta.track ||
          hmeta.track ||
          '',

        pist:
          csvMeta.pist ||
          hmeta.pist ||
          hmeta.track ||
          '',

        betStarts: [],
        horses: [],

        source: 'TJK Resmi CSV Günlük Yarış Programı',
        sourceUrl: city.url,

        programLoaded: true,
        detailsLoaded: true
      };

      continue;
    }

    if (isHorseHeader(row)) {
      headers = row;
      continue;
    }

    if (!race || !headers) {
      continue;
    }

    const obj = rowObject(headers, row);

    const horseName = oneLine(
      valueByAliases(obj, [
        'At İsmi','At Adı','AtIsmi','AtAdi','At'
      ])
    );

    const horseNo = parseInteger(
      valueByAliases(obj, [
        'At No','N','No','AtNo'
      ])
    );

    if (!horseName || !horseNo) {
      continue;
    }

    const horseIdCsv = parseInteger(
      valueByAliases(obj, [
        'At Id','At ID','AtId','Web At Id','web_at_id'
      ])
    );

    const horseId =
      horseIdCsv ||
      horseIdByName[norm(horseName)] ||
      null;

    const age = oneLine(
      valueByAliases(obj, ['Yaş','Yas'])
    );

    const father = oneLine(
      valueByAliases(obj, [
        'Orijin(Baba)','Baba'
      ])
    );

    const mother = oneLine(
      valueByAliases(obj, [
        'Orijin(Anne)','Anne'
      ])
    );

    race.horses.push({
      no: horseNo,
      id: horseId,
      name: horseName,

      age,
      origin: oneLine(
        [father, mother].filter(Boolean).join(' - ')
      ),

      weight: parseNumber(
        valueByAliases(obj, ['Kilo','Sıklet','Siklet'])
      ),

      jockey: oneLine(
        valueByAliases(obj, ['Jokey Adı','Jokey','Jockey'])
      ),

      owner: oneLine(
        valueByAliases(obj, ['Sahip Adı','Sahip','Owner'])
      ),

      trainer: oneLine(
        valueByAliases(obj, ['Antrenör Adı','Antrenor Adi','Antrenör','Antrenor'])
      ),

      st: parseInteger(
        valueByAliases(obj, ['St','Start','Kulvar'])
      ),

      hp: parseInteger(
        valueByAliases(obj, ['H','HP','Handikap Puanı','Handikap Puani'])
      ),

      last6: oneLine(
        valueByAliases(obj, ['Son 6 Yarış','Son 6 Y.','Son 6','Son6'])
      ),

      kgs: parseInteger(
        valueByAliases(obj, ['KGS'])
      ),

      s20: parseNumber(
        valueByAliases(obj, ['s20','S20'])
      ),

      best: oneLine(
        valueByAliases(obj, ['EnİyiDerece','En İyi D.','En Iyi D.','En İyi Derece'])
      ),

      odds: parseNumber(
        valueByAliases(obj, ['Gny','Ganyan','Muhtemel'])
      ),

      agf: parseNumber(
        valueByAliases(obj, ['AGF','AGF Oranı','AGF Orani'])
      )
    });
  }

  finalize();

  /*
    CSV başlık satırlarını denetim için ayrıca döndür.
  */
  const firstHeaderIndex = rawRows.findIndex(isHorseHeader);
  const auditHeaders =
    firstHeaderIndex >= 0
      ? rawRows[firstHeaderIndex].map(oneLine)
      : [];

  return {
    races: races
      .filter(r => (r.horses || []).length)
      .sort((a, b) => a.no - b.no),
    headers: auditHeaders
  };
}

/* ---------------------------------------------------------
   V8 — HTML'DEN GERÇEK AT SATIRLARI
--------------------------------------------------------- */

function nearestRaceNoForNode($, node) {
  let bestNo = null;

  $('h1,h2,h3,h4,h5,h6').each((_, h) => {
    const pos = h.compareDocumentPosition?.(node);

    if (!(pos & 4)) return;

    const t = oneLine($(h).text());
    const m = t.match(/\b(\d{1,2})\.\s*Koşu\b/i);

    if (m) {
      bestNo = Number(m[1]);
    }
  });

  return bestNo;
}

function headerNamesForTable($, table) {
  let headers = [];

  $(table).find('tr').each((_, tr) => {
    if (headers.length) return;

    const cells = $(tr).find('th').toArray();
    if (!cells.length) return;

    headers = cells.map(td => oneLine($(td).text()));
  });

  return headers;
}

function findHeaderIndex(headers, aliases) {
  const hs = headers.map(key);

  for (const alias of aliases) {
    const k = key(alias);
    const idx = hs.findIndex(h => h === k || h.includes(k) || k.includes(h));
    if (idx >= 0) return idx;
  }

  return -1;
}

function cleanHorseNameFromLink($, link) {
  return oneLine($(link).text())
    .replace(/\bKG\b.*$/i, '')
    .replace(/\bSK\b.*$/i, '')
    .replace(/\bDB\b.*$/i, '')
    .replace(/\bKUL\b.*$/i, '')
    .trim();
}

function parseHtmlHorseTables(html, htmlMeta, city) {
  const $ = cheerio.load(html);
  $('script,style,noscript').remove();

  const byRace = new Map();

  $('table').each((_, table) => {
    const horseLinks = $(table).find(
      'a[href*="QueryParameter_AtId="],a[href*="AtKosuBilgileri"]'
    );

    if (!horseLinks.length) return;

    const raceNo = nearestRaceNoForNode($, table);
    if (!raceNo) return;

    const headers = headerNamesForTable($, table);

    const idxNo = findHeaderIndex(headers, ['N','At No','No']);
    const idxAge = findHeaderIndex(headers, ['Yaş','Yas']);
    const idxWeight = findHeaderIndex(headers, ['Sıklet','Siklet','Kilo']);
    const idxJockey = findHeaderIndex(headers, ['Jokey']);
    const idxOwner = findHeaderIndex(headers, ['Sahip']);
    const idxTrainer = findHeaderIndex(headers, ['Antrenör','Antrenor']);
    const idxSt = findHeaderIndex(headers, ['St','Kulvar']);
    const idxHp = findHeaderIndex(headers, ['HP']);
    const idxLast6 = findHeaderIndex(headers, ['Son 6 Y.','Son 6','Son6']);
    const idxKgs = findHeaderIndex(headers, ['KGS']);
    const idxS20 = findHeaderIndex(headers, ['s20','S20']);
    const idxBest = findHeaderIndex(headers, ['En İyi D.','En Iyi D.','En İyi Derece']);
    const idxGny = findHeaderIndex(headers, ['Gny','Ganyan']);
    const idxAgf = findHeaderIndex(headers, ['AGF']);

    const horses = [];

    $(table).find('tr').each((_, tr) => {
      const link = $(tr).find(
        'a[href*="QueryParameter_AtId="],a[href*="AtKosuBilgileri"]'
      ).first();

      if (!link.length) return;

      const href = link.attr('href') || '';
      const id = extractQueryNumber(
        href,
        ['QueryParameter_AtId', 'AtId']
      );

      const name = cleanHorseNameFromLink($, link);
      if (!id || !name) return;

      const cells = $(tr).find('td').map((__, td) => oneLine($(td).text())).get();

      // Program numarası: önce başlık indeksinden, sonra link hücresinden önceki sayısal hücrelerden.
      let no = null;

      if (idxNo >= 0 && cells[idxNo] !== undefined) {
        no = parseInteger(cells[idxNo]);
      }

      if (!no) {
        for (const c of cells.slice(0, 4)) {
          const n = parseInteger(c);
          if (n && n > 0 && n < 100) {
            no = n;
            break;
          }
        }
      }

      if (!no) return;

      const get = idx =>
        idx >= 0 && cells[idx] !== undefined
          ? cells[idx]
          : '';

      horses.push({
        no,
        id,
        name,

        age: get(idxAge),
        weight: parseNumber(get(idxWeight)),

        jockey: get(idxJockey),
        owner: get(idxOwner),
        trainer: get(idxTrainer),

        st: parseInteger(get(idxSt)),
        hp: parseInteger(get(idxHp)),
        last6: get(idxLast6),
        kgs: parseInteger(get(idxKgs)),
        s20: parseNumber(get(idxS20)),
        best: get(idxBest),
        odds: parseNumber(get(idxGny)),
        agf: parseNumber(get(idxAgf))
      });
    });

    if (!horses.length) return;

    const unique = [...new Map(
      horses.map(h => [`${h.no}|${h.id}`, h])
    ).values()].sort((a, b) => a.no - b.no);

    const meta = htmlMeta[raceNo] || {};

    byRace.set(raceNo, {
      no: raceNo,
      time: meta.time || '',

      class: meta.class || '',
      yaradi1: meta.yaradi1 || meta.class || '',

      ageGroup: meta.ageGroup || '',
      yaradi2: meta.yaradi2 || meta.ageGroup || '',

      condition: meta.condition || '',
      yaradi3: meta.yaradi3 || meta.condition || '',

      distance: meta.distance || '',
      mesafe: meta.mesafe || meta.distance || '',

      track: meta.track || '',
      pist: meta.pist || meta.track || '',

      betStarts: [],
      horses: unique,

      source: 'TJK Günlük Yarış Programı HTML',
      sourceUrl: city.url,

      programLoaded: true,
      detailsLoaded: true
    });
  });

  return [...byRace.values()].sort((a, b) => a.no - b.no);
}

function applyHtmlMetaToSkeletons(skeletons, htmlMeta) {
  return skeletons.map(race => {
    const meta = htmlMeta[race.no] || {};

    return {
      ...race,

      time: race.time || meta.time || '',

      class: meta.class || race.class || '',
      yaradi1: meta.yaradi1 || meta.class || race.yaradi1 || '',

      ageGroup: meta.ageGroup || race.ageGroup || '',
      yaradi2: meta.yaradi2 || meta.ageGroup || race.yaradi2 || '',

      condition: meta.condition || race.condition || '',
      yaradi3: meta.yaradi3 || meta.condition || race.yaradi3 || '',

      distance: meta.distance || race.distance || '',
      mesafe: meta.mesafe || meta.distance || race.mesafe || '',

      track: meta.track || race.track || '',
      pist: meta.pist || meta.track || race.pist || ''
    };
  });
}


/* ---------------------------------------------------------
   V10 — TJK DOM KOŞU BLOKLARI
--------------------------------------------------------- */

function isRaceHeadingText(t) {
  return /\b\d{1,2}\.\s*Koşu\b/i.test(oneLine(t));
}

function raceNoFromText(t) {
  const m = oneLine(t).match(/\b(\d{1,2})\.\s*Koşu\b/i);
  return m ? Number(m[1]) : null;
}

function raceTimeFromText(t) {
  const m = oneLine(t).match(/\b\d{1,2}\.\s*Koşu\b(?:\s*:?\s*(\d{1,2}[.:]\d{2}))?/i);
  return m && m[1] ? m[1].replace('.', ':') : '';
}

function ageGroupFromText(t) {
  const s = oneLine(t);

  const patterns = [
    /\b(\d+\s*ve\s*Yukarı\s*(?:İngilizler|Araplar))\b/i,
    /\b(\d+\s*Yaşlı\s*(?:İngilizler|Araplar))\b/i,
    /\b(\d+\s*(?:İngilizler|Araplar))\b/i,
    /\b(\d+\+?\s*[İA])\b/i
  ];

  for (const re of patterns) {
    const m = s.match(re);
    if (m) return oneLine(m[1]);
  }

  return '';
}

function conditionMetaFromText(t) {
  const base = splitRaceConditionText(t);
  return {
    ...base,
    ageGroup: base.ageGroup || ageGroupFromText(t),
    yaradi2: base.yaradi2 || ageGroupFromText(t)
  };
}

function elementTextWithoutTooltips($, el) {
  const clone = $(el).clone();

  clone.find(
    '[title],[data-original-title],.tooltip,.popover,.aciklama,.aciklamaMetni,.badge'
  ).remove();

  return oneLine(clone.text());
}

function parseHorseFromContainer($, container, raceNo) {
  const link = $(container).find(
    'a[href*="QueryParameter_AtId="],a[href*="AtKosuBilgileri"]'
  ).first();

  if (!link.length) return null;

  const href = link.attr('href') || '';
  const id = extractQueryNumber(
    href,
    ['QueryParameter_AtId', 'AtId']
  );

  let name = oneLine(link.clone().children().remove().end().text());
  if (!name) name = oneLine(link.text());

  name = name
    .replace(/\b(?:KG|SK|DB|KUL|GKR|SGKR)\b.*$/i, '')
    .trim();

  if (!id || !name) return null;

  const cells = $(container).find('td').toArray();

  const cellTexts = cells.map(td =>
    elementTextWithoutTooltips($, td)
  );

  const headerCells = $(container)
    .closest('table')
    .find('tr')
    .first()
    .find('th')
    .toArray()
    .map(th => oneLine($(th).text()));

  const idx = aliases => {
    const hs = headerCells.map(key);

    for (const alias of aliases) {
      const k = key(alias);
      const i = hs.findIndex(
        h => h === k || h.includes(k) || k.includes(h)
      );
      if (i >= 0) return i;
    }

    return -1;
  };

  const get = aliases => {
    const i = idx(aliases);
    return i >= 0 && cellTexts[i] !== undefined
      ? cellTexts[i]
      : '';
  };

  let no = parseInteger(
    get(['N','At No','No'])
  );

  if (!no) {
    for (const c of cellTexts.slice(0, 4)) {
      const n = parseInteger(c);
      if (n && n > 0 && n < 100) {
        no = n;
        break;
      }
    }
  }

  if (!no) return null;

  const age = get(['Yaş','Yas']);

  const origin =
    get(['Orijin(Baba - Anne)','Orijin']) ||
    oneLine([
      get(['Orijin(Baba)','Baba']),
      get(['Orijin(Anne)','Anne'])
    ].filter(Boolean).join(' - '));

  return {
    no,
    id,
    name,
    age,
    origin,

    weight: parseNumber(
      get(['Sıklet','Siklet','Kilo'])
    ),

    jockey: get(['Jokey','Jokey Adı']),
    owner: get(['Sahip','Sahip Adı']),
    trainer: get(['Antrenör','Antrenor','Antrenör Adı']),

    st: parseInteger(get(['St','Kulvar'])),
    hp: parseInteger(get(['HP','H'])),

    last6: get(['Son 6 Y.','Son 6 Yarış','Son 6']),
    kgs: parseInteger(get(['KGS'])),
    s20: parseNumber(get(['s20','S20'])),

    best: get(['En İyi D.','EnİyiDerece','En İyi Derece']),
    odds: parseNumber(get(['Gny','Ganyan'])),
    agf: parseNumber(get(['AGF'])),

    raceNo
  };
}

function parseHtmlRaceBlocks(html, city) {
  const $ = cheerio.load(html);
  $('script,style,noscript').remove();

  const body = $('body').first();
  const all = body.find('*').toArray();

  const raceHeadings = all.filter(el => {
    const tag = String(el.tagName || '').toLowerCase();
    if (!/^h[1-6]$/.test(tag)) return false;
    return isRaceHeadingText($(el).text());
  });

  const races = [];

  for (let i = 0; i < raceHeadings.length; i += 1) {
    const heading = raceHeadings[i];
    const nextHeading = raceHeadings[i + 1] || null;

    const no = raceNoFromText($(heading).text());
    if (!no) continue;

    const time = raceTimeFromText($(heading).text());

    /*
      Cheerio sıra indeksini kullanarak bu koşunun başlığı ile
      bir sonraki koşu başlığı arasındaki DOM bölümünü alıyoruz.
    */
    const startIndex = all.indexOf(heading);
    const endIndex = nextHeading
      ? all.indexOf(nextHeading)
      : all.length;

    const segment = all.slice(startIndex + 1, endIndex);

    let metaText = '';

    for (const el of segment) {
      const tag = String(el.tagName || '').toLowerCase();

      if (!/^h[1-6]$/.test(tag)) continue;

      const t = oneLine($(el).text());

      if (/\d{3,4}\s*(?:Çim|Kum|Sentetik)\b/i.test(t)) {
        metaText = t;
        break;
      }
    }

    const meta = conditionMetaFromText(metaText);

    /*
      At satırlarını koşu segmentinde gerçek AtId linki bulunan
      en yakın TR üzerinden topluyoruz.
    */
    const horseMap = new Map();

    for (const el of segment) {
      const link = $(el).is(
        'a[href*="QueryParameter_AtId="],a[href*="AtKosuBilgileri"]'
      )
        ? $(el)
        : $(el).find(
            'a[href*="QueryParameter_AtId="],a[href*="AtKosuBilgileri"]'
          ).first();

      if (!link.length) continue;

      const tr = link.closest('tr');
      const container = tr.length ? tr : link.parent();

      const horse = parseHorseFromContainer(
        $,
        container,
        no
      );

      if (!horse) continue;

      horseMap.set(
        `${horse.no}|${horse.id}`,
        horse
      );
    }

    races.push({
      no,
      time,

      class: meta.class || '',
      yaradi1: meta.yaradi1 || meta.class || '',

      ageGroup: meta.ageGroup || '',
      yaradi2: meta.yaradi2 || meta.ageGroup || '',

      condition: meta.condition || '',
      yaradi3: meta.yaradi3 || meta.condition || '',

      distance: meta.distance || '',
      mesafe: meta.mesafe || meta.distance || '',

      track: meta.track || '',
      pist: meta.pist || meta.track || '',

      betStarts: [],
      horses: [...horseMap.values()].sort((a,b) => a.no - b.no),

      source: 'TJK Günlük Yarış Programı HTML DOM',
      sourceUrl: city.url,

      programLoaded: true,
      detailsLoaded: horseMap.size > 0
    });
  }

  return races.sort((a,b) => a.no - b.no);
}
/* ---------------------------------------------------------
   TEK ŞEHİR
--------------------------------------------------------- */

async function loadCityProgram(city, isoDate) {
  /*
    V10:
    Ana veri kaynağı canlı TJK HTML DOM'dur.
    CSV at listesi için kullanılmaz.
    Şehir + koşu numarası V7 mantığıyla korunur.
  */

  let html = '';
  let htmlError = null;

  try {
    html = await fetchText(city.url);
  } catch (e) {
    htmlError = String(e?.message || e);
  }

  const raceNumbers = html
    ? extractRaceNumbersAndTimes(html)
    : [];

  let skeletons = makeRaceSkeletons(
    raceNumbers,
    city
  );

  const htmlMeta = html
    ? parseHtmlRaceMeta(html)
    : {};

  skeletons = applyHtmlMetaToSkeletons(
    skeletons,
    htmlMeta
  );

  const domRaces = html
    ? parseHtmlRaceBlocks(
        html,
        city
      )
    : [];

  /*
    DOM yarışında meta eksikse skeleton meta'sını koru;
    atlar DOM'dan gelsin.
  */
  const races = mergeRaceDetails(
    skeletons,
    domRaces
  ).map(race => {
    const sk = skeletons.find(
      x => Number(x.no) === Number(race.no)
    ) || {};

    return {
      ...race,

      time: race.time || sk.time || '',

      class:
        race.class ||
        sk.class ||
        '',

      yaradi1:
        race.yaradi1 ||
        race.class ||
        sk.yaradi1 ||
        sk.class ||
        '',

      ageGroup:
        race.ageGroup ||
        sk.ageGroup ||
        '',

      yaradi2:
        race.yaradi2 ||
        race.ageGroup ||
        sk.yaradi2 ||
        sk.ageGroup ||
        '',

      condition:
        race.condition ||
        sk.condition ||
        '',

      yaradi3:
        race.yaradi3 ||
        race.condition ||
        sk.yaradi3 ||
        sk.condition ||
        '',

      distance:
        race.distance ||
        sk.distance ||
        '',

      mesafe:
        race.mesafe ||
        race.distance ||
        sk.mesafe ||
        sk.distance ||
        '',

      track:
        race.track ||
        sk.track ||
        '',

      pist:
        race.pist ||
        race.track ||
        sk.pist ||
        sk.track ||
        '',

      detailsLoaded:
        Array.isArray(race.horses) &&
        race.horses.length > 0
    };
  });

  return {
    races,
    audit: {
      cityPageFetched: Boolean(html),
      htmlError,

      raceNumberCount: raceNumbers.length,
      raceNumbers: raceNumbers.map(x => x.no),

      htmlMetaRaceCount:
        Object.keys(htmlMeta).length,

      domRaceCount:
        domRaces.length,

      domHorseCount:
        domRaces.reduce(
          (sum, race) =>
            sum + (race.horses?.length || 0),
          0
        ),

      domHorseWithIdCount:
        domRaces.reduce(
          (sum, race) =>
            sum + (race.horses || []).filter(h => h.id).length,
          0
        ),

      domAgeGroupMissingRaceCount:
        races.filter(r => !r.ageGroup).length
    }
  };
}

/* ---------------------------------------------------------
   API
--------------------------------------------------------- */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    });
  }

  const isoDate =
    toIsoDate(req.query?.date) ||
    new Date().toISOString().slice(0, 10);

  const rootUrl =
    `${TJK_ROOT}?QueryParameter_Tarih=` +
    encodeURIComponent(
      isoDate.split('-').reverse().join('/')
    );

  try {
    const rootHtml = await fetchText(rootUrl);
    const cities = extractCities(rootHtml, isoDate);

    if (!cities.length) {
      return res.status(200).json({
        ok: true,
        parserVersion: VERSION,
        date: isoDate,
        cityCount: 0,
        raceCount: 0,
        horseCount: 0,
        cities: [],
        racesByCity: {},
        programs: {},
        audit: {
          sourceMode: 'TJK_OFFICIAL_CSV',
          error: 'Türkiye yarış şehri bulunamadı.'
        },
        source: 'TJK Günlük Yarış Programı',
        sourceUrl: rootUrl
      });
    }

    const racesByCity = {};
    const programs = {};
    const okCities = [];
    const errors = [];
    const parserAudit = {};

    /*
      CDN ve TJK'yı gereksiz yüklememek için şehirleri sıralı alıyoruz.
      Türkiye'de aynı gün şehir sayısı düşüktür.
    */
    for (const city of cities) {
      try {
        const loaded = await loadCityProgram(
          city,
          isoDate
        );

        /*
          V7: Şehri CSV/at parserı yüzünden ASLA silme.
          Root TJK programında şehir varsa şehir listesinde kalır.
        */
        racesByCity[String(city.id)] = loaded.races || [];
        programs[String(city.id)] = loaded.races || [];
        okCities.push(city);

        parserAudit[String(city.id)] = loaded.audit;
      } catch (e) {
        errors.push({
          city: city.name,
          cityId: city.id,
          error: String(e?.message || e)
        });
      }
    }

    const raceCount = Object.values(racesByCity)
      .reduce((sum, xs) => sum + xs.length, 0);

    const horseCount = Object.values(racesByCity)
      .flat()
      .reduce(
        (sum, race) =>
          sum + (Array.isArray(race.horses)
            ? race.horses.length
            : 0),
        0
      );

    return res.status(200).json({
      ok: true,
      parserVersion: VERSION,
      version: VERSION,
      date: isoDate,

      cityCount: okCities.length,
      raceCount,
      horseCount,

      cities: okCities,
      racesByCity,
      programs,

      audit: {
        sourceMode: 'TJK_PROGRAM_FIRST_PLUS_DOM_RACE_BLOCKS',
        schemaBasis:
          'Eski çalışan mobil ekran: şehir ve koşu numarası önce; canlı TJK DOM koşu bloklarından at listesi ve AtId',
        careerRequirement:
          'At ID CSV varsa doğrudan, yoksa resmi TJK at linkinden eşleştirilir',
        failedCityCount: errors.length,
        errors,
        parserAudit
      },

      source: 'TJK Resmi CSV Günlük Yarış Programı',
      sourceUrl: rootUrl
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      parserVersion: VERSION,
      date: isoDate,
      error: String(e?.message || e),
      source: 'TJK Günlük Yarış Programı',
      sourceUrl: rootUrl
    });
  }
}
