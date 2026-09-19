/* AT AI Mobil - V16.9.1F60.94.19 one-shot drawer stabilizer */
(()=>{
'use strict';
if(window.__AT_DRAWER_ONE_SHOT_F609419__)return;
window.__AT_DRAWER_ONE_SHOT_F609419__=true;
const VERSION='DRAWER-ONE-SHOT-V16.9.1F60.94.19';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let attempts=0,installed=false;
function findButton(drawer,re){return [...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null}
function setLabel(btn,label,order){if(!btn)return;btn.textContent=label;btn.style.display='';btn.style.visibility='';btn.style.pointerEvents='';btn.style.order=String(order);btn.removeAttribute('aria-hidden')}
function install(){
 if(installed)return true;
 const drawer=$('drawer');if(!drawer)return false;
 const guide=$('programGuideBtnV661')||findButton(drawer,/Kullanım Talimatı/i);
 const current=drawer.querySelector('[data-view="current"]')||findButton(drawer,/Güncel Analiz/i);
 const career=drawer.querySelector('[data-view="career"]')||findButton(drawer,/Kariyer Yol Haritası/i);
 const calibration=drawer.querySelector('[data-view="calibration"]')||findButton(drawer,/Model Kalibrasyonu/i);
 const scenario=drawer.querySelector('[data-view="scenario"]')||findButton(drawer,/Koşu Senaryosu/i);
 const coupon=$('couponMenuBtn')||findButton(drawer,/Kupon Oluştur/i);
 const annual=$('annualArchiveBtn')||findButton(drawer,/Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i);
 let maintenance=$('trackMaintenanceMenuBtnF60944')||findButton(drawer,/Gerçek Yarış Arşivi|Pist\s*\/\s*Bakım\s*\/\s*Hava/i);
 if(!guide||!current||!career||!calibration||!scenario||!coupon||!annual)return false;
 if(!maintenance){maintenance=document.createElement('button');maintenance.id='trackMaintenanceMenuBtnF60944';maintenance.type='button'}
 maintenance.id='trackMaintenanceMenuBtnF60944';maintenance.type='button';
 maintenance.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();try{if(window.ATArchiveHubMenu8F609418?.open?.())return}catch(err){console.warn('[AT AI]',VERSION,'archive hub open failed',err)}try{window.ATTrackMaintenanceRealDoorF609416?.open?.()}catch{}};
 setLabel(guide,'1. Kullanım Talimatı',1);setLabel(current,'2. Güncel Analiz',2);setLabel(career,'3. Kariyer Yol Haritası',3);setLabel(calibration,'4. Model Kalibrasyonu',4);setLabel(scenario,'5. Koşu Senaryosu',5);setLabel(coupon,'6. Kupon Oluştur',6);setLabel(annual,'7. Yıllık Yarış Arşivi',7);setLabel(maintenance,'8. Gerçek Yarış Arşivi + Pist / Bakım / Hava',8);
 const head=drawer.querySelector('.drawer-head');const note=drawer.querySelector('.drawer-note');
 const ordered=[guide,current,career,calibration,scenario,coupon,annual,maintenance];
 for(const node of ordered){if(note)drawer.insertBefore(node,note);else drawer.appendChild(node)}
 if(head&&drawer.firstElementChild!==head)drawer.insertBefore(head,drawer.firstElementChild);
 if(note){note.style.order='9';note.style.display='none'}
 const exportBtn=$('careerExportMenuBtn');if(exportBtn){exportBtn.style.display='none';exportBtn.style.pointerEvents='none';exportBtn.setAttribute('aria-hidden','true')}
 drawer.dataset.drawerOneShotVersion=VERSION;installed=true;
 console.info('[AT AI]',VERSION,'installed once - no drawer observer/timer/rebuild loop.');
 return true;
}
function boot(){if(install())return;if(++attempts>=80){console.warn('[AT AI]',VERSION,'drawer prerequisites not ready');return}setTimeout(boot,100)}
boot();
window.ATDrawerOneShotF609419={version:VERSION,install:()=>installed||install()};
})();
