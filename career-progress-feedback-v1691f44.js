/* AT AI Mobil - V16.9.1F44 CAREER PROGRESS FEEDBACK
   - Kariyer analizi, günlük arşiv ve 5 Model panelinde görünür süre/adım bilgisi gösterir.
   - Ağır TJK model çağrılarında kullanıcıyı sessiz bekletmez.
   - Hata veya boş model sonucunda panel içine güvenli Tekrar dene düğmesi ekler.
*/
(() => {
'use strict';
if (window.__AT_CAREER_PROGRESS_FEEDBACK_V1691F44__) return;
window.__AT_CAREER_PROGRESS_FEEDBACK_V1691F44__ = true;

const VERSION = 'CAREER-PROGRESS-FEEDBACK-V16.9.1F44';
const PANEL_ID = 'careerProgressFeedbackV1691F44';
const STYLE_ID = 'careerProgressFeedbackStyleV1691F44';
const RETRY_ATTR = 'data-v1691f44-model-retry';
const modelOutcome = new Map();

let active = null;
let timer = null;
let seq = 0;
let observerStarted = false;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = value => {
  const text = clean(value);
  try { return typeof escapeHtml === 'function' ? escapeHtml(text) : text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  catch { return text; }
};
const finite = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function dialogCareerOpen() {
  const dlg = document.getElementById('analysisDialog');
  return Boolean(dlg && dlg.open && dlg.dataset.view === 'career');
}

function currentRaceNo() {
  return clean(document.getElementById('analysisRace')?.value || '');
}

function getCity() {
  try { return clean(typeof state !== 'undefined' ? state?.city : ''); } catch { return ''; }
}

function getDate() {
  try { return clean(typeof state !== 'undefined' ? state?.date : ''); } catch { return ''; }
}

function raceKey(raceNo) {
  return [getDate(), getCity(), clean(raceNo)].join('|');
}

function raceFromUi(raceNo = currentRaceNo()) {
  try {
    return (Array.isArray(state?.races) ? state.races : []).find(r => String(r?.no) === String(raceNo)) || null;
  } catch { return null; }
}

function raceHorseCount(race) {
  return Array.isArray(race?.horses) ? race.horses.length : 0;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    '#' + PANEL_ID + '{position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483646;background:#071724;color:#eef7ff;border:1px solid rgba(126,226,168,.32);box-shadow:0 16px 45px rgba(0,0,0,.42);border-radius:12px;padding:11px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.35}',
    '@media (min-width:720px){#' + PANEL_ID + '{left:auto;right:18px;bottom:18px;width:390px}}',
    '#' + PANEL_ID + ' .cpf44-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px}',
    '#' + PANEL_ID + ' .cpf44-title{font-weight:800;font-size:13px}',
    '#' + PANEL_ID + ' .cpf44-stage{opacity:.88;margin-bottom:7px}',
    '#' + PANEL_ID + ' .cpf44-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;color:#b8d3e8;font-size:11px}',
    '#' + PANEL_ID + ' .cpf44-chip{border:1px solid rgba(255,255,255,.13);border-radius:999px;padding:3px 7px;background:rgba(255,255,255,.05)}',
    '#' + PANEL_ID + ' .cpf44-track{height:7px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden}',
    '#' + PANEL_ID + ' .cpf44-bar{height:100%;width:0;background:linear-gradient(90deg,#38bdf8,#7ee2a8);border-radius:999px;transition:width .3s ease}',
    '#' + PANEL_ID + ' .cpf44-note{margin-top:7px;color:#9fb8ca;font-size:10.5px}',
    '#' + PANEL_ID + ' .cpf44-close{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#eef7ff;border-radius:8px;padding:4px 7px;font-size:11px}',
    '#' + PANEL_ID + '.error{border-color:rgba(248,113,113,.45)}',
    '#' + PANEL_ID + '.done{border-color:rgba(126,226,168,.5)}',
    '.career-progress-inline-v1691f44{margin:8px 0;padding:9px 10px;border-radius:10px;background:rgba(56,189,248,.09);border:1px solid rgba(56,189,248,.22);font-size:11px;line-height:1.45;color:#dff6ff}',
    '.career-progress-error-v1691f44{margin:8px 0;padding:9px 10px;border-radius:10px;background:rgba(248,113,113,.10);border:1px solid rgba(248,113,113,.24);font-size:11px;line-height:1.45;color:#ffe8e8}',
    '.career-progress-retry-v1691f44{margin-top:8px;border:1px solid rgba(126,226,168,.35);background:rgba(126,226,168,.12);color:#eef7ff;border-radius:9px;padding:7px 10px;font-weight:700}'
  ].join('\n');
  document.head.appendChild(style);
}

function ensurePanel() {
  installStyle();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.hidden = true;
    document.body.appendChild(panel);
    panel.addEventListener('click', event => {
      if (event.target?.closest?.('[data-cpf44-close]')) hidePanel();
    });
  }
  return panel;
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function startTimer() {
  if (timer) return;
  timer = setInterval(renderPanel, 1000);
}

function hidePanel() {
  stopTimer();
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.hidden = true;
  active = null;
}

function elapsedSec(op = active) {
  return op ? Math.max(0, Math.round((Date.now() - op.startedAt) / 1000)) : 0;
}

function percentFor(op) {
  if (!op) return 0;
  if (op.state === 'done') return 100;
  if (op.state === 'error') return 100;
  const elapsed = Date.now() - op.startedAt;
  const timed = op.estimateMs ? Math.min(88, Math.round(elapsed / op.estimateMs * 100)) : Math.min(82, Math.round(elapsed / 120000 * 100));
  return Math.max(3, Math.min(94, op.percent || 0, timed));
}

function estimateText(op) {
  if (!op) return '';
  if (op.state === 'done') return 'tamamlandı';
  if (op.state === 'error') return 'hata';
  const elapsed = elapsedSec(op);
  if (!op.estimateMs) return 'süre TJK yanıtına bağlı';
  const target = Math.round(op.estimateMs / 1000);
  if (elapsed >= target) return 'TJK yanıtı bekleniyor';
  return 'yaklaşık ' + Math.max(1, target - elapsed) + ' sn kaldı';
}

function renderPanel() {
  if (!active) return;
  const panel = ensurePanel();
  const pct = percentFor(active);
  panel.hidden = false;
  panel.classList.toggle('done', active.state === 'done');
  panel.classList.toggle('error', active.state === 'error');
  const elapsed = elapsedSec(active);
  const note = active.note || (active.kind === 'five-model'
    ? 'Tarihsel model adımı ağır olabilir; hedef genelde 45-90 sn aralığıdır.'
    : 'Arşiv varsa hızlı açılır; yoksa canlı hesap tamamlanınca otomatik kaydedilir.');
  panel.innerHTML =
    '<div class="cpf44-head">' +
      '<div><div class="cpf44-title">' + esc(active.title) + '</div></div>' +
      '<button type="button" class="cpf44-close" data-cpf44-close>Gizle</button>' +
    '</div>' +
    '<div class="cpf44-stage">' + esc(active.stage || 'Hazırlanıyor...') + '</div>' +
    '<div class="cpf44-meta">' +
      '<span class="cpf44-chip">Geçen: ' + elapsed + ' sn</span>' +
      '<span class="cpf44-chip">' + esc(estimateText(active)) + '</span>' +
      (active.horseText ? '<span class="cpf44-chip">' + esc(active.horseText) + '</span>' : '') +
    '</div>' +
    '<div class="cpf44-track"><div class="cpf44-bar" style="width:' + pct + '%"></div></div>' +
    '<div class="cpf44-note">' + esc(note) + '</div>';
}

function shouldShow(force) {
  return Boolean(force || dialogCareerOpen());
}

function startProgress(kind, options = {}) {
  if (!shouldShow(options.force)) return null;
  const same = active && active.kind === kind && clean(active.raceNo) === clean(options.raceNo) && active.state === 'running';
  if (same) {
    updateProgress(active.id, options);
    return active.id;
  }
  active = {
    id: ++seq,
    kind,
    title: options.title || 'İşlem hazırlanıyor',
    stage: options.stage || 'Başlatılıyor...',
    note: options.note || '',
    raceNo: options.raceNo || '',
    totalHorses: finite(options.totalHorses) || 0,
    doneHorses: 0,
    startedHorses: 0,
    horseText: options.horseText || '',
    percent: finite(options.percent) || 4,
    estimateMs: finite(options.estimateMs) || 0,
    startedAt: Date.now(),
    state: 'running'
  };
  renderPanel();
  startTimer();
  return active.id;
}

function updateProgress(id, patch = {}) {
  if (!active) return;
  if (id && active.id !== id) return;
  Object.assign(active, patch);
  if (patch.percent !== undefined) active.percent = Math.max(active.percent || 0, finite(patch.percent) || 0);
  renderPanel();
}

function finishProgress(id, message) {
  if (!active) return;
  if (id && active.id !== id) return;
  active.state = 'done';
  active.stage = message || 'Hazır.';
  active.percent = 100;
  renderPanel();
  const finishedId = active.id;
  setTimeout(() => {
    if (active?.id === finishedId && active.state === 'done') hidePanel();
  }, 2600);
}

function failProgress(id, message) {
  if (!active) return;
  if (id && active.id !== id) return;
  active.state = 'error';
  active.stage = message || 'İşlem tamamlanamadı.';
  active.percent = 100;
  active.note = 'Bu durumda aynı panelden Tekrar dene ile yeniden başlatabilirsiniz.';
  renderPanel();
}

function setFiveModelSmall(text) {
  try {
    const box = document.getElementById('careerFiveModelV139');
    const small = box?.querySelector?.('summary small');
    if (small) small.textContent = text;
  } catch {}
}

function setFiveModelInline(body, text) {
  if (!body || body.querySelector('.career-progress-inline-v1691f44')) return;
  const div = document.createElement('div');
  div.className = 'career-progress-inline-v1691f44';
  div.textContent = text;
  body.prepend(div);
}

function addWarning(body, text) {
  if (!body || body.querySelector('.career-progress-error-v1691f44')) return;
  const div = document.createElement('div');
  div.className = 'career-progress-error-v1691f44';
  div.innerHTML = '<b>5 Model verisi tamamlanamadı.</b><br>' + esc(text || 'Tarihsel model verisi alınamadı.');
  body.prepend(div);
}

function clearRaceCaches(race) {
  try { window.ATCareerFiveModelFreshStartRecoveryV1691F41?.resetRace?.(race); } catch {}
  try { window.ATCareerFiveModelStaleRecoveryV1691F40?.resetRace?.(race); } catch {}
  try {
    if (typeof careerModelCacheV112 !== 'undefined' && typeof careerModelKeyV112 === 'function') {
      careerModelCacheV112.delete(careerModelKeyV112(race));
    }
  } catch {}
}

function retryFiveModel(box) {
  const race = raceFromUi();
  const body = box?.querySelector?.('[data-v139-model-body]');
  if (!box || !race) return;
  modelOutcome.delete(raceKey(race.no));
  clearRaceCaches(race);
  box.dataset.loaded = '0';
  if (body) body.innerHTML = '<div class="career-model-loading-v112">5 Model yeniden başlatılıyor...</div>';
  startProgress('five-model', {
    raceNo: race.no,
    title: String(race.no) + '. Koşu 5 Model hazırlanıyor',
    stage: 'Tekrar başlatıldı; arşiv kontrol ediliyor...',
    percent: 6,
    estimateMs: 90000,
    totalHorses: raceHorseCount(race),
    horseText: raceHorseCount(race) ? 'At: 0 / ' + raceHorseCount(race) : ''
  });
  box.open = false;
  setTimeout(() => { box.open = true; }, 80);
}

function installRetry(body, box) {
  if (!body || body.querySelector('[' + RETRY_ATTR + ']')) return;
  const holder = body.querySelector('.career-model-empty-v112') || body.querySelector('.career-progress-error-v1691f44') || body;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'career-progress-retry-v1691f44';
  btn.setAttribute(RETRY_ATTR, '1');
  btn.textContent = 'Tekrar dene';
  btn.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    retryFiveModel(box);
  });
  holder.appendChild(btn);
}

function inspectFiveModelBox() {
  const box = document.getElementById('careerFiveModelV139');
  if (!box) return;
  const body = box.querySelector('[data-v139-model-body]');
  if (!body) return;
  const raceNo = currentRaceNo();
  const key = raceKey(raceNo);
  const text = clean(body.textContent);

  if (box.open && (body.querySelector('.career-model-loading-v112') || /hazırlan|hazirlan|başlatılıyor|baslatiliyor/i.test(text))) {
    setFiveModelSmall('Hazırlanıyor... geçen süre ekranda');
    setFiveModelInline(body, 'Hazırlanıyor: arşiv kontrolü, canlı model ve güncel at kariyerleri izleniyor.');
    if (!active || active.kind !== 'five-model') {
      const race = raceFromUi(raceNo);
      startProgress('five-model', {
        raceNo,
        title: (raceNo || '?') + '. Koşu 5 Model hazırlanıyor',
        stage: 'Panel açıldı; arşiv kontrol ediliyor...',
        percent: 6,
        estimateMs: 90000,
        totalHorses: raceHorseCount(race),
        horseText: raceHorseCount(race) ? 'At: 0 / ' + raceHorseCount(race) : ''
      });
    }
  }

  const outcome = modelOutcome.get(key);
  if (outcome && outcome.ok === false) {
    addWarning(body, outcome.error);
    installRetry(body, box);
    setFiveModelSmall('Hazırlanamadı · tekrar deneyin');
    failProgress(null, outcome.error);
    return;
  }

  const empty = body.querySelector('.career-model-empty-v112');
  if (empty) {
    box.dataset.loaded = '0';
    installRetry(body, box);
    setFiveModelSmall('Hazırlanamadı · tekrar deneyin');
    failProgress(null, clean(empty.textContent) || '5 Model verisi hazırlanamadı.');
    return;
  }

  if (box.open && (body.querySelector('[data-career-model-tab]') || body.querySelector('[data-career-model-panel]'))) {
    setFiveModelSmall('Hazır');
    if (active?.kind === 'five-model' && active.state === 'running') {
      finishProgress(active.id, (raceNo || '?') + '. Koşu 5 Model sıralaması hazır.');
    }
  }
}

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;
  document.addEventListener('toggle', event => {
    if (event.target?.id === 'careerFiveModelV139') setTimeout(inspectFiveModelBox, 0);
  }, true);
  document.addEventListener('click', event => {
    const runBtn = event.target?.closest?.('#runAnalysis');
    if (runBtn && dialogCareerOpen()) {
      const selected = currentRaceNo();
      startProgress('archive-check', {
        title: selected && selected !== 'all' ? selected + '. Koşu arşiv kontrolü' : 'Günlük kariyer arşivi kontrolü',
        stage: 'Önce kayıtlı günlük arşive bakılıyor...',
        percent: 5,
        estimateMs: 12000
      });
    }
    if (event.target?.closest?.('#careerArchiveOpenV146')) {
      startProgress('archive-open', { title:'Günlük arşiv açılıyor', stage:'Kayıtlar taranıyor...', percent:10, estimateMs:5000 });
      setTimeout(() => { if (active?.kind === 'archive-open') finishProgress(active.id, 'Günlük arşiv listesi hazır.'); }, 2200);
    }
    if (event.target?.closest?.('#careerArchivePdfV146,#careerArchiveDayPdfV146,[data-pdf]')) {
      startProgress('pdf', { title:'Günün PDF dosyası hazırlanıyor', stage:'Arşivdeki sıralamalar PDF tablolarına aktarılıyor...', percent:8, estimateMs:18000 });
      setTimeout(() => { if (active?.kind === 'pdf' && active.state === 'running') updateProgress(active.id, { stage:'PDF motoru çalışıyor; indirme penceresi birazdan açılır...', percent:70 }); }, 7000);
    }
  }, true);
  const mo = new MutationObserver(() => inspectFiveModelBox());
  mo.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['open','data-loaded'] });
  setInterval(inspectFiveModelBox, 1500);
}

function wrapRunAnalysis() {
  if (typeof runAnalysis !== 'function' || runAnalysis.__cpf44) return;
  const before = runAnalysis;
  runAnalysis = async function(...args) {
    if (!dialogCareerOpen()) return before.apply(this, args);
    const selected = currentRaceNo();
    const id = startProgress('archive-check', {
      title: selected && selected !== 'all' ? selected + '. Koşu arşiv kontrolü' : 'Günlük kariyer arşivi kontrolü',
      stage: 'Arşiv kaydı kontrol ediliyor...',
      percent: 5,
      estimateMs: 12000
    });
    try {
      const out = await before.apply(this, args);
      if (id && active?.id === id && active.state === 'running') finishProgress(id, 'Arşivden açıldı veya analiz hazır.');
      return out;
    } catch (error) {
      if (id && active?.id === id) failProgress(id, error?.message || 'Analiz başlatılamadı.');
      throw error;
    }
  };
  runAnalysis.__cpf44 = true;
  try { const btn = document.getElementById('runAnalysis'); if (btn) btn.onclick = runAnalysis; } catch {}
}

function wrapRunCareerAnalysis() {
  if (typeof runCareerAnalysis !== 'function' || runCareerAnalysis.__cpf44) return;
  const before = runCareerAnalysis;
  runCareerAnalysis = async function(selectedRaces = [], raceValue = 'all', ...rest) {
    const raceCount = Array.isArray(selectedRaces) ? selectedRaces.length : 0;
    const totalHorses = (Array.isArray(selectedRaces) ? selectedRaces : []).reduce((sum, race) => sum + raceHorseCount(race), 0);
    const title = raceValue === 'all' ? 'Günlük kariyer arşivi hazırlanıyor' : String(raceValue) + '. Koşu kariyer arşivi hazırlanıyor';
    const estimateMs = Math.min(180000, Math.max(45000, totalHorses * 2200 + raceCount * 26000));
    const id = startProgress('career-analysis', {
      title,
      stage: 'Güncel at kariyerleri alınıyor...',
      percent: 8,
      estimateMs,
      totalHorses,
      horseText: totalHorses ? 'At: 0 / ' + totalHorses : ''
    });
    try {
      const out = await before.call(this, selectedRaces, raceValue, ...rest);
      if (id && active?.id === id) finishProgress(id, 'Kariyer analizi ve günlük arşiv kaydı hazır.');
      return out;
    } catch (error) {
      if (id && active?.id === id) failProgress(id, error?.message || 'Kariyer analizi tamamlanamadı.');
      throw error;
    }
  };
  runCareerAnalysis.__cpf44 = true;
}

function wrapFetchCareer() {
  if (typeof fetchCareer !== 'function' || fetchCareer.__cpf44) return;
  const before = fetchCareer;
  fetchCareer = async function(...args) {
    const op = active;
    if (op && op.state === 'running' && (op.kind === 'career-analysis' || op.kind === 'five-model')) {
      op.startedHorses = (op.startedHorses || 0) + 1;
      const total = op.totalHorses || op.startedHorses;
      updateProgress(op.id, {
        stage: op.kind === 'five-model' ? 'Güncel at kariyerleri ve model verisi hazırlanıyor...' : 'Güncel at kariyerleri alınıyor...',
        horseText: 'At: ' + (op.doneHorses || 0) + ' / ' + total,
        percent: op.kind === 'five-model' ? 34 : 18
      });
    }
    try {
      return await before.apply(this, args);
    } finally {
      if (op && active?.id === op.id && active.state === 'running') {
        op.doneHorses = (op.doneHorses || 0) + 1;
        const total = Math.max(op.totalHorses || 0, op.startedHorses || 0, op.doneHorses || 0);
        const byHorses = total ? Math.round((op.doneHorses / total) * (op.kind === 'five-model' ? 35 : 42)) : 0;
        updateProgress(op.id, {
          horseText: 'At: ' + op.doneHorses + ' / ' + total,
          percent: (op.kind === 'five-model' ? 34 : 18) + byHorses
        });
      }
    }
  };
  fetchCareer.__cpf44 = true;
}

function wrapFetchModelRoadmap() {
  if (typeof fetchModelRoadmapV11 !== 'function' || fetchModelRoadmapV11.__cpf44) return;
  const before = fetchModelRoadmapV11;
  fetchModelRoadmapV11 = async function(race, ...rest) {
    const no = clean(race?.no || currentRaceNo());
    const key = raceKey(no);
    if (active?.state === 'running') {
      updateProgress(active.id, {
        stage: (no || '?') + '. koşu tarihsel 5 model verisi alınıyor...',
        percent: 28,
        note: 'Bu en uzun adımdır; TJK yıllık/tarihsel cevap süresi değişebilir.'
      });
    }
    try {
      const out = await before.call(this, race, ...rest);
      if (out?.ok === false) {
        const msg = out.error || 'Tarihsel model verisi alınamadı.';
        modelOutcome.set(key, { ok:false, error:msg });
        if (active?.state === 'running') failProgress(active.id, msg);
      } else {
        modelOutcome.set(key, { ok:true });
        if (active?.state === 'running') updateProgress(active.id, { stage:'Tarihsel model verisi geldi; sıralama tablosu kuruluyor...', percent:82 });
      }
      return out;
    } catch (error) {
      const msg = error?.message || 'Tarihsel model verisi alınamadı.';
      modelOutcome.set(key, { ok:false, error:msg });
      if (active?.state === 'running') failProgress(active.id, msg);
      throw error;
    }
  };
  fetchModelRoadmapV11.__cpf44 = true;
}

function wrapPrepareModels() {
  if (typeof prepareRaceModelsV11 !== 'function' || prepareRaceModelsV11.__cpf44) return;
  const before = prepareRaceModelsV11;
  prepareRaceModelsV11 = async function(race, progress, ...rest) {
    if (active?.state === 'running') {
      updateProgress(active.id, {
        stage: clean(race?.no || currentRaceNo()) + '. koşu bağımsız 5 model hesaplanıyor...',
        percent: 18
      });
    }
    const relay = message => {
      if (active?.state === 'running') updateProgress(active.id, { stage: clean(message), percent: 22 });
      if (typeof progress === 'function') progress(message);
    };
    return before.call(this, race, relay, ...rest);
  };
  prepareRaceModelsV11.__cpf44 = true;
}

function wrapGetCareerModels() {
  if (typeof getCareerRaceModelsV112 !== 'function' || getCareerRaceModelsV112.__cpf44) return;
  const before = getCareerRaceModelsV112;
  getCareerRaceModelsV112 = async function(race, ...rest) {
    if (!dialogCareerOpen()) return before.call(this, race, ...rest);
    const no = clean(race?.no || currentRaceNo());
    const key = raceKey(no);
    modelOutcome.delete(key);
    const id = startProgress('five-model', {
      raceNo: no,
      title: (no || '?') + '. Koşu 5 Model hazırlanıyor',
      stage: 'Arşiv ve önbellek kontrol ediliyor...',
      percent: 6,
      estimateMs: 90000,
      totalHorses: raceHorseCount(race),
      horseText: raceHorseCount(race) ? 'At: 0 / ' + raceHorseCount(race) : ''
    });
    const slowTimer = setTimeout(() => {
      if (id && active?.id === id && active.state === 'running') {
        updateProgress(id, { stage:'Arşiv ön kontrolü uzadı; canlı hesaplama zinciri izleniyor...', percent:14 });
      }
    }, 3600);
    try {
      const data = await before.call(this, race, ...rest);
      clearTimeout(slowTimer);
      if (data?.roadmapOk === false) {
        const msg = data.roadmapError || 'Tarihsel model verisi alınamadı.';
        modelOutcome.set(key, { ok:false, error:msg });
        if (id && active?.id === id) failProgress(id, msg);
      } else {
        modelOutcome.set(key, { ok:true });
        if (id && active?.id === id) finishProgress(id, (no || '?') + '. Koşu 5 Model sıralaması hazır.');
      }
      return data;
    } catch (error) {
      clearTimeout(slowTimer);
      const msg = error?.message || '5 Model verisi hazırlanamadı.';
      modelOutcome.set(key, { ok:false, error:msg });
      if (id && active?.id === id) failProgress(id, msg);
      throw error;
    }
  };
  getCareerRaceModelsV112.__cpf44 = true;
}

function boot() {
  startObserver();
  wrapRunAnalysis();
  wrapRunCareerAnalysis();
  wrapFetchCareer();
  wrapFetchModelRoadmap();
  wrapPrepareModels();
  wrapGetCareerModels();
  setTimeout(() => {
    wrapRunAnalysis();
    wrapRunCareerAnalysis();
    wrapFetchCareer();
    wrapFetchModelRoadmap();
    wrapPrepareModels();
    wrapGetCareerModels();
  }, 600);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATCareerProgressFeedbackV1691F44 = {
  version: VERSION,
  state: () => active ? { ...active, elapsedSec:elapsedSec(active) } : null,
  hide: hidePanel,
  retryFiveModel: () => retryFiveModel(document.getElementById('careerFiveModelV139'))
};

console.info('[AT AI]', VERSION, 'aktif - Kariyer arsiv ve 5 Model hazirlama sureci gorunur.');
})();