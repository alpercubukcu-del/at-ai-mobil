import * as cheerio from 'cheerio';

const VERSION = 'CAREER-ROADMAP-V7';

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

function numberValue(
  value,
  fallback = 0
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const normalized =
    String(value)
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');

  const n =
    Number(normalized);

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

  /*
    DD.MM.YYYY
    DD/MM/YYYY
  */

  let m =
    text.match(
      /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/
    );

  if (m) {
    const day =
      String(m[1])
        .padStart(2, '0');

    const month =
      String(m[2])
        .padStart(2, '0');

    const year =
      m[3];

    return (
      `${year}-${month}-${day}`
    );
  }

  /*
    Zaten ISO ise.
  */

  m =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (m) {
    return text;
  }

  return '';
}

function isoToDisplay(
  iso = ''
) {
  const m =
    clean(iso).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!m) {
    return '';
  }

  return (
    `${m[3]}.${m[2]}.${m[1]}`
  );
}

/* =========================================================
   PİST

   Örnek:
   K:Normal
   K:Islak
   Ç:Normal
   S:Normal
========================================================= */

function parseTrack(
  value = ''
) {
  const t =
    clean(value)
      .toLocaleUpperCase(
        'tr-TR'
      );

  if (
    t.startsWith('K') ||
    t.includes('KUM')
  ) {
    return 'Kum';
  }

  if (
    t.startsWith('Ç') ||
    t.includes('ÇİM')
  ) {
    return 'Çim';
  }

  if (
    t.startsWith('S') ||
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
   5+A
========================================================= */

function normalizeAgeGroup(
  value = ''
) {
  const t =
    clean(value)
      .toLocaleUpperCase(
        'tr-TR'
      )
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
   HEADER NORMALIZE
========================================================= */

function normalizeHeader(
  value = ''
) {
  return clean(value)
    .toLocaleLowerCase(
      'tr-TR'
    )
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
}

function findHeaderIndex(
  headers,
  names
) {
  const normalizedNames =
    names.map(
      normalizeHeader
    );

  return headers.findIndex(
    h =>
      normalizedNames.includes(
        normalizeHeader(h)
      )
  );
}

/* =========================================================
   HTML AL
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
        method: 'GET',
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
   TABLO BUL
========================================================= */

function findCareerTable(
  $
) {
  let selected = null;

  $('table').each(
    (_, table) => {

      if (selected) {
        return;
      }

      const headers = [];

      $(table)
        .find('thead th')
        .each(
          (__, th) => {
            headers.push(
              clean(
                $(th).text()
              )
            );
          }
        );

      const normalized =
        headers.map(
          normalizeHeader
        );

      const hasDate =
        normalized.includes(
          'tarih'
        );

      const hasCity =
        normalized.includes(
          'şehir'
        ) ||
        normalized.includes(
          'sehir'
        );

      const hasDistance =
        normalized.includes(
          'msf'
        ) ||
        normalized.includes(
          'mesafe'
        );

      const hasTrack =
        normalized.includes(
          'pist'
        );

      const hasFinish =
        normalized.includes(
          's'
        );

      const hasGroup =
        normalized.includes(
          'grup'
        );

      const hasClass =
        normalized.includes(
          'kcins'
        );

      if (
        hasDate &&
        hasCity &&
        hasDistance &&
        hasTrack &&
        hasFinish &&
        hasGroup &&
        hasClass
      ) {
        selected = {
          table,
          headers
        };
      }
    }
  );

  return selected;
}

/* =========================================================
   SATIRLARI PARSE ET
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
    findHeaderIndex(
      headers,
      [
        'Tarih'
      ]
    );

  const cityIx =
    findHeaderIndex(
      headers,
      [
        'Şehir',
        'Sehir'
      ]
    );

  /*
    V7 KRİTİK:
    Mesafe doğrudan Msf sütunundan.
  */

  const distanceIx =
    findHeaderIndex(
      headers,
      [
        'Msf',
        'Mesafe'
      ]
    );

  const trackIx =
    findHeaderIndex(
      headers,
      [
        'Pist'
      ]
    );

  /*
    TJK'deki S sütunu:
    bitiriş sırası.
  */

  const finishIx =
    findHeaderIndex(
      headers,
      [
        'S'
      ]
    );

  const degreeIx =
    findHeaderIndex(
      headers,
      [
        'Derece'
      ]
    );

  const weightIx =
    findHeaderIndex(
      headers,
      [
        'Sıklet',
        'Siklet'
      ]
    );

  const jockeyIx =
    findHeaderIndex(
      headers,
      [
        'Jokey'
      ]
    );

  const groupIx =
    findHeaderIndex(
      headers,
      [
        'Grup'
      ]
    );

  const classIx =
    findHeaderIndex(
      headers,
      [
        'Kcins'
      ]
    );

  const hpIx =
    findHeaderIndex(
      headers,
      [
        'HP'
      ]
    );

  const rows = [];

  $(table)
    .find('tbody tr')
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
          !cells.length
        ) {
          return;
        }

        const dateDisplay =
          dateIx >= 0
            ? clean(
                cells[
                  dateIx
                ]
              )
            : '';

        /*
          V7 KRİTİK:
          Karşılaştırma bu alanla.
        */

        const isoDate =
          dateToIso(
            dateDisplay
          );

        if (!isoDate) {
          return;
        }

        const finish =
          finishIx >= 0
            ? numberValue(
                cells[
                  finishIx
                ],
                0
              )
            : 0;

        /*
          Sadece gerçek yarış
          sonuç satırları.
        */

        if (
          finish <= 0
        ) {
          return;
        }

        const rawTrack =
          trackIx >= 0
            ? clean(
                cells[
                  trackIx
                ]
              )
            : '';

        /*
          V7 KRİTİK:
          Msf doğrudan integer.
        */

        const distance =
          distanceIx >= 0
            ? numberValue(
                cells[
                  distanceIx
                ],
                0
              )
            : 0;

        const rawGroup =
          groupIx >= 0
            ? clean(
                cells[
                  groupIx
                ]
              )
            : '';

        const rawClass =
          classIx >= 0
            ? clean(
                cells[
                  classIx
                ]
              )
            : '';

        rows.push({
          /*
            ISO ana tarih.
          */
          isoDate,

          /*
            Kullanıcıya gösterim.
          */
          date:
            dateDisplay ||
            isoToDisplay(
              isoDate
            ),

          city:
            cityIx >= 0
              ? clean(
                  cells[
                    cityIx
                  ]
                )
              : '',

          /*
            V7:
            Artık 0 olmamalı.
          */
          distance,

          track:
            parseTrack(
              rawTrack
            ),

          trackCondition:
            parseTrackCondition(
              rawTrack
            ),

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

          groupRaw:
            rawGroup,

          class:
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
   BEFORE FİLTRESİ

   KRİTİK KURAL:

   race.isoDate < before

   Tarihsel yarış günü dahil DEĞİL.
========================================================= */

function applyBeforeFilter(
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
      'before YYYY-MM-DD veya DD.MM.YYYY biçiminde olmalı.'
    );
  }

  return rows.filter(
    row =>
      row.isoDate <
      beforeIso
  );
}

/* =========================================================
   İLK 5

   Kullanıcının istediği kariyer
   yol haritası:

   hayat boyunca 1-5 bitirilen
   bütün yarışlar.
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
  const summary = {
    races:
      rows.length,

    first:
      0,

    second:
      0,

    third:
      0,

    fourth:
      0,

    fifth:
      0
  };

  for (
    const row of rows
  ) {
    if (
      row.finish === 1
    ) {
      summary.first++;
    }

    if (
      row.finish === 2
    ) {
      summary.second++;
    }

    if (
      row.finish === 3
    ) {
      summary.third++;
    }

    if (
      row.finish === 4
    ) {
      summary.fourth++;
    }

    if (
      row.finish === 5
    ) {
      summary.fifth++;
    }
  }

  return summary;
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

    /*
      before verildiyse
      baştan doğrula.
    */

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
      TÜM kariyer yarışları.
    */

    const allCareer =
      parsed.rows;

    /*
      Tarihsel yarış günü
      öncesine dondur.
    */

    const frozenCareer =
      applyBeforeFilter(
        allCareer,
        beforeIso
      );

    /*
      Sonra yalnız 1-5.
    */

    const top5 =
      onlyTop5(
        frozenCareer
      );

    /*
      Debug:
      Mesafe sorunu tekrar
      oluşursa hemen görebilelim.
    */

    const distanceFilled =
      top5.filter(
        row =>
          row.distance > 0
      ).length;

    const distanceMissing =
      top5.length -
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
          dateComparison:
            'ISO YYYY-MM-DD',

          beforeRule:
            beforeIso
              ? 'race.isoDate < before'
              : 'NO_BEFORE_FILTER',

          finishRule:
            '1 <= finish <= 5',

          raceDateExcluded:
            Boolean(
              beforeIso
            )
        },

        counts: {
          allCareer:
            allCareer.length,

          beforeCareer:
            frozenCareer.length,

          top5:
            top5.length,

          distanceFilled,

          distanceMissing
        },

        summary:
          buildSummary(
            top5
          ),

        /*
          Ana kullanılacak alan.
        */

        roadmap:
          top5,

        /*
          Eski frontend/API
          uyumluluğu için.
        */

        top5,

        source: {
          type:
            'TJK_AT_KOSU_BILGILERI',

          url:
            fetched.url,

          columnsUsed: {
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
      'tjk-career V7:',
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
