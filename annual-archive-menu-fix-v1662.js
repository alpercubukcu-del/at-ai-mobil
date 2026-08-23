/* AT AI Mobil — ANNUAL-ARCHIVE-MENU-FIX-V16.6.2 legacy marker
   V16.6.3 mobile layout recovery:
   - Yıllık Arşiv tıklamasında drawer/focus tamamen kapanmadan dialog açılmaz.
   - Android Chrome yatay kayma/sağa taşma engellenir.
   - Yıllık arşiv mobilde viewport'u tam kaplayan eski tam ekran düzenine sabitlenir.
   - Kariyer Excel ve analiz formüllerine dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_ARCHIVE_MENU_FIX_V1662__) return;
window.__AT_ANNUAL_ARCHIVE_MENU_FIX_V1662__ = true;

const VERSION = 'ANNUAL-ARCHIVE-MENU-FIX-V16.6.3';
let opening = false;

function installAnnualMobileStyleV1663() {
  if (document.getElementById('annualArchiveMobileStyleV1663')) return;
  const style = document.createElement('style');
  style.id = 'annualArchiveMobileStyleV1663';
  style.textContent = `
    html,body{max-width:100%;overflow-x:hidden}
    @media (max-width:720px){
      #tjkAnnualArchiveDialog{
        position:fixed!important;
        inset:0!important;
        width:auto!important;
        min-width:0!important;
        max-width:none!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        box-sizing:border-box!important;
        transform:none!important;
        overflow:hidden!important;
        overscroll-behavior:none!important;
      }
      #tjkAnnualArchiveDialog[open]{display:block!important}
      #tjkAnnualArchiveDialog .aa-shell{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        height:100%!important;
        min-height:0!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
      }
      #tjkAnnualArchiveDialog .aa-head{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        flex:0 0 auto!important;
        box-sizing:border-box!important;
      }
      #tjkAnnualArchiveDialog .aa-body{
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        height:auto!important;
        flex:1 1 auto!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        box-sizing:border-box!important;
      }
      #tjkAnnualArchiveDialog .aa-section,
      #tjkAnnualArchiveDialog .aa-grid,
      #tjkAnnualArchiveDialog .aa-grid.two,
      #tjkAnnualArchiveDialog .aa-year-pills,
      #tjkAnnualArchiveDialog .aa-token-pills,
      #tjkAnnualArchiveDialog .aa-actions{
        min-width:0!important;
        max-width:100%!important;
        box-sizing:border-box!important;
      }
      #tjkAnnualArchiveDialog .aa-grid,
      #tjkAnnualArchiveDialog .aa-grid.two{
        grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function resetHorizontalScrollV1663() {
  try {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
    window.scrollTo(0, y);
  } catch {}
}

function closeDrawerV1663(sourceButton) {
  try { sourceButton?.blur?.(); } catch {}
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('overlay');
  drawer?.classList.remove('open');
  drawer?.setAttribute('aria-hidden', 'true');
  overlay?.classList.remove('show');
  try { document.getElementById('menuBtn')?.focus?.({ preventScroll: true }); } catch {}
  resetHorizontalScrollV1663();
}

function nextPaintV1663() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function openAnnualArchiveV1663(sourceButton = null) {
  if (opening) return false;
  opening = true;
  try {
    installAnnualMobileStyleV1663();
    closeDrawerV1663(sourceButton);
    await nextPaintV1663();
    resetHorizontalScrollV1663();

    const archive = window.ATAnnualArchiveV13;
    if (!archive || typeof archive.open !== 'function') {
      console.warn('[AT AI]', VERSION, 'Yıllık arşiv modülü hazır değil.');
      return false;
    }

    const result = archive.open();
    await Promise.resolve(result);
    await nextPaintV1663();
    resetHorizontalScrollV1663();

    const dialog = document.getElementById('tjkAnnualArchiveDialog');
    if (dialog) {
      dialog.scrollLeft = 0;
      const body = dialog.querySelector('.aa-body');
      if (body) body.scrollLeft = 0;
    }
    return true;
  } catch (err) {
    console.warn('[AT AI]', VERSION, 'Arşiv açma hatası:', err?.message || err);
    return false;
  } finally {
    opening = false;
  }
}

/* Yalnız yıllık arşiv butonunu sahiplenir. Önce drawer/focus kapanır,
   iki frame sonra arşiv açılır; böylece Android Chrome dialogu sağa kaydırmaz. */
document.addEventListener('click', event => {
  const btn = event.target?.closest?.('#annualArchiveBtn');
  if (!btn || !event.isTrusted) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  void openAnnualArchiveV1663(btn);
}, true);

installAnnualMobileStyleV1663();

window.ATAnnualArchiveMenuFixV1662 = {
  version: VERSION,
  open: openAnnualArchiveV1663
};
window.ATAnnualArchiveMenuFixV1663 = window.ATAnnualArchiveMenuFixV1662;

console.info('[AT AI]', VERSION, 'aktif — Yıllık Arşiv mobil tam ekran + yatay kayma koruması.');
})();
