const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f709.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.19] F60.94.18 base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

function replaceIife(startMarker,replacement,label){
  const start=app.indexOf(startMarker);
  if(start<0)throw new Error(`[F60.94.19] ${label} start marker not found`);
  const close=app.indexOf('\n})();',start);
  if(close<0)throw new Error(`[F60.94.19] ${label} IIFE close not found`);
  app=app.slice(0,start)+replacement.trim()+'\n'+app.slice(close+'\n})();'.length);
}
function replaceScoped(scopeMarker,startNeedle,endNeedle,replacement,label){
  const scope=app.indexOf(scopeMarker);
  if(scope<0)throw new Error(`[F60.94.19] ${label} scope marker not found`);
  const start=app.indexOf(startNeedle,scope);
  if(start<0)throw new Error(`[F60.94.19] ${label} start not found`);
  const end=app.indexOf(endNeedle,start);
  if(end<0)throw new Error(`[F60.94.19] ${label} end not found`);
  app=app.slice(0,start)+replacement.trimEnd()+'\n'+app.slice(end);
}

/*
 * F60.94.10 already solved the original Android ordering race correctly:
 * it waits until menu items 1-7 exist, then installs item 8 and the canonical
 * order exactly once. F60.94.14 later reintroduced a MutationObserver,
 * pointer/touch/click menu-open hooks, many reorder timers and a 2-second
 * interval. Disable that second menu owner completely. Keep only the public
 * compatibility API, delegated to the ready-once owner and the current hub.
 */
const drawerCompat=`/* AT AI Mobil - V16.9.1F60.94.19 static drawer compatibility */
(()=>{
'use strict';
const VERSION='STATIC-DRAWER-COMPAT-V16.9.1F60.94.19';
window.__AT_FINAL_DRAWER_ORDER_F609414__=true;
function apply(){try{return window.ATReadyOnceMenuF609410?.install?.()??false}catch{return false}}
function openMaintenance(){
 try{const hub=window.ATArchiveHubMenu8F609418;if(typeof hub?.open==='function')return hub.open()}catch{}
 try{const door=window.ATTrackMaintenanceRealDoorF609416;if(typeof door?.open==='function')return door.open()}catch{}
 return false;
}
window.ATFinalDrawerOrderF609414={version:VERSION,apply,openMaintenance};
console.info('[AT AI]',VERSION,'active - F60.94.10 ready-once drawer is the only menu-order owner.');
})();`;
replaceIife('/* AT AI Mobil - V16.9.1F60.94.14 hard drawer rebuild + maintenance fallback */',drawerCompat,'F60.94.14 repeated drawer guard');

/*
 * Menu 8 no longer needs document-wide capture listeners. Bind only the actual
 * button. If the unified archive hub is present, let it own the click; otherwise
 * open the real maintenance door directly. A short bounded readiness poll does
 * not mutate the drawer and stops as soon as the button exists.
 */
const doorMarker='/* AT AI Mobil - V16.9.1F60.94.16 real Pist/Bakim/Hava archive door */';
replaceScoped(doorMarker,'function bindButton(){','async function refreshMeta',`function bindButton(){
 const b=$('trackMaintenanceMenuBtnF60944');if(!b)return false;
 b.onclick=e=>{
  e?.preventDefault?.();e?.stopPropagation?.();
  try{const hub=window.ATArchiveHubMenu8F609418;if(typeof hub?.open==='function'){hub.open();return false}}catch{}
  openPanel();return false;
 };
 b.dataset.realTrackDoorVersion=VERSION;
 b.dataset.directMenu8Only='F60.94.19';
 return true;
}
`,'F60.94.16 menu-8 direct bind');
replaceScoped(doorMarker,'function start(){','if(document.readyState===',`function start(){
 ensureStyle();
 installProgressListener();
 installAnalysisBridge();
 let attempts=0;
 const bindWhenReady=()=>{
  if(bindButton())return;
  attempts+=1;
  if(attempts<80)setTimeout(bindWhenReady,100);
 };
 bindWhenReady();
}
`,'F60.94.16 global capture/timer start');

/*
 * The hub used to observe document.documentElement continuously so it could
 * notice the maintenance panel being created. Instead, menu 8 now calls hub.open
 * directly; open() creates the real door and upgrades it immediately. No global
 * MutationObserver and no repeated menu rewrite timers are required.
 */
const hubMarker='/* AT AI Mobil - V16.9.1F60.94.18 unified menu 8: real race results + track/maintenance/weather */';
replaceScoped(hubMarker,'function install(){','if(document.readyState===',`function install(){
 ensureStyle();
 hideLegacyRealSection();
 upgradePanel();
 let attempts=0;
 const bindHubWhenReady=()=>{
  const b=$('trackMaintenanceMenuBtnF60944');
  if(b){
   markMenu();
   b.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();open();return false};
   b.dataset.archiveHubDirectBind='F60.94.19';
   return;
  }
  attempts+=1;
  if(attempts<80)setTimeout(bindHubWhenReady,100);
 };
 bindHubWhenReady();
 window.addEventListener('at-ai:annual-archive-open',()=>setTimeout(hideLegacyRealSection,0));
}
`,'F60.94.18 document observer/timer install');

for(const bad of[
 'drawer.__AT_FINAL_DRAWER_OBSERVER_F609414__=new MutationObserver',
 "for(const type of['pointerup','touchend','click'])document.addEventListener(type,interceptMaintenanceTap,true)",
 'observer.observe(document.documentElement,{childList:true,subtree:true})',
 "setInterval(()=>{installPreviewChromeGuard();if($('drawer')?.classList.contains('open'))applyFinalOrder('open-interval')},2000)"
])if(app.includes(bad))throw new Error('[F60.94.19] forbidden reactive drawer loop survived: '+bad);
for(const token of[
 'READY-ONCE-MENU-V16.9.1F60.94.10',
 'STATIC-DRAWER-COMPAT-V16.9.1F60.94.19',
 "directMenu8Only='F60.94.19'",
 "archiveHubDirectBind='F60.94.19'",
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 '8. Gerçek Yarış Arşivi + Pist / Bakım / Hava',
 'KOSU_SORGULAMA_REAL_ARCHIVE',
 'DEGREE-SPEED-TOP5-V16.9.1F60.94.5'
])if(!app.includes(token))throw new Error('[F60.94.19] final bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692960');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692960'))throw new Error('[F60.94.19] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.19 build complete: ready-once drawer restored; menu 8 direct-bound; reactive reorder/capture loops removed.');
