/* AT AI Mobil - F60.94.31.23 analysis menu order + missing menu 8 fix
   F60.94.31.40: 7. menü F60.94.31.18 productiondaki Yıllık Yarış Arşivi olarak korunur.
*/
(()=>{
'use strict';
if(window.__AT_HOME_MENU_ORDER_FIX_F60943123__)return;
window.__AT_HOME_MENU_ORDER_FIX_F60943123__=true;
const VERSION='AT_HOME_MENU_ORDER_FIX_F60943123';
const LEGACY_TEXT7='7. Tarihsel Sonuç Arşivi · Koşu Sorgulama';
const LEGACY_ID7='annualArchiveHistoryBtnF60943123';
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const numOf=el=>{const m=clean(el?.textContent).match(/^([1-9])\.\s*/);return m?Number(m[1]):0};
function clearBehavior(el){
  for(const a of [...el.attributes])if(/^on/i.test(a.name)||/^data-/i.test(a.name))el.removeAttribute(a.name);
  el.disabled=false;el.hidden=false;el.style.removeProperty('display');
}
function menuRoot(seed){
  let p=seed?.parentElement||null;
  while(p&&p!==document.body){
    const bs=[...p.querySelectorAll('button')].filter(b=>numOf(b));
    if(bs.length>=7)return p;
    p=p.parentElement;
  }
  return null;
}
function openArchiveHub(history=false){
  try{window.closeDrawer?.()}catch{}
  setTimeout(()=>{
    try{window.ATArchiveHubMenu8F609418?.open?.()}catch(e){console.warn('[AT AI F60.94.31.23] archive hub open',e)}
    if(history)setTimeout(()=>{
      const target=document.getElementById('rrFastCardF60943121')||document.getElementById('realRaceArchiveSectionF6093');
      try{target?.scrollIntoView?.({block:'start',behavior:'smooth'})}catch{try{target?.scrollIntoView?.()}catch{}}
    },120);
  },0);
}
function wire(el,history){
  el.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
    openArchiveHub(history);return false;
  },true);
}
function makeCleanButton(source,id,text,history){
  const b=source.cloneNode(true);clearBehavior(b);b.id=id;b.textContent=text;wire(b,history);return b;
}
function directUnit(el,root){let u=el;while(u?.parentElement&&u.parentElement!==root)u=u.parentElement;return u||el}
function repair(){
  const seven=document.getElementById('annualArchiveBtn')||document.getElementById('annualArchiveBtnSafeF60943122')||[...document.querySelectorAll('button')].find(b=>numOf(b)===7);
  if(!seven)return false;
  if(seven.id==='annualArchiveBtnSafeF60943122')seven.id='annualArchiveBtn';
  seven.textContent='7. Yıllık Yarış Arşivi';
  const root=menuRoot(seven);if(!root)return false;
  let buttons=[...root.querySelectorAll('button')].filter(b=>numOf(b));
  const byNum=new Map();for(const b of buttons)if(!byNum.has(numOf(b)))byNum.set(numOf(b),b);
  if(![1,2,3,4,5,6,7,9].every(n=>byNum.has(n)))return false;

  // 7. düğme F18'deki kendi click zinciriyle yerinde kalır. Klonlama/yeniden yönlendirme yok.
  byNum.set(7,seven);

  const existing8=byNum.get(8)||[...root.querySelectorAll('button')].find(b=>clean(b.textContent).includes('Gerçek Yarış Arşivi'));
  const eightSource=existing8||byNum.get(9)||seven;
  const eight=makeCleanButton(eightSource,'archiveHubBtnF60943123','8. Gerçek Yarış Arşivi + Pist / Bakım / Hava',false);
  if(existing8){existing8.replaceWith(eight)}else{
    const nineUnit=directUnit(byNum.get(9),root);
    root.insertBefore(eight,nineUnit);
  }
  byNum.set(8,eight);

  buttons=[...root.querySelectorAll('button')].filter(b=>numOf(b));
  const fresh=new Map();for(const b of buttons)if(!fresh.has(numOf(b)))fresh.set(numOf(b),b);
  if(![1,2,3,4,5,6,7,8,9].every(n=>fresh.has(n)))return false;
  const units=[...new Set([1,2,3,4,5,6,7,8,9].map(n=>directUnit(fresh.get(n),root)))];
  const childList=[...root.children],first=units.slice().sort((a,b)=>childList.indexOf(a)-childList.indexOf(b))[0];
  const marker=document.createComment('AT_MENU_ORDER_F60943123');root.insertBefore(marker,first);
  for(let n=1;n<=9;n++){const u=directUnit(fresh.get(n),root);root.insertBefore(u,marker)}
  marker.remove();
  root.dataset.menuOrderF60943123='1';
  return true;
}
function install(){
  if(repair())return;
  const obs=new MutationObserver(()=>{if(repair())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>obs.disconnect(),10000);
  for(const ms of[50,150,400,900,1800,3200])setTimeout(()=>{if(repair())obs.disconnect()},ms);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATHomeMenuOrderFixF60943123={version:VERSION,repair,openArchiveHub,legacyText7:LEGACY_TEXT7,legacyId7:LEGACY_ID7};
console.info('[AT AI]',VERSION,'active - menu order 1..9 restored; menu 8 restored; F18 Menu 7 preserved.');
})();