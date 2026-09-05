/* AT AI Mobil - V16.9.1F60.29 coupon Career archive restore
   Problem:
   - Daily Archive restores Career rows.
   - F24 stale-cache guard can clear state.analyses.career immediately after hydrate.
   - Coupon then reports every leg as missing although matching archived Career rows exist.
   Fix:
   - Wrap the public coupon archive hydrate after all Career guards are installed.
   - Preserve a same-program in-memory Career snapshot.
   - Re-read strict same date/city/race/fingerprint Daily Archive rows after base hydrate.
   - Restore only races whose current participant roster still matches.
   - Coupon keeps using F60.23 raw evidence ranking (rankingRawScore; display score is fallback).
*/
(() => {
'use strict';
if (window.__AT_COUPON_CAREER_ARCHIVE_RESTORE_V1691F629__) return;
window.__AT_COUPON_CAREER_ARCHIVE_RESTORE_V1691F629__ = true;

const VERSION = 'COUPON-CAREER-ARCHIVE-RESTORE-V16.9.1F60.29';
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I').replace(/[^A-Z0-9]+/g, '');

function st() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  return window.state || null;
}
function cityName() {
  try { return typeof getCityName === 'function' ? clean(getCityName()) : clean(document.querySelector('#citySelect option:checked')?.textContent); }
  catch { return ''; }
}
function programRaces() {
  return Array.isArray(st()?.races) ? st().races : [];
}
function horseParts(h = {}) {
  const x = h?.horse || h?.item?.horse || h;
  return {
    no:clean(x?.no ?? x?.Program_No ?? x?.programNo ?? x?.pno),
    id:clean(x?.id ?? x?.horseId ?? x?.At_ID ?? x?.atId),
    name:fold(x?.name ?? x?.horseName ?? x?.At_Adı ?? x?.At_Adi ?? x?.atadi ?? x?.atismi)
  };
}
function horseToken(h = {}) {
  const p = horseParts(h);
  return [p.no, p.id, p.name].join(':');
}
function roster(race) {
  return (Array.isArray(race?.horses) ? race.horses : []).map(horseToken).filter(Boolean).sort();
}
function sameRoster(a, b) {
  const aa = roster(a), bb = roster(b);
  return !!aa.length && aa.length === bb.length && aa.every((x, i) => x === bb[i]);
}
function fingerprint(race) {
  if (!race) return '';
  const horses = (Array.isArray(race?.horses) ? race.horses : [])
    .map(h => {
      const p = horseParts(h);
      return [p.no, p.id, p.name].join(':');
    }).sort();
  return [
    clean(race?.no),
    clean(race?.class || race?.yaradi1),
    clean(race?.ageGroup || race?.yaradi2),
    clean(race?.distance || race?.mesafe),
    clean(race?.track || race?.pist),
    horses.join('|')
  ].join('||');
}
function sameDateCity(career) {
  const s = st();
  if (!s || !career) return false;
  const dateOk = clean(career?.date) === clean(s?.date);
  const cityId = clean(s?.city);
  const cCity = clean(career?.city);
  const cName = fold(career?.cityName);
  return dateOk && ((cityId && cCity === cityId) || (cName && cName === fold(cityName())));
}
function matchingSnapshotRaces(career) {
  if (!sameDateCity(career)) return [];
  const map = new Map(programRaces().map(r => [String(r?.no), r]));
  return (Array.isArray(career?.races) ? career.races : []).filter(r => {
    const p = map.get(String(r?.no));
    return !!p && sameRoster(r, p);
  });
}
function archiveRecordMatches(rec, race) {
  const s = st();
  if (!rec || rec?.kind !== 'race' || !race || !s) return false;
  if (clean(rec?.date) !== clean(s?.date)) return false;
  const cityId = clean(s?.city);
  if (cityId && clean(rec?.city) !== cityId && fold(rec?.cityName) !== fold(cityName())) return false;
  const fp = clean(rec?.fingerprint);
  if (fp && fp === fingerprint(race)) return true;
  return sameRoster(rec?.race, race);
}
function mergeCareer(snapshot, records) {
  const s = st();
  if (!s) return { loaded:0, source:'NO_STATE' };
  const program = programRaces();
  const programMap = new Map(program.map(r => [String(r?.no), r]));
  const raceMap = new Map();

  for (const r of matchingSnapshotRaces(snapshot)) raceMap.set(String(r?.no), r);
  for (const rec of records || []) {
    const p = programMap.get(String(rec?.raceNo));
    if (p && archiveRecordMatches(rec, p) && rec?.race) raceMap.set(String(rec?.raceNo), rec.race);
  }

  if (!raceMap.size) return { loaded:0, source:'NO_MATCHING_CAREER' };

  const first = (records || []).find(r => r?.race && raceMap.has(String(r?.raceNo))) || null;
  const baseMeta = first?.meta || (sameDateCity(snapshot) ? snapshot : {}) || {};
  s.analyses = s.analyses || {};
  s.analyses.career = {
    ...baseMeta,
    type:'career',
    version:baseMeta?.version || snapshot?.version || 'DAILY-ARCHIVE',
    date:clean(s?.date),
    city:clean(s?.city),
    cityName:cityName(),
    coverage:raceMap.size >= program.length ? 'all' : 'partial',
    calculatedRace:raceMap.size >= program.length ? 'all' : String(first?.raceNo || snapshot?.calculatedRace || ''),
    races:[...raceMap.values()].sort((a,b)=>(Number(a?.no)||0)-(Number(b?.no)||0)),
    generatedAt:first?.generatedAt || snapshot?.generatedAt || first?.archivedAt || new Date().toISOString(),
    restoredFromArchive:true,
    couponArchiveRestore:true,
    couponPostF24Restore:true,
    couponRestoreVersion:VERSION
  };
  window.__AT_COUPON_CAREER_RESTORE_LAST_V1691F629__ = {
    version:VERSION,
    loaded:raceMap.size,
    raceNos:[...raceMap.keys()].map(Number).filter(Number.isFinite),
    programCount:program.length,
    source:first ? 'DAILY_ARCHIVE_POST_F24' : 'IN_MEMORY_SNAPSHOT_POST_F24'
  };
  return window.__AT_COUPON_CAREER_RESTORE_LAST_V1691F629__;
}

async function restoreCurrent(snapshot = null) {
  const api = window.ATCouponDailyArchiveV1691;
  const s = st();
  if (!api || typeof api.listDate !== 'function' || !s?.date) {
    return mergeCareer(snapshot, []);
  }
  let rows = [];
  try { rows = await api.listDate(clean(s.date)); } catch {}
  const programMap = new Map(programRaces().map(r => [String(r?.no), r]));
  const records = (Array.isArray(rows) ? rows : []).filter(rec => {
    const race = programMap.get(String(rec?.raceNo));
    return race && archiveRecordMatches(rec, race);
  });
  return mergeCareer(snapshot, records);
}

function install() {
  const api = window.ATCouponDailyArchiveV1691;
  if (!api || typeof api.hydrateCurrent !== 'function') return false;
  if (api.__couponPostF24RestoreV629) return true;

  const base = api.hydrateCurrent.bind(api);
  api.hydrateCurrent = async function(...args) {
    const before = (() => {
      try {
        const c = st()?.analyses?.career;
        return sameDateCity(c) && Array.isArray(c?.races) && c.races.length ? c : null;
      } catch { return null; }
    })();

    let result;
    try { result = await base(...args); }
    finally {
      const restored = await restoreCurrent(before);
      result = { ...(result || {}), postF24CareerRestore:restored };
    }
    return result;
  };
  api.__couponPostF24RestoreV629 = VERSION;
  api.restoreCareerForCouponV629 = restoreCurrent;
  return true;
}

if (!install()) {
  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 50);
  setTimeout(() => clearInterval(timer), 5000);
}

window.ATCouponCareerArchiveRestoreV629 = {
  version:VERSION,
  restoreCurrent,
  sameRoster,
  fingerprint,
  install,
  last:() => window.__AT_COUPON_CAREER_RESTORE_LAST_V1691F629__ || null
};
console.info('[AT AI]', VERSION, 'active - coupon Career rows are restored after F24 cache clearing.');
})();
