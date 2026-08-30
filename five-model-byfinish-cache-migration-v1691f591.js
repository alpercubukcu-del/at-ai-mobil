/* AT AI Mobil — V16.9.1F59.1 5 Model byFinish cache migration
   - Removes only obsolete session 5 Model rows that do not contain real byFinish 1/2/3 schema.
   - Does not clear Daily Career/5 Model IndexedDB archives.
   - Prevents an old F57 compact session result from masking the F59 cooperative podium fix.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_BYFINISH_CACHE_MIGRATION_V1691F591__) return;
window.__AT_FIVE_MODEL_BYFINISH_CACHE_MIGRATION_V1691F591__ = true;

const VERSION = 'FIVE-MODEL-BYFINISH-CACHE-MIGRATION-V16.9.1F59.1';
const SESSION_KEY = 'at_ai_five_model_compact_v1687';

function completeByFinish(data) {
  const horses = Array.isArray(data?.horses) ? data.horses : [];
  if (!horses.length) return false;
  return horses.every(item => {
    const split = item?.scores?.byFinish;
    return Boolean(split && (split[1] || split['1']) && (split[2] || split['2']) && (split[3] || split['3']));
  });
}

let removed = 0;
let kept = 0;
try {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw) {
    const store = JSON.parse(raw);
    if (store && typeof store === 'object') {
      for (const key of Object.keys(store)) {
        const data = store[key]?.data || store[key];
        if (completeByFinish(data)) {
          kept += 1;
        } else {
          delete store[key];
          removed += 1;
        }
      }
      if (Object.keys(store).length) sessionStorage.setItem(SESSION_KEY, JSON.stringify(store));
      else sessionStorage.removeItem(SESSION_KEY);
    }
  }
} catch (e) {
  console.warn('[AT AI]', VERSION, 'session cache migration warning:', e?.message || e);
}

window.ATFiveModelByFinishCacheMigrationV1691F591 = { version:VERSION, removed, kept };
console.info('[AT AI]', VERSION, 'active', { removed, kept });
})();
