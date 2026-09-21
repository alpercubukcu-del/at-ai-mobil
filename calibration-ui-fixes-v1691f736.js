/* AT AI Mobil — V16.9.1F60.94.31.16 calibration UI + FOGD error details */
(()=>{
'use strict';
if(window.__AT_CALIBRATION_UI_FIXES_F60943116__)return;
window.__AT_CALIBRATION_UI_FIXES_F60943116__=true;
const VERSION='CALIBRATION-UI-FIXES-V16.9.1F60.94.31.16';
const PROGRESS_KEY='at_ai_fogd_history_progress_v1';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function installStyle(){
 if($('calibrationUiFixesStyleF60943116'))return;
 const s=document.createElement('style');
 s.id='calibrationUiFixesStyleF60943116';
 s.textContent=`
  /* Günün Koşu Kalibrasyonu: filtreler uzun olsa bile eşleşme listesine gerçek çalışma alanı ayır. */
  #dailyCalibrationSelectorF635 .list{scrollbar-gutter:stable;overscroll-behavior:contain}
  #dailyCalibrationSelectorF635 .row{min-width:0}
  #dailyCalibrationSelectorF635 .row>div{min-width:0}
  #dailyCalibrationSelectorF635 .title,#dailyCalibrationSelectorF635 .sub{white-space:normal;overflow-wrap:anywhere}
  @media(max-width:720px){
    #dailyCalibrationSelectorF635{height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}
    #dailyCalibrationSelectorF635 .shell{height:100%!important;display:block!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important}
    #dailyCalibrationSelectorF635 header{position:sticky!important;top:0!important;z-index:90!important;background:#071522!important}
    #dailyCalibrationSelectorF635 .target{background:#071522}
    #dailyCalibrationSelectorF635 .tools{overflow:visible!important}
    #dailyCalibrationSelectorF635 .list{display:block!important;flex:none!important;height:46dvh!important;min-height:330px!important;max-height:520px!important;margin:8px 10px 10px!important;padding:38px 8px 12px!important;border:1px solid #29475f!important;border-radius:14px!important;background:#081927!important;position:relative!important;overflow-y:auto!important}
    #dailyCalibrationSelectorF635 .list:before{content:'Eşleşen yarışlar · seçim için aşağı/yukarı kaydırın';position:sticky;top:-38px;z-index:5;display:block;margin:-38px -8px 8px;padding:10px 10px 9px;background:#0a2133;border-bottom:1px solid #29475f;color:#bcd0df;font-size:10px;font-weight:800;letter-spacing:.01em}
    #dailyCalibrationSelectorF635 .row{grid-template-columns:34px minmax(0,1fr)!important;grid-template-areas:'check main' 'check type'!important;gap:7px 9px!important;min-height:78px!important;margin:0 0 7px!important;padding:11px 9px!important;border:1px solid #ffffff14!important;border-radius:11px!important;background:#ffffff05!important}
    #dailyCalibrationSelectorF635 .row>input[type='checkbox']{grid-area:check!important;width:22px!important;height:22px!important;margin-top:2px!important}
    #dailyCalibrationSelectorF635 .row>div:nth-child(2){grid-area:main!important}
    #dailyCalibrationSelectorF635 .row>.type{grid-area:type!important;justify-self:start!important;align-self:start!important;white-space:normal!important}
    #dailyCalibrationSelectorF635 .title{font-size:12px!important;line-height:1.35!important}
    #dailyCalibrationSelectorF635 .sub{font-size:10px!important;line-height:1.48!important}
    #dailyCalibrationSelectorF635 footer{position:sticky!important;bottom:0!important;z-index:80!important;background:#071522!important;box-shadow:0 -10px 24px rgba(0,0,0,.28)!important;padding-bottom:calc(12px + env(safe-area-inset-bottom))!important}
  }

  /* FOGD geçmiş kalibrasyon hata ayrıntısı. */
  #fogdHistProgressF60943111 .fh-error-btn-f736{min-height:30px;padding:4px 8px;border:1px solid #9d6670;border-radius:8px;background:#5b2631;color:#ffe7ec;font:inherit;font-weight:900;cursor:pointer;white-space:nowrap}
  #fogdHistProgressF60943111 .fh-error-btn-f736[aria-expanded='true']{background:#7b3443}
  #fogdHistProgressF60943111 .fh-error-detail-f736{grid-column:1/-1;margin:0 0 8px;padding:10px;border:1px solid #ffffff18;border-radius:10px;background:#071827;font-size:10px;line-height:1.5;color:#d7e4ee}
  #fogdHistProgressF60943111 .fh-error-item-f736{padding:8px 0;border-bottom:1px solid #ffffff12}
  #fogdHistProgressF60943111 .fh-error-item-f736:last-child{border-bottom:0}
  #fogdHistProgressF60943111 .fh-error-date-f736{font-weight:900;color:#ffe4a8}
  #fogdHistProgressF60943111 .fh-error-message-f736{margin-top:3px;overflow-wrap:anywhere}
  #fogdHistProgressF60943111 .fh-error-note-f736{margin-top:8px;padding:8px;border-radius:8px;background:#ffffff08;color:#aebfd0}
 `;
 document.head.appendChild(s);
}

function readProgress(){
 try{const x=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}
}
function parseLastError(raw){
 const text=clean(raw);const m=text.match(/^(\d{4}-\d{2}-\d{2}):\s*([\s\S]*)$/);
 return m?{date:m[1],message:clean(m[2])}:{date:'',message:text};
}
function progressRowKey(row,all){
 const first=clean(row?.children?.[0]?.textContent);
 for(const [k,p] of Object.entries(all||{})){
  if(clean(`${p?.city||''} · ${p?.year||''}`)===first)return k;
 }
 return'';
}

/* Eski motor yalnız errors + lastError saklıyor. Bu sürümden itibaren her artışı ayrı errorHistory kaydına çevir. */
function installErrorRecorder(){
 try{
  const proto=window.Storage?.prototype;if(!proto||proto.setItem?.__atFogdHistoryF736)return;
  const nativeSet=proto.setItem,nativeGet=proto.getItem;
  const wrapped=function(key,value){
   if(this===window.localStorage&&String(key)===PROGRESS_KEY){
    try{
     const prev=JSON.parse(nativeGet.call(this,key)||'{}')||{};
     const next=JSON.parse(String(value)||'{}')||{};
     for(const [k,n] of Object.entries(next)){
      if(!n||typeof n!=='object')continue;
      const p=prev[k]&&typeof prev[k]==='object'?prev[k]:{};
      const before=Number(p.errors||0),after=Number(n.errors||0);
      let hist=Array.isArray(n.errorHistory)?n.errorHistory.slice():(Array.isArray(p.errorHistory)?p.errorHistory.slice():[]);
      if(after>before&&n.lastError){
       const parsed=parseLastError(n.lastError);
       const last=hist.at(-1);
       const same=last&&Number(last.count||0)===after&&clean(last.date)===clean(parsed.date)&&clean(last.message)===clean(parsed.message);
       if(!same)hist.push({count:after,date:parsed.date,message:parsed.message,at:new Date().toISOString()});
      }
      if(hist.length)n.errorHistory=hist.slice(-100);
     }
     value=JSON.stringify(next);
    }catch(e){console.warn('[AT AI]',VERSION,'FOGD hata geçmişi kaydedilemedi:',e?.message||e)}
   }
   const out=nativeSet.call(this,key,value);
   if(this===window.localStorage&&String(key)===PROGRESS_KEY)setTimeout(decorateFogdProgress,0);
   return out;
  };
  Object.defineProperty(wrapped,'__atFogdHistoryF736',{value:true});
  proto.setItem=wrapped;
 }catch(e){console.warn('[AT AI]',VERSION,'Storage kayıt katmanı kurulamadı:',e?.message||e)}
}

function errorDetailHtml(p){
 const total=Number(p?.errors||0);
 const hist=Array.isArray(p?.errorHistory)?p.errorHistory:[];
 const rows=[];
 if(hist.length){
  for(const item of [...hist].reverse()){
   const d=clean(item?.date)||'Tarih bilinmiyor';
   const count=Number(item?.count||0);
   let when='';try{when=item?.at?new Date(item.at).toLocaleString('tr-TR'):''}catch{}
   rows.push(`<div class="fh-error-item-f736"><div class="fh-error-date-f736">${esc(d)}${count?` · Hata #${count}`:''}</div><div class="fh-error-message-f736">${esc(item?.message||'Hata mesajı boş.')}</div>${when?`<div style="margin-top:3px;opacity:.62">Deneme zamanı: ${esc(when)}</div>`:''}</div>`);
  }
 }else if(p?.lastError){
  const old=parseLastError(p.lastError);
  rows.push(`<div class="fh-error-item-f736"><div class="fh-error-date-f736">${esc(old.date||'Son kaydedilen hata')} · eski kayıt</div><div class="fh-error-message-f736">${esc(old.message||p.lastError)}</div></div>`);
 }
 const known=hist.length||((p?.lastError&&total)?1:0);
 const missing=Math.max(0,total-known);
 const note=missing?`<div class="fh-error-note-f736">Toplam sayaç ${total}. Bu düzeltmeden önceki ${missing} hata denemesinin ayrı mesajı/tarihi eski sürüm tarafından tutulmadığı için geriye dönük çıkarılamıyor. Yeni hatalar bundan sonra tek tek kaydedilecek.</div>`:'';
 return `${rows.join('')||'<div>Bu kayıt için hata ayrıntısı bulunamadı.</div>'}${note}`;
}

function decorateFogdProgress(){
 const host=$('fogdHistProgressF60943111');if(!host)return;
 const table=host.querySelector('.fh-table');if(!table)return;
 const all=readProgress();
 for(const row of table.querySelectorAll(':scope > .fh-tr:not(.fh-head)')){
  const key=progressRowKey(row,all),p=all[key]||{},errors=Number(p?.errors||0),cell=row.children?.[4];
  if(!cell)continue;
  row.dataset.f736ProgressKey=key;
  if(errors>0){
   let b=cell.querySelector('.fh-error-btn-f736');
   if(!b){cell.textContent='';b=document.createElement('button');b.type='button';b.className='fh-error-btn-f736';b.setAttribute('aria-expanded','false');cell.appendChild(b)}
   b.textContent=`Hata ${errors}`;b.dataset.f736Key=key;
  }else if(cell.querySelector('.fh-error-btn-f736')||clean(cell.textContent)!=='0')cell.textContent='0';
 }
}

let boundFogdHost=null,boundFogdObserver=null;
function bindFogdHost(){
 const host=$('fogdHistProgressF60943111');
 if(!host||host===boundFogdHost){decorateFogdProgress();return}
 boundFogdObserver?.disconnect?.();boundFogdHost=host;
 host.addEventListener('click',e=>{
  const b=e.target?.closest?.('.fh-error-btn-f736');if(!b)return;
  e.preventDefault();
  const row=b.closest('.fh-tr'),key=b.dataset.f736Key||row?.dataset?.f736ProgressKey,all=readProgress(),p=all[key]||{};
  let detail=row?.nextElementSibling;
  if(detail?.classList?.contains('fh-error-detail-f736')){
   const opening=detail.hidden;detail.hidden=!opening;b.setAttribute('aria-expanded',opening?'true':'false');
   if(opening)detail.innerHTML=errorDetailHtml(p);
   return;
  }
  detail=document.createElement('div');detail.className='fh-error-detail-f736';detail.innerHTML=errorDetailHtml(p);row?.after(detail);b.setAttribute('aria-expanded','true');
 });
 let queued=false;
 boundFogdObserver=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorateFogdProgress()})});
 boundFogdObserver.observe(host,{childList:true,subtree:true});
 decorateFogdProgress();
}

function enforceMenuLabels(){
 const drawer=$('drawer');if(!drawer)return;
 const scenario=drawer.querySelector('[data-view="scenario"]');
 const annual=$('annualArchiveBtn');
 if(scenario&&clean(scenario.textContent)!=='5. Günün Koşu Kalibrasyonu')scenario.textContent='5. Günün Koşu Kalibrasyonu';
 if(annual&&clean(annual.textContent)!=='7. Yıllık Yarış Arşivi')annual.textContent='7. Yıllık Yarış Arşivi';
}
let labelGuardBusy=false;
function installMenuLabelGuard(){
 const drawer=$('drawer');if(!drawer)return setTimeout(installMenuLabelGuard,250);
 enforceMenuLabels();
 const mo=new MutationObserver(()=>{
  if(labelGuardBusy)return;labelGuardBusy=true;
  requestAnimationFrame(()=>{enforceMenuLabels();labelGuardBusy=false});
 });
 mo.observe(drawer,{childList:true,subtree:true,characterData:true});
}

function start(){
 installStyle();installErrorRecorder();installMenuLabelGuard();bindFogdHost();
 setInterval(bindFogdHost,1400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ATCalibrationUiFixesF60943116={version:VERSION,decorateFogdProgress,enforceMenuLabels};
console.info('[AT AI]',VERSION,'active - calibration list expanded, FOGD error details recorded, menu names canonical.');
})();
