/* AT AI Mobil — F60.64 Güncel Analiz Özel panel Android dikey kaydırma düzeltmesi */
(() => {
'use strict';
if (window.__AT_F6064_CURRENT_MOBILE_SCROLL__) return;
window.__AT_F6064_CURRENT_MOBILE_SCROLL__ = true;
const VERSION='CURRENT-ANALYSIS-MOBILE-SCROLL-V16.9.1F60.64';
const STYLE_ID='f6064CurrentMobileScrollStyle';

function installStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
  @media(max-width:700px){
    #analysisDialog[data-view='current'][data-f63-scroll-mode='custom'] #f63CurrentPanel{
      flex:1 1 auto!important;
      min-height:0!important;
      max-height:none!important;
      margin:0!important;
      padding:10px 10px calc(18px + env(safe-area-inset-bottom))!important;
      border-left:0!important;
      border-right:0!important;
      border-radius:0!important;
      overflow-y:auto!important;
      overflow-x:hidden!important;
      overscroll-behavior-y:contain!important;
      -webkit-overflow-scrolling:touch!important;
      touch-action:pan-y!important;
    }
    #analysisDialog[data-view='current'][data-f63-scroll-mode='custom'] #analysisContent{
      display:none!important;
    }
    #analysisDialog[data-view='current'][data-f63-scroll-mode='custom'] #f63CurrentPanel .f63-actions{
      position:sticky!important;
      bottom:0!important;
      z-index:40!important;
      padding-top:9px!important;
      padding-bottom:max(2px,env(safe-area-inset-bottom))!important;
      background:linear-gradient(180deg,rgba(247,249,252,0),#f7f9fc 22%,#f7f9fc 100%)!important;
    }
    #analysisDialog[data-view='current'][data-f63-scroll-mode='standard'] #f63CurrentPanel,
    #analysisDialog[data-view='current'][data-f63-scroll-mode='results'] #f63CurrentPanel{
      flex:0 0 auto!important;
      min-height:0!important;
      max-height:none!important;
      overflow:visible!important;
      touch-action:auto!important;
    }
    #analysisDialog[data-view='current'] #f63CurrentPanel .f63-param-body,
    #analysisDialog[data-view='current'] #f63CurrentPanel #f63Picks{
      touch-action:pan-y!important;
    }
    #analysisDialog[data-view='current'] #f63CurrentPanel .f62-pick>.f62-chips{
      -webkit-overflow-scrolling:touch!important;
      touch-action:pan-y!important;
    }
  }
  `;
  document.head.appendChild(s);
}

function detectMode(panel){
  const active=panel?.querySelector?.('[data-f63-mode].is-active')?.dataset?.f63Mode;
  if(active) return active;
  if(panel?.querySelector?.('#f63CustomPane:not([hidden])')) return 'custom';
  if(panel?.querySelector?.('#f63StandardPane:not([hidden])')) return 'standard';
  return 'results';
}

function sync(){
  const d=document.getElementById('analysisDialog');
  if(!d) return;
  const panel=document.getElementById('f63CurrentPanel');
  if(d.dataset.view!=='current' || !panel || panel.style.display==='none'){
    if(d.hasAttribute('data-f63-scroll-mode')) d.removeAttribute('data-f63-scroll-mode');
    return;
  }
  const mode=detectMode(panel);
  if(d.dataset.f63ScrollMode!==mode) d.dataset.f63ScrollMode=mode;
}

function start(){
  installStyle();
  sync();
  const root=document.documentElement;
  const mo=new MutationObserver(()=>sync());
  try{mo.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','data-view','open','style']});}catch{}
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-f63-mode]')) setTimeout(sync,0);
  },true);
  window.addEventListener('pageshow',sync);
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(sync,60),{passive:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
console.info('[AT AI]',VERSION,'aktif');
})();
