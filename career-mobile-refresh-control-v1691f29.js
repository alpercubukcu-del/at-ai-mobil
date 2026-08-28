/* AT AI Mobil - V16.9.1F29 CAREER MOBILE REFRESH CONTROL
   - Mobile dialogs can capture pull-to-refresh gestures while Career analysis is running.
   - Add an in-dialog refresh escape hatch that clears stale Career cache and reloads the page.
   - Scoring and data APIs are not changed.
*/
(() => {
'use strict';
if (window.__AT_CAREER_MOBILE_REFRESH_CONTROL_V1691F29__) return;
window.__AT_CAREER_MOBILE_REFRESH_CONTROL_V1691F29__ = true;

const VERSION = 'CAREER-MOBILE-REFRESH-CONTROL-V16.9.1F29';
const BUTTON_ID = 'careerMobileRefreshF29';
const STYLE_ID = 'careerMobileRefreshStyleF29';

function css() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID} {
      position: fixed;
      right: max(12px, env(safe-area-inset-right));
      bottom: max(14px, env(safe-area-inset-bottom));
      z-index: 2147483600;
      border: 1px solid rgba(126, 226, 168, .34);
      border-radius: 999px;
      background: #123325;
      color: #eafff2;
      box-shadow: 0 10px 28px rgba(0,0,0,.38);
      padding: 10px 13px;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      display: none;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    dialog[open][data-view="career"] #${BUTTON_ID},
    body.career-refresh-visible-f29 #${BUTTON_ID} {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  `;
  document.head.appendChild(style);
}

function clearCareerCache() {
  try {
    if (typeof state !== 'undefined' && state?.analyses) {
      state.analyses.career = {};
      state.careerMobileRefreshVersion = VERSION;
      state.careerMobileRefreshAt = new Date().toISOString();
      if (typeof save === 'function') save();
    }
  } catch {}
}

function hardRefresh() {
  clearCareerCache();
  try {
    if (typeof status === 'function') status('Sayfa yenileniyor...');
  } catch {}
  window.location.reload();
}

function careerDialogOpen() {
  const dialog = document.getElementById('analysisDialog');
  return Boolean(dialog?.open && dialog?.dataset?.view === 'career');
}

function syncVisibility() {
  try {
    document.body.classList.toggle('career-refresh-visible-f29', careerDialogOpen());
  } catch {}
}

function ensureButton() {
  css();
  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Kariyer analizini yenile');
    button.textContent = 'Yenile';
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      hardRefresh();
    };

    const dialog = document.getElementById('analysisDialog');
    (dialog || document.body).appendChild(button);
  }
  syncVisibility();
}

const openBeforeF29 = typeof openAnalysis === 'function' ? openAnalysis : null;
if (openBeforeF29) {
  openAnalysis = function(view, ...rest) {
    const out = openBeforeF29(view, ...rest);
    setTimeout(ensureButton, 0);
    setTimeout(ensureButton, 400);
    return out;
  };
}

const renderBeforeF29 = typeof renderCareerAnalysis === 'function' ? renderCareerAnalysis : null;
if (renderBeforeF29) {
  renderCareerAnalysis = function(...args) {
    const out = renderBeforeF29(...args);
    setTimeout(ensureButton, 0);
    return out;
  };
}

const runBeforeF29 = typeof runCareerAnalysis === 'function' ? runCareerAnalysis : null;
if (runBeforeF29) {
  runCareerAnalysis = async function(...args) {
    ensureButton();
    try {
      return await runBeforeF29(...args);
    } finally {
      setTimeout(ensureButton, 0);
    }
  };
}

document.addEventListener('click', () => setTimeout(syncVisibility, 0), true);
document.addEventListener('close', () => setTimeout(syncVisibility, 0), true);
window.addEventListener('pageshow', ensureButton);
setInterval(syncVisibility, 1500);
setTimeout(ensureButton, 0);

window.ATCareerMobileRefreshControlV1691F29 = {
  version:VERSION,
  refresh:hardRefresh,
  clearCareerCache
};
console.info('[AT AI]', VERSION, 'active - mobile Career dialog has a visible refresh escape hatch.');
})();
