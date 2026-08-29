/* AT AI Mobil - V16.9.1F55 CAREER 5 MODEL STAGED PREP CONTROLS
   - Keep the 2026-08-28 F40 Career calculation path unchanged.
   - Move the existing F3 daily 5 Model preparation controls from Career Excel export into Career Roadmap.
   - Add current-day and all-archive 5 Model clear controls beside prepare-all / prepare-selected.
   - No automatic 5 Model precompute is started by Career analysis; user starts it explicitly from this panel.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_PREP_CONTROLS_V1691F55__) return;
window.__AT_CAREER_FIVE_MODEL_PREP_CONTROLS_V1691F55__ = true;

const VERSION = 'CAREER-FIVE-MODEL-PREP-CONTROLS-V16.9.1F55';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const STYLE_ID = 'careerFiveModelPrepStyleV1691F55';
const SECTION_ID = 'ceDaily5ArchiveV1691F3';
const STATUS_ID = 'ceDaily5StatusV1691F3';
const CLEAR_DAY_ID = 'careerFiveModelClearDayV1691F55';
const CLEAR_ALL_ID = 'careerFiveModelClearAllV1691F55';
let dbPromise = null;
let clearing = false;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function st() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  return window.state || {};
}
function currentDate() { return clean(st()?.date || document.getElementById('raceDate')?.value); }
function currentCityKey() { return clean(st()?.city || document.getElementById('citySelect')?.value); }
function currentCityName() {
  try { return clean(typeof getCityName === 'function' ? getCityName() : document.querySelector('#citySelect option:checked')?.textContent); }
  catch { return currentCityKey(); }
}
function programRaces() {
  return (Array.isArray(st()?.races) ? st().races : [])
    .filter(r => r && r.no !== null && r.no !== undefined && r.no !== '')
    .sort((a,b) => Number(a.no || 0) - Number(b.no || 0));
}
function selectedRaceNo() {
  const select = document.getElementById('analysisRace');
  const value = clean(select?.value || st()?.selectedRace);
  return value && value !== 'all' ? value : '';
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #analysisDialog:not([data-view="career"]) #${SECTION_ID}{display:none!important}
    #analysisDialog[data-view="career"] #${SECTION_ID}{display:block;margin:12px 0 14px;padding:13px;border:1px solid rgba(79,151,215,.35);border-radius:14px;background:rgba(20,58,91,.42)}
    #${SECTION_ID} h3{margin:0 0 7px;font-size:15px;line-height:1.25;color:#eef7ff}
    #${SECTION_ID} p{margin:0 0 10px;font-size:11px;line-height:1.45;opacity:.82}
    #${SECTION_ID} .career-five-model-actions-v1691f55{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #${SECTION_ID} .career-five-model-actions-v1691f55 button{min-height:48px;width:100%;font-weight:800;line-height:1.15}
    #${SECTION_ID} .career-five-model-actions-v1691f55 .primary{grid-column:1/-1}
    #${SECTION_ID} .career-five-model-danger-v1691f55{border-color:rgba(255,96,122,.38)!important;background:rgba(126,31,49,.35)!important;color:#ffd9df!important}
    #${STATUS_ID}{margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;line-height:1.45;opacity:.9}
    @media(max-width:520px){#${SECTION_ID} .career-five-model-actions-v1691f55{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}

function setStatus(text, kind='') {
  const el = document.getElementById(STATUS_ID);
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.style.color = kind === 'error' ? '#ff9cab' : kind === 'ok' ? '#7ee2a8' : kind === 'warn' ? '#ffbd82' : '';
}

function syncLegacySelectedRace() {
  const n = selectedRaceNo();
  const legacy = document.getElementById('ceRace');
  if (legacy && n && [...legacy.options].some(o => String(o.value) === String(n))) legacy.value = n;
  try { if (n) st().selectedRace = n; } catch {}
  return n;
}

async function runPrepareAll() {
  const api = window.ATDailyFiveModelArchivePrepV1691F3;
  if (!api?.prepareAll) return setStatus('5 Model hazırlama motoru bulunamadı.', 'error');
  setStatus(`${currentDate() || 'Tarih'} · ${currentCityName() || 'Şehir'} · ${programRaces().length} koşu sırayla hazırlanacak. Kariyer sıralaması bundan bağımsızdır.`);
  try { await api.prepareAll(); } catch (e) { setStatus(e?.message || 'Günün 5 Model hazırlaması tamamlanamadı.', 'error'); }
  finally { setTimeout(refreshArchiveStatus, 120); }
}

async function runPrepareSelected() {
  const n = syncLegacySelectedRace();
  if (!n) return setStatus('Önce üstte tek bir koşu seçin.', 'warn');
  const api = window.ATDailyFiveModelArchivePrepV1691F3;
  if (!api?.prepareSelected) return setStatus('5 Model hazırlama motoru bulunamadı.', 'error');
  setStatus(`${n}. Koşu 5 Model hazırlanıyor. Bu işlem yalnız seçili koşuyu çalıştırır.`);
  try { await api.prepareSelected(); } catch (e) { setStatus(e?.message || `${n}. Koşu 5 Model hazırlanamadı.`, 'error'); }
  finally { setTimeout(refreshArchiveStatus, 120); }
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let req;
    try { req = indexedDB.open(DB_NAME); } catch { return resolve(null); }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; resolve(null); };
    req.onblocked = () => { dbPromise = null; resolve(null); };
  });
  return dbPromise;
}

function isModelRow(row) {
  return row?.kind === 'model' || clean(row?.key).startsWith('model|');
}
function currentRow(row) {
  if (!isModelRow(row)) return false;
  const date = currentDate(), city = currentCityKey();
  if (clean(row?.date) === date && clean(row?.city) === city) return true;
  return clean(row?.key).startsWith(`model|${date}|${city}|`);
}

async function listModelRows(currentOnly=false) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return [];
  return new Promise(resolve => {
    const out = [];
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        const row = c.value;
        if (isModelRow(row) && (!currentOnly || currentRow(row))) out.push(row);
        c.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = tx.onabort = () => resolve(out);
    } catch { resolve(out); }
  });
}

async function deleteModelRows(currentOnly=false) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return 0;
  return new Promise(resolve => {
    let deleted = 0;
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        const row = c.value;
        if (isModelRow(row) && (!currentOnly || currentRow(row))) {
          try { c.delete(); deleted += 1; } catch {}
        }
        c.continue();
      };
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = tx.onabort = () => resolve(deleted);
    } catch { resolve(deleted); }
  });
}

function clearVolatileFiveModelCaches() {
  try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}
  try { window.ATFiveModelSharedCacheV1685?.clear?.(); } catch {}
  try { window.ATFiveModelSharedCacheV1687?.clear?.(); } catch {}
  try {
    if (window.manualTicketV117?.raceDataMap instanceof Map) window.manualTicketV117.raceDataMap.clear();
  } catch {}
}

async function clearArchive(currentOnly) {
  if (clearing) return;
  const label = currentOnly ? 'bugünkü 5 Model arşivi' : 'tüm 5 Model arşivi';
  const ok = window.confirm(`${label} temizlensin mi? Kariyer/Hazırlık sıralaması ve Kariyer günlük arşivi silinmeyecek.`);
  if (!ok) return;
  clearing = true;
  const dayBtn = document.getElementById(CLEAR_DAY_ID);
  const allBtn = document.getElementById(CLEAR_ALL_ID);
  if (dayBtn) dayBtn.disabled = true;
  if (allBtn) allBtn.disabled = true;
  setStatus(`${label} temizleniyor…`);
  try {
    const deleted = await deleteModelRows(currentOnly);
    clearVolatileFiveModelCaches();
    setStatus(`${deleted} 5 Model kaydı temizlendi. Kariyer/Hazırlık sonuçlarına dokunulmadı.`, 'ok');
  } catch (e) {
    setStatus(e?.message || '5 Model arşivi temizlenemedi.', 'error');
  } finally {
    clearing = false;
    if (dayBtn) dayBtn.disabled = false;
    if (allBtn) allBtn.disabled = false;
    setTimeout(refreshArchiveStatus, 600);
  }
}

async function refreshArchiveStatus() {
  if (document.getElementById('analysisDialog')?.dataset?.view !== 'career') return;
  const total = programRaces().length;
  if (!currentDate() || !currentCityKey()) return setStatus('Önce tarih ve şehir programını yükleyin.');
  const rows = await listModelRows(true);
  const unique = new Set(rows.map(r => clean(r?.raceNo) || clean(r?.key).split('|').pop()).filter(Boolean));
  setStatus(`${currentDate()} / ${currentCityName() || currentCityKey()} kalıcı 5 Model arşivi: ${unique.size}/${total} koşu hazır. Eksik koşuları seçili olarak veya günün tamamını sırayla hazırlayabilirsiniz.`);
}

function bindSection(section) {
  const all = section.querySelector('#ceDaily5AllV1691F3');
  const one = section.querySelector('#ceDaily5OneV1691F3');
  const clearDay = section.querySelector('#' + CLEAR_DAY_ID);
  const clearAll = section.querySelector('#' + CLEAR_ALL_ID);
  if (all && all.dataset.f55Bound !== '1') {
    all.dataset.f55Bound = '1';
    all.onclick = e => { e.preventDefault(); void runPrepareAll(); };
  }
  if (one && one.dataset.f55Bound !== '1') {
    one.dataset.f55Bound = '1';
    one.onclick = e => { e.preventDefault(); void runPrepareSelected(); };
  }
  if (clearDay && clearDay.dataset.f55Bound !== '1') {
    clearDay.dataset.f55Bound = '1';
    clearDay.onclick = e => { e.preventDefault(); void clearArchive(true); };
  }
  if (clearAll && clearAll.dataset.f55Bound !== '1') {
    clearAll.dataset.f55Bound = '1';
    clearAll.onclick = e => { e.preventDefault(); void clearArchive(false); };
  }
}

function normalizeSection(section) {
  section.classList.add('career-five-model-prep-v1691f55');
  let actions = section.querySelector('.career-five-model-actions-v1691f55');
  if (!actions) {
    const existing = section.querySelector('.ce-actions');
    actions = existing || document.createElement('div');
    actions.classList.add('career-five-model-actions-v1691f55');
    if (!existing) section.appendChild(actions);
  }
  const all = section.querySelector('#ceDaily5AllV1691F3');
  const one = section.querySelector('#ceDaily5OneV1691F3');
  if (all && all.parentNode !== actions) actions.appendChild(all);
  if (one && one.parentNode !== actions) actions.appendChild(one);
  if (!document.getElementById(CLEAR_DAY_ID)) {
    const b = document.createElement('button');
    b.id = CLEAR_DAY_ID;
    b.type = 'button';
    b.className = 'secondary small';
    b.textContent = "Bugünün 5 Model Arşivini Temizle";
    actions.appendChild(b);
  }
  if (!document.getElementById(CLEAR_ALL_ID)) {
    const b = document.createElement('button');
    b.id = CLEAR_ALL_ID;
    b.type = 'button';
    b.className = 'secondary small career-five-model-danger-v1691f55';
    b.textContent = 'Tüm 5 Model Arşivini Temizle';
    actions.appendChild(b);
  }
  const h3 = section.querySelector('h3');
  if (h3) h3.textContent = '⚡ 5 Model Hazırlama · 2000+';
  const p = section.querySelector('p');
  if (p) p.innerHTML = 'Kariyer/Hazırlık sıralaması ayrı ve hızlı hesaplanır. 5 Modeli burada <b>ayrı aşama</b> olarak hazırlayın; hazır kayıt varsa yeniden tarihsel tarama yapılmaz.';
  bindSection(section);
  return section;
}

function createSection() {
  const section = document.createElement('section');
  section.id = SECTION_ID;
  section.className = 'ce-block career-five-model-prep-v1691f55';
  section.innerHTML = `
    <h3>⚡ 5 Model Hazırlama · 2000+</h3>
    <p>Kariyer/Hazırlık sıralaması ayrı ve hızlı hesaplanır. 5 Modeli burada <b>ayrı aşama</b> olarak hazırlayın; hazır kayıt varsa yeniden tarihsel tarama yapılmaz.</p>
    <div class="ce-actions career-five-model-actions-v1691f55">
      <button id="ceDaily5AllV1691F3" type="button" class="primary small">Günün Tüm Koşularını Hazırla</button>
      <button id="ceDaily5OneV1691F3" type="button" class="secondary small">Seçili Koşuyu Hazırla</button>
      <button id="${CLEAR_DAY_ID}" type="button" class="secondary small">Bugünün 5 Model Arşivini Temizle</button>
      <button id="${CLEAR_ALL_ID}" type="button" class="secondary small career-five-model-danger-v1691f55">Tüm 5 Model Arşivini Temizle</button>
    </div>
    <div id="${STATUS_ID}"></div>`;
  bindSection(section);
  return section;
}

function ensureInCareer() {
  installStyle();
  const dialog = document.getElementById('analysisDialog');
  if (!dialog || dialog.dataset.view !== 'career') return false;
  const toolbar = dialog.querySelector('.toolbar');
  const content = document.getElementById('analysisContent');
  if (!toolbar || !content) return false;

  let section = document.getElementById(SECTION_ID);
  if (!section) section = createSection();
  section = normalizeSection(section);
  if (section.parentNode !== dialog || section.nextElementSibling !== content) {
    dialog.insertBefore(section, content);
  }
  setTimeout(refreshArchiveStatus, 0);
  return true;
}

/* If F3 created the block inside Career Excel first, physically move that same block. */
document.addEventListener('click', event => {
  const target = event.target;
  if (target?.closest?.('[data-view="career"]')) setTimeout(ensureInCareer, 0);
  if (target?.closest?.('#runAnalysis') && document.getElementById('analysisDialog')?.dataset?.view === 'career') setTimeout(ensureInCareer, 0);
}, true);

document.getElementById('analysisRace')?.addEventListener('change', () => {
  syncLegacySelectedRace();
  setTimeout(refreshArchiveStatus, 0);
});

try {
  const observer = new MutationObserver(() => {
    const dialog = document.getElementById('analysisDialog');
    if (dialog?.open && dialog.dataset.view === 'career') ensureInCareer();
  });
  const dialog = document.getElementById('analysisDialog');
  if (dialog) observer.observe(dialog, { attributes:true, attributeFilter:['open','data-view'], childList:true });
} catch {}

window.addEventListener('pageshow', () => setTimeout(ensureInCareer, 0), { passive:true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(ensureInCareer, 0), { once:true });
else setTimeout(ensureInCareer, 0);

window.ATCareerFiveModelPrepControlsV1691F55 = {
  version: VERSION,
  ensure: ensureInCareer,
  prepareAll: runPrepareAll,
  prepareSelected: runPrepareSelected,
  clearToday: () => clearArchive(true),
  clearAll: () => clearArchive(false),
  refresh: refreshArchiveStatus
};

console.info('[AT AI]', VERSION, 'active - 5 Model prep controls live inside Career Roadmap; Career calculation does not auto-start them.');
})();
