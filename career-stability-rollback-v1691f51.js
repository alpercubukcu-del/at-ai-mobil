/* AT AI Mobil - V16.9.1F51 Stability Rollback Guard
   - F48/F49/F50 gunluk 5 Model toplu hazirlama katmanlari bu build'e dahil edilmez.
   - Eski mobil resume anahtarlarini temizler; Kariyer ana analizi ve kupon akisi 5 Model beklemez.
   - 5 Model yalniz Kariyer paneli acildiginda F47 davranisiyla calisir.
*/
(() => {
'use strict';
if (window.__AT_CAREER_STABILITY_ROLLBACK_V1691F51__) return;
window.__AT_CAREER_STABILITY_ROLLBACK_V1691F51__ = true;

const VERSION = 'CAREER-STABILITY-ROLLBACK-V16.9.1F51';
const STALE_KEYS = [
  'at_ai_mobile_resume_state_v1691f49'
];

for (const key of STALE_KEYS) {
  try { sessionStorage.removeItem(key); } catch {}
  try { localStorage.removeItem(key); } catch {}
}

function cleanupLegacyPrepUi() {
  for (const id of [
    'ceDaily5ProgressV1691F49',
    'ceDaily5ArchiveStatusV1691F48'
  ]) {
    try { document.getElementById(id)?.remove(); } catch {}
  }

  /* F48-F50 bu build'de yok; eski DOM parcalari bfcache ile geri gelirse de temizle. */
  try {
    const section = document.getElementById('ceDaily5ArchiveV1691F3');
    if (section && /kalıcı 5 Model arşivi|5 Model arşivini temizle|seçili koşuyu hazırla/i.test(section.textContent || '')) {
      section.remove();
    }
  } catch {}

  try {
    document.body?.classList?.remove('at-f49-prep-running', 'at-f50-prep-running');
  } catch {}
}

function unlockPage() {
  try {
    if (!document.querySelector('dialog[open]')) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  } catch {}
}

function boot() {
  cleanupLegacyPrepUi();
  unlockPage();
  window.addEventListener('pageshow', () => {
    cleanupLegacyPrepUi();
    unlockPage();
  });
  try {
    const mo = new MutationObserver(() => cleanupLegacyPrepUi());
    mo.observe(document.body, { childList:true, subtree:true });
  } catch {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

window.ATCareerStabilityRollbackV1691F51 = {
  version: VERSION,
  cleanup: cleanupLegacyPrepUi
};

console.info('[AT AI]', VERSION, 'aktif - toplu 5 Model hazirlama geri alindi; Kariyer ana akisi serbest.');
})();
