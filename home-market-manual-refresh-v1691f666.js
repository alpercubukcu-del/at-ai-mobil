/* AT AI Mobil — F60.66 Ana sayfa piyasa sıralamasını kullanıcı yenilemesine kilitle */
(() => {
'use strict';
if(window.__AT_F6066_HOME_MARKET_MANUAL__) return;
window.__AT_F6066_HOME_MARKET_MANUAL__=true;
const VERSION='HOME-MARKET-MANUAL-REFRESH-V16.9.1F60.66';

try{
  if(typeof liveMarketStateV113==='object' && liveMarketStateV113?.timer){
    clearInterval(liveMarketStateV113.timer);
    liveMarketStateV113.timer=null;
  }
}catch{}

try{
  if(typeof refreshLiveMarketV113==='function'){
    const manualRefreshBaseV1666=refreshLiveMarketV113;
    refreshLiveMarketV113=async function(force=false){
      // Otomatik timer / visibility / 400 ms başlangıç çağrıları sıralamayı değiştiremez.
      // Yalnız görünür "GNY + AGF Yenile" düğmesi force=true ile günceller.
      if(force!==true) return false;
      return manualRefreshBaseV1666.call(this,true);
    };
  }
}catch(err){console.warn('[AT AI]',VERSION,'market guard kurulamadı',err);}

window.ATF6066HomeMarket={version:VERSION,mode:'manual-only'};
console.info('[AT AI]',VERSION,'aktif — GNY/AGF sırası otomatik değişmez; yalnız Yenile düğmesi günceller.');
})();
