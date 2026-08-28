/* AT AI Mobil — V16.9.1F41 5 MODEL FRESH START RECOVERY
   - Kariyer Yol Haritasi 5 Model panelinin taze istekte IndexedDB/arsiv okumasinda sonsuza kadar beklemesini engeller.
   - Gercek hesaplama zincirine girildigini prepareRaceModelsV11 baslangic sayaci ile izler.
   - 3.5 sn icinde hesaplama zinciri hic baslamazsa arsiv wrapper'i bypass edilerek ayni kosu dogrudan V11 modele verilir.
   - Mevcut gunluk session arsivi korunur; yalniz gercekten takilmis shared inflight varsa temizlenir.
   - Her durumda 120 sn ust sinir vardir; UI artik sonsuz "hazirlaniyor" durumunda kalmaz.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_FRESH_START_RECOVERY_V1691F41__) return;
window.__AT_CAREER_FIVE_MODEL_FRESH_START_RECOVERY_V1691F41__ = true;

const VERSION='CAREER-FIVE-MODEL-FRESH-START-RECOVERY-V16.9.1F41';
const START_WATCH_MS=3500;
const MAX_WAIT_MS=120000;
const SESSION_KEY='at_ai_five_model_compact_v1687';

if (typeof getCareerRaceModelsV112!=='function' || typeof prepareRaceModelsV11!=='function') {
  console.warn('[AT AI]',VERSION,'5 Model fonksiyonlari bulunamadi.');
  return;
}

const beforeGetCareerRaceModelsV1691F41=getCareerRaceModelsV112;
const beforePrepareRaceModelsV1691F41=prepareRaceModelsV11;
const prepareCountV1691F41=new Map();

function raceKeyV1691F41(race){
  try {
    if (typeof careerModelKeyV112==='function') return careerModelKeyV112(race);
  } catch {}
  return [
    (typeof state!=='undefined' ? state?.date : '') || '',
    (typeof state!=='undefined' ? state?.city : '') || '',
    race?.no ?? ''
  ].join('|');
}

function countV1691F41(key){
  return Number(prepareCountV1691F41.get(key)||0);
}

function markPrepareV1691F41(race){
  const key=raceKeyV1691F41(race);
  prepareCountV1691F41.set(key,countV1691F41(key)+1);
}

function delayV1691F41(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

function timeoutV1691F41(promise,ms,raceNo,code='AT_FIVE_MODEL_MAX_TIMEOUT'){
  let timer=null;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>{
      const e=new Error(`${raceNo||''}. kosunun 5 Model hesabi zaman asimina ugradi.`.trim());
      e.code=code;
      reject(e);
    },ms);
  });
  return Promise.race([Promise.resolve(promise),timeout]).finally(()=>{if(timer)clearTimeout(timer);});
}

function clearCareerCacheV1691F41(race){
  const key=raceKeyV1691F41(race);
  try {
    if (key && typeof careerModelCacheV112!=='undefined') careerModelCacheV112.delete(key);
  } catch {}
}

function sharedPendingV1691F41(race){
  try { return Boolean(window.ATFiveModelSharedCacheV1685?.pending?.(race?.no)); }
  catch { return false; }
}

function clearSharedPendingPreserveArchiveV1691F41(race){
  if (!sharedPendingV1691F41(race)) return false;
  let savedSession=null;
  try { savedSession=sessionStorage.getItem(SESSION_KEY); } catch {}
  try { window.ATFiveModelSharedCacheV1685?.clear?.(); } catch {}
  if (savedSession!==null) {
    try { sessionStorage.setItem(SESSION_KEY,savedSession); } catch {}
  }
  return true;
}

function cacheResolvedV1691F41(race,result){
  const key=raceKeyV1691F41(race);
  try {
    if (key && typeof careerModelCacheV112!=='undefined') {
      careerModelCacheV112.set(key,Promise.resolve(result));
    }
  } catch {}
}

// Base V11.2 fonksiyonu prepareRaceModelsV11'i global binding'den cagirir.
// Bu sarici sayesinde arsiv katmanindan gercek hesaplama zincirine gecilip gecilmedigini goruruz.
prepareRaceModelsV11=function(race){
  markPrepareV1691F41(race);
  return beforePrepareRaceModelsV1691F41(race);
};

async function directRecoveryV1691F41(race){
  clearCareerCacheV1691F41(race);
  const sharedWasCleared=clearSharedPendingPreserveArchiveV1691F41(race);
  markPrepareV1691F41(race);
  console.warn('[AT AI]',VERSION,'5 Model hesaplama zinciri baslamadi; arsiv katmani bypass edilerek dogrudan hesaplama baslatiliyor.',{
    raceNo:race?.no,
    sharedWasCleared
  });

  const result=await timeoutV1691F41(
    Promise.resolve().then(()=>beforePrepareRaceModelsV1691F41(race)),
    MAX_WAIT_MS,
    race?.no,
    'AT_FIVE_MODEL_RECOVERY_TIMEOUT'
  );
  cacheResolvedV1691F41(race,result);
  return result;
}

getCareerRaceModelsV112=async function(race){
  const key=raceKeyV1691F41(race);
  const beforeCount=countV1691F41(key);
  let settled=false;

  // Reject olursa da handler bagli kalir; gec uyanan eski arsiv Promise'i unhandled rejection uretmez.
  const normal=Promise.resolve()
    .then(()=>beforeGetCareerRaceModelsV1691F41(race))
    .then(
      value=>{settled=true;return {ok:true,value};},
      error=>{settled=true;return {ok:false,error};}
    );

  const first=await Promise.race([
    normal,
    delayV1691F41(START_WATCH_MS).then(()=>null)
  ]);

  if (first) {
    if (first.ok) return first.value;
    throw first.error;
  }

  // 3.5 sn gecti ama prepareRaceModelsV11 hic cagrilmadiysa sorun model API'sinde degil,
  // onundeki IndexedDB/gunluk arsiv okuma katmanindadir. O katmani yalniz bu kosu icin bypass et.
  if (!settled && countV1691F41(key)===beforeCount) {
    return directRecoveryV1691F41(race);
  }

  // Hesaplama gercekten basladiysa duplicate istek yaratma; fakat sonsuz beklemeye de izin verme.
  const remaining=Math.max(1000,MAX_WAIT_MS-START_WATCH_MS);
  const done=await timeoutV1691F41(normal,remaining,race?.no);
  if (done.ok) return done.value;
  throw done.error;
};

window.ATCareerFiveModelFreshStartRecoveryV1691F41={
  VERSION,
  startWatchMs:START_WATCH_MS,
  maxWaitMs:MAX_WAIT_MS,
  prepareCount(race){return countV1691F41(raceKeyV1691F41(race));},
  resetRace(race){
    clearCareerCacheV1691F41(race);
    clearSharedPendingPreserveArchiveV1691F41(race);
    return true;
  }
};

console.info('[AT AI]',VERSION,'aktif — taze 5 Model istekleri arsiv/IndexedDB onunde takilirsa otomatik bypass edilir.');
})();
