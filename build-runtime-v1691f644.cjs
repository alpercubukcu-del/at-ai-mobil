const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname,BASE=path.join(ROOT,'build-runtime-v1691f642.cjs'),EXTRA=path.join(ROOT,'daily-package-planner-v1691f645.js'),APP=path.join(ROOT,'public','at-ai-app-v142.js'),INDEX=path.join(ROOT,'public','index.html'),HEADERS=path.join(ROOT,'public','_headers');
if(!fs.existsSync(BASE))throw new Error('[F60.44] Missing F60.42 complete asset builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.45] Missing daily package planner module.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';
for(const token of['TJK-ANNUAL-ARCHIVE-V14.2-SCHEMA-REPAIR','lastDbWriteError','ANNUAL-DB-COEXISTENCE-V16.9.1F60.43','PROCESS-FLOW-PLANNER-V16.9.1F60.45','Yerel Katalogu Say','Seçilen Benzer Yarışları İndir','CAREER-PAIR-DISPLAY-FIX-V16.9.1F60.46','Uyum %','HP\',hp(p.a)===null||hp(p.b)===null?\'yok\''])if(!app.includes(token))throw new Error('[F60.46] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
const CACHE_BUST='169252';
const MENU_BRIDGE_VERSION='MENU-BRIDGE-V16.9.1F60.52';
const menuBridge=`
<script id="atMenuBridgeV169252">
(() => {
'use strict';
if (window.__AT_MENU_BRIDGE_V169252__) return;
window.__AT_MENU_BRIDGE_V169252__ = true;
const VERSION = 'MENU-BRIDGE-V16.9.1F60.52';
const MAIN_SCRIPT_SRC = '/at-ai-app-v142.js?v=169252';
const STORAGE_KEY = 'at_ai_mobil_state_v2';
const $ = id => document.getElementById(id);
const titles = {
  current: 'Güncel Analiz',
  historical: 'Tarihsel Benzerlik',
  scenario: 'Koşu Senaryosu',
  career: 'Kariyer Yol Haritası',
  calibration: 'Günlük Koşu Kalibrasyonu'
};
let callbacks = [];
let lastActivation = 0;

function status(text) {
  const el = $('status');
  if (el) el.textContent = text;
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function clearLocks() {
  try {
    document.documentElement.classList.remove(
      'at-menu-force-open-v169247',
      'at-menu-force-open-v169250',
      'at-menu-force-open-v169251',
      'at-menu-force-open-v169252',
      'at-hard-modal-lock-v1659',
      'drawer-open',
      'modal-open'
    );
    document.body?.classList.remove('drawer-open', 'modal-open');
  } catch {}
}

function closeDrawerSafe() {
  clearLocks();
  $('drawer')?.classList.remove('open');
  $('overlay')?.classList.remove('show');
  $('drawer')?.setAttribute('aria-hidden', 'true');
}

function showDialog(dialog) {
  if (!dialog) return;
  try {
    if (!dialog.open) dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }
}

function syncAnalysisRace(state) {
  const select = $('analysisRace');
  if (!select) return;
  const races = Array.isArray(state.races) ? state.races : [];
  const old = select.value || state.selectedRace || 'all';
  select.innerHTML = '<option value="all">Tüm Koşular</option>' + races.map(race => {
    const no = race.no || race.raceNo || '';
    return '<option value="' + esc(no) + '">' + esc(no) + '. Koşu</option>';
  }).join('');
  select.value = old === 'all' || races.some(r => String(r.no || r.raceNo || '') === String(old)) ? old : 'all';
}

function selectedRaces(state) {
  const races = Array.isArray(state.races) ? state.races : [];
  const wanted = $('analysisRace')?.value || state.selectedRace || 'all';
  return wanted === 'all' ? races : races.filter(race => String(race.no || race.raceNo || '') === String(wanted));
}

function lightRank(race) {
  const horses = Array.isArray(race?.horses) ? race.horses : [];
  const agfs = horses.map(horse => num(horse.agf)).filter(value => value !== null && value > 0);
  const odds = horses.map(horse => num(horse.odds)).filter(value => value !== null && value > 0);
  const maxAgf = Math.max(0, ...agfs);
  const minOdds = odds.length ? Math.min(...odds) : null;
  return horses.map(horse => {
    const agf = num(horse.agf);
    const odd = num(horse.odds);
    const agfScore = maxAgf && agf !== null ? agf / maxAgf * 100 : 0;
    const oddsScore = minOdds && odd ? minOdds / odd * 100 : agfScore;
    const score = Math.round((agfScore * 0.6 + oddsScore * 0.4) * 10) / 10;
    return { horse, score, agf, odd };
  }).sort((a, b) => b.score - a.score || Number(a.horse?.no || 999) - Number(b.horse?.no || 999));
}

function renderCurrentAnalysis() {
  const content = $('analysisContent');
  if (!content) return;
  const state = readState();
  syncAnalysisRace(state);
  const races = selectedRaces(state);
  content.classList.remove('empty');
  if (!races.length) {
    content.innerHTML = '<div style="padding:15px;line-height:1.55">Önce TJK programını yükleyin.</div>';
    return;
  }
  content.innerHTML =
    '<div style="padding:12px 2px 14px;line-height:1.5">' +
    '<b>Hafif Güncel Analiz</b><br>' +
    '<span style="opacity:.75">Ana sayfayı kilitlemeden AGF ağırlıklı hızlı sıralama. Ağır motor yalnız siz başlatırsanız yüklenir.</span>' +
    '</div>' +
    races.map(race => {
      const ranked = lightRank(race).slice(0, 8);
      return '<section class="race-card" style="margin-bottom:12px">' +
        '<div class="race-head"><div><strong>' + esc(race.no || race.raceNo || '') + '. Koşu</strong> ' + esc(race.time || '') + '</div></div>' +
        '<div class="race-meta">' + esc(race.class || '') + ' · ' + esc(race.ageGroup || '') + ' · ' + esc(race.distance || '') + ' ' + esc(race.track || '') + '</div>' +
        '<div class="horse-list">' + ranked.map((item, index) => (
          '<div class="horse-row">' +
          '<div><b>' + (index + 1) + '. ' + esc(item.horse?.no || '') + ' ' + esc(item.horse?.name || item.horse?.atadi || '') + '</b>' +
          '<small>HP ' + esc(item.horse?.hp ?? '-') + ' · KGS ' + esc(item.horse?.kgs ?? '-') + '</small></div>' +
          '<div class="horse-stats"><span>Skor ' + esc(item.score.toLocaleString('tr-TR')) + '</span><span>AGF ' + esc(item.agf ?? '-') + '</span></div>' +
          '</div>'
        )).join('') + '</div>' +
        '</section>';
    }).join('');
}

function fallbackAnalysis(view) {
  closeDrawerSafe();
  const dialog = $('analysisDialog');
  if (!dialog) {
    status('Analiz penceresi bulunamadı.');
    return;
  }
  dialog.dataset.view = view;
  dialog.classList.toggle('calibration-dialog-v116', view === 'calibration');
  if (view !== 'calibration') delete dialog.dataset.dailyCalibrationF6018;
  const title = $('dialogTitle');
  const eyebrow = $('dialogEyebrow');
  const content = $('analysisContent');
  if (title) title.textContent = titles[view] || 'Analiz';
  if (eyebrow) eyebrow.textContent = view === 'calibration' ? 'GÜNLÜK KALİBRASYON' : 'AT AI ANALİZ';
  if (content) {
    content.classList.add('empty');
    content.innerHTML = view === 'career'
      ? 'Kariyer Yol Haritasını hesaplayın.'
      : 'Bu analiz henüz hesaplanmadı.';
  }
  showDialog(dialog);
}

function callOpenAnalysis(view) {
  try {
    const fn = window.openAnalysis || (typeof openAnalysis === 'function' ? openAnalysis : null);
    if (typeof fn === 'function') {
      fn(view);
      return true;
    }
  } catch (error) {
    console.warn('[AT AI]', VERSION, 'openAnalysis hata', error);
  }
  return false;
}

function finishMainScript() {
  window.__AT_EARLY_MAIN_LOADED__ = true;
  window.__AT_MAIN_SCRIPT_LOADING__ = false;
  const pending = callbacks.splice(0);
  for (const callback of pending) setTimeout(callback, 0);
}

function ensureMainScript(callback) {
  if (typeof callback === 'function') callbacks.push(callback);
  if (window.__AT_EARLY_MAIN_LOADED__) {
    finishMainScript();
    return;
  }
  if (window.__AT_MAIN_SCRIPT_LOADING__) {
    setTimeout(() => {
      if (window.__AT_EARLY_MAIN_LOADED__) finishMainScript();
      else ensureMainScript();
    }, 140);
    return;
  }
  const existing = document.querySelector('script[src*="at-ai-app-v142.js"]');
  if (existing) {
    window.__AT_MAIN_SCRIPT_LOADING__ = true;
    existing.addEventListener('load', finishMainScript, { once: true });
    existing.addEventListener('error', () => {
      window.__AT_MAIN_SCRIPT_LOADING__ = false;
      status('Ana uygulama dosyası yüklenemedi. Sayfayı yenileyin.');
    }, { once: true });
    return;
  }
  window.__AT_MAIN_SCRIPT_LOADING__ = true;
  const script = document.createElement('script');
  script.src = MAIN_SCRIPT_SRC;
  script.async = true;
  script.onload = finishMainScript;
  script.onerror = () => {
    window.__AT_MAIN_SCRIPT_LOADING__ = false;
    callbacks = [];
    status('Ana uygulama dosyası yüklenemedi. Sayfayı yenileyin.');
  };
  document.body.appendChild(script);
}

function loadFullFor(kind) {
  status('Tam analiz motoru yükleniyor...');
  ensureMainScript(() => {
    setTimeout(() => {
      if (kind === 'coupon') {
        try {
          window.ATCouponDecisionV1671?.open?.();
        } catch (error) {
          console.warn('[AT AI]', VERSION, 'coupon full hata', error);
        }
        showDialog($('couponCenterDialog'));
        return;
      }
      if (!callOpenAnalysis(kind)) fallbackAnalysis(kind);
    }, 60);
  });
}

function lightNotice(view) {
  return '<div style="padding:15px;line-height:1.55">' +
    '<b>' + esc(titles[view] || 'Analiz') + '</b><br>' +
    '<span style="opacity:.78">Telefonun ana sayfada kilitlenmemesi için ağır modül başlangıçta yüklenmedi.</span><br><br>' +
    '<button type="button" class="primary small" data-at-load-full="' + esc(view) + '">Tam Modülü Yükle</button>' +
    '</div>';
}

function openLightView(view) {
  closeDrawerSafe();
  const dialog = $('analysisDialog');
  if (!dialog) return;
  const state = readState();
  syncAnalysisRace(state);
  dialog.dataset.view = view;
  dialog.classList.toggle('calibration-dialog-v116', view === 'calibration');
  if (view !== 'calibration') delete dialog.dataset.dailyCalibrationF6018;
  if ($('dialogTitle')) $('dialogTitle').textContent = titles[view] || 'Analiz';
  if ($('dialogEyebrow')) $('dialogEyebrow').textContent = view === 'calibration' ? 'GÜNLÜK KALİBRASYON' : 'AT AI ANALİZ';
  showDialog(dialog);
  if (view === 'current') renderCurrentAnalysis();
  else if ($('analysisContent')) {
    $('analysisContent').classList.remove('empty');
    $('analysisContent').innerHTML = lightNotice(view);
  }
}

function injectCouponStyle() {
  if ($('atLightCouponStyleV169252')) return;
  const style = document.createElement('style');
  style.id = 'atLightCouponStyleV169252';
  style.textContent = '#couponCenterDialog{position:fixed!important;inset:0!important;width:100%!important;max-width:100%!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border:0!important;border-radius:0!important;background:#07131f!important;color:#eef7ff!important;overflow:hidden!important}#couponCenterDialog[open]{display:flex!important;flex-direction:column!important}#couponCenterDialog::backdrop{background:#07131f!important;opacity:1!important}.coupon-menu-scroll-v1681{flex:1 1 auto;min-height:0;overflow:auto;padding:12px;box-sizing:border-box}';
  document.head.appendChild(style);
}

function renderLightCoupon() {
  const box = $('tickets');
  if (!box) return;
  const state = readState();
  const races = Array.isArray(state.races) ? state.races : [];
  box.classList.remove('empty');
  if (!races.length) {
    box.innerHTML = 'Önce TJK programını yükleyin.';
    return;
  }
  box.innerHTML = races.map(race => {
    const top = lightRank(race).slice(0, 3);
    return '<div class="ticket-card"><strong>' + esc(race.no || race.raceNo || '') + '. Koşu</strong><div>' +
      top.map(item => esc(item.horse?.no || '') + ' ' + esc(item.horse?.name || item.horse?.atadi || '')).join(' · ') +
      '</div><small>Hafif önizleme. Kariyer/Hazırlık kuponu için tam modülü yükleyin.</small></div>';
  }).join('') +
    '<button type="button" class="primary small" data-at-load-full="coupon" style="width:100%;margin-top:10px">Tam Kupon Motorunu Yükle</button>';
}

function bindLightCoupon() {
  $('couponAuditSectionV1681')?.setAttribute('hidden', '');
  $('couponSetupV1681')?.removeAttribute('hidden');
  $('couponResultV1681')?.removeAttribute('hidden');
  const close = $('closeCouponMenuV1681');
  if (close && close.dataset.lightV169252 !== '1') {
    close.dataset.lightV169252 = '1';
    close.addEventListener('click', () => {
      try { $('couponCenterDialog')?.close(); } catch { $('couponCenterDialog')?.removeAttribute('open'); }
    });
  }
}

function openLightCoupon() {
  closeDrawerSafe();
  injectCouponStyle();
  bindLightCoupon();
  showDialog($('couponCenterDialog'));
  renderLightCoupon();
}

function handleDrawerActivation(event) {
  const button = event.target?.closest?.('#drawer button');
  if (!button || button.id === 'closeMenu') return;
  const view = button.dataset?.view || '';
  const isCoupon = button.id === 'couponMenuBtn';
  if (!view && !isCoupon) return;
  if (window.__AT_EARLY_MAIN_LOADED__) {
    setTimeout(() => {
      if (view && !$('analysisDialog')?.open) fallbackAnalysis(view);
      if (isCoupon && !$('couponCenterDialog')?.open) openLightCoupon();
    }, 320);
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  const now = Date.now();
  if (now - lastActivation < 450) return;
  lastActivation = now;
  if (isCoupon) openLightCoupon();
  else openLightView(view);
}

document.addEventListener('pointerdown', handleDrawerActivation, true);
document.addEventListener('click', handleDrawerActivation, true);
document.addEventListener('click', event => {
  const load = event.target?.closest?.('[data-at-load-full]');
  if (load) {
    event.preventDefault();
    event.stopImmediatePropagation();
    loadFullFor(load.getAttribute('data-at-load-full') || 'current');
    return;
  }
  const run = event.target?.closest?.('#runAnalysis');
  if (run && !window.__AT_EARLY_MAIN_LOADED__) {
    const view = $('analysisDialog')?.dataset?.view || 'current';
    event.preventDefault();
    event.stopImmediatePropagation();
    if (view === 'current') renderCurrentAnalysis();
    else loadFullFor(view);
    return;
  }
  const build = event.target?.closest?.('#buildAllBtn');
  if (build && !window.__AT_EARLY_MAIN_LOADED__) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderLightCoupon();
  }
}, true);
$('analysisRace')?.addEventListener('change', () => {
  if (!window.__AT_EARLY_MAIN_LOADED__ && $('analysisDialog')?.dataset?.view === 'current') renderCurrentAnalysis();
});
window.ATMenuBridgeV169252 = { version: VERSION, openLightView, openLightCoupon, loadFullFor, closeDrawerSafe };
console.info('[AT AI]', VERSION, 'aktif');
})();
</script>`;
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/g,'/at-ai-app-v142.js?v='+CACHE_BUST);
html=html.replace(/<script id="atMenuBridgeV169\d+">[\s\S]*?<\/script>\s*/g,'');
html=html.includes('</body>')?html.replace('</body>',menuBridge+'\n</body>'):html+menuBridge;
fs.writeFileSync(INDEX,html,'utf8');
fs.writeFileSync(HEADERS,'/*\n  Cache-Control: no-store\n','utf8');
if(!html.includes('/at-ai-app-v142.js?v='+CACHE_BUST))throw new Error('[F60.52] Cache bust failed.');
if(!html.includes(MENU_BRIDGE_VERSION))throw new Error('[F60.52] Menu bridge injection failed.');
console.log('[AT AI] V16.9.1F60.52 build complete: lightweight drawer opens without loading the heavy runtime.');
