import * as cheerio from 'cheerio';

const TJK = 'https://www.tjk.org';

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

function parseDate(value = '') {
  const m = clean(value).match(
    /^(\d{2})[./](\d{2})[./](\d{4})$/
  );

  if (!m) return null;

  return {
    display:
      `${m[1]}.${m[2]}.${m[3]}`,

    iso:
      `${m[3]}-${m[2]}-${m[1]}`
  };
}

function normalizeTrack(v = '') {
  const t = upper(v);

  if (
    t.includes('ÇİM')
  ) {
    return 'Çim';
  }

  if (
    t.includes('KUM')
  ) {
    return 'Kum';
  }

  if (
    t.includes('SENTETİK')
  ) {
    return 'Sentetik';
  }

  return clean(v);
}

function normalizeClass(v = '') {
  return clean(v)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseClass(v = '') {
  const t = upper(
    normalizeClass(v)
  );

  /*
    Aynı temel sınıfı yakalamak için:
    Handikap 15/H1
    Handikap 15/Dişi
    -> HANDİKAP 15

    ŞARTLI 4/DHÖW
    -> ŞARTLI 4
  */

  let m =
    t.match(
      /(HANDİKAP|HANDIKAP)\s*(\d+)/
    );

  if (m) {
    return `HANDİKAP ${m[2]}`;
  }

  m =
    t.match(
      /ŞARTLI\s*(\d+)/
    );

  if (m) {
    return `ŞARTLI ${m[1]}`;
  }

  if (
    t.includes('MAIDEN')
  ) {
    return 'MAIDEN';
  }

  if (
    t.includes('SATIŞ') ||
    t.includes('SATIS')
  ) {
    return 'SATIŞ';
  }

  if (
    /\bG\s*1\b/.test(t) ||
    /\bG1\b/.test(t)
  ) {
    return 'G1';
  }

  if (
    /\bG\s*2\b/.test(t) ||
    /\bG2\b/.test(t)
  ) {
    return 'G2';
  }

  if (
    /\bG\s*3\b/.test(t) ||
    /\bG3\b/.test(t)
  ) {
    return 'G3';
  }

  if (
    /\bA\s*2\b/.test(t) ||
    /\bA2\b/.test(t)
  ) {
    return 'A2';
  }

  if (
    /\bA\s*3\b/.test(t) ||
    /\bA3\b/.test(t)
  ) {
    return 'A3';
  }

  return t
    .split('/')[0]
    .trim();
}

function normalizeAgeGroup(v = '') {
  return upper(v)
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchHtml(url) {
  const response =
    await fetch(url, {
      headers: HEADERS,
      redirect: 'follow'
    });

  if (!response.ok) {
    throw new Error(
      `TJK HTTP ${response.status}`
    );
  }

  return await response.text();
}

function getHeaders($, table) {
  const headers = [];

  $(table)
    .find('thead th')
    .each((_, th) => {
      headers.push(
        clean($(th).text())
      );
    });

  if (!headers.length) {
    $(table)
      .find('tr')
      .first()
      .find('th,td')
      .each((_, el) => {
        headers.push(
          clean($(el).text())
        );
      });
  }

  return headers;
}

function findHeader(headers, re) {
  return headers.findIndex(
    x =>
      re.test(
        clean(x)
      )
  );
}

/* =========================================================
   KOŞU SORGULAMA TABLOSU
========================================================= */

function parseQueryTable(html) {
  const $ =
    cheerio.load(html);

  const rows = [];

  $('table').each(
    (_, table) => {

      const headers =
        getHeaders(
          $,
          table
        );

      const dateIx =
        findHeader(
          headers,
          /^Tarih$/i
        );

      const cityIx =
        findHeader(
          headers,
          /^Şehir$|^Sehir$/i
        );

      const raceIx =
        findHeader(
          headers,
          /^Koşu$|^Kosu$/i
        );

      const ageIx =
        findHeader(
          headers,
          /^Grup$/i
        );

      const classIx =
        findHeader(
          headers,
          /Koşu Cinsi|Kosu Cinsi/i
        );

      const distanceIx =
        findHeader(
          headers,
          /^Mesafe$/i
        );

      const trackIx =
        findHeader(
          headers,
          /^Pist$/i
        );

      /*
        Bu tablo değilse atla.
      */
      if (
        dateIx < 0 ||
        cityIx < 0 ||
        raceIx < 0 ||
        ageIx < 0 ||
        classIx < 0 ||
        distanceIx < 0 ||
        trackIx < 0
      ) {
        return;
      }

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

            if (!cells.length) {
              return;
            }

            const pd =
              parseDate(
                cells[dateIx]
              );

            if (!pd) {
              return;
            }

            const raceNo =
              Number(
                String(
                  cells[raceIx] || ''
                ).match(/\d+/)?.[0] || 0
              );

            const distance =
              Number(
                String(
                  cells[distanceIx] || ''
                ).match(/\d{3,4}/)?.[0] || 0
              );

            rows.push({
              date:
                pd.display,

              isoDate:
                pd.iso,

              city:
                clean(
                  cells[cityIx]
                ),

              raceNo,

              ageGroup:
                clean(
                  cells[ageIx]
                ),

              class:
                normalizeClass(
                  cells[classIx]
                ),

              distance,

              track:
                normalizeTrack(
                  cells[trackIx]
                )
            });
          }
        );
    }
  );

  return rows;
}

/* =========================================================
   BENZERLİK
========================================================= */

function similarityScore(
  target,
  past
) {
  /*
    Gelecek veri kesinlikle yok.
  */
  if (
    !past.isoDate ||
    past.isoDate >=
      target.date
  ) {
    return null;
  }

  let score = 0;

  const detail = {
    class: 0,
    ageGroup: 0,
    track: 0,
    distance: 0,
    city: 0
  };

  /*
    SINIF — 35 puan
  */
  const targetClass =
    baseClass(
      target.class
    );

  const pastClass =
    baseClass(
      past.class
    );

  if (
    targetClass &&
    pastClass &&
    targetClass ===
      pastClass
  ) {
    detail.class = 35;
    score += 35;
  } else {
    return null;
  }

  /*
    YAŞ GRUBU — 25 puan
    Çekirdek koşul.
  */
  if (
    normalizeAgeGroup(
      target.ageGroup
    ) ===
    normalizeAgeGroup(
      past.ageGroup
    )
  ) {
    detail.ageGroup = 25;
    score += 25;
  } else {
    return null;
  }

  /*
    PİST — 20 puan
    Çekirdek koşul.
  */
  if (
    normalizeTrack(
      target.track
    ) ===
    normalizeTrack(
      past.track
    )
  ) {
    detail.track = 20;
    score += 20;
  } else {
    return null;
  }

  /*
    MESAFE — 15 puan
  */
  const diff =
    Math.abs(
      Number(target.distance) -
      Number(past.distance)
    );

  if (diff === 0) {
    detail.distance = 15;
  } else if (diff <= 100) {
    detail.distance = 12;
  } else if (diff <= 200) {
    detail.distance = 8;
  } else if (diff <= 300) {
    detail.distance = 4;
  } else {
    return null;
  }

  score +=
    detail.distance;

  /*
    AYNI HİPODROM — 5 puan
    Zorunlu değil.
  */
  if (
    upper(
      target.city
    ) ===
    upper(
      past.city
    )
  ) {
    detail.city = 5;
    score += 5;
  }

  return {
    score,
    detail
  };
}

/* =========================================================
   TJK KOŞU SORGULAMA

   Şimdilik sayfadaki erişilebilir tarihsel
   satırları okuyacağız.

   Endpoint veri döndürdükçe filtreleme
   API'sine geçebiliriz.
========================================================= */

async function loadHistoricalRows() {
  const url =
    `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;

  const html =
    await fetchHtml(
      url
    );

  return parseQueryTable(
    html
  );
}

/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {
  try {

    const date =
      clean(
        req.query.date ||
        ''
      );

    const city =
      clean(
        req.query.city ||
        ''
      );

    const raceClass =
      clean(
        req.query.class ||
        ''
      );

    const ageGroup =
      clean(
        req.query.ageGroup ||
        ''
      );

    const track =
      clean(
        req.query.track ||
        ''
      );

    const distance =
      Number(
        req.query.distance ||
        0
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            req.query.limit ||
            10
          ),
          1
        ),
        30
      );

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'date YYYY-MM-DD biçiminde gerekli.'
        });
    }

    if (!raceClass) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'class gerekli.'
        });
    }

    if (!ageGroup) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'ageGroup gerekli.'
        });
    }

    if (!track) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'track gerekli.'
        });
    }

    if (
      !Number.isFinite(
        distance
      ) ||
      distance <= 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'distance gerekli.'
        });
    }

    const target = {
      date,
      city,
      class:
        raceClass,
      ageGroup,
      track:
        normalizeTrack(
          track
        ),
      distance
    };

    const rows =
      await loadHistoricalRows();

    const matches = [];

    for (
      const past of
      rows
    ) {
      const sim =
        similarityScore(
          target,
          past
        );

      if (!sim) {
        continue;
      }

      matches.push({
        date:
          past.isoDate,

        dateDisplay:
          past.date,

        city:
          past.city,

        raceNo:
          past.raceNo,

        class:
          past.class,

        ageGroup:
          past.ageGroup,

        distance:
          past.distance,

        track:
          past.track,

        similarity:
          sim.score,

        similarityDetail:
          sim.detail
      });
    }

    matches.sort(
      (a, b) => {
        if (
          b.similarity !==
          a.similarity
        ) {
          return (
            b.similarity -
            a.similarity
          );
        }

        return (
          b.date.localeCompare(
            a.date
          )
        );
      }
    );

    const selected =
      matches.slice(
        0,
        limit
      );

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res
      .status(200)
      .json({
        ok: true,

        version:
          'TJK-SIMILAR-V1',

        target,

        scanned:
          rows.length,

        matchCount:
          matches.length,

        returned:
          selected.length,

        similarityRule: {
          class:
            35,

          ageGroup:
            25,

          track:
            20,

          distance:
            15,

          sameCity:
            5,

          core:
            [
              'class',
              'ageGroup',
              'track'
            ]
        },

        matches:
          selected,

        source:
          'TJK_KOSU_SORGULAMA'
      });

  } catch (e) {

    console.error(
      'tjk-similar:',
      e
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          e?.message ||
          'Tarihsel benzer yarışlar oluşturulamadı.'
      });
  }
        }
