/* AT AI Mobil - F60.94.31.24 analysis menu dedupe + late mutation guard */
(()=>{
'use strict';
if(window.__AT_HOME_MENU_DEDUPE_FIX_F60943124__)return;
window.__AT_HOME_MENU_DEDUPE_FIX_F60943124__=true;
const VERSION='AT_HOME_MENU_DEDUPE_FIX_F60943124';
const TEXT7='7. Tarihsel Sonuç Arşivi · Koşu Sorgulama';
const TEXT8='8. Gerçek Yarış Arşivi + Pist / Bakım / Hava';
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const numOf=el=>{const m=clean(el?.textContent).match(/^([1-9])\.\s*/);return m?Number(m[1]):0};
function menuRoot(){
  const nine=[...document.querySelectorAll('button')].find(b=>numOf(b)===9);
  if(!nine)return null;
  for(let p=nine.parentElement;p&&p!==document.body;p=p.parentElement){
    const nums=[...p.querySelectorAll('button')].map(numOf).filter(n=>n>=1&&n<=9);
    if(nums.includes(1)&&nums.includes(9)&&new Set(nums).size>=8)return p;
  }
  return null;
}
function directUnit(el,root){let u=el;while(u?.parentElement&&u.parentElement!==root)u=u.parentElement;return u||el}
function removeDuplicate(btn,keeper,root){
  if(!btn||btn===keeper)return;
  const unit=directUnit(btn,root),keepUnit=directUnit(keeper,root);
  if(unit===keepUnit)btn.remove();else unit.remove();
}
function normalize(){
  const root=menuRoot();if(!root)return false;
  let changed=false;
  const buttons=()=>[...root.querySelectorAll('button')];
  const sevens=buttons().filter(b=>numOf(b)===7);
  const eights=buttons().filter(b=>numOf(b)===8);
  const nines=buttons().filter(b=>numOf(b)===9);
  if(!sevens.length||!eights.length||!nines.length)return false;

  const seven=sevens.find(b=>b.id==='annualArchiveHistoryBtnF60943123')||sevens[0];
  for(const b of sevens)if(b!==seven){removeDuplicate(b,seven,root);changed=true}
  if(clean(seven.textContent)!==TEXT7){seven.textContent=TEXT7;changed=true}

  const eight=eights.find(b=>b.id!=='archiveHubBtnF60943123')||eights[0];
  for(const b of eights)if(b!==eight){removeDuplicate(b,eight,root);changed=true}
  if(clean(eight.textContent)!==TEXT8){eight.textContent=TEXT8;changed=true}

  const fresh=buttons();
  const byNum=new Map();for(const b of fresh){const n=numOf(b);if(n>=1&&n<=9&&!byNum.has(n))byNum.set(n,b)}
  if([1,2,3,4,5,6,7,8,9].every(n=>byNum.has(n))){
    const units=[1,2,3,4,5,6,7,8,9].map(n=>directUnit(byNum.get(n),root));
    for(let i=1;i<units.length;i++){
      const prev=units[i-1],cur=units[i];
      if(prev!==cur&&prev.nextElementSibling!==cur){root.insertBefore(cur,prev.nextElementSibling);changed=true}
    }
  }
  root.dataset.menuDedupeF60943124='1';
  return true;
}
let rootObserver=null,bootObserver=null,pending=false;
function scheduleNormalize(){
  if(pending)return;pending=true;
  queueMicrotask(()=>{pending=false;try{normalize()}catch(e){console.warn('[AT AI F60.94.31.24] normalize',e)}});
}
function observeRoot(){
  const root=menuRoot();if(!root)return false;
  if(rootObserver)rootObserver.disconnect();
  rootObserver=new MutationObserver(scheduleNormalize);
  rootObserver.observe(root,{childList:true,subtree:true,characterData:true});
  normalize();
  return true;
}
function install(){
  if(observeRoot())return;
  bootObserver=new MutationObserver(()=>{if(observeRoot()){bootObserver?.disconnect();bootObserver=null}});
  bootObserver.observe(document.documentElement,{childList:true,subtree:true});
  for(const ms of[0,50,150,400,1000,2500,5000])setTimeout(()=>{if(observeRoot()&&bootObserver){bootObserver.disconnect();bootObserver=null}},ms);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATHomeMenuDedupeFixF60943124={version:VERSION,normalize,observeRoot};
console.info('[AT AI]',VERSION,'active - duplicate menu 8 removed; late menu text/order mutations guarded.');
})();
