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
    'https://www.tjk.org/TR/YarisSever/Query/Page/KosuSorgulama'
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

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseDisplayDate(value = '') {
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

function addDays(iso, amount) {
  const m = String(iso).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!m) return '';

  const d = new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3])
    )
  );

  d.setUTCDate(
    d.getUTCDate() + amount
  );

  return [
    d.getUTCFullYear(),
    pad2(d.getUTCMonth() + 1),
    pad2(d.getUTCDate())
  ].join('-');
}

function normalizeTrack(v = '') {
  const t = upper(v);

  if (t.includes('ÇİM')) {
    return 'Çim';
  }

  if (t.includes('KUM')) {
    return 'Kum';
  }

  if (t.includes('SENTETİK')) {
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
    /*
      Maiden/Satış ile Maiden
      şimdilik aynı temel sınıf.
    */
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

/* =========================================================
   TJK TABLOSU
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
              parseDisplayDate(
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

  /*
    Kullanıcının TJK'de yaptığı
    "Tarih" sıralamasını bizim tarafta
    kesin olarak uyguluyoruz.

    YENİ -> ESKİ
  */
  rows.sort(
    (a, b) => {
      if (
        a.isoDate !==
        b.isoDate
      ) {
        return (
          b.isoDate.localeCompare(
            a.isoDate
          )
        );
      }

      if (
        upper(a.city) !==
        upper(b.city)
      ) {
        return upper(a.city)
          .localeCompare(
            upper(b.city),
            'tr'
          );
      }

      return (
        a.raceNo -
        b.raceNo
      );
    }
  );

  return rows;
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

/* =========================================================
   BENZERLİK
========================================================= */

function similarityScore(
  target,
  past
) {
  /*
    Gelecek bilgisi yok.
  */
  if (
    !past.isoDate ||
    past.isoDate >=
      target.date
  ) {
    return null;
  }

  const detail = {
    class: 0,
    ageGroup: 0,
    track: 0,
    distance: 0,
    city: 0
  };

  let score = 0;

  /*
    1. SINIF
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
    !targetClass ||
    !pastClass ||
    targetClass !==
      pastClass
  ) {
    return null;
  }

  detail.class = 35;
  score += 35;

  /*
    2. YAŞ GRUBU
  */
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

  /*
    3. PİST
  */
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

  /*
    4. MESAFE
  */
  const diff =
    Math.abs(
      Number(
        target.distance
      ) -
      Number(
        past.distance
      )
    );

  if (diff === 0) {
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

  /*
    5. AYNI HİPODROM
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
    detail,
    distanceDiff:
      diff
  };
}

/* =========================================================
   TJK 50'LİK BLOK

   ÖNEMLİ:
   Sayfa numarası tahmin etmiyoruz.

   Her seferinde:
   - bitiş tarihini belirliyoruz
   - TJK'nin ilk 50 sonucunu alıyoruz
   - en eski tarihin 1 gün öncesine
     geçiyoruz

   Böylece "Daha Fazla Sonuç Göster"
   davranışını tarih imleciyle taklit
   ediyoruz.
========================================================= */

async function fetchBlock(
  endDateIso
) {
  const displayEnd =
    isoToDisplay(
      endDateIso
    );

  /*
    Page yerine doğrudan Data
    endpointini kullanıyoruz.
  */
  const url =
    `${TJK}/TR/YarisSever/Query/Data/KosuSorgulama` +
    `?1=1` +
    `&QueryParameter_TarihBitis=${encodeURIComponent(
      displayEnd
    )}`;

  const html =
    await fetchHtml(
      url
    );

  const rows =
    parseQueryTable(
      html
    );

  return {
    url,
    rows
  };
}

/* =========================================================
   GERİYE DOĞRU TARAMA
========================================================= */

async function scanHistorical({
  targetDate,
  maxBlocks,
  wantedMatches,
  target
}) {
  const allRows = [];
  const matches = [];

  const seenRows =
    new Set();

  const diagnostics =
    [];

  /*
    Bugünkü yarış kesinlikle
    tarihsele girmeyecek.

    İlk blok:
    hedef tarihin 1 gün öncesi.
  */
  let cursor =
    addDays(
      targetDate,
      -1
    );

  let previousOldest = '';

  for (
    let blockNo = 1;
    blockNo <= maxBlocks;
    blockNo++
  ) {
    const block =
      await fetchBlock(
        cursor
      );

    const rows =
      block.rows;

    if (!rows.length) {
      diagnostics.push({
        block:
          blockNo,
        requestedEnd:
          cursor,
        rows:
          0,
        status:
          'BOS'
      });

      break;
    }

    /*
      TJK tarih filtresinin gerçekten
      uygulandığını kontrol ediyoruz.

      Eğer dönen en yeni tarih bizim
      istediğimiz bitiş tarihinden sonra
      ise QueryParameter_TarihBitis
      dikkate alınmıyor demektir.

      Yanlış veriyle devam ETMİYORUZ.
    */
    const newest =
      rows[0]?.isoDate || '';

    const oldest =
      rows[
        rows.length - 1
      ]?.isoDate || '';

    if (
      newest &&
      newest > cursor
    ) {
      throw new Error(
        `TJK tarih filtresi uygulanmadı. ` +
        `İstenen bitiş=${cursor}, ` +
        `dönen en yeni=${newest}.`
      );
    }

    /*
      Aynı tarih bloğu tekrar geldiyse
      sonsuz döngüyü kes.
    */
    if (
      previousOldest &&
      oldest ===
        previousOldest
    ) {
      diagnostics.push({
        block:
          blockNo,
        requestedEnd:
          cursor,
        newest,
        oldest,
        rows:
          rows.length,
        status:
          'TEKRAR'
      });

      break;
    }

    let newRows = 0;
    let newMatches = 0;

    for (
      const row of
      rows
    ) {
      const key =
        rowKey(row);

      if (
        seenRows.has(key)
      ) {
        continue;
      }

      seenRows.add(key);
      allRows.push(row);
      newRows++;

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

      newMatches++;
    }

    diagnostics.push({
      block:
        blockNo,

      requestedEnd:
        cursor,

      newest,

      oldest,

      rows:
        rows.length,

      newRows,

      newMatches,

      totalMatches:
        matches.length,

      status:
        'TAMAM'
    });

    previousOldest =
      oldest;

    /*
      Yeterli sayıda tarihsel
      benzer bulduysak gereksiz yere
      TJK'yi taramıyoruz.
    */
    if (
      matches.length >=
      wantedMatches
    ) {
      break;
    }

    /*
      Son 50'lik bloğun en eski
      tarihinin bir gün öncesine geç.
    */
    if (!oldest) {
      break;
    }

    const nextCursor =
      addDays(
        oldest,
        -1
      );

    if (
      !nextCursor ||
      nextCursor >= cursor
    ) {
      break;
    }

    cursor =
      nextCursor;
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
        20
      );

    /*
      En fazla kaç adet 50'lik blok
      taranacak?

      20 blok = en fazla yaklaşık
      1000 geçmiş yarış satırı.
    */
    const maxBlocks =
      Math.min(
        Math.max(
          Number(
            req.query.maxBlocks ||
            20
          ),
          1
        ),
        40
      );

    /*
      Sıralama yapabilmek için
      limitten biraz fazla benzer
      toplamaya çalışıyoruz.
    */
    const wantedMatches =
      Math.min(
        Math.max(
          limit * 3,
          10
        ),
        50
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
        targetDate:
          date,

        maxBlocks,

        wantedMatches,

        target
      });

    /*
      En yüksek benzerlik önce.

      Aynı puanda:
      bugüne en yakın geçmiş tarih önce.
    */
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
          'TJK-SIMILAR-V3',

        target,

        /*
          TANI BİLGİLERİ
        */

        sortDirection:
          'DATE_DESC',

        blockSize:
          50,

        blocksRead:
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
          'TJK_QUERY_DATA_KOSUSORGULAMA',

        pagingStrategy:
          'DATE_CURSOR_50'
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
          'TJK-SIMILAR-V3',

        error:
          e?.message ||
          'Tarihsel benzer yarışlar oluşturulamadı.'
      });
  }
}
