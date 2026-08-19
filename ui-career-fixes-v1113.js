/* AT AI Mobil — V11.13 UI / CAREER DATA-STATE FIXES
   - Kariyer istegi basarisizsa DEBUT denmez; VERI ALINAMADI olarak ayrilir.
   - Kisa kariyerlerde hizli TJK fallback tam sonucu verirse beklemeden kullanilir.
   - Ana sayfa Gunluk Program'daki Tumu sekmesi kaldirilir; tek kosu gosterilir.
   - Kariyer ekranindaki ikinci Tumu/Kosu pill satiri kaldirilir; ust secici tek kaynak olur.
   - Bahis turu secici aninda acilir, TJK baslangic yenilemesi arka planda yapilir.
   - 1/2/3 modelinde veri yok mesaji gercek nedeni daha acik anlatir.
   Puan formulleri ve sinif eslestirme kurallari DEGISTIRILMEZ.
*/

const UI_CAREER_FIX_V1113 = 'UI-CAREER-FIX-V11.13';

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
  const career = (input && typeof input === 'object') ? { ...input } : emptyCareerErrorV1113('Kariyer cevabı geçersiz.');
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
  const total = Number(totalRaw);
  const collected = Number(collectedRaw);
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
      } finally {
        clearTimeout(timer);
      }
    }
    return repairCareerModeV1113(typeof normalizeCareerResponse === 'function' ? normalizeCareerResponse(data) : data);
  } catch (e) {
    return emptyCareerErrorV1113(e?.message || 'Hızlı kariyer doğrulaması başarısız.');
  }
}

/* ---------------- CAREER FETCH: full + fast fallback in parallel ---------------- */
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

  if (first.value?.ok && careerCompleteV1113(first.value)) {
    return first.value;
  }

  const full = await fullPromise;
  if (full?.ok) return full;
  if (first.value?.ok) return first.value;
  return emptyCareerErrorV1113(`${full?.error || 'Tam kariyer alınamadı.'} | ${first.value?.error || 'Hızlı doğrulama alınamadı.'}`);
};

/* Stale hata/debut kariyerleri model cache'inden tekrar kullanma. */
const cachedCareerBeforeV1113 = typeof cachedCareerV11 === 'function' ? cachedCareerV11 : null;
if (cachedCareerBeforeV1113) {
  cachedCareerV11 = function(raceNo, horse) {
    const cached = cachedCareerBeforeV1113(raceNo, horse);
    if (!cached?.ok) return null;
    const repaired = repairCareerModeV1113(cached);
    return repaired.analysisMode === 'DATA_ERROR' ? null : repaired;
  };
}

/* Model katmanlarinda DATA_ERROR'in DEBUT'a geri cevrilmesini engelle. */
const analysisModeBeforeV1113 = typeof analysisModeV11 === 'function' ? analysisModeV11 : null;
if (analysisModeBeforeV1113) {
  analysisModeV11 = function(career = {}) {
    const repaired = repairCareerModeV1113(career);
    if (repaired.analysisMode === 'DATA_ERROR') return 'DATA_ERROR';
    return analysisModeBeforeV1113(repaired);
  };
}

const modeLabelBeforeV1113 = typeof modeLabelV11 === 'function' ? modeLabelV11 : null;
if (modeLabelBeforeV1113) {
  modeLabelV11 = function(mode) {
    if (mode === 'DATA_ERROR') return 'Veri alınamadı';
    return modeLabelBeforeV1113(mode);
  };
}

const careerModeBeforeV1113 = typeof careerModeV104 === 'function' ? careerModeV104 : null;
if (careerModeBeforeV1113) {
  careerModeV104 = function(item) {
    if (!item?.horse?.id || !item?.career?.ok) return 'DATA_ERROR';
    const repaired = repairCareerModeV1113(item.career);
    if (repaired.analysisMode === 'DATA_ERROR') return 'DATA_ERROR';
    return repaired.analysisMode || careerModeBeforeV1113(item);
  };
}

const modeLabelV104BeforeV1113 = typeof modeLabelV104 === 'function' ? modeLabelV104 : null;
if (modeLabelV104BeforeV1113) {
  modeLabelV104 = function(mode) {
    if (mode === 'DATA_ERROR') return 'Veri alınamadı';
    return modeLabelV104BeforeV1113(mode);
  };
}

/* V10.4 accordion: veri hatasi artik debut grubuna girmez ve kaybolmaz. */
if (typeof careerGroupHtmlV104 === 'function' && typeof careerHorseHtml === 'function') {
  careerRaceAccordionHtml = function(race, forceOpen) {
    const horses = Array.isArray(race?.horses) ? [...race.horses] : [];
    const winPath = horses.filter(item => careerModeV104(item) === 'WIN_PATH');
    const prepPath = horses.filter(item => careerModeV104(item) === 'PREPARATION_PATH');
    const debut = horses.filter(item => careerModeV104(item) === 'DEBUT');
    const dataError = horses.filter(item => careerModeV104(item) === 'DATA_ERROR');

    return `
      <details ${forceOpen ? 'open' : ''} class="career-race-accordion-v104">
        <summary class="career-race-summary-v104">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
            <div style="min-width:0;">
              <div style="font-size:16px;font-weight:800;">${escapeHtml(race.no)}. KOŞU</div>
              <div class="career-full-meta-v1113">
                ${escapeHtml(race.class || race.meta?.class || '-')} ·
                ${escapeHtml(race.ageGroup || race.meta?.ageGroup || '-')} ·
                ${escapeHtml(race.distance || race.meta?.distance || '-')} ${escapeHtml(race.track || race.meta?.track || '')}
              </div>
            </div>
            <div style="font-size:11px;opacity:.72;text-align:right;white-space:nowrap;">
              ${winPath.length ? `Galibiyet ${winPath.length}` : ''}
              ${prepPath.length ? `${winPath.length ? '<br>' : ''}Hazırlık ${prepPath.length}` : ''}
              ${debut.length ? `${winPath.length || prepPath.length ? '<br>' : ''}Debut ${debut.length}` : ''}
              ${dataError.length ? `${winPath.length || prepPath.length || debut.length ? '<br>' : ''}Veri hatası ${dataError.length}` : ''} ▾
            </div>
          </div>
        </summary>
        <div class="career-race-body-v104">
          ${race.roadmapError ? `<div style="margin:8px 0;padding:9px;border-radius:8px;background:rgba(245,158,11,.10);font-size:11px;">Tarihsel yol üretilemedi: ${escapeHtml(race.roadmapError)}</div>` : ''}
          ${careerGroupHtmlV104('GALİBİYET YOLU SIRALAMASI', 'Yalnız kariyerinde gerçek galibiyeti bulunan atlar; kendi aralarında sıralanır.', winPath, 'win-path-v104')}
          ${careerGroupHtmlV104('HAZIRLIK / İLK 5 YOLU SIRALAMASI', 'Galibiyeti olmayan fakat doğrulanmış yarış geçmişi bulunan atlar.', prepPath, 'prep-path-v104')}
          ${careerGroupHtmlV104('DEBUT / KARİYER YOLU YOK', 'Yalnız doğrulanmış şekilde hedef tarihten önce hiç yarışı olmayan atlar.', debut, 'debut-path-v104')}
          ${careerGroupHtmlV104('VERİ ALINAMADI', 'Bu at debut değildir. TJK kariyer verisi doğrulanamadığı için kariyer yüzdesi üretilmedi; yeniden hesaplanabilir.', dataError, 'data-error-path-v1113')}
          ${!horses.length ? `<div style="padding:12px;opacity:.7;">Bu koşunun kariyer verisi yeniden hesaplanmalıdır.</div>` : ''}
        </div>
      </details>`;
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

/* Eski localStorage ve V11.2 model cache'i false DEBUT tasimasin. */
try {
  if (state?.analyses?.career && Object.keys(state.analyses.career).length && state.analyses.career.dataStateFixVersion !== UI_CAREER_FIX_V1113) {
    state.analyses.career = {};
    save();
  }
  if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear();
} catch (e) {
  console.warn('[AT AI] V11.13 eski kariyer cache temizliği:', e);
}

/* Kariyer hesaplamasi bittikten sonra data-state'i son kez kilitle ve ekrani yenile. */
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

/* ---------------- DAILY PROGRAM: remove Tumu, show one race at a time ---------------- */
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
  const allTab = $('raceTabs')?.querySelector('[data-race="all"]');
  if (allTab) allTab.remove();
};

/* ---------------- CAREER UI: one race selector only ---------------- */
function cleanupCareerUiV1113() {
  const content = $('analysisContent');
  if (!content) return;
  content.querySelectorAll('.career-race-pills').forEach(el => el.remove());
}

const renderCareerBeforeV1113 = renderCareerAnalysis;
renderCareerAnalysis = function(result, raceFilter = null) {
  const repaired = repairStoredCareerV1113(result);
  const out = renderCareerBeforeV1113(repaired, raceFilter);
  cleanupCareerUiV1113();
  return out;
};

/* ---------------- PODIUM: no-data explanation, no hidden fallback ---------------- */
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

    return `
      <details class="podium-model-v115" ${open ? 'open' : ''}>
        <summary>
          <span>${escapeHtml(label)}</span>
          <span class="podium-model-leader-v115">${rows.length
            ? `${escapeHtml(rows[0].item?.horse?.no || '')}. ${escapeHtml(rows[0].item?.horse?.name || '')} · ${escapeHtml(rows[0].channel.score)} puan`
            : `${finish}. sıra için doğrudan yol yok`}</span>
        </summary>
        <div class="podium-ranking-list-v115">
          ${rows.length ? rows.map((row, index) => `
            <div class="podium-ranking-row-v115">
              <div class="podium-rank-v115">${index + 1}</div>
              <div class="podium-horse-v115"><b>${escapeHtml(row.item?.horse?.no || '')}. ${escapeHtml(row.item?.horse?.name || '-')}</b><small>${escapeHtml(scoreMetaPodiumV115(row, modelId))}</small></div>
              <div class="podium-score-v115">${escapeHtml(row.channel.score)}<small>puan</small></div>
            </div>`).join('') : `<div class="podium-empty-v115">${escapeHtml(emptyText)}</div>`}
          ${missing > 0 && rows.length ? `<div class="podium-missing-v115">${escapeHtml(missing)} atta bu derece/model için yeterli doğrudan tarihsel yol yok.</div>` : ''}
        </div>
      </details>`;
  };

  finishBlockPodiumV115 = function(data, finish, open = false) {
    const leader = modelRankingPodiumV115(data, finish, 'composite')[0] || null;
    const medal = finish === 1 ? '🥇' : finish === 2 ? '🥈' : '🥉';
    const label = finish === 1 ? '1.LİK' : finish === 2 ? '2.LİK' : '3.LÜK';
    return `
      <details class="podium-finish-v115" ${open ? 'open' : ''}>
        <summary>
          <span>${medal} ${label}</span>
          <span class="podium-finish-leader-v115">${leader
            ? `Bileşik: ${escapeHtml(leader.item?.horse?.no || '')}. ${escapeHtml(leader.item?.horse?.name || '')} · ${escapeHtml(leader.channel.score)}`
            : `Doğrudan ${finish}. sıra yolu yok`}</span>
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

/* ---------------- MANUAL BET SHEET: render first, refresh second ---------------- */
function currentAvailableBetsV1113() {
  return (Array.isArray(BET_TYPES) ? BET_TYPES : [])
    .map(type => ({ type, plan: typeof resolveBetStartV11 === 'function' ? resolveBetStartV11(type) : { ok:false } }))
    .filter(item => item.plan?.ok);
}

function manualBetRowsV1113(bets) {
  return bets.length
    ? bets.map(({type,plan}) => `
        <button type="button" class="manual-sheet-row-v117 ${type === manualTicketV117.betType ? 'selected' : ''}" data-manual-bet="${escapeHtml(type)}">
          <div><b>${escapeHtml(type)}</b><small>${escapeHtml(plan.startRace)}. koşudan başlar · ${escapeHtml(legRangeTextV117(plan))}</small></div><span>›</span>
        </button>`).join('')
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

  const bets = currentAvailableBetsV1113();
  const sheet = document.createElement('div');
  sheet.id = 'manualBetSheetV117';
  sheet.className = 'manual-bet-sheet-wrap-v117';
  sheet.innerHTML = `
    <div class="manual-bet-sheet-backdrop-v117" data-close-manual-bet></div>
    <section class="manual-bet-sheet-v117" role="dialog" aria-modal="true" aria-label="Bahis türü seçimi">
      <div class="manual-sheet-grip-v117"></div>
      <div class="manual-sheet-title-v117">Bahis Türünü Seç</div>
      <div class="manual-sheet-list-v117">${manualBetRowsV1113(bets)}</div>
    </section>`;
  document.body.appendChild(sheet);
  document.body.classList.add('manual-sheet-open-v117');
  bindManualBetRowsV1113(sheet);

  /* Ağ isteği paneli bloke etmez. */
  if (typeof refreshBetStartsV11 === 'function') {
    Promise.resolve(refreshBetStartsV11())
      .then(() => {
        const current = $('manualBetSheetV117');
        if (!current) return;
        const refreshed = currentAvailableBetsV1113();
        const list = current.querySelector('.manual-sheet-list-v117');
        if (list) list.innerHTML = manualBetRowsV1113(refreshed);
        bindManualBetRowsV1113(current);
        status(refreshed.length ? `${refreshed.length} resmi bahis başlangıcı bulundu.` : 'Desteklenen resmi bahis başlangıcı bulunamadı.');
      })
      .catch(e => status(`Bahis başlangıçları yenilenemedi: ${e?.message || 'TJK yanıt vermedi.'}`));
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

console.info('[AT AI]', UI_CAREER_FIX_V1113, 'aktif');
