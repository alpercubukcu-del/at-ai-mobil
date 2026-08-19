/* AT AI Mobil — V11.7 KALIBRASYON BOS/HATALI KAPSAMA DUZELTMESI
   - null rank artik Number(null)=0 nedeniyle kapsama/Top-3 sayilmaz.
   - Bos gorunen hucreler iki acik duruma ayrilir: Model yok / Hedefe yol yok.
   - Eski localStorage kalibrasyon ozetleri ekrana gelirken yeniden hesaplanir.
   - Model puanlari ve siralama kurallari DEGISTIRILMEZ; sahte fallback uretilmez.
*/

const CALIBRATION_FIX_V117 = 'CALIBRATION-NULL-SAFE-V11.7';

function usableRankCalV117(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/*
  KRITIK HATA:
  Eski kod Number(null) => 0 oldugu icin null siralari gecerli kabul ediyordu.
  Bu nedenle ekranda — gorunen hedefler ust ozetlerde 18/18 kapsama ve Top-3 gibi
  yanlis sayilabiliyordu. Yalniz 1 ve uzeri gercek siralar artik kapsama girer.
*/
metricSummaryV116 = function(records = []) {
  const rows = Array.isArray(records) ? records : [];
  const ranks = rows
    .map(row => usableRankCalV117(row?.rank))
    .filter(rank => rank !== null);

  return {
    total:rows.length,
    coverage:ranks.length,
    top1:ranks.filter(rank => rank === 1).length,
    top3:ranks.filter(rank => rank <= 3).length,
    averageRank:ranks.length
      ? Math.round((ranks.reduce((a,b) => a + b, 0) / ranks.length) * 100) / 100
      : null,
    mrr:ranks.length
      ? Math.round((ranks.reduce((a,b) => a + 1 / b, 0) / ranks.length) * 1000) / 1000
      : null
  };
};

rankClassCalV116 = function(rank) {
  const valid = usableRankCalV117(rank);
  if (valid === 1) return 'cal-rank1-v116';
  if (valid !== null && valid <= 3) return 'cal-rank3-v116';
  if (valid !== null) return 'cal-rankout-v116';
  return 'cal-ranknone-v116';
};

rankTextCalV116 = function(item) {
  const rank = usableRankCalV117(item?.rank);
  if (rank === null) {
    const rankedHorses = Number(item?.rankedHorses || 0);
    return rankedHorses > 0
      ? `Yol yok · ${rankedHorses} at`
      : 'Model yok';
  }

  const raw = finiteCalV116(item?.rawScore);
  const score = finiteCalV116(item?.score);
  const parts = [`#${rank}`];
  if (score !== null) parts.push(`${score}p`);
  if (raw !== null && raw !== score) parts.push(`ham %${raw}`);
  return parts.join(' · ');
};

function repairCalibrationResultV117(result) {
  if (!result || !Array.isArray(result.races)) return result;
  result.summary = aggregateCalibrationV116(result.races);
  result.summaryFixVersion = CALIBRATION_FIX_V117;
  return result;
}

function calibrationMissingStatsV117(result) {
  let modelNoData = 0;
  let targetNoPath = 0;
  let ranked = 0;

  for (const race of Array.isArray(result?.races) ? result.races : []) {
    for (const finish of [1,2,3]) {
      for (const modelId of (typeof CALIBRATION_MODEL_IDS_V116 !== 'undefined' ? CALIBRATION_MODEL_IDS_V116 : [])) {
        const item = race?.finishes?.[finish]?.models?.[modelId] || {};
        if (usableRankCalV117(item.rank) !== null) {
          ranked++;
        } else if (Number(item?.rankedHorses || 0) > 0) {
          targetNoPath++;
        } else {
          modelNoData++;
        }
      }
    }
  }

  return { modelNoData, targetNoPath, ranked, total:ranked + targetNoPath + modelNoData };
}

const renderCalibrationResultBeforeV117 = renderCalibrationResultV116;
renderCalibrationResultV116 = function(result) {
  const repaired = repairCalibrationResultV117(result);
  if (!repaired) return '';

  try {
    if (repaired.dayId) saveCalibrationCacheV116(repaired.dayId, repaired);
  } catch (e) {
    console.warn('[AT AI] kalibrasyon ozeti cache duzeltmesi yazilamadi', e);
  }

  let html = renderCalibrationResultBeforeV117(repaired);
  const stats = calibrationMissingStatsV117(repaired);
  const note = `
    <div class="cal-null-note-v117">
      <b>VERI KAPSAMA KONTROLU</b>
      <span><strong>${stats.ranked}/${stats.total}</strong> model-hedef hucresinde gercek sira uretildi.</span>
      <small>
        <b>Yol yok</b>: model baska atlari siraladi fakat gercek hedef at icin dogrudan tarihsel yol uretemedi.
        <b>Model yok</b>: o kosu/derece/model kanali hic siralama uretemedi.
        Bu hucrelere sahte sira eklenmez; ustteki Kapsama yalniz gercek #1, #2… siralari sayar.
      </small>
    </div>`;

  if (typeof html === 'string' && html.includes('<section class="cal-result-v116">')) {
    html = html.replace(
      '<section class="cal-result-v116">',
      `<section class="cal-result-v116">${note}`
    );
  }
  return html;
};

/* Mobilde aciklama metni kaybolmasin. */
(function installCalibrationFixStyleV117() {
  if (document.getElementById('calibrationFixStyleV117')) return;
  const style = document.createElement('style');
  style.id = 'calibrationFixStyleV117';
  style.textContent = `
    .cal-null-note-v117{
      margin:0 0 10px;
      padding:10px 11px;
      border:1px solid rgba(245,158,11,.28);
      border-radius:10px;
      background:rgba(245,158,11,.07);
      line-height:1.45;
    }
    .cal-null-note-v117>b{display:block;font-size:10px;letter-spacing:.05em;margin-bottom:4px}
    .cal-null-note-v117>span{display:block;font-size:11px;margin-bottom:3px}
    .cal-null-note-v117>small{display:block;font-size:9px;opacity:.75}
    .cal-ranknone-v116 b{font-size:9px;line-height:1.25;white-space:normal;opacity:.78}
  `;
  document.head.appendChild(style);
})();

console.info('[AT AI]', CALIBRATION_FIX_V117, 'aktif');
