/* AT AI Mobil — V16.9.7 5 Model İstek Onarımı + Mobil İlerleme
   - Günlük arşiv ve oturum önbelleği ağdan önce okunur.
   - Aynı tarih/şehir/koşu için yalnız tek 5 Model işi çalışır.
   - Kör Test biçiminde yaklaşık yüzde, aktif aşama ve geçen süre gösterilir.
   - Hesap sürerken analiz dialogu kaydırılabilir; kullanıcı işi arka planda bırakıp menüye dönebilir.
   - Puanlama ve sıralama formüllerine dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_REPAIR_PROGRESS_V1697__) return;
window.__AT_FIVE_MODEL_REPAIR_PROGRESS_V1697__ = true;

const VERSION = 'FIVE-MODEL-REPAIR-PROGRESS-V16.9.7';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const MODEL_ENGINE = typeof CAREER_MODEL_TABS_VERSION !== 'undefined' ? CAREER_MODEL_TABS_VERSION : 'CAREER-MODEL';
const MAX_RESOLVED = 4;
const resolved = new Map();
const inflight = new Map();
const uiJobs = new Map();
const stats = {
  archiveHits: 0,
  sessionHits: 0,
  memoryHits: 0,
  duplicatesBlocked: 0,
  networkStarts: 0,
  completed: 0,
  failed: 0,
  lockRepairs: 0
};
let dbPromise = null;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = value => clean(value).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I').replace(/[^A-Z0-9]+/g, '');
const finite = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const esc = value => typeof escapeHtml === 'function' ? escapeHtml(value) : clean(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function cityName() {
  try { return typeof getCityName === 'function' ? clean(getCityName()) : clean(document.querySelector('#citySelect option:checked')?.textContent); }
  catch { return ''; }
}
function contextKey(race) {
  return [clean(state?.date), fold(cityName()), Number(race?.no) || 0].join('|');
}
function archiveKey(race) {
  return ['model', clean(state?.date), clean(state?.city), clean(race?.no)].join('|');
}
function validModel(data) {
  return Boolean(data && Number(data?.no) > 0 && Array.isArray(data?.horses) && data.horses.length > 0);
}
function raceFingerprint(race) {
  if (!race) return '';
  const horses = (Array.isArray(race?.horses) ? race.horses : [])
    .map(h => [clean(h?.no), clean(h?.id), clean(h?.name).toLocaleUpperCase('tr-TR')].join(':'))
    .sort();
  return [
    clean(race?.no), clean(race?.class || race?.yaradi1), clean(race?.ageGroup || race?.yaradi2),
    clean(race?.distance || race?.mesafe), clean(race?.track || race?.pist), horses.join('|')
  ].join('||');
}
function remember(key, data) {
  if (!validModel(data)) return;
  resolved.delete(key);
  resolved.set(key, data);
  while (resolved.size > MAX_RESOLVED) resolved.delete(resolved.keys().next().value);
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    let request;
    try { request = indexedDB.open(DB_NAME, 1); } catch { return resolve(null); }
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE)
        ? request.transaction.objectStore(STORE)
        : db.createObjectStore(STORE, { keyPath:'key' });
      if (!store.indexNames.contains('date')) store.createIndex('date', 'date', { unique:false });
      if (!store.indexNames.contains('kind')) store.createIndex('kind', 'kind', { unique:false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}
async function readArchive(race) {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(archiveKey(race));
      request.onsuccess = () => {
        const record = request.result;
        const fingerprint = clean(record?.fingerprint) || raceFingerprint(record?.race);
        resolve(record?.kind === 'model' && record?.engine === MODEL_ENGINE && fingerprint === raceFingerprint(race) && validModel(record?.data) ? record.data : null);
      };
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
function sharedModel(race) {
  try {
    const api = window.ATFiveModelSharedCacheV1685 || window.ATFiveModelSharedCacheV1687;
    const data = api?.get?.(race?.no);
    return validModel(data) ? data : null;
  } catch { return null; }
}

function notify(key, phase, detail = {}) {
  try {
    document.dispatchEvent(new CustomEvent('at-five-model-progress-v1697', { detail:{ key, phase, ...detail } }));
  } catch {}
}

const getModelsBeforeV1697 = typeof getCareerRaceModelsV112 === 'function' ? getCareerRaceModelsV112 : null;
if (getModelsBeforeV1697) {
  getCareerRaceModelsV112 = async function(race) {
    const key = contextKey(race);
    const memory = resolved.get(key);
    if (validModel(memory)) {
      stats.memoryHits++;
      notify(key, 'cache', { source:'memory' });
      return memory;
    }
    const session = sharedModel(race);
    if (validModel(session)) {
      stats.sessionHits++;
      remember(key, session);
      notify(key, 'cache', { source:'session' });
      return session;
    }
    const archived = await readArchive(race);
    if (validModel(archived)) {
      stats.archiveHits++;
      remember(key, archived);
      notify(key, 'cache', { source:'archive' });
      return archived;
    }
    if (inflight.has(key)) {
      stats.duplicatesBlocked++;
      notify(key, 'deduped');
      return inflight.get(key);
    }
    stats.networkStarts++;
    notify(key, 'network');
    const task = Promise.resolve().then(() => getModelsBeforeV1697(race));
    inflight.set(key, task);
    try {
      const data = await task;
      if (validModel(data)) remember(key, data);
      stats.completed++;
      notify(key, 'done');
      return data;
    } catch (error) {
      stats.failed++;
      notify(key, 'error', { message:clean(error?.message) });
      throw error;
    } finally {
      if (inflight.get(key) === task) inflight.delete(key);
    }
  };
}

function ensureStyle() {
  if (document.getElementById('fiveModelRepairStyleV1697')) return;
  const style = document.createElement('style');
  style.id = 'fiveModelRepairStyleV1697';
  style.textContent = `
    #analysisDialog .analysis-content{touch-action:pan-y!important;pointer-events:auto!important;-webkit-overflow-scrolling:touch!important}
    #analysisDialog #closeDialog{position:relative!important;z-index:8!important;pointer-events:auto!important;touch-action:manipulation!important}
    .fmr-progress-v1697{margin:10px;border:1px solid rgba(96,183,255,.26);border-radius:13px;padding:11px;background:rgba(4,15,27,.72);contain:layout style}
    .fmr-progress-head-v1697{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:7px}
    .fmr-progress-head-v1697 b{font-size:14px}.fmr-progress-percent-v1697{font-size:19px;font-weight:900;color:#8fd3ff}
    .fmr-progress-track-v1697{height:9px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08)}
    .fmr-progress-fill-v1697{display:block;height:100%;width:5%;border-radius:999px;background:linear-gradient(90deg,#32b5ff,#5977ff);transition:width .7s ease}
    .fmr-progress-phase-v1697{margin-top:8px;font-size:12px;color:#d4e7f8;font-weight:700;line-height:1.35}
    .fmr-progress-foot-v1697{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:5px;font-size:11px;color:#93aac0}
    .fmr-progress-actions-v1697{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .fmr-progress-actions-v1697 button{flex:1 1 150px;min-height:42px}
    .fmr-repair-note-v1697{margin-top:8px;padding:7px 9px;border-radius:9px;background:rgba(126,226,168,.07);border:1px solid rgba(126,226,168,.15);font-size:10px;color:#a9d9bd;line-height:1.4}
    .fmr-done-v1697{margin:8px 0;padding:8px 10px;border-radius:10px;background:rgba(76,201,125,.09);border:1px solid rgba(76,201,125,.22);color:#8ae6ad;font-size:11px;font-weight:800}
    .fmr-error-v1697{padding:12px;font-size:11px;color:#ffd0d7}.fmr-error-v1697 button{margin-top:9px;width:100%}
    @media(max-width:700px){.fmr-progress-v1697{margin:8px 2px}.fmr-progress-actions-v1697{position:sticky;bottom:0;background:#08131f;padding-top:7px;z-index:6}}
  `;
  document.head.appendChild(style);
}

function estimate(ms) {
  const sec = ms / 1000;
  const spans = [
    [0,2,5,12,'Arşiv ve istek onarımı denetleniyor'],
    [2,10,12,28,'Tarihsel yıllar ve koşu şartları taranıyor'],
    [10,25,28,50,'Geçmiş yarışlar doğrulanıyor'],
    [25,48,50,74,'İlk 3 atın yarış öncesi kariyerleri hazırlanıyor'],
    [48,70,74,92,'5 Model puanları ve sıralamalar hesaplanıyor'],
    [70,99999,95,95,'Sunucu yanıtı bekleniyor; arayüz kullanılabilir']
  ];
  for (const [a,b,p0,p1,label] of spans) {
    if (sec >= a && sec < b) {
      const ratio = b > 90000 ? 0 : Math.max(0, Math.min(1, (sec-a)/(b-a)));
      return { pct:Math.round(p0+(p1-p0)*ratio), label };
    }
  }
  return { pct:95, label:'Sunucu yanıtı bekleniyor; arayüz kullanılabilir' };
}
function progressHtml() {
  return `<div class="fmr-progress-v1697" role="status" aria-live="polite">
    <div class="fmr-progress-head-v1697"><b>5 Model çalışıyor</b><span class="fmr-progress-percent-v1697">5%</span></div>
    <div class="fmr-progress-track-v1697"><i class="fmr-progress-fill-v1697"></i></div>
    <div class="fmr-progress-phase-v1697">Arşiv ve istek onarımı denetleniyor</div>
    <div class="fmr-progress-foot-v1697"><span>Yaklaşık ilerleme · tek istek koruması aktif</span><span class="fmr-progress-time-v1697">0 sn</span></div>
    <div class="fmr-repair-note-v1697">İstek Onarımı: günlük arşiv → oturum önbelleği → tek ağ isteği sırasıyla kontrol edilir; yinelenen işler engellenir.</div>
    <div class="fmr-progress-actions-v1697"><button type="button" class="secondary" data-fmr-background-v1697>Arka planda sürdür ve menüye dön</button></div>
  </div>`;
}
function updateUi(job) {
  if (!job?.host || !document.contains(job.host)) return;
  const elapsed = Date.now() - job.startedAt;
  const step = estimate(elapsed);
  const percent = job.host.querySelector('.fmr-progress-percent-v1697');
  const fill = job.host.querySelector('.fmr-progress-fill-v1697');
  const phase = job.host.querySelector('.fmr-progress-phase-v1697');
  const time = job.host.querySelector('.fmr-progress-time-v1697');
  if (percent) percent.textContent = `${step.pct}%`;
  if (fill) fill.style.width = `${step.pct}%`;
  if (phase) phase.textContent = step.label;
  if (time) time.textContent = `${Math.floor(elapsed/1000)} sn`;
}
function stopUi(key) {
  const job = uiJobs.get(key);
  if (job?.timer) clearInterval(job.timer);
  uiJobs.delete(key);
  return job;
}
function backgroundContinue() {
  const dialog = document.getElementById('analysisDialog');
  try { if (dialog?.open) dialog.close(); } catch {}
  setTimeout(repairLocks, 0);
}
function startUi(body, key) {
  stopUi(key);
  body.innerHTML = progressHtml();
  body.querySelector('[data-fmr-background-v1697]')?.addEventListener('click', backgroundContinue);
  const job = { host:body.querySelector('.fmr-progress-v1697'), startedAt:Date.now(), timer:null };
  job.timer = setInterval(() => updateUi(job), 800);
  uiJobs.set(key, job);
  updateUi(job);
  return job;
}
function sourceText(source) {
  if (source === 'archive') return 'Günlük arşivden hazırlandı';
  if (source === 'session') return 'Oturum önbelleğinden hazırlandı';
  if (source === 'memory') return 'Açık oturum sonucundan hazırlandı';
  return 'Yeni hesaplama tamamlandı';
}
function paint() {
  return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}
function idle() {
  return new Promise(resolve => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout:700 });
    else setTimeout(resolve, 16);
  });
}
function renderModels(body, box, data, elapsedMs, source) {
  const ids = ['composite','exact','twin','family','career'];
  body.innerHTML = `<div class="fmr-done-v1697">100% · 5 Model hazır · ${Math.max(0,Math.round(elapsedMs/1000))} sn · ${esc(sourceText(source))}</div>${typeof careerCriteriaNoteV112 === 'function' ? careerCriteriaNoteV112() : ''}<div class="career-model-tabs-v112">${ids.map((id,index) => `<button class="career-model-tab-v112 ${index===0?'active':''}" data-career-model-tab="${esc(id)}">${esc(typeof modelDefinitionV112 === 'function' ? modelDefinitionV112(id).short : id)}</button>`).join('')}</div>${ids.map((id,index) => typeof modelPanelV112 === 'function' ? modelPanelV112(data,id,index===0) : '').join('')}`;
  try { if (typeof bindCareerModelTabsV112 === 'function') bindCareerModelTabsV112(box); } catch {}
  const small = box.querySelector('summary small');
  if (small) small.textContent = 'Hazır · sekmeleri açabilirsiniz';
}

async function load(box, race) {
  if (!box || box.dataset.loaded === '1') return;
  box.dataset.loaded = '1';
  ensureStyle();
  const body = box.querySelector('[data-v139-model-body]');
  if (!body) return;
  const key = contextKey(race);
  const before = { ...stats };
  const startedAt = Date.now();
  startUi(body, key);
  await paint();
  try {
    if (typeof getCareerRaceModelsV112 !== 'function') throw new Error('5 Model motoru bulunamadı.');
    const data = await getCareerRaceModelsV112(race);
    const source = stats.archiveHits > before.archiveHits ? 'archive'
      : stats.sessionHits > before.sessionHits ? 'session'
      : stats.memoryHits > before.memoryHits ? 'memory' : 'network';
    stopUi(key);
    await idle();
    renderModels(body, box, data, Date.now()-startedAt, source);
  } catch (error) {
    stopUi(key);
    box.dataset.loaded = '0';
    body.innerHTML = `<div class="fmr-error-v1697">⚠ ${esc(error?.message || '5 Model verisi hazırlanamadı.')}<button type="button" class="secondary" data-fmr-retry-v1697>Tekrar Dene</button></div>`;
    body.querySelector('[data-fmr-retry-v1697]')?.addEventListener('click', () => {
      box.dataset.loaded = '0';
      load(box, race).catch(() => {});
    });
  }
}

function repairLocks() {
  ensureStyle();
  const dialog = document.getElementById('analysisDialog');
  const content = document.getElementById('analysisContent');
  if (dialog?.open) {
    if (content) {
      content.style.pointerEvents = 'auto';
      content.style.touchAction = 'pan-y';
      content.style.overflowY = 'auto';
      content.style.webkitOverflowScrolling = 'touch';
    }
    const close = document.getElementById('closeDialog');
    if (close) { close.style.pointerEvents = 'auto'; close.style.touchAction = 'manipulation'; }
    return;
  }
  const locked = document.body?.dataset?.analysisLockV104 === '1'
    || document.documentElement.classList.contains('analysis-lock-v104')
    || document.documentElement.classList.contains('at-hard-modal-lock-v1659');
  if (!locked) return;
  try { if (typeof unlockAnalysisPageV104 === 'function') unlockAnalysisPageV104(); } catch {}
  document.documentElement.classList.remove('analysis-lock-v104','at-hard-modal-lock-v1659');
  document.body?.classList.remove('analysis-lock-v104');
  if (document.body) {
    delete document.body.dataset.analysisLockV104;
    for (const prop of ['position','top','left','right','width']) document.body.style[prop] = '';
  }
  stats.lockRepairs++;
}

document.addEventListener('at-five-model-progress-v1697', event => {
  const detail = event.detail || {};
  const job = uiJobs.get(detail.key);
  const phase = job?.host?.querySelector('.fmr-progress-phase-v1697');
  if (!phase) return;
  if (detail.phase === 'deduped') phase.textContent = 'Devam eden tek hesap bekleniyor; ikinci istek engellendi';
  if (detail.phase === 'cache') phase.textContent = detail.source === 'archive' ? 'Günlük arşiv sonucu açılıyor' : 'Oturum önbelleği açılıyor';
});
document.addEventListener('close', () => setTimeout(repairLocks, 0), true);
window.addEventListener('pageshow', repairLocks);
document.addEventListener('visibilitychange', () => { if (!document.hidden) repairLocks(); });
setInterval(repairLocks, 2000);
ensureStyle();
repairLocks();

window.ATFiveModelRepairV1697 = {
  VERSION,
  load,
  repair:repairLocks,
  stats:() => ({ ...stats, inflight:inflight.size, resolved:resolved.size, uiJobs:uiJobs.size })
};
console.info('[AT AI]', VERSION, 'aktif — yüzde ilerleme + tek istek + arşiv önceliği + mobil kilit onarımı');
})();
