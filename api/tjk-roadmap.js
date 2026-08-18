const VERSION = 'TJK-ROADMAP-EXACT-V4.2';
const INTERNAL_RETRIES = 3;
const CAREER_CONCURRENCY = 2;
const RACE_CONCURRENCY = 2;

function cleanText(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toInteger(value) {
  const m = cleanText(value).replace(',', '.').match(/-?\d+/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeDistance(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const m = cleanText(value).match(/\d{3,4}/);
  return m ? Number.parseInt(m[0], 10) : 0;
}

function dateToIso(value) {
  const text = cleanText(value);
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return validIsoDate(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

function validIsoDate(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function formatDisplayDate(iso) {
  const m = cleanText(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : cleanText(iso);
}

function normalizeAgeGroup(value) {
  const text = cleanText(value);
  if (!text) return '';
  const compact = text.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
  const map = {
    '2İ':'2 Yaşlı İngilizler','2I':'2 Yaşlı İngilizler','3İ':'3 Yaşlı İngilizler','3I':'3 Yaşlı İngilizler',
    '3+İ':'3 ve Yukarı İngilizler','3+I':'3 ve Yukarı İngilizler','4İ':'4 Yaşlı İngilizler','4I':'4 Yaşlı İngilizler',
    '4+İ':'4 ve Yukarı İngilizler','4+I':'4 ve Yukarı İngilizler','2A':'2 Yaşlı Araplar',
    '3A':'3 Yaşlı Araplar','4A':'4 Yaşlı Araplar','4+A':'4 ve Yukarı Araplar','5+A':'5 ve Yukarı Araplar'
  };
  return map[compact] || text;
}

function getBaseUrl(req) {
  const host = cleanText(req.headers?.['x-forwarded-host']) || cleanText(req.headers?.host) || 'at-ai-mobil.vercel.app';
  const protocol = cleanText(req.headers?.['x-forwarded-proto']) || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

function setParam(url, key, value) {
  const text = cleanText(value);
  if (text) url.searchParams.set(key, text);
}

async function fetchJson(url, timeoutMs = 25000, attempts = INTERNAL_RETRIES) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers:{ Accept:'application/json, text/plain, */*' },
        signal:controller.signal
      });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`JSON olmayan cevap (${response.status}): ${text.slice(0, 180)}`);
      }

      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      return data;
    } catch (e) {
      lastError = e?.name === 'AbortError'
        ? new Error('TJK isteği zaman aşımına uğradı.')
        : e;
      if (attempt < attempts) await sleep(300 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('İstek başarısız.');
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }

  const count = Math.min(Math.max(1, limit), items.length || 1);
  await Promise.all(Array.from({ length:count }, () => run()));
  return output;
}

function normalizeHistoricalCandidate(raw) {
  if (!raw) return null;
  const date = dateToIso(firstValue(raw.date, raw.raceDate, raw.tarih));
  const city = cleanText(firstValue(raw.city, raw.sehir, raw.şehir, raw.Şehir));
  const raceNo = toInteger(firstValue(raw.raceNo, raw.raceNumber, raw.kosuNo, raw.koşuNo, raw.kosuSirasi));
  if (!date || !city || !raceNo) return null;

  return {
    date,
    city,
    raceNo,
    sourceYear:toInteger(raw.sourceYear) || Number(date.slice(0,4)),
    anchorDate:dateToIso(raw.anchorDate) || null,
    calendarDayDifference:toInteger(raw.calendarDayDifference) ?? 999,
    similarityScore:100,
    exact:true,
    class:cleanText(firstValue(raw.class, raw.raceClass, raw.kosuCinsi)),
    ageGroup:normalizeAgeGroup(firstValue(raw.ageGroup, raw.group, raw.grup)),
    track:cleanText(firstValue(raw.track, raw.pist)),
    distance:normalizeDistance(firstValue(raw.distance, raw.mesafe))
  };
}

function selectOneExactRacePerYear(similarResponse, targetDateIso) {
  const candidates = Array.isArray(similarResponse?.matches)
    ? similarResponse.matches.map(normalizeHistoricalCandidate).filter(Boolean)
    : [];

  const grouped = new Map();
  for (const race of candidates) {
    if (!race.exact || race.date >= targetDateIso) continue;
    const year = Number(race.sourceYear);
    if (!Number.isFinite(year)) continue;
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year).push(race);
  }

  const selected = [];
  for (const [year, rows] of grouped.entries()) {
    rows.sort((a, b) =>
      a.calendarDayDifference - b.calendarDayDifference ||
      b.date.localeCompare(a.date) ||
      a.raceNo - b.raceNo
    );
    selected.push({ ...rows[0], exactMatchesInYear:rows.length });
  }

  return selected.sort((a, b) => b.sourceYear - a.sourceYear);
}

function normalizeTop3Horse(raw) {
  if (!raw) return null;
  const finish = toInteger(firstValue(raw.finish, raw.rank, raw.sira));
  if (!finish || finish < 1 || finish > 3) return null;
  return {
    finish,
    horseId:cleanText(firstValue(raw.horseId, raw.atId, raw.id)),
    horseName:cleanText(firstValue(raw.horseName, raw.atAdi, raw.name)),
    programNo:toInteger(firstValue(raw.programNo, raw.number, raw.no)) || null,
    margin:cleanText(firstValue(raw.margin, raw.fark, raw.distanceBehind, raw.behind)) || null
  };
}

function extractCareerRows(data) {
  for (const value of [data?.wins, data?.roadmap, data?.top5, data?.races, data?.career, data?.results, data?.data]) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeCareerRow(raw) {
  const rawDate = firstValue(raw?.isoDate, raw?.date, raw?.tarih, raw?.raceDate);
  const isoDate = dateToIso(rawDate);
  const finish = toInteger(firstValue(raw?.finish, raw?.rank, raw?.sira, raw?.position, raw?.S));
  return {
    date:formatDisplayDate(isoDate) || cleanText(rawDate),
    isoDate,
    city:cleanText(firstValue(raw?.city, raw?.sehir, raw?.şehir, raw?.Şehir)),
    finish,
    class:cleanText(firstValue(raw?.class, raw?.raceClass, raw?.kcins, raw?.Kcins, raw?.raceType)),
    ageGroup:normalizeAgeGroup(firstValue(raw?.ageGroup, raw?.group, raw?.grup, raw?.groupRaw, raw?.Grup)),
    track:cleanText(firstValue(raw?.track, raw?.pist, raw?.Pist, raw?.surface)),
    distance:normalizeDistance(firstValue(raw?.distance, raw?.mesafe, raw?.msf, raw?.Msf)),
    groupRaw:cleanText(firstValue(raw?.groupRaw, raw?.grup, raw?.Grup)) || null
  };
}

function freezeWins(sourceRows, cutoffExclusive) {
  const rows = [];
  let rejectedAfterCutoff = 0;
  let rejectedFinish = 0;
  let rejectedInvalidDate = 0;

  for (const raw of sourceRows) {
    const row = normalizeCareerRow(raw);
    if (!row.isoDate) {
      rejectedInvalidDate++;
      continue;
    }
    if (row.isoDate >= cutoffExclusive) {
      rejectedAfterCutoff++;
      continue;
    }
    if (row.finish !== 1) {
      rejectedFinish++;
      continue;
    }
    rows.push(row);
  }

  rows.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  return { rows, rejectedAfterCutoff, rejectedFinish, rejectedInvalidDate };
}

async function buildHistoricalHorseCareer({ baseUrl, horse, historicalDateIso }) {
  const result = {
    finish:horse.finish,
    horseId:horse.horseId,
    horseName:horse.horseName,
    programNo:horse.programNo,
    margin:horse.margin || null,
    career:{
      ok:false,
      cutoffExclusive:historicalDateIso,
      winsBeforeCount:0,
      winsBefore:[],
      top5BeforeCount:0,
      top5Before:[],
      diagnostics:{ sourceRows:0, acceptedRows:0, rejectedAfterCutoff:0, rejectedFinish:0, rejectedInvalidDate:0 }
    }
  };

  if (!horse.horseId) {
    result.career.error = 'At ID bulunamadı.';
    return result;
  }

  try {
    const url = new URL('/api/tjk-career', baseUrl);
    setParam(url, 'horseId', horse.horseId);
    setParam(url, 'before', historicalDateIso);

    const startedAt = Date.now();
    const career = await fetchJson(url.toString(), 45000, INTERNAL_RETRIES);
    result.career.durationMs = Date.now() - startedAt;
    result.career.careerVersion = career?.version || null;
    if (!career?.ok) throw new Error(career?.error || 'At kariyeri okunamadı.');

    const sourceRows = extractCareerRows(career);
    const frozen = freezeWins(sourceRows, historicalDateIso);
    result.career.ok = true;
    result.career.winsBefore = frozen.rows;
    result.career.winsBeforeCount = frozen.rows.length;
    result.career.top5Before = frozen.rows;
    result.career.top5BeforeCount = frozen.rows.length;
    result.career.diagnostics = {
      sourceRows:sourceRows.length,
      acceptedRows:frozen.rows.length,
      rejectedAfterCutoff:frozen.rejectedAfterCutoff,
      rejectedFinish:frozen.rejectedFinish,
      rejectedInvalidDate:frozen.rejectedInvalidDate,
      distanceFilled:frozen.rows.filter(x => x.distance > 0).length,
      distanceMissing:frozen.rows.filter(x => !x.distance).length,
      ageGroupFilled:frozen.rows.filter(x => cleanText(x.ageGroup)).length,
      ageGroupMissing:frozen.rows.filter(x => !cleanText(x.ageGroup)).length
    };
    return result;
  } catch (e) {
    result.career.error = e?.message || 'Kariyer hazırlanamadı.';
    return result;
  }
}

async function buildHistoricalRace({ baseUrl, candidate }) {
  const output = {
    ok:false,
    date:candidate.date,
    city:candidate.city,
    raceNo:candidate.raceNo,
    sourceYear:candidate.sourceYear,
    anchorDate:candidate.anchorDate,
    calendarDayDifference:candidate.calendarDayDifference,
    exactMatchesInYear:candidate.exactMatchesInYear || 1,
    exactConditionMatch:true,
    raceConditionSimilarity:100,
    candidateCondition:{
      class:candidate.class,
      ageGroup:candidate.ageGroup,
      track:candidate.track,
      distance:candidate.distance
    },
    top3:[]
  };

  try {
    const historyUrl = new URL('/api/tjk-history', baseUrl);
    setParam(historyUrl, 'date', candidate.date);
    setParam(historyUrl, 'city', candidate.city);
    setParam(historyUrl, 'raceNo', candidate.raceNo);

    const startedAt = Date.now();
    const history = await fetchJson(historyUrl.toString(), 35000, INTERNAL_RETRIES);
    output.historyDurationMs = Date.now() - startedAt;
    output.historyVersion = history?.version || null;
    if (!history?.ok) throw new Error(history?.error || 'Geçmiş yarış sonucu okunamadı.');

    output.condition = {
      class:cleanText(history.class || candidate.class),
      ageGroup:normalizeAgeGroup(history.ageGroup || candidate.ageGroup),
      distance:normalizeDistance(history.distance || candidate.distance),
      track:cleanText(history.track || candidate.track),
      raw:cleanText(history.conditionRaw) || null
    };

    const top3 = Array.isArray(history.top3)
      ? history.top3.map(normalizeTop3Horse).filter(Boolean).sort((a, b) => a.finish - b.finish).slice(0, 3)
      : [];
    if (!top3.length) throw new Error('Tarihsel yarışın gerçek ilk 3 verisi bulunamadı.');

    output.top3 = await mapLimit(
      top3,
      CAREER_CONCURRENCY,
      horse => buildHistoricalHorseCareer({ baseUrl, horse, historicalDateIso:candidate.date })
    );
    output.top3Count = output.top3.length;
    output.ok = true;
    return output;
  } catch (e) {
    output.error = e?.message || 'Tarihsel yarış hazırlanamadı.';
    return output;
  }
}

function getRules(minYear) {
  return {
    targetRaceSource:'TJK Günlük Yarış Programı',
    historicalRaceSource:'TJK Yarış Sonuçları / Koşu Sorgulama',
    historicalRaceDate:'historical_race_date < target_date',
    yearByYear:true,
    calendarWindowDays:45,
    exactRaceFields:['city','class','ageGroup','distance','track'],
    raceConditionSimilarity:'accepted race = 100%',
    multipleExactRacesSameYear:'closest calendar day to target month/day is selected',
    historicalTop3:true,
    historicalCareer:'career_race_date < historical_race_date',
    careerFinish:'finish === 1 only',
    leakageProtection:true,
    internalRetries:INTERNAL_RETRIES,
    careerConcurrency:CAREER_CONCURRENCY,
    raceConcurrency:RACE_CONCURRENCY,
    minYear
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const { date, city, class:raceClass, ageGroup, track, distance } = req.query || {};
    const targetDateIso = dateToIso(date);
    if (!targetDateIso) {
      return res.status(400).json({ ok:false, version:VERSION, error:'date YYYY-MM-DD biçiminde gerekli.' });
    }
    if (!cleanText(city)) {
      return res.status(400).json({ ok:false, version:VERSION, error:'city gerekli.' });
    }

    const minYear = Math.max(1950, toInteger(req.query?.minYear) || 2000);
    const baseUrl = getBaseUrl(req);
    const similarUrl = new URL('/api/tjk-similar', baseUrl);
    setParam(similarUrl, 'date', targetDateIso);
    setParam(similarUrl, 'city', city);
    setParam(similarUrl, 'class', raceClass);
    setParam(similarUrl, 'ageGroup', ageGroup);
    setParam(similarUrl, 'track', track);
    setParam(similarUrl, 'distance', distance);
    setParam(similarUrl, 'minYear', minYear);
    setParam(similarUrl, 'maxPages', req.query?.maxPages || 40);

    const similarStartedAt = Date.now();
    const similar = await fetchJson(similarUrl.toString(), 35000, INTERNAL_RETRIES);
    const similarDurationMs = Date.now() - similarStartedAt;
    if (!similar?.ok) throw new Error(similar?.error || 'Tam tarihsel eşleşme servisi başarısız.');

    const selectedCandidates = selectOneExactRacePerYear(similar, targetDateIso);
    if (!selectedCandidates.length) {
      return res.status(200).json({
        ok:true,
        version:VERSION,
        target:{
          date:targetDateIso,
          city:cleanText(city),
          class:cleanText(raceClass),
          ageGroup:normalizeAgeGroup(ageGroup),
          track:cleanText(track),
          distance:normalizeDistance(distance)
        },
        rules:getRules(minYear),
        diagnostics:{ similarVersion:similar.version || null, similarDurationMs, exactMatchesFound:similar.matchCount || 0, selectedYearCount:0 },
        yearResults:Array.isArray(similar.yearResults) ? similar.yearResults : [],
        historicalRaces:[],
        warning:'Geçmiş yıllarda ±45 gün içinde koşulları tamamen aynı yarış bulunamadı.'
      });
    }

    const historicalRaces = await mapLimit(
      selectedCandidates,
      RACE_CONCURRENCY,
      candidate => buildHistoricalRace({ baseUrl, candidate })
    );

    let historicalHorseCount = 0;
    let successfulCareerCount = 0;
    let failedCareerCount = 0;
    let frozenWinRowCount = 0;

    for (const race of historicalRaces) {
      for (const horse of Array.isArray(race.top3) ? race.top3 : []) {
        historicalHorseCount++;
        if (horse.career?.ok) successfulCareerCount++;
        else failedCareerCount++;
        frozenWinRowCount += Array.isArray(horse.career?.winsBefore) ? horse.career.winsBefore.length : 0;
      }
    }

    const byYear = historicalRaces.map(race => ({
      year:race.sourceYear,
      ok:race.ok,
      date:race.date,
      city:race.city,
      raceNo:race.raceNo,
      calendarDayDifference:race.calendarDayDifference,
      exactConditionMatch:race.exactConditionMatch,
      raceConditionSimilarity:100,
      top3:race.top3,
      error:race.error || null
    }));

    return res.status(200).json({
      ok:true,
      version:VERSION,
      target:{
        date:targetDateIso,
        city:cleanText(city),
        class:cleanText(raceClass),
        ageGroup:normalizeAgeGroup(ageGroup),
        track:cleanText(track),
        distance:normalizeDistance(distance)
      },
      rules:getRules(minYear),
      diagnostics:{
        similarVersion:similar.version || null,
        similarDurationMs,
        similarScanned:similar?.diagnostics?.scanned ?? null,
        exactMatchesFound:similar.matchCount || 0,
        selectedYearCount:selectedCandidates.length,
        historicalRaceCount:historicalRaces.length,
        successfulHistoricalRaceCount:historicalRaces.filter(x => x.ok).length,
        failedHistoricalRaceCount:historicalRaces.filter(x => !x.ok).length,
        historicalHorseCount,
        successfulCareerCount,
        failedCareerCount,
        frozenWinRowCount,
        internalRetries:INTERNAL_RETRIES,
        careerConcurrency:CAREER_CONCURRENCY,
        raceConcurrency:RACE_CONCURRENCY
      },
      yearResults:Array.isArray(similar.yearResults) ? similar.yearResults : [],
      byYear,
      historicalRaces
    });
  } catch (e) {
    console.error(`[${VERSION}]`, e);
    return res.status(500).json({
      ok:false,
      version:VERSION,
      error:e?.message || 'Tam tarihsel yol haritası oluşturulamadı.'
    });
  }
}