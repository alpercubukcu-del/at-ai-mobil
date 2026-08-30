/* AT AI Mobil — V16.9.1F59.3 CAREER MAIN 5 MODEL DISPLAY
   - Gunluk arsivden guvenle reuse edilen ana 5 Model skorlarini Kariyer panelinde gosterir.
   - Eski byFinish/modelSchemaOk=false bayragi yalniz Podium semasina aittir; normal Bilesik/Tam/Ikiz/Aile/Kariyer panelini gizlemez.
   - Podium, hesap motoru, puan formulu, PDF, Yillik Arsiv ve IndexedDB kaydi degismez.
   - Yeniden hesaplama, timeout veya cache temizleme eklenmez.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_MAIN_DISPLAY_V1691F593__) return;
window.__AT_CAREER_FIVE_MODEL_MAIN_DISPLAY_V1691F593__ = true;

const VERSION = 'CAREER-FIVE-MODEL-MAIN-DISPLAY-V16.9.1F59.3';
const MAIN_IDS = ['composite','exact','twin','family','career'];

function finiteScore(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function hasArchivedMainScores(data) {
  if (!data?.archiveDisplayReuse) return false;
  const horses = Array.isArray(data?.horses) ? data.horses : [];
  if (!horses.length) return false;
  return horses.some(item => MAIN_IDS.some(id => {
    const d = item?.scores?.[id];
    return finiteScore(d?.score) !== null || finiteScore(d?.rawScore) !== null;
  }));
}

if (typeof modelPanelV112 === 'function') {
  const baseModelPanelV1691F593 = modelPanelV112;
  modelPanelV112 = function(data, id, active) {
    if (hasArchivedMainScores(data) && data?.modelSchemaOk === false) {
      const displayData = {
        ...data,
        modelSchemaOk:true,
        modelSchemaError:null,
        careerMainDisplayRecovered:true,
        careerMainDisplayVersion:VERSION
      };
      return baseModelPanelV1691F593(displayData, id, active);
    }
    return baseModelPanelV1691F593(data, id, active);
  };
}

window.ATCareerFiveModelMainDisplayV1691F593 = { VERSION, hasArchivedMainScores };
console.info('[AT AI]', VERSION, 'aktif — arsivde ana 5 Model skorlari varsa eski byFinish bayragi Kariyer ana panelini gizlemez.');
})();
