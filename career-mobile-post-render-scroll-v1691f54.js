/* AT AI Mobil - V16.9.1F54 CAREER MOBILE POST-RENDER SCROLL
   - Android/Chrome can leave the Career modal visually complete but unable to pan after a long render.
   - Keep the background page locked while the modal is open, but make analysisContent the explicit scroll surface.
   - Clear stale drawer/precompute touch capture after Career render/run completion.
   - Scoring, Career data and 5 Model calculation paths are unchanged.
*/
(() => {
'use strict';
if (window.__AT_CAREER_MOBILE_POST_RENDER_SCROLL_V1691F54__) return;
window.__AT_CAREER_MOBILE_POST_RENDER_SCROLL_V1691F54__ = true;

const VERSION = 'CAREER-MOBILE-POST-RENDER-SCROLL-V16.9.1F54';
const STYLE_ID = 'careerMobilePostRenderScrollStyleV1691F54';
let unlockQueued = false;

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 720px) {
      #analysisDialog[open] {
        box-sizing: border-box !important;
        width: calc(100vw - 8px) !important;
        max-width: calc(100vw - 8px) !important;
        height: calc(100dvh - 8px) !important;
        max-height: calc(100dvh - 8px) !important;
        margin: 4px !important;
        padding-bottom: max(4px, env(safe-area-inset-bottom)) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        overscroll-behavior: contain !important;
        touch-action: pan-y !important;
      }
      #analysisDialog[open] > .dialog-head,
      #analysisDialog[open] > .toolbar {
        flex: 0 0 auto !important;
      }
      #analysisDialog[open] #analysisContent {
        box-sizing: border-box !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        overscroll-behavior-y: contain !important;
        -webkit-overflow-scrolling: touch !important;
        touch-action: pan-y !important;
        pointer-events: auto !important;
        padding-bottom: calc(82px + env(safe-area-inset-bottom)) !important;
      }
      #analysisDialog[open] #analysisContent * {
        touch-action: manipulation;
      }
      #analysisDialog[open] #analysisContent details,
      #analysisDialog[open] #analysisContent details *,
      #analysisDialog[open] #analysisContent .career-horse-accordion-v104,
      #analysisDialog[open] #analysisContent .career-horse-accordion-v104 * {
        touch-action: pan-y manipulation;
      }
    }
  `;
  document.head.appendChild(style);
}

function careerDialogOpen() {
  const dialog = document.getElementById('analysisDialog');
  return Boolean(dialog?.open && dialog?.dataset?.view === 'career');
}

function releaseStaleTouchCapture() {
  installStyle();
  const dialog = document.getElementById('analysisDialog');
  const content = document.getElementById('analysisContent');
  if (!dialog?.open || !content || dialog?.dataset?.view !== 'career') return;

  try {
    document.body?.classList?.remove('at-f49-prep-running', 'at-f50-prep-running', 'drawer-open');
    document.documentElement?.classList?.remove('drawer-open');
  } catch {}

  try {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    if (!drawer?.classList?.contains('open')) {
      overlay?.classList?.remove('show');
      if (overlay) overlay.style.pointerEvents = 'none';
    }
  } catch {}

  try {
    dialog.style.overflow = 'hidden';
    dialog.style.touchAction = 'pan-y';
    content.style.overflowY = 'auto';
    content.style.overflowX = 'hidden';
    content.style.webkitOverflowScrolling = 'touch';
    content.style.touchAction = 'pan-y';
    content.style.pointerEvents = 'auto';
    content.style.minHeight = '0';
  } catch {}

  /* Re-assigning the existing scroll position forces Chrome to recreate the
     modal scroll layer without jumping the user back to the top. */
  try {
    const y = Number(content.scrollTop) || 0;
    content.scrollTop = y;
  } catch {}
}

function queueRelease() {
  if (unlockQueued) return;
  unlockQueued = true;
  const run = () => {
    unlockQueued = false;
    releaseStaleTouchCapture();
  };
  try {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } catch {
    setTimeout(run, 0);
  }
}

function wrapRenderer() {
  if (typeof renderCareerAnalysis !== 'function' || renderCareerAnalysis.__atScrollF54) return;
  const before = renderCareerAnalysis;
  const wrapped = function(...args) {
    const out = before.apply(this, args);
    queueRelease();
    setTimeout(releaseStaleTouchCapture, 80);
    return out;
  };
  wrapped.__atScrollF54 = true;
  renderCareerAnalysis = wrapped;
}

function wrapCareerRun() {
  if (typeof runCareerAnalysis !== 'function' || runCareerAnalysis.__atScrollF54) return;
  const before = runCareerAnalysis;
  const wrapped = async function(...args) {
    try {
      return await before.apply(this, args);
    } finally {
      queueRelease();
      setTimeout(releaseStaleTouchCapture, 80);
      setTimeout(releaseStaleTouchCapture, 300);
    }
  };
  wrapped.__atScrollF54 = true;
  runCareerAnalysis = wrapped;
}

function wrapRunAnalysis() {
  if (typeof runAnalysis !== 'function' || runAnalysis.__atScrollF54) return;
  const before = runAnalysis;
  const wrapped = async function(...args) {
    try {
      return await before.apply(this, args);
    } finally {
      if (careerDialogOpen()) {
        queueRelease();
        setTimeout(releaseStaleTouchCapture, 100);
      }
    }
  };
  wrapped.__atScrollF54 = true;
  runAnalysis = wrapped;
}

function installWrappers() {
  wrapRenderer();
  wrapCareerRun();
  wrapRunAnalysis();
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    wrapRenderer();
    wrapCareerRun();
    wrapRunAnalysis();
    if (attempts >= 20) clearInterval(timer);
  }, 250);
}

function boot() {
  installStyle();
  installWrappers();
  const dialog = document.getElementById('analysisDialog');
  const content = document.getElementById('analysisContent');

  try {
    if (content) {
      const observer = new MutationObserver(() => {
        if (careerDialogOpen()) queueRelease();
      });
      observer.observe(content, { childList:true });
    }
  } catch {}

  try {
    dialog?.addEventListener('click', queueRelease, { passive:true });
  } catch {}
  window.addEventListener('pageshow', queueRelease);
  window.addEventListener('resize', queueRelease, { passive:true });
  window.addEventListener('orientationchange', queueRelease, { passive:true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) queueRelease();
  });
  setTimeout(queueRelease, 0);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATCareerMobilePostRenderScrollV1691F54 = {
  version: VERSION,
  release: releaseStaleTouchCapture,
  queueRelease
};

console.info('[AT AI]', VERSION, 'active - Career modal keeps a dedicated Android-safe scroll surface after calculation.');
})();
