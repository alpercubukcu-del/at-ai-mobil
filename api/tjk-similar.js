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

  if (t.includes('SENTETİK')) {
    return 'Sentetik';
  }

  if (t.includes('ÇİM')) {
    return 'Çim';
  }

  if (t.includes('KUM')) {
    return 'Kum';
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

async function fetchHtml(url) {
  const response =
    await fetch(
      url,
      {
        method: 'GET',
        headers: HEADERS,
        redirect: 'follow'
      }
    );

  if (!response.ok) {
    throw new Error(
      `TJK GET HTTP ${response.status}`
    );
  }

  return await response.text();
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
      `TJK POST HTTP ${response.status}`
    );
  }

  return await response.text();
}

/* =========================================================
   TJK SELECT OPTION ÇÖZÜMÜ
========================================================= */

function normalizeOptionText(v = '') {
  return upper(v)
    .replace(/İNGILIZ/g, 'İNGİLİZ')
    .replace(/HANDIKAP/g, 'HANDİKAP')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSelectOptions(
  $,
  selector
) {
  const list = [];

  $(selector)
    .find('option')
    .each((_, option) => {
      list.push({
        value:
          clean(
            $(option).attr('value') || ''
          ),

        text:
          clean(
            $(option).text()
          )
      });
    });

  return list;
}

function findExactOption(
  options,
  wantedText
) {
  const wanted =
    normalizeOptionText(
      wantedText
    );

  return (
    options.find(
      x =>
        normalizeOptionText(
          x.text
        ) === wanted
    ) || null
  );
}

function findClassOption(
  options,
  targetClass
) {
  const wanted =
    baseClass(
      targetClass
    );

  if (!wanted) {
    return null;
  }

  /*
    Örn:
    Handikap 16 /H3
    -> Handikap 16
  */

  const exact =
    options.find(
      x =>
        baseClass(
          x.text
        ) === wanted
    );

  if (exact) {
    return exact;
  }

  return null;
}

function findTrackOption(
  options,
  targetTrack
) {
  const wanted =
    normalizeTrack(
      targetTrack
    );

  return (
    options.find(
      x =>
        normalizeTrack(
          x.text
        ) === wanted
    ) || null
  );
}

function findAgeGroupOption(
  options,
  targetAgeGroup
) {
  const wanted =
    normalizeAgeGroup(
      targetAgeGroup
    );

  return (
    options.find(
      x =>
        normalizeAgeGroup(
          x.text
        ) === wanted
    ) || null
  );
}

function findCityOption(
  options,
  city
) {
  if (!clean(city)) {
    return null;
  }

  const wanted =
    upper(city);

  return (
    options.find(
      x =>
        upper(x.text) ===
        wanted
    ) || null
  );
}

function findDistanceOption(
  options,
  distance
) {
  const wanted =
    String(
      Number(distance)
    );

  return (
    options.find(
      x =>
        clean(x.text) ===
        wanted
    ) || null
  );
}

async function resolveTjkFilters(
  target
) {
  const html =
    await fetchHtml(
      PAGE_URL
    );

  const $ =
    cheerio.load(html);

  const cityOptions =
    getSelectOptions(
      $,
      '#QueryParameter_SehirId'
    );

  const ageOptions =
    getSelectOptions(
      $,
      '#QueryParameter_GrupId'
    );

  const classOptions =
    getSelectOptions(
      $,
      '#QueryParameter_KosuCinsiId'
    );

  const trackOptions =
    getSelectOptions(
      $,
      '#QueryParameter_PistId'
    );

  const distanceOptions =
    getSelectOptions(
      $,
      '#QueryParameter_Mesafe'
    );

  const city =
    findCityOption(
      cityOptions,
      target.city
    );

  const ageGroup =
    findAgeGroupOption(
      ageOptions,
      target.ageGroup
    );

  const raceClass =
    findClassOption(
      classOptions,
      target.class
    );

  const track =
    findTrackOption(
      trackOptions,
      target.track
    );

  const distance =
    findDistanceOption(
      distanceOptions,
      target.distance
    );

  return {
    city,
    ageGroup,
    raceClass,
    track,
    distance,

    counts: {
      cityOptions:
        cityOptions.length,

      ageOptions:
        ageOptions.length,

      classOptions:
        classOptions.length,

      trackOptions:
        trackOptions.length,

      distanceOptions:
        distanceOptions.length
    }
  };
}

/* =========================================================
   TABLO PARSER
========================================================= */

function getHeaders($, table) {
  const headers = [];

  $(table)
    .find('thead th')
    .each((_, th) => {
      headers.push(
        clean(
          $(th).text()
        )
      );
    });

  if (!headers.length) {
    $(table)
      .find('tr')
      .first()
      .find('th,td')
      .each((_, el) => {
        headers.push(
          clean(
            $(el).text()
          )
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
  let rows =
    parseQueryTable(
      html
    );

  if (
    rows.length
  ) {
    return rows;
  }

  /*
    DataRows sadece <tr> döndürürse,
    doğru sütun yapısıyla sarıyoruz.
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

  return parseQueryTable(
    wrapped
  );
}

/* =========================================================
   BENZERLİK
========================================================= */

function similarityScore(
  target,
  past
) {
  /*
    Look-ahead kesinlikle yok.
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
      Number(
        target.distance
      ) -
      Number(
        past.distance
      )
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
   İLK FİLTRELİ TJK POST
========================================================= */

async function fetchFirstPage(
  target,
  filters
) {
  /*
    Şehir filtresini bilinçli olarak
    UYGULAMIYORUZ.

    Çünkü tarihsel benzer yarışın
    başka hipodromda olması da değerlidir.

    Aynı şehir yalnız bonus puan.
  */

  const form = {
    QueryParameter_Tarih_Start:
      '',

    QueryParameter_Tarih_End:
      isoToDisplay(
        target.date
      ),

    QueryParameter_SehirId:
      '',

    QueryParameter_IrkId:
      '',

    QueryParameter_GrupId:
      filters.ageGroup?.value || '',

    QueryParameter_KosuCinsiId:
      filters.raceClass?.value || '',

    QueryParameter_Cinsiyet:
      '',

    QueryParameter_APRANTIKODU:
      '',

    /*
      Burada hedef mesafeyi doğrudan
      filtrelemiyoruz.

      Çünkü 1900 / 2000 / 2100 vb.
      ±300 metre benzerliği kaçırmak
      istemiyoruz.
    */
    QueryParameter_Mesafe:
      '',

    QueryParameter_PistId:
      filters.track?.value || '',

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
    rows,
    form
  };
}

/* =========================================================
   DAHA FAZLA SONUÇ
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
    rows,
    form
  };
}

/* =========================================================
   TARAMA
========================================================= */

async function scanHistorical({
  target,
  filters,
  limit,
  maxPages
}) {
  const seen =
    new Set();

  const allRows = [];
  const matches = [];
  const diagnostics = [];

  const first =
    await fetchFirstPage(
      target,
      filters
    );

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
        Hedef tarih dahil değil.
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

  const firstResult =
    addRows(
      first.rows
    );

  diagnostics.push({
    page:
      1,

    endpoint:
      'Data/KosuSorgulama',

    rows:
      first.rows.length,

    newRows:
      firstResult.added,

    newMatches:
      firstResult.found,

    totalMatches:
      matches.length,

    status:
      first.rows.length
        ? 'TAMAM'
        : 'BOS'
  });

  if (
    !first.rows.length
  ) {
    return {
      rows:
        allRows,

      matches,

      diagnostics
    };
  }

  /*
    Sadece limit kadar değil;
    kıyaslama yapabilmek için daha
    fazla aday topluyoruz.
  */
  const wantedMatches =
    Math.max(
      limit * 3,
      20
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

  for (
    let page = 2;
    page <= maxPages;
    page++
  ) {
    const more =
      await fetchMorePage(
        page
      );

    if (
      !more.rows.length
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
        more.rows
      );

    diagnostics.push({
      page,

      endpoint:
        'DataRows/KosuSorgulama',

      rows:
        more.rows.length,

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

    /*
      Filtreli sorguda 25 sayfa
      çoğu yarış için fazlasıyla yeterli
      olmalı.

      İstersek testte maxPages=50
      verebiliriz.
    */
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

    /*
      TJK'nin güncel option ID'lerini
      sayfanın kendisinden çöz.
    */
    const filters =
      await resolveTjkFilters(
        target
      );

    /*
      Çekirdek filtrelerden biri
      bulunamadıysa sessizce filtresiz
      taramıyoruz.
    */
    if (
      !filters.ageGroup
    ) {
      throw new Error(
        `TJK Grup filtresi bulunamadı: ${target.ageGroup}`
      );
    }

    if (
      !filters.raceClass
    ) {
      throw new Error(
        `TJK Koşu Cinsi filtresi bulunamadı: ${target.class}`
      );
    }

    if (
      !filters.track
    ) {
      throw new Error(
        `TJK Pist filtresi bulunamadı: ${target.track}`
      );
    }

    const scan =
      await scanHistorical({
        target,
        filters,
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
          'TJK-SIMILAR-V5',

        target,

        /*
          Hangi gerçek TJK ID'lerinin
          kullanıldığını görebilelim.
        */
        resolvedFilters: {

          city:
            filters.city
              ? {
                  text:
                    filters.city.text,

                  value:
                    filters.city.value
                }
              : null,

          ageGroup: {
            text:
              filters.ageGroup.text,

            value:
              filters.ageGroup.value
          },

          raceClass: {
            text:
              filters.raceClass.text,

            value:
              filters.raceClass.value
          },

          track: {
            text:
              filters.track.text,

            value:
              filters.track.value
          },

          distance:
            filters.distance
              ? {
                  text:
                    filters.distance.text,

                  value:
                    filters.distance.value
                }
              : null
        },

        filterPolicy: {
          ageGroup:
            'TJK_SERVER_FILTER',

          raceClass:
            'TJK_SERVER_FILTER',

          track:
            'TJK_SERVER_FILTER',

          distance:
            'LOCAL_PLUS_MINUS_300',

          city:
            'LOCAL_BONUS_ONLY'
        },

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
          'TJK_REAL_FILTERED_POST_PAGING'
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
          'TJK-SIMILAR-V5',

        error:
          e?.message ||
          'Tarihsel benzer yarışlar oluşturulamadı.'
      });
  }
    }
