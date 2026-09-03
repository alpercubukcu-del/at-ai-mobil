/* AT AI Mobil — V16.9.1F40 5 MODEL KARIYER STALE RECOVERY
   - Kariyer Yol Haritasi 5 Model paneli eski / takilmis Promise cache'ine kilitlenmez.
   - Yalniz onceden devam eden veya cache'lenmis bir hesap varsa kisa bekleme gardi uygulanir.
   - Takilma tespitinde V11.2 kariyer model cache'i temizlenir ve paylasilan 5 Model inflight zinciri bir kez yenilenir.
   - Diger kosularin sessionStorage kompakt arsivi korunur.
   - Taze hesaplarda mevcut uzun servis timeout'larina dokunulmaz.
*/
(() => {
'use strict';
if (window.__AT_CAREER_FIVE_MODEL_STALE_RECOVERY_V1691F40__) return;
window.__AT_CAREER_FIVE_MODEL_STALE_RECOVERY_V1691F40__ = true;

const VERSION='CAREER-FIVE-MODEL-STALE-RECOVERY-V16.9.1F40';
const STALE_WAIT_MS=12000;
const SESSION_KEY='at_ai_five_model_compact_v1687';

if (typeof getCareerRaceModelsV112!=='function') {
  console.warn('[AT AI]',VERSION,'getCareerRaceModelsV112 bulunamadi.');
  return;
}

const beforeGetCareerRaceModelsV1691F40=getCareerRaceModelsV112;

function timeoutCachedV1691F40(promise,ms,raceNo){
  let timer=null;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>{
      const e=new Error(`${raceNo||''}. kosunun onceki 5 Model hesabi yanit vermedi; guvenli yeniden hesaplama baslatiliyor.`.trim());
      e.code='AT_FIVE_MODEL_STALE_TIMEOUT';
      reject(e);
    },ms);
  });
  return Promise.race([Promise.resolve(promise),timeout]).finally(()=>{if(timer)clearTimeout(timer);});
}

function careerKeyV1691F40(race){
  try{return typeof careerModelKeyV112==='function'?careerModelKeyV112(race):null;}catch{return null;}
}

function sharedPendingV1691F40(race){
  try{return Boolean(window.ATFiveModelSharedCacheV1685?.pending?.(race?.no));}catch{return false;}
}

function clearStaleV1691F40(race,clearShared){
  const key=careerKeyV1691F40(race);
  try{if(key&&typeof careerModelCacheV112!=='undefined')careerModelCacheV112.delete(key);}catch{}
  if(!clearShared)return;

  // clear() private inflight Map'i temizlemek icin gerekli; session arsivini hemen geri koyuyoruz.
  let savedSession=null;
  try{savedSession=sessionStorage.getItem(SESSION_KEY);}catch{}
  try{window.ATFiveModelSharedCacheV1685?.clear?.();}catch{}
  if(savedSession){
    try{sessionStorage.setItem(SESSION_KEY,savedSession);}catch{}
  }
}

getCareerRaceModelsV112=async function(race){
  const key=careerKeyV1691F40(race);
  let hadCareerCache=false;
  try{hadCareerCache=Boolean(key&&typeof careerModelCacheV112!=='undefined'&&careerModelCacheV112.has(key));}catch{}
  const hadSharedPending=sharedPendingV1691F40(race);
  const annualLocalPending=Boolean(window.ATAnnualCareerFiveModelV138?.pending?.());

  // Yillik arsiv hesabi uzun surebilir; ortak yerel Promise takilmis hesap sayilmaz.
  if(annualLocalPending) return beforeGetCareerRaceModelsV1691F40(race);

  // Taze hesap normal zincirden gider. Sadece eski/inflight hesap sonsuza kadar bekletilmez.
  if(!hadCareerCache&&!hadSharedPending){
    return beforeGetCareerRaceModelsV1691F40(race);
  }

  try{
    return await timeoutCachedV1691F40(
      beforeGetCareerRaceModelsV1691F40(race),
      STALE_WAIT_MS,
      race?.no
    );
  }catch(e){
    if(e?.code!=='AT_FIVE_MODEL_STALE_TIMEOUT'){
      clearStaleV1691F40(race,hadSharedPending);
      console.warn('[AT AI]',VERSION,'cache hatasi; yeniden deneniyor:',e?.message||e);
    }else{
      clearStaleV1691F40(race,hadSharedPending||sharedPendingV1691F40(race));
      console.warn('[AT AI]',VERSION,'takilmis 5 Model cache temizlendi; yeniden hesaplanacak.',{raceNo:race?.no});
    }
  }

  return beforeGetCareerRaceModelsV1691F40(race);
};

window.ATCareerFiveModelStaleRecoveryV1691F40={
  VERSION,
  staleWaitMs:STALE_WAIT_MS,
  resetRace(race){clearStaleV1691F40(race,sharedPendingV1691F40(race));return true;}
};

console.info('[AT AI]',VERSION,'aktif — takilmis 5 Model kariyer cache otomatik temizlenip bir kez yeniden hesaplanir.');
})();
