/* AT AI Mobil — V16.8.3 Kupon Merkezi kompakt mobil düzen
   - Eski ikinci bahis kartı listesini görselden kaldırır; checkbox'lar DOM'da kalır.
   - Tek resmi bahis seçici ile eski .bet-check durumunu senkron tutar.
   - Bütçe/birim/tek ayarlarını tek kompakt satıra alır.
   - Boş 'Oluşturulan Kupon' panelini kupon oluşana kadar gizler.
   - Karar/puan formüllerine dokunmaz.
*/
(() => {
'use strict';
if(window.__AT_COUPON_MENU_COMPACT_V1683__) return;
window.__AT_COUPON_MENU_COMPACT_V1683__=true;
const VERSION='COUPON-MENU-COMPACT-V16.8.3';
const $=id=>document.getElementById(id);

function style(){
  if($('couponMenuCompactStyleV1683')) return;
  const s=document.createElement('style');
  s.id='couponMenuCompactStyleV1683';
  s.textContent=`
#couponCenterDialog .coupon-menu-scroll-v1681{padding:8px 9px max(18px,env(safe-area-inset-bottom))!important}
#couponCenterDialog .coupon-menu-panel-v1681{padding:9px!important;margin:0 0 8px!important;border-radius:13px!important}
#couponCenterDialog .section-title-row{gap:6px!important;margin-bottom:2px!important}
#couponCenterDialog .section-title-row h2{margin-bottom:5px!important}
#couponCenterDialog .five-model-note-v11{margin:4px 0 7px!important;padding:7px 9px!important;line-height:1.28!important;border-radius:10px!important}
#couponCenterDialog .five-model-note-v11 b{font-size:10px!important}
#couponCenterDialog .five-model-note-v11 span{font-size:10px!important;margin-top:2px!important}
#couponCenterDialog .five-model-note-v11 small{display:none!important}
#couponCenterDialog #betTypes{display:none!important}
#couponCenterDialog #betTypeStatusV1675{display:none!important}
#couponCenterDialog .manual-ticket-v117{margin:5px 0 7px!important}
#couponCenterDialog .manual-ticket-head-v117{padding:8px 9px!important}
#couponCenterDialog .manual-bet-type-v117{min-height:54px!important;padding:8px 8px 8px 10px!important}
#couponCenterDialog .manual-bet-type-v117 small{font-size:9px!important}
#couponCenterDialog .manual-bet-type-v117 b{font-size:14px!important}
#couponCenterDialog .manual-bet-type-v117 span{font-size:9px!important;line-height:1.2!important;margin-top:2px!important}
#couponCenterDialog .manual-bet-type-v117>strong,
#couponCenterDialog .manual-bet-type-v117 .manual-bet-chevron-v1113{width:38px!important;height:38px!important;min-width:38px!important;flex-basis:38px!important;font-size:24px!important;border-radius:10px!important}
#couponCenterDialog .manual-models-v117{gap:5px!important;padding:6px 0!important;margin:0!important;overflow-x:auto!important;white-space:nowrap!important}
#couponCenterDialog .manual-model-v117{padding:6px 8px!important;font-size:10px!important;min-height:30px!important}
#couponCenterDialog .manual-plan-v117.empty{padding:6px 8px!important;min-height:0!important;margin:0 0 6px!important;font-size:10px!important}
#couponCenterDialog .manual-loading-v117{padding:8px!important;margin:4px 0!important;min-height:0!important}
#couponCenterDialog #manualLoopProgressV1111{font-weight:900!important;color:#72d5ff!important}
#couponCenterDialog .ticket-settings-grid-v11{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;align-items:end!important;margin-top:5px!important}
#couponCenterDialog .ticket-settings-grid-v11 label,
html.at-mobile-layout-v1676 #couponCenterDialog .ticket-settings-grid-v11 label{grid-column:auto!important;margin:0!important;font-size:9px!important;line-height:1.15!important}
#couponCenterDialog .ticket-settings-grid-v11 input,
#couponCenterDialog .ticket-settings-grid-v11 select{min-height:36px!important;height:36px!important;margin-top:3px!important;padding:6px 7px!important;border-radius:8px!important;font-size:12px!important}
#couponCenterDialog .ticket-rule-v11{margin:6px 0 7px!important;padding:5px 7px!important;font-size:9px!important;line-height:1.3!important}
#couponCenterDialog #buildAllBtn{min-height:40px!important;padding:9px 10px!important}
#couponCenterDialog #couponResultV1681.coupon-no-result-v1683{display:none!important}
#couponCenterDialog #couponResultV1681 h2{margin-bottom:5px!important}
#couponCenterDialog .coupon-audit-section-v1681{margin:0!important}
#couponCenterDialog .coupon-back-v1681{min-height:38px!important;margin-bottom:7px!important;padding:8px 10px!important}
#couponCenterDialog #couponDecisionGateV1671.coupon-menu-embedded .cdg-head{padding:10px 11px!important}
#couponCenterDialog #couponDecisionGateV1671.coupon-menu-embedded .cdg-head h2{font-size:18px!important;margin:2px 0!important}
#couponCenterDialog #couponDecisionGateV1671.coupon-menu-embedded .cdg-close{width:38px!important;height:38px!important;font-size:22px!important;border-radius:10px!important}
#couponCenterDialog #couponDecisionGateV1671.coupon-menu-embedded .cdg-body{padding:7px 0 16px!important}
#couponCenterDialog #couponDecisionGateV1671.coupon-menu-embedded .cdg-card{padding:10px!important;margin-bottom:7px!important;border-radius:12px!important}
#couponCenterDialog #couponDecisionGateV1671.coupon-menu-embedded .cdg-row{padding:7px 0!important}
#couponCenterDialog #couponDecisionGateV1671.coupon-menu-embedded .cdg-actions{gap:6px!important;margin-top:7px!important}
@media(max-width:330px){
  #couponCenterDialog .ticket-settings-grid-v11{grid-template-columns:1fr 1fr!important}
  #couponCenterDialog .ticket-settings-grid-v11 label:last-child{grid-column:1/-1!important}
}
`;
  document.head.appendChild(s);
}

function syncChosenBet(value){
  const v=String(value||'').trim();
  if(!v) return;
  const inputs=[...document.querySelectorAll('#betTypes .bet-check')];
  const input=inputs.find(x=>String(x.value||'').trim()===v);
  if(!input) return;
  try{
    if(window.ATCouponTypeV1675?.choose) window.ATCouponTypeV1675.choose(input);
    else{
      for(const x of inputs)x.checked=x===input;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }catch{}
}

function hasTicket(){
  const t=$('tickets');
  if(!t) return false;
  if(!t.classList.contains('empty') && (t.querySelector('.ticket,.ticket-group-v11,.cdg-ticket-summary') || t.children.length)) return true;
  const text=String(t.textContent||'').toLocaleLowerCase('tr-TR');
  return !text.includes('henüz') && !text.includes('oluşturulmadı') && text.trim().length>20;
}
function syncResult(){
  const result=$('couponResultV1681');
  if(result) result.classList.toggle('coupon-no-result-v1683',!hasTicket());
}

// Resmi bahis seçim sheet'inden seçim yapıldığında görünmez eski checkbox state'i de güncellenir.
document.addEventListener('click',e=>{
  const b=e.target?.closest?.('#manualBetSheetV117 [data-manual-bet]');
  if(!b) return;
  const v=b.dataset.manualBet||'';
  setTimeout(()=>syncChosenBet(v),0);
},false);

function bind(){
  style();syncResult();
  const t=$('tickets');
  if(t && t.dataset.compactWatchV1683!=='1'){
    t.dataset.compactWatchV1683='1';
    try{new MutationObserver(syncResult).observe(t,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});}catch{}
  }
  const d=$('couponCenterDialog');
  if(d && d.dataset.compactV1683!=='1'){
    d.dataset.compactV1683='1';
    d.addEventListener('toggle',syncResult);
  }
}

bind();
const mo=new MutationObserver(bind);try{mo.observe(document.documentElement,{subtree:true,childList:true});}catch{}
window.addEventListener('pageshow',bind,{passive:true});
window.__AT_COUPON_MENU_COMPACT_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif — eski bahis kartları gizli, kupon ekranı kompakt.');
})();
