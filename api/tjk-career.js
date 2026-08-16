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
  let t = upper(value);

  t = t
    .replace(/KISA VADE/g, 'KV')
    .replace(/HANDİKAP/g, 'HANDIKAP')
    .replace(/\s+/g, ' ')
    .trim();

  const m =
    t.match(/KV[-\s]*(\d+)/) ||
    t.match(/ŞARTLI\s*(\d+)/) ||
    t.match(/HANDIKAP\s*(\d+)/) ||
    t.match(/MAIDEN/) ||
    t.match(/\bG\s*([1-3])\b/) ||
    t.match(/\bA\s*([1-3])\b/) ||
    t.match(/SATIŞ\s*(\d+)/);

  if (!m) {
    return t;
  }

  if (/^KV/.test(m[0])) {
    return `KV-${m[1]}`;
  }

  if (/^ŞARTLI/.test(m[0])) {
    return `ŞARTLI ${m[1]}`;
  }

  if (/^HANDIKAP/.test(m[0])) {
    return `HANDIKAP ${m[1]}`;
  }

  if (/^MAIDEN/.test(m[0])) {
    return 'MAIDEN';
  }

  if (/^G/.test(m[0])) {
    return `G ${m[1]}`;
  }

  if (/^A/.test(m[0])) {
    return `A ${m[1]}`;
  }

  if (/^SATIŞ/.test(m[0])) {
    return `SATIŞ ${m[1]}`;
  }

  return t;
}

function raceClassFromCells(cells) {
  for (const cell of cells) {
    const t = clean(cell);

    if (!t) continue;

    if (
      /(Handikap|Handikap|Şartlı|Maiden|KV-|Kısa Vade|\bG\s*[1-3]\b|\bA\s*[1-3]\b|Satış)/i.test(
        t
      )
    ) {
      return clean(t);
    }
  }

  return '';
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

function findHeader(headers, re) {
  return headers.findIndex(
    x => re.test(clean(x))
  );
}

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

    if (
      dateIx < 0 ||
      finishIx < 0
    ) {
      return;
    }

    $(table)
      .find('tbody tr')
      .each((_, tr) => {
        const cells = $(tr)
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
          !Number.isFinite(
            finish
          ) ||
          finish < 1 ||
          finish > 99
        ) {
          return;
        }

        const distanceRaw =
          distanceIx >= 0
            ? clean(
                cells[
                  distanceIx
                ] || ''
              )
            : '';

        const dm =
          distanceRaw.match(
            /\d{3,4}/
          );

        const trackRaw =
          trackIx >= 0
            ? clean(
                cells[
                  trackIx
                ] || ''
              )
            : '';

        const classRaw =
          raceClassFromCells(
            cells
          );

        results.push({
          date:
            pd.display,

          isoDate:
            pd.iso,

          city:
            cityIx >= 0
              ? clean(
                  cells[
                    cityIx
                  ] || ''
                )
              : '',

          finish,

          distance:
            dm
              ? `${dm[0]}m`
              : distanceRaw,

          track:
            normalizeTrack(
              trackRaw
            ),

          class:
            classRaw,

          ageGroup: ''
        });
      });
  });

  return results;
}

async function fetchHtml(url) {
  const r =
    await fetch(
      url,
      {
        headers: HEADERS,
        redirect: 'follow'
      }
    );

  if (!r.ok) {
    throw new Error(
      `TJK HTTP ${r.status}`
    );
  }

  return await r.text();
}

function parseAnnualProgram(
  html
) {
  const $ =
    cheerio.load(html);

  const rows = [];

  $('table tbody tr').each(
    (_, tr) => {
      const c = $(tr)
        .find('td')
        .map(
          (__, td) =>
            clean($(td).text())
        )
        .get();

      if (c.length < 6) {
        return;
      }

      const pd =
        parseDate(c[0]);

      if (!pd) return;

      const city =
        clean(c[1]);

      const group =
        clean(c[2]);

      const raceClass =
        clean(c[3]);

      const distance =
        clean(c[4])
          .match(/\d{3,4}/)?.[0] ||
        '';

      const track =
        normalizeTrack(
          c[5]
        );

      if (
        !city ||
        !group ||
        !distance
      ) {
        return;
      }

      rows.push({
        date:
          pd.display,

        isoDate:
          pd.iso,

        city,

        ageGroup:
          group,

        class:
          raceClass,

        classKey:
          normalizeClass(
            raceClass
          ),

        distance:
          `${distance}m`,

        track
      });
    }
  );

  return rows;
}

function sameText(
  a,
  b
) {
  return (
    upper(a) ===
    upper(b)
  );
}

function scoreAnnualMatch(
  career,
  annual
) {
  let score = 0;

  if (
    career.isoDate ===
    annual.isoDate
  ) {
    score += 100;
  } else {
    return -1;
  }

  if (
    sameText(
      career.city,
      annual.city
    )
  ) {
    score += 40;
  } else {
    return -1;
  }

  if (
    sameText(
      career.distance,
      annual.distance
    )
  ) {
    score += 30;
  }

  if (
    sameText(
      career.track,
      annual.track
    )
  ) {
    score += 30;
  }

  const cClass =
    normalizeClass(
      career.class
    );

  const aClass =
    annual.classKey;

  if (
    cClass &&
    aClass &&
    cClass === aClass
  ) {
    score += 60;
  }

  return score;
}

function enrichWithAgeGroup(
  careerRows,
  annualRows
) {
  return careerRows.map(
    row => {
      let best = null;
      let bestScore = -1;

      for (
        const annual
        of annualRows
      ) {
        const score =
          scoreAnnualMatch(
            row,
            annual
          );

        if (
          score >
          bestScore
        ) {
          bestScore =
            score;
          best =
            annual;
        }
      }

      /*
        Yaş grubu için güvenlik:
        Tarih + şehir mutlaka aynı,
        ayrıca mesafe/pist/sınıf
        eşleşmesinden yeterli puan
        alınmış olmalı.
      */
      if (
        best &&
        bestScore >= 170
      ) {
        return {
          ...row,

          ageGroup:
            best.ageGroup,

          ageGroupSource:
            'TJK_YILLIK_PROGRAM',

          ageGroupMatchScore:
            bestScore
        };
      }

      return {
        ...row,

        ageGroup: '',

        ageGroupSource:
          'BULUNAMADI',

        ageGroupMatchScore:
          bestScore
      };
    }
  );
}

async function loadAnnualProgram() {
  /*
    TJK Yıllık Yarış Programı.
    Bu tabloda doğrudan:
    Tarih | Şehir | Grup | Koşu Cinsi |
    Mesafe | Pist
    alanları bulunuyor.
  */

  const urls = [
    `${TJK}/TR/YarisSever/Query/Page/YillikYarisProgrami`,
    `${TJK}/TR/YarisSever/Query/Data/YillikYarisProgramiCoklu`
  ];

  const all = [];

  for (
    const url
    of urls
  ) {
    try {
      const html =
        await fetchHtml(
          url
        );

      const parsed =
        parseAnnualProgram(
          html
        );

      all.push(
        ...parsed
      );
    } catch (e) {
      console.error(
        'YILLIK PROGRAM',
        url,
        e.message
      );
    }
  }

  /*
    Aynı satır iki endpointten
    geldiyse tekilleştir.
  */
  const map =
    new Map();

  for (
    const r
    of all
  ) {
    const key = [
      r.isoDate,
      upper(r.city),
      upper(r.ageGroup),
      r.classKey,
      upper(r.distance),
      upper(r.track)
    ].join('|');

    if (
      !map.has(key)
    ) {
      map.set(
        key,
        r
      );
    }
  }

  return [
    ...map.values()
  ];
}

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

    const [
      careerHtml,
      annualRows
    ] =
      await Promise.all([
        fetchHtml(
          careerUrl
        ),
        loadAnnualProgram()
      ]);

    const $ =
      cheerio.load(
        careerHtml
      );

    const allRows =
      parseCareerRows($);

    /*
      ANA KURAL:
      sadece ilk 5.
    */
    let top5 =
      allRows.filter(
        r =>
          r.finish >= 1 &&
          r.finish <= 5
      );

    /*
      Geçmiş tarihsel at:
      o yarış tarihinden
      SONRASI ve O GÜN
      kullanılmaz.
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
      TJK Grup bilgisini ekle.
    */
    top5 =
      enrichWithAgeGroup(
        top5,
        annualRows
      );

    /*
      Yol haritası:
      eskiden yeniye.
    */
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

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res
      .status(200)
      .json({
        ok: true,

        version:
          'CAREER-ROADMAP-V4',

        horseId,

        before:
          before ||
          null,

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

        ageGroupRule:
          'TJK_GRUP_ALANI',

        totalCareerRowsRead:
          allRows.length,

        top5Count:
          top5.length,

        ageGroupFilled,

        ageGroupMissing:
          top5.length -
          ageGroupFilled,

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
