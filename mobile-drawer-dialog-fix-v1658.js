/* AT AI Mobil — V16.5.8
   Mobil drawer + tam sayfa analiz görünümü katman senkronizasyonu. */
(()=>{
'use strict';
if(window.__AT_MOBILE_DRAWER_DIALOG_FIX_V1658__)return;
window.__AT_MOBILE_DRAWER_DIALOG_FIX_V1658__=true;
const VERSION='MOBILE-FULLSCREEN-DIALOG-V16.5.8';
const $=id=>document.getElementById(id);
function closeDrawerSafe(){try{if(typeof closeDrawer==='function'){closeDrawer();return}}catch{}$('drawer')?.classList.remove('open');$('overlay')?.classList.remove('show');$('drawer')?.setAttribute('aria-hidden','true')}
function installFullscreenCss(){if($('atFullPageDialogsV1658'))return;const s=document.createElement('style');s.id='atFullPageDialogsV1658';s.textContent=`dialog{box-sizing:border-box}dialog[open]{position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;margin:0!important;border-radius:0!important;border:0!important;padding:0!important}dialog[open]::backdrop{background:#07111f!important}dialog[open]>div:first-child{position:sticky;top:0;z-index:50}dialog[open] .fogd-body,dialog[open] .fh-body{max-height:none!important;height:auto!important;overflow:visible!important;padding-bottom:calc(24px + env(safe-area-inset-bottom))!important}@media(max-width:640px){dialog[open]{width:100vw!important;height:100dvh!important}}`;document.head.appendChild(s)}
function syncLayers(){installFullscreenCss();const any=[...document.querySelectorAll('dialog')].some(d=>d.open||d.hasAttribute('open'));if(any)closeDrawerSafe();document.documentElement.classList.toggle('at-fullpage-open',any);document.body.classList.toggle('at-fullpage-open',any)}
document.addEventListener('click',e=>{const b=e.target?.closest?.('#drawer button');if(b&&b.id!=='closeMenu')closeDrawerSafe()},true);
const observer=new MutationObserver(ms=>{if(ms.some(m=>m.type==='attributes'&&m.attributeName==='open'))syncLayers()});
function observeAll(){installFullscreenCss();document.querySelectorAll('dialog').forEach(d=>{if(d.dataset.atFullObserved==='1')return;d.dataset.atFullObserved='1';observer.observe(d,{attributes:true,attributeFilter:['open']})});syncLayers()}
const bodyObserver=new MutationObserver(observeAll);
function start(){observeAll();bodyObserver.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',observeAll);console.info('[AT AI]',VERSION,'active');
})();
