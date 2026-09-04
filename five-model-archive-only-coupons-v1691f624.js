/* AT AI Mobil — V16.9.1F60.24 Archive-only calibrated coupon bridge
   - Kupon oluşturma sırasında 5 Model HESABI YAPMAZ.
   - Yalnız daha önce Kariyer Yol Haritası / 5 Model hazırlama ekranında kaydedilmiş
     model|date|city|race kayıtlarını IndexedDB'den okur.
   - Eksik / eski at listeli kayıt varsa beklemez, ağ isteği açmaz ve ilgili kalibreli
     kuponu "5 Model hazır değil" olarak döndürür.
   - Kalibresiz Kariyer Yol Haritası kupon akışına dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_ARCHIVE_ONLY_COUPONS_V624__) return;
window.__AT_FIVE_MODEL_ARCHIVE_ONLY_COUPONS_V624__ = true;

const VERSION = 'FIVE-MODEL-ARCHIVE-ONLY-COUPONS-V16.9.1F60.24';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const LEGACY_API = window.ATFiveModelCalibratedCouponsV613;
if (!LEGACY_API || typeof LEGACY_API.build !== 'function') {
  console.warn('[AT AI]', VERSION, '5 Model kalibrasyonlu kupon API bulunamadı.');
  return;
}
const baseBuild = LEGACY_API.build.bind(LEGACY_API);
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
let dbPromise = null;
let buildBusy = false;

function st() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  return window.state || {};
}
function currentDate() {
  return clean(st()?.date || document.getElementById('raceDate')?.value);
}
function currentCityKey() {
  return clean(st()?.city || document.getElementById('citySelect')?.value);
}
function raceNo(race) {
  return clean(race?.no ?? race?.raceNo);
}
function modelKey(race) {
  return `model|${currentDate()}|${currentCityKey()}|${raceNo(race)}`;
}
function horseToken(h = {}) {
  const no = clean(h?.no ?? h?.number ?? h?.pno);
  const name = fold(h?.name ?? h?.horseName ?? h?.atadi ?? h?.atismi);
  return no && name ? `${no}|${name}` : '';
}
function raceRoster(race) {
  return (Array.isArray(race?.horses) ? race.horses : []).map(horseToken).filter(Boolean).sort();
}
function modelRoster(data) {
  return (Array.isArray(data?.horses) ? data.horses : []).map(item => horseToken(item?.horse || item)).filter(Boolean).sort();
}
function rosterMatches(race, data) {
  const a = raceRoster(race), b = modelRoster(data);
  if (!a.length || !b.length || a.length !== b.length) return false;
  return a.every((token, index) => token === b[index]);
}
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch { return resolve(null); }
    req.onsuccess = () => resolve(req.result);
    req.onerror = req.onblocked = () => { dbPromise = null; resolve(null); };
  });
  return dbPromise;
}
async function readExactModel(race) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return { ok:false, reason:'5 Model arşivi bulunamadı.' };
  const key = modelKey(race);
  const record = await new Promise(resolve => {
    try {
      const q = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  if (!record || record?.kind !== 'model') return { ok:false, reason:`${raceNo(race)}.K 5 Model arşivde hazır değil.` };
  const data = record?.data;
  if (!data || data?.roadmapOk === false || !Array.isArray(data?.horses) || !data.horses.length) {
    return { ok:false, reason:`${raceNo(race)}.K 5 Model kaydı geçersiz/eksik.` };
  }
  if (!rosterMatches(race, data)) {
    return { ok:false, reason:`${raceNo(race)}.K 5 Model kaydı bugünkü at listesiyle eşleşmiyor.` };
  }
  return {
    ok:true,
    data:{
      ...data,
      archiveOnlyCoupon:true,
      archiveOnlyCouponVersion:VERSION,
      roadmapTransport:'DAILY_5MODEL_ARCHIVE_ONLY_V624'
    }
  };
}
function unavailableData(race, reason) {
  return {
    no:race?.no,
    roadmapOk:false,
    roadmapError:reason || `${raceNo(race)}.K 5 Model hazır değil.`,
    roadmapUnavailableNotZero:true,
    archiveOnlyCoupon:true,
    archiveOnlyCouponVersion:VERSION,
    horses:[]
  };
}
function requiredRaces() {
  const out = new Map();
  try {
    const selected = (() => {
      try {
        const m = typeof manualTicketV117 !== 'undefined' ? clean(manualTicketV117?.betType) : '';
        if (m) return [m];
      } catch {}
      return [...document.querySelectorAll('.bet-check:checked')].map(x => clean(x.value)).filter(Boolean);
    })();
    for (const type of selected) {
      const plan = typeof resolveBetStartV11 === 'function' ? resolveBetStartV11(type) : null;
      if (!plan?.ok) continue;
      for (const race of plan.legs || []) out.set(raceNo(race), race);
    }
  } catch {}
  return [...out.values()];
}
function setStatus(text, kind='') {
  const status = document.getElementById('couponFusionStatusF6015');
  if (status) {
    status.textContent = text;
    status.style.color = kind === 'error' ? '#ff9cab' : kind === 'ok' ? '#7ee2a8' : '#dcefff';
  }
  const button = document.getElementById('buildAllBtn') || document.getElementById('careerOnlyBuildV1691F1');
  if (button) button.textContent = text;
}
function patchCouponNote() {
  const note = document.querySelector('#couponCenterDialog .five-model-note-v11');
  if (note) {
    note.innerHTML = '<b>1 kalibresiz + 5 arşivden kalibrasyonlu kupon</b><span>Kalibresiz: Kariyer Yol Haritası. Kalibrasyonlu: yalnız önceden hazırlanmış 5 Model arşivi okunur; Kupon Oluştur hiçbir 5 Model hesabı veya TJK isteği başlatmaz.</span>';
  }
}

async function buildArchiveOnly(options={}) {
  if (buildBusy) return [];
  buildBusy = true;
  const races = requiredRaces();
  const archive = new Map();
  const missing = [];
  try {
    patchCouponNote();
    setStatus(`2/2 · Hazır 5 Model arşivi okunuyor (0/${races.length})…`);
    for (let i = 0; i < races.length; i++) {
      const race = races[i];
      const result = await readExactModel(race);
      if (result.ok) archive.set(raceNo(race), result.data);
      else {
        archive.set(raceNo(race), unavailableData(race, result.reason));
        missing.push(result.reason);
      }
      setStatus(`2/2 · Hazır 5 Model arşivi okunuyor (${i + 1}/${races.length})…`);
    }

    const hadPrepare = typeof prepareRaceModelsV11 === 'function';
    const originalPrepare = hadPrepare ? prepareRaceModelsV11 : null;
    if (!hadPrepare) throw new Error('5 Model kupon sıralama fonksiyonu bulunamadı.');

    prepareRaceModelsV11 = async function(race) {
      return archive.get(raceNo(race)) || unavailableData(race, `${raceNo(race)}.K 5 Model arşivde hazır değil.`);
    };

    try {
      const result = await baseBuild({
        ...options,
        progress: text => {
          options?.progress?.(text);
          const m = clean(text).match(/5 Model\s+(\d+)\/(\d+)/i);
          if (m) setStatus(`2/2 · Arşiv kupon verisi ${m[1]}/${m[2]} işleniyor…`);
        }
      });
      const list = Array.isArray(result) ? result : [];
      return list.map(ticket => {
        const unavailable = ticket?.available === false;
        const extra = missing.length
          ? [`Arşivden eksik: ${missing.join(' ')} Kupon sırasında hesap başlatılmadı.`]
          : ['5 Model verisi yalnız günlük kalıcı arşivden okundu; kupon sırasında ağ isteği/hesap başlatılmadı.'];
        return {
          ...ticket,
          scoreVersion:VERSION,
          archiveOnly:true,
          archiveOnlyVersion:VERSION,
          source:unavailable ? 'DAILY_5MODEL_ARCHIVE_ONLY_MISSING_V624' : 'DAILY_5MODEL_ARCHIVE_ONLY_V624',
          error:unavailable && missing.length ? missing.join(' ') : ticket?.error,
          warnings:[...extra, ...(Array.isArray(ticket?.warnings) ? ticket.warnings : [])]
        };
      });
    } finally {
      prepareRaceModelsV11 = originalPrepare;
    }
  } finally {
    buildBusy = false;
  }
}

LEGACY_API.build = buildArchiveOnly;
LEGACY_API.version = VERSION;
LEGACY_API.archiveOnly = true;
LEGACY_API.readExactModel = readExactModel;
window.ATFiveModelArchiveOnlyCouponsV624 = {
  version:VERSION,
  build:buildArchiveOnly,
  readExactModel,
  rosterMatches,
  mode:'READ_ONLY_INDEXEDDB'
};

document.addEventListener('click', event => {
  if (event.target?.closest?.('#buildAllBtn,#careerOnlyBuildV1691F1')) patchCouponNote();
}, true);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', patchCouponNote, { once:true });
} else {
  setTimeout(patchCouponNote, 0);
}

console.info('[AT AI]', VERSION, 'active — coupon reads exact daily 5 Model archive only; no prepareRaceModelsV11 network calculation is allowed during coupon build.');
})();