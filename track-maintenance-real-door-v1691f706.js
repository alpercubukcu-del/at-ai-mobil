/* AT AI Mobil - V16.9.1F60.94.15 real Pist/Bakim/Hava door + analysis bridge */
(()=>{
'use strict';
if(window.__AT_TRACK_MAINT_REAL_DOOR_F609415__)return;
window.__AT_TRACK_MAINT_REAL_DOOR_F609415__=true;
const VERSION='TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.15';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastOpenAt=0;
let analysisBridgeInstalled=false;

function currentYear(){return new Date().getFullYear()}
function getDate(){try{return (typeof state!=='undefined'&&state?.date)||$('raceDate')?.value||new Date().toISOString().slice(0,10)}catch{return new Date().toISOString().slice(0,10)}}
function getCity(){try{return (typeof getCityName==='function'&&getCityName())||$('citySelect')?.selectedOptions?.[0]?.textContent||$('citySelect')?.value||''}catch{return''}}
function closeDrawer(){try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}

function ensureStyle(){
 if($('tmRealDoorStyleF609415'))return;
 const s=document.createElement('style');
 s.id='tmRealDoorStyleF609415';
 s.textContent=`
  #tmRealDoorF609415{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:2147482400;display:none;align-items:flex-start;justify-content:center;padding:4vh 12px;box-sizing:border-box}
  #tmRealDoorF609415.open{display:flex}
  .tmr-panel{width:min(94vw,740px);max-height:92vh;overflow:hidden;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;box-shadow:0 20px 70px rgba(0,0,0,.55)}
  .tmr-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #21384b;background:#071522}
  .tmr-body{padding:16px;overflow:auto;max-height:78vh}.tmr-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .tmr-body input,.tmr-body button{width:100%;box-sizing:border-box}.tmr-body input{margin-top:5px;min-height:44px;background:#081a2a;color:#eef7ff;border:1px solid #31506a;border-radius:10px;padding:8px 10px}
  .tmr-body button{min-height:46px;margin-top:9px;border-radius:11px}.tmr-close{width:44px;min-height:44px;margin:0;border:0;background:#15314a;color:white;font-size:22px;border-radius:12px}
  .tmr-note,.tmr-status{font-size:12px;line-height:1.55;opacity:.84}.tmr-status{margin-top:9px;white-space:pre-wrap}.tmr-bar{height:6px;background:rgba(255,255,255,.09);border-radius:99px;overflow:hidden;margin-top:10px}.tmr-bar>i{display:block;height:100%;width:0;background:#72d5ff;transition:width .2s}
 `;
 document.head.appendChild(s);
}
function ensurePanel(){
 ensureStyle();
 let d=$('tmRealDoorF609415');
 if(d)return d;
 const y=currentYear();
 d=document.createElement('div');
 d.id='tmRealDoorF609415';
 d.setAttribute('role','dialog');
 d.setAttribute('aria-modal','true');
 d.innerHTML=`<div class="tmr-panel"><div class="tmr-head"><div><div style="font-size:11px;font-weight:900;letter-spacing:.11em;color:#72d5ff">AT AI ARSIV</div><h2 style="margin:4px 0 0">Pist / Bakim / Hava Arsivi</h2></div><button id="tmRealCloseF609415" type="button" class="tmr-close">x</button></div><div class="tmr-body"><div class="tmr-note">Bu panel dogrudan gercek Pist/Bakim/Hava motoruna baglidir. Indirilen veri derece-hiz analizinde kullanilir.</div><div class="tmr-grid" style="margin-top:12px"><label>Baslangic yili<input id="tmRealFromF609415" type="number" inputmode="numeric" min="1800" max="9999" step="1" value="${Math.max(1800,y-5)}"></label><label>Bitis yili<input id="tmRealToF609415" type="number" inputmode="numeric" min="1800" max="9999" step="1" value="${y}"></label></div><button id="tmRealBackfillF609415" class="primary" type="button">Secili Yillari Indir</button><button id="tmRealNowF609415" type="button">Bugune Kadar Eksikleri Guncelle</button><button id="tmRealApplyF609415" type="button">Guncel Analize Yeniden Uygula</button><div class="tmr-bar"><i id="tmRealBarF609415"></i></div><div id="tmRealStatusF609415" class="tmr-status">Hazir.</div><div id="tmRealMetaF609415" class="tmr-status"></div></div></div>`;
 document.body.appendChild(d);
 $('tmRealCloseF609415').onclick=closePanel;
 d.addEventListener('click',e=>{if(e.target===d)closePanel()});
 $('tmRealBackfillF609415').onclick=()=>void runBackfill();
 $('tmRealNowF609415').onclick=()=>void runNow();
 $('tmRealApplyF609415').onclick=()=>void applyToCurrentAnalysis(true);
 return d;
}
function setStatus(text,pct=null){
 const s=$('tmRealStatusF609415');if(s)s.textContent=text||'Hazir.';
 const b=$('tmRealBarF609415');if(b&&pct!==null)b.style.width=`${Math.max(0,Math.min(100,Number(pct)||0))}%`;
 try{window.ATTrackMaintenanceProgressF60948?.apply?.({text,pct})}catch{}
}
function setBusy(on,text){
 for(const id of['tmRealBackfillF609415','tmRealNowF609415','tmRealApplyF609415']){const b=$(id);if(b)b.disabled=!!on}
 if(text)setStatus(text);
}
async function getApi(waitMs=4000){
 const started=Date.now();
 while(Date.now()-started<waitMs){
  if(window.ATTrackMaintenanceV1)return window.ATTrackMaintenanceV1;
  await new Promise(r=>setTimeout(r,100));
 }
 return window.ATTrackMaintenanceV1||null;
}
function openPanel(){
 const now=Date.now();
 closeDrawer();
 const d=ensurePanel();
 d.classList.add('open');
 d.removeAttribute('aria-hidden');
 if(now-lastOpenAt>400)refreshMeta();
 lastOpenAt=now;
 return true;
}
function closePanel(){const d=$('tmRealDoorF609415');if(d){d.classList.remove('open');d.setAttribute('aria-hidden','true')}}
function isMaintenanceButton(target){
 const b=target?.closest?.('button');
 return b&&(b.id==='trackMaintenanceMenuBtnF60944'||/Pist\s*\/\s*Bakim\s*\/\s*Hava|Pist\s*\/\s*Bakım\s*\/\s*Hava/i.test(clean(b.textContent)));
}
function interceptMaintenanceTap(e){
 if(!isMaintenanceButton(e.target))return;
 e.preventDefault?.();
 e.stopPropagation?.();
 e.stopImmediatePropagation?.();
 openPanel();
}
function bindButton(){
 const b=$('trackMaintenanceMenuBtnF60944');
 if(!b)return false;
 b.onclick=e=>{interceptMaintenanceTap(e);return false};
 b.dataset.realTrackDoorVersion=VERSION;
 return true;
}
async function refreshMeta(){
 const api=await getApi(900);
 const meta=$('tmRealMetaF609415');
 if(!meta)return;
 if(!api){meta.textContent='Pist/Bakim/Hava motoru yukleniyor...';return}
 const date=getDate(),city=getCity();
 let line=`Tarih: ${date||'-'} · Sehir: ${city||'-'}`;
 try{
  if(date&&city&&api.get){
   const rec=await api.get(date,city);
   line+=rec?`\nBugun icin kayit var: ${rec.source||rec.city||city} ${rec.date||date}`:'\nBugun icin kesin kayit henuz yok. Guncelle dugmesi son eksikleri indirir.';
  }
  if(api.isBusy?.())line+='\nDurum: Arka planda islem calisiyor.';
 }catch(e){line+='\nDurum okunamadi: '+(e?.message||e)}
 meta.textContent=line;
}
async function runBackfill(){
 const api=await getApi();
 if(!api?.backfillYears){setStatus('Pist/Bakim/Hava motoru hazir degil.',0);return}
 const a=$('tmRealFromF609415')?.value,b=$('tmRealToF609415')?.value;
 setBusy(true,`${a}-${b} Pist/Bakim/Hava arsivi indiriliyor...`);
 try{
  await api.backfillYears(a,b);
  setBusy(false,'Indirme tamamlandi. Veri analize yeniden uygulanabilir.',100);
  await refreshMeta();
  await applyToCurrentAnalysis(false);
 }catch(e){setBusy(false,'Hata: '+(e?.message||e),0)}
}
async function runNow(){
 const api=await getApi();
 if(!api?.autoSync){setStatus('Pist/Bakim/Hava motoru hazir degil.',0);return}
 const date=getDate();
 setBusy(true,`${date} tarihine kadar eksikler guncelleniyor...`);
 try{
  await api.autoSync(date);
  setBusy(false,'Guncelleme tamamlandi. Veri analize yeniden uygulanabilir.',100);
  await refreshMeta();
  await applyToCurrentAnalysis(false);
 }catch(e){setBusy(false,'Hata: '+(e?.message||e),0)}
}
async function ensureTrackBeforeAnalysis(){
 const api=await getApi(1000);
 if(!api||api.isBusy?.())return false;
 const date=getDate(),city=getCity();
 if(!date||!city)return false;
 try{
  const rec=api.get?await api.get(date,city):null;
  if(rec)return true;
  setStatus('Analiz oncesi Pist/Bakim/Hava son eksikleri kontrol ediliyor...',25);
  await api.autoSync?.(date);
  return true;
 }catch(e){console.warn('[AT AI]',VERSION,'analysis pre-sync:',e);return false}
}
async function applyToCurrentAnalysis(userVisible=false){
 try{
  if(userVisible)setBusy(true,'Pist/Bakim/Hava verisi guncel analize uygulanıyor...');
  if(window.ATDegreeSpeedF6090?.enrichCurrent)await window.ATDegreeSpeedF6090.enrichCurrent();
  if(window.ATDegreeSpeedSurfaceF6091?.recalc)await window.ATDegreeSpeedSurfaceF6091.recalc();
  if(typeof gRenderCurrentV1657==='function'&&typeof state!=='undefined'&&state?.analyses?.current)gRenderCurrentV1657(state.analyses.current,$('analysisRace')?.value||'all');
  if(userVisible)setBusy(false,'Uygulandi. Derece-Hiz bolumunde pist/bakim/hava etkisi guncellendi.',100);
  return true;
 }catch(e){
  if(userVisible)setBusy(false,'Analize uygulama hatasi: '+(e?.message||e),0);
  console.warn('[AT AI]',VERSION,'apply analysis:',e);
  return false;
 }
}
function installAnalysisBridge(){
 if(analysisBridgeInstalled)return;
 analysisBridgeInstalled=true;
 try{
  if(typeof gRunCurrentV1657==='function'&&!gRunCurrentV1657.__trackMaintRealDoorF609415){
   const before=gRunCurrentV1657;
   const wrapped=async function(...args){
    await ensureTrackBeforeAnalysis();
    const out=await before.apply(this,args);
    await applyToCurrentAnalysis(false);
    return out;
   };
   wrapped.__trackMaintRealDoorF609415=true;
   gRunCurrentV1657=wrapped;
  }
 }catch(e){console.warn('[AT AI]',VERSION,'analysis bridge install:',e)}
}
function start(){
 ensureStyle();
 bindButton();
 installAnalysisBridge();
 for(const type of['pointerup','touchend','click'])document.addEventListener(type,interceptMaintenanceTap,true);
 document.addEventListener('click',e=>{if(e.target?.closest?.('#menuBtn'))setTimeout(bindButton,0)},true);
 for(const ms of[0,120,500,1200,2500])setTimeout(()=>{bindButton();installAnalysisBridge()},ms);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ATTrackMaintenanceRealDoorF609415={version:VERSION,open:openPanel,bind:bindButton,ensureTrackBeforeAnalysis,applyToCurrentAnalysis};
console.info('[AT AI]',VERSION,'active - real maintenance archive door and analysis bridge installed.');
})();
