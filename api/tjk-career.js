import * as cheerio from 'cheerio';

const TJK = 'https://www.tjk.org';

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'tr-TR,tr;q=0.9,en;q=0.7',
  referer: 'https://www.tjk.org/'
};

function clean(v = '') {
  return String(v)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(value = '') {
  const m = clean(value).match(
    /^(\d{2})[./](\d{2})[./](\d{4})$/
  );

  if (!m) return null;

  return new Date(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1]),
    12,
    0,
    0
  );
}

function isoDate(value = '') {
  const d = parseDate(value);

  if (!d) return '';

  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
}

function displayDate(iso = '') {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!m) return '';

  return `${m[3]}.${m[2]}.${m[1]}`;
}

function normalizeTrack(value = '') {
  const t = clean(value).toLocaleUpperCase('tr-TR');

  if (
    t.startsWith('Ç') ||
    t.includes('ÇİM')
  ) {
    return 'Çim';
  }

  if (
    t.startsWith('K') ||
    t.includes('KUM')
  ) {
    return 'Kum';
  }

  if (
    t.startsWith('S') ||
    t.includes('SENTETİK')
  ) {
    return 'Sentetik';
  }

  return clean(value);
}

function raceClassFromCells(cells) {
  const patterns = [
    /HANDİKAP\s*\d+(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?/i,
    /HANDIKAP\s*\d+(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?/i,
    /ŞARTLI\s*\d+(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?/i,
    /MAIDEN(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?/i,
    /KV-\s*\d+(?:\/[A-ZÇĞİÖŞÜ0-9/-]+)?/i,
    /\bG[1-3]\b/i,
    /\bA[1-3]\b/i
  ];

  for (const cell of cells) {
    for (const p of patterns) {
      const m = clean(cell).match(p);

      if (m) {
        return clean(m[0]);
      }
    }
  }

  return '';
}

function ageGroupFromCells(cells) {
  for (const cell of cells) {
    const t = clean(cell);

    if (
      /^(\d+\+?[A-Zİ]?|\d+\s*ve\s*Yukarı)/i.test(t)
    ) {
      return t;
    }

    if (
      /\b(2|3|4|5)\s*Yaşlı/i.test(t)
    ) {
      return t;
    }
  }

  return '';
}

function findHeader(headers, re) {
  return headers.findIndex(x => re.test(clean(x)));
}

function getHeaders($, table) {
  let headers = [];

  $(table)
    .find('thead th')
    .each((_, th) => {
      headers.push(clean($(th).text()));
    });

  if (!headers.length) {
    $(table)
      .find('tr')
      .first()
      .find('th,td')
      .each((_, el) => {
        headers.push(clean($(el).text()));
      });
  }

  return headers;
}

function parseRows($) {
  const results = [];

  $('table').each((_, table) => {
    const headers = getHeaders($, table);

    const dateIx = findHeader(headers, /^Tarih$/i);
    const cityIx = findHeader(headers, /Şehir|Sehir/i);
    const distanceIx = findHeader(headers, /Msf|Mesafe/i);
    const trackIx = findHeader(headers, /^Pist$/i);

    /*
      TJK koşu geçmişinde bitiriş sırası "S" başlığıyla gelir.
    */
    const finishIx = findHeader(headers, /^S$/i);

    if (dateIx < 0 || finishIx < 0) {
      return;
    }

    $(table)
      .find('tbody tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('td')
          .map((__, td) => clean($(td).text()))
          .get();

        if (!cells.length) return;

        const dateText = clean(cells[dateIx] || '');

        if (!parseDate(dateText)) return;

        const finish = Number(
          String(cells[finishIx] || '')
            .replace(/[^\d]/g, '')
        );

        if (
          !Number.isFinite(finish) ||
          finish < 1 ||
          finish > 99
        ) {
          return;
        }

        const distanceRaw =
          distanceIx >= 0
            ? clean(cells[distanceIx] || '')
            : '';

        const distanceMatch =
          distanceRaw.match(/\d{3,4}/);

        const trackRaw =
          trackIx >= 0
            ? clean(cells[trackIx] || '')
            : '';

        results.push({
          date: dateText,
          isoDate: isoDate(dateText),

          city:
            cityIx >= 0
              ? clean(cells[cityIx] || '')
              : '',

          finish,

          distance:
            distanceMatch
              ? `${distanceMatch[0]}m`
              : distanceRaw,

          track: normalizeTrack(trackRaw),

          class: raceClassFromCells(cells),

          ageGroup: ageGroupFromCells(cells)
        });
      });
  });

  return results;
}

export default async function handler(req, res) {
  try {
    const horseId = String(
      req.query.horseId || ''
    ).replace(/\D/g, '');

    /*
      before:
      Bugünkü at için = bugünkü yarış tarihi

      Geçmiş benzer yarıştaki at için =
      o tarihsel yarışın tarihi

      Örnek:
      ?horseId=76539&before=2026-08-16
    */
    const before = String(
      req.query.before || ''
    ).trim();

    if (!horseId) {
      return res.status(400).json({
        ok: false,
        error: 'horseId gerekli'
      });
    }

    if (
      before &&
      !/^\d{4}-\d{2}-\d{2}$/.test(before)
    ) {
      return res.status(400).json({
        ok: false,
        error:
          'before tarihi YYYY-MM-DD biçiminde olmalı.'
      });
    }

    const url =
      `${TJK}/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri` +
      `?1=1` +
      `&QueryParameter_AtId=${encodeURIComponent(horseId)}` +
      `&Era=today`;

    const response = await fetch(url, {
      headers: HEADERS,
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error:
          `TJK kariyer erişimi başarısız: HTTP ${response.status}`
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const allRows = parseRows($);

    /*
      ASIL KURAL 1:
      SADECE İLK 5 BİTİRİŞLER.
    */
    let top5 = allRows.filter(
      r =>
        r.finish >= 1 &&
        r.finish <= 5
    );

    /*
      ASIL KURAL 2:
      Tarihsel karşılaştırmada geleceği görme yok.

      before=2023-09-15 ise
      15.09.2023 ve sonrası kullanılmaz.

      Yalnızca:
      kariyer_yarışı < tarihsel_yarış_tarihi
    */
    if (before) {
      top5 = top5.filter(
        r =>
          r.isoDate &&
          r.isoDate < before
      );
    }

    /*
      En eskiden yeniye sıralıyoruz.
      Çünkü bu bölüm bir "yol haritası":
      at kariyerinde nasıl ilerlemiş görmek istiyoruz.
    */
    top5.sort((a, b) =>
      a.isoDate.localeCompare(b.isoDate)
    );

    const finishCounts = {
      first: top5.filter(x => x.finish === 1).length,
      second: top5.filter(x => x.finish === 2).length,
      third: top5.filter(x => x.finish === 3).length,
      fourth: top5.filter(x => x.finish === 4).length,
      fifth: top5.filter(x => x.finish === 5).length
    };

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res.status(200).json({
      ok: true,

      version:
        'CAREER-ROADMAP-V2',

      horseId,

      /*
        cutoffExclusive=true:
        before tarihindeki yarış bile
        geçmiş kariyere dahil değildir.
      */
      before:
        before || null,

      beforeDisplay:
        before
          ? displayDate(before)
          : null,

      cutoffExclusive:
        true,

      rule:
        'SADECE_ILK_5',

      totalCareerRowsRead:
        allRows.length,

      top5Count:
        top5.length,

      finishCounts,

      roadmap: top5,

      /*
        Eski app.js ile geçici uyumluluk.
      */
      top5
    });
  } catch (e) {
    console.error(
      'tjk-career:',
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        'Kariyer yol haritası oluşturulamadı.'
    });
  }
      }
