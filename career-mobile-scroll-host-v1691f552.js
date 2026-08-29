/* AT AI Mobil - V16.9.1F55.2 Career mobile scroll host
   - F55 moved staged 5 Model controls beside analysisContent, while the Career dialog can keep overflow locked.
   - On Android/Chrome this can leave the visible Career page unable to pan vertically.
   - Keep header/toolbar fixed and put all Career content below the toolbar in one dedicated scroll surface.
   - Calculation, archive, Kariyer/Hazirlik and 5 Model engines are unchanged.
*/
(() => {
'use strict';
if (window.__AT_CAREER_MOBILE_SCROLL_HOST_V1691F552__) return;
window.__AT_CAREER_MOBILE_SCROLL_HOST_V1691F552__ = true;

const VERSION = 'CAREER-MOBILE-SCROLL-HOST-V16.9.1F55.2';
const HOST_ID = 'careerMobileScrollHostV1691F552';
const STYLE_ID = 'careerMobileScrollHostStyleV1691F552';
const mq = window.matchMedia ? window.matchMedia('(max-width: 720px)') : { matches:true };
let syncing = false;

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width:720px) {
      #analysisDialog[open][data-view="career"] {
        box-sizing:border-box!important;
        width:calc(100vw - 8px)!important;
        max-width:calc(100vw - 8px)!important;
        height:calc(100dvh - 8px)!important;
        max-height:calc(100dvh - 8px)!important;
        margin:4px!important;
        overflow:hidden!important;
        display:flex!important;
        flex-direction:column!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
      }
      #analysisDialog[open][data-view="career"] > .dialog-head,
      #analysisDialog[open][data-view="career"] > .toolbar {
        flex:0 0 auto!important;
      }
      #analysisDialog[open][data-view="career"] > #${HOST_ID} {
        box-sizing:border-box!important;
        display:block!important;
        flex:1 1 auto!important;
        min-height:0!important;
        width:100%!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior-y:contain!important;
        touch-action:pan-y!important;
        pointer-events:auto!important;
        padding-bottom:calc(84px + env(safe-area-inset-bottom))!important;
      }
      #analysisDialog[open][data-view="career"] > #${HOST_ID} > #analysisContent {
        box-sizing:border-box!important;
        display:block!important;
        flex:none!important;
        min-height:0!important;
        max-height:none!important;
        height:auto!important;
        overflow:visible!important;
        touch-action:pan-y!important;
        pointer-events:auto!important;
        padding-bottom:0!important;
      }
      #analysisDialog[open][data-view="career"] > #${HOST_ID} #ceDaily5ArchiveV1691F3 {
        touch-action:pan-y!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function dialog() { return document.getElementById('analysisDialog'); }
function toolbar() { return dialog()?.querySelector(':scope > .toolbar'); }
function isCareerMobile() {
  const d = dialog();
  return Boolean(d?.open && d?.dataset?.view === 'career' && mq.matches);
}

function unwrap() {
  const d = dialog();
  const host = document.getElementById(HOST_ID);
  if (!d || !host || host.parentNode !== d) return;
  while (host.firstChild) d.insertBefore(host.firstChild, host);
  host.remove();
}

function ensureHost() {
  if (syncing) return;
  syncing = true;
  try {
    installStyle();
    const d = dialog();
    const bar = toolbar();
    if (!d || !bar) return;
    if (!isCareerMobile()) {
      unwrap();
      return;
    }

    let host = document.getElementById(HOST_ID);
    if (!host || host.parentNode !== d) {
      host = document.createElement('div');
      host.id = HOST_ID;
      host.setAttribute('role', 'region');
      host.setAttribute('aria-label', 'Kariyer Yol Haritası içerikleri');
      bar.insertAdjacentElement('afterend', host);
    }

    /* Anything rendered below the toolbar belongs to the same vertical scroll surface.
       This includes archive buttons, analysisContent and the staged 5 Model panel. */
    const children = Array.from(d.children);
    const barIndex = children.indexOf(bar);
    for (let i = barIndex + 1; i < children.length; i++) {
      const node = children[i];
      if (!node || node === host) continue;
      host.appendChild(node);
    }

    const content = document.getElementById('analysisContent');
    if (content) {
      try {
        content.style.removeProperty('overflow-y');
        content.style.removeProperty('overflow-x');
        content.style.removeProperty('max-height');
        content.style.removeProperty('height');
      } catch {}
    }

    /* Re-touch the current position so Android recreates the pan layer immediately. */
    try { host.scrollTop = Number(host.scrollTop) || 0; } catch {}
  } finally {
    syncing = false;
  }
}

function queue() {
  try { requestAnimationFrame(() => requestAnimationFrame(ensureHost)); }
  catch { setTimeout(ensureHost, 0); }
}

function boot() {
  installStyle();
  const d = dialog();
  if (!d) return;

  try {
    const observer = new MutationObserver(() => queue());
    observer.observe(d, { childList:true, attributes:true, attributeFilter:['open','data-view'] });
  } catch {}

  document.addEventListener('click', event => {
    if (event.target?.closest?.('[data-view="career"],#runAnalysis,#analysisRace,#ceDaily5AllV1691F3,#ceDaily5OneV1691F3')) {
      setTimeout(queue, 0);
    }
  }, true);
  window.addEventListener('pageshow', queue, { passive:true });
  window.addEventListener('resize', queue, { passive:true });
  window.addEventListener('orientationchange', queue, { passive:true });
  try { mq.addEventListener?.('change', queue); } catch {}
  setTimeout(queue, 0);
  setTimeout(queue, 180);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATCareerMobileScrollHostV1691F552 = { version:VERSION, sync:ensureHost, unwrap };
console.info('[AT AI]', VERSION, 'active - Career Roadmap uses one Android-safe vertical scroll surface below the toolbar.');
})();
