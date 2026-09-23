/* AT AI Mobil — V16.9.1F60.94.4 stable analysis drawer + track maintenance entry
   - Makes one final drawer order authoritative after legacy numbering overlays.
   - Restores direct access to Pist / Bakım / Hava Arşivi.
   - Reuses the existing F60.89 maintenance engine; no scoring/data formula changes.
*/
(()=>{
'use strict';
if(window.__AT_STABLE_ANALYSIS_MENU_F60944__) return;
window.__AT_STABLE_ANALYSIS_MENU_F60944__=true;

const VERSION='STABLE-ANALYSIS-MENU-V16.9.1F60.94.4';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const legacyGuideApply=window.ATProgramWorkflowGuideV661?.applyMenu || null;

function findButton(drawer,re){
  return [...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null;
}
function setLabel(btn,label){
  if(!btn) return;
  if(clean(btn.textContent)!==label) btn.textContent=label;
  btn.style.display='';
  btn.removeAttribute('aria-hidden');
}
function closeDrawerSafe(btn){
  try{btn?.blur?.()}catch{}
  try{if(typeof closeDrawer==='function'){closeDrawer();return}}catch{}
  try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}
}

function ensureMaintenanceFallbackDialog(){
  let d=$('trackMaintenanceDialogF60944');
  if(d) return d;
  d=document.createElement('dialog');
  d.id='trackMaintenanceDialogF60944';
  d.style.cssText='width:min(94vw,720px);max-height:92vh;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;padding:0;overflow:hidden';
  const current=new Date().getFullYear();
  d.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #21384b">
      <div><div style="font-size:11px;font-weight:900;letter-spacing:.11em;color:#72d5ff">AT AI ARŞİV</div><h2 style="margin:4px 0 0">Pist / Bakım / Hava Arşivi</h2></div>
      <button id="tmCloseF60944" type="button" style="border:0;border-radius:11px;background:#15314a;color:white;font-size:22px;width:44px;height:44px">✕</button>
    </div>
    <div style="padding:16px;overflow:auto;max-height:78vh">
      <div id="trackMaintenanceSectionF6089">
        <div style="font-size:12px;line-height:1.55;opacity:.8">TJK pist bilgileri ve bakım raporlarını telefona hazırlar. Sıcaklık, nem, basınç, gökyüzü, rüzgâr ve bakım kayıtları Derece-Hız modeline aktarılır.</div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:12px">
          <label style="font-size:12px">Başlangıç yılı<input id="tmFromF6089" type="number" inputmode="numeric" step="1" value="${Math.max(1800,current-5)}" style="width:100%;box-sizing:border-box;margin-top:5px"></label>
          <label style="font-size:12px">Bitiş yılı<input id="tmToF6089" type="number" inputmode="numeric" step="1" value="${current}" style="width:100%;box-sizing:border-box;margin-top:5px"></label>
        </div>
        <button id="tmBackfillF6089" class="primary" type="button" style="margin-top:10px;width:100%">Seçili Yılları Bir Kez İndir</button>
        <button id="tmNowF6089" type="button" style="margin-top:7px;width:100%">Bugüne Kadar Eksikleri Güncelle</button>
        <div style="height:6px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;margin-top:10px"><div id="tmBarF6089" style="height:100%;width:0;background:currentColor;opacity:.65"></div></div>
        <div id="tmStatusF6089" style="font-size:12px;line-height:1.5;opacity:.8;margin-top:7px">Hazır.</div>
        <div id="tmMetaF6089" style="font-size:12px;line-height:1.5;opacity:.75;margin-top:5px"></div>
      </div>
    </div>`;
  document.body.appendChild(d);
  $('tmCloseF60944').onclick=()=>d.close();
  $('tmBackfillF6089').onclick=async()=>{
    const api=window.ATTrackMaintenanceV1;
    if(!api?.backfillYears){$('tmStatusF6089').textContent='Pist bakım motoru hazır değil.';return;}
    try{await api.backfillYears($('tmFromF6089').value,$('tmToF6089').value)}catch(e){$('tmStatusF6089').textContent='Hata: '+(e?.message||e)}
  };
  $('tmNowF6089').onclick=async()=>{
    const api=window.ATTrackMaintenanceV1;
    if(!api?.autoSync){$('tmStatusF6089').textContent='Pist bakım motoru hazır değil.';return;}
    const date=(typeof state!=='undefined'&&state?.date)||new Date().toISOString().slice(0,10);
    try{await api.autoSync(date)}catch(e){$('tmStatusF6089').textContent='Hata: '+(e?.message||e)}
  };
  return d;
}

async function openMaintenance(btn){
  closeDrawerSafe(btn);
  let archiveOpened=false;
  try{
    if(window.ATAnnualArchiveMenuFixV1662?.open){archiveOpened=Boolean(await window.ATAnnualArchiveMenuFixV1662.open(btn));}
    else if(window.ATAnnualArchiveV13?.open){await Promise.resolve(window.ATAnnualArchiveV13.open());archiveOpened=true;}
  }catch{}

  for(let i=0;i<12;i++){
    const section=$('trackMaintenanceSectionF6089');
    if(section){
      try{section.scrollIntoView({behavior:'smooth',block:'start'})}catch{section.scrollIntoView()}
      return true;
    }
    await sleep(100);
  }

  if(archiveOpened){try{$('tjkAnnualArchiveDialog')?.close?.()}catch{}}
  const d=ensureMaintenanceFallbackDialog();
  if(!d.open) d.showModal();
  return true;
}

function ensureMaintenanceButton(drawer){
  let btn=$('trackMaintenanceMenuBtnF60944');
  if(!btn){
    btn=document.createElement('button');
    btn.id='trackMaintenanceMenuBtnF60944';
    btn.type='button';
    btn.onclick=()=>void openMaintenance(btn);
  }
  if(!drawer.contains(btn)) drawer.appendChild(btn);
  return btn;
}

function applyStableMenu(){
  const drawer=$('drawer');
  if(!drawer) return false;
  try{legacyGuideApply?.()}catch{}

  const guide=$('programGuideBtnV661')||findButton(drawer,/Kullanım Talimatı/i);
  const current=drawer.querySelector('[data-view="current"]')||findButton(drawer,/Güncel Analiz/i);
  const career=drawer.querySelector('[data-view="career"]')||findButton(drawer,/Kariyer Yol Haritası/i);
  const calibration=drawer.querySelector('[data-view="calibration"]')||findButton(drawer,/Model Kalibrasyonu/i);
  const scenario=drawer.querySelector('[data-view="scenario"]')||findButton(drawer,/Koşu Senaryosu/i);
  const coupon=$('couponMenuBtn')||findButton(drawer,/Kupon Oluştur/i);
  const annual=$('annualArchiveBtn')||findButton(drawer,/Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i);
  const maintenance=ensureMaintenanceButton(drawer);

  setLabel(guide,'1. Kullanım Talimatı');
  setLabel(current,'2. Güncel Analiz');
  setLabel(career,'3. Kariyer Yol Haritası');
  setLabel(calibration,'4. Model Kalibrasyonu');
  setLabel(scenario,'5. Günlük Koşu Kalibrasyonu');
  setLabel(coupon,'6. Kupon Oluştur');
  setLabel(annual,'7. Tarihsel Sonuç Arşivi');
  setLabel(maintenance,'8. Pist / Bakım / Hava Arşivi');

  const note=drawer.querySelector('.drawer-note');
  const ordered=[guide,current,career,calibration,scenario,coupon,annual,maintenance].filter(Boolean);
  for(const node of ordered){if(note)drawer.insertBefore(node,note);else drawer.appendChild(node)}
  if(note) note.textContent='Sabit sıra: Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon. Arşiv ve Pist/Bakım/Hava verileri ayrı menülerden yönetilir.';
  drawer.dataset.stableMenuVersion=VERSION;
  return true;
}

/* Disable known legacy pageshow/load renumberers when their function references are available. */
try{
  const old=window.ATDrawerMenuNumberingV1682?.fix;
  if(old){window.removeEventListener('load',old);window.removeEventListener('pageshow',old)}
  const guide=window.ATProgramWorkflowGuideV661?.applyMenu;
  if(guide) window.removeEventListener('pageshow',guide);
}catch{}

if(window.ATProgramWorkflowGuideV661) window.ATProgramWorkflowGuideV661.applyMenu=applyStableMenu;
if(window.ATDrawerMenuNumberingV1682) window.ATDrawerMenuNumberingV1682.fix=applyStableMenu;

/* MOBILE.CLEAN.5: label/order ownership moved to F60.94.24.
   Keep this module only as the maintenance API/fallback provider. */

window.ATStableAnalysisMenuF60944={version:VERSION,apply:applyStableMenu,openMaintenance};
console.info('[AT AI]',VERSION,'active — drawer labels fixed and track maintenance entry restored.');
})();
