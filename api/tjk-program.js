import * as cheerio from 'cheerio';

const VERSION = 'TJK-PARSER-V6-CSV';
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
  const $ = cheerio.load(rootHtml);
  const out = new Map();

  $('a[href*="GunlukYarisProgrami"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const text = oneLine($(a).text());

    if (!text || /Karma/i.test(text)) return;

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
      city = text.replace(/\s*\([^)]*\)\s*$/, '').trim();
    }

    if (!cityId || !city) return;

    /*
      Türkiye yarış şehirleri ana sayfada çoğunlukla "(NN. Y.G.)" ile gelir.
      Yurt dışı şehirlerini kariyer/benzerlik motoruna sokmuyoruz.
    */
    const isDomestic =
      /\(\s*\d+\.\s*Y\.?\s*G\.?\s*\)/i.test(text) ||
      ['Adana','Ankara','Antalya','Bursa','Diyarbakır','Elazığ',
       'İstanbul','İzmir','Kocaeli','Şanlıurfa'].some(
        x => norm(x) === norm(city)
      );

    if (!isDomestic) return;

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
      url: cityUrl
    });
  });

  return [...out.values()];
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
      /(?:\d+\s*(?:ve\s*Yukarı)?\s*(?:Yaşlı|Y)\s*(?:İngilizler|Araplar)|\d+\+?\s*[İA]\b)/i.test(p)
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
  const rawRows = parseCsv(csvText);
  const headerIndex = findHeaderRow(rawRows);

  if (headerIndex < 0) {
    throw new Error('CSV başlık satırı bulunamadı.');
  }

  const headers = rawRows[headerIndex].map(oneLine);
  const data = rawRows
    .slice(headerIndex + 1)
    .map(r => rowObject(headers, r));

  const races = new Map();

  for (const r of data) {
    const horseName = oneLine(
      valueByAliases(r, [
        'At İsmi','At Adı','AtIsmi','AtAdi','At'
      ])
    );

    if (!horseName) continue;

    const raceNo = parseInteger(
      valueByAliases(r, [
        'Koşu No','Kosu No','KosuNo','Yarış No','Yaris No',
        'Koşu','Kosu','Kosu Sıra','KosuSirasi'
      ])
    );

    if (!raceNo) continue;

    const horseNo = parseInteger(
      valueByAliases(r, [
        'N','No','At No','AtNo','Program No','PNo'
      ])
    );

    if (!horseNo) continue;

    if (!races.has(raceNo)) {
      const csvRaceText = oneLine(
        valueByAliases(r, [
          'Yarış Adı','Yaris Adi','Koşu Adı','Kosu Adi',
          'Yarış Şartı','Yaris Sarti','Koşu Şartı','Kosu Sarti',
          'Kcins','Sınıf','Sinif'
        ])
      );

      const csvMeta = splitRaceConditionText(csvRaceText);
      const hmeta = htmlMeta[raceNo] || {};

      const distanceCsv = oneLine(
        valueByAliases(r, ['Mesafe','Msf','Distance'])
      );

      const trackCsv = oneLine(
        valueByAliases(r, ['Pist','Track'])
      );

      const ageCsv = oneLine(
        valueByAliases(r, [
          'Yaş Grubu','Yas Grubu','Grup','Yaradi2'
        ])
      );

      const classCsv = oneLine(
        valueByAliases(r, [
          'Sınıf','Sinif','Yaradi1','Kcins'
        ])
      );

      const conditionCsv = oneLine(
        valueByAliases(r, [
          'Kilo Şartı','Kilo Sarti','Yaradi3'
        ])
      );

      races.set(raceNo, {
        no: raceNo,
        time:
          oneLine(
            valueByAliases(r, [
              'Saat','Koşu Saati','Kosu Saati','Time'
            ])
          ).replace('.', ':') ||
          hmeta.time ||
          '',

        class:
          classCsv ||
          csvMeta.class ||
          hmeta.class ||
          '',

        yaradi1:
          classCsv ||
          csvMeta.yaradi1 ||
          hmeta.yaradi1 ||
          '',

        ageGroup:
          ageCsv ||
          csvMeta.ageGroup ||
          hmeta.ageGroup ||
          '',

        yaradi2:
          ageCsv ||
          csvMeta.yaradi2 ||
          hmeta.yaradi2 ||
          '',

        condition:
          conditionCsv ||
          csvMeta.condition ||
          hmeta.condition ||
          '',

        yaradi3:
          conditionCsv ||
          csvMeta.yaradi3 ||
          hmeta.yaradi3 ||
          '',

        distance:
          String(
            parseInteger(distanceCsv) ||
            parseInteger(csvMeta.distance) ||
            parseInteger(hmeta.distance) ||
            ''
          ),

        mesafe:
          String(
            parseInteger(distanceCsv) ||
            parseInteger(csvMeta.distance) ||
            parseInteger(hmeta.distance) ||
            ''
          ),

        track:
          trackCsv ||
          csvMeta.track ||
          hmeta.track ||
          '',

        pist:
          trackCsv ||
          csvMeta.pist ||
          hmeta.pist ||
          '',

        betStarts: [],
        horses: [],

        source: 'TJK Resmi CSV Programı',
        sourceUrl: city.url
      });
    }

    const horseIdCsv = parseInteger(
      valueByAliases(r, [
        'At Id','At ID','AtId','Web At Id','web_at_id'
      ])
    );

    const horseId =
      horseIdCsv ||
      horseIdByName[norm(horseName)] ||
      null;

    const age = oneLine(
      valueByAliases(r, ['Yaş','Yas','At Yaşı','At Yasi'])
    );

    const horse = {
      no: horseNo,
      id: horseId,
      name: horseName,

      age,

      origin: oneLine(
        valueByAliases(r, [
          'Orijin(Baba - Anne)','Orijin','Origin'
        ])
      ),

      weight: parseNumber(
        valueByAliases(r, ['Sıklet','Siklet','Kilo'])
      ),

      jockey: oneLine(
        valueByAliases(r, ['Jokey','Jockey'])
      ),

      owner: oneLine(
        valueByAliases(r, ['Sahip','At Sahibi','Owner'])
      ),

      trainer: oneLine(
        valueByAliases(r, ['Antrenör','Antrenor','Trainer'])
      ),

      st: parseInteger(
        valueByAliases(r, ['St','Start','Kulvar'])
      ),

      hp: parseInteger(
        valueByAliases(r, ['HP','Handikap Puanı','Handikap Puani'])
      ),

      last6: oneLine(
        valueByAliases(r, ['Son 6 Y.','Son 6','Son6'])
      ),

      kgs: parseInteger(
        valueByAliases(r, ['KGS'])
      ),

      s20: parseNumber(
        valueByAliases(r, ['s20','S20'])
      ),

      best: oneLine(
        valueByAliases(r, ['En İyi D.','En Iyi D.','En İyi Derece'])
      ),

      odds: parseNumber(
        valueByAliases(r, ['Gny','Ganyan','Muhtemel'])
      ),

      agf: parseNumber(
        valueByAliases(r, ['AGF','AGF Oranı','AGF Orani'])
      )
    };

    races.get(raceNo).horses.push(horse);
  }

  const out = [...races.values()]
    .map(race => ({
      ...race,
      horses: [...new Map(
        race.horses.map(h => [
          `${h.no}|${h.id || norm(h.name)}`,
          h
        ])
      ).values()].sort((a, b) => a.no - b.no)
    }))
    .filter(race => race.horses.length)
    .sort((a, b) => a.no - b.no);

  return {
    races: out,
    headers
  };
}

/* ---------------------------------------------------------
   TEK ŞEHİR
--------------------------------------------------------- */

async function loadCityProgram(city, isoDate) {
  const csvUrl = buildCsvUrl(isoDate, city.name);

  let html = '';
  let htmlError = null;

  try {
    html = await fetchText(city.url);
  } catch (e) {
    htmlError = String(e?.message || e);
  }

  const htmlMeta = html ? parseHtmlRaceMeta(html) : {};
  const horseIdByName = html ? parseHtmlHorseIds(html) : {};

  const csvText = await fetchCsvText(csvUrl);

  const parsed = parseProgramCsv(
    csvText,
    htmlMeta,
    horseIdByName,
    city
  );

  if (!parsed.races.length) {
    throw new Error('CSV programında koşu/at bulunamadı.');
  }

  return {
    races: parsed.races,
    audit: {
      csvUrl,
      csvHeaders: parsed.headers,
      htmlMetaRaceCount: Object.keys(htmlMeta).length,
      htmlHorseIdCount: Object.keys(horseIdByName).length,
      htmlError
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

        if (!loaded.races.length) {
          throw new Error('Koşu bulunamadı.');
        }

        racesByCity[String(city.id)] = loaded.races;
        programs[String(city.id)] = loaded.races;
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
        sourceMode: 'TJK_OFFICIAL_CSV_PLUS_HTML_META',
        schemaBasis:
          'Eski çalışan /api/races yapısı: city + race + distance + track + class',
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
