/* AT AI Mobil - final canonical drawer V17.4.14 */
(()=>{
'use strict';
const VERSION='CANONICAL-DRAWER-V17.4.14',$=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let busy=false;
function find(re){return [...document.querySelectorAll('#drawer button')].find(b=>re.test(clean(b.textContent)))||null}
function close(){try{window.closeDrawer?.()}catch{}$('drawer')?.classList.remove('open');$('overlay')?.classList.remove('show');$('drawer')?.setAttribute('aria-hidden','true')}
function apply(){
 if(busy)return false;const d=$('drawer');if(!d)return false;busy=true;
 try{
  const head=d.querySelector('.drawer-head'),note=d.querySelector('.drawer-note');
  const guide=$('programGuideBtnV661')||find(/Kullanım Talimatı/i);
  const current=d.querySelector('[data-view="current"]')||find(/Güncel Analiz/i);
  const career=d.querySelector('[data-view="career"]')||find(/Kariyer Yol Haritası/i);
  const fogd=$('fogdCalibrationMenuBtn')||find(/FOGD Kalibrasyon Merkezi/i);
  const scenario=d.querySelector('[data-view="scenario"]')||find(/Günün Koşu Kalibrasyonu|Koşu Senaryosu/i);
  const coupon=$('couponMenuBtn')||find(/Kupon Oluştur/i);
  const annual=$('annualArchiveBtn')||find(/Tarihsel Sonuç Arşivi/i);
  const eight=$('archiveHubBtnF60943123')||$('trackMaintenanceMenuBtnF60944')||find(/Gerçek Yarış Arşivi|Pist \/ Bakım \/ Hava/i);
  const nine=find(/F\s*\/\s*O\s*\/\s*G\s*\/\s*D.*Toplam Puan/i);
  const rows=[[guide,'1. Kullanım Talimatı'],[current,'2. Güncel Analiz'],[career,'3. Kariyer Yol Haritası'],[fogd,'4. FOGD Kalibrasyon Merkezi'],[scenario,'5. Günün Koşu Kalibrasyonu'],[coupon,'6. Kupon Oluştur'],[annual,'7. Tarihsel Sonuç Arşivi'],[eight,'8. Gerçek Yarış Arşivi + Pist / Bakım / Hava'],[nine,'9. F / O / G / D Toplam Puan']];
  if(rows.some(x=>!x[0]))return false;
  fogd.onclick=e=>{e.preventDefault();e.stopPropagation();close();setTimeout(()=>window.ATFogdHistoryCalibrationF60943111?.open?.(),0)};
  for(const [b,label] of rows){b.textContent=label;b.style.setProperty('order',String(rows.indexOf(rows.find(x=>x[0]===b))+1),'important');b.hidden=false;b.style.removeProperty('display')}
  const desired=[head,...rows.map(x=>x[0]),note].filter(Boolean);
  if(desired.some((x,i)=>d.children[i]!==x))d.replaceChildren(...desired);
  d.dataset.canonicalDrawer=VERSION;return true;
 }finally{busy=false}
}
function schedule(){for(const ms of[0,50,180,500])setTimeout(apply,ms)}
document.addEventListener('click',e=>{if(e.target?.closest?.('#menuBtn'))schedule()},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.ATCanonicalDrawerV17414={version:VERSION,apply};
})();