;(() => {
  'use strict';

  const VERSION = 'CAREER-SEP4-EFFECTIVE-RUNTIME-V16.9.1F60.54';
  const liveNonCareerRunAnalysis = typeof runAnalysis === 'function' ? runAnalysis : null;

  /*
   * 04.09.2026 Kariyer hesaplama gövdesi.
   * ÖNEMLİ: fetchCareer / fetchHistoricalRoadmap / calculateGalibiyetBenzerligi
   * burada yeniden tanımlanmaz. 04.09 üretim zincirinde bu fonksiyonların üzerine
   * yüklenmiş etkin F20/F12/F15 katmanları aynen kullanılır.
   */
  runCareerAnalysis = async function(selectedRaces, raceValue) {
    const content = $('analysisContent');
    if (!content) return;

    const horsesToLoad = [];
    for (const race of selectedRaces) {
      const horses = Array.isArray(race.horses) ? race.horses : [];
      for (const horse of horses) horsesToLoad.push({ raceNo: race.no, horse });
    }

    if (horsesToLoad.length === 0) {
      content.innerHTML = 'Seçilen koşularda at bulunamadı.';
      return;
    }

    content.innerHTML = `<div style="padding:15px;">Kariyer yol haritaları ve Galibiyet Benzerliği hazırlanıyor…<br><br><b>${horsesToLoad.length}</b> güncel atın ilk 5 kariyer sonuçları alınacak, ardından koşu koşulları tarihsel ilk 3 yol haritalarıyla karşılaştırılacak.</div>`;

    let completed = 0;
    const loaded = await mapLimit(horsesToLoad, 4, async item => {
      const career = await fetchCareer(item.horse.id, state.date);
      completed++;
      content.innerHTML = `<div style="padding:15px;">Güncel kariyerler alınıyor…<br><br>${completed} / ${horsesToLoad.length} at tamamlandı.</div>`;
      return { ...item, career };
    });

    let raceCompleted = 0;
    const calculatedRaces = [];

    for (const race of selectedRaces) {
      raceCompleted++;
      content.innerHTML = `<div style="padding:15px;">Tarihsel yol haritası karşılaştırılıyor…<br><br>${raceCompleted} / ${selectedRaces.length} koşu</div>`;

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
            : { score:null, matchedHistoricalHorse:null, matchedHistoricalRace:null, referenceCount:0 };
          return { horse:x.horse, career, galibiyetBenzerligi:similarity };
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
        roadmapError:roadmap?.ok ? null : (roadmap?.error || 'Tarihsel referans bulunamadı.'),
        horses:raceHorses
      });
    }

    const previous = state.analyses?.career;
    let mergedRaces = calculatedRaces;
    if (raceValue !== 'all' && isValidCareerCache(previous)) {
      const map = new Map(previous.races.map(race => [String(race.no), race]));
      for (const race of calculatedRaces) map.set(String(race.no), race);
      mergedRaces = Array.from(map.values()).sort((a,b) => Number(a.no) - Number(b.no));
    }

    const result = {
      type:'career',
      version:CAREER_UI_VERSION,
      careerApiVersion:'CAREER-ROADMAP-V8',
      roadmapApiVersion:'TJK-ROADMAP-V3',
      raceMetaApiVersion:'PROGRAM-DIRECT-V5.1-NO-RACE-META',
      date:state.date,
      city:state.city,
      cityName:getCityName(),
      coverage:raceValue === 'all' ? 'all' : (previous?.coverage === 'all' ? 'all' : 'partial'),
      calculatedRace:raceValue,
      rule:'SADECE_ILK_5_VE_YARIS_TARIHINDEN_ONCE',
      similarityMethod:'ORDERED_CAREER_PATH_MATCH_V1',
      similarityNote:'Galibiyet Benzerliği tarihsel ilk 3 kariyer yoluna benzerlik yüzdesidir; kalibre edilmiş kazanma olasılığı değildir.',
      races:mergedRaces,
      generatedAt:new Date().toISOString()
    };

    state.analyses.career = result;
    save();
    renderCareerAnalysis(result, raceValue);

    /* Hesap bitmeden arşiv tamamlanmış sayılmaz. */
    try {
      const archiveApi = window.ATCareerArchiveScoreGuardV1691F33;
      if (archiveApi?.archive) await archiveApi.archive(result, selectedRaces, raceValue, 'sep4-effective-runtime');
      if (archiveApi?.prepare) await archiveApi.prepare('sep4-effective-runtime-complete');
    } catch (error) {
      console.warn('[AT AI]', VERSION, 'archive completion failed', error);
    }

    return result;
  };

  function cachedRaceIsComplete(cached, raceNo) {
    const race = (Array.isArray(cached?.races) ? cached.races : []).find(r => String(r?.no) === String(raceNo));
    if (!race || !Array.isArray(race.horses) || !race.horses.length) return false;
    return race.horses.every(item => {
      const sim = item?.galibiyetBenzerligi || {};
      const values = [sim.rankingRawScore, sim.score, sim.finalScore, sim.evidenceScore, sim.displayScore, sim?.strongest?.rankingRawScore, sim?.strongest?.score];
      return values.some(v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)));
    });
  }

  function cachedAllIsComplete(cached) {
    const races = Array.isArray(state?.races) ? state.races : [];
    return races.length > 0 && races.every(r => cachedRaceIsComplete(cached, r.no));
  }

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
    if (raceValue === 'all' && cachedCareerHasAllProgramRaces(cached) && cachedAllIsComplete(cached)) {
      renderCareerAnalysis(cached, 'all');
      status('Kariyer verisi hafızadan gösterildi.');
      return;
    }
    if (raceValue !== 'all' && cachedCareerHasRace(cached, raceValue) && cachedRaceIsComplete(cached, raceValue)) {
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

  window.ATCareerSep4EffectiveRuntimeV1691F654 = {
    version:VERSION,
    run:(...args) => runCareerAnalysis(...args)
  };

  console.info('[AT AI]', VERSION, 'active - 04.09 effective providers + calculation + awaited archive.');
})();