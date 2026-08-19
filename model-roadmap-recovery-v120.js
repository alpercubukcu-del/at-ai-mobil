/* AT AI Mobil — V12.0 MODEL ROADMAP RECOVERY
   - null / undefined / bos skorlar artik 0 sayilmaz.
   - V11 tarihsel roadmap gecici 5xx hatalarinda kontrollu yeniden denenir.
   - Basarisiz / eski model nesneleri V11.2 cache'inde tutulmaz.
   - V11.5 podium icin byFinish(1/2/3) semasi dogrulanir.
   - Roadmap servis hatasi, gercek "tarihsel yol yok" durumundan ayrilir.
   - V11.9 tam kariyer yolu + ham benzerlik siralama kurali ekranda acik gosterilir.
*/

const MODEL_ROADMAP_RECOVERY_V120 = 'MODEL-ROADMAP-RECOVERY-V12.0';

function finiteStrictV120(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* Number(null) === 0 kaynakli sahte %0'lari engelle. */
if (typeof finiteV11 === 'function') {
  finiteV11 = finiteStrictV120;
}
if (typeof finitePodiumV115 === 'function') {
  finitePodiumV115 = finiteStrictV120;
}

function sleepV120(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* Tek bir gecici 500 artik tum 5-model / podium sonucunu bosaltmasin. */
if (typeof fetchModelRoadmapV11 === 'function') {
  const fetchModelRoadmapBeforeV120 = fetchModelRoadmapV11;
  fetchModelRoadmapV11 = async function(race) {
    const attempts = 3;
    let last = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        last = await fetchModelRoadmapBeforeV120(race);
      } catch (e) {
        last = { ok:false, error:e?.message || 'V11 tarihsel model servisi hatasi.' };
      }
      if (last?.ok) {
        if (attempt > 1) last.recoveredAfterRetry = attempt;
        return last;
      }
      if (attempt < attempts) await sleepV120(attempt === 1 ? 450 : 1000);
    }
    return {
      ...(last || {}),
      ok:false,
      retryCount:attempts,
      error:`Tarihsel model verisi ${attempts} denemede alinamadi: ${last?.error || 'V11 roadmap servisi yanit vermedi.'}`
    };
  };
}

function modelSchemaVersionV120() {
  const parts = [MODEL_ROADMAP_RECOVERY_V120];
  try { if (typeof TICKET_SCORE_VERSION !== 'undefined') parts.push(TICKET_SCORE_VERSION); } catch {}
  try { if (typeof PODIUM_SIMILARITY_V115 !== 'undefined') parts.push(PODIUM_SIMILARITY_V115); } catch {}
  try { if (typeof HISTORICAL_PATH_V119 !== 'undefined') parts.push(HISTORICAL_PATH_V119); } catch {}
  return parts.join('+');
}

function podiumSchemaExpectedV120() {
  try { return typeof PODIUM_SIMILARITY_V115 !== 'undefined'; }
  catch { return false; }
}

function hasPodiumSchemaV120(result) {
  if (!podiumSchemaExpectedV120()) return true;
  const horses = Array.isArray(result?.horses) ? result.horses : [];
  if (!horses.length) return true;
  return horses.every(item => {
    const byFinish = item?.scores?.byFinish;
    return Boolean(byFinish?.[1] && byFinish?.[2] && byFinish?.[3]);
  });
}

function modelResultCacheableV120(result) {
  return Boolean(result && result.roadmapOk !== false && hasPodiumSchemaV120(result));
}

/* Eski tarih|sehir|kosu cache anahtarina algoritma / sema surumunu ekle. */
if (typeof careerModelKeyV112 === 'function') {
  careerModelKeyV112 = function(race) {
    const city = typeof getCityName === 'function' ? getCityName() : state?.city;
    return [state?.date, city, race?.no, modelSchemaVersionV120()].join('|');
  };
}

/* 500 veya eksik byFinish semasi cache'e kilitlenmesin. */
if (typeof getCareerRaceModelsV112 === 'function' && typeof careerModelCacheV112 !== 'undefined') {
  try { careerModelCacheV112.clear(); } catch {}

  getCareerRaceModelsV112 = async function(race) {
    const key = careerModelKeyV112(race);
    if (careerModelCacheV112.has(key)) {
      try {
        const cached = await careerModelCacheV112.get(key);
        if (modelResultCacheableV120(cached)) return cached;
      } catch {}
      careerModelCacheV112.delete(key);
    }

    const promise = Promise.resolve().then(() => prepareRaceModelsV11(race));
    careerModelCacheV112.set(key, promise);

    try {
      let result = await promise;

      /* Roadmap tamam ama eski bir wrapper byFinish uretmediyse bir kez guncel zincirle tekrar hesapla. */
      if (result?.roadmapOk !== false && !hasPodiumSchemaV120(result)) {
        careerModelCacheV112.delete(key);
        result = await prepareRaceModelsV11(race);
        if (!hasPodiumSchemaV120(result)) {
          result.modelSchemaOk = false;
          result.modelSchemaError = '1./2./3. derece model semasi (byFinish) uretilemedi.';
        }
      }

      if (modelResultCacheableV120(result)) {
        result.modelSchemaOk = true;
        result.modelSchemaVersion = modelSchemaVersionV120();
        careerModelCacheV112.set(key, Promise.resolve(result));
      } else {
        /* Basarisiz sonuc yeniden denemeye acik kalsin. */
        careerModelCacheV112.delete(key);
      }
      return result;
    } catch (e) {
      careerModelCacheV112.delete(key);
      throw e;
    }
  };
}

function roadmapErrorTextV120(data) {
  if (data?.roadmapOk === false) {
    return `Tarihsel model verisi alinamadi: ${data?.roadmapError || 'V11 roadmap servisi yanit vermedi.'} Bu durum %0 degildir.`;
  }
  if (data?.modelSchemaOk === false) {
    return `Model semasi eksik: ${data?.modelSchemaError || '1./2./3. derece nesnesi olusturulamadi.'}`;
  }
  return '';
}

/* 5-model ekrani: servis hatasini "karsilastirilabilir veri yok" diye gizleme. */
if (typeof modelPanelV112 === 'function') {
  const modelPanelBeforeV120 = modelPanelV112;
  modelPanelV112 = function(data, id, active) {
    const errorText = roadmapErrorTextV120(data);
    if (!errorText) return modelPanelBeforeV120(data, id, active);
    const def = typeof modelDefinitionV112 === 'function' ? modelDefinitionV112(id) : { label:id };
    return `<div class="career-model-panel-v112 ${active?'active':''}" data-career-model-panel="${escapeHtml(id)}">
      <div class="career-model-panel-head-v112"><b>${escapeHtml(def.label || id)}</b><span>veri alinamadi</span></div>
      <div class="career-model-empty-v112">⚠ ${escapeHtml(errorText)}</div>
    </div>`;
  };
}

/* Podium ana sirasi ham tam-kariyer benzerligidir; karar puani yalniz tani bilgisidir. */
if (typeof podiumRaceBodyV115 === 'function') {
  podiumRaceBodyV115 = function(data) {
    const errorText = roadmapErrorTextV120(data);
    return `
      <div class="podium-note-v115">
        1.lik adayi yalniz gecmis 1.lerle; 2.lik adayi yalniz gecmis 2.lerle; 3.luk adayi yalniz gecmis 3.lerle karsilastirilir.
        Ana sira referans yaristan onceki TAM kariyer yolunun ham benzerlik yuzdesidir; yillar ortalanmaz. Mod-içi karar puani yalniz yardimci tani bilgisidir.
      </div>
      ${errorText ? `<div class="podium-empty-v115">⚠ ${escapeHtml(errorText)}</div>` : ''}
      ${finishBlockPodiumV115(data, 1, true)}
      ${finishBlockPodiumV115(data, 2, false)}
      ${finishBlockPodiumV115(data, 3, false)}`;
  };
}

if (typeof modelRankingPodiumV115 === 'function') {
  modelBlockPodiumV115 = function(data, finish, modelId, open = false) {
    const label = (typeof PODIUM_MODEL_LABELS_V115 !== 'undefined' ? PODIUM_MODEL_LABELS_V115[modelId] : null) || modelId;
    const serviceError = roadmapErrorTextV120(data);
    const rows = serviceError ? [] : modelRankingPodiumV115(data, finish, modelId);
    const total = Array.isArray(data?.horses) ? data.horses.length : 0;
    const missing = Math.max(0, total - rows.length);
    const careerErrors = (Array.isArray(data?.horses) ? data.horses : []).filter(item => item?.careerError).length;
    const emptyText = serviceError || (careerErrors === total && total > 0
      ? 'Guncel atlarin kariyer verisi dogrulanamadi; bu nedenle derece modeli uretilmedi.'
      : `Bu modelde gecmis ${finish}. atlarin yaris oncesi TAM kariyer yolu ile dogrudan karsilastirma bulunamadi. Genel 5-model sirasi fallback olarak kopyalanmaz.`);

    return `
      <details class="podium-model-v115" ${open ? 'open' : ''}>
        <summary>
          <span>${escapeHtml(label)}</span>
          <span class="podium-model-leader-v115">${rows.length
            ? `${escapeHtml(rows[0].item?.horse?.no || '')}. ${escapeHtml(rows[0].item?.horse?.name || '')} · %${escapeHtml(rows[0].channel.score)} benzerlik`
            : (serviceError ? 'tarihsel servis hatasi' : `${finish}. sira icin dogrudan yol yok`)}</span>
        </summary>
        <div class="podium-ranking-list-v115">
          ${rows.length ? rows.map((row, index) => `
            <div class="podium-ranking-row-v115">
              <div class="podium-rank-v115">${index + 1}</div>
              <div class="podium-horse-v115">
                <b>${escapeHtml(row.item?.horse?.no || '')}. ${escapeHtml(row.item?.horse?.name || '-')}</b>
                <small>${escapeHtml(scoreMetaPodiumV115(row, modelId))}</small>
              </div>
              <div class="podium-score-v115">%${escapeHtml(row.channel.score)}<small>ham yol</small></div>
            </div>`).join('') : `<div class="podium-empty-v115">${escapeHtml(emptyText)}</div>`}
          ${missing > 0 && rows.length ? `<div class="podium-missing-v115">${escapeHtml(missing)} atta bu derece/model icin yeterli dogrudan tarihsel yol yok.</div>` : ''}
        </div>
      </details>`;
  };

  finishBlockPodiumV115 = function(data, finish, open = false) {
    const serviceError = roadmapErrorTextV120(data);
    const leader = serviceError ? null : (modelRankingPodiumV115(data, finish, 'composite')[0] || null);
    const medal = finish === 1 ? '🥇' : finish === 2 ? '🥈' : '🥉';
    const label = finish === 1 ? '1.LIK' : finish === 2 ? '2.LIK' : '3.LUK';
    return `
      <details class="podium-finish-v115" ${open ? 'open' : ''}>
        <summary>
          <span>${medal} ${label}</span>
          <span class="podium-finish-leader-v115">${leader
            ? `Bilesik: ${escapeHtml(leader.item?.horse?.no || '')}. ${escapeHtml(leader.item?.horse?.name || '')} · %${escapeHtml(leader.channel.score)}`
            : (serviceError ? 'Tarihsel model verisi alinamadi' : `Dogrudan ${finish}. sira yolu yok`)}</span>
        </summary>
        <div class="podium-finish-body-v115">
          ${modelBlockPodiumV115(data, finish, 'composite', true)}
          ${modelBlockPodiumV115(data, finish, 'exact')}
          ${modelBlockPodiumV115(data, finish, 'twin')}
          ${modelBlockPodiumV115(data, finish, 'family')}
          ${modelBlockPodiumV115(data, finish, 'career')}
        </div>
      </details>`;
  };
}

console.info('[AT AI]', MODEL_ROADMAP_RECOVERY_V120, 'aktif — null!=0, retry, cache/schema korumasi');