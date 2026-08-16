import * as cheerio from 'cheerio';

const VERSION = 'CAREER-ROADMAP-V7.1';

const TJK = 'https://www.tjk.org';

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
    .toLocaleUpperCase('tr-TR');
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

   TJK:
   22.07.2026

   ISO:
   2026-07-22
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
      m[3];

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

   TJK Grup:
   2İ
   3İ
   3+İ
   4+İ
   3A
   4A
   4+A
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
   HEADER
========================================================= */

function normalizeHeader(
  value = ''
) {
  return clean(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/\./g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/\s+/g, '');
}

function findIndex(
  headers,
  candidates
) {
  const wanted =
    candidates.map(
      normalizeHeader
    );

  return headers.findIndex(
    h =>
      wanted.includes(
        normalizeHeader(h)
      )
  );
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

  return {
    url,
    html:
      await response.text()
  };
}

/* =========================================================
   TABLOYU ESNEK BUL

   V7'deki hata:
   yalnız thead/th aranıyordu.

   V7.1:
   - thead th
   - ilk tr içindeki th
   - ilk tr içindeki td

   hepsi deneniyor.
========================================================= */

function extractHeaders(
  $,
  table
) {
  let headers = [];

  /*
    1. Normal thead
  */

  $(table)
    .find('thead tr')
    .first()
    .find('th,td')
    .each(
      (_, cell) => {
        headers.push(
          clean(
            $(cell).text()
          )
        );
      }
    );

  if (
    headers.length >= 5
  ) {
    return headers;
  }

  headers = [];

  /*
    2. İlk satır
  */

  $(table)
    .find('tr')
    .first()
    .find('th,td')
    .each(
      (_, cell) => {
        headers.push(
          clean(
            $(cell).text()
          )
        );
      }
    );

  return headers;
}

function looksLikeCareerHeaders(
  headers
) {
  const n =
    headers.map(
      normalizeHeader
    );

  const hasDate =
    n.includes('tarih');

  const hasCity =
    n.includes('sehir');

  const hasDistance =
    n.includes('msf') ||
    n.includes('mesafe');

  const hasTrack =
    n.includes('pist');

  const hasFinish =
    n.includes('s');

  const hasGroup =
    n.includes('grup');

  const hasClass =
    n.includes('kcins');

  return (
    hasDate &&
    hasCity &&
    hasDistance &&
    hasTrack &&
    hasFinish &&
    hasGroup &&
    hasClass
  );
}

function findCareerTable(
  $
) {
  let best = null;

  $('table').each(
    (_, table) => {

      const headers =
        extractHeaders(
          $,
          table
        );

      if (
        !headers.length
      ) {
        return;
      }

      if (
        looksLikeCareerHeaders(
          headers
        )
      ) {
        best = {
          table,
          headers
        };

        return false;
      }
    }
  );

  return best;
}

/* =========================================================
   SATIR PARSE

   TJK gerçek kolonları:
   Tarih
   Şehir
   Msf
   Pist
   S
   Derece
   Sıklet
   Takı
   Jokey
   St
   Gny
   Grup
   K. No-K. Adı
   Kcins
   Ant.
   Sahip
   HP
   Ikramiye
   S20
========================================================= */

function parseCareerRows(
  html
) {
  const $ =
    cheerio.load(html);

  const found =
    findCareerTable($);

  if (!found) {
    throw new Error(
      'TJK kariyer tablosu bulunamadı.'
    );
  }

  const {
    table,
    headers
  } = found;

  const dateIx =
    findIndex(
      headers,
      ['Tarih']
    );

  const cityIx =
    findIndex(
      headers,
      [
        'Şehir',
        'Sehir'
      ]
    );

  const distanceIx =
    findIndex(
      headers,
      [
        'Msf',
        'Mesafe'
      ]
    );

  const trackIx =
    findIndex(
      headers,
      ['Pist']
    );

  const finishIx =
    findIndex(
      headers,
      ['S']
    );

  const degreeIx =
    findIndex(
      headers,
      ['Derece']
    );

  const weightIx =
    findIndex(
      headers,
      [
        'Sıklet',
        'Siklet'
      ]
    );

  const jockeyIx =
    findIndex(
      headers,
      ['Jokey']
    );

  const groupIx =
    findIndex(
      headers,
      ['Grup']
    );

  const classIx =
    findIndex(
      headers,
      ['Kcins']
    );

  const hpIx =
    findIndex(
      headers,
      ['HP']
    );

  const rows = [];

  /*
    Tüm tr'leri oku.
    Header satırı tarih olmadığı
    için otomatik elenir.
  */

  $(table)
    .find('tr')
    .each(
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
          cells.length <
          Math.max(
            dateIx,
            cityIx,
            distanceIx,
            trackIx,
            finishIx,
            groupIx,
            classIx
          ) + 1
        ) {
          return;
        }

        const rawDate =
          clean(
            cells[
              dateIx
            ]
          );

        const isoDate =
          dateToIso(
            rawDate
          );

        /*
          Header veya anlamsız satır.
        */

        if (!isoDate) {
          return;
        }

        const finish =
          numberValue(
            cells[
              finishIx
            ],
            0
          );

        /*
          Koşmadı vb.
        */

        if (
          finish <= 0
        ) {
          return;
        }

        const rawTrack =
          clean(
            cells[
              trackIx
            ]
          );

        const rawGroup =
          clean(
            cells[
              groupIx
            ]
          );

        const rawClass =
          clean(
            cells[
              classIx
            ]
          );

        /*
          V7.1 KRİTİK:
          Msf doğrudan alınıyor.
        */

        const distance =
          numberValue(
            cells[
              distanceIx
            ],
            0
          );

        rows.push({
          isoDate,

          /*
            Ekranda kullanılacak.
          */
          date:
            rawDate,

          city:
            clean(
              cells[
                cityIx
              ]
            ),

          distance,

          /*
            V2 normalizeCareer ile
            uyumluluk için ekstra alias.
          */
          mesafe:
            distance,

          msf:
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

          /*
            Eski kodlarla uyumluluk.
          */
          rank:
            finish,

          sira:
            finish,

          degree:
            degreeIx >= 0
              ? clean(
                  cells[
                    degreeIx
                  ]
                )
              : '',

          weight:
            weightIx >= 0
              ? numberValue(
                  cells[
                    weightIx
                  ],
                  0
                )
              : 0,

          jockey:
            jockeyIx >= 0
              ? clean(
                  cells[
                    jockeyIx
                  ]
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

          grup:
            rawGroup,

          groupRaw:
            rawGroup,

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

          hp:
            hpIx >= 0
              ? numberValue(
                  cells[
                    hpIx
                  ],
                  0
                )
              : 0
        });
      }
    );

  /*
    Eski -> yeni
  */

  rows.sort(
    (a, b) =>
      a.isoDate.localeCompare(
        b.isoDate
      )
  );

  return {
    headers,
    rows
  };
}

/* =========================================================
   BEFORE

   ÖRNEK:

   before = 2026-08-10

   2026-08-09 kullanılabilir.
   2026-08-10 KULLANILAMAZ.
   2026-08-11 KULLANILAMAZ.
========================================================= */

function filterBefore(
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
   TOP 5
========================================================= */

function filterTop5(
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

function summary(
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

    const fetched =
      await fetchCareerHtml(
        horseId
      );

    const parsed =
      parseCareerRows(
        fetched.html
      );

    /*
      1. Atın tüm gerçek yarışları
    */

    const allCareer =
      parsed.rows;

    /*
      2. Tarihsel yarış tarihinden
         önceye dondur.
    */

    const beforeCareer =
      filterBefore(
        allCareer,
        beforeIso
      );

    /*
      3. Yalnız ilk 5.
    */

    const roadmap =
      filterTop5(
        beforeCareer
      );

    const distanceFilled =
      roadmap.filter(
        x =>
          x.distance > 0
      ).length;

    const distanceMissing =
      roadmap.length -
      distanceFilled;

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
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
          before:
            beforeIso
              ? 'isoDate < before'
              : 'NO_BEFORE',

          top5:
            '1 <= finish <= 5',

          sameDayExcluded:
            Boolean(
              beforeIso
            ),

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

          distanceFilled,

          distanceMissing
        },

        summary:
          summary(
            roadmap
          ),

        /*
          ROADMAP V2'nin kullandığı
          ana alan.
        */

        roadmap,

        /*
          Eski app.js uyumluluğu.
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

          columns: {
            date:
              'Tarih',

            city:
              'Şehir',

            distance:
              'Msf',

            track:
              'Pist',

            finish:
              'S',

            ageGroup:
              'Grup',

            class:
              'Kcins'
          }
        },

        debug: {
          headers:
            parsed.headers
        }
      });

  } catch (e) {

    console.error(
      'tjk-career V7.1:',
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
