/* AT AI Mobil - V16.9.1F60.94.16 real Pist/Bakim/Hava archive door */
(()=>{
'use strict';
if(window.__AT_TRACK_MAINT_REAL_DOOR_F609416__)return;
window.__AT_TRACK_MAINT_REAL_DOOR_F609416__=true;
const VERSION='TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let lastOpenAt=0;
let lastProgress={text:'Hazır.',pct:0};
let analysisBridgeInstalled=false;
let progressListenerInstalled=false;

function currentYear(){return new Date().getFullYear()}
function getDate(){try{return (typeof state!=='undefined'&&state?.date)||$('raceDate')?.value||new Date().toISOString().slice(0,10)}catch{return new Date().toISOString().slice(0,10)}}
function getCity(){try{return (typeof getCityName==='function'&&getCityName())||$('citySelect')?.selectedOptions?.[0]?.textContent||$('citySelect')?.value||''}catch{return''}}
function closeDrawer(){try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}
function progressFromText(text){const m=String(text||'').match(/(\d+)\s*\/\s*(\d+)\s*(?:sayfa|rapor)/i);if(!m)return null;const a=Number(m[1]),b=Number(m[2]);return b>0?Math.max(0,Math.min(100,Math.round(a/b*100))):null}

function ensureStyle(){
 if($('tmRealDoorStyleF609416'))return;
 const s=document.createElement('style');s.id='tmRealDoorStyleF609416';s.textContent=`
 #tmRealDoorF609416{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:2147482400;display:none;align-items:flex-start;justify-content:center;padding:4vh 12px;box-sizing:border-box}
 #tmRealDoorF609416.open{display:flex}.tmr416-panel{width:min(94vw,740px);max-height:92vh;overflow:hidden;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;box-shadow:0 20px 70px rgba(0,0,0,.55)}
 .tmr416-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #21384b}.tmr416-body{padding:16px;overflow:auto;max-height:78vh}.tmr416-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .tmr416-body input,.tmr416-body button{width:100%;box-sizing:border-box}.tmr416-body input{margin-top:5px;min-height:44px;background:#081a2a;color:#eef7ff;border:1px solid #31506a;border-radius:10px;padding:8px 10px}.tmr416-body button{min-height:46px;margin-top:9px;border-radius:11px}.tmr416-body button:disabled{opacity:.58}
 .tmr416-close{width:44px;min-height:44px;margin:0;border:0;background:#15314a;color:white;font-size:22px;border-radius:12px}.tmr416-note,.tmr416-status{font-size:12px;line-height:1.55}.tmr416-note{opacity:.84}.tmr416-status{margin-top:9px;white-space:pre-wrap;background:#0d2234;border-radius:10px;padding:10px 12px}.tmr416-bar{height:7px;background:rgba(255,255,255,.09);border-radius:99px;overflow:hidden;margin-top:10px}.tmr416-bar>i{display:block;height:100%;width:0;background:#72d5ff;transition:width .2s}
 `;document.head.appendChild(s);
}
function ensurePanel(){
 ensureStyle();let d=$('tmRealDoorF609416');if(d)return d;const y=currentYear();
 d=document.createElement('div');d.id='tmRealDoorF609416';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
 d.innerHTML=`<div class="tmr416-panel"><div class="tmr416-head"><div><div style="font-size:11px;font-weight:900;letter-spacing:.11em;color:#72d5ff">AT AI ARŞİV</div><h2 style="margin:4px 0 0">Pist / Bakım / Hava Arşivi</h2></div><button id="tmRealCloseF609416" type="button" class="tmr416-close">×</button></div><div class="tmr416-body"><div class="tmr416-note">Geçmiş yılları bir kez indirir. Gerçek arşiv motorunun sayfa ve rapor ilerlemesi aşağıda canlı gösterilir.</div><div class="tmr416-grid" style="margin-top:12px"><label>Başlangıç yılı<input id="tmRealFromF609416" type="number" inputmode="numeric" min="2000" max="${y}" step="1" value="${Math.max(2000,y-5)}"></label><label>Bitiş yılı<input id="tmRealToF609416" type="number" inputmode="numeric" min="2000" max="${y}" step="1" value="${y}"></label></div><button id="tmRealBackfillF609416" class="primary" type="button">Seçili Yılları Bir Kez İndir</button><button id="tmRealNowF609416" type="button">Bugüne Kadar Eksikleri Güncelle</button><button id="tmRealApplyF609416" type="button">Güncel Analize Yeniden Uygula</button><div class="tmr416-bar"><i id="tmRealBarF609416"></i></div><div id="tmRealStatusF609416" class="tmr416-status">Hazır.</div><div id="tmRealMetaF609416" class="tmr416-status"></div></div></div>`;
 document.body.appendChild(d);$('tmRealCloseF609416').onclick=closePanel;d.addEventListener('click',e=>{if(e.target===d)closePanel()});$('tmRealBackfillF609416').onclick=()=>void runBackfill();$('tmRealNowF609416').onclick=()=>void runNow();$('tmRealApplyF609416').onclick=()=>void applyToCurrentAnalysis(true);applyProgress(lastProgress);return d;
}
function applyProgress(detail={}){
 const text=String(detail?.text??lastProgress.text??'Hazır.');let pct=detail?.pct;
 if(pct===null||pct===undefined||!Number.isFinite(Number(pct)))pct=progressFromText(text);
 lastProgress={text,pct:pct===null||pct===undefined?lastProgress.pct:Math.max(0,Math.min(100,Number(pct)||0))};
 const s=$('tmRealStatusF609416');if(s)s.textContent=text;const b=$('tmRealBarF609416');if(b&&lastProgress.pct!==null&&lastProgress.pct!==undefined){b.style.width=`${lastProgress.pct}%`;b.setAttribute('aria-valuenow',String(lastProgress.pct))}
}
function installProgressListener(){if(progressListenerInstalled)return;progressListenerInstalled=true;window.addEventListener('at-ai:track-maintenance-status',e=>applyProgress(e.detail||{}),{passive:true});try{const old=window.ATTrackMaintenanceProgressF60948?.getLast?.();if(old)applyProgress(old)}catch{}}
function setStatus(text,pct=null){applyProgress({text,pct});try{window.ATTrackMaintenanceProgressF60948?.apply?.({text,pct})}catch{}}
function setBusy(on,text){for(const id of['tmRealBackfillF609416','tmRealNowF609416','tmRealApplyF609416']){const b=$(id);if(b)b.disabled=!!on}if(text)setStatus(text,on?lastProgress.pct:null)}
async function waitForEngine(waitMs=10000){const started=Date.now();while(Date.now()-started<waitMs){const api=window.ATTrackMaintenanceV1;if(api?.backfillYears&&api?.autoSync)return api;await new Promise(r=>setTimeout(r,100))}return null}
function validYears(){const a=Number($('tmRealFromF609416')?.value),b=Number($('tmRealToF609416')?.value),y=currentYear();if(!Number.isInteger(a)||!Number.isInteger(b)||a<2000||b<2000||a>y||b>y)return null;return[Math.min(a,b),Math.max(a,b)]}
function openPanel(){closeDrawer();const d=ensurePanel();d.classList.add('open');d.removeAttribute('aria-hidden');if(Date.now()-lastOpenAt>400)void refreshMeta();lastOpenAt=Date.now();return true}
function closePanel(){const d=$('tmRealDoorF609416');if(d){d.classList.remove('open');d.setAttribute('aria-hidden','true')}}
function isMaintenanceButton(target){const b=target?.closest?.('button');return b&&(b.id==='trackMaintenanceMenuBtnF60944'||/Pist\s*\/\s*Bak[iı]m\s*\/\s*Hava/i.test(clean(b.textContent)))}
function interceptMaintenanceTap(e){if(!isMaintenanceButton(e.target))return;e.preventDefault?.();e.stopPropagation?.();e.stopImmediatePropagation?.();openPanel()}
function bindButton(){const b=$('trackMaintenanceMenuBtnF60944');if(!b)return false;b.onclick=e=>{interceptMaintenanceTap(e);return false};b.dataset.realTrackDoorVersion=VERSION;return true}
async function refreshMeta(){const api=await waitForEngine(1200),meta=$('tmRealMetaF609416');if(!meta)return;if(!api){meta.textContent='Gerçek Pist/Bakım/Hava arşiv motoru yüklenemedi. Sayfayı bir kez yenileyin.';return}const date=getDate(),city=getCity();let line=`Motor: ${api.version||'hazır'}\nTarih: ${date||'-'} · Şehir: ${city||'-'}`;try{if(date&&city&&api.get){const rec=await api.get(date,city);line+=rec?`\nBugün için kayıt var: ${rec.city||city} ${rec.date||date}`:'\nBugün için kayıt yok; eksikleri güncelle düğmesi tamamlar.'}if(api.isBusy?.())line+='\nDurum: arşiv indirme/güncelleme çalışıyor.'}catch(e){line+='\nDurum okunamadı: '+(e?.message||e)}meta.textContent=line}
async function runBackfill(){const years=validYears();if(!years){setStatus(`Yıl aralığı 2000-${currentYear()} arasında olmalı.`,0);return}const api=await waitForEngine();if(!api?.backfillYears){setStatus('Gerçek Pist/Bakım/Hava arşiv motoru bulunamadı. Sayfayı yenileyin.',0);return}if(api.isBusy?.()){setStatus(lastProgress.text||'Pist/Bakım/Hava işlemi zaten çalışıyor.');return}const[a,b]=years;setBusy(true,`${a}-${b} Pist/Bakım/Hava arşivi başlatılıyor...`);try{await api.backfillYears(a,b);setStatus('İndirme tamamlandı. Arşiv analize hazır.',100);await refreshMeta();await applyToCurrentAnalysis(false)}catch(e){setStatus('İndirme hatası: '+(e?.message||e),0)}finally{setBusy(false)}}
async function runNow(){const api=await waitForEngine();if(!api?.autoSync){setStatus('Gerçek Pist/Bakım/Hava arşiv motoru bulunamadı. Sayfayı yenileyin.',0);return}if(api.isBusy?.()){setStatus(lastProgress.text||'Pist/Bakım/Hava işlemi zaten çalışıyor.');return}const date=getDate();setBusy(true,`${date} tarihine kadar eksikler güncelleniyor...`);try{await api.autoSync(date);setStatus('Güncelleme tamamlandı. Arşiv analize hazır.',100);await refreshMeta();await applyToCurrentAnalysis(false)}catch(e){setStatus('Güncelleme hatası: '+(e?.message||e),0)}finally{setBusy(false)}}
async function ensureTrackBeforeAnalysis(){const api=await waitForEngine(1200);if(!api||api.isBusy?.())return false;const date=getDate(),city=getCity();if(!date||!city)return false;try{const rec=api.get?await api.get(date,city):null;if(rec)return true;await api.autoSync?.(date);return true}catch(e){console.warn('[AT AI]',VERSION,'analysis pre-sync:',e);return false}}
async function applyToCurrentAnalysis(userVisible=false){try{if(userVisible)setBusy(true,'Pist/Bakım/Hava verisi güncel analize uygulanıyor...');if(window.ATDegreeSpeedF6090?.enrichCurrent)await window.ATDegreeSpeedF6090.enrichCurrent();if(window.ATDegreeSpeedSurfaceF6091?.recalc)await window.ATDegreeSpeedSurfaceF6091.recalc();if(typeof gRenderCurrentV1657==='function'&&typeof state!=='undefined'&&state?.analyses?.current)gRenderCurrentV1657(state.analyses.current,$('analysisRace')?.value||'all');if(userVisible)setStatus('Uygulandı. Derece-Hız analizi güncellendi.',100);return true}catch(e){if(userVisible)setStatus('Analize uygulama hatası: '+(e?.message||e),0);console.warn('[AT AI]',VERSION,'apply analysis:',e);return false}finally{if(userVisible)setBusy(false)}}
function installAnalysisBridge(){if(analysisBridgeInstalled)return;analysisBridgeInstalled=true;try{if(typeof gRunCurrentV1657==='function'&&!gRunCurrentV1657.__trackMaintRealDoorF609416){const before=gRunCurrentV1657;const wrapped=async function(...args){await ensureTrackBeforeAnalysis();const out=await before.apply(this,args);await applyToCurrentAnalysis(false);return out};wrapped.__trackMaintRealDoorF609416=true;gRunCurrentV1657=wrapped}}catch(e){console.warn('[AT AI]',VERSION,'analysis bridge install:',e)}}
function start(){ensureStyle();installProgressListener();bindButton();installAnalysisBridge();for(const type of['pointerup','touchend','click'])document.addEventListener(type,interceptMaintenanceTap,true);document.addEventListener('click',e=>{if(e.target?.closest?.('#menuBtn'))setTimeout(bindButton,0)},true);for(const ms of[0,120,500,1200,2500])setTimeout(()=>{bindButton();installAnalysisBridge()},ms)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ATTrackMaintenanceRealDoorF609416={version:VERSION,open:openPanel,bind:bindButton,waitForEngine,applyToCurrentAnalysis};
console.info('[AT AI]',VERSION,'active - real archive engine and live progress restored.');
})();
