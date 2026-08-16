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

function upper(v = '') {
  return clean(v).toLocaleUpperCase('tr-TR');
}

function parseDate(value = '') {
  const m = clean(value).match(
    /^(\d{2})[./](\d{2})[./](\d{4})$/
  );

  if (!m) return null;

  return {
    day: m[1],
    month: m[2],
    year: m[3],
    iso: `${m[3]}-${m[2]}-${m[1]}`,
    display: `${m[1]}.${m[2]}.${m[3]}`
  };
}

function displayFromIso(iso = '') {
  const m = String(iso).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!m) return '';

  return `${m[3]}.${m[2]}.${m[1]}`;
}

function normalizeTrack(value = '') {
  const t = upper(value);

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

function normalizeClass(value = '') {
  let t = clean(value);

  if (!t) return '';

  t = t
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();

  return t;
}

function getHeaders($, table) {
  let headers = [];

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
    x => re.test(clean(x))
  );
}

/* =========================================================
   AT KARİYER SATIRLARI
========================================================= */

function parseCareerRows($) {
  const results = [];

  $('table').each((_, table) => {
    const headers =
      getHeaders($, table);

    const dateIx =
      findHeader(
        headers,
        /^Tarih$/i
      );

    const cityIx =
      findHeader(
        headers,
        /Şehir|Sehir/i
      );

    const distanceIx =
      findHeader(
        headers,
        /Msf|Mesafe/i
      );

    const trackIx =
      findHeader(
        headers,
        /^Pist$/i
      );

    const finishIx =
      findHeader(
        headers,
        /^S$/i
      );

    const raceNoIx =
      findHeader(
        headers,
        /K\.?\s*No|Koşu No|Kosu No/i
      );

    if (
      dateIx < 0 ||
      finishIx < 0
    ) {
      return;
    }

    $(table)
      .find('tbody tr')
      .each((_, tr) => {
        const cells =
          $(tr)
            .find('td')
            .map(
              (__, td) =>
                clean($(td).text())
            )
            .get();

        if (!cells.length) return;

        const dateText =
          clean(
            cells[dateIx] || ''
          );

        const pd =
          parseDate(dateText);

        if (!pd) return;

        const finish =
          Number(
            String(
              cells[finishIx] || ''
            ).replace(
              /[^\d]/g,
              ''
            )
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
            ? clean(
                cells[distanceIx] || ''
              )
            : '';

        const dm =
          distanceRaw.match(
            /\d{3,4}/
          );

        const trackRaw =
          trackIx >= 0
            ? clean(
                cells[trackIx] || ''
              )
            : '';

        let raceNo = '';

        if (raceNoIx >= 0) {
          raceNo =
            String(
              cells[raceNoIx] || ''
            ).match(/\d+/)?.[0] ||
            '';
        }

        results.push({
          date:
            pd.display,

          isoDate:
            pd.iso,

          city:
            cityIx >= 0
              ? clean(
                  cells[cityIx] || ''
                )
              : '',

          finish,

          raceNo,

          distance:
            dm
              ? `${dm[0]}m`
              : distanceRaw,

          track:
            normalizeTrack(
              trackRaw
            ),

          class: '',

          ageGroup: '',

          detailSource: ''
        });
      });
  });

  return results;
}

/* =========================================================
   HTTP
========================================================= */

async function fetchHtml(url) {
  const response =
    await fetch(
      url,
      {
        headers: HEADERS,
        redirect: 'follow'
      }
    );

  if (!response.ok) {
    throw new Error(
      `TJK HTTP ${response.status}`
    );
  }

  return await response.text();
}

/* =========================================================
   TJK KOŞU SORGULAMA
   Gerçek alanlar:
   Tarih | Şehir | Koşu | Grup | Koşu Cinsi | Mesafe | Pist
========================================================= */

function parseRaceQueryRows(html) {
  const $ =
    cheerio.load(html);

  const rows = [];

  $('table').each((_, table) => {
    const headers =
      getHeaders($, table);

    const dateIx =
      findHeader(
        headers,
        /^Tarih$/i
      );

    const cityIx =
      findHeader(
        headers,
        /Şehir|Sehir/i
      );

    const raceIx =
      findHeader(
        headers,
        /^Koşu$|^Kosu$/i
      );

    const groupIx =
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
        /Mesafe/i
      );

    const trackIx =
      findHeader(
        headers,
        /^Pist$/i
      );

    if (
      dateIx < 0 ||
      cityIx < 0 ||
      groupIx < 0 ||
      classIx < 0 ||
      distanceIx < 0 ||
      trackIx < 0
    ) {
      return;
    }

    $(table)
      .find('tbody tr')
      .each((_, tr) => {
        const c =
          $(tr)
            .find('td')
            .map(
              (__, td) =>
                clean($(td).text())
            )
            .get();

        if (!c.length) return;

        const pd =
          parseDate(
            c[dateIx]
          );

        if (!pd) return;

        const distance =
          clean(
            c[distanceIx]
          ).match(
            /\d{3,4}/
          )?.[0] || '';

        const raceNo =
          raceIx >= 0
            ? String(
                c[raceIx] || ''
              ).match(/\d+/)?.[0] || ''
            : '';

        rows.push({
          date:
            pd.display,

          isoDate:
            pd.iso,

          city:
            clean(
              c[cityIx]
            ),

          raceNo,

          ageGroup:
            clean(
              c[groupIx]
            ),

          class:
            normalizeClass(
              c[classIx]
            ),

          distance:
            distance
              ? `${distance}m`
              : '',

          track:
            normalizeTrack(
              c[trackIx]
            )
        });
      });
  });

  return rows;
}

/*
  TJK sorgu sayfasını tarih bazlı açıyoruz.
  Sayfa, o tarihteki gerçek yarışları döndürüyor.
*/
async function loadRaceQueryForDate(
  isoDate
) {
  const display =
    displayFromIso(
      isoDate
    );

  if (!display) {
    return [];
  }

  const encoded =
    encodeURIComponent(
      display
    );

  const urls = [
    `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama` +
      `?QueryParameter_TarihBaslangic=${encoded}` +
      `&QueryParameter_TarihBitis=${encoded}`,

    `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama` +
      `?TarihBaslangic=${encoded}` +
      `&TarihBitis=${encoded}`
  ];

  let best = [];

  for (const url of urls) {
    try {
      const html =
        await fetchHtml(
          url
        );

      const parsed =
        parseRaceQueryRows(
          html
        );

      if (
        parsed.length >
        best.length
      ) {
        best = parsed;
      }
    } catch (e) {
      console.error(
        'KOSU SORGULAMA',
        isoDate,
        e.message
      );
    }
  }

  return best;
}

/* =========================================================
   EŞLEŞTİRME
========================================================= */

function sameText(a, b) {
  return (
    upper(a) ===
    upper(b)
  );
}

function raceMatchScore(
  career,
  race
) {
  /*
    Tarih ve şehir zorunlu.
  */
  if (
    career.isoDate !==
    race.isoDate
  ) {
    return -1;
  }

  if (
    !sameText(
      career.city,
      race.city
    )
  ) {
    return -1;
  }

  let score = 200;

  /*
    Koşu numarası varsa
    en güçlü anahtar.
  */
  if (
    career.raceNo &&
    race.raceNo
  ) {
    if (
      String(
        career.raceNo
      ) ===
      String(
        race.raceNo
      )
    ) {
      score += 200;
    } else {
      score -= 100;
    }
  }

  if (
    career.distance &&
    race.distance &&
    sameText(
      career.distance,
      race.distance
    )
  ) {
    score += 100;
  }

  if (
    career.track &&
    race.track &&
    sameText(
      career.track,
      race.track
    )
  ) {
    score += 100;
  }

  return score;
}

function enrichRows(
  careerRows,
  raceRows
) {
  return careerRows.map(
    career => {
      let best = null;
      let bestScore = -1;

      for (
        const race of
        raceRows
      ) {
        const score =
          raceMatchScore(
            career,
            race
          );

        if (
          score >
          bestScore
        ) {
          bestScore =
            score;

          best =
            race;
        }
      }

      /*
        Minimum güven:
        tarih + şehir + en az
        mesafe veya pist eşleşmesi.
      */
      if (
        best &&
        bestScore >= 300
      ) {
        return {
          ...career,

          class:
            best.class || '',

          ageGroup:
            best.ageGroup || '',

          raceNo:
            career.raceNo ||
            best.raceNo ||
            '',

          detailSource:
            'TJK_KOSU_SORGULAMA',

          detailMatchScore:
            bestScore
        };
      }

      return {
        ...career,

        detailSource:
          'BULUNAMADI',

        detailMatchScore:
          bestScore
      };
    }
  );
}

/* =========================================================
   ANA HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {
  try {
    const horseId =
      String(
        req.query.horseId ||
        ''
      ).replace(
        /\D/g,
        ''
      );

    const before =
      String(
        req.query.before ||
        ''
      ).trim();

    if (!horseId) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'horseId gerekli'
        });
    }

    if (
      before &&
      !/^\d{4}-\d{2}-\d{2}$/.test(
        before
      )
    ) {
      return res
        .status(400)
        .json({
          ok: false,
          error:
            'before tarihi YYYY-MM-DD biçiminde olmalı.'
        });
    }

    const careerUrl =
      `${TJK}/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri` +
      `?1=1` +
      `&QueryParameter_AtId=${encodeURIComponent(
        horseId
      )}` +
      `&Era=today`;

    const careerHtml =
      await fetchHtml(
        careerUrl
      );

    const $ =
      cheerio.load(
        careerHtml
      );

    const allRows =
      parseCareerRows($);

    /*
      SADECE İLK 5
    */
    let top5 =
      allRows.filter(
        r =>
          r.finish >= 1 &&
          r.finish <= 5
      );

    /*
      Geçmiş yarışta geleceği
      görme yasak.
    */
    if (before) {
      top5 =
        top5.filter(
          r =>
            r.isoDate &&
            r.isoDate <
              before
        );
    }

    /*
      Sadece gereken tarihler için
      Koşu Sorgulama'yı indir.
    */
    const uniqueDates =
      [
        ...new Set(
          top5
            .map(
              x =>
                x.isoDate
            )
            .filter(Boolean)
        )
      ];

    const raceRows = [];

    /*
      TJK'yi aşırı yüklememek
      için ardışık gidiyoruz.
    */
    for (
      const isoDate of
      uniqueDates
    ) {
      const rows =
        await loadRaceQueryForDate(
          isoDate
        );

      raceRows.push(
        ...rows
      );
    }

    top5 =
      enrichRows(
        top5,
        raceRows
      );

    top5.sort(
      (a, b) =>
        a.isoDate.localeCompare(
          b.isoDate
        )
    );

    const finishCounts = {
      first:
        top5.filter(
          x =>
            x.finish === 1
        ).length,

      second:
        top5.filter(
          x =>
            x.finish === 2
        ).length,

      third:
        top5.filter(
          x =>
            x.finish === 3
        ).length,

      fourth:
        top5.filter(
          x =>
            x.finish === 4
        ).length,

      fifth:
        top5.filter(
          x =>
            x.finish === 5
        ).length
    };

    const ageGroupFilled =
      top5.filter(
        x =>
          !!x.ageGroup
      ).length;

    const classFilled =
      top5.filter(
        x =>
          !!x.class
      ).length;

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res
      .status(200)
      .json({
        ok: true,

        version:
          'CAREER-ROADMAP-V5',

        horseId,

        before:
          before || null,

        beforeDisplay:
          before
            ? displayFromIso(
                before
              )
            : null,

        cutoffExclusive:
          true,

        rule:
          'SADECE_ILK_5',

        detailRule:
          'TJK_KOSU_SORGULAMA',

        totalCareerRowsRead:
          allRows.length,

        top5Count:
          top5.length,

        uniqueRaceDates:
          uniqueDates.length,

        raceQueryRowsRead:
          raceRows.length,

        ageGroupFilled,

        ageGroupMissing:
          top5.length -
          ageGroupFilled,

        classFilled,

        classMissing:
          top5.length -
          classFilled,

        finishCounts,

        roadmap:
          top5,

        top5
      });

  } catch (e) {
    console.error(
      'tjk-career:',
      e
    );

    return res
      .status(500)
      .json({
        ok: false,

        error:
          e?.message ||
          'Kariyer yol haritası oluşturulamadı.'
      });
  }
          }
