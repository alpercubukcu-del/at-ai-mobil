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
const CACHE_BUST='169250';
const MENU_BRIDGE_VERSION='MENU-BRIDGE-V16.9.1F60.50';
const menuBridge=`
<script id="atMenuBridgeV169250">
(() => {
'use strict';
if (window.__AT_MENU_BRIDGE_V169250__) return;
window.__AT_MENU_BRIDGE_V169250__ = true;
const VERSION = 'MENU-BRIDGE-V16.9.1F60.50';
const MAIN_SCRIPT_SRC = '/at-ai-app-v142.js?v=169250';
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

function clearLocks() {
  try {
    document.documentElement.classList.remove(
      'at-menu-force-open-v169247',
      'at-menu-force-open-v169250',
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
  try {
    if (!dialog.open) dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }
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

function openView(view) {
  status('Menü hazırlanıyor...');
  ensureMainScript(() => {
    setTimeout(() => {
      if (!callOpenAnalysis(view)) fallbackAnalysis(view);
      setTimeout(() => {
        const dialog = $('analysisDialog');
        if (dialog && !dialog.open) fallbackAnalysis(view);
      }, 260);
    }, 30);
  });
}

function openCoupon() {
  status('Kupon menüsü hazırlanıyor...');
  ensureMainScript(() => {
    closeDrawerSafe();
    try {
      const decision = window.ATCouponDecisionV1671;
      if (decision && typeof decision.open === 'function') {
        decision.open();
      }
    } catch (error) {
      console.warn('[AT AI]', VERSION, 'coupon decision hata', error);
    }
    const dialog = $('couponCenterDialog');
    if (dialog) {
      try {
        if (!dialog.open) dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    }
  });
}

function handleDrawerActivation(event) {
  const button = event.target?.closest?.('#drawer button');
  if (!button || button.id === 'closeMenu') return;
  const view = button.dataset?.view || '';
  const isCoupon = button.id === 'couponMenuBtn';
  if (!view && !isCoupon) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const now = Date.now();
  if (now - lastActivation < 450) return;
  lastActivation = now;
  if (isCoupon) openCoupon();
  else openView(view);
}

document.addEventListener('pointerdown', handleDrawerActivation, true);
document.addEventListener('click', handleDrawerActivation, true);
window.ATMenuBridgeV169250 = { version: VERSION, openView, openCoupon, closeDrawerSafe };
console.info('[AT AI]', VERSION, 'aktif');
})();
</script>`;
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/g,'/at-ai-app-v142.js?v='+CACHE_BUST);
html=html.replace(/<script id="atMenuBridgeV169\d+">[\s\S]*?<\/script>\s*/g,'');
html=html.includes('</body>')?html.replace('</body>',menuBridge+'\n</body>'):html+menuBridge;
fs.writeFileSync(INDEX,html,'utf8');
fs.writeFileSync(HEADERS,'/*\n  Cache-Control: no-store\n','utf8');
if(!html.includes('/at-ai-app-v142.js?v='+CACHE_BUST))throw new Error('[F60.50] Cache bust failed.');
if(!html.includes(MENU_BRIDGE_VERSION))throw new Error('[F60.50] Menu bridge injection failed.');
console.log('[AT AI] V16.9.1F60.50 build complete: menu activation bridge keeps drawer buttons opening after lazy app load.');
