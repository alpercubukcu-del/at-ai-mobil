const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f711.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.21] F60.94.20 base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/*
 * F60.94.21 is the last, non-reactive drawer owner.
 * A legacy archive menu writer can still run during the hamburger click and
 * relabel/reorder the drawer after F60.94.20's capture-phase check. Therefore
 * canonicalize once at the END of the same click event (document bubble phase).
 * No MutationObserver, interval or continuous repair loop is used.
 *
 * Menu 8 is handled by a drawer-local delegated capture listener so a legacy
 * node replacement or onclick overwrite cannot make it inert.
 */
const finalOwner=`/* AT AI Mobil - V16.9.1F60.94.21 final drawer owner */
(()=>{
'use strict';
if(window.__AT_FINAL_DRAWER_OWNER_F609421__)return;
window.__AT_FINAL_DRAWER_OWNER_F609421__=true;
const VERSION='FINAL-DRAWER-OWNER-V16.9.1F60.94.21';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\\s+/g,' ').trim();
const textBtn=(drawer,re)=>[...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null;
function refs(){
 const drawer=$('drawer');if(!drawer)return null;
 const guide=$('programGuideBtnV661')||textBtn(drawer,/Kullanım Talimatı/i);
 const current=drawer.querySelector('[data-view="current"]')||textBtn(drawer,/Güncel Analiz/i);
 const career=drawer.querySelector('[data-view="career"]')||textBtn(drawer,/Kariyer Yol Haritası/i);
 const calibration=drawer.querySelector('[data-view="calibration"]')||textBtn(drawer,/Model Kalibrasyonu/i);
 const scenario=drawer.querySelector('[data-view="scenario"]')||textBtn(drawer,/Koşu Senaryosu/i);
 const coupon=$('couponMenuBtn')||textBtn(drawer,/Kupon Oluştur/i);
 const archive=$('annualArchiveBtn')||textBtn(drawer,/Günlük Veri Arşivi|Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i);
 const maintenance=$('trackMaintenanceMenuBtnF60944')||textBtn(drawer,/Gerçek Yarış Arşivi.*Pist.*Bakım.*Hava|Pist\s*\/\s*Bakım\s*\/\s*Hava/i);
 return {drawer,guide,current,career,calibration,scenario,coupon,archive,maintenance};
}
function label(btn,text){if(btn&&clean(btn.textContent)!==text)btn.textContent=text}
function canonicalize(reason='manual'){
 const r=refs();
 if(!r||![r.guide,r.current,r.career,r.calibration,r.scenario,r.coupon,r.archive,r.maintenance].every(Boolean))return false;
 label(r.guide,'1. Kullanım Talimatı');
 label(r.current,'2. Güncel Analiz');
 label(r.career,'3. Kariyer Yol Haritası');
 label(r.calibration,'4. Model Kalibrasyonu');
 label(r.scenario,'5. Koşu Senaryosu');
 label(r.coupon,'6. Kupon Oluştur');
 label(r.archive,'7. Günlük Veri Arşivi');
 label(r.maintenance,'8. Gerçek Yarış Arşivi + Pist / Bakım / Hava');
 const note=r.drawer.querySelector('.drawer-note');
 const ordered=[r.guide,r.current,r.career,r.calibration,r.scenario,r.coupon,r.archive,r.maintenance];
 for(const node of ordered){node.style.display='';node.removeAttribute('aria-hidden');if(note)r.drawer.insertBefore(node,note);else r.drawer.appendChild(node)}
 if(note)note.textContent='Sabit sıra: Kullanım Talimatı → Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon → Günlük Veri Arşivi → Gerçek Yarış Arşivi + Pist/Bakım/Hava.';
 r.drawer.dataset.finalDrawerOwner=VERSION;
 r.drawer.dataset.finalDrawerReason=reason;
 return true;
}
function closeDrawer(){try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}
function openMenu8(){
 closeDrawer();
 try{const hub=window.ATArchiveHubMenu8F609418;if(typeof hub?.open==='function'){const out=hub.open();if(out!==false)return true}}catch(e){console.warn('[AT AI]',VERSION,'archive hub open failed',e)}
 try{const compat=window.ATFinalDrawerOrderF609414;if(typeof compat?.openMaintenance==='function'){const out=compat.openMaintenance();if(out!==false)return true}}catch(e){console.warn('[AT AI]',VERSION,'compat open failed',e)}
 try{const door=window.ATTrackMaintenanceRealDoorF609416;if(typeof door?.open==='function'){door.open();return true}}catch(e){console.warn('[AT AI]',VERSION,'real door open failed',e)}
 return false;
}
function isMenu8Button(btn){if(!btn)return false;return btn.id==='trackMaintenanceMenuBtnF60944'||/Gerçek Yarış Arşivi.*Pist.*Bakım.*Hava|Pist\s*\/\s*Bakım\s*\/\s*Hava/i.test(clean(btn.textContent))}
function install(){
 const drawer=$('drawer');if(!drawer)return false;
 canonicalize('install');
 if(drawer.dataset.menu8DelegatedF609421!=='1'){
  drawer.dataset.menu8DelegatedF609421='1';
  drawer.addEventListener('click',e=>{
   const btn=e.target?.closest?.('button');
   if(!btn||!drawer.contains(btn)||!isMenu8Button(btn))return;
   e.preventDefault();e.stopImmediatePropagation();
   openMenu8();
  },true);
 }
 if(document.documentElement.dataset.finalMenuOpenF609421!=='1'){
  document.documentElement.dataset.finalMenuOpenF609421='1';
  document.addEventListener('click',e=>{
   if(!e.target?.closest?.('#menuBtn'))return;
   canonicalize('menu-click-final');
  },false);
 }
 window.ATFinalDrawerOwnerF609421={version:VERSION,apply:canonicalize,openMenu8};
 console.info('[AT AI]',VERSION,'active - one final order check per hamburger click; menu 8 uses drawer-local delegated click.');
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();`;
app+='\n\n'+finalOwner.trim()+'\n';
for(const bad of[
 'drawer.__AT_FINAL_DRAWER_OBSERVER_F609414__=new MutationObserver',
 "setInterval(()=>{installPreviewChromeGuard();if($('drawer')?.classList.contains('open'))applyFinalOrder('open-interval')},2000)"
])if(app.includes(bad))throw new Error('[F60.94.21] forbidden reactive drawer loop survived: '+bad);
for(const token of[
 'FINAL-DRAWER-OWNER-V16.9.1F60.94.21',
 "menu8DelegatedF609421!=='1'",
 "7. Günlük Veri Arşivi",
 "8. Gerçek Yarış Arşivi + Pist / Bakım / Hava",
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 'KOSU_SORGULAMA_REAL_ARCHIVE'
])if(!app.includes(token))throw new Error('[F60.94.21] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692962');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692962'))throw new Error('[F60.94.21] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.21 build complete: canonical 1-8 drawer and reliable delegated menu 8 open.');
