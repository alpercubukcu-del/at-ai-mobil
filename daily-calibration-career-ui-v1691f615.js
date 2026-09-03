/* AT AI Mobil — V16.9.1F60.15 Daily Calibration Career-identical selector UI
   - Keeps the existing F60.13/F60.14 calibration engine and manual selection behavior.
   - Makes the Daily Calibration match dialog visually/structurally match Career Match Selector.
   - Adds uyum %, structural rule text, Career-style mobile tab/footer layout.
   - Restores two calibration-record cleanup controls on the clean Daily Calibration page.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CALIBRATION_CAREER_UI_V615__) return;
window.__AT_DAILY_CALIBRATION_CAREER_UI_V615__ = true;
const VERSION='DAILY-CALIBRATION-CAREER-UI-V16.9.1F60.15';
const DIALOG='dailyCalibrationMatchDialogF613';
const PAGE='dailyCalibrationCleanPageF614';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
const key=v=>upper(v).replace(/[^A-Z0-9]+/g,'');
let listObserver=null,cleanupBusy=false;
function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function city(){try{if(typeof getCityName==='function')return clean(getCityName())}catch{}const s=st(),id=clean(s?.city);return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id}
function currentRace(){const s=st(),no=Number($('xcalRace')?.value||s?.selectedRace||0);return(Array.isArray(s?.races)?s.races:[]).find(r=>Number(r?.no??r?.raceNo)===no)||null}
function meta(r){let m=null;try{if(typeof programRaceMeta==='function')m=programRaceMeta(r)}catch{}m=m||{};return{distance:Number(m.distance||r?.distance||r?.mesafe||0)||0,track:clean(m.track||r?.track||r?.pist)}}
function sameTrack(a,b){const A=upper(a),B=upper(b);for(const t of['CIM','KUM','SENTETIK'])if(A.includes(t)&&B.includes(t))return true;return key(a)===key(b)}
function fmtDate(v){const m=clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:clean(v)}
function typeFromRow(row){return clean(row.querySelector('.type')?.textContent)}
function ruleFor(type){return type==='Tam'?'İl + pist + mesafe aynı':type==='İkiz'?'Pist + mesafe aynı · il değişebilir':'İl aynı · pist / mesafe değişebilir'}
function chipValue(row,prefix){const chip=[...row.querySelectorAll('.chip')].find(x=>clean(x.textContent).startsWith(prefix));return clean(chip?.textContent).replace(prefix,'').replace(/↔/g,'').trim()}
function similarity(row){
  const type=typeFromRow(row);if(type==='Tam')return 100;if(type==='İkiz')return 95;
  const r=currentRace(),m=r?meta(r):null;if(!m)return 0;
  const rowCity=chipValue(row,'İl:'),rowTrack=chipValue(row,'Pist:'),distText=chipValue(row,'Mesafe:');
  const rowDist=Number((distText.match(/\d+/)||[])[0]||0);
  const d=rowDist&&m.distance?Math.max(0,1-Math.abs(Number(m.distance)-rowDist)/800):0;
  const t=sameTrack(m.track,rowTrack)?1:.12;
  const ci=key(city())===key(rowCity)?1:.5;
  return Math.round(Math.max(0,Math.min(1,.30+.25+d*.18+t*.17+ci*.10))*100);
}
function injectStyle(){if($('dailyCalibrationCareerUiStyleF615'))return;const s=document.createElement('style');s.id='dailyCalibrationCareerUiStyleF615';s.textContent=`
#${DIALOG}{width:min(960px,100vw)!important;height:min(92vh,900px)!important;max-width:none!important;max-height:none!important;padding:0!important;border:1px solid #315d7c!important;border-radius:16px!important;background:#071522!important;color:#eef7ff!important}
#${DIALOG} .head{display:flex!important;justify-content:space-between!important;gap:8px!important}#${DIALOG} h2{margin:0!important;font-size:18px!important}
#${DIALOG} .tabs{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:6px!important}#${DIALOG} .actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
#${DIALOG} .rule-f615{font-size:10px;line-height:1.45;opacity:.78;font-weight:800;margin-top:4px}#${DIALOG} .score-f615{display:block;font-size:10px;opacity:.67;text-align:center;margin-top:4px;white-space:nowrap}
#${PAGE} .dcp-cleanup-f615{border:1px solid rgba(92,183,255,.25);background:rgba(26,83,124,.09)}#${PAGE} .dcp-cleanup-actions-f615{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}#${PAGE} .dcp-cleanup-actions-f615 button{min-height:46px;font-weight:850;white-space:normal}#${PAGE} .dcp-cleanup-danger-f615{border-color:rgba(255,108,108,.38)!important;color:#ffd1d1!important}#${PAGE} .dcp-cleanup-status-f615{font-size:10px;color:#9fb2c5;line-height:1.45;margin-top:8px}
@media(max-width:560px){#${DIALOG}{width:100vw!important;height:100dvh!important;border-radius:0!important;border:0!important}#${DIALOG} .tabs{grid-template-columns:repeat(3,1fr)!important}#${DIALOG} .actions{grid-template-columns:1fr 1fr!important}#${DIALOG} .apply{grid-column:1/-1!important}#${PAGE} .dcp-cleanup-actions-f615{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(s)}
function decorateRows(){const d=$(DIALOG);if(!d)return;d.querySelectorAll('.row').forEach(row=>{
  const title=row.querySelector('.title');if(title){const txt=clean(title.textContent),m=txt.match(/^(\d{4}-\d{2}-\d{2})(.*)$/);if(m)title.textContent=fmtDate(m[1])+m[2]}
  const mid=row.children?.[1];if(mid&&!mid.querySelector('.rule-f615')){const r=document.createElement('div');r.className='rule-f615';r.textContent=ruleFor(typeFromRow(row));mid.appendChild(r)}
  const side=row.children?.[2];if(side&&!side.querySelector('.score-f615')){const x=document.createElement('small');x.className='score-f615';x.textContent=`uyum %${similarity(row)}`;side.appendChild(x)}
})}
function decorateDialog(){injectStyle();const d=$(DIALOG);if(!d)return;const small=d.querySelector('header .head small');if(small)small.textContent=`AT AI SYSTEM · ${VERSION}`;const h=d.querySelector('header h2');if(h)h.textContent='Kalibrasyon Eşleşmelerini Seç';decorateRows();const list=$('dcalListF613');if(list){listObserver?.disconnect?.();listObserver=new MutationObserver(()=>requestAnimationFrame(decorateRows));listObserver.observe(list,{childList:true})}}
function cleanupCard(){if(!document.getElementById(PAGE))return;injectStyle();let card=$('dcpCleanupF615');if(card)return;card=document.createElement('section');card.id='dcpCleanupF615';card.className='dcp-card dcp-cleanup-f615';card.innerHTML=`<div class="dcp-head"><div><b>Kalibrasyon Kayıtları</b><small>Yalnız 5 Model kalibrasyon kayıtlarını yönetir. Günlük/Yıllık TJK arşivi ve Kariyer verileri silinmez.</small></div><span class="dcp-badge">KAYIT</span></div><div class="dcp-cleanup-actions-f615"><button id="dcpCleanupOldF615" type="button">Kayıtları Temizle</button><button id="dcpCleanupAllF615" type="button" class="dcp-cleanup-danger-f615">Kayıtları Sil</button></div><div id="dcpCleanupStatusF615" class="dcp-cleanup-status-f615">Temizle: seçili tarih + şehir kaydını korur. Sil: tüm kalibrasyon ve backtest kayıtlarını sıfırlar.</div>`;document.getElementById(PAGE).appendChild(card)}
function setCleanupStatus(t){const x=$('dcpCleanupStatusF615');if(x)x.textContent=t}
async function cleanOld(){if(cleanupBusy)return;const api=window.ATCalibrationCleanupV1691F599;if(typeof api?.cleanOld!=='function')return setCleanupStatus('Kalibrasyon temizleme motoru hazır değil.');cleanupBusy=true;try{await api.cleanOld();setCleanupStatus('Kayıt temizleme işlemi tamamlandı. Seçili tarih + şehir korunur.')}catch(e){setCleanupStatus(`Temizleme hatası: ${clean(e?.message||e)}`)}finally{cleanupBusy=false}}
async function resetAll(){if(cleanupBusy)return;const api=window.ATCalibrationCleanupV1691F599;if(typeof api?.resetAll!=='function')return setCleanupStatus('Kalibrasyon silme motoru hazır değil.');cleanupBusy=true;try{await api.resetAll();setCleanupStatus('Kalibrasyon kayıtları silme işlemi tamamlandı. TJK ve Kariyer arşivleri korunur.')}catch(e){setCleanupStatus(`Silme hatası: ${clean(e?.message||e)}`)}finally{cleanupBusy=false}}
const oldApi=window.ATDailyCalibrationPageV613;if(oldApi?.openSelector){const oldOpen=oldApi.openSelector.bind(oldApi);oldApi.openSelector=async function(...args){const out=await oldOpen(...args);decorateDialog();return out}}
document.addEventListener('click',e=>{if(e.target?.closest?.('#dcpCleanupOldF615')){e.preventDefault();void cleanOld()}if(e.target?.closest?.('#dcpCleanupAllF615')){e.preventDefault();void resetAll()}if(e.target?.closest?.('[data-view="scenario"]'))setTimeout(()=>{cleanupCard();decorateDialog()},100)},true);
const pageObserver=new MutationObserver(()=>{if(document.getElementById(PAGE)&&!$('dcpCleanupF615'))requestAnimationFrame(cleanupCard);if($(DIALOG)?.open)requestAnimationFrame(decorateDialog)});pageObserver.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>{cleanupCard();decorateDialog()},120);
window.ATDailyCalibrationCareerUiV615={version:VERSION,refresh:()=>{cleanupCard();decorateDialog()}};
console.info('[AT AI]',VERSION,'active — Daily Calibration selector now matches Career UI; cleanup buttons restored.');
})();