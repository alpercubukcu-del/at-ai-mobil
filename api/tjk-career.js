import * as cheerio from 'cheerio';

const VERSION = 'CAREER-ROADMAP-V7.2';

const TJK =
  'https://www.tjk.org';

const CAREER_URL =
  `${TJK}/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri`;

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',

  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',

  'accept-language':
    'tr-TR,tr;q=0.9,en;q=0.7',

  referer:
    'https://www.tjk.org/'
};

/* =========================================================
   TEMEL
========================================================= */

function clean(v = '') {
  return String(v)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function upper(v = '') {
  return clean(v)
    .toLocaleUpperCase(
      'tr-TR'
    );
}

function numberValue(
  value,
  fallback = 0
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const text =
    clean(value)
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');

  const n =
    Number(text);

  return Number.isFinite(n)
    ? n
    : fallback;
}

/* =========================================================
   TARİH

   22.07.2026 -> 2026-07-22
========================================================= */

function dateToIso(
  value = ''
) {
  const text =
    clean(value);

  let m =
    text.match(
      /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/
    );

  if (m) {
    const dd =
      String(m[1])
        .padStart(2, '0');

    const mm =
      String(m[2])
        .padStart(2, '0');

    const yyyy =
      String(m[3]);

    return (
      `${yyyy}-${mm}-${dd}`
    );
  }

  m =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (m) {
    return text;
  }

  return '';
}

/* =========================================================
   PİST
========================================================= */

function parseTrack(
  value = ''
) {
  const t =
    upper(value);

  if (
    t.startsWith('K:') ||
    t === 'K' ||
    t.includes('KUM')
  ) {
    return 'Kum';
  }

  if (
    t.startsWith('Ç:') ||
    t === 'Ç' ||
    t.includes('ÇİM')
  ) {
    return 'Çim';
  }

  if (
    t.startsWith('S:') ||
    t === 'S' ||
    t.includes('SENTETİK')
  ) {
    return 'Sentetik';
  }

  return clean(value);
}

function parseTrackCondition(
  value = ''
) {
  const text =
    clean(value);

  const ix =
    text.indexOf(':');

  if (
    ix < 0
  ) {
    return '';
  }

  return clean(
    text.slice(
      ix + 1
    )
  );
}

/* =========================================================
   YAŞ GRUBU
========================================================= */

function normalizeAgeGroup(
  value = ''
) {
  const t =
    upper(value)
      .replace(/\s+/g, '');

  const map = {
    '2İ':
      '2 Yaşlı İngilizler',

    '2I':
      '2 Yaşlı İngilizler',

    '3İ':
      '3 Yaşlı İngilizler',

    '3I':
      '3 Yaşlı İngilizler',

    '3+İ':
      '3 ve Yukarı İngilizler',

    '3+I':
      '3 ve Yukarı İngilizler',

    '4İ':
      '4 Yaşlı İngilizler',

    '4I':
      '4 Yaşlı İngilizler',

    '4+İ':
      '4 ve Yukarı İngilizler',

    '4+I':
      '4 ve Yukarı İngilizler',

    '2A':
      '2 Yaşlı Araplar',

    '3A':
      '3 Yaşlı Araplar',

    '4A':
      '4 Yaşlı Araplar',

    '4+A':
      '4 ve Yukarı Araplar',

    '5+A':
      '5 ve Yukarı Araplar'
  };

  return (
    map[t] ||
    clean(value)
  );
}

/* =========================================================
   SINIF
========================================================= */

function normalizeClass(
  value = ''
) {
  return clean(value)
    .replace(
      /\s*\/\s*/g,
      '/'
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

/* =========================================================
   TJK HTML
========================================================= */

async function fetchCareerHtml(
  horseId
) {
  const url =
    `${CAREER_URL}` +
    `?1=1` +
    `&QueryParameter_AtId=${encodeURIComponent(horseId)}` +
    `&Era=today`;

  const response =
    await fetch(
      url,
      {
        method:
          'GET',

        headers:
          HEADERS,

        redirect:
          'follow'
      }
    );

  if (!response.ok) {
    throw new Error(
      `TJK kariyer HTTP ${response.status}`
    );
  }

  const html =
    await response.text();

  if (
    !html ||
    html.length < 100
  ) {
    throw new Error(
      'TJK kariyer cevabı boş.'
    );
  }

  return {
    url,
    html
  };
}

/* =========================================================
   V7.2 SATIR PARSER

   ARTIK HEADER ARAMIYORUZ.

   TJK gerçek satır sırası:

   0  Tarih
   1  Şehir
   2  Msf
   3  Pist
   4  S
   5  Derece
   6  Sıklet
   7  Takı
   8  Jokey
   9  St
   10 Gny
   11 Grup
   12 K.No-K.Adı
   13 Kcins
   14 Ant.
   15 Sahip
   16 HP
   17 İkramiye
   18 S20

========================================================= */

function parseRowFromCells(
  cells
) {
  if (
    !Array.isArray(cells) ||
    cells.length < 14
  ) {
    return null;
  }

  const rawDate =
    clean(
      cells[0]
    );

  const isoDate =
    dateToIso(
      rawDate
    );

  /*
    Bir yarış satırı mutlaka
    gerçek tarih ile başlamalı.
  */

  if (!isoDate) {
    return null;
  }

  const city =
    clean(
      cells[1]
    );

  const distance =
    numberValue(
      cells[2],
      0
    );

  const rawTrack =
    clean(
      cells[3]
    );

  const finish =
    numberValue(
      cells[4],
      0
    );

  const rawGroup =
    clean(
      cells[11]
    );

  const rawClass =
    clean(
      cells[13]
    );

  /*
    Yanlış tablo/satır koruması.
  */

  if (!city) {
    return null;
  }

  if (
    distance < 600 ||
    distance > 5000
  ) {
    return null;
  }

  if (
    finish < 1 ||
    finish > 99
  ) {
    return null;
  }

  if (
    !rawTrack
  ) {
    return null;
  }

  /*
    HP bazı eski yarışlarda
    boş olabilir.
  */

  const hp =
    cells.length > 16
      ? numberValue(
          cells[16],
          0
        )
      : 0;

  return {
    isoDate,

    date:
      rawDate,

    city,

    /*
      V7.2:
      GERÇEK Msf.
    */

    distance,

    msf:
      distance,

    mesafe:
      distance,

    track:
      parseTrack(
        rawTrack
      ),

    pist:
      parseTrack(
        rawTrack
      ),

    trackCondition:
      parseTrackCondition(
        rawTrack
      ),

    finish,

    rank:
      finish,

    sira:
      finish,

    degree:
      cells.length > 5
        ? clean(
            cells[5]
          )
        : '',

    weight:
      cells.length > 6
        ? numberValue(
            cells[6],
            0
          )
        : 0,

    equipment:
      cells.length > 7
        ? clean(
            cells[7]
          )
        : '',

    jockey:
      cells.length > 8
        ? clean(
            cells[8]
          )
        : '',

    startNo:
      cells.length > 9
        ? numberValue(
            cells[9],
            0
          )
        : 0,

    odds:
      cells.length > 10
        ? clean(
            cells[10]
          )
        : '',

    ageGroup:
      normalizeAgeGroup(
        rawGroup
      ),

    group:
      normalizeAgeGroup(
        rawGroup
      ),

    groupRaw:
      rawGroup,

    grup:
      rawGroup,

    raceNoName:
      cells.length > 12
        ? clean(
            cells[12]
          )
        : '',

    class:
      normalizeClass(
        rawClass
      ),

    raceClass:
      normalizeClass(
        rawClass
      ),

    kcins:
      normalizeClass(
        rawClass
      ),

    classRaw:
      rawClass,

    trainer:
      cells.length > 14
        ? clean(
            cells[14]
          )
        : '',

    owner:
      cells.length > 15
        ? clean(
            cells[15]
          )
        : '',

    hp,

    prize:
      cells.length > 17
        ? clean(
            cells[17]
          )
        : '',

    s20:
      cells.length > 18
        ? numberValue(
            cells[18],
            0
          )
        : 0
  };
}

/* =========================================================
   TÜM HTML'DEN YARIŞ SATIRLARINI BUL

   Burada tablo adına/header'a
   bağımlılık YOK.
========================================================= */

function parseCareerRows(
  html
) {
  const $ =
    cheerio.load(html);

  const rows = [];

  let inspectedRows = 0;
  let acceptedRows = 0;

  $('tr').each(
    (_, tr) => {

      const cells =
        $(tr)
          .find('td')
          .map(
            (__, td) =>
              clean(
                $(td).text()
              )
          )
          .get();

      if (
        !cells.length
      ) {
        return;
      }

      inspectedRows++;

      const parsed =
        parseRowFromCells(
          cells
        );

      if (!parsed) {
        return;
      }

      rows.push(
        parsed
      );

      acceptedRows++;
    }
  );

  /*
    Aynı satır HTML içinde
    iki kez bulunursa temizle.
  */

  const uniqueMap =
    new Map();

  for (
    const row of rows
  ) {
    const key =
      [
        row.isoDate,
        row.city,
        row.distance,
        row.finish,
        row.class,
        row.degree
      ].join('|');

    if (
      !uniqueMap.has(key)
    ) {
      uniqueMap.set(
        key,
        row
      );
    }
  }

  const uniqueRows =
    Array.from(
      uniqueMap.values()
    );

  /*
    Eski -> yeni.
  */

  uniqueRows.sort(
    (a, b) =>
      a.isoDate.localeCompare(
        b.isoDate
      )
  );

  if (
    !uniqueRows.length
  ) {
    throw new Error(
      `TJK kariyer yarış satırı bulunamadı. İncelenen satır: ${inspectedRows}`
    );
  }

  return {
    rows:
      uniqueRows,

    inspectedRows,

    acceptedRows,

    uniqueRows:
      uniqueRows.length
  };
}

/* =========================================================
   BEFORE FİLTRESİ

   ÖRNEK:

   historical race:
   2026-08-10

   2026-08-09 -> kullan
   2026-08-10 -> kullanma
   2026-08-11 -> kullanma
========================================================= */

function applyBefore(
  rows,
  before
) {
  if (!before) {
    return rows;
  }

  const beforeIso =
    dateToIso(
      before
    );

  if (!beforeIso) {
    throw new Error(
      'before tarihi geçersiz.'
    );
  }

  return rows.filter(
    row =>
      row.isoDate <
      beforeIso
  );
}

/* =========================================================
   İLK 5 FİLTRESİ
========================================================= */

function onlyTop5(
  rows
) {
  return rows.filter(
    row =>
      row.finish >= 1 &&
      row.finish <= 5
  );
}

/* =========================================================
   ÖZET
========================================================= */

function buildSummary(
  rows
) {
  return {
    totalTop5:
      rows.length,

    first:
      rows.filter(
        x =>
          x.finish === 1
      ).length,

    second:
      rows.filter(
        x =>
          x.finish === 2
      ).length,

    third:
      rows.filter(
        x =>
          x.finish === 3
      ).length,

    fourth:
      rows.filter(
        x =>
          x.finish === 4
      ).length,

    fifth:
      rows.filter(
        x =>
          x.finish === 5
      ).length
  };
}

/* =========================================================
   DOĞRULAMA
========================================================= */

function buildValidation(
  allCareer,
  beforeCareer,
  roadmap,
  beforeIso
) {
  const badFutureRows =
    beforeIso
      ? beforeCareer.filter(
          row =>
            row.isoDate >=
            beforeIso
        )
      : [];

  const badFinishRows =
    roadmap.filter(
      row =>
        row.finish < 1 ||
        row.finish > 5
    );

  const distanceMissing =
    roadmap.filter(
      row =>
        !row.distance ||
        row.distance <= 0
    );

  const ageGroupMissing =
    roadmap.filter(
      row =>
        !row.ageGroup
    );

  const classMissing =
    roadmap.filter(
      row =>
        !row.class
    );

  return {
    allCareerCount:
      allCareer.length,

    beforeCareerCount:
      beforeCareer.length,

    roadmapCount:
      roadmap.length,

    futureLeakCount:
      badFutureRows.length,

    invalidFinishCount:
      badFinishRows.length,

    distanceMissingCount:
      distanceMissing.length,

    ageGroupMissingCount:
      ageGroupMissing.length,

    classMissingCount:
      classMissing.length,

    valid:
      badFutureRows.length === 0 &&
      badFinishRows.length === 0 &&
      distanceMissing.length === 0
  };
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {
  try {

    const horseId =
      clean(
        req.query.horseId ||
        req.query.id ||
        ''
      );

    const before =
      clean(
        req.query.before ||
        ''
      );

    if (!horseId) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'horseId gerekli.'
        });
    }

    let beforeIso = '';

    if (before) {
      beforeIso =
        dateToIso(
          before
        );

      if (!beforeIso) {
        return res
          .status(400)
          .json({
            ok: false,

            version:
              VERSION,

            error:
              'before YYYY-MM-DD veya DD.MM.YYYY biçiminde olmalı.'
          });
      }
    }

    /* =====================================================
       1. TJK KARİYER HTML
    ===================================================== */

    const fetched =
      await fetchCareerHtml(
        horseId
      );

    /* =====================================================
       2. TÜM GERÇEK YARIŞLARI PARSE ET
    ===================================================== */

    const parsed =
      parseCareerRows(
        fetched.html
      );

    const allCareer =
      parsed.rows;

    /* =====================================================
       3. TARİHE DONDUR

       KRİTİK:
       race.isoDate < before
    ===================================================== */

    const beforeCareer =
      applyBefore(
        allCareer,
        beforeIso
      );

    /* =====================================================
       4. YALNIZ İLK 5
    ===================================================== */

    const roadmap =
      onlyTop5(
        beforeCareer
      );

    /* =====================================================
       5. DOĞRULAMA
    ===================================================== */

    const validation =
      buildValidation(
        allCareer,
        beforeCareer,
        roadmap,
        beforeIso
      );

    res.setHeader(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=900'
    );

    return res
      .status(200)
      .json({

        ok: true,

        version:
          VERSION,

        horseId:
          String(
            horseId
          ),

        before:
          beforeIso ||
          null,

        rules: {
          source:
            'TJK AtKosuBilgileri',

          historicalFreeze:
            beforeIso
              ? 'race.isoDate < before'
              : 'NO_BEFORE_FILTER',

          sameDayExcluded:
            Boolean(
              beforeIso
            ),

          finishFilter:
            '1 <= finish <= 5',

          leakageProtection:
            Boolean(
              beforeIso
            )
        },

        counts: {
          allCareer:
            allCareer.length,

          beforeCareer:
            beforeCareer.length,

          top5:
            roadmap.length,

          distanceFilled:
            roadmap.filter(
              x =>
                x.distance > 0
            ).length,

          distanceMissing:
            roadmap.filter(
              x =>
                !x.distance ||
                x.distance <= 0
            ).length
        },

        summary:
          buildSummary(
            roadmap
          ),

        validation,

        /*
          ANA ALAN
        */

        roadmap,

        /*
          ROADMAP V2 +
          ESKİ FRONTEND UYUMLULUĞU
        */

        top5:
          roadmap,

        races:
          roadmap,

        source: {
          type:
            'TJK_AT_KOSU_BILGILERI',

          url:
            fetched.url,

          positionalColumns: {
            0:
              'Tarih',

            1:
              'Şehir',

            2:
              'Msf',

            3:
              'Pist',

            4:
              'S',

            11:
              'Grup',

            13:
              'Kcins',

            16:
              'HP'
          }
        },

        debug: {
          inspectedRows:
            parsed.inspectedRows,

          acceptedRows:
            parsed.acceptedRows,

          uniqueRows:
            parsed.uniqueRows
        }
      });

  } catch (e) {

    console.error(
      'tjk-career V7.2:',
      e
    );

    return res
      .status(500)
      .json({

        ok: false,

        version:
          VERSION,

        error:
          e?.message ||
          'At kariyer bilgisi alınamadı.'
      });
  }
    }
