;(() => {
'use strict';
if (window.__AT_CAREER_DAILY_ARCHIVE_IDB_VERSION_FIX_V1691F655__) return;
window.__AT_CAREER_DAILY_ARCHIVE_IDB_VERSION_FIX_V1691F655__ = true;

const VERSION = 'CAREER-DAILY-ARCHIVE-IDB-VERSION-FIX-V16.9.1F60.55';
const DB_NAME = 'at_ai_daily_career_archive_v146';

/*
 * 10.09'daki schema-repair katmani DB surumunu 2+ seviyesine cikarabiliyor.
 * Daily Archive ve Score Guard ise daha sonra indexedDB.open(DB_NAME, 1)
 * yaptigi icin Android/Chrome VersionError ile DB'yi acamiyor. 04.09 akisi DB v1
 * iken calisiyordu; bu katman eski/yeni tum surumleri veri silmeden acar.
 */
try {
  const factory = window.indexedDB;
  const nativeOpen = factory && typeof factory.open === 'function' ? factory.open.bind(factory) : null;
  if (factory && nativeOpen) {
    const tolerantOpen = function(name, version) {
      if (String(name) === DB_NAME && Number(version) === 1) {
        try {
          return nativeOpen(name); // mevcut surumu (1,2,3...) oldugu gibi ac
        } catch (error) {
          console.warn('[AT AI]', VERSION, 'version-tolerant open failed, legacy open retried', error);
        }
      }
      return arguments.length >= 2 ? nativeOpen(name, version) : nativeOpen(name);
    };
    try {
      Object.defineProperty(factory, 'open', {
        configurable:true,
        writable:true,
        value:tolerantOpen
      });
    } catch {
      factory.open = tolerantOpen;
    }
  }
} catch (error) {
  console.warn('[AT AI]', VERSION, 'IndexedDB open patch could not be installed', error);
}

/* Mevcut hesap sonucu varsa, patch kurulduktan sonra bir kez arsiv yazimini tekrar dene. */
setTimeout(() => {
  try {
    const api = window.ATCareerArchiveScoreGuardV1691F33;
    const career = (typeof state === 'object' && state) ? state?.analyses?.career : window.state?.analyses?.career;
    if (api?.archive && Array.isArray(career?.races) && career.races.length) {
      Promise.resolve(api.archive(career, career.races, career.calculatedRace || 'all', 'idb-version-fix-boot')).catch(() => {});
    }
  } catch {}
}, 0);

console.info('[AT AI]', VERSION, 'active - Daily Career Archive opens the existing IndexedDB version without downgrade errors.');
})();
