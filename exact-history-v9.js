/* AT AI Mobil — Exact Historical Path V9
   app.js classic script olarak yüklendikten sonra çalışır.
   Yalnız kariyer/tarihsel yol katmanını düzeltir. */

const EXACT_HISTORY_PATCH_VERSION = 'EXACT-HISTORY-UI-V9';

/* =========================================================
   ESKİ CACHE'İ KULLANMA
========================================================= */

isValidCareerCache = function(cached) {
  if (
    !cached ||
    cached.version !== CAREER_UI_VERSION ||
    cached.exactHistoryV9 !== true ||
    cached.date !== state.date ||
    String(cached.city) !== String(state.city) ||
    !Array.isArray(cached.races) ||
    !cached.races.length
  ) {
    return false;
  }

  return cached.races.every(race =>
    race &&
    Array.isArray(race.horses) &&
    race.horses.every(item =>
      item &&
      item.galibiyetBenzerligi &&
      Array.isArray(item.galibiyetBenzerligi.byYear)
    )
  );
};

if (state?.analyses?.career && !state.analyses.career.exactHistoryV9) {
  state.analyses.career = {};
  save();
}

/* =========================================================
   GALİBİYET SATIRI BENZERLİĞİ
   Sadece kazanılmış yarışların özellikleri karşılaştırılır.
========================================================= */

careerRowSimilarity = function(a, b) {
  if (!a || !b) return 0;

  const score =
    classSimilarity(a.class || a.raceClass, b.class || b.raceClass) * 0.30 +
    ageGroupSimilarity(a.ageGroup || a.group, b.ageGroup || b.group) * 0.20 +
    distanceSimilarity(a.distance || a.mesafe || a.msf, b.distance || b.mesafe || b.msf) * 0.20 +
    trackSimilarity(a.track || a.pist, b.track || b.pist) * 0.15 +
    citySimilarity(a.city, b.city) * 0.15;

  return clamp01(score);
};

function historicalWins(ref) {
  if (Array.isArray(ref?.career?.winsBefore)) {
    return ref.career.winsBefore.filter(x => Number(x?.finish ?? x?.rank ?? x?.sira) === 1);
  }

  if (Array.isArray(ref?.career?.top5Before)) {
    return ref.career.top5Before.filter(x => Number(x?.finish ?? x?.rank ?? x?.sira) === 1);
  }

  return [];
}

function currentWins(path) {
  return (Array.isArray(path) ? path : [])
    .filter(x => Number(x?.finish ?? x?.rank ?? x?.sira) === 1)
    .sort((a, b) => String(a?.isoDate || a?.date || '').localeCompare(String(b?.isoDate || b?.date || '')));
}

/* =========================================================
   YIL YIL KARİYER YOLU BENZERLİĞİ
   Yıllar ASLA tek ortalamaya birleştirilmez.
========================================================= */

calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
  const todayWins = currentWins(currentPath);
  const historicalRaces = Array.isArray(roadmapData?.historicalRaces)
    ? roadmapData.historicalRaces
        .filter(race => race?.ok !== false && race?.exactConditionMatch !== false)
        .sort((a, b) => Number(b?.sourceYear || 0) - Number(a?.sourceYear || 0))
    : [];

  const byYear = [];
  let referenceCount = 0;

  for (const race of historicalRaces) {
    const year = Number(race?.sourceYear || String(race?.date || '').slice(0, 4)) || null;
    const refs = Array.isArray(race?.top3) ? race.top3 : [];
    let best = null;

    for (const ref of refs) {
      const refPath = historicalWins(ref);
      if (!refPath.length || !todayWins.length) continue;

      referenceCount++;
      const rawScore = orderedPathSimilarity(todayWins, refPath);
      const score = Math.round(clamp01(rawScore) * 100);

      const candidate = {
        year,
        score,
        historicalHorse: ref?.horseName || '',
        historicalHorseId: ref?.horseId || '',
        historicalFinish: Number(ref?.finish || 0) || null,
        historicalWins: refPath.length,
        currentWins: todayWins.length,
        raceDate: race?.date || '',
        raceCity: race?.city || '',
        raceNo: race?.raceNo || '',
        calendarDayDifference: Number(race?.calendarDayDifference ?? 0),
        exactConditionMatch: true,
        raceConditionSimilarity: 100,
        exactMatchesInYear: Number(race?.exactMatchesInYear || 1)
      };

      if (
        !best ||
        candidate.score > best.score ||
        (
          candidate.score === best.score &&
          Number(candidate.historicalFinish || 99) < Number(best.historicalFinish || 99)
        )
      ) {
        best = candidate;
      }
    }

    if (best) {
      byYear.push(best);
    } else {
      byYear.push({
        year,
        score: null,
        historicalHorse: null,
        historicalFinish: null,
        historicalWins: 0,
        currentWins: todayWins.length,
        raceDate: race?.date || '',
        raceCity: race?.city || '',
        raceNo: race?.raceNo || '',
        calendarDayDifference: Number(race?.calendarDayDifference ?? 0),
        exactConditionMatch: true,
        raceConditionSimilarity: 100,
        exactMatchesInYear: Number(race?.exactMatchesInYear || 1),
        error: todayWins.length
          ? 'Geçmiş ilk 3 atının yarış öncesi galibiyet yolu alınamadı.'
          : 'Bugünkü atın yarış öncesi galibiyeti yok.'
      });
    }
  }

  byYear.sort((a, b) => Number(b?.year || 0) - Number(a?.year || 0));

  const scored = byYear.filter(x => Number.isFinite(Number(x?.score)));
  const strongest = scored.length
    ? [...scored].sort((a, b) =>
        Number(b.score) - Number(a.score) ||
        Number(b.year || 0) - Number(a.year || 0)
      )[0]
    : null;

  return {
    // Eski sıralama mekanizması bozulmasın: ana score en güçlü yıllık yoldur.
    // Yıllar birbirine ortalanmaz.
    score: strongest ? strongest.score : null,
    strongestYear: strongest?.year || null,
    strongest: strongest || null,
    byYear,
    matchedHistoricalHorse: strongest?.historicalHorse || null,
    matchedHistoricalFinish: strongest?.historicalFinish || null,
    matchedHistoricalRace: strongest
      ? `${strongest.raceDate} ${strongest.raceCity} ${strongest.raceNo}. Koşu`
      : null,
    referenceCount,
    currentWinCount: todayWins.length,
    method: 'YEAR_BY_YEAR_WIN_PATH_V9',
    yearAggregation: 'NONE',
    historicalRaceRule: 'EXACT_CITY_CLASS_AGE_DISTANCE_TRACK_AND_PM45_DAYS'
  };
};

/* =========================================================
   ROADMAP İSTEĞİ
========================================================= */

fetchHistoricalRoadmap = async function(meta) {
  if (!meta?.ok) {
    return { ok:false, error:meta?.error || 'Koşu koşulları eksik.' };
  }

  try {
    const url =
      `/api/tjk-roadmap` +
      `?date=${encodeURIComponent(state.date)}` +
      `&city=${encodeURIComponent(getCityName())}` +
      `&class=${encodeURIComponent(meta.class || '')}` +
      `&ageGroup=${encodeURIComponent(meta.ageGroup || '')}` +
      `&track=${encodeURIComponent(meta.track || '')}` +
      `&distance=${encodeURIComponent(meta.distance || '')}` +
      `&minYear=2000` +
      `&t=${Date.now()}`;

    const res = await fetch(url, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return { ok:false, error:data?.error || `API ${res.status}` };
    }
    return data;
  } catch (e) {
    return { ok:false, error:e?.message || 'Tam tarihsel yol haritası alınamadı.' };
  }
};

/* =========================================================
   KARİYER ÖZETİ — SADECE GALİBİYET
========================================================= */

careerSummaryHtml = function(career) {
  const rows = currentWins(career?.roadmap);
  const audit = career?.audit || {};
  const careerTotal = Number(audit?.careerTotal ?? career?.counts?.tjkCareerTotal ?? 0);
  const collectedTotal = Number(audit?.collectedTotal ?? career?.counts?.collectedTotal ?? 0);

  return `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 12px 0;">
      <span style="padding:6px 9px;border:1px solid rgba(126,226,168,.3);border-radius:8px;background:rgba(126,226,168,.07);">
        Kariyer galibiyeti: <b>${escapeHtml(rows.length)}</b>
      </span>
      ${
        careerTotal
          ? `<span style="padding:6px 9px;border:1px solid rgba(255,255,255,.15);border-radius:8px;">TJK geçmiş kontrolü: <b>${escapeHtml(collectedTotal || 0)}/${escapeHtml(careerTotal)}</b></span>`
          : ''
      }
      ${
        audit?.coverageStatus
          ? `<span style="padding:6px 9px;border:1px solid rgba(255,255,255,.15);border-radius:8px;">Geçmiş: <b>${escapeHtml(audit.coverageStatus)}</b></span>`
          : ''
      }
    </div>
  `;
};

roadmapTableHtml = function(roadmap) {
  const rows = currentWins(roadmap);

  if (!rows.length) {
    return `
      <div style="padding:10px;opacity:.7;">
        Yarış tarihinden önce doğrulanmış kariyer galibiyeti bulunamadı.
      </div>
    `;
  }

  return `
    <div style="font-size:11px;font-weight:800;letter-spacing:.04em;opacity:.75;margin:10px 0 6px;">
      KARİYER GALİBİYETLERİ — YALNIZ 1. OLDUĞU KOŞULAR
    </div>
    <div style="overflow-x:auto;width:100%;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:650px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Tarih</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">İl</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Sınıf</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Yaş Grubu</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Pist</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Mesafe</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr style="background:rgba(34,197,94,.10);">
              <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap;">🏆 ${escapeHtml(row.date || row.isoDate || '')}</td>
              <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.city || '-')}</td>
              <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.class || row.raceClass || '-')}</td>
              <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.ageGroup || row.group || '-')}</td>
              <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.track || row.pist || '-')}</td>
              <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.distance || row.mesafe || row.msf || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

function yearSimilarityHtml(sim) {
  const rows = Array.isArray(sim?.byYear) ? sim.byYear : [];
  if (!rows.length) {
    return `
      <div style="margin-top:9px;padding:9px;border-radius:8px;background:rgba(255,255,255,.04);font-size:11px;opacity:.72;">
        ±45 gün içinde koşulları tamamen aynı geçmiş yarış bulunamadı.
      </div>
    `;
  }

  return `
    <div style="margin-top:10px;border:1px solid rgba(126,226,168,.18);border-radius:10px;overflow:hidden;">
      <div style="padding:8px 9px;background:rgba(126,226,168,.08);font-size:11px;font-weight:800;">
        YILLARA GÖRE TAM TARİHSEL YOL
        <span style="font-weight:500;opacity:.65;">· aynı il + sınıf + yaş + mesafe + pist · ±45 gün</span>
      </div>
      ${rows.map(row => {
        const hasScore = row?.score !== null && row?.score !== undefined && Number.isFinite(Number(row.score));
        return `
          <div style="padding:8px 9px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;line-height:1.5;">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
              <b>${escapeHtml(row.year || '-')}</b>
              ${hasScore
                ? `<strong style="font-size:15px;color:#7ee2a8;">%${escapeHtml(row.score)}</strong>`
                : `<span style="opacity:.6;">—</span>`}
            </div>
            ${hasScore
              ? `<div><b>${escapeHtml(row.historicalHorse || '-')}</b> · geçmişte <b>${escapeHtml(row.historicalFinish || '-')}.</b></div>`
              : `<div style="opacity:.7;">${escapeHtml(row.error || 'Kariyer yolu hesaplanamadı.')}</div>`}
            <div style="opacity:.6;">
              ${escapeHtml(row.raceDate || '')} ${escapeHtml(row.raceCity || '')} ${row.raceNo ? `${escapeHtml(row.raceNo)}. Koşu` : ''}
              ${Number.isFinite(Number(row.calendarDayDifference)) ? ` · takvim farkı ${escapeHtml(row.calendarDayDifference)} gün` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

careerHorseHtml = function(item, similarityRank = null) {
  const horse = item?.horse;
  const career = item?.career;
  const sim = item?.galibiyetBenzerligi || {};
  if (!horse) return '';

  const hasScore = sim.score !== null && sim.score !== undefined && Number.isFinite(Number(sim.score));
  const scoreHtml = hasScore
    ? `
      <div style="text-align:right;min-width:82px;">
        <div style="font-size:23px;font-weight:900;line-height:1;color:#7ee2a8;">%${escapeHtml(sim.score)}</div>
        <div style="font-size:10px;opacity:.72;margin-top:2px;">En güçlü yol</div>
        ${similarityRank ? `<div style="font-size:10px;opacity:.65;margin-top:3px;">Sıra ${similarityRank}</div>` : ''}
      </div>
    `
    : `
      <div style="text-align:right;min-width:82px;opacity:.55;">
        <div style="font-size:20px;font-weight:800;">—</div>
        <div style="font-size:10px;">Yol skoru yok</div>
      </div>
    `;

  if (!horse.id) {
    return `
      <section style="margin:12px 0;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <strong>${escapeHtml(horse.no)}. ${escapeHtml(horse.name)}</strong>${scoreHtml}
        </div>
        <div style="margin-top:6px;opacity:.7;">TJK At ID bulunamadığı için kariyer alınamadı.</div>
      </section>
    `;
  }

  if (!career?.ok) {
    return `
      <section style="margin:12px 0;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <strong>${escapeHtml(horse.no)}. ${escapeHtml(horse.name)}</strong>${scoreHtml}
        </div>
        ${yearSimilarityHtml(sim)}
        <div style="margin-top:8px;opacity:.72;">Kariyer verisi alınamadı: ${escapeHtml(career?.error || 'Bilinmeyen hata')}</div>
      </section>
    `;
  }

  const strongest = sim?.strongest;

  return `
    <section style="margin:12px 0;padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.02);">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
        <div style="min-width:0;">
          <div style="font-size:16px;font-weight:800;">${escapeHtml(horse.no)}. ${escapeHtml(horse.name)}</div>
          ${horse.jockey ? `<div style="margin-top:3px;opacity:.7;font-size:12px;">Jokey: ${escapeHtml(horse.jockey)}</div>` : ''}
          <div style="font-size:10px;opacity:.55;margin-top:3px;">TJK ID: ${escapeHtml(horse.id)}</div>
        </div>
        ${scoreHtml}
      </div>

      ${yearSimilarityHtml(sim)}

      ${strongest ? `
        <div style="margin-top:8px;padding:7px 9px;border-radius:8px;background:rgba(126,226,168,.08);font-size:11px;line-height:1.45;">
          En güçlü tarihsel yol:
          <b>${escapeHtml(strongest.year)}</b> ·
          <b>${escapeHtml(strongest.historicalHorse || '')}</b> ·
          geçmişte <b>${escapeHtml(strongest.historicalFinish || '')}.</b> ·
          <b>%${escapeHtml(strongest.score)}</b>
        </div>
      ` : ''}

      ${careerSummaryHtml(career)}
      ${roadmapTableHtml(career.roadmap)}
    </section>
  `;
};

/* =========================================================
   KARİYER ANALİZİ GÖRÜNÜMÜ
========================================================= */

renderCareerAnalysis = function(result, raceFilter = null) {
  const content = $('analysisContent');
  if (!content) return;
  content.classList.remove('empty');

  const races = Array.isArray(result?.races) ? result.races : [];
  if (!races.length) {
    content.innerHTML = 'Kariyer verisi bulunamadı.';
    return;
  }

  const selected = raceFilter ?? $('analysisRace')?.value ?? 'all';
  const shownRaces = selected === 'all'
    ? races
    : races.filter(race => String(race.no) === String(selected));

  if (!shownRaces.length) {
    content.innerHTML = `
      <div style="padding:12px;">
        ${escapeHtml(selected)}. koşu daha önce hesaplanan kariyer verisinde bulunamadı.<br><br>
        Bu koşuyu seçip <b>Analizi Hesapla</b> düğmesine basabilirsiniz.
      </div>
    `;
    return;
  }

  const allMode = selected === 'all';

  content.innerHTML = `
    <div style="margin-bottom:12px;font-size:13px;">
      <b>${escapeHtml(result.cityName || '')}</b> · ${escapeHtml(result.date || '')}<br>
      <span style="opacity:.76;line-height:1.5;">
        <b>Tam tarihsel yarış kuralı:</b> aynı il + aynı sınıf + aynı yaş grubu + aynı mesafe + aynı pist.
        Her geçmiş yılda hedef yarışın gün/ayı çevresinde ±45 gün taranır.
        Kariyer karşılaştırmasında yalnız karşılaştırma tarihinden önceki <b>gerçek 1.'likler</b> kullanılır.
        Yılların yüzdeleri birbirine ortalanmaz.
      </span><br>
      <span style="display:inline-block;margin-top:6px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.06);font-size:12px;">
        ${allMode
          ? `${shownRaces.length} koşu hesaplandı. Koşu başlığına dokunarak açın.`
          : `${escapeHtml(selected)}. koşu gösteriliyor. Diğer koşular hafızada kalıyor.`}
      </span>
    </div>
    ${shownRaces.map(race => careerRaceAccordionHtml(race, !allMode)).join('')}
  `;
};

/* =========================================================
   KARİYER ANALİZİNİ YENİ KURALLA HESAPLA
========================================================= */

runCareerAnalysis = async function(selectedRaces, raceValue) {
  const content = $('analysisContent');
  if (!content) return;

  const horsesToLoad = [];
  for (const race of selectedRaces) {
    for (const horse of Array.isArray(race.horses) ? race.horses : []) {
      horsesToLoad.push({ raceNo:race.no, horse });
    }
  }

  if (!horsesToLoad.length) {
    content.innerHTML = 'Seçilen koşularda at bulunamadı.';
    return;
  }

  content.innerHTML = `
    <div style="padding:15px;">
      Tam geçmiş kontrolü ve kariyer galibiyetleri hazırlanıyor…<br><br>
      <b>${horsesToLoad.length}</b> güncel at için yalnız yarış tarihinden önceki gerçek 1.'likler alınacak.
    </div>
  `;

  let completed = 0;
  const loaded = await mapLimit(horsesToLoad, 3, async item => {
    const career = await fetchCareer(item.horse.id, state.date);
    completed++;
    content.innerHTML = `
      <div style="padding:15px;">
        Güncel atların kariyer galibiyetleri doğrulanıyor…<br><br>
        ${completed} / ${horsesToLoad.length} at tamamlandı.
      </div>
    `;
    return { ...item, career };
  });

  const calculatedRaces = [];
  let raceCompleted = 0;

  for (const race of selectedRaces) {
    raceCompleted++;
    content.innerHTML = `
      <div style="padding:15px;">
        Yıllara göre tam tarihsel yarışlar ve gerçek ilk 3 hazırlanıyor…<br><br>
        ${raceCompleted} / ${selectedRaces.length} koşu
      </div>
    `;

    const meta = programRaceMeta(race);
    const roadmap = meta?.ok
      ? await fetchHistoricalRoadmap(meta)
      : { ok:false, error:meta?.error || 'Günlük programda bu koşunun şartları eksik.' };

    const raceHorses = loaded
      .filter(x => x && Number(x.raceNo) === Number(race.no))
      .map(x => {
        const career = normalizeCareerResponse(x.career || {});
        const similarity = roadmap?.ok
          ? calculateGalibiyetBenzerligi(career.roadmap, roadmap)
          : {
              score:null,
              strongest:null,
              byYear:[],
              matchedHistoricalHorse:null,
              matchedHistoricalRace:null,
              referenceCount:0,
              method:'YEAR_BY_YEAR_WIN_PATH_V9'
            };

        return {
          horse:x.horse,
          career,
          galibiyetBenzerligi:similarity
        };
      });

    calculatedRaces.push({
      no:race.no,
      class:race.class || meta?.class || '',
      ageGroup:race.ageGroup || meta?.ageGroup || '',
      distance:race.distance || meta?.distance || '',
      track:race.track || meta?.track || '',
      meta:meta?.ok ? meta : null,
      roadmapVersion:roadmap?.version || null,
      historicalRaceCount:Array.isArray(roadmap?.historicalRaces) ? roadmap.historicalRaces.length : 0,
      historicalYears:Array.isArray(roadmap?.historicalRaces)
        ? roadmap.historicalRaces.map(x => x?.sourceYear).filter(Boolean)
        : [],
      roadmapError:roadmap?.ok ? null : (roadmap?.error || 'Tam tarihsel referans bulunamadı.'),
      horses:raceHorses
    });
  }

  const previous = state.analyses?.career;
  let mergedRaces = calculatedRaces;

  if (raceValue !== 'all' && isValidCareerCache(previous)) {
    const raceMap = new Map(previous.races.map(race => [String(race.no), race]));
    for (const race of calculatedRaces) raceMap.set(String(race.no), race);
    mergedRaces = Array.from(raceMap.values()).sort((a, b) => Number(a.no) - Number(b.no));
  }

  const result = {
    type:'career',
    version:CAREER_UI_VERSION,
    exactHistoryV9:true,
    patchVersion:EXACT_HISTORY_PATCH_VERSION,
    careerApiVersion:'CAREER-WINS-V9.2+',
    roadmapApiVersion:'TJK-ROADMAP-EXACT-V4+',
    raceSimilarityApiVersion:'TJK-EXACT-HISTORY-V7+',
    raceMetaApiVersion:'PROGRAM-DIRECT-NO-RESULT-DEPENDENCY',
    date:state.date,
    city:state.city,
    cityName:getCityName(),
    coverage:raceValue === 'all' ? 'all' : (previous?.coverage === 'all' ? 'all' : 'partial'),
    calculatedRace:raceValue,
    rule:'EXACT_RACE_PM45_AND_WIN_ONLY_CAREER',
    similarityMethod:'YEAR_BY_YEAR_ORDERED_WIN_PATH_V9',
    similarityNote:'Her yıl ayrı hesaplanır. Yarış şartı tam eşleşmedir; kariyer yolu yalnız gerçek galibiyetlerden oluşur. Yıllar birbirine ortalanmaz.',
    races:mergedRaces,
    generatedAt:new Date().toISOString()
  };

  state.analyses.career = result;
  save();
  renderCareerAnalysis(result, raceValue);
};

console.info('[AT AI]', EXACT_HISTORY_PATCH_VERSION, 'aktif');
