/* AT AI Mobil — V14.6.1 archive recompute safety */
(() => {
'use strict';
if (window.__AT_DAILY_CAREER_ARCHIVE_V1461_FIX__) return;
window.__AT_DAILY_CAREER_ARCHIVE_V1461_FIX__ = true;
document.addEventListener('click', e => {
  const btn = e.target?.closest?.('#careerArchiveRecalcV146');
  if (!btn) return;
  try {
    if (typeof careerModelCacheV112 !== 'undefined' && careerModelCacheV112?.clear) {
      careerModelCacheV112.clear();
    }
  } catch {}
}, true);
console.info('[AT AI] DAILY-CAREER-ARCHIVE-V14.6.1 recompute safety aktif');
})();
