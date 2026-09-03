/* AT AI Mobil — V16.9.1F60.14 Clean Daily Calibration Page
   - Replaces the stacked legacy calibration cards with one Career-style manual flow.
   - Keeps legacy controls hidden in DOM so existing calibration engine still executes unchanged.
   - Prevents Career Match Selector leaking into Daily Calibration.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CALIBRATION_CLEAN_PAGE_V614__) return;
window.__AT_DAILY_CALIBRATION_CLEAN_PAGE_V614__ = true;
const VERSION='DAILY-CALIBRATION-CLEAN-PAGE-V16.9.1F60.14';
const PAGE='dailyCalibrationCleanPageF614';
let statusObserver=null;
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
function st(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function active(){const d=$('analysisDialog');return !!(d&&d.dataset.dailyCalibrationF6018==='1')}
function city(){try{if(typeof getCityName==='function')return clean(getCityName())}catch{}const s=st(),id=clean(s?.city);return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)||clean($('citySelect')?.selectedOptions?.[0]?.textContent)||id}
function raceNo(){const main=clean($('analysisRace')?.value),legacy=clean($('xcalRace')?.value),saved=clean(st()?.selectedRace);return Number(main&&main!=='all'?main:(legacy||saved))||0}
function currentRace(){const no=raceNo();return (Array.isArray(st()?.races)?st().races:[]).find(r=>Number(r?.no??r?.raceNo)===no)||null}
function raceMeta(r){let m=null;try{if(typeof programRaceMeta==='function')m=programRaceMeta(r)}catch{}m=m||{};return{classRaw:clean(m.class||r?.class||r?.yaradi1),ageGroup:clean(m.ageGroup||r?.ageGroup||r?.yaradi2),distance:Number(m.distance||r?.distance||r?.mesafe||0)||0,track:clean(m.track||r?.track||r?.pist)}}
function selectedCount(){const s=window.ATAnnualArchiveV13?.selectionSet||window.__AT_AA_SELECTED_IDS_V134__;try{return s&&typeof s.values==='function'?[...s.values()].length:0}catch{return 0}}
function injectStyle(){if($('dailyCalibrationCleanStyleF614'))return;const x=document.createElement('style');x.id='dailyCalibrationCleanStyleF614';x.textContent=`
#analysisDialog[data-daily-calibration-f6018="1"] #careerMatchSelectorV610{display:none!important}
#analysisDialog[data-daily-calibration-f6018="1"] #analysisContent>.xcal-wrap{display:none!important}
#${PAGE}{display:grid;gap:12px;padding:2px 0 34px}
#${PAGE} .dcp-card{border:1px solid rgba(114,213,255,.18);background:rgba(8,24,39,.72);border-radius:15px;padding:13px}
#${PAGE} .dcp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
#${PAGE} .dcp-head b{display:block;font-size:15px}#${PAGE} .dcp-head small{display:block;margin-top:5px;color:#9fb2c5;font-size:11px;line-height:1.45}
#${PAGE} .dcp-badge{font-size:10px;font-weight:900;border:1px solid rgba(114,213,255,.22);border-radius:999px;padding:5px 7px;white-space:nowrap}
#${PAGE} .dcp-target{margin-top:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:11px;font-size:11px;line-height:1.5;color:#d8e8f4}
#${PAGE} .dcp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#${PAGE} .dcp-chips span{font-size:10px;border:1px solid rgba(114,213,255,.16);border-radius:999px;padding:5px 7px;color:#cfe6f8}
#${PAGE} .dcp-open{width:100%;min-height:50px;margin-top:10px;font-weight:900}
#${PAGE} .dcp-note{font-size:10px;color:#90a7ba;line-height:1.45;margin-top:7px}
#${PAGE} .dcp-status{border:1px solid rgba(255,255,255,.09);border-radius:11px;padding:10px;font-size:11px;line-height:1.45;color:#c5d8e9}
#${PAGE} .dcp-result-title{font-size:13px;font-weight:900;margin-bottom:7px}
#${PAGE} #dcalRankHostF614>.dcal-rank-board-f613{margin-top:0}
@media(max-width:560px){#${PAGE} .dcp-card{padding:11px}}
`;document.head.appendChild(x)}
function syncLegacyRace(){const main=$('analysisRace'),legacy=$('xcalRace');if(!legacy)return;let wanted=clean(main?.value);if(!wanted||wanted==='all')wanted=clean(st()?.selectedRace);if(!wanted||wanted==='all')return;if(legacy.value!==wanted&&[...legacy.options].some(o=>o.value===wanted)){legacy.value=wanted;legacy.dispatchEvent(new Event('change',{bubbles:true}))}}
function removeCareerLeak(){const panel=$('careerMatchSelectorV610');if(panel)panel.remove();const dlg=$('careerMatchDialogV610');try{if(dlg?.open)dlg.close()}catch{}const d=$('analysisDialog');if(d)d.dataset.view='calibration'}
function targetHtml(){const r=currentRace(),no=raceNo(),m=r?raceMeta(r):null;return r?`<b>${no}. Koşu · ${esc(city())} · ${esc(clean(st()?.date||$('raceDate')?.value))}</b><br>${esc(m.classRaw)} · ${esc(m.ageGroup)} · ${m.distance?esc(m.distance)+' m ':''}${esc(m.track)}`:'<b>Önce tek bir koşu seçin.</b>'}
function updateMeta(){const t=$('dcpTargetF614'),cnt=$('dcpSelectedF614');if(t)t.innerHTML=targetHtml();if(cnt)cnt.textContent=`${selectedCount()} geçmiş yarış seçili`}
function mirrorStatus(){const src=$('xcalStatus'),dst=$('dcpStatusF614');if(dst)dst.textContent=clean(src?.textContent)||'Hazır. Eşleşmeleri görüp geçmiş yarışları seçin.'}
function attachStatus(){statusObserver?.disconnect?.();const src=$('xcalStatus');if(!src)return;statusObserver=new MutationObserver(()=>{mirrorStatus();updateMeta()});statusObserver.observe(src,{childList:true,subtree:true,characterData:true,attributes:true})}
function build(){if(!active())return;injectStyle();removeCareerLeak();syncLegacyRace();const content=$('analysisContent'),wrap=content?.querySelector('.xcal-wrap');if(!content||!wrap)return;let page=$(PAGE);if(!page){page=document.createElement('div');page.id=PAGE;page.innerHTML=`
<section class="dcp-card"><div class="dcp-head"><div><b>Günlük Kalibrasyon Eşleşmeleri</b><small>Kariyer Yol Haritasındaki gibi geçmiş yarışları görür, Tümü / Tam / İkiz / Aile olarak toplu veya tek tek seçersin. Hesap yalnız uyguladığın seçimlerden yapılır.</small></div><span class="dcp-badge">MANUEL</span></div><div id="dcpTargetF614" class="dcp-target"></div><div class="dcp-chips"><span id="dcpSelectedF614">0 geçmiş yarış seçili</span><span>Bileşik</span><span>Tam</span><span>İkiz</span><span>Aile</span><span>Kariyer</span></div><button id="dcpOpenF614" class="primary dcp-open" type="button">Eşleşmeleri Gör ve Seç</button><div class="dcp-note">Seçimi Uygula ve Hesapla dediğinde gerçek kazananın beş modelde kaçıncı olduğu hesaplanır.</div></section>
<div id="dcpStatusF614" class="dcp-status">Hazır.</div>
<section class="dcp-card"><div class="dcp-result-title">Kazananın 5 Model Sıraları</div><div id="dcalRankHostF614"><div class="xcal-note">Henüz kalibrasyon sonucu yok.</div></div></section>`;content.insertBefore(page,wrap);$('dcpOpenF614').onclick=e=>{e.preventDefault();syncLegacyRace();void window.ATDailyCalibrationPageV613?.openSelector?.()}}
const board=$('dcalRankBoardF613'),host=$('dcalRankHostF614');if(board&&host&&board.parentNode!==host)host.replaceChildren(board);wrap.style.display='none';updateMeta();mirrorStatus();attachStatus();void window.ATDailyCalibrationPageV613?.refreshRanks?.()}
const api=window.ATExactMatchCalibrationV1691F594;
if(api?.render){const prev=api.render.bind(api);api.render=function(...args){const out=prev(...args);setTimeout(build,40);return out}}
window.addEventListener('click',e=>{if(e.target?.closest?.('[data-view="scenario"]'))setTimeout(build,80)},true);
document.addEventListener('change',e=>{if(e.target?.matches?.('#analysisRace,#xcalRace'))setTimeout(()=>{syncLegacyRace();updateMeta();void window.ATDailyCalibrationPageV613?.refreshRanks?.()},30)},true);
window.addEventListener('at-ai:annual-archive-selection',()=>setTimeout(updateMeta,20));
window.addEventListener('pageshow',()=>setTimeout(build,80),{passive:true});
setTimeout(build,80);
window.ATDailyCalibrationCleanPageV614={version:VERSION,refresh:build};
console.info('[AT AI]',VERSION,'active — one clean Daily Calibration page; legacy engine hidden, Career panel leak removed.');
})();