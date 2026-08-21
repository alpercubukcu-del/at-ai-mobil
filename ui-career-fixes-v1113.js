/* AT AI Mobil — V11.13 CAREER DATA-STATE / ACTIVE UI GUARDS (pruned)
   V13.9 final Career renderer supersedes the old V10.4 accordion/pill renderer.
   This file keeps only active data-state, fetch, podium, daily-program and manual-bet behavior.
   Puan formulleri ve sinif eslestirme kurallari DEGISTIRILMEZ. */

const UI_CAREER_FIX_V1113 = 'UI-CAREER-FIX-V11.13-PRUNED';

function emptyCareerErrorV1113(message, errorType = 'RETRIEVAL_ERROR') {
  return {
    ok:false,
    dataState:'ERROR',
    errorType,
    error:message || 'Kariyer verisi alınamadı.',
    analysisMode:'DATA_ERROR',
    roadmap:[], wins:[], top5:[], preparationPath:[], history:[], recentForm:[], races:[],
    summary:{ totalTop5:0, totalWins:0, first:0, second:0, third:0, fourth:0, fifth:0 }
  };
}

function careerRowsV1113(career = {}) {
  if (Array.isArray(career.history) && career.history.length) return career.history;
  if (Array.isArray(career.roadmap) && career.roadmap.length) return career.roadmap;
  if (Array.isArray(career.top5) && career.top5.length) return career.top5;
  return [];
}

function repairCareerModeV1113(input = {}) {
  const career = input && typeof input === 'object' ? { ...input } : emptyCareerErrorV1113('Kariyer cevabı geçersiz.');
  if (!career.ok) {
    career.analysisMode = 'DATA_ERROR';
    career.dataState = 'ERROR';
    return career;
  }

  const rows = careerRowsV1113(career);
  const wins = Array.isArray(career.wins)
    ? career.wins.filter(row => Number(row?.finish ?? row?.rank ?? row?.sira) === 1)
    : rows.filter(row => Number(row?.finish ?? row?.rank ?? row?.sira) === 1);
  const frozenTotalRaw = career?.counts?.frozenCareerTotal;
  const frozenTotal = Number(frozenTotalRaw);
  const hasFrozenTotal = frozenTotalRaw !== null && frozenTotalRaw !== undefined && frozenTotalRaw !== '' && Number.isFinite(frozenTotal);

  if (wins.length) {
    career.analysisMode = 'WIN_PATH';
    career.dataState = career.dataState || 'OK';
    return career;
  }
  if (rows.length || (hasFrozenTotal && frozenTotal > 0)) {
    career.analysisMode = 'PREPARATION_PATH';
    career.dataState = career.dataState || 'OK';
    return career;
  }

  const explicitDebut = career.analysisMode === 'DEBUT';
  const validZero = hasFrozenTotal && frozenTotal === 0 && career?.validation?.valid !== false;
  const careerTotalRaw = career?.audit?.careerTotal ?? career?.counts?.tjkCareerTotal;
  const careerTotal = Number(careerTotalRaw);
  const knownZero = careerTotalRaw !== null && careerTotalRaw !== undefined && careerTotalRaw !== '' && Number.isFinite(careerTotal) && careerTotal === 0;

  if (validZero || (explicitDebut && knownZero)) {
    career.analysisMode = 'DEBUT';
    career.dataState = career.dataState || 'OK';
    return career;
  }

  career.analysisMode = 'DATA_ERROR';
  career.dataState = 'ERROR';
  career.error = career.error || 'TJK geçmişi doğrulanamadı; boş cevap debut kabul edilmedi.';
  return career;
}

function careerCompleteV1113(career = {}) {
  if (!career?.ok) return false;
  const totalRaw = career?.audit?.careerTotal ?? career?.counts?.tjkCareerTotal;
  const collectedRaw = career?.audit?.collectedTotal ?? career?.counts?.collectedTotal;
  const total = Number(totalRaw), collected = Number(collectedRaw);
  if (totalRaw !== null && totalRaw !== undefined && totalRaw !== '' && Number.isFinite(total)) {
    return Number.isFinite(collected) && collected >= total;
  }
  return career?.audit?.coverageStatus === 'TAM' || career?.validation?.coverageStatus === 'TAM';
}

async function fetchCareerFallbackV1113(horseId, before) {
  const url = `/api/tjk-career-fallback-v1113?horseId=${encodeURIComponent(horseId)}&before=${encodeURIComponent(before || '')}`;
  try {
    let data;
    if (typeof atAiFetchJsonV1111 === 'function') {
      data = await atAiFetchJsonV1111(url, 15000, 'Kariyer hızlı doğrulama');
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(url, { cache:'no-store', headers:{ accept:'application/json' }, signal:controller.signal });
        data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || `API ${res.status}`);
      } finally { clearTimeout(timer); }
    }
    return repairCareerModeV1113(typeof normalizeCareerResponse === 'function' ? normalizeCareerResponse(data) : data);
  } catch (e) {
    return emptyCareerErrorV1113(e?.message || 'Hızlı kariyer doğrulaması başarısız.');
  }
}

/* Tam kariyer + hızlı doğrulama paralel; başarılı/tam cevap tercih edilir. */
const fetchCareerBeforeV1113 = fetchCareer;
fetchCareer = async function(horseId, before) {
  if (!horseId) return emptyCareerErrorV1113('TJK At ID bulunamadı.', 'INPUT');
  const fullPromise = Promise.resolve()
    .then(() => fetchCareerBeforeV1113(horseId, before))
    .then(repairCareerModeV1113)
    .catch(e => emptyCareerErrorV1113(e?.message || 'Tam kariyer sorgusu başarısız.'));
  const fastPromise = fetchCareerFallbackV1113(horseId, before);
  const first = await Promise.race([
    fullPromise.then(value => ({ source:'full', value })),
    fastPromise.then(value => ({ source:'fast', value }))
  ]);
  if (first.source === 'full') {
    if (first.value?.ok) return first.value;
    const fast = await fastPromise;
    return fast?.ok ? fast : emptyCareerErrorV1113(`${first.value?.error || 'Tam kariyer alınamadı.'} | ${fast?.error || 'Hızlı doğrulama alınamadı.'}`);
  }
  if (first.value?.ok && careerCompleteV1113(first.value)) return first.value;
  const full = await fullPromise;
  if (full?.ok) return full;
  if (first.value?.ok) return first.value;
  return emptyCareerErrorV1113(`${full?.error || 'Tam kariyer alınamadı.'} | ${first.value?.error || 'Hızlı doğrulama alınamadı.'}`);
};

/* Stale hata/debut kariyerlerini model cache'inden tekrar kullanma. */
const cachedCareerBeforeV1113 = typeof cachedCareerV11 === 'function' ? cachedCareerV11 : null;
if (cachedCareerBeforeV1113) {
  cachedCareerV11 = function(raceNo, horse) {
    const cached = cachedCareerBeforeV1113(raceNo, horse);
    if (!cached?.ok) return null;
    const repaired = repairCareerModeV1113(cached);
    return repaired.analysisMode === 'DATA_ERROR' ? null : repaired;
  };
}

const analysisModeBeforeV1113 = typeof analysisModeV11 === 'function' ? analysisModeV11 : null;
if (analysisModeBeforeV1113) {
  analysisModeV11 = function(career = {}) {
    const repaired = repairCareerModeV1113(career);
    return repaired.analysisMode === 'DATA_ERROR' ? 'DATA_ERROR' : analysisModeBeforeV1113(repaired);
  };
}

const modeLabelBeforeV1113 = typeof modeLabelV11 === 'function' ? modeLabelV11 : null;
if (modeLabelBeforeV1113) {
  modeLabelV11 = function(mode) {
    return mode === 'DATA_ERROR' ? 'Veri alınamadı' : modeLabelBeforeV1113(mode);
  };
}

function repairStoredCareerV1113(result) {
  if (!result || !Array.isArray(result.races)) return result;
  for (const race of result.races) {
    for (const item of Array.isArray(race?.horses) ? race.horses : []) {
      item.career = repairCareerModeV1113(item.career || {});
      const mode = item.career.analysisMode;
      if (!item.galibiyetBenzerligi || typeof item.galibiyetBenzerligi !== 'object') {
        item.galibiyetBenzerligi = { score:null, byYear:[], referenceCount:0 };
      }
      item.galibiyetBenzerligi.analysisMode = mode;
      if (mode === 'DATA_ERROR') {
        item.galibiyetBenzerligi.score = null;
        item.galibiyetBenzerligi.strongest = null;
        item.galibiyetBenzerligi.method = 'DATA_ERROR_NO_FALSE_DEBUT_V1113';
        item.galibiyetBenzerligi.byYear = (Array.isArray(item.galibiyetBenzerligi.byYear) ? item.galibiyetBenzerligi.byYear : []).map(row => ({
          ...row, score:null, error:'Kariyer verisi doğrulanamadı; bu durum debut değildir.'
        }));
      }
    }
  }
  result.dataStateFixVersion = UI_CAREER_FIX_V1113;
  return result;
}

try {
  if (state?.analyses?.career && Object.keys(state.analyses.career).length && state.analyses.career.dataStateFixVersion !== UI_CAREER_FIX_V1113) {
    state.analyses.career = {};
    save();
  }
  if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear();
} catch (e) { console.warn('[AT AI] V11.13 eski kariyer cache temizliği:', e); }

const runCareerBeforeV1113 = runCareerAnalysis;
runCareerAnalysis = async function(selectedRaces, raceValue) {
  const out = await runCareerBeforeV1113(selectedRaces, raceValue);
  const result = repairStoredCareerV1113(state?.analyses?.career);
  if (result) {
    state.analyses.career = result;
    save();
    try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}
    renderCareerAnalysis(result, raceValue);
  }
  return out;
};

/* Günlük program: Tümü sekmesi yok; tek koşu. */
const renderProgramBeforeV1113 = renderProgram;
renderProgram = function() {
  const races = Array.isArray(state.races) ? state.races : [];
  if (races.length) {
    const valid = races.some(race => String(race.no) === String(state.selectedRace));
    if (!valid || state.selectedRace === 'all') {
      state.selectedRace = String(races[0].no);
      save();
    }
  }
  renderProgramBeforeV1113();
  $('raceTabs')?.querySelector('[data-race="all"]')?.remove();
};

/* Podium: veri yoksa gizli genel sıralama fallback'i kullanma. */
if (typeof modelRankingPodiumV115 === 'function') {
  modelBlockPodiumV115 = function(data, finish, modelId, open = false) {
    const rows = modelRankingPodiumV115(data, finish, modelId);
    const label = (typeof PODIUM_MODEL_LABELS_V115 !== 'undefined' ? PODIUM_MODEL_LABELS_V115[modelId] : null) || modelId;
    const total = Array.isArray(data?.horses) ? data.horses.length : 0;
    const missing = Math.max(0, total - rows.length);
    const careerErrors = (Array.isArray(data?.horses) ? data.horses : []).filter(item => item?.careerError).length;
    const emptyText = careerErrors === total && total > 0
      ? 'Güncel atların kariyer verisi doğrulanamadı; bu nedenle derece modeli üretilmedi.'
      : `Bu modelde geçmiş ${finish}. atların yarış öncesi karşılaştırılabilir kariyer yolu bulunamadı. Genel 5-model sırası buraya gizli fallback olarak kopyalanmaz.`;
    return `<details class="podium-model-v115" ${open ? 'open' : ''}><summary><span>${escapeHtml(label)}</span><span class="podium-model-leader-v115">${rows.length ? `${escapeHtml(rows[0].item?.horse?.no || '')}. ${escapeHtml(rows[0].item?.horse?.name || '')} · ${escapeHtml(rows[0].channel.score)} puan` : `${finish}. sıra için doğrudan yol yok`}</span></summary><div class="podium-ranking-list-v115">${rows.length ? rows.map((row,index)=>`<div class="podium-ranking-row-v115"><div class="podium-rank-v115">${index+1}</div><div class="podium-horse-v115"><b>${escapeHtml(row.item?.horse?.no || '')}. ${escapeHtml(row.item?.horse?.name || '-')}</b><small>${escapeHtml(scoreMetaPodiumV115(row, modelId))}</small></div><div class="podium-score-v115">${escapeHtml(row.channel.score)}<small>puan</small></div></div>`).join('') : `<div class="podium-empty-v115">${escapeHtml(emptyText)}</div>`}${missing > 0 && rows.length ? `<div class="podium-missing-v115">${escapeHtml(missing)} atta bu derece/model için yeterli doğrudan tarihsel yol yok.</div>` : ''}</div></details>`;
  };

  finishBlockPodiumV115 = function(data, finish, open = false) {
    const leader = modelRankingPodiumV115(data, finish, 'composite')[0] || null;
    const medal = finish === 1 ? '🥇' : finish === 2 ? '🥈' : '🥉';
    const label = finish === 1 ? '1.LİK' : finish === 2 ? '2.LİK' : '3.LÜK';
    return `<details class="podium-finish-v115" ${open ? 'open' : ''}><summary><span>${medal} ${label}</span><span class="podium-finish-leader-v115">${leader ? `Bileşik: ${escapeHtml(leader.item?.horse?.no || '')}. ${escapeHtml(leader.item?.horse?.name || '')} · ${escapeHtml(leader.channel.score)}` : `Doğrudan ${finish}. sıra yolu yok`}</span></summary><div class="podium-finish-body-v115">${modelBlockPodiumV115(data,finish,'composite',true)}${modelBlockPodiumV115(data,finish,'exact')}${modelBlockPodiumV115(data,finish,'twin')}${modelBlockPodiumV115(data,finish,'family')}${modelBlockPodiumV115(data,finish,'career')}</div></details>`;
  };
}

/* Manuel bahis paneli önce açılır, TJK resmi başlangıç yenilemesi arka planda yapılır. */
function currentAvailableBetsV1113() {
  return (Array.isArray(BET_TYPES) ? BET_TYPES : [])
    .map(type => ({ type, plan: typeof resolveBetStartV11 === 'function' ? resolveBetStartV11(type) : { ok:false } }))
    .filter(item => item.plan?.ok);
}

function manualBetRowsV1113(bets) {
  return bets.length
    ? bets.map(({type,plan}) => `<button type="button" class="manual-sheet-row-v117 ${type === manualTicketV117.betType ? 'selected' : ''}" data-manual-bet="${escapeHtml(type)}"><div><b>${escapeHtml(type)}</b><small>${escapeHtml(plan.startRace)}. koşudan başlar · ${escapeHtml(legRangeTextV117(plan))}</small></div><span>›</span></button>`).join('')
    : '<div class="manual-sheet-empty-v117"><b>Bahis seçenekleri hazırlanıyor…</b><br><small>TJK resmi başlangıçları arka planda kontrol ediliyor.</small></div>';
}

function bindManualBetRowsV1113(sheet) {
  if (!sheet) return;
  sheet.querySelectorAll('[data-close-manual-bet]').forEach(el => el.onclick = closeBetSheetV117);
  sheet.querySelectorAll('[data-manual-bet]').forEach(btn => btn.onclick = async () => {
    manualTicketV117.betType = btn.dataset.manualBet || '';
    closeBetSheetV117();
    await prepareManualTicketV117(true);
  });
}

openBetSheetV117 = function() {
  if (manualTicketV117.busy) return;
  $('manualBetSheetV117')?.remove();
  const sheet = document.createElement('div');
  sheet.id = 'manualBetSheetV117';
  sheet.className = 'manual-bet-sheet-wrap-v117';
  sheet.innerHTML = `<div class="manual-bet-sheet-backdrop-v117" data-close-manual-bet></div><section class="manual-bet-sheet-v117" role="dialog" aria-modal="true" aria-label="Bahis türü seçimi"><div class="manual-sheet-grip-v117"></div><div class="manual-sheet-title-v117">Bahis Türünü Seç</div><div class="manual-sheet-list-v117">${manualBetRowsV1113(currentAvailableBetsV1113())}</div></section>`;
  document.body.appendChild(sheet);
  document.body.classList.add('manual-sheet-open-v117');
  bindManualBetRowsV1113(sheet);

  if (typeof refreshBetStartsV11 === 'function') {
    Promise.resolve(refreshBetStartsV11()).then(() => {
      const current = $('manualBetSheetV117');
      if (!current) return;
      const refreshed = currentAvailableBetsV1113();
      const list = current.querySelector('.manual-sheet-list-v117');
      if (list) list.innerHTML = manualBetRowsV1113(refreshed);
      bindManualBetRowsV1113(current);
      status(refreshed.length ? `${refreshed.length} resmi bahis başlangıcı bulundu.` : 'Desteklenen resmi bahis başlangıcı bulunamadı.');
    }).catch(e => status(`Bahis başlangıçları yenilenemedi: ${e?.message || 'TJK yanıt vermedi.'}`));
  }
};

function upgradeManualBetButtonV1113() {
  const btn = $('manualBetTypeBtnV117');
  if (!btn) return;
  btn.onclick = openBetSheetV117;
  const old = btn.querySelector('strong');
  if (old) {
    old.className = 'manual-bet-chevron-v1113';
    old.textContent = '▾';
    old.setAttribute('aria-hidden', 'true');
  }
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-label', 'Bahis türünü seç');
}

upgradeManualBetButtonV1113();
if (Array.isArray(state.races) && state.races.length) renderProgram();
console.info('[AT AI]', UI_CAREER_FIX_V1113, 'aktif — eski V10.4 Kariyer UI katmanı ayıklandı');
