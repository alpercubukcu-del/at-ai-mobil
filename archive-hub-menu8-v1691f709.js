/* AT AI Mobil - V16.9.1F60.94.18 unified menu 8: real race results + track/maintenance/weather */
(()=>{
'use strict';
if(window.__AT_ARCHIVE_HUB_MENU8_F609418__)return;
window.__AT_ARCHIVE_HUB_MENU8_F609418__=true;
const VERSION='ARCHIVE-HUB-MENU8-V16.9.1F60.94.18';
const REAL_INDEX_DB='at_ai_tjk_real_race_index_v1';
const REAL_RESULTS_DB='at_ai_tjk_annual_results_v1';
const REAL_SOURCE='KOSU_SORGULAMA_REAL_ARCHIVE';
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let upgrading=false;
let observer=null;
function currentYear(){return new Date().getFullYear()}
function getState(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function currentRaceSelection(){return $('analysisRace')?.value||'all'}
function closeDrawer(){try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}
function dates(){const a=$('rrDateFromF6093'),b=$('rrDateToF6093');if(!a||!b)return null;const av=a.valueAsDate,bv=b.valueAsDate;if(av&&bv&&!Number.isNaN(av.getTime())&&!Number.isNaN(bv.getTime())){const fmt=d=>d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');const x=fmt(av),y=fmt(bv);return x<=y?[x,y]:null}const x=String(a.value||'').trim(),y=String(b.value||'').trim();return x&&y&&x<=y?[x,y]:null}
function setRealBusy(on){for(const id of['rrDownloadF6093','rrUpdateF6093','rrApplyAnalysisF609418']){const b=$(id);if(b)b.disabled=!!on}}
function setRealStatus(text,pct=null){const s=$('rrStatusF6093');if(s)s.textContent=String(text||'');const bar=$('rrBarF6093');if(bar&&pct!==null&&pct!==undefined){const n=Math.max(0,Math.min(100,Number(pct)||0));bar.style.width=n+'%';bar.setAttribute('aria-valuenow',String(n))}}
async function waitRealArchive(waitMs=10000){const started=Date.now();while(Date.now()-started<waitMs){const api=window.ATRealRaceArchiveF6093;if(api?.syncRange&&api?.syncRecent)return api;await sleep(100)}return null}
async function refreshRealMeta(){try{await window.ATRealRaceArchiveF6093?.refresh?.()}catch(e){console.warn('[AT AI]',VERSION,'real archive meta refresh:',e)}}
async function applyArchiveToAnalyses(userVisible=false){
  if(userVisible){setRealBusy(true);setRealStatus('Gerçek yarış sonuç arşivi analiz kaynaklarına bağlanıyor…')}
  let refreshed=false;
  try{
    try{await window.ATAnnualResultsArchiveV661?.refresh?.();refreshed=true}catch(e){console.warn('[AT AI]',VERSION,'annual result refresh:',e)}
    const st=getState();
    if(st?.analyses?.current){
      try{if(window.ATDegreeSpeedF6090?.enrichCurrent)await window.ATDegreeSpeedF6090.enrichCurrent()}catch(e){console.warn('[AT AI]',VERSION,'degree enrich:',e)}
      try{if(window.ATDegreeSpeedSurfaceF6091?.recalc)await window.ATDegreeSpeedSurfaceF6091.recalc()}catch(e){console.warn('[AT AI]',VERSION,'surface recalc:',e)}
      try{if(typeof gRenderCurrentV1657==='function')gRenderCurrentV1657(st.analyses.current,currentRaceSelection())}catch(e){console.warn('[AT AI]',VERSION,'current rerender:',e)}
    }
    try{window.dispatchEvent(new CustomEvent('at-ai:real-race-archive-updated',{detail:{version:VERSION,indexDb:REAL_INDEX_DB,resultsDb:REAL_RESULTS_DB,source:REAL_SOURCE,sharedResultApi:'ATAnnualResultsArchiveV661.getLocalResult'}}))}catch{}
    if(userVisible)setRealStatus('Bağlandı. Kariyer, kalibrasyon ve geçmiş sonuç kullanan analizler telefondaki gerçek yarış sonuç arşivini ortak kaynak olarak kullanabilir.',100);
    return refreshed||!!window.ATAnnualResultsArchiveV661;
  }finally{if(userVisible)setRealBusy(false)}
}
async function runRealYears(){const dr=dates();if(!dr){setRealStatus('Başlangıç ve bitiş tarihini seçin.',0);return}const api=await waitRealArchive();if(!api?.syncRange){setRealStatus('Gerçek Yarış Arşivi motoru yüklenemedi.',0);return}const[a,b]=dr;setRealBusy(true);try{await api.syncRange(a,b);await refreshRealMeta();await applyArchiveToAnalyses(false)}catch(e){setRealStatus('Gerçek yarış arşivi indirme hatası: '+(e?.message||e),0)}finally{setRealBusy(false)}}
async function runRealRecent(){
  const api=await waitRealArchive();if(!api){setRealStatus('Gerçek Yarış Arşivi motoru yüklenemedi. Sayfayı yenileyip tekrar deneyin.',0);return}
  setRealBusy(true);setRealStatus('Koşu Sorgulama indeksi ve günlük yarış sonuçlarındaki eksikler bugüne kadar güncelleniyor…',0);
  try{await api.syncRecent({force:true});await refreshRealMeta();await applyArchiveToAnalyses(false);setRealStatus('Eksik gerçek yarış sonuçları güncellendi. Analiz kaynağı hazır.',100)}
  catch(e){setRealStatus('Gerçek yarış arşivi güncelleme hatası: '+(e?.message||e),0)}
  finally{setRealBusy(false)}
}
function realSectionHtml(y){const t=new Date().toISOString().slice(0,10);return `<section id="realRaceArchiveSectionF6093" class="tmr418-card tmr418-real"><div class="tmr418-kicker">1 · GERÇEK YARIŞ SONUÇLARI</div><h3>Gerçek Yarış Arşivi · Koşu Sorgulama</h3><div class="tmr418-note"><b>Veri hattı:</b> Koşu Sorgulama → Gerçekleşmiş Yarış İndeksi → Günlük Yarış Sonuçları → Telefonda Gerçek Yarış Arşivi → Analizler.</div><div class="tmr416-grid tmr418-grid"><label>Başlangıç tarihi<input id="rrDateFromF6093" type="date" value="${t}" max="${t}"></label><label>Bitiş tarihi<input id="rrDateToF6093" type="date" value="${t}" max="${t}"></label></div><button id="rrDownloadF6093" class="primary" type="button">Seçili Günleri İndir / Kaldığı Yerden Devam Et</button><button id="rrUpdateF6093" type="button">Bugüne Kadar Eksikleri Güncelle</button><button id="rrApplyAnalysisF609418" type="button">Arşivi Analizlere Yeniden Bağla</button><div class="tmr416-bar"><i id="rrBarF6093"></i></div><div id="rrStatusF6093" class="tmr416-status">Hazır.</div><div id="rrMetaF6093" class="tmr416-status">Gerçekleşmiş yarış arşivi okunuyor…</div></section>`}
function trackSectionHtml(y){return `<section id="trackMaintenanceHubSectionF609418" class="tmr418-card"><div class="tmr418-kicker">2 · PİST / BAKIM / HAVA</div><h3>Pist / Bakım / Hava Arşivi</h3><div class="tmr418-note">Geçmiş pist-bakım-hava raporlarını bir kez indirir; derece-hız analizine pist koşullarını ekler.</div><div class="tmr416-grid tmr418-grid"><label>Başlangıç yılı<input id="tmRealFromF609416" type="number" inputmode="numeric" min="2000" max="${y}" step="1" value="${Math.max(2000,y-5)}"></label><label>Bitiş yılı<input id="tmRealToF609416" type="number" inputmode="numeric" min="2000" max="${y}" step="1" value="${y}"></label></div><button id="tmRealBackfillF609416" class="primary" type="button">Seçili Yılları Bir Kez İndir</button><button id="tmRealNowF609416" type="button">Bugüne Kadar Eksikleri Güncelle</button><button id="tmRealApplyF609416" type="button">Güncel Analize Yeniden Uygula</button><div class="tmr416-bar"><i id="tmRealBarF609416"></i></div><div id="tmRealStatusF609416" class="tmr416-status">Hazır.</div><div id="tmRealMetaF609416" class="tmr416-status">Pist/Bakım/Hava arşivi okunuyor…</div></section>`}
function ensureStyle(){if($('archiveHubMenu8StyleF609418'))return;const s=document.createElement('style');s.id='archiveHubMenu8StyleF609418';s.textContent=`#tmRealDoorF609416{padding:0!important;align-items:stretch!important}#tmRealDoorF609416 .tmr416-panel{width:100vw!important;height:100dvh!important;max-height:none!important;border-radius:0!important;border:0!important}#tmRealDoorF609416 .tmr416-body{display:grid;gap:12px}.tmr418-intro{font-size:12px;line-height:1.55;padding:10px 12px;border:1px solid #27445d;border-radius:12px;background:#091c2c}.tmr418-card{padding:14px;border:1px solid #29465d;border-radius:14px;background:#0a1c2a}.tmr418-card h3{margin:3px 0 7px;font-size:17px}.tmr418-kicker{font-size:10px;font-weight:900;letter-spacing:.11em;color:#72d5ff}.tmr418-note{font-size:12px;line-height:1.55;opacity:.88;margin-bottom:10px}.tmr418-grid{margin-top:8px}`;document.head.appendChild(s)}
function wireRealButtons(){const d=$('rrDownloadF6093'),u=$('rrUpdateF6093'),a=$('rrApplyAnalysisF609418');if(d)d.onclick=e=>{e.preventDefault();e.stopPropagation();void runRealYears()};if(u)u.onclick=e=>{e.preventDefault();e.stopPropagation();void runRealRecent()};if(a)a.onclick=e=>{e.preventDefault();e.stopPropagation();void applyArchiveToAnalyses(true)}}
function hideLegacyRealSection(){const s=$('realRaceArchiveSectionF6093');if(s&&s.closest('#tjkAnnualArchiveDialog')){s.style.display='none';s.dataset.movedToMenu8='F60.94.18'}}
function markMenu(){const b=$('trackMaintenanceMenuBtnF60944');if(!b)return false;b.title='Gerçek Yarış Arşivi + Pist / Bakım / Hava';b.setAttribute('aria-label','8. Gerçek Yarış Arşivi + Pist / Bakım / Hava');b.dataset.archiveHubMenu8='F60.94.18';return true}
function upgradePanel(){
  const root=$('tmRealDoorF609416'),panel=root?.querySelector('.tmr416-panel'),body=root?.querySelector('.tmr416-body');if(!root||!panel||!body||panel.dataset.archiveHubMenu8==='F60.94.18'||upgrading)return false;
  upgrading=true;
  try{
    ensureStyle();
    const oldReal=$('realRaceArchiveSectionF6093');if(oldReal&&!root.contains(oldReal))oldReal.remove();
    const title=panel.querySelector('.tmr416-head h2');if(title)title.textContent='Gerçek Yarış Arşivi + Pist / Bakım / Hava';
    const kicker=panel.querySelector('.tmr416-head>div>div');if(kicker)kicker.textContent='AT AI GERÇEK VERİ MERKEZİ';
    const y=currentYear();
    body.innerHTML=`<div class="tmr418-intro">8. menü artık iki gerçek veri arşivini aynı yerde yönetir. Yarış sonuçları <b>${REAL_RESULTS_DB}</b> veritabanına yazılır ve mevcut yerel sonuç API'si üzerinden analizlerle paylaşılır.</div>${realSectionHtml(y)}${trackSectionHtml(y)}`;
    [...body.querySelectorAll('button')].forEach(b=>{if((b.textContent||'').trim()==='Pist / Bakım / Hava Arşivi')b.remove()});
    wireRealButtons();
    panel.dataset.archiveHubMenu8='F60.94.18';
    root.dataset.archiveHubMenu8Version=VERSION;
    setTimeout(()=>{void refreshRealMeta();try{window.ATTrackMaintenanceStageFixF609417?.runApply&&$('tmRealMetaF609416')?.setAttribute('data-stage-fix-ready','1')}catch{}},0);
    try{window.dispatchEvent(new CustomEvent('at-ai:archive-hub-ready',{detail:{version:VERSION,indexDb:REAL_INDEX_DB,resultsDb:REAL_RESULTS_DB,source:REAL_SOURCE}}))}catch{}
    return true;
  }finally{upgrading=false}
}
function open(){closeDrawer();const door=window.ATTrackMaintenanceRealDoorF609416;if(typeof door?.open==='function'){door.open();setTimeout(upgradePanel,0);setTimeout(upgradePanel,100);return true}return false}
function install(){ensureStyle();markMenu();hideLegacyRealSection();upgradePanel();if(!observer){observer=new MutationObserver(()=>{markMenu();hideLegacyRealSection();upgradePanel()});observer.observe(document.documentElement,{childList:true,subtree:true})}for(const ms of[100,400,1000,2500])setTimeout(()=>{markMenu();hideLegacyRealSection();upgradePanel()},ms);window.addEventListener('at-ai:annual-archive-open',()=>setTimeout(hideLegacyRealSection,0))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATArchiveHubMenu8F609418={version:VERSION,open,upgrade:upgradePanel,refresh:refreshRealMeta,applyToAnalyses:applyArchiveToAnalyses,getLocalResult:(date,city,raceNo)=>window.ATAnnualResultsArchiveV661?.getLocalResult?.(date,city,raceNo)??Promise.resolve(null),databases:{index:REAL_INDEX_DB,results:REAL_RESULTS_DB},source:REAL_SOURCE};
console.info('[AT AI]',VERSION,'active - menu 8 unifies real race results and track/maintenance/weather archives; shared local results are exposed to analyses.');
})();
