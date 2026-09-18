/* AT AI Mobil — V16.9.1F60.94.9 one-shot static analysis menu
   - Exactly one menu owner.
   - No MutationObserver, pageshow/visibility/menu-click repair loop, or recurring rebind timer.
   - Preserves existing 1-7 DOM nodes and click handlers; creates menu 8 once at its final position.
   - Opens Pist/Bakım/Hava directly and listens to the F60.94.8 progress event.
*/
(()=>{
'use strict';
if(window.__AT_ONE_SHOT_MENU_F60949__) return;
window.__AT_ONE_SHOT_MENU_F60949__=true;
const VERSION='ONE-SHOT-MENU-V16.9.1F60.94.9';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let installed=false;
let attempts=0;
let progressBound=false;

function findButton(drawer,re){return [...(drawer?.querySelectorAll('button')||[])].find(b=>re.test(clean(b.textContent)))||null}
function setLabel(btn,label){if(!btn)return;if(clean(btn.textContent)!==label)btn.textContent=label;btn.style.display='';btn.removeAttribute('aria-hidden')}
function neutralizeLegacy(){
  try{
    const g=window.ATProgramWorkflowGuideV661?.applyMenu;
    if(g){window.removeEventListener('pageshow',g);window.removeEventListener('load',g)}
    if(window.ATProgramWorkflowGuideV661)window.ATProgramWorkflowGuideV661.applyMenu=()=>false;
  }catch{}
  try{
    const f=window.ATDrawerMenuNumberingV1682?.fix;
    if(f){window.removeEventListener('pageshow',f);window.removeEventListener('load',f)}
    if(window.ATDrawerMenuNumberingV1682)window.ATDrawerMenuNumberingV1682.fix=()=>false;
  }catch{}
  try{if(window.ATStableAnalysisMenuF60944)window.ATStableAnalysisMenuF60944.apply=()=>false}catch{}
  try{if(window.ATMenuAuthorityGuardF60946)window.ATMenuAuthorityGuardF60946.repair=()=>false}catch{}
}
function closeDrawer(){
  try{window.closeDrawer?.()}catch{}
  try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}
}
function ensureStyle(){
  if($('tmQuickStyleF60949'))return;
  const s=document.createElement('style');s.id='tmQuickStyleF60949';s.textContent=`#tmQuickDialogF60949{width:min(94vw,720px);max-height:92vh;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;padding:0;overflow:hidden}#tmQuickDialogF60949::backdrop{background:rgba(0,0,0,.7)}.tmq49-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #21384b}.tmq49-body{padding:16px;overflow:auto;max-height:78vh}.tmq49-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tmq49-body input,.tmq49-body button{width:100%;box-sizing:border-box}.tmq49-body input{margin-top:5px;min-height:44px;background:#081a2a;color:#eef7ff;border:1px solid #31506a;border-radius:10px;padding:8px 10px}.tmq49-body button{min-height:46px;margin-top:9px;border-radius:11px}.tmq49-bar{height:6px;background:rgba(255,255,255,.09);border-radius:99px;overflow:hidden;margin-top:10px}.tmq49-bar>i{display:block;height:100%;width:0;background:currentColor;opacity:.7;transition:width .2s}.tmq49-status{font-size:12px;line-height:1.5;margin-top:9px}`;document.head.appendChild(s)
}
function ensureDialog(){
  let d=$('tmQuickDialogF60949');if(d)return d;ensureStyle();const y=new Date().getFullYear();
  d=document.createElement('dialog');d.id='tmQuickDialogF60949';d.innerHTML=`<div class="tmq49-head"><div><div style="font-size:11px;font-weight:900;letter-spacing:.11em;color:#72d5ff">AT AI ARŞİV</div><h2 style="margin:4px 0 0">Pist / Bakım / Hava Arşivi</h2></div><button id="tmQuickCloseF60949" type="button" style="width:44px;min-height:44px;border:0;background:#15314a;color:white;font-size:22px">✕</button></div><div class="tmq49-body"><div style="font-size:12px;line-height:1.55;opacity:.82">Yalnız Pist/Bakım/Hava verisini yönetir. Yıllık Yarış Arşivi açılmaz. Gerçek ilerleme aşağıda canlı gösterilir.</div><div class="tmq49-grid" style="margin-top:12px"><label>Başlangıç yılı<input id="tmQuickFromF60949" type="number" inputmode="numeric" min="1800" max="9999" step="1" value="${Math.max(1800,y-5)}"></label><label>Bitiş yılı<input id="tmQuickToF60949" type="number" inputmode="numeric" min="1800" max="9999" step="1" value="${y}"></label></div><button id="tmQuickBackfillF60949" class="primary" type="button">Seçili Yılları Bir Kez İndir</button><button id="tmQuickNowF60949" type="button">Bugüne Kadar Eksikleri Güncelle</button><div class="tmq49-bar"><i id="tmQuickBarF60949"></i></div><div id="tmQuickStatusF60949" class="tmq49-status">Hazır.</div></div>`;
  document.body.appendChild(d);
  $('tmQuickCloseF60949').onclick=()=>d.close();
  $('tmQuickBackfillF60949').onclick=()=>void runBackfill();
  $('tmQuickNowF60949').onclick=()=>void runNow();
  bindProgress();return d
}
function setBusy(on,text=''){for(const id of['tmQuickBackfillF60949','tmQuickNowF60949']){const b=$(id);if(b)b.disabled=!!on}if(text&&$('tmQuickStatusF60949'))$('tmQuickStatusF60949').textContent=text}
function applyProgress(detail={}){const s=$('tmQuickStatusF60949'),b=$('tmQuickBarF60949');if(s&&detail.text)s.textContent=String(detail.text);if(b&&detail.pct!==null&&detail.pct!==undefined)b.style.width=`${Math.max(0,Math.min(100,Number(detail.pct)||0))}%`}
function bindProgress(){if(progressBound)return;progressBound=true;window.addEventListener('at-ai:track-maintenance-status',e=>applyProgress(e.detail||{}),{passive:true})}
async function runBackfill(){
  const api=window.ATTrackMaintenanceV1;if(!api?.backfillYears){setBusy(false,'Pist bakım motoru hazır değil.');return}
  if(api.isBusy?.()){setBusy(false,'Pist/Bakım/Hava güncellemesi zaten çalışıyor. Mevcut işlem tamamlanınca yeniden deneyin.');return}
  const a=$('tmQuickFromF60949')?.value,b=$('tmQuickToF60949')?.value;setBusy(true,`${a}–${b} pist/bakım/hava arşivi hazırlanıyor…`);
  try{await api.backfillYears(a,b);if($('tmQuickStatusF60949'))$('tmQuickStatusF60949').textContent='Tamamlandı.';if($('tmQuickBarF60949'))$('tmQuickBarF60949').style.width='100%'}catch(e){$('tmQuickStatusF60949').textContent='Hata: '+(e?.message||e)}finally{setBusy(false)}
}
async function runNow(){
  const api=window.ATTrackMaintenanceV1;if(!api?.autoSync){setBusy(false,'Pist bakım motoru hazır değil.');return}
  if(api.isBusy?.()){setBusy(false,'Pist/Bakım/Hava güncellemesi zaten çalışıyor. Mevcut işlem tamamlanınca yeniden deneyin.');return}
  let date='';try{date=(typeof state!=='undefined'&&state?.date)||$('raceDate')?.value||new Date().toISOString().slice(0,10)}catch{date=new Date().toISOString().slice(0,10)}
  setBusy(true,`${date} tarihine kadar eksikler güncelleniyor…`);try{await api.autoSync(date)}catch(e){$('tmQuickStatusF60949').textContent='Hata: '+(e?.message||e)}finally{setBusy(false)}
}
function openMaintenance(){closeDrawer();const d=ensureDialog();if(!d.open)d.showModal();return true}
function install(){
  if(installed)return true;neutralizeLegacy();const drawer=$('drawer');if(!drawer)return false;
  const guide=$('programGuideBtnV661')||findButton(drawer,/Kullanım Talimatı/i);
  const current=drawer.querySelector('[data-view="current"]');
  const career=drawer.querySelector('[data-view="career"]');
  const calibration=drawer.querySelector('[data-view="calibration"]');
  const scenario=drawer.querySelector('[data-view="scenario"]');
  const coupon=$('couponMenuBtn');
  const annual=$('annualArchiveBtn')||findButton(drawer,/Yıllık Yarış Arşivi|TJK Yıllık Yarış Arşivi/i);
  if(!guide||!current||!career||!calibration||!scenario||!coupon||!annual)return false;
  let maintenance=$('trackMaintenanceMenuBtnF60944');
  if(maintenance)maintenance.remove();
  maintenance=document.createElement('button');maintenance.id='trackMaintenanceMenuBtnF60944';maintenance.type='button';maintenance.textContent='8. Pist / Bakım / Hava Arşivi';maintenance.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openMaintenance()});
  setLabel(guide,'1. Kullanım Talimatı');setLabel(current,'2. Güncel Analiz');setLabel(career,'3. Kariyer Yol Haritası');setLabel(calibration,'4. Model Kalibrasyonu');setLabel(scenario,'5. Koşu Senaryosu');setLabel(coupon,'6. Kupon Oluştur');setLabel(annual,'7. Yıllık Yarış Arşivi');
  const note=drawer.querySelector('.drawer-note');const ordered=[guide,current,career,calibration,scenario,coupon,annual,maintenance];for(const node of ordered){if(note)drawer.insertBefore(node,note);else drawer.appendChild(node)}
  const exportBtn=$('careerExportMenuBtn');if(exportBtn){exportBtn.style.display='none';exportBtn.setAttribute('aria-hidden','true')}
  if(note)note.textContent='Sabit sıra: Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon. Arşiv ve Pist/Bakım/Hava verileri ayrı menülerden yönetilir.';
  drawer.dataset.oneShotMenuVersion=VERSION;installed=true;window.__AT_ONE_SHOT_MENU_INSTALLED_F60949__=true;console.info('[AT AI]',VERSION,'installed once — no menu repair loop.');return true
}
function boot(){if(install())return;if(++attempts>=60){console.warn('[AT AI]',VERSION,'menu prerequisites not ready after bounded startup retries');return}setTimeout(boot,100)}
neutralizeLegacy();boot();
window.ATOneShotMenuF60949={version:VERSION,install:()=>installed||install(),openMaintenance};
})();
