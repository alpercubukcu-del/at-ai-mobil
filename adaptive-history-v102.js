/* AT AI Mobil — Adaptive Historical Path V10.2
   TJK Günlük Programı ile Koşu Sorgulama arasındaki sınıf adı aliaslarını eşitler. */

const ADAPTIVE_HISTORY_ALIAS_VERSION = 'ADAPTIVE-HISTORY-UI-V10.2';
const CAREER_HORSE_ACCORDION_VERSION = 'CAREER-HORSE-ACCORDION-V10.3';
const runCareerAnalysisV101 = runCareerAnalysis;

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
    state.analyses.career.similarityNote = 'Her yıl ayrı ±45 gün taranır. TJK Günlük Programı ve Koşu Sorgulama arasındaki sınıf adı aliasları kanonikleştirilir. Kariyer yolu ve koşul aktarılabilirliği ayrı hesaplanır; yıllar birbirine ortalanmaz.';
    save();
  }
};

/* =========================================================
   V10.3 — AT BAZLI KARİYER ACCORDION
   Koşu accordion'u açık kalsa bile atlar varsayılan kapalıdır.
   Hesaplama/veri mantığı değişmez; yalnız mobil görünüm sıkıştırılır.
========================================================= */

careerHorseHtml = function(item, similarityRank = null) {
  const horse = item?.horse;
  const career = item?.career;
  const sim = item?.galibiyetBenzerligi || {};

  if (!horse) return '';

  const hasScore =
    sim.score !== null &&
    sim.score !== undefined &&
    sim.score !== '' &&
    Number.isFinite(Number(sim.score));

  const roadmap = Array.isArray(career?.roadmap) ? career.roadmap : [];
  const summary = normalizeCareerSummary(career || {}, roadmap);

  const compactScore = hasScore
    ? `<div style="font-size:18px;font-weight:900;line-height:1;color:#7ee2a8;">%${escapeHtml(sim.score)}</div>`
    : `<div style="font-size:18px;font-weight:800;line-height:1;opacity:.55;">—</div>`;

  const statusLine = !horse.id
    ? 'TJK At ID bulunamadı'
    : !career?.ok
      ? 'Kariyer verisi alınamadı'
      : `İlk 5: ${escapeHtml(summary.totalTop5)} · 1: ${escapeHtml(summary.first)} · 2: ${escapeHtml(summary.second)} · 3: ${escapeHtml(summary.third)}`;

  const detailBody = !horse.id
    ? `<div style="padding:11px 12px;opacity:.72;">TJK At ID bulunamadığı için kariyer alınamadı.</div>`
    : !career?.ok
      ? `<div style="padding:11px 12px;opacity:.72;">Kariyer verisi alınamadı: ${escapeHtml(career?.error || 'Bilinmeyen hata')}</div>`
      : `
        <div style="padding:10px 12px 12px 12px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
            <div style="min-width:0;">
              ${horse.jockey ? `<div style="opacity:.72;font-size:12px;">Jokey: ${escapeHtml(horse.jockey)}</div>` : ''}
              <div style="font-size:10px;opacity:.55;margin-top:3px;">TJK ID: ${escapeHtml(horse.id)}</div>
            </div>
            ${similarityRank ? `<div style="font-size:11px;opacity:.68;white-space:nowrap;">Benzerlik sırası ${similarityRank}</div>` : ''}
          </div>

          ${sim.matchedHistoricalHorse ? `
            <div style="margin-top:8px;padding:7px 9px;border-radius:8px;background:rgba(126,226,168,.08);font-size:11px;line-height:1.45;">
              En yakın tarihsel yol: <b>${escapeHtml(sim.matchedHistoricalHorse)}</b>
              ${sim.matchedHistoricalFinish ? ` · geçmişte ${escapeHtml(sim.matchedHistoricalFinish)}.` : ''}
              ${sim.matchedHistoricalRace ? `<br><span style="opacity:.7;">${escapeHtml(sim.matchedHistoricalRace)}</span>` : ''}
            </div>
          ` : ''}

          ${careerSummaryHtml(career)}
          ${roadmapTableHtml(roadmap)}
        </div>
      `;

  return `
    <details
      style="margin:8px 0;border:1px solid rgba(255,255,255,.14);border-radius:11px;overflow:hidden;background:rgba(255,255,255,.02);"
    >
      <summary
        style="cursor:pointer;list-style:none;padding:10px 12px;user-select:none;"
      >
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
          <div style="min-width:0;">
            <div style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHtml(horse.no)}. ${escapeHtml(horse.name)}
            </div>
            <div style="font-size:11px;opacity:.66;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${statusLine}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:9px;flex:0 0 auto;text-align:right;">
            <div>
              ${compactScore}
              <div style="font-size:9px;opacity:.62;margin-top:2px;">Benzerlik</div>
            </div>
            <div style="font-size:13px;opacity:.72;">Detay ▾</div>
          </div>
        </div>
      </summary>
      ${detailBody}
    </details>
  `;
};

console.info('[AT AI]', ADAPTIVE_HISTORY_ALIAS_VERSION, 'aktif');
console.info('[AT AI]', CAREER_HORSE_ACCORDION_VERSION, 'aktif');
