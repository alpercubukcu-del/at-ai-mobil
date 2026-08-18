/* AT AI Mobil — Adaptive Historical Path V10.4
   V10.2 TJK class aliaslari korunur.
   V10.4: at bazli accordion detaylari geri getirir, Galibiyet/Hazirlik yollarini
   ayni siralamada karistirmaz ve analiz dialogu acikken arka sayfayi kilitler. */

const ADAPTIVE_HISTORY_ALIAS_VERSION = 'ADAPTIVE-HISTORY-UI-V10.2';
const CAREER_HORSE_ACCORDION_VERSION = 'CAREER-HORSE-ACCORDION-V10.4';
const CAREER_MODE_RANK_VERSION = 'CAREER-MODE-RANK-V10.4';
const ANALYSIS_DIALOG_VERSION = 'ANALYSIS-DIALOG-FULLSCREEN-V10.4';
const runCareerAnalysisV101 = runCareerAnalysis;
const openAnalysisBeforeV104 = openAnalysis;

fetchHistoricalRoadmap = async function(meta) {
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu koşulları eksik.' };
  try {
    const url =
      `/api/tjk-adaptive-roadmap-v102` +
      `?date=${encodeURIComponent(state.date)}` +
      `&city=${encodeURIComponent(getCityName())}` +
      `&class=${encodeURIComponent(meta.class || '')}` +
      `&ageGroup=${encodeURIComponent(meta.ageGroup || '')}` +
      `&track=${encodeURIComponent(meta.track || '')}` +
      `&distance=${encodeURIComponent(meta.distance || '')}` +
      `&minYear=2000&t=${Date.now()}`;
    const res = await fetch(url, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) return { ok:false, error:data?.error || `API ${res.status}` };
    return data;
  } catch (e) {
    return { ok:false, error:e?.message || 'TJK sınıf aliaslarıyla yıllık tarihsel yol haritası alınamadı.' };
  }
};

isValidCareerCache = function(cached) {
  return Boolean(
    cached &&
    cached.version === CAREER_UI_VERSION &&
    cached.exactHistoryV9 === true &&
    cached.adaptiveHistoryV10 === true &&
    cached.adaptiveHistoryV101 === true &&
    cached.adaptiveHistoryV102 === true &&
    cached.date === state.date &&
    String(cached.city) === String(state.city) &&
    Array.isArray(cached.races) && cached.races.length &&
    cached.races.every(race => race && Array.isArray(race.horses) && race.horses.every(item => item?.galibiyetBenzerligi && Array.isArray(item.galibiyetBenzerligi.byYear)))
  );
};

if (state?.analyses?.career && !state.analyses.career.adaptiveHistoryV102) {
  state.analyses.career = {};
  save();
}

runCareerAnalysis = async function(selectedRaces, raceValue) {
  await runCareerAnalysisV101(selectedRaces, raceValue);
  if (state?.analyses?.career) {
    state.analyses.career.adaptiveHistoryV102 = true;
    state.analyses.career.patchVersion = ADAPTIVE_HISTORY_ALIAS_VERSION;
    state.analyses.career.roadmapApiVersion = 'TJK-ADAPTIVE-ROADMAP-V10.2';
    state.analyses.career.careerAccordionVersion = CAREER_HORSE_ACCORDION_VERSION;
    state.analyses.career.careerRankingVersion = CAREER_MODE_RANK_VERSION;
    state.analyses.career.similarityNote = 'Her yıl ayrı ±45 gün taranır. TJK sınıf aliasları kanonikleştirilir. Galibiyet Yolu ve Hazırlık/İlk 5 Yolu farklı analiz ölçekleridir ve aynı sıralamada birbirine karşı kullanılmaz.';
    save();
  }
};

/* =========================================================
   V10.4 — ANALIZ MODU VE MOD-ICI SIRALAMA
   WIN_PATH ile PREPARATION_PATH yuzdeleri ayni olcek degildir.
   Her grup kendi icinde siralanir. Ana yillik skor korunur;
   esitte cok-yilli destek sadece tie-break olarak kullanilir.
========================================================= */

function careerModeV104(item) {
  const explicit = item?.galibiyetBenzerligi?.analysisMode || item?.career?.analysisMode;
  if (explicit === 'WIN_PATH' || explicit === 'PREPARATION_PATH' || explicit === 'DEBUT') return explicit;
  const roadmap = Array.isArray(item?.career?.roadmap) ? item.career.roadmap : [];
  return typeof adaptiveCurrentMode === 'function' ? adaptiveCurrentMode(roadmap) : 'DEBUT';
}

function modeLabelV104(mode) {
  if (mode === 'WIN_PATH') return 'Galibiyet Yolu';
  if (mode === 'PREPARATION_PATH') return 'Hazırlık / İlk 5 Yolu';
  return 'Debut';
}

function supportMetricsV104(item) {
  const rows = Array.isArray(item?.galibiyetBenzerligi?.byYear)
    ? item.galibiyetBenzerligi.byYear
        .filter(row => row?.score !== null && row?.score !== undefined && Number.isFinite(Number(row.score)))
        .sort((a,b) => Number(b?.year || 0) - Number(a?.year || 0))
    : [];
  const strongest = Number(item?.galibiyetBenzerligi?.score);
  return {
    score: Number.isFinite(strongest) ? strongest : -1,
    strongYears: rows.filter(row => Number(row.score) >= 85).length,
    supportYears: rows.filter(row => Number(row.score) >= 70).length,
    scoredYears: rows.length,
    latestScore: rows.length ? Number(rows[0].score) : -1
  };
}

function sortCareerGroupV104(a, b) {
  const ma = supportMetricsV104(a);
  const mb = supportMetricsV104(b);
  if (mb.score !== ma.score) return mb.score - ma.score;
  if (mb.strongYears !== ma.strongYears) return mb.strongYears - ma.strongYears;
  if (mb.supportYears !== ma.supportYears) return mb.supportYears - ma.supportYears;
  if (mb.latestScore !== ma.latestScore) return mb.latestScore - ma.latestScore;
  if (mb.scoredYears !== ma.scoredYears) return mb.scoredYears - ma.scoredYears;
  return Number(a?.horse?.no || 999) - Number(b?.horse?.no || 999);
}

/* =========================================================
   V10.4 — AT BAZLI ACCORDION + TAM DETAY
   Kapali: kisa ozet.
   Acik: yillara gore tarihsel yol + en guclu yol + kariyer ozeti + tam tablo.
========================================================= */

careerHorseHtml = function(item, similarityRank = null) {
  const horse = item?.horse;
  const career = item?.career;
  const sim = item?.galibiyetBenzerligi || {};
  if (!horse) return '';

  const mode = careerModeV104(item);
  const modeLabel = modeLabelV104(mode);
  const hasScore = sim.score !== null && sim.score !== undefined && sim.score !== '' && Number.isFinite(Number(sim.score));
  const roadmap = Array.isArray(career?.roadmap) ? career.roadmap : [];
  const summary = normalizeCareerSummary(career || {}, roadmap);
  const metrics = supportMetricsV104(item);

  const compactScore = hasScore
    ? `<div style="font-size:18px;font-weight:900;line-height:1;color:#7ee2a8;">%${escapeHtml(sim.score)}</div>`
    : `<div style="font-size:18px;font-weight:800;line-height:1;opacity:.55;">—</div>`;

  const statusLine = !horse.id
    ? 'TJK At ID bulunamadı'
    : !career?.ok
      ? 'Kariyer verisi alınamadı'
      : `${escapeHtml(modeLabel)} · İlk 5: ${escapeHtml(summary.totalTop5)} · 1: ${escapeHtml(summary.first)} · 2: ${escapeHtml(summary.second)} · 3: ${escapeHtml(summary.third)}`;

  let detailBody = '';
  if (!horse.id) {
    detailBody = `<div class="career-horse-detail-v104">${yearSimilarityHtml(sim)}<div style="padding:10px 0;opacity:.72;">TJK At ID bulunamadığı için kariyer alınamadı.</div></div>`;
  } else if (!career?.ok) {
    detailBody = `<div class="career-horse-detail-v104">${yearSimilarityHtml(sim)}<div style="padding:10px 0;opacity:.72;">Kariyer verisi alınamadı: ${escapeHtml(career?.error || 'Bilinmeyen hata')}</div></div>`;
  } else {
    const strongest = sim?.strongest;
    detailBody = `
      <div class="career-horse-detail-v104">
        ${yearSimilarityHtml(sim)}
        ${strongest ? `
          <div style="margin-top:8px;padding:8px 9px;border-radius:8px;background:rgba(126,226,168,.08);font-size:11px;line-height:1.5;">
            En güçlü yıllık tarihsel yol:
            <b>${escapeHtml(strongest.year || '')}</b> ·
            <b>${escapeHtml(strongest.historicalHorse || '')}</b> ·
            geçmişte <b>${escapeHtml(strongest.historicalFinish || '')}.</b> ·
            <b>%${escapeHtml(strongest.score)}</b>
          </div>
        ` : ''}
        ${metrics.scoredYears ? `
          <div style="margin-top:8px;padding:7px 9px;border-radius:8px;background:rgba(114,213,255,.06);font-size:11px;line-height:1.45;">
            Çok-yıllı destek özeti: <b>${metrics.scoredYears}</b> değerlendirilebilir yıl ·
            <b>${metrics.strongYears}</b> güçlü (≥%85) · <b>${metrics.supportYears}</b> destek (≥%70).
            Bu özet yalnız aynı analiz modu içindeki eşitlikleri ayırmak için kullanılır; yıllar tek yüzdeye ortalanmaz.
          </div>
        ` : ''}
        ${careerSummaryHtml(career)}
        ${roadmapTableHtml(roadmap)}
      </div>`;
  }

  return `
    <details class="career-horse-accordion-v104">
      <summary>
        <div class="career-horse-summary-v104">
          <div style="min-width:0;">
            <div class="career-horse-name-v104">${escapeHtml(horse.no)}. ${escapeHtml(horse.name)}</div>
            <div class="career-horse-status-v104">${statusLine}</div>
          </div>
          <div class="career-horse-score-v104">
            <div>
              ${compactScore}
              <div style="font-size:9px;opacity:.62;margin-top:2px;">${escapeHtml(modeLabel)}</div>
              ${similarityRank ? `<div style="font-size:9px;opacity:.72;margin-top:2px;">Sıra ${escapeHtml(similarityRank)}</div>` : ''}
            </div>
            <div class="career-detail-label-v104">Detay ▾</div>
          </div>
        </div>
      </summary>
      ${detailBody}
    </details>`;
};

function careerGroupHtmlV104(title, note, items, cssClass) {
  if (!items.length) return '';
  const sorted = [...items].sort(sortCareerGroupV104);
  return `
    <div class="career-mode-group-v104 ${cssClass || ''}">
      <div class="career-mode-head-v104">
        <div><b>${escapeHtml(title)}</b><div>${escapeHtml(note)}</div></div>
        <span>${sorted.length} at</span>
      </div>
      ${sorted.map((item, index) => careerHorseHtml(item, index + 1)).join('')}
    </div>`;
}

careerRaceAccordionHtml = function(race, forceOpen) {
  const horses = Array.isArray(race?.horses) ? [...race.horses] : [];
  const winPath = horses.filter(item => careerModeV104(item) === 'WIN_PATH');
  const prepPath = horses.filter(item => careerModeV104(item) === 'PREPARATION_PATH');
  const debut = horses.filter(item => careerModeV104(item) === 'DEBUT');

  return `
    <details
      ${forceOpen ? 'open' : ''}
      class="career-race-accordion-v104"
    >
      <summary class="career-race-summary-v104">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
          <div>
            <div style="font-size:16px;font-weight:800;">${escapeHtml(race.no)}. KOŞU</div>
            <div style="font-size:12px;opacity:.72;margin-top:3px;">
              ${escapeHtml(race.class || race.meta?.class || '-')} ·
              ${escapeHtml(race.ageGroup || race.meta?.ageGroup || '-')} ·
              ${escapeHtml(race.distance || race.meta?.distance || '-')} ${escapeHtml(race.track || race.meta?.track || '')}
            </div>
          </div>
          <div style="font-size:11px;opacity:.72;text-align:right;white-space:nowrap;">
            ${winPath.length ? `Galibiyet ${winPath.length}` : ''}
            ${winPath.length && prepPath.length ? '<br>' : ''}
            ${prepPath.length ? `Hazırlık ${prepPath.length}` : ''}
            ${(winPath.length || prepPath.length) && debut.length ? '<br>' : ''}
            ${debut.length ? `Debut ${debut.length}` : ''} ▾
          </div>
        </div>
      </summary>
      <div class="career-race-body-v104">
        ${race.roadmapError ? `
          <div style="margin:8px 0;padding:9px;border-radius:8px;background:rgba(245,158,11,.10);font-size:11px;">
            Tarihsel yol üretilemedi: ${escapeHtml(race.roadmapError)}
          </div>` : ''}
        ${careerGroupHtmlV104('GALİBİYET YOLU SIRALAMASI', 'Yalnız kariyerinde gerçek galibiyeti bulunan atlar; kendi aralarında sıralanır.', winPath, 'win-path-v104')}
        ${careerGroupHtmlV104('HAZIRLIK / İLK 5 YOLU SIRALAMASI', 'Galibiyeti olmayan atların hazırlık yolu; Galibiyet Yolu yüzdesiyle doğrudan karşılaştırılmaz.', prepPath, 'prep-path-v104')}
        ${careerGroupHtmlV104('DEBUT / KARİYER YOLU YOK', 'Yarış geçmişi olmayan atlarda kariyer yüzdesi üretilmez.', debut, 'debut-path-v104')}
        ${!horses.length ? `<div style="padding:12px;opacity:.7;">Bu koşunun kariyer verisi yeniden hesaplanmalıdır.</div>` : ''}
      </div>
    </details>`;
};

/* =========================================================
   V10.4 — ANALIZ DIALOGU SAYFA KILIDI
   Dialog acikken alttaki ana sayfa yer degistiremez/kayamaz.
========================================================= */

let analysisScrollYV104 = 0;

function lockAnalysisPageV104() {
  if (!document.body || document.body.dataset.analysisLockV104 === '1') return;
  analysisScrollYV104 = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add('analysis-lock-v104');
  document.body.classList.add('analysis-lock-v104');
  document.body.dataset.analysisLockV104 = '1';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${analysisScrollYV104}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockAnalysisPageV104() {
  if (!document.body || document.body.dataset.analysisLockV104 !== '1') return;
  const restoreY = analysisScrollYV104;
  document.documentElement.classList.remove('analysis-lock-v104');
  document.body.classList.remove('analysis-lock-v104');
  delete document.body.dataset.analysisLockV104;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, restoreY);
}

openAnalysis = function(view) {
  lockAnalysisPageV104();
  try {
    return openAnalysisBeforeV104(view);
  } catch (error) {
    unlockAnalysisPageV104();
    throw error;
  }
};

const analysisDialogV104 = document.getElementById('analysisDialog');
if (analysisDialogV104 && analysisDialogV104.dataset.lockHandlerV104 !== '1') {
  analysisDialogV104.dataset.lockHandlerV104 = '1';
  analysisDialogV104.addEventListener('close', unlockAnalysisPageV104);
}

console.info('[AT AI]', ADAPTIVE_HISTORY_ALIAS_VERSION, 'aktif');
console.info('[AT AI]', CAREER_HORSE_ACCORDION_VERSION, 'aktif');
console.info('[AT AI]', CAREER_MODE_RANK_VERSION, 'aktif');
console.info('[AT AI]', ANALYSIS_DIALOG_VERSION, 'aktif');
