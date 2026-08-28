/* AT AI Mobil - V16.9.1F30 CAREER UI UNLOCK
   - Recovers mobile screens when a dialog/backdrop captures all touches.
   - Adds high z-index reload/unlock controls and clears stale Career state on forceUnlock.
   - Does not change scoring.
*/
(() => {
'use strict';
if (window.__AT_CAREER_UI_UNLOCK_V1691F30__) return;
window.__AT_CAREER_UI_UNLOCK_V1691F30__ = true;

const VERSION = 'CAREER-UI-UNLOCK-V16.9.1F30';
const RELOAD_ID = 'atAiEmergencyReloadF30';
const UNLOCK_ID = 'atAiEmergencyUnlockF30';
const STYLE_ID = 'atAiEmergencyUnlockStyleF30';
const STORAGE_KEY_F30 = 'at_ai_mobil_state_v2';

function clearStoredCareer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_F30);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.analyses = parsed.analyses || {};
    parsed.analyses.career = {};
    parsed.careerUiUnlockVersion = VERSION;
    parsed.careerUiUnlockAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_F30, JSON.stringify(parsed));
  } catch {}
}

function clearRuntimeCareer() {
  try {
    if (typeof state !== 'undefined' && state?.analyses) {
      state.analyses.career = {};
      state.careerUiUnlockVersion = VERSION;
      state.careerUiUnlockAt = new Date().toISOString();
      if (typeof save === 'function') save();
    }
  } catch {}
}

function forceUnlockDom() {
  try {
    document.getElementById('overlay')?.classList.remove('show');
    document.getElementById('drawer')?.classList.remove('open');
    document.body?.classList.remove('drawer-open', 'modal-open');
    document.documentElement?.classList.remove('drawer-open', 'modal-open');
  } catch {}

  try {
    const dialog = document.getElementById('analysisDialog');
    if (dialog?.open && typeof dialog.close === 'function') {
      dialog.close();
    }
  } catch {}

  try {
    if (typeof status === 'function') status('Ekran kilidi temizlendi.');
  } catch {}
}

function hardReload() {
  clearRuntimeCareer();
  clearStoredCareer();
  const url = new URL(window.location.href);
  url.searchParams.set('forceUnlock', '1');
  url.searchParams.set('t', String(Date.now()));
  window.location.href = url.toString();
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .at-ai-emergency-control-f30 {
      position: fixed;
      z-index: 2147483647;
      right: max(12px, env(safe-area-inset-right));
      border: 1px solid rgba(126,226,168,.36);
      border-radius: 999px;
      background: #123325;
      color: #eafff2;
      box-shadow: 0 10px 28px rgba(0,0,0,.40);
      padding: 10px 13px;
      font-size: 12px;
      font-weight: 900;
      line-height: 1;
      text-decoration: none;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    #${RELOAD_ID} {
      bottom: max(14px, env(safe-area-inset-bottom));
    }
    #${UNLOCK_ID} {
      bottom: calc(max(14px, env(safe-area-inset-bottom)) + 44px);
      background: #1b2f4a;
      border-color: rgba(114,213,255,.36);
    }
    @media (min-width: 721px) {
      .at-ai-emergency-control-f30 {
        right: 18px;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureControls() {
  installStyle();

  let reload = document.getElementById(RELOAD_ID);
  if (!reload) {
    reload = document.createElement('a');
    reload.id = RELOAD_ID;
    reload.href = '/?forceUnlock=1';
    reload.className = 'at-ai-emergency-control-f30';
    reload.textContent = 'Yenile';
    reload.setAttribute('aria-label', 'Sayfayi yenile ve kariyer analizini sifirla');
    reload.onclick = event => {
      event.preventDefault();
      hardReload();
    };
    document.body.appendChild(reload);
  }

  let unlock = document.getElementById(UNLOCK_ID);
  if (!unlock) {
    unlock = document.createElement('button');
    unlock.id = UNLOCK_ID;
    unlock.type = 'button';
    unlock.className = 'at-ai-emergency-control-f30';
    unlock.textContent = 'Kilidi Ac';
    unlock.setAttribute('aria-label', 'Ekran kilidini temizle');
    unlock.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      forceUnlockDom();
    };
    document.body.appendChild(unlock);
  }
}

function handleForceUnlockQuery() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('forceUnlock') !== '1') return;
    clearStoredCareer();
    clearRuntimeCareer();
    forceUnlockDom();
    url.searchParams.delete('forceUnlock');
    url.searchParams.delete('t');
    window.history.replaceState({}, document.title, url.toString());
  } catch {}
}

handleForceUnlockQuery();
window.addEventListener('DOMContentLoaded', () => {
  handleForceUnlockQuery();
  ensureControls();
});
window.addEventListener('pageshow', ensureControls);
setTimeout(ensureControls, 0);
setTimeout(forceUnlockDom, 250);

window.ATCareerUiUnlockV1691F30 = {
  version:VERSION,
  unlock:forceUnlockDom,
  reload:hardReload,
  clearStoredCareer
};
console.info('[AT AI]', VERSION, 'active - emergency mobile unlock/reload controls installed.');
})();
