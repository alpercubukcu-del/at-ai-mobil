import * as cheerio from 'cheerio';

const TJK = 'https://www.tjk.org';

const PAGE_URL =
  `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;

const DATA_URL =
  `${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;

const ROWS_URL =
  `${TJK}/TR/YarisSever/Query/DataRows/KosuSorgulama`;

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':
    'tr-TR,tr;q=0.9,en;q=0.7',
  referer:
    PAGE_URL
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
    display: `${m[1]}.${m[2]}.${m[3]}`,
    iso: `${m[3]}-${m[2]}-${m[1]}`
  };
}

function isoToDisplay(iso = '') {
  const m = String(iso).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!m) return '';

  return `${m[3]}.${m[2]}.${m[1]}`;
}

function normalizeTrack(v = '') {
  const t = upper(v);

  if (t.includes('ÇİM')) return 'Çim';
  if (t.includes('KUM')) return 'Kum';
  if (t.includes('SENTETİK')) return 'Sentetik';

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

  m =
    t.match(
      /\bKV[-\s]*(\d+)\b/
    );

  if (m) {
    return `KV-${m[1]}`;
  }

  if (
    /\bG\s*1\b|\bG1\b/.test(t)
  ) {
    return 'G1';
  }

  if (
    /\bG\s*2\b|\bG2\b/.test(t)
  ) {
    return 'G2';
  }

  if (
    /\bG\s*3\b|\bG3\b/.test(t)
  ) {
    return 'G3';
  }

  if (
    /\bA\s*2\b|\bA2\b/.test(t)
  ) {
    return 'A2';
  }

  if (
    /\bA\s*3\b|\bA3\b/.test(t)
  ) {
    return 'A3';
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
    const sm =
      t.match(
        /SATIŞ\s*(\d+)|SATIS\s*(\d+)/
      );

    if (sm) {
      return `SATIŞ ${sm[1] || sm[2]}`;
    }

    return 'SATIŞ';
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

function rowKey(r) {
  return [
    r.isoDate,
    upper(r.city),
    r.raceNo,
    upper(r.class),
    upper(r.ageGroup),
    r.distance,
    upper(r.track)
  ].join('|');
}

async function postForm(
  url,
  data
) {
  const body =
    new URLSearchParams();

  for (
    const [key, value] of
    Object.entries(data)
  ) {
    if (
      value === undefined ||
      value === null
    ) {
      continue;
    }

    body.set(
      key,
      String(value)
    );
  }

  const response =
    await fetch(
      url,
      {
        method: 'POST',

        headers: {
          ...HEADERS,

          'content-type':
            'application/x-www-form-urlencoded; charset=UTF-8',

          'x-requested-with':
            'XMLHttpRequest'
        },

        body:
          body.toString(),

        redirect:
          'follow'
      }
    );

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

function findHeader(
  headers,
  re
) {
  return headers.findIndex(
    x =>
      re.test(
        clean(x)
      )
  );
}

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

function parseRowsFragment(html) {
  /*
    DataRows endpointi bazen sadece
    <tr> parçaları döndürebilir.

    Bu nedenle sanal tablo sarıyoruz.
  */

  const wrapped =
    `<table>
      <thead>
        <tr>
          <th>Tarih</th>
          <th>Şehir</th>
          <th>Koşu</th>
          <th>Grup</th>
          <th>Koşu Cinsi</th>
          <th>Mesafe</th>
          <th>Pist</th>
        </tr>
      </thead>
      <tbody>
        ${html}
      </tbody>
    </table>`;

  let rows =
    parseQueryTable(
      html
    );

  if (
    rows.length
  ) {
    return rows;
  }

  rows =
    parseQueryTable(
      wrapped
    );

  return rows;
}

function similarityScore(
  target,
  past
) {
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

  const targetClass =
    baseClass(
      target.class
    );

  const pastClass =
    baseClass(
      past.class
    );

  if (
    !targetClass ||
    !pastClass ||
    targetClass !==
      pastClass
  ) {
    return null;
  }

  detail.class = 35;
  score += 35;

  if (
    normalizeAgeGroup(
      target.ageGroup
    ) !==
    normalizeAgeGroup(
      past.ageGroup
    )
  ) {
    return null;
  }

  detail.ageGroup = 25;
  score += 25;

  if (
    normalizeTrack(
      target.track
    ) !==
    normalizeTrack(
      past.track
    )
  ) {
    return null;
  }

  detail.track = 20;
  score += 20;

  const diff =
    Math.abs(
      Number(target.distance) -
      Number(past.distance)
    );

  if (
    diff === 0
  ) {
    detail.distance = 15;
  } else if (
    diff <= 100
  ) {
    detail.distance = 12;
  } else if (
    diff <= 200
  ) {
    detail.distance = 8;
  } else if (
    diff <= 300
  ) {
    detail.distance = 4;
  } else {
    return null;
  }

  score +=
    detail.distance;

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
    detail,
    distanceDiff:
      diff
  };
}

/* =========================================================
   GERÇEK TJK İLK SORGU
========================================================= */

async function fetchFirstPage(
  targetDate
) {
  const form = {
    QueryParameter_Tarih_Start:
      '',

    QueryParameter_Tarih_End:
      isoToDisplay(
        targetDate
      ),

    QueryParameter_SehirId:
      '',

    QueryParameter_IrkId:
      '',

    QueryParameter_GrupId:
      '',

    QueryParameter_KosuCinsiId:
      '',

    QueryParameter_Cinsiyet:
      '',

    QueryParameter_APRANTIKODU:
      '',

    QueryParameter_Mesafe:
      '',

    QueryParameter_PistId:
      '',

    QueryParameter_BabaAdi:
      '',

    QueryParameter_AnneAdi:
      '',

    Era:
      'past',

    Sort:
      'Tarih desc, Sehir asc, KosuSirasi asc'
  };

  const html =
    await postForm(
      DATA_URL,
      form
    );

  const rows =
    parseQueryTable(
      html
    );

  return {
    html,
    rows,
    form
  };
}

/* =========================================================
   GERÇEK TJK DAHA FAZLA
========================================================= */

async function fetchMorePage(
  pageNumber
) {
  const form = {
    PageNumber:
      pageNumber,

    Sort:
      'Tarih desc, Sehir asc, KosuSirasi asc'
  };

  const html =
    await postForm(
      ROWS_URL,
      form
    );

  const rows =
    parseRowsFragment(
      html
    );

  return {
    html,
    rows,
    form
  };
}

/* =========================================================
   TARAMA
========================================================= */

async function scanHistorical({
  target,
  limit,
  maxPages
}) {
  const seen =
    new Set();

  const allRows = [];
  const matches = [];
  const diagnostics = [];

  /*
    Bugünün yarışını dışarıda bırakmak
    için End = hedef tarih.

    Son filtreyi ayrıca
    isoDate < target.date ile yapıyoruz.
  */
  const first =
    await fetchFirstPage(
      target.date
    );

  let firstRows =
    first.rows;

  diagnostics.push({
    page:
      1,

    endpoint:
      'Data/KosuSorgulama',

    rows:
      firstRows.length,

    status:
      firstRows.length
        ? 'TAMAM'
        : 'BOS'
  });

  if (
    !firstRows.length
  ) {
    return {
      rows:
        [],

      matches:
        [],

      diagnostics
    };
  }

  function addRows(rows) {
    let added = 0;
    let found = 0;

    for (
      const row of
      rows
    ) {
      const key =
        rowKey(row);

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      /*
        Hedef tarihin kendisi veya
        gelecek kesinlikle alınmaz.
      */
      if (
        row.isoDate >=
        target.date
      ) {
        continue;
      }

      allRows.push(row);
      added++;

      const sim =
        similarityScore(
          target,
          row
        );

      if (!sim) {
        continue;
      }

      matches.push({
        date:
          row.isoDate,

        dateDisplay:
          row.date,

        city:
          row.city,

        raceNo:
          row.raceNo,

        class:
          row.class,

        ageGroup:
          row.ageGroup,

        distance:
          row.distance,

        track:
          row.track,

        similarity:
          sim.score,

        distanceDiff:
          sim.distanceDiff,

        similarityDetail:
          sim.detail
      });

      found++;
    }

    return {
      added,
      found
    };
  }

  const firstAdd =
    addRows(
      firstRows
    );

  diagnostics[
    diagnostics.length - 1
  ].newRows =
    firstAdd.added;

  diagnostics[
    diagnostics.length - 1
  ].newMatches =
    firstAdd.found;

  /*
    Kullanıcı sadece 10 benzer
    istese de sıralama kalitesi için
    biraz fazla topluyoruz.
  */
  const wantedMatches =
    Math.max(
      limit * 3,
      15
    );

  if (
    matches.length >=
    wantedMatches
  ) {
    return {
      rows:
        allRows,

      matches,

      diagnostics
    };
  }

  /*
    pagerForm HTML'de
    PageNumber=1 geliyor.

    "Daha Fazla Sonuç Göster"
    sonrasında 2,3,4...
    ilerliyoruz.
  */
  for (
    let page = 2;
    page <= maxPages;
    page++
  ) {
    const more =
      await fetchMorePage(
        page
      );

    const rows =
      more.rows;

    if (
      !rows.length
    ) {
      diagnostics.push({
        page,

        endpoint:
          'DataRows/KosuSorgulama',

        rows:
          0,

        status:
          'BOS'
      });

      break;
    }

    const before =
      allRows.length;

    const result =
      addRows(
        rows
      );

    diagnostics.push({
      page,

      endpoint:
        'DataRows/KosuSorgulama',

      rows:
        rows.length,

      newRows:
        result.added,

      newMatches:
        result.found,

      totalRows:
        allRows.length,

      totalMatches:
        matches.length,

      status:
        result.added > 0
          ? 'TAMAM'
          : 'TEKRAR'
    });

    /*
      Aynı sayfa geri dönüyorsa
      sonsuz döngüyü kes.
    */
    if (
      allRows.length ===
      before
    ) {
      break;
    }

    if (
      matches.length >=
      wantedMatches
    ) {
      break;
    }
  }

  return {
    rows:
      allRows,

    matches,

    diagnostics
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

    const maxPages =
      Math.min(
        Math.max(
          Number(
            req.query.maxPages ||
            25
          ),
          1
        ),
        80
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

    const scan =
      await scanHistorical({
        target,
        limit,
        maxPages
      });

    scan.matches.sort(
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

    const matches =
      scan.matches.slice(
        0,
        limit
      );

    const dates =
      scan.rows
        .map(
          x =>
            x.isoDate
        )
        .filter(Boolean)
        .sort();

    const oldestDate =
      dates.length
        ? dates[0]
        : null;

    const newestDate =
      dates.length
        ? dates[
            dates.length - 1
          ]
        : null;

    res.setHeader(
      'Cache-Control',
      's-maxage=900, stale-while-revalidate=3600'
    );

    return res
      .status(200)
      .json({

        ok: true,

        version:
          'TJK-SIMILAR-V4',

        target,

        sort:
          'Tarih desc, Sehir asc, KosuSirasi asc',

        firstEndpoint:
          '/Query/Data/KosuSorgulama',

        pagingEndpoint:
          '/Query/DataRows/KosuSorgulama',

        pagesRead:
          scan.diagnostics
            .filter(
              x =>
                x.status ===
                'TAMAM'
            )
            .length,

        scanned:
          scan.rows.length,

        oldestDate,

        newestDate,

        matchCount:
          scan.matches.length,

        returned:
          matches.length,

        diagnostics:
          scan.diagnostics,

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

          core: [
            'class',
            'ageGroup',
            'track'
          ],

          maxDistanceDifference:
            300
        },

        matches,

        source:
          'TJK_REAL_POST_PAGING'
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

        version:
          'TJK-SIMILAR-V4',

        error:
          e?.message ||
          'Tarihsel benzer yarışlar oluşturulamadı.'
      });
  }
                  }
