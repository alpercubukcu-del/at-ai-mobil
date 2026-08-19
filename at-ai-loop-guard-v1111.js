/* AT AI Mobil — V11.11 LOOP GUARD
   - Manuel kupon ayaklarini ayni anda sinirsiz baslatmaz: en fazla 2 kosu paralel.
   - Model/kariyer isteklerinde tarayici tarafinda kesin zaman asimi vardir.
   - Tarihsel/model URL'lerindeki gereksiz Date.now cache-buster kaldirilir.
   - Bir alt istek takilirsa sonsuz spinner yerine acik hata ile sonlanir.
   - Model puanlama kurallari DEGISTIRILMEZ. */

const AT_AI_LOOP_GUARD_VERSION = 'AT-AI-LOOP-GUARD-V11.11';
const AT_AI_LEG_CONCURRENCY_V1111 = 2;
const AT_AI_MODEL_TIMEOUT_MS_V1111 = 55000;
const AT_AI_CAREER_TIMEOUT_MS_V1111 = 35000;
const AT_AI_RACE_TIMEOUT_MS_V1111 = 70000;

async function atAiFetchJsonV1111(url, timeoutMs, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'default',
      headers: { accept: 'application/json' },
      signal: controller.signal
    });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`${label}: JSON olmayan cevap (API ${res.status}).`);
    }
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `${label}: API ${res.status}`);
    }
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error(`${label}: istek zaman asimina ugradi.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function atAiPromiseTimeoutV1111(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: hesaplama zaman asimina ugradi.`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/*
  Bugunku kosu icin kariyer "before=hedef tarih" oldugundan ayni URL tekrar tekrar
  yeniden hesaplatilmaz. Eski normalize formati aynen korunur.
*/
fetchCareer = async function(horseId, before) {
  if (!horseId) {
    return {
      ok:false,
      errorType:'INPUT',
      error:'At ID bulunamadi.',
      roadmap:[], wins:[], top5:[], preparationPath:[], history:[],
      summary:{ totalTop5:0, totalWins:0, first:0, second:0, third:0, fourth:0, fifth:0 }
    };
  }

  try {
    const url =
      `/api/tjk-career-v10?horseId=${encodeURIComponent(horseId)}` +
      `&before=${encodeURIComponent(before)}`;
    const data = await atAiFetchJsonV1111(url, AT_AI_CAREER_TIMEOUT_MS_V1111, 'Kariyer');
    return typeof normalizeCareerResponse === 'function'
      ? normalizeCareerResponse(data)
      : data;
  } catch (e) {
    return {
      ok:false,
      errorType:'RETRIEVAL_ERROR',
      error:e?.message || 'Kariyer alinamadi.',
      roadmap:[], wins:[], top5:[], preparationPath:[], history:[],
      summary:{ totalTop5:0, totalWins:0, first:0, second:0, third:0, fourth:0, fifth:0 }
    };
  }
};

/*
  V11 model endpoint'i ayni kosu sartlari icin tekrar kullanilabilir.
  Puanlama / model secimi degismez; yalniz istek omru sinirlanir ve cache-buster kaldirilir.
*/
fetchModelRoadmapV11 = async function(race) {
  const meta = typeof programRaceMeta === 'function'
    ? programRaceMeta(race)
    : { ok:true, class:race.class, ageGroup:race.ageGroup, track:race.track, distance:race.distance };

  if (!meta?.ok) {
    return { ok:false, error:meta?.error || 'Kosu sartlari eksik.' };
  }

  const url =
    `/api/tjk-model-roadmap-v11` +
    `?date=${encodeURIComponent(state.date)}` +
    `&city=${encodeURIComponent(getCityName())}` +
    `&class=${encodeURIComponent(meta.class || race.class || '')}` +
    `&ageGroup=${encodeURIComponent(meta.ageGroup || race.ageGroup || '')}` +
    `&track=${encodeURIComponent(meta.track || race.track || '')}` +
    `&distance=${encodeURIComponent(meta.distance || race.distance || '')}` +
    `&minYear=2000`;

  try {
    return await atAiFetchJsonV1111(url, AT_AI_MODEL_TIMEOUT_MS_V1111, `Kosu ${race.no} tarihsel model`);
  } catch (e) {
    return { ok:false, error:e?.message || 'V11 model yol haritasi alinamadi.' };
  }
};

/*
  V11.7'de plan.legs Promise.all ile butun ayaklari ayni anda baslatiyordu.
  Burada kupon model hesaplarini 2 kosuluk havuzda calistiriyoruz.
  Her kosu ayrica ust-zaman-asimi ile korunur.
*/
prepareManualTicketV117 = async function(resetSelections=false) {
  const root = ensureManualRootV117();
  if (!root || !manualTicketV117.betType || manualTicketV117.busy) return;

  const plan = resolveBetStartV11(manualTicketV117.betType);
  if (!plan?.ok) {
    $('manualPlanV117').innerHTML =
      `<div class="manual-error-v117">⚠ ${escapeHtml(plan?.error || 'Bahis baslangici kurulamadi.')}</div>`;
    return;
  }

  const token = ++manualTicketV117.prepToken;
  manualTicketV117.busy = true;
  manualTicketV117.plan = plan;
  manualTicketV117.activeLeg = 0;

  $('manualBetTypeLabelV117').textContent = manualTicketV117.betType;
  $('manualBetStartLabelV117').textContent =
    `${plan.startRace}. kosudan baslar · Ayaklar ${legRangeTextV117(plan)}`;
  $('manualPlanV117').classList.remove('empty');
  $('manualPlanV117').innerHTML =
    `<div class="manual-loading-v117">${escapeHtml(modelV117().label)} modeli hazirlaniyor…<br><small id="manualLoopProgressV1111">0 / ${plan.legs.length} kosu</small></div>`;
  status(`${manualTicketV117.betType}: sistem secimleri hesaplaniyor… 0/${plan.legs.length}`);

  let completed = 0;

  try {
    const pairs = await mapLimitV11(
      plan.legs,
      AT_AI_LEG_CONCURRENCY_V1111,
      async race => {
        if (token !== manualTicketV117.prepToken) {
          throw new Error('Onceki hesaplama iptal edildi.');
        }

        const raceData = await atAiPromiseTimeoutV1111(
          prepareRaceModelsV11(race, msg => {
            if (token === manualTicketV117.prepToken) {
              status(`${msg} · ${completed}/${plan.legs.length}`);
            }
          }),
          AT_AI_RACE_TIMEOUT_MS_V1111,
          `${race.no}. kosu`
        );

        completed += 1;
        if (token === manualTicketV117.prepToken) {
          const progress = $('manualLoopProgressV1111');
          if (progress) progress.textContent = `${completed} / ${plan.legs.length} kosu`;
          status(`${manualTicketV117.betType}: ${completed}/${plan.legs.length} kosu tamamlandi.`);
        }

        if (!raceData?.roadmapOk) {
          throw new Error(`${race.no}. kosu tarihsel modeli tamamlanamadi: ${raceData?.roadmapError || 'Bilinmeyen hata'}`);
        }

        return [String(race.no), raceData];
      }
    );

    if (token !== manualTicketV117.prepToken) return;

    manualTicketV117.raceDataMap = new Map(pairs);
    const ticket = buildOneTicketV11(
      plan,
      modelV117(),
      manualTicketV117.raceDataMap,
      manualBudgetV117(),
      manualUnitV117(),
      manualSinglesV117()
    );
    manualTicketV117.systemTicket = ticket;

    if (resetSelections || !manualTicketV117.selections.size) {
      manualTicketV117.selections = new Map();
      for (const race of plan.legs) {
        const leg = (ticket?.legs || []).find(x => String(x.raceNo) === String(race.no));
        manualTicketV117.selections.set(
          String(race.no),
          new Set((leg?.selections || []).map(x => String(x.no)))
        );
      }
    }

    renderManualPlanV117();
    status(`${manualTicketV117.betType} hazir · ${plan.startRace}. kosudan baslar.`);
  } catch (e) {
    if (token === manualTicketV117.prepToken) {
      manualTicketV117.prepToken += 1;
      $('manualPlanV117').innerHTML =
        `<div class="manual-error-v117">⚠ ${escapeHtml(e?.message || 'Sistem secimleri hazirlanamadi.')}<br><small>Döngü durduruldu; yeniden deneyebilirsiniz.</small></div>`;
      status(`AT AI hesaplamasi durduruldu: ${e?.message || 'Bilinmeyen hata'}`);
    }
  } finally {
    manualTicketV117.busy = false;
  }
};

console.info('[AT AI]', AT_AI_LOOP_GUARD_VERSION, 'aktif');
