const VERSION = 'TJK-ROADMAP-V2';

/* =========================================================
   TEMEL
========================================================= */

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

function nowMs() {
  return Date.now();
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

/* =========================================================
   KISA SÜRELİ JSON FETCH

   Her aşama ayrı zamanlanır.
========================================================= */

async function fetchJson(
  url,
  {
    timeoutMs = 8000,
    stage = 'UNKNOWN'
  } = {}
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  const started =
    nowMs();

  try {
    const response =
      await fetch(
        url,
        {
          method: 'GET',

          headers: {
            accept:
              'application/json',

            'cache-control':
              'no-cache'
          },

          signal:
            controller.signal
        }
      );

    const text =
      await response.text();

    let data = null;

    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        `${stage}: JSON alınamadı.`
      );
    }

    if (!response.ok) {
      throw new Error(
        `${stage}: ${
          data?.error ||
          `HTTP ${response.status}`
        }`
      );
    }

    if (
      data?.ok === false
    ) {
      throw new Error(
        `${stage}: ${
          data?.error ||
          'Alt API hata verdi.'
        }`
      );
    }

    return {
      ok: true,

      stage,

      durationMs:
        nowMs() - started,

      data
    };

  } catch (e) {

    const timeout =
      e?.name ===
      'AbortError';

    return {
      ok: false,

      stage,

      durationMs:
        nowMs() - started,

      timeout,

      error:
        timeout
          ? `${stage}: zaman aşımı`
          : (
              e?.message ||
              `${stage}: başarısız`
            )
    };

  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   CAREER NORMALIZE

   Yalnız TOP-5 kariyer yolunu kullan.
========================================================= */

function normalizeCareer(
  career
) {
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

  return rows
    .map(
      row => {

        const finish =
          numberValue(
            row.finish ??
            row.rank ??
            row.position ??
            row.sira,
            0
          );

        return {
          date:
            row.date ||
            row.isoDate ||
            '',

          city:
            row.city ||
            row.sehir ||
            '',

          finish,

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
        };
      }
    )

    /*
      Güvenlik:
      career API zaten <=5 filtreliyor.
      Burada tekrar doğruluyoruz.
    */
    .filter(
      row =>
        row.finish >= 1 &&
        row.finish <= 5
    );
}

/* =========================================================
   1. BENZER YARIŞLAR

   KRİTİK V2 FARKI:
   maxPages=1

   Çünkü Roadmap endpointinin işi
   yıllarca geçmişi taramak değil.

   Benzerlik motoru ilk sayfada
   en güncel ve en yüksek değerli
   adayları zaten döndürüyor.
========================================================= */

async function getSimilar({
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
        String(limit),

      /*
        Roadmap için yalnız
        ilk filtrelenmiş 50 yarış.
      */
      maxPages:
        '1'
    });

  return await fetchJson(
    `${origin}/api/tjk-similar?${q.toString()}`,
    {
      timeoutMs: 7000,
      stage: 'SIMILAR'
    }
  );
}

/* =========================================================
   2. GERÇEK YARIŞ SONUCU
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
    {
      timeoutMs: 6000,
      stage:
        `HISTORY_${date}_${city}_${raceNo}`
    }
  );
}

/* =========================================================
   3. DONMUŞ KARİYER

   KRİTİK:
   before = tarihsel yarış tarihi

   Böylece:
   career_date < historical_date
========================================================= */

async function getCareer({
  origin,
  horseId,
  horseName,
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
    {
      timeoutMs: 6000,

      stage:
        `CAREER_${horseName || horseId}`
    }
  );
}

/* =========================================================
   TEK TARİHSEL AT
========================================================= */

async function buildHorse({
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

  const response =
    await getCareer({
      origin,

      horseId:
        horse.horseId,

      horseName:
        horse.horseName,

      before:
        historicalDate
    });

  if (!response.ok) {
    return {
      ok: false,

      finish:
        horse.finish,

      horseId:
        String(
          horse.horseId
        ),

      horseName:
        horse.horseName,

      programNo:
        horse.programNo ??
        null,

      frozenBefore:
        historicalDate,

      timeout:
        response.timeout,

      durationMs:
        response.durationMs,

      error:
        response.error
    };
  }

  const roadmap =
    normalizeCareer(
      response.data
    );

  /*
    Son güvenlik kontrolü.

    ISO tarih geldiyse
    historicalDate >= olan
    satırları at.
  */

  const safeRoadmap =
    roadmap.filter(
      row => {
        if (
          !row.date ||
          !historicalDate
        ) {
          return true;
        }

        /*
          YYYY-MM-DD ise
          doğrudan karşılaştır.
        */
        if (
          /^\d{4}-\d{2}-\d{2}$/.test(
            row.date
          )
        ) {
          return (
            row.date <
            historicalDate
          );
        }

        return true;
      }
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
      horse.programNo ??
      null,

    frozenBefore:
      historicalDate,

    careerVersion:
      response.data?.version ||
      null,

    durationMs:
      response.durationMs,

    top5BeforeCount:
      safeRoadmap.length,

    roadmap:
      safeRoadmap
  };
}

/* =========================================================
   TEK TARİHSEL YARIŞ
========================================================= */

async function buildRace({
  origin,
  similar
}) {
  const raceStarted =
    nowMs();

  const historyResponse =
    await getHistory({
      origin,

      date:
        similar.date,

      city:
        similar.city,

      raceNo:
        similar.raceNo
    });

  if (
    !historyResponse.ok
  ) {
    return {
      ok: false,

      date:
        similar.date,

      city:
        similar.city,

      raceNo:
        similar.raceNo,

      similarity:
        similar.similarity,

      stage:
        historyResponse.stage,

      timeout:
        historyResponse.timeout,

      durationMs:
        historyResponse.durationMs,

      error:
        historyResponse.error
    };
  }

  const history =
    historyResponse.data;

  const top3 =
    Array.isArray(
      history?.top3
    )
      ? history.top3
      : [];

  if (
    !top3.length
  ) {
    return {
      ok: false,

      date:
        similar.date,

      city:
        similar.city,

      raceNo:
        similar.raceNo,

      similarity:
        similar.similarity,

      error:
        'Tarihsel yarışın ilk 3 atı bulunamadı.'
    };
  }

  /*
    3 kariyer isteği aynı anda.

    Yalnızca üç adet olduğu için
    V2'de Promise.all kullanıyoruz.
  */

  const horses =
    await Promise.all(
      top3.map(
        horse =>
          buildHorse({
            origin,
            horse,

            historicalDate:
              similar.date
          })
      )
    );

  return {
    ok: true,

    date:
      similar.date,

    city:
      similar.city,

    raceNo:
      similar.raceNo,

    /*
      V6 yarış benzerliği.
      Bu kariyer benzerliği değildir.
    */

    raceSimilarity:
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
      Yarış sonucu sayfasındaki
      gerçek şartlar.
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

    historyVersion:
      history.version ||
      null,

    horseIdsComplete:
      history.horseIdsComplete ??
      false,

    top3Count:
      top3.length,

    historyDurationMs:
      historyResponse.durationMs,

    totalDurationMs:
      nowMs() -
      raceStarted,

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
  const started =
    nowMs();

  const diagnostics = [];

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
      V2 varsayılan:
      YALNIZ 1 tarihsel yarış.

      İlk stabil testten sonra
      3'e çıkarabiliriz.
    */

    const similarLimit =
      Math.min(
        Math.max(
          numberValue(
            req.query.similarLimit,
            1
          ),
          1
        ),
        3
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
       AŞAMA 1 — BENZER YARIŞ
    ===================================================== */

    const similarResponse =
      await getSimilar({
        origin,
        date,
        city,
        raceClass,
        ageGroup,
        track,
        distance,

        /*
          Birkaç aday alıyoruz,
          ama sadece en iyi
          similarLimit kadarını
          işleyeceğiz.
        */
        limit:
          Math.max(
            similarLimit,
            3
          )
      });

    diagnostics.push({
      stage:
        'SIMILAR',

      ok:
        similarResponse.ok,

      durationMs:
        similarResponse.durationMs,

      timeout:
        similarResponse.timeout ||
        false,

      error:
        similarResponse.error ||
        null
    });

    if (
      !similarResponse.ok
    ) {
      return res
        .status(500)
        .json({
          ok: false,

          version:
            VERSION,

          failedStage:
            'SIMILAR',

          error:
            similarResponse.error,

          durationMs:
            nowMs() -
            started,

          diagnostics
        });
    }

    const similarData =
      similarResponse.data;

    const matches =
      Array.isArray(
        similarData?.matches
      )
        ? similarData.matches
        : [];

    if (
      !matches.length
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
            similarData?.version ||
            null,

          similarFound: 0,

          historicalRaceCount: 0,

          historicalRaces:
            [],

          durationMs:
            nowMs() -
            started,

          diagnostics,

          message:
            'Benzer tarihsel yarış bulunamadı.'
        });
    }

    /* =====================================================
       AŞAMA 2 — TARİHSEL YARIŞLAR

       V2'de yarışları sırayla
       işliyoruz.

       Bu, aynı anda çok fazla
       TJK isteği açılmasını
       engeller.
    ===================================================== */

    const selected =
      matches.slice(
        0,
        similarLimit
      );

    const historicalRaces = [];
    const failures = [];

    for (
      const similar of
      selected
    ) {
      const result =
        await buildRace({
          origin,
          similar
        });

      diagnostics.push({
        stage:
          `RACE_${similar.date}_${similar.city}_${similar.raceNo}`,

        ok:
          result.ok,

        durationMs:
          result.totalDurationMs ??
          result.durationMs ??
          null,

        timeout:
          result.timeout ||
          false,

        error:
          result.error ||
          null
      });

      if (
        result.ok
      ) {
        historicalRaces.push(
          result
        );
      } else {
        failures.push(
          result
        );
      }
    }

    /* =====================================================
       ÖZET
    ===================================================== */

    let historicalHorseCount =
      0;

    let successfulCareerCount =
      0;

    let failedCareerCount =
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
        historicalHorseCount++;

        if (
          horse.ok
        ) {
          successfulCareerCount++;

          frozenCareerRowCount +=
            Array.isArray(
              horse.roadmap
            )
              ? horse.roadmap.length
              : 0;

        } else {
          failedCareerCount++;
        }
      }
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=600, stale-while-revalidate=1800'
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

        /*
          Kritik veri kaçağı
          koruması.
        */

        rules: {
          historicalRace:
            'historical_race_date < target_date',

          historicalCareer:
            'career_race_date < historical_race_date',

          careerFinish:
            '1 <= finish <= 5',

          useHistoricalTop3:
            true,

          leakageProtection:
            true
        },

        /*
          Buradaki raceSimilarity,
          yalnız yarış şartı
          benzerliğidir.

          Henüz atın kariyer
          benzerlik yüzdesi değildir.
        */

        similarVersion:
          similarData?.version ||
          null,

        similarPagesRead:
          similarData?.pagesRead ??
          null,

        similarScanned:
          similarData?.scanned ??
          null,

        similarFound:
          similarData?.matchCount ??
          matches.length,

        similarUsed:
          selected.length,

        historicalRaceCount:
          historicalRaces.length,

        historicalHorseCount,

        successfulCareerCount,

        failedCareerCount,

        frozenCareerRowCount,

        failedRaceCount:
          failures.length,

        durationMs:
          nowMs() -
          started,

        diagnostics,

        historicalRaces,

        failures,

        sourceChain: [
          'tjk-similar V6 maxPages=1',
          'tjk-history V1',
          'tjk-career V6 before=historicalDate'
        ]
      });

  } catch (e) {

    return res
      .status(500)
      .json({

        ok: false,

        version:
          VERSION,

        error:
          e?.message ||
          'Roadmap V2 çalıştırılamadı.',

        durationMs:
          nowMs() -
          started,

        diagnostics
      });
  }
    }
