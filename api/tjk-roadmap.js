const VERSION = 'TJK-ROADMAP-V1';

function clean(v = '') {
  return String(v)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberValue(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n)
    ? n
    : fallback;
}

function getOrigin(req) {
  const proto =
    clean(
      req.headers['x-forwarded-proto']
    ) || 'https';

  const host =
    clean(
      req.headers['x-forwarded-host']
    ) ||
    clean(
      req.headers.host
    );

  if (!host) {
    throw new Error(
      'Uygulama host bilgisi bulunamadı.'
    );
  }

  return `${proto}://${host}`;
}

async function fetchJson(
  url,
  timeoutMs = 20000
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {
    const response =
      await fetch(
        url,
        {
          headers: {
            accept:
              'application/json'
          },

          signal:
            controller.signal
        }
      );

    const text =
      await response.text();

    let data;

    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        `JSON alınamadı: ${url}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        `HTTP ${response.status}`
      );
    }

    if (
      data?.ok === false
    ) {
      throw new Error(
        data?.error ||
        'Alt API hata verdi.'
      );
    }

    return data;

  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   BASİT CONCURRENCY SINIRI

   TJK'ye aynı anda çok sayıda
   istek göndermemek için.
========================================================= */

async function mapLimit(
  items,
  limit,
  worker
) {
  const results =
    new Array(
      items.length
    );

  let index = 0;

  async function runner() {
    while (true) {
      const current =
        index++;

      if (
        current >=
        items.length
      ) {
        return;
      }

      try {
        results[current] =
          await worker(
            items[current],
            current
          );
      } catch (e) {
        results[current] = {
          ok: false,

          error:
            e?.message ||
            'İşlem başarısız.'
        };
      }
    }
  }

  const workers =
    Array.from(
      {
        length:
          Math.min(
            limit,
            items.length
          )
      },
      () => runner()
    );

  await Promise.all(
    workers
  );

  return results;
}

/* =========================================================
   BENZER YARIŞ
========================================================= */

async function getSimilarRaces({
  origin,
  date,
  city,
  raceClass,
  ageGroup,
  track,
  distance,
  limit
}) {
  const q =
    new URLSearchParams({
      date,
      city,
      class:
        raceClass,

      ageGroup,

      track,

      distance:
        String(distance),

      limit:
        String(limit)
    });

  return await fetchJson(
    `${origin}/api/tjk-similar?${q.toString()}`,
    30000
  );
}

/* =========================================================
   TARİHSEL YARIŞIN GERÇEK İLK 3'Ü
========================================================= */

async function getHistory({
  origin,
  date,
  city,
  raceNo
}) {
  const q =
    new URLSearchParams({
      date,
      city,

      raceNo:
        String(raceNo)
    });

  return await fetchJson(
    `${origin}/api/tjk-history?${q.toString()}`,
    20000
  );
}

/* =========================================================
   ATIN DONMUŞ KARİYERİ

   before parametresi KRİTİK.

   tjk-career:
   career_race_date < before
   finish <= 5

   kullanıyor.
========================================================= */

async function getFrozenCareer({
  origin,
  horseId,
  before
}) {
  const q =
    new URLSearchParams({
      horseId:
        String(horseId),

      before:
        String(before)
    });

  return await fetchJson(
    `${origin}/api/tjk-career?${q.toString()}`,
    20000
  );
}

function normalizeCareer(
  career
) {
  /*
    V6 career API'de roadmap/top5
    alanlarından hangisi varsa
    tek bir diziye indiriyoruz.
  */

  let rows = [];

  if (
    Array.isArray(
      career?.roadmap
    )
  ) {
    rows =
      career.roadmap;
  } else if (
    Array.isArray(
      career?.top5
    )
  ) {
    rows =
      career.top5;
  } else if (
    Array.isArray(
      career?.races
    )
  ) {
    rows =
      career.races;
  }

  return rows.map(
    row => ({
      date:
        row.date ||
        row.isoDate ||
        '',

      city:
        row.city ||
        row.sehir ||
        '',

      finish:
        numberValue(
          row.finish ??
          row.rank ??
          row.position ??
          row.sira,
          0
        ),

      class:
        row.class ||
        row.raceClass ||
        row.kcins ||
        '',

      ageGroup:
        row.ageGroup ||
        row.group ||
        row.grup ||
        '',

      track:
        row.track ||
        row.pist ||
        '',

      distance:
        numberValue(
          row.distance ??
          row.mesafe,
          0
        )
    })
  );
}

/* =========================================================
   TARİHSEL İLK 3 AT İÇİN
   DONMUŞ KARİYER
========================================================= */

async function buildHistoricalHorse({
  origin,
  horse,
  historicalDate
}) {
  if (
    !horse?.horseId
  ) {
    return {
      ok: false,

      finish:
        horse?.finish || 0,

      horseId:
        null,

      horseName:
        horse?.horseName || '',

      error:
        'At ID bulunamadı.'
    };
  }

  const career =
    await getFrozenCareer({
      origin,

      horseId:
        horse.horseId,

      before:
        historicalDate
    });

  const roadmap =
    normalizeCareer(
      career
    );

  return {
    ok: true,

    finish:
      horse.finish,

    horseId:
      String(
        horse.horseId
      ),

    horseName:
      horse.horseName,

    programNo:
      horse.programNo ?? null,

    frozenBefore:
      historicalDate,

    /*
      Bu sayı yalnız tarihsel
      koşudan ÖNCEKİ ilk 5
      sonuçlarının sayısıdır.
    */
    top5BeforeCount:
      roadmap.length,

    roadmap
  };
}

/* =========================================================
   TEK BİR BENZER YARIŞIN
   TAM TARİHSEL PAKETİ
========================================================= */

async function buildHistoricalRace({
  origin,
  similar
}) {
  const history =
    await getHistory({
      origin,

      date:
        similar.date,

      city:
        similar.city,

      raceNo:
        similar.raceNo
    });

  const top3 =
    Array.isArray(
      history?.top3
    )
      ? history.top3
      : [];

  /*
    İlk 3 atın kariyerleri
    aynı anda fakat sınırlı
    concurrency ile çekilir.
  */

  const horses =
    await mapLimit(
      top3,
      3,

      horse =>
        buildHistoricalHorse({
          origin,
          horse,

          historicalDate:
            similar.date
        })
    );

  return {
    ok: true,

    date:
      similar.date,

    city:
      similar.city,

    raceNo:
      similar.raceNo,

    similarity:
      similar.similarity,

    similarityDetail:
      similar.similarityDetail ||
      null,

    classDetail:
      similar.classDetail ||
      null,

    cityDetail:
      similar.cityDetail ||
      null,

    /*
      Sonuç sayfasındaki gerçek
      yarış şartlarını esas al.
    */

    class:
      history.class ||
      similar.class,

    ageGroup:
      history.ageGroup ||
      similar.ageGroup,

    distance:
      history.distance ||
      similar.distance,

    track:
      history.track ||
      similar.track,

    conditionRaw:
      history.conditionRaw ||
      '',

    top3Count:
      top3.length,

    horseIdsComplete:
      history.horseIdsComplete ??
      false,

    horses
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
        req.query.date
      );

    const city =
      clean(
        req.query.city
      );

    const raceClass =
      clean(
        req.query.class
      );

    const ageGroup =
      clean(
        req.query.ageGroup
      );

    const track =
      clean(
        req.query.track
      );

    const distance =
      numberValue(
        req.query.distance,
        0
      );

    /*
      İlk testte 3 tarihsel
      yarış yeterli.

      Daha sonra 5-10'a
      çıkarabiliriz.
    */

    const similarLimit =
      Math.min(
        Math.max(
          numberValue(
            req.query.similarLimit,
            3
          ),
          1
        ),
        5
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

          version:
            VERSION,

          error:
            'date YYYY-MM-DD biçiminde gerekli.'
        });
    }

    if (!city) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'city gerekli.'
        });
    }

    if (!raceClass) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'class gerekli.'
        });
    }

    if (!ageGroup) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'ageGroup gerekli.'
        });
    }

    if (!track) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'track gerekli.'
        });
    }

    if (
      distance <= 0
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          version:
            VERSION,

          error:
            'distance gerekli.'
        });
    }

    const origin =
      getOrigin(req);

    /* =====================================================
       1. V6 BENZER YARIŞLARI BUL
    ===================================================== */

    const similarResponse =
      await getSimilarRaces({
        origin,
        date,
        city,
        raceClass,
        ageGroup,
        track,
        distance,

        /*
          Birkaç ekstra aday isteyelim.
          History endpointinde sorunlu
          yarış çıkarsa elimizde seçenek
          olsun.
        */
        limit:
          Math.min(
            similarLimit + 2,
            10
          )
      });

    const similarMatches =
      Array.isArray(
        similarResponse?.matches
      )
        ? similarResponse.matches
        : [];

    if (
      !similarMatches.length
    ) {
      return res
        .status(200)
        .json({
          ok: true,

          version:
            VERSION,

          target: {
            date,
            city,
            class:
              raceClass,

            ageGroup,
            track,
            distance
          },

          similarVersion:
            similarResponse?.version ||
            null,

          similarFound:
            0,

          historicalRaceCount:
            0,

          historicalRaces:
            [],

          message:
            'Tarihsel benzer yarış bulunamadı.'
        });
    }

    /* =====================================================
       2. EN İYİ BENZERLERİN
          GERÇEK SONUÇLARINI VE
          DONMUŞ KARİYERLERİNİ GETİR
    ===================================================== */

    const candidates =
      similarMatches.slice(
        0,
        similarLimit
      );

    const built =
      await mapLimit(
        candidates,
        2,

        similar =>
          buildHistoricalRace({
            origin,
            similar
          })
      );

    const historicalRaces =
      built.filter(
        x =>
          x &&
          x.ok !== false
      );

    const failed =
      built.filter(
        x =>
          x &&
          x.ok === false
      );

    /* =====================================================
       3. ÖZET
    ===================================================== */

    let historicalHorseCount =
      0;

    let frozenCareerRowCount =
      0;

    for (
      const race of
      historicalRaces
    ) {
      for (
        const horse of
        race.horses || []
      ) {
        if (
          horse?.ok
        ) {
          historicalHorseCount++;

          frozenCareerRowCount +=
            Array.isArray(
              horse.roadmap
            )
              ? horse.roadmap.length
              : 0;
        }
      }
    }

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

        target: {
          date,
          city,

          class:
            raceClass,

          ageGroup,
          track,
          distance
        },

        rules: {
          historicalRaceDate:
            'historical_date < target_date',

          historicalCareer:
            'career_race_date < historical_race_date',

          finishFilter:
            'finish <= 5',

          leakageProtection:
            true
        },

        similarVersion:
          similarResponse?.version ||
          null,

        similarFound:
          similarResponse?.matchCount ??
          similarMatches.length,

        similarUsed:
          candidates.length,

        historicalRaceCount:
          historicalRaces.length,

        historicalHorseCount,

        frozenCareerRowCount,

        failedCount:
          failed.length,

        historicalRaces,

        failures:
          failed,

        sourceChain: [
          'tjk-similar V6',
          'tjk-history V1',
          'tjk-career V6'
        ]
      });

  } catch (e) {

    console.error(
      'tjk-roadmap:',
      e
    );

    return res
      .status(500)
      .json({

        ok: false,

        version:
          VERSION,

        error:
          e?.name ===
          'AbortError'
            ? 'TJK isteği zaman aşımına uğradı.'
            : (
                e?.message ||
                'Tarihsel kariyer yol haritası oluşturulamadı.'
              )
      });
  }
      }
