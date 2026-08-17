import * as cheerio from 'cheerio';

const TJK_BASE =
  'https://www.tjk.org/TR/YarisSever/Info/Sehir/GunlukYarisProgrami';

function trDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function cleanText(value = '') {
  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function normalizeRaceClass(value = '') {
  return cleanText(value)
    .replace(/\s*\/\s*/g, ' /')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAgeGroup(text = '') {
  const t = cleanText(text);

  const patterns = [
    /(\d+\s+ve\s+Yukarı\s+İngilizler)/i,
    /(\d+\s+ve\s+Yukarı\s+Araplar)/i,
    /(\d+\s+Yaşlı\s+İngilizler)/i,
    /(\d+\s+Yaşlı\s+Araplar)/i
  ];

  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }

  return '';
}

function extractDistanceTrack(text = '') {
  const t = cleanText(text);

  const m = t.match(
    /(?:^|,)\s*(\d{3,4})\s*(Kum|Çim|Sentetik)(?:\s|,|$)/i
  );

  if (!m) {
    return {
      distance: '',
      track: ''
    };
  }

  return {
    distance: Number(m[1]),
    track:
      m[2].charAt(0).toUpperCase() +
      m[2].slice(1).toLowerCase()
  };
}

function conditionBeforeAge(text = '', ageGroup = '') {
  if (!ageGroup) return '';

  const t = cleanText(text);
  const i = t.toLocaleLowerCase('tr-TR').indexOf(
    ageGroup.toLocaleLowerCase('tr-TR')
  );

  if (i < 0) return '';

  let left = t.slice(0, i);

  left = left
    .replace(/^\d+\.\s*Koşu\s*\d{1,2}[.:]\d{2}\s*/i, '')
    .replace(/^\d+\.\s*Koşu\s*/i, '')
    .replace(/[,\s]+$/g, '')
    .trim();

  const lines = left
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);

  const candidate = lines.length
    ? lines[lines.length - 1]
    : left;

  return normalizeRaceClass(candidate);
}

function findRaceCondition(bodyText, raceNo) {
  const source = cleanText(bodyText);

  const raceRe = new RegExp(
    `(?:^|\\n)\\s*${raceNo}\\.\\s*Koşu(?:\\s+\\d{1,2}[.:]\\d{2})?`,
    'gi'
  );

  const starts = [];
  let m;

  while ((m = raceRe.exec(source))) {
    starts.push(m.index);
  }

  if (!starts.length) {
    const fallback = new RegExp(
      `${raceNo}\\.\\s*Koşu(?:\\s+\\d{1,2}[.:]\\d{2})?`,
      'gi'
    );

    while ((m = fallback.exec(source))) {
      starts.push(m.index);
    }
  }

  let best = null;

  for (const start of starts) {
    const slice = source.slice(start, start + 1800);

    const ageGroup = extractAgeGroup(slice);
    const dt = extractDistanceTrack(slice);

    if (!ageGroup || !dt.distance || !dt.track) {
      continue;
    }

    const prizeIndex = slice.search(
      /(?:İkramiye|Ikramiye)\s*:/i
    );

    const conditionArea =
      prizeIndex >= 0
        ? slice.slice(0, prizeIndex)
        : slice.slice(0, 700);

    const raceClass = conditionBeforeAge(
      conditionArea,
      ageGroup
    );

    const score =
      (prizeIndex >= 0 ? 10 : 0) +
      (raceClass ? 5 : 0) +
      (ageGroup ? 5 : 0) +
      (dt.distance ? 3 : 0) +
      (dt.track ? 3 : 0);

    if (!best || score > best.score) {
      best = {
        score,
        conditionArea,
        raceClass,
        ageGroup,
        distance: dt.distance,
        track: dt.track
      };
    }
  }

  return best;
}

export default async function handler(req, res) {
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Cache-Control',
    'no-store, max-age=0'
  );

  const date = String(
    req.query?.date || ''
  ).trim();

  const cityId = String(
    req.query?.cityId || ''
  ).trim();

  const city = String(
    req.query?.city || ''
  ).trim();

  const raceNo = Number(
    req.query?.raceNo || 0
  );

  if (
    !date ||
    !cityId ||
    !city ||
    !Number.isInteger(raceNo) ||
    raceNo < 1
  ) {
    return res.status(400).json({
      ok: false,
      version: 'TJK-RACE-META-V1',
      error:
        'date, cityId, city ve raceNo zorunludur.'
    });
  }

  const tjkDate = trDate(date);

  if (!tjkDate) {
    return res.status(400).json({
      ok: false,
      version: 'TJK-RACE-META-V1',
      error:
        'date YYYY-MM-DD biçiminde olmalıdır.'
    });
  }

  const url =
    `${TJK_BASE}` +
    `?Era=today` +
    `&QueryParameter_Tarih=${encodeURIComponent(tjkDate)}` +
    `&SehirAdi=${encodeURIComponent(city)}` +
    `&SehirId=${encodeURIComponent(cityId)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/139 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language':
          'tr-TR,tr;q=0.9,en;q=0.7',
        'Cache-Control':
          'no-cache',
        'Pragma':
          'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(
        `TJK HTTP ${response.status}`
      );
    }

    const html = await response.text();

    if (!html || html.length < 500) {
      throw new Error(
        'TJK program HTML boş veya eksik.'
      );
    }

    const $ = cheerio.load(html);

    $('script,style,noscript').remove();

    const bodyText =
      $('body').text();

    const found =
      findRaceCondition(
        bodyText,
        raceNo
      );

    if (!found) {
      return res.status(404).json({
        ok: false,
        version: 'TJK-RACE-META-V1',
        date,
        cityId,
        city,
        raceNo,
        error:
          'Koşunun resmi yaş grubu / pist / mesafe bilgisi TJK programından ayrıştırılamadı.'
      });
    }

    return res.status(200).json({
      ok: true,
      version: 'TJK-RACE-META-V1',
      date,
      cityId,
      city,
      raceNo,
      class: found.raceClass,
      ageGroup: found.ageGroup,
      distance: found.distance,
      track: found.track,
      source: 'TJK Günlük Yarış Programı',
      sourceUrl: url
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      version: 'TJK-RACE-META-V1',
      date,
      cityId,
      city,
      raceNo,
      error:
        error?.message ||
        'TJK koşu meta verisi alınamadı.'
    });
  }
}
