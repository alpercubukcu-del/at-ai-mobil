// api/tjk-roadmap.js
//
// TJK-ROADMAP-V3
//
// Amaç:
// 1) Hedef koşunun tarihsel benzerlerini bul.
// 2) Benzer geçmiş koşuların GERÇEK ilk 3 atını al.
// 3) Her geçmiş ilk-3 atı için yalnızca:
//      kariyer_tarihi < geçmiş_yarış_tarihi
//      ve sıra <= 5
//    olan kariyer satırlarını kullan.
// 4) Career API ne döndürürse döndürsün Roadmap kendi içinde
//    veri sızıntısı kontrolünü yeniden uygular.
// 5) Mesafe / sınıf / yaş grubu / pist alanlarını kaybetmez.
//
// ÖNEMLİ:
// Bu sürüm henüz bugünkü atlara "Galibiyet Benzerliği %"
// üretmez. Buradaki similarityScore yalnızca geçmiş YARIŞIN
// hedef koşuya şart benzerliğidir.

const VERSION = "TJK-ROADMAP-V3";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    const {
      date,
      city,
      class: raceClass,
      ageGroup,
      track,
      distance,
    } = req.query || {};

    if (!date) {
      return res.status(400).json({
        ok: false,
        version: VERSION,
        error: "date parametresi gerekli.",
      });
    }

    if (!city) {
      return res.status(400).json({
        ok: false,
        version: VERSION,
        error: "city parametresi gerekli.",
      });
    }

    const targetDateIso = dateToIso(date);

    if (!targetDateIso) {
      return res.status(400).json({
        ok: false,
        version: VERSION,
        error: `Geçersiz hedef tarih: ${date}`,
      });
    }

    const requestedLimit = toInteger(req.query?.similarLimit);
    const similarLimit = clamp(
      requestedLimit || 1,
      1,
      3
    );

    const baseUrl = getBaseUrl(req);

    // ------------------------------------------------------------------
    // 1. TARİHSEL BENZERLER
    // ------------------------------------------------------------------

    const similarUrl = new URL(
      "/api/tjk-similar",
      baseUrl
    );

    setParam(similarUrl, "date", targetDateIso);
    setParam(similarUrl, "city", city);
    setParam(similarUrl, "class", raceClass);
    setParam(similarUrl, "ageGroup", ageGroup);
    setParam(similarUrl, "track", track);
    setParam(similarUrl, "distance", distance);

    // Şu anda Similar V6'da güvenilir filtreli bölüm ilk sayfa.
    setParam(similarUrl, "maxPages", "1");

    const similarStartedAt = Date.now();

    const similarResponse = await fetchJson(
      similarUrl.toString(),
      15000
    );

    const similarDurationMs =
      Date.now() - similarStartedAt;

    if (!similarResponse?.ok) {
      throw new Error(
        similarResponse?.error ||
          "Tarihsel benzerlik servisi başarısız."
      );
    }

    const allCandidates =
      extractSimilarCandidates(similarResponse);

    const historicalCandidates = allCandidates
      .map(normalizeHistoricalCandidate)
      .filter(Boolean)
      .filter((race) => {
        const iso = dateToIso(race.date);
        return iso && iso < targetDateIso;
      })
      .sort(compareHistoricalCandidates)
      .slice(0, similarLimit);

    if (!historicalCandidates.length) {
      return res.status(200).json({
        ok: true,
        version: VERSION,

        target: {
          date: targetDateIso,
          city: cleanText(city),
          class: cleanText(raceClass),
          ageGroup: cleanText(ageGroup),
          track: cleanText(track),
          distance: normalizeDistance(distance),
        },

        rules: getRules(),

        diagnostics: {
          similarVersion:
            similarResponse?.version || null,
          similarDurationMs,
          similarCandidatesRead:
            allCandidates.length,
          historicalCandidatesAfterDateFilter: 0,
          similarLimit,
          historicalRaceCount: 0,
          historicalHorseCount: 0,
          successfulCareerCount: 0,
          failedCareerCount: 0,
          frozenCareerRowCount: 0,
        },

        historicalRaces: [],

        warning:
          "Hedef tarihten önce kullanılabilecek tarihsel benzer yarış bulunamadı.",
      });
    }

    // ------------------------------------------------------------------
    // 2. HER TARİHSEL YARIŞIN GERÇEK İLK 3'Ü
    // ------------------------------------------------------------------

    const historicalRaces = [];

    for (const candidate of historicalCandidates) {
      const raceResult =
        await buildHistoricalRace({
          baseUrl,
          candidate,
        });

      historicalRaces.push(raceResult);
    }

    // ------------------------------------------------------------------
    // 3. TOPLU KONTROLLER / DIAGNOSTICS
    // ------------------------------------------------------------------

    let historicalHorseCount = 0;
    let successfulCareerCount = 0;
    let failedCareerCount = 0;
    let frozenCareerRowCount = 0;
    let leakageRejectedCount = 0;
    let finishRejectedCount = 0;
    let invalidDateRejectedCount = 0;
    let distanceFilledCount = 0;
    let distanceMissingCount = 0;
    let ageGroupFilledCount = 0;
    let ageGroupMissingCount = 0;

    for (const race of historicalRaces) {
      const horses = Array.isArray(race.top3)
        ? race.top3
        : [];

      historicalHorseCount += horses.length;

      for (const horse of horses) {
        if (horse.career?.ok) {
          successfulCareerCount++;
        } else {
          failedCareerCount++;
        }

        const rows =
          horse.career?.top5Before || [];

        frozenCareerRowCount += rows.length;

        leakageRejectedCount +=
          horse.career?.diagnostics
            ?.rejectedAfterCutoff || 0;

        finishRejectedCount +=
          horse.career?.diagnostics
            ?.rejectedFinish || 0;

        invalidDateRejectedCount +=
          horse.career?.diagnostics
            ?.rejectedInvalidDate || 0;

        for (const row of rows) {
          if (normalizeDistance(row.distance) > 0) {
            distanceFilledCount++;
          } else {
            distanceMissingCount++;
          }

          if (cleanText(row.ageGroup)) {
            ageGroupFilledCount++;
          } else {
            ageGroupMissingCount++;
          }
        }
      }
    }

    const successfulHistoricalRaces =
      historicalRaces.filter(
        (race) => race.ok
      ).length;

    const failedHistoricalRaces =
      historicalRaces.length -
      successfulHistoricalRaces;

    return res.status(200).json({
      ok: true,
      version: VERSION,

      target: {
        date: targetDateIso,
        city: cleanText(city),
        class: cleanText(raceClass),
        ageGroup: normalizeAgeGroup(ageGroup),
        track: cleanText(track),
        distance: normalizeDistance(distance),
      },

      rules: getRules(),

      diagnostics: {
        similarVersion:
          similarResponse?.version || null,

        similarDurationMs,

        similarPagesRead:
          similarResponse?.diagnostics
            ?.pagesRead ??
          similarResponse?.pagesRead ??
          null,

        similarScanned:
          similarResponse?.diagnostics
            ?.scanned ??
          similarResponse?.scanned ??
          null,

        similarFound:
          similarResponse?.matchCount ??
          allCandidates.length,

        similarCandidatesRead:
          allCandidates.length,

        similarUsed:
          historicalCandidates.length,

        similarLimit,

        historicalRaceCount:
          historicalRaces.length,

        successfulHistoricalRaceCount:
          successfulHistoricalRaces,

        failedHistoricalRaceCount:
          failedHistoricalRaces,

        historicalHorseCount,

        successfulCareerCount,

        failedCareerCount,

        frozenCareerRowCount,

        leakageRejectedCount,

        finishRejectedCount,

        invalidDateRejectedCount,

        distanceFilledCount,

        distanceMissingCount,

        ageGroupFilledCount,

        ageGroupMissingCount,
      },

      historicalRaces,
    });
  } catch (error) {
    console.error(
      `[${VERSION}]`,
      error
    );

    return res.status(500).json({
      ok: false,
      version: VERSION,
      error:
        error?.message ||
        "Roadmap oluşturulurken bilinmeyen hata.",
    });
  }
}

// ======================================================================
// TARİHSEL YARIŞ
// ======================================================================

async function buildHistoricalRace({
  baseUrl,
  candidate,
}) {
  const historicalDateIso =
    dateToIso(candidate.date);

  const output = {
    ok: false,

    date: historicalDateIso || candidate.date,
    city: cleanText(candidate.city),
    raceNo: candidate.raceNo,

    // BU PUAN AT PUANI DEĞİLDİR.
    // Yalnızca geçmiş yarış şartlarının hedef yarışa
    // benzerlik puanıdır.
    raceConditionSimilarity:
      normalizeScore(
        candidate.similarityScore
      ),

    candidateCondition: {
      class: cleanText(candidate.class),
      ageGroup: normalizeAgeGroup(
        candidate.ageGroup
      ),
      track: cleanText(candidate.track),
      distance: normalizeDistance(
        candidate.distance
      ),
    },

    top3: [],
  };

  if (
    !historicalDateIso ||
    !candidate.city ||
    !candidate.raceNo
  ) {
    output.error =
      "Tarihsel yarışın tarih/şehir/koşu numarası eksik.";

    return output;
  }

  try {
    const historyUrl = new URL(
      "/api/tjk-history",
      baseUrl
    );

    setParam(
      historyUrl,
      "date",
      historicalDateIso
    );

    setParam(
      historyUrl,
      "city",
      candidate.city
    );

    setParam(
      historyUrl,
      "raceNo",
      String(candidate.raceNo)
    );

    const historyStartedAt = Date.now();

    const history =
      await fetchJson(
        historyUrl.toString(),
        12000
      );

    output.historyDurationMs =
      Date.now() - historyStartedAt;

    output.historyVersion =
      history?.version || null;

    if (!history?.ok) {
      throw new Error(
        history?.error ||
          "Geçmiş yarış sonucu okunamadı."
      );
    }

    output.condition = {
      class: cleanText(
        history.class ||
          candidate.class
      ),

      ageGroup: normalizeAgeGroup(
        history.ageGroup ||
          candidate.ageGroup
      ),

      distance: normalizeDistance(
        history.distance ||
          candidate.distance
      ),

      track: cleanText(
        history.track ||
          candidate.track
      ),

      raw:
        cleanText(
          history.conditionRaw
        ) || null,
    };

    const actualTop3 =
      Array.isArray(history.top3)
        ? history.top3
            .map(normalizeTop3Horse)
            .filter(Boolean)
            .filter(
              (horse) =>
                horse.finish >= 1 &&
                horse.finish <= 3
            )
            .sort(
              (a, b) =>
                a.finish - b.finish
            )
            .slice(0, 3)
        : [];

    if (!actualTop3.length) {
      throw new Error(
        "Tarihsel yarışın gerçek ilk 3 verisi bulunamadı."
      );
    }

    // Aynı geçmiş yarışın ilk 3 atlarının
    // kariyerini paralel çek.
    const top3WithCareer =
      await Promise.all(
        actualTop3.map((horse) =>
          buildHistoricalHorseCareer({
            baseUrl,
            horse,
            historicalDateIso,
          })
        )
      );

    output.top3 = top3WithCareer;
    output.top3Count =
      top3WithCareer.length;

    output.ok = true;

    return output;
  } catch (error) {
    output.error =
      error?.message ||
      "Tarihsel yarış hazırlanamadı.";

    return output;
  }
}

// ======================================================================
// GEÇMİŞ İLK-3 ATI + TARİH KİLİTLİ KARİYER
// ======================================================================

async function buildHistoricalHorseCareer({
  baseUrl,
  horse,
  historicalDateIso,
}) {
  const result = {
    finish: horse.finish,
    horseId: horse.horseId,
    horseName: horse.horseName,
    programNo: horse.programNo,

    career: {
      ok: false,

      cutoffExclusive:
        historicalDateIso,

      top5BeforeCount: 0,

      top5Before: [],

      diagnostics: {
        sourceRows: 0,
        acceptedRows: 0,
        rejectedAfterCutoff: 0,
        rejectedFinish: 0,
        rejectedInvalidDate: 0,
      },
    },
  };

  if (!horse.horseId) {
    result.career.error =
      "At ID bulunamadı.";

    return result;
  }

  try {
    const careerUrl = new URL(
      "/api/tjk-career",
      baseUrl
    );

    setParam(
      careerUrl,
      "horseId",
      horse.horseId
    );

    setParam(
      careerUrl,
      "before",
      historicalDateIso
    );

    const startedAt = Date.now();

    const career =
      await fetchJson(
        careerUrl.toString(),
        12000
      );

    result.career.durationMs =
      Date.now() - startedAt;

    result.career.careerVersion =
      career?.version || null;

    if (!career?.ok) {
      throw new Error(
        career?.error ||
          "At kariyeri okunamadı."
      );
    }

    const sourceRows =
      extractCareerRows(career);

    const frozen =
      freezeCareerRows(
        sourceRows,
        historicalDateIso
      );

    result.career.ok = true;

    result.career.top5Before =
      frozen.rows;

    result.career.top5BeforeCount =
      frozen.rows.length;

    result.career.diagnostics = {
      sourceRows:
        sourceRows.length,

      acceptedRows:
        frozen.rows.length,

      rejectedAfterCutoff:
        frozen.rejectedAfterCutoff,

      rejectedFinish:
        frozen.rejectedFinish,

      rejectedInvalidDate:
        frozen.rejectedInvalidDate,

      distanceFilled:
        frozen.rows.filter(
          (row) =>
            normalizeDistance(
              row.distance
            ) > 0
        ).length,

      distanceMissing:
        frozen.rows.filter(
          (row) =>
            normalizeDistance(
              row.distance
            ) <= 0
        ).length,

      ageGroupFilled:
        frozen.rows.filter(
          (row) =>
            cleanText(
              row.ageGroup
            )
        ).length,

      ageGroupMissing:
        frozen.rows.filter(
          (row) =>
            !cleanText(
              row.ageGroup
            )
        ).length,
    };

    return result;
  } catch (error) {
    result.career.error =
      error?.message ||
      "Kariyer hazırlanamadı.";

    return result;
  }
}

// ======================================================================
// CAREER FREEZE
// ======================================================================

function freezeCareerRows(
  sourceRows,
  cutoffExclusive
) {
  const rows = [];

  let rejectedAfterCutoff = 0;
  let rejectedFinish = 0;
  let rejectedInvalidDate = 0;

  for (const raw of sourceRows) {
    const normalized =
      normalizeCareerRow(raw);

    if (!normalized.isoDate) {
      rejectedInvalidDate++;
      continue;
    }

    // KRİTİK:
    // Geçmiş yarış günü dahil değildir.
    // Mutlaka daha eski olmalı.
    if (
      normalized.isoDate >=
      cutoffExclusive
    ) {
      rejectedAfterCutoff++;
      continue;
    }

    if (
      !Number.isFinite(
        normalized.finish
      ) ||
      normalized.finish < 1 ||
      normalized.finish > 5
    ) {
      rejectedFinish++;
      continue;
    }

    rows.push(normalized);
  }

  // Kariyer yol haritası eski -> yeni
  rows.sort((a, b) =>
    a.isoDate.localeCompare(
      b.isoDate
    )
  );

  return {
    rows,
    rejectedAfterCutoff,
    rejectedFinish,
    rejectedInvalidDate,
  };
}

function normalizeCareerRow(raw) {
  const rawDate =
    firstValue(
      raw?.isoDate,
      raw?.date,
      raw?.tarih,
      raw?.raceDate
    );

  const isoDate =
    dateToIso(rawDate);

  const finish =
    toInteger(
      firstValue(
        raw?.finish,
        raw?.rank,
        raw?.sira,
        raw?.position,
        raw?.S
      )
    );

  const distance =
    normalizeDistance(
      firstValue(
        raw?.distance,
        raw?.mesafe,
        raw?.msf,
        raw?.Msf
      )
    );

  const raceClass =
    cleanText(
      firstValue(
        raw?.class,
        raw?.raceClass,
        raw?.kcins,
        raw?.Kcins,
        raw?.raceType
      )
    );

  const rawGroup =
    cleanText(
      firstValue(
        raw?.ageGroup,
        raw?.group,
        raw?.grup,
        raw?.groupRaw,
        raw?.Grup
      )
    );

  const track =
    cleanText(
      firstValue(
        raw?.track,
        raw?.pist,
        raw?.Pist,
        raw?.surface
      )
    );

  const city =
    cleanText(
      firstValue(
        raw?.city,
        raw?.sehir,
        raw?.şehir,
        raw?.Şehir
      )
    );

  return {
    date:
      formatDisplayDate(
        isoDate
      ) ||
      cleanText(rawDate),

    isoDate,

    city,

    finish,

    class: raceClass,

    ageGroup:
      normalizeAgeGroup(
        rawGroup
      ),

    track,

    distance,

    // Ham Grup değeri de kaybolmasın.
    groupRaw:
      rawGroup || null,
  };
}

// ======================================================================
// SIMILAR RESPONSE
// ======================================================================

function extractSimilarCandidates(data) {
  const possibilities = [
    data?.matches,
    data?.results,
    data?.similar,
    data?.similarRaces,
    data?.races,
    data?.candidates,
    data?.data,
  ];

  for (const value of possibilities) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeHistoricalCandidate(
  raw
) {
  if (!raw) return null;

  const date =
    dateToIso(
      firstValue(
        raw?.date,
        raw?.raceDate,
        raw?.tarih
      )
    );

  const city =
    cleanText(
      firstValue(
        raw?.city,
        raw?.sehir,
        raw?.şehir,
        raw?.Şehir
      )
    );

  const raceNo =
    toInteger(
      firstValue(
        raw?.raceNo,
        raw?.raceNumber,
        raw?.kosuNo,
        raw?.koşuNo,
        raw?.kosuSirasi
      )
    );

  if (
    !date ||
    !city ||
    !raceNo
  ) {
    return null;
  }

  return {
    date,
    city,
    raceNo,

    similarityScore:
      firstValue(
        raw?.similarityScore,
        raw?.score,
        raw?.similarity,
        raw?.totalScore,
        raw?.puan
      ),

    class:
      cleanText(
        firstValue(
          raw?.class,
          raw?.raceClass,
          raw?.kosuCinsi
        )
      ),

    ageGroup:
      normalizeAgeGroup(
        firstValue(
          raw?.ageGroup,
          raw?.group,
          raw?.grup
        )
      ),

    track:
      cleanText(
        firstValue(
          raw?.track,
          raw?.pist
        )
      ),

    distance:
      normalizeDistance(
        firstValue(
          raw?.distance,
          raw?.mesafe
        )
      ),
  };
}

function compareHistoricalCandidates(
  a,
  b
) {
  const scoreA =
    normalizeScore(
      a.similarityScore
    ) ?? -Infinity;

  const scoreB =
    normalizeScore(
      b.similarityScore
    ) ?? -Infinity;

  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }

  // Eşit puanda daha yakın tarih öne gelsin.
  return b.date.localeCompare(
    a.date
  );
}

// ======================================================================
// HISTORY TOP 3
// ======================================================================

function normalizeTop3Horse(raw) {
  if (!raw) return null;

  const finish =
    toInteger(
      firstValue(
        raw?.finish,
        raw?.rank,
        raw?.sira
      )
    );

  if (
    !finish ||
    finish < 1 ||
    finish > 3
  ) {
    return null;
  }

  return {
    finish,

    horseId:
      cleanText(
        firstValue(
          raw?.horseId,
          raw?.atId,
          raw?.id
        )
      ),

    horseName:
      cleanText(
        firstValue(
          raw?.horseName,
          raw?.atAdi,
          raw?.name
        )
      ),

    programNo:
      toInteger(
        firstValue(
          raw?.programNo,
          raw?.number,
          raw?.no
        )
      ) || null,
  };
}

// ======================================================================
// CAREER RESPONSE
// ======================================================================

function extractCareerRows(data) {
  const possibilities = [
    data?.roadmap,
    data?.top5,
    data?.races,
    data?.career,
    data?.results,
    data?.data,
  ];

  for (const value of possibilities) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

// ======================================================================
// YAŞ GRUBU
// ======================================================================

function normalizeAgeGroup(value) {
  const text =
    cleanText(value);

  if (!text) return "";

  const compact = text
    .replace(/\s+/g, "")
    .toLocaleUpperCase("tr-TR");

  const exactMap = {
    "2İ": "2 Yaşlı İngilizler",
    "2I": "2 Yaşlı İngilizler",

    "3İ": "3 Yaşlı İngilizler",
    "3I": "3 Yaşlı İngilizler",

    "3+İ": "3 ve Yukarı İngilizler",
    "3+I": "3 ve Yukarı İngilizler",

    "4+İ": "4 ve Yukarı İngilizler",
    "4+I": "4 ve Yukarı İngilizler",

    "2A": "2 Yaşlı Araplar",

    "3A": "3 Yaşlı Araplar",

    "4A": "4 Yaşlı Araplar",

    "4+A": "4 ve Yukarı Araplar",

    "5+A": "5 ve Yukarı Araplar",
  };

  if (exactMap[compact]) {
    return exactMap[compact];
  }

  // Career API zaten açıklamalı döndürüyorsa
  // olduğu gibi koru.
  return text;
}

// ======================================================================
// TARİH
// ======================================================================

function dateToIso(value) {
  if (value === null ||
      value === undefined) {
    return null;
  }

  const text =
    String(value).trim();

  if (!text) return null;

  // YYYY-MM-DD
  let match =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})/
    );

  if (match) {
    return validIsoDate(
      Number(match[1]),
      Number(match[2]),
      Number(match[3])
    );
  }

  // DD.MM.YYYY veya DD/MM/YYYY
  match =
    text.match(
      /^(\d{1,2})[./](\d{1,2})[./](\d{4})/
    );

  if (match) {
    return validIsoDate(
      Number(match[3]),
      Number(match[2]),
      Number(match[1])
    );
  }

  return null;
}

function validIsoDate(
  year,
  month,
  day
) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const dt =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !==
      month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function formatDisplayDate(
  isoDate
) {
  if (!isoDate) return "";

  const parts =
    isoDate.split("-");

  if (parts.length !== 3) {
    return "";
  }

  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// ======================================================================
// FETCH
// ======================================================================

async function fetchJson(
  url,
  timeoutMs = 12000
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );

  try {
    const response =
      await fetch(url, {
        method: "GET",

        headers: {
          Accept:
            "application/json, text/plain, */*",
          "Cache-Control":
            "no-cache",
        },

        signal:
          controller.signal,
      });

    const text =
      await response.text();

    let data;

    try {
      data =
        text
          ? JSON.parse(text)
          : {};
    } catch {
      throw new Error(
        `JSON olmayan cevap (${response.status}): ${text.slice(
          0,
          180
        )}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          `HTTP ${response.status}`
      );
    }

    return data;
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "TJK isteği zaman aşımına uğradı."
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ======================================================================
// YARDIMCILAR
// ======================================================================

function getBaseUrl(req) {
  const forwardedHost =
    cleanText(
      req.headers?.[
        "x-forwarded-host"
      ]
    );

  const host =
    forwardedHost ||
    cleanText(
      req.headers?.host
    ) ||
    "at-ai-mobil.vercel.app";

  const forwardedProto =
    cleanText(
      req.headers?.[
        "x-forwarded-proto"
      ]
    );

  const protocol =
    forwardedProto ||
    (host.includes("localhost")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

function getRules() {
  return {
    targetRace:
      "historical_race_date < target_date",

    historicalCareer:
      "career_race_date < historical_race_date",

    careerFinish:
      "1 <= finish <= 5",

    useHistoricalTop3:
      true,

    leakageProtection:
      true,

    roadmapRechecksCareerDate:
      true,

    roadmapRechecksFinish:
      true,

    historicalRaceSimilarityOnly:
      true,

    horseLevelGalibiyetBenzerligi:
      false,

    note:
      "raceConditionSimilarity geçmiş yarışın hedef koşu şartlarına benzerliğidir; bugünkü atın Galibiyet Benzerliği değildir.",
  };
}

function setParam(
  url,
  key,
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return;
  }

  const text =
    String(value).trim();

  if (!text) return;

  url.searchParams.set(
    key,
    text
  );
}

function cleanText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstValue(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return null;
}

function toInteger(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const match =
    String(value)
      .replace(",", ".")
      .match(/-?\d+/);

  if (!match) return null;

  const n =
    Number.parseInt(
      match[0],
      10
    );

  return Number.isFinite(n)
    ? n
    : null;
}

function normalizeDistance(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return Math.round(value);
  }

  const match =
    cleanText(value).match(
      /\d{3,4}/
    );

  if (!match) return 0;

  const n =
    Number.parseInt(
      match[0],
      10
    );

  return Number.isFinite(n)
    ? n
    : 0;
}

function normalizeScore(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const n =
    Number(
      String(value)
        .replace("%", "")
        .replace(",", ".")
    );

  if (!Number.isFinite(n)) {
    return null;
  }

  return Math.round(
    n * 100
  ) / 100;
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
       }
