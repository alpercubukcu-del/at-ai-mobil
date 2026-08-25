/* AT AI Mobil — V16.9.1F3 Günlük 5 Model Arşiv Hazırlayıcı
   - Kariyer Excel ekranından seçili koşu veya günün tüm programı önceden hazırlanır.
   - Mevcut 5 Model motorunu kullanır; formül üretmez/değiştirmez.
   - Motor minYear=2000 + yıl yıl ±45 gün tarihsel tarama kullanır.
   - Her tarihsel yarışın gerçek ilk 3 atı ve yarış öncesi tam kariyeri mevcut model motorunda kullanılır.
   - Sonuç mevcut Günlük Kariyer Arşivi model kaydına yazılır; sonraki açılış archive-first olur.
   - Tüm koşular telefonda ana thread'i yormamak için sırayla hazırlanır.
*/
(() => {
'use strict';
if (window.__AT_DAILY_FIVE_MODEL_ARCHIVE_PREP_V1691F3__) return;
window.__AT_DAILY_FIVE_MODEL_ARCHIVE_PREP_V1691F3__ = true;

const VERSION = 'DAILY-FIVE-MODEL-ARCHIVE-PREP-V16.9.1F3';
const RULE = 'YEAR_BY_YEAR_2000_PLUS';
const SOURCE = 'TOP3_PRE_RACE_FULL_CAREER';
const READ_MODE = 'MODEL_ARCHIVE_FIRST';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
let busy = false;
let dbPromise = null;

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

function currentDate() { return clean(state?.date || document.getElementById('raceDate')?.value); }
function currentCityKey() { return clean(state?.city || document.getElementById('citySelect')?.value); }
function currentCityName() {
  try { return clean(typeof getCityName === 'function' ? getCityName() : document.querySelector('#citySelect option:checked')?.textContent); }
  catch { return currentCityKey(); }
}
function programRaces() {
  return (Array.isArray(state?.races) ? state.races : [])
    .filter(r => r && r.no !== null && r.no !== undefined && r.no !== '')
    .sort((a,b) => Number(a.no || 0) - Number(b.no || 0));
}
function selectedRace() {
  const n = clean(document.getElementById('ceRace')?.value || state?.selectedRace || document.getElementById('analysisRace')?.value);
  return programRaces().find(r => String(r.no) === String(n)) || null;
}
function modelKey(raceNo) { return `model|${currentDate()}|${currentCityKey()}|${clean(raceNo)}`; }

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let q;
    try { q = indexedDB.open(DB_NAME); } catch { return resolve(null); }
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => { dbPromise = null; resolve(null); };
  });
  return dbPromise;
}
async function dbGet(key) {
  const db = await openDb(); if (!db || !db.objectStoreNames.contains(STORE)) return null;
  return new Promise(resolve => {
    try {
      const q = db.transaction(STORE,'readonly').objectStore(STORE).get(key);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function dbDelete(key) {
  const db = await openDb(); if (!db || !db.objectStoreNames.contains(STORE)) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

function setStatus(text, kind='') {
  const el = document.getElementById('ceDaily5StatusV1691F3');
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.style.color = kind === 'error' ? '#ff8c98' : kind === 'ok' ? '#7ee2a8' : kind === 'warn' ? '#ffbd82' : '';
}
function setButtons(disabled) {
  for (const id of ['ceDaily5AllV1691F3','ceDaily5OneV1691F3']) {
    const b = document.getElementById(id); if (b) b.disabled = disabled;
  }
}
function archiveFolderLabel(race) {
  return `${currentDate()} / ${currentCityName() || currentCityKey()} / ${race?.no}. Koşu`;
}

async function prepareOne(race, progressText='') {
  if (!race) throw new Error('Koşu bulunamadı.');
  if (typeof getCareerRaceModelsV112 !== 'function') throw new Error('5 Model motoru bulunamadı.');
  const key = modelKey(race.no);
  const before = await dbGet(key);
  const started = performance.now();
  const data = await getCareerRaceModelsV112(race);
  const elapsed = Math.max(0, Math.round((performance.now() - started) / 1000));
  const horseCount = Array.isArray(data?.horses) ? data.horses.length : 0;
  const expected = Array.isArray(race?.horses) ? race.horses.length : 0;
  if (!data || data?.roadmapOk === false || (expected && horseCount !== expected)) {
    /* Başarısız/eksik sonucu kalıcı arşivde tutma; sonraki açılış yeniden deneyebilsin. */
    await dbDelete(key);
    try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.delete([currentDate(), currentCityKey(), race.no].join('|')); } catch {}
    throw new Error(data?.roadmapError || `5 Model eksik (${horseCount}/${expected} at).`);
  }
  const saved = await dbGet(key);
  if (!saved?.data) throw new Error('5 Model hesaplandı fakat günlük arşiv kaydı doğrulanamadı.');
  return {
    raceNo:String(race.no),
    cachedBefore:Boolean(before?.data),
    elapsed,
    modelCounts:data?.modelCounts || {},
    folder:archiveFolderLabel(race)
  };
}

async function prepareList(races, button) {
  if (busy) return;
  if (!currentDate() || !currentCityKey()) return setStatus('Önce tarih ve şehir programını yükleyin.','error');
  const list = (Array.isArray(races) ? races : []).filter(Boolean);
  if (!list.length) return setStatus('Hazırlanacak koşu bulunamadı.','error');
  busy = true;
  setButtons(true);
  const old = button?.textContent;
  let ok = 0, hit = 0, failed = 0;
  const errors = [];
  try {
    for (let i=0; i<list.length; i++) {
      const race = list[i];
      if (button) button.textContent = `${i+1}/${list.length} hazırlanıyor…`;
      setStatus(`${i+1}/${list.length} · ${race.no}. Koşu · 2000+ tarihsel ilk 3/kariyer arşivi hazırlanıyor…`);
      try {
        const r = await prepareOne(race);
        ok++;
        if (r.cachedBefore) hit++;
        setStatus(`${i+1}/${list.length} · ${race.no}. Koşu hazır${r.cachedBefore?' · arşivden':' · yeni'} · ${r.elapsed} sn`);
      } catch (e) {
        failed++;
        errors.push(`${race.no}.K: ${e?.message || e}`);
        setStatus(`${i+1}/${list.length} · ${race.no}. Koşu alınamadı; sıradaki koşuya geçiliyor…`,'warn');
      }
      /* Mobilde uzun hazırlık sırasında UI'ya nefes ver. */
      await frame();
      await wait(180);
    }
    const fresh = ok - hit;
    const msg = `Günlük 5 Model arşivi: ${ok}/${list.length} hazır · ${hit} zaten arşivde · ${fresh} yeni${failed?` · ${failed} hata`:''}.`;
    setStatus(msg, failed && !ok ? 'error' : failed ? 'warn' : 'ok');
    if (errors.length) console.warn('[AT AI]', VERSION, 'hazırlama hataları:', errors);
  } finally {
    busy = false;
    setButtons(false);
    if (button) button.textContent = old || button.textContent;
  }
}

function inject() {
  const dialog = document.getElementById('careerExportDialog');
  const body = dialog?.querySelector('.ce-body');
  if (!body || document.getElementById('ceDaily5ArchiveV1691F3')) return false;
  const section = document.createElement('section');
  section.id = 'ceDaily5ArchiveV1691F3';
  section.className = 'ce-block';
  section.innerHTML = `
    <h3>⚡ Günlük 5 Model Arşivi · 2000+</h3>
    <p>Koşu programındaki 5 Model kaynaklarını <b>bir kez</b> hazırlar. Tarihsel tarama 2000’den hedef tarihe kadar <b>yıl yıl</b> yapılır; her geçmiş yarışın gerçek <b>ilk 3 atı</b> ve bu atların yarıştan önceki <b>tam kariyeri</b> kullanılır.</p>
    <div class="ce-actions" style="display:flex;flex-wrap:wrap;gap:8px">
      <button id="ceDaily5AllV1691F3" class="primary small">Günün Tüm Koşularını Hazırla</button>
      <button id="ceDaily5OneV1691F3" class="secondary small">Seçili Koşuyu Hazırla</button>
    </div>
    <small>Arşiv yapısı: <b>Tarih / Şehir / Koşu No</b>. Sonraki 5 Model açılışlarında önce günlük arşiv okunur; yalnız eksik veya geçersiz kayıt yeniden hesaplanır. Hazırlama mobil donmayı azaltmak için koşuları sırayla işler.</small>
    <div id="ceDaily5StatusV1691F3" style="margin-top:10px;font-size:12px;line-height:1.45;opacity:.9"></div>`;
  const full = document.getElementById('ceFullAnalysisV160')?.closest?.('.ce-block');
  if (full?.parentNode === body) full.insertAdjacentElement('afterend', section); else body.appendChild(section);
  document.getElementById('ceDaily5AllV1691F3').onclick = e => prepareList(programRaces(), e.currentTarget);
  document.getElementById('ceDaily5OneV1691F3').onclick = e => {
    const r = selectedRace();
    if (!r) return setStatus('Önce üstten bir koşu seçin.','error');
    prepareList([r], e.currentTarget);
  };
  setStatus(`${currentDate() || 'Tarih'} · ${currentCityName() || 'Şehir'} · ${programRaces().length} koşu programda. 5 Model arşivi hazırlandığında panel tekrar tarihsel tarama yapmayacak.`);
  return true;
}

document.addEventListener('click', event => {
  if (event.target?.closest?.('#careerExportMenuBtn')) setTimeout(inject, 40);
}, true);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(inject, 250));
else setTimeout(inject, 250);
window.addEventListener('load', () => setTimeout(inject, 300));

window.ATDailyFiveModelArchivePrepV1691F3 = {
  version:VERSION,
  rule:RULE,
  source:SOURCE,
  readMode:READ_MODE,
  prepareAll:() => prepareList(programRaces(), document.getElementById('ceDaily5AllV1691F3')),
  prepareSelected:() => {
    const r=selectedRace();
    return r ? prepareList([r], document.getElementById('ceDaily5OneV1691F3')) : Promise.resolve(false);
  }
};
console.info('[AT AI]', VERSION, 'aktif — 2000+ yıl yıl, ilk 3 yarış öncesi tam kariyer, günlük model archive-first');
})();