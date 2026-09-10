/* AT AI Mobil — V16.5.9 hard modal layer lock
   Amaç: mobilde sağ drawer ile herhangi bir dialog/export penceresinin aynı anda görünmesini kesin olarak engellemek.
   Analiz/puanlama/export hesaplarını değiştirmez. */
(()=>{
'use strict';
if(window.__AT_MOBILE_LAYER_LOCK_V1659__)return;
window.__AT_MOBILE_LAYER_LOCK_V1659__=true;
const VERSION='MOBILE-LAYER-LOCK-V16.5.9';
const $=id=>document.getElementById(id);
const ROOT=document.documentElement;

function hardCloseDrawer(){
  const d=$('drawer'), o=$('overlay');
  try{ if(typeof closeDrawer==='function') closeDrawer(); }catch{}
  d?.classList.remove('open');
  d?.setAttribute('aria-hidden','true');
  o?.classList.remove('show');
}

function anyOpenDialog(){
  return [...document.querySelectorAll('dialog')].some(d=>d.open || d.hasAttribute('open'));
}

function lockLayers(){
  hardCloseDrawer();
  ROOT.classList.add('at-hard-modal-lock-v1659');
}

function syncLayers(){
  if(anyOpenDialog()) lockLayers();
  else ROOT.classList.remove('at-hard-modal-lock-v1659');
}

function installCss(){
  if(document.getElementById('atHardModalLockCssV1659'))return;
  const s=document.createElement('style');
  s.id='atHardModalLockCssV1659';
  s.textContent=`
    html.at-hard-modal-lock-v1659 #drawer{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
      right:-120vw!important;
      transform:translateX(120vw)!important;
    }
    html.at-hard-modal-lock-v1659 #overlay{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    @media(max-width:700px){
      html.at-hard-modal-lock-v1659 body{overflow:hidden!important;}
      html.at-hard-modal-lock-v1659 dialog[open]{z-index:2147483000!important;}
    }
  `;
  document.head.appendChild(s);
}

/* Dinamik oluşturulan Kariyer Excel / Yıllık Arşiv dialogları dahil tüm showModal çağrılarını yakala. */
if(window.HTMLDialogElement?.prototype?.showModal){
  const original=HTMLDialogElement.prototype.showModal;
  if(!original.__atV1659){
    const wrapped=function(...args){
      lockLayers();
      const out=original.apply(this,args);
      queueMicrotask(syncLayers);
      return out;
    };
    wrapped.__atV1659=true;
    HTMLDialogElement.prototype.showModal=wrapped;
  }
}

if(window.HTMLDialogElement?.prototype?.show){
  const originalShow=HTMLDialogElement.prototype.show;
  if(!originalShow.__atV1659){
    const wrappedShow=function(...args){
      lockLayers();
      const out=originalShow.apply(this,args);
      queueMicrotask(syncLayers);
      return out;
    };
    wrappedShow.__atV1659=true;
    HTMLDialogElement.prototype.show=wrappedShow;
  }
}

/* Drawer içinden bir pencere açılacaksa, hedef handler çalışmadan önce drawer fiziksel olarak kaybolsun. */
document.addEventListener('pointerdown',e=>{
  const b=e.target?.closest?.('#drawer button');
  if(!b || b.id==='closeMenu')return;
  lockLayers();
},true);

document.addEventListener('click',e=>{
  const b=e.target?.closest?.('#drawer button');
  if(!b || b.id==='closeMenu')return;
  lockLayers();
  setTimeout(syncLayers,0);
  setTimeout(syncLayers,80);
  setTimeout(syncLayers,300);
},true);

/* Sonradan DOM'a eklenen dialog ve open attribute değişimleri de izlenir. */
const observer=new MutationObserver(()=>syncLayers());
function start(){
  installCss();
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class']});
  document.addEventListener('close',()=>setTimeout(syncLayers,0),true);
  document.addEventListener('cancel',()=>setTimeout(syncLayers,0),true);
  window.addEventListener('pageshow',syncLayers);
  window.addEventListener('resize',syncLayers,{passive:true});
  syncLayers();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
console.info('[AT AI]',VERSION,'aktif');
})();
