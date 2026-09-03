/* AT AI Mobil — V16.9.1F59.2 CAREER 5 MODEL ARCHIVE DISPLAY REUSE
   - Kariyer Yol Haritasi 5 Model paneli, ayni tarih/sehir/kosu icin arşivde model varsa onu kullanir.
   - Tam fingerprint farki ekranı bos birakmasin; guvenlik icin bugunku at listesi ile arşiv model at listesi birebir dogrulanir.
   - Hesap motoru, puan formulu, PDF ve Yillik Arsiv degismez.
   - Yeni timeout, cache temizleme veya yeniden hesaplama eklenmez.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_ARCHIVE_DISPLAY_V1691F592__) return;
window.__AT_CAREER_FIVE_MODEL_ARCHIVE_DISPLAY_V1691F592__ = true;

const VERSION = 'CAREER-FIVE-MODEL-ARCHIVE-DISPLAY-V16.9.1F59.2';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');

if (typeof getCareerRaceModelsV112 !== 'function') return;
const baseGetModelsV1691F592 = getCareerRaceModelsV112;

function dateValue() {
  try { return clean(state?.date || document.getElementById('raceDate')?.value); } catch { return ''; }
}
function cityValue() {
  try { return clean(state?.city || document.getElementById('citySelect')?.value); } catch { return ''; }
}
function modelKey(raceNo) {
  return `model|${dateValue()}|${cityValue()}|${clean(raceNo)}`;
}
function horseToken(h = {}) {
  const no = clean(h?.no ?? h?.number ?? h?.pno);
  const name = fold(h?.name ?? h?.horseName ?? h?.atadi ?? h?.atismi);
  return no && name ? `${no}|${name}` : '';
}
function rosterFromRace(race) {
  return (Array.isArray(race?.horses) ? race.horses : []).map(horseToken).filter(Boolean).sort();
}
function rosterFromModel(data) {
  return (Array.isArray(data?.horses) ? data.horses : []).map(item => horseToken(item?.horse || item)).filter(Boolean).sort();
}
function rosterMatches(race, data) {
  const current = rosterFromRace(race);
  const archived = rosterFromModel(data);
  if (!current.length || !archived.length || current.length !== archived.length) return false;
  return current.every((token, index) => token === archived[index]);
}
async function readModel(raceNo) {
  if (!('indexedDB' in window)) return null;
  return new Promise(resolve => {
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch { return resolve(null); }
    req.onerror = req.onblocked = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      try {
        if (!db.objectStoreNames.contains(STORE)) { db.close(); return resolve(null); }
        const q = db.transaction(STORE, 'readonly').objectStore(STORE).get(modelKey(raceNo));
        q.onsuccess = () => { const value = q.result || null; try { db.close(); } catch {} resolve(value); };
        q.onerror = () => { try { db.close(); } catch {} resolve(null); };
      } catch {
        try { db.close(); } catch {}
        resolve(null);
      }
    };
  });
}

getCareerRaceModelsV112 = async function(race) {
  try {
    const record = await readModel(race?.no);
    if (record?.kind === 'model' && record?.data?.roadmapOk !== false && Array.isArray(record?.data?.horses) && record.data.horses.length && rosterMatches(race, record.data)) {
      record.data.archiveDisplayReuse = true;
      record.data.archiveDisplayReuseVersion = VERSION;
      return record.data;
    }
  } catch (e) {
    console.warn('[AT AI]', VERSION, 'arsiv ekran okuma uyarisi:', e);
  }
  return baseGetModelsV1691F592(race);
};

window.ATCareerFiveModelArchiveDisplayV1691F592 = { VERSION, rosterMatches };
console.info('[AT AI]', VERSION, 'aktif — ayni at listeli gunluk 5 Model kaydi Kariyer ekraninda dogrudan kullanilir.');
})();
