const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f712.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.22] F60.94.21 base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/*
 * F60.94.22 restores only the part of the earlier F60.94.13 fix that actually
 * kept Android's visual order stable: CSS flex order 1..8. Unlike F60.94.13,
 * this does NOT restore MutationObserver, interval, replaceChildren loops, or
 * repeated global pointer/touch capture. Therefore a legacy writer may move a
 * DOM node, but it cannot make menu 8 render above menu 1.
 */
const staticVisualLock=`/* AT AI Mobil - V16.9.1F60.94.22 past-proven static visual order */
(()=>{
'use strict';
if(window.__AT_STATIC_VISUAL_ORDER_F609422__)return;
window.__AT_STATIC_VISUAL_ORDER_F609422__=true;
const VERSION='STATIC-VISUAL-ORDER-V16.9.1F60.94.22';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\\s+/g,' ').trim();
function installStyle(){
 if($('atStaticVisualOrderCssF609422'))return;
 const s=document.createElement('style');
 s.id='atStaticVisualOrderCssF609422';
 s.textContent=\`
  #drawer{display:flex!important;flex-direction:column!important;overflow-y:auto!important;}
  #drawer>.drawer-head{order:0!important;flex:0 0 auto!important;}
  #drawer>button:not(.icon-btn){flex:0 0 auto!important;}
  #programGuideBtnV661{order:1!important;}
  #drawer>button[data-view="current"]{order:2!important;}
  #drawer>button[data-view="career"]{order:3!important;}
  #drawer>button[data-view="calibration"]{order:4!important;}
  #drawer>button[data-view="scenario"]{order:5!important;}
  #couponMenuBtn{order:6!important;}
  #annualArchiveBtn{order:7!important;}
  #trackMaintenanceMenuBtnF60944{order:8!important;}
  #drawer>.drawer-note{order:9!important;flex:0 0 auto!important;}
 \`;
 document.head.appendChild(s);
}
function label(idOrNode,text){const n=typeof idOrNode==='string'?$(idOrNode):idOrNode;if(n&&clean(n.textContent)!==text)n.textContent=text;return n}
function apply(){
 installStyle();
 const drawer=$('drawer');if(!drawer)return false;
 const guide=$('programGuideBtnV661')||[...drawer.querySelectorAll('button')].find(b=>/Kullanım Talimatı/i.test(clean(b.textContent)));
 const current=drawer.querySelector('[data-view="current"]');
 const career=drawer.querySelector('[data-view="career"]');
 const calibration=drawer.querySelector('[data-view="calibration"]');
 const scenario=drawer.querySelector('[data-view="scenario"]');
 const coupon=$('couponMenuBtn');
 const annual=$('annualArchiveBtn');
 const maintenance=$('trackMaintenanceMenuBtnF60944');
 if(![guide,current,career,calibration,scenario,coupon,annual,maintenance].every(Boolean))return false;
 label(guide,'1. Kullanım Talimatı');
 label(current,'2. Güncel Analiz');
 label(career,'3. Kariyer Yol Haritası');
 label(calibration,'4. Model Kalibrasyonu');
 label(scenario,'5. Koşu Senaryosu');
 label(coupon,'6. Kupon Oluştur');
 label(annual,'7. Yıllık Yarış Arşivi');
 label(maintenance,'8. Gerçek Yarış Arşivi + Pist / Bakım / Hava');
 const ordered=[[guide,1],[current,2],[career,3],[calibration,4],[scenario,5],[coupon,6],[annual,7],[maintenance,8]];
 for(const [node,n] of ordered){node.style.setProperty('order',String(n),'important');node.style.removeProperty('visibility');node.style.removeProperty('pointer-events');node.removeAttribute('aria-hidden')}
 const note=drawer.querySelector('.drawer-note');if(note)note.style.setProperty('order','9','important');
 maintenance.dataset.staticVisualOrder='F60.94.22';
 drawer.dataset.staticVisualOrder=VERSION;
 return true;
}
function open8(e){
 e?.preventDefault?.();e?.stopPropagation?.();
 try{const owner=window.ATFinalDrawerOwnerF609421;if(typeof owner?.openMenu8==='function')return owner.openMenu8()}catch{}
 try{const hub=window.ATArchiveHubMenu8F609418;if(typeof hub?.open==='function')return hub.open()}catch{}
 try{const door=window.ATTrackMaintenanceRealDoorF609416;if(typeof door?.open==='function')return door.open()}catch{}
 return false;
}
function bind(){
 if(!apply())return false;
 const b=$('trackMaintenanceMenuBtnF60944');if(!b)return false;
 b.onclick=e=>{open8(e);return false};
 b.dataset.staticVisualClick='F60.94.22';
 return true;
}
function start(){
 installStyle();
 for(const ms of [0,120,420,1200])setTimeout(()=>bind(),ms);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ATStaticVisualOrderF609422={version:VERSION,apply,openMenu8:open8};
console.info('[AT AI]',VERSION,'active - prior proven CSS order restored without reactive drawer loops.');
})();`;
app+='\n\n'+staticVisualLock.trim()+'\n';
for(const bad of['new MutationObserver','setInterval(','replaceChildren('])if(staticVisualLock.includes(bad))throw new Error('[F60.94.22] reactive drawer mechanism accidentally added: '+bad);
for(const token of[
 'STATIC-VISUAL-ORDER-V16.9.1F60.94.22',
 '#programGuideBtnV661{order:1!important;}',
 '#annualArchiveBtn{order:7!important;}',
 '#trackMaintenanceMenuBtnF60944{order:8!important;}',
 "staticVisualClick='F60.94.22'",
 'FINAL-DRAWER-OWNER-V16.9.1F60.94.21',
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16'
])if(!app.includes(token))throw new Error('[F60.94.22] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692963');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692963'))throw new Error('[F60.94.22] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.22 build complete: Android visual menu order is locked by CSS 1..8, menu 8 direct click retained, no reactive loops.');
