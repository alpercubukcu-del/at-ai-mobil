/* AT AI Mobil — V16.6.2 Annual Archive Menu Routing Fix
   - Drawer'daki "TJK Yıllık Yarış Arşivi" tıklamasını yalnız yıllık arşive yönlendirir.
   - Kariyer Excel dışa aktarım dialogunun yanlışlıkla açılmasını engeller.
   - Arşivin mevcut/orijinal ekran ve hesaplama koduna dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_ANNUAL_ARCHIVE_MENU_FIX_V1662__) return;
window.__AT_ANNUAL_ARCHIVE_MENU_FIX_V1662__ = true;

const VERSION = 'ANNUAL-ARCHIVE-MENU-FIX-V16.6.2';

function closeDrawerV1662() {
  const drawer = document.getElementById('drawer');
  if (!drawer) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

function openAnnualArchiveV1662() {
  const archive = window.ATAnnualArchiveV13;
  if (!archive || typeof archive.open !== 'function') {
    console.warn('[AT AI]', VERSION, 'Yıllık arşiv modülü hazır değil.');
    return false;
  }
  try {
    const result = archive.open();
    Promise.resolve(result).catch(err =>
      console.warn('[AT AI]', VERSION, 'Arşiv açma hatası:', err?.message || err)
    );
    return true;
  } catch (err) {
    console.warn('[AT AI]', VERSION, 'Arşiv açma hatası:', err?.message || err);
    return false;
  }
}

/*
  Capture aşamasında yalnız annualArchiveBtn'i sahipleniyoruz.
  Böylece sonradan eklenen/export menü dinleyicileri aynı kullanıcı tıklamasını alamaz.
  Diğer drawer butonlarına kesinlikle dokunulmaz.
*/
document.addEventListener('click', event => {
  const btn = event.target?.closest?.('#annualArchiveBtn');
  if (!btn || !event.isTrusted) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  openAnnualArchiveV1662();
  closeDrawerV1662();
}, true);

window.ATAnnualArchiveMenuFixV1662 = {
  version: VERSION,
  open: openAnnualArchiveV1662
};

console.info('[AT AI]', VERSION, 'aktif — Yıllık Arşiv menüsü tekrar doğrudan arşive bağlı.');
})();
