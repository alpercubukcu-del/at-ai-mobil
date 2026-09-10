/* AT AI Mobil — V16.9.1F9 Günlük Arşiv Otomatik Geri Yükleme
   - Ana uygulamadaki lexical state nesnesini arşiv modülleri için window.state ile paylaşır.
   - TJK programı yeniden yüklendiğinde aynı tarih/şehir günlük arşivi otomatik hydrate edilir.
   - Kariyer ekranı ve Kupon ekranı açılırken arşiv önce geri yüklenir.
   - Hesaplama formüllerini, Kariyer/Hazırlık puanını ve debut Güncel puanını değiştirmez.
*/
(() => {
'use strict';
if (window.__AT_ARCHIVE_STATE_REUSE_V1691F9__) return;
window.__AT_ARCHIVE_STATE_REUSE_V1691F9__ = true;
const VERSION='ARCHIVE-STATE-REUSE-V16.9.1F9';
let hydrateTask=null;

function exposeState(){
  try { if (typeof state === 'object' && state) window.state = state; } catch {}
}
async function hydrate(reason='manual'){
  exposeState();
  if (hydrateTask) return hydrateTask;
  hydrateTask=(async()=>{
    try{
      const api=window.ATCouponDailyArchiveV1691;
      if(!api?.hydrateCurrent) return {careerLoaded:0,modelLoaded:0,reason};
      const result=await api.hydrateCurrent();
      exposeState();
      try { if(typeof save==='function') save(); } catch {}
      window.__AT_ARCHIVE_RESTORE_LAST_F9__={...result,reason,at:new Date().toISOString()};
      return result;
    }catch(e){
      console.warn('[AT AI] F9 arşiv geri yükleme:',e);
      return {careerLoaded:0,modelLoaded:0,error:e?.message||String(e),reason};
    }
  })();
  try{return await hydrateTask;}finally{hydrateTask=null;}
}

exposeState();

try{
  if(typeof loadProgram==='function'){
    const baseLoadProgram=loadProgram;
    loadProgram=async function(...args){
      const out=await baseLoadProgram.apply(this,args);
      exposeState();
      await hydrate('program-reload');
      return out;
    };
  }
}catch(e){console.warn('[AT AI] F9 loadProgram wrap:',e)}

try{
  if(typeof changeCity==='function'){
    const baseChangeCity=changeCity;
    changeCity=async function(...args){
      const out=await baseChangeCity.apply(this,args);
      exposeState();
      await hydrate('city-change');
      return out;
    };
  }
}catch(e){console.warn('[AT AI] F9 changeCity wrap:',e)}

try{
  if(typeof openAnalysis==='function'){
    const baseOpenAnalysis=openAnalysis;
    openAnalysis=function(view,...args){
      exposeState();
      const out=baseOpenAnalysis.call(this,view,...args);
      if(view==='career'){
        setTimeout(async()=>{
          const r=await hydrate('career-open');
          try{
            const sel=document.getElementById('analysisRace')?.value||'all';
            const c=state?.analyses?.career;
            if(c&&Array.isArray(c.races)&&c.races.length&&typeof renderCareerAnalysis==='function') renderCareerAnalysis(c,sel);
          }catch{}
        },0);
      }
      return out;
    };
  }
}catch(e){console.warn('[AT AI] F9 openAnalysis wrap:',e)}

function wrapCouponOpen(){
  const api=window.ATCouponDecisionV1671;
  if(!api||api.__archiveReuseF9||typeof api.open!=='function')return false;
  const base=api.open.bind(api);
  api.open=async function(...args){
    await hydrate('coupon-open');
    return base(...args);
  };
  api.__archiveReuseF9=true;
  return true;
}
wrapCouponOpen();setTimeout(wrapCouponOpen,0);setTimeout(wrapCouponOpen,300);

window.addEventListener('pageshow',()=>{
  exposeState();
  wrapCouponOpen();
  setTimeout(()=>hydrate('pageshow'),0);
},{passive:true});

document.addEventListener('click',e=>{
  if(e.target?.closest?.('#couponMenuBtn')) setTimeout(()=>hydrate('coupon-menu-click'),0);
},true);

window.ATArchiveStateReuseV1691F9={VERSION,hydrate,exposeState,last:()=>window.__AT_ARCHIVE_RESTORE_LAST_F9__||null};
console.info('[AT AI]',VERSION,'aktif — Günlük Arşiv otomatik geri yüklenir; aynı analiz tekrar hesaplanmaz.');
})();
