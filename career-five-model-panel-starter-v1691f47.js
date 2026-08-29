/* AT AI Mobil - V16.9.1F47 5 MODEL PANEL STARTER
   - Firefox/Android details toggle kacirildiginda 5 Model paneli sadece "hazirlaniyor"da kalmasin.
   - Panel acilinca body hala "Panel acildiginda hazirlanacak" ise modeli dogrudan baslatir.
   - Eski render fonksiyonlarini kullanir; hesaplama motoruna dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_PANEL_STARTER_V1691F47__) return;
window.__AT_CAREER_FIVE_MODEL_PANEL_STARTER_V1691F47__ = true;

const VERSION = 'CAREER-FIVE-MODEL-PANEL-STARTER-V16.9.1F47';
const BOX_ID = 'careerFiveModelV139';
const BODY_SELECTOR = '[data-v139-model-body]';
const MODEL_IDS = ['composite', 'exact', 'twin', 'family', 'career'];
const RETRY_ATTR = 'data-v1691f47-retry';

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = value => {
  const text = clean(value);
  try {
    if (typeof escapeHtml === 'function') return escapeHtml(text);
  } catch {}
  return text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
};

function box() {
  return document.getElementById(BOX_ID);
}

function bodyOf(target = box()) {
  return target?.querySelector?.(BODY_SELECTOR) || null;
}

function currentRaceNo() {
  const selected = clean(document.getElementById('analysisRace')?.value || '');
  if (selected && selected !== 'all') return selected;
  try {
    const m = clean(document.getElementById('analysisContent')?.textContent || '').match(/(\d+)\.\s*Ko[şs]u/i);
    if (m) return m[1];
  } catch {}
  return '';
}

function currentRace(raceNo = currentRaceNo()) {
  try {
    const race = (Array.isArray(state?.races) ? state.races : []).find(r => String(r?.no) === String(raceNo));
    if (race) return race;
  } catch {}

  try {
    const careerRace = (Array.isArray(state?.analyses?.career?.races) ? state.analyses.career.races : [])
      .find(r => String(r?.no) === String(raceNo));
    if (careerRace) {
      return {
        no: careerRace.no,
        class: careerRace.class || careerRace.meta?.class || '',
        ageGroup: careerRace.ageGroup || careerRace.meta?.ageGroup || '',
        distance: careerRace.distance || careerRace.meta?.distance || '',
        track: careerRace.track || careerRace.meta?.track || '',
        horses: (Array.isArray(careerRace.horses) ? careerRace.horses : []).map(item => item?.horse).filter(Boolean)
      };
    }
  } catch {}

  return null;
}

function hasRenderedModels(body) {
  return Boolean(body?.querySelector?.('[data-career-model-tab],[data-career-model-panel]'));
}

function looksWaitingForStarter(body) {
  if (!body || hasRenderedModels(body)) return false;
  const text = clean(body.textContent);
  return !text ||
    /panel acildiginda hazirlanacak/i.test(text) ||
    /panel açıldığında hazırlanacak/i.test(text) ||
    /haz[ıi]rlan[ıi]yor/i.test(text) ||
    /baslatiliyor|başlatılıyor/i.test(text);
}

function setSmall(text) {
  try {
    const small = box()?.querySelector?.('summary small');
    if (small) small.textContent = text;
  } catch {}
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

function renderLoading(body, race) {
  if (!body) return;
  body.innerHTML =
    '<div class="career-model-loading-v112">' +
      esc((race?.no || currentRaceNo() || '?') + '. Koşu 5 Model başlatıldı...') +
    '</div>' +
    '<div class="career-progress-inline-v1691f44" style="margin-top:8px;">' +
      'Panel açıldı; canlı 5 Model isteği başlatılıyor.' +
    '</div>';
}

function renderError(body, target, error) {
  if (!body) return;
  const msg = clean(error?.message || error || '5 Model verisi başlatılamadı.');
  body.innerHTML =
    '<div class="career-model-empty-v112">⚠ ' + esc(msg) + '</div>' +
    '<button type="button" class="career-progress-retry-v1691f44" ' + RETRY_ATTR + '="1">Tekrar dene</button>';
  body.querySelector('[' + RETRY_ATTR + ']')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    startModel(target, { force:true, clearCache:true });
  });
  setSmall('Hazırlanamadı · tekrar deneyin');
}

function renderModels(body, target, data) {
  if (!body) return;
  body.innerHTML =
    (typeof careerCriteriaNoteV112 === 'function' ? careerCriteriaNoteV112() : '') +
    '<div class="career-model-tabs-v112">' +
      MODEL_IDS.map((id, i) => {
        let label = id;
        try { if (typeof modelDefinitionV112 === 'function') label = modelDefinitionV112(id).short || id; } catch {}
        return '<button class="career-model-tab-v112 ' + (i === 0 ? 'active' : '') + '" data-career-model-tab="' + esc(id) + '">' + esc(label) + '</button>';
      }).join('') +
    '</div>' +
    MODEL_IDS.map((id, i) => {
      try { return typeof modelPanelV112 === 'function' ? modelPanelV112(data, id, i === 0) : ''; }
      catch (error) { return '<div class="career-model-empty-v112">⚠ ' + esc(error?.message || error) + '</div>'; }
    }).join('');
  try { if (typeof bindCareerModelTabsV112 === 'function') bindCareerModelTabsV112(target); } catch {}
  setSmall('Hazır');
}

async function startModel(target = box(), options = {}) {
  const body = bodyOf(target);
  if (!target || !target.open || !body) return null;
  if (hasRenderedModels(body)) {
    setSmall('Hazır');
    return null;
  }
  if (target.dataset.f47Loading === '1' && !options.force) return null;
  if (!options.force && !looksWaitingForStarter(body)) return null;

  const race = currentRace();
  if (!race) {
    renderError(body, target, 'Koşu bilgisi bulunamadı; üstte koşuyu seçip Analizi Hesapla düğmesine basın.');
    return null;
  }
  if (typeof getCareerRaceModelsV112 !== 'function') {
    renderError(body, target, '5 Model motoru yüklenmedi; sayfayı yenileyin.');
    return null;
  }

  target.dataset.f47Loading = '1';
  target.dataset.loaded = '1';
  if (options.clearCache) clearRaceCaches(race);
  setSmall('Hazırlanıyor... istek başlatıldı');
  renderLoading(body, race);

  try {
    const data = await getCareerRaceModelsV112(race);
    renderModels(body, target, data);
    return data;
  } catch (error) {
    target.dataset.loaded = '0';
    renderError(body, target, error);
    return null;
  } finally {
    target.dataset.f47Loading = '0';
  }
}

function scheduleStart(delay, options = {}) {
  setTimeout(() => startModel(box(), options), delay);
}

function armPanel(target = box()) {
  if (!target || target.dataset.f47Armed === '1') return;
  target.dataset.f47Armed = '1';
  target.addEventListener('toggle', () => {
    if (!target.open) return;
    target.dataset.f47OpenedAt = String(Date.now());
    scheduleStart(250);
    scheduleStart(1200);
    scheduleStart(8000, { force:true });
  });
  target.querySelector('summary')?.addEventListener('click', () => {
    setTimeout(() => {
      if (!target.open) return;
      target.dataset.f47OpenedAt = target.dataset.f47OpenedAt || String(Date.now());
      scheduleStart(250);
      scheduleStart(1200);
    }, 0);
  }, true);
  if (target.open) scheduleStart(150);
}

function scan() {
  armPanel(box());
}

function boot() {
  scan();
  document.addEventListener('click', event => {
    if (event.target?.closest?.('#' + BOX_ID + ' summary')) scheduleStart(350);
  }, true);
  document.addEventListener('toggle', event => {
    if (event.target?.id === BOX_ID) scheduleStart(250);
  }, true);
  try {
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList:true, subtree:true });
  } catch {}
  setInterval(scan, 1500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATCareerFiveModelPanelStarterV1691F47 = {
  version: VERSION,
  start: () => startModel(box(), { force:true, clearCache:true }),
  scan
};

console.info('[AT AI]', VERSION, 'aktif - 5 Model paneli acilinca model motoru garanti baslatilir.');
})();
