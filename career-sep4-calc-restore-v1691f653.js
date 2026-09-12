;(() => {
  'use strict';

  const VERSION = 'CAREER-SEP4-CALC-RESTORE-V16.9.1F60.53';
  const liveNonCareerRunAnalysis = typeof runAnalysis === 'function' ? runAnalysis : null;

  /* 04.09.2026 production Career API path — copied from the working F60.22 source. */
  fetchCareer = async function(horseId, before) {
    if (!horseId) {
      return {
        ok: false,
        error: 'At ID bulunamadı.',
        roadmap: [],
        summary: { totalTop5: 0, first: 0, second: 0, third: 0, fourth: 0, fifth: 0 }
      };
    }

    try {
      const url =
        `/api/tjk-career` +
        `?horseId=${encodeURIComponent(horseId)}` +
        `&before=${encodeURIComponent(before)}` +
        `&t=${Date.now()}`;

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        return {
          ok: false,
          error: data?.error || `API ${res.status}`,
          roadmap: [],
          summary: { totalTop5: 0, first: 0, second: 0, third: 0, fourth: 0, fifth: 0 }
        };
      }

      return normalizeCareerResponse(data);
    } catch (e) {
      return {
        ok: false,
        error: e?.message || 'Kariyer alınamadı.',
        roadmap: [],
        summary: { totalTop5: 0, first: 0, second: 0, third: 0, fourth: 0, fifth: 0 }
      };
    }
  };

  /* 04.09.2026 production historical roadmap path. */
  fetchHistoricalRoadmap = async function(meta) {
    if (!meta?.ok) {
      return { ok: false, error: meta?.error || 'Koşu koşulları eksik.' };
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
        `&similarLimit=2` +
        `&t=${Date.now()}`;

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        return { ok: false, error: data?.error || `API ${res.status}` };
      }
      return data;
    } catch (e) {
      return { ok: false, error: e?.message || 'Tarihsel yol haritası alınamadı.' };
    }
  };

  /* 04.09.2026 production Career calculation body — copied without formula changes. */
  runCareerAnalysis = async function(selectedRaces, raceValue) {
    const content = $('analysisContent');
    if (!content) return;

    const horsesToLoad = [];
    for (const race of selectedRaces) {
      const horses = Array.isArray(race.horses) ? race.horses : [];
      for (const horse of horses) {
        horsesToLoad.push({ raceNo: race.no, horse });
      }
    }

    if (horsesToLoad.length === 0) {
      content.innerHTML = 'Seçilen koşularda at bulunamadı.';
      return;
    }

    content.innerHTML = `
      <div style="padding:15px;">
        Kariyer yol haritaları ve Galibiyet Benzerliği hazırlanıyor…
        <br><br>
        <b>${horsesToLoad.length}</b> güncel atın ilk 5 kariyer sonuçları alınacak,
        ardından koşu koşulları tarihsel ilk 3 yol haritalarıyla karşılaştırılacak.
      </div>
    `;

    let completed = 0;
    const loaded = await mapLimit(horsesToLoad, 4, async item => {
      const career = await fetchCareer(item.horse.id, state.date);
      completed++;
      content.innerHTML = `
        <div style="padding:15px;">
          Güncel kariyerler alınıyor…<br><br>
          ${completed} / ${horsesToLoad.length} at tamamlandı.
        </div>
      `;
      return { ...item, career };
    });

    let raceCompleted = 0;
    const calculatedRaces = [];

    for (const race of selectedRaces) {
      raceCompleted++;
      content.innerHTML = `
        <div style="padding:15px;">
          Tarihsel yol haritası karşılaştırılıyor…<br><br>
          ${raceCompleted} / ${selectedRaces.length} koşu
        </div>
      `;

      const meta = programRaceMeta(race);

      const roadmap = meta?.ok
        ? await fetchHistoricalRoadmap(meta)
        : {
            ok: false,
            error: meta?.error || 'Günlük programda bu koşunun şartları eksik.'
          };

      const raceHorses = loaded
        .filter(x => x && Number(x.raceNo) === Number(race.no))
        .map(x => {
          const career = normalizeCareerResponse(x.career || {});
          const similarity = roadmap?.ok
            ? calculateGalibiyetBenzerligi(career.roadmap, roadmap)
            : {
                score: null,
                matchedHistoricalHorse: null,
                matchedHistoricalRace: null,
                referenceCount: 0
              };

          return {
            horse: x.horse,
            career,
            galibiyetBenzerligi: similarity
          };
        });

      calculatedRaces.push({
        no: race.no,
        class: race.class || meta?.class || '',
        ageGroup: race.ageGroup || meta?.ageGroup || '',
        distance: race.distance || meta?.distance || '',
        track: race.track || meta?.track || '',
        meta: meta?.ok ? meta : null,
        roadmapVersion: roadmap?.version || null,
        historicalRaceCount: Array.isArray(roadmap?.historicalRaces) ? roadmap.historicalRaces.length : 0,
        roadmapError: roadmap?.ok ? null : (roadmap?.error || 'Tarihsel referans bulunamadı.'),
        horses: raceHorses
      });
    }

    const previous = state.analyses?.career;
    let mergedRaces = calculatedRaces;

    if (raceValue !== 'all' && isValidCareerCache(previous)) {
      const map = new Map(previous.races.map(race => [String(race.no), race]));
      for (const race of calculatedRaces) {
        map.set(String(race.no), race);
      }
      mergedRaces = Array.from(map.values()).sort((a, b) => Number(a.no) - Number(b.no));
    }

    const result = {
      type: 'career',
      version: CAREER_UI_VERSION,
      careerApiVersion: 'CAREER-ROADMAP-V8',
      roadmapApiVersion: 'TJK-ROADMAP-V3',
      raceMetaApiVersion: 'PROGRAM-DIRECT-V5.1-NO-RACE-META',
      date: state.date,
      city: state.city,
      cityName: getCityName(),
      coverage: raceValue === 'all'
        ? 'all'
        : (previous?.coverage === 'all' ? 'all' : 'partial'),
      calculatedRace: raceValue,
      rule: 'SADECE_ILK_5_VE_YARIS_TARIHINDEN_ONCE',
      similarityMethod: 'ORDERED_CAREER_PATH_MATCH_V1',
      similarityNote: 'Galibiyet Benzerliği tarihsel ilk 3 kariyer yoluna benzerlik yüzdesidir; kalibre edilmiş kazanma olasılığı değildir.',
      races: mergedRaces,
      generatedAt: new Date().toISOString()
    };

    state.analyses.career = result;
    save();
    renderCareerAnalysis(result, raceValue);

    /* Keep the current daily archive writer, but do not let it block calculation. */
    try {
      const archiveApi = window.ATCareerArchiveScoreGuardV1691F33;
      if (archiveApi?.archive) {
        Promise.resolve(archiveApi.archive(result, selectedRaces, raceValue, 'sep4-calc-restore')).catch(() => {});
      }
    } catch {}

    return result;
  };

  /* Career route from 04.09.2026; non-Career views keep the current runtime. */
  runAnalysis = async function(...args) {
    const dialog = $('analysisDialog');
    const view = dialog?.dataset.view || 'current';

    if (view !== 'career') {
      if (liveNonCareerRunAnalysis) return liveNonCareerRunAnalysis.apply(this, args);
      return;
    }

    const raceValue = $('analysisRace')?.value || 'all';
    const content = $('analysisContent');
    if (!content) return;

    content.classList.remove('empty');

    if (!state.races.length) {
      content.innerHTML = 'Önce TJK programını yüklemelisiniz.';
      return;
    }

    const cached = state.analyses?.career;

    if (raceValue === 'all' && cachedCareerHasAllProgramRaces(cached)) {
      renderCareerAnalysis(cached, 'all');
      status('Kariyer verisi hafızadan gösterildi.');
      return;
    }

    if (raceValue !== 'all' && cachedCareerHasRace(cached, raceValue)) {
      renderCareerAnalysis(cached, raceValue);
      status(`${raceValue}. koşu daha önce hesaplanan veriden filtrelendi.`);
      return;
    }

    const selectedRaces = raceValue === 'all'
      ? state.races
      : state.races.filter(r => String(r.no) === String(raceValue));

    await runCareerAnalysis(selectedRaces, raceValue);
  };

  try {
    const btn = document.getElementById('runAnalysis');
    if (btn) btn.onclick = runAnalysis;
  } catch {}

  window.ATCareerSep4CalcRestoreV1691F653 = {
    version: VERSION,
    run: (...args) => runCareerAnalysis(...args)
  };

  console.info('[AT AI]', VERSION, 'active - 04.09.2026 Career calculation path restored at end of runtime.');
})();
