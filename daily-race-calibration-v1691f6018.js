/* AT AI Mobil — V16.9.1F60.18 GÜNÜN KOŞU KALİBRASYONU
   Koşu Senaryosu menüsünü seçilmiş geçmiş yarışların gerçek sonuçlarıyla dinamik kalibrasyon ekranına dönüştürür.
*/
(() => {
'use strict';
if (window.__AT_DAILY_RACE_CALIBRATION_V6018__) return;
window.__AT_DAILY_RACE_CALIBRATION_V6018__ = true;

const VERSION='DAILY-RACE-CALIBRATION-V16.9.1F60.18';
const $=id=>document.getElementById(id);

function patchMenu(){
  const button=document.querySelector('[data-view="scenario"]');
  if(button){
    const prefix=(button.textContent.match(/^\s*\d+\./)||[''])[0];
    const next=`${prefix ? prefix+' ' : ''}Günün Koşu Kalibrasyonu`;
    if(button.textContent!==next) button.textContent=next;
  }
  const calibration=document.querySelector('[data-view="calibration"]');
  if(calibration && calibration.style.display!=='none') calibration.style.display='none';
}


function stateRef(){try{if(typeof state==='object'&&state)return state}catch{}return window.state||null}
function currentCityName(){
  try{if(typeof getCityName==='function')return String(getCityName()||'').trim()}catch{}
  return String($('citySelect')?.selectedOptions?.[0]?.textContent||stateRef()?.city||'').trim();
}
async function retryIncomplete(){
  const no=Number($('xcalRace')?.value||0), st=stateRef();
  if(!no||!st?.date) return;
  const api=window.ATExactMatchCalibrationV1691F594;
  const entry=await api?.getForRace?.(st.date,currentCityName(),no);
  const ids=Array.isArray(entry?.selectedHistoricalIds)?entry.selectedHistoricalIds.filter(Boolean):[];
  if(!ids.length){
    const status=$('xcalStatus');if(status)status.textContent='Bu koşunun yeniden denenecek önceki geçmiş yarış seçimi bulunamadı.';
    return;
  }
  const annual=window.ATAnnualArchiveV13;
  if(!annual?.selectionSet) return;
  annual.selectionSet.clear();
  ids.forEach(id=>annual.selectionSet.add(id));
  try{window.dispatchEvent(new CustomEvent('at-ai:annual-archive-selection',{detail:{selected:ids.length,targetRaceNo:no,retry:true}}))}catch{}
  const status=$('xcalStatus');
  if(status)status.textContent=`${no}. koşu: ${entry?.errorCount||0} hata yeniden deneniyor; başarılı ${entry?.validCount||0} yarış cache’den korunacak.`;
  $('xcalRunSelected')?.click();
}

function decorate(){
  const dialog=$('analysisDialog');
  if(!dialog?.open || dialog.dataset.dailyCalibrationF6018!=='1' || dialog.dataset.view!=='scenario') return;
  if($('dialogEyebrow')) $('dialogEyebrow').textContent='SEÇİLMİŞ GEÇMİŞ YARIŞ BACKTESTİ';
  if($('dialogTitle')) $('dialogTitle').textContent='Günün Koşu Kalibrasyonu';
  const wrap=document.querySelector('#analysisContent .xcal-wrap');
  if(!wrap) return;
  const heading=wrap.querySelector('h2,h3');
  if(heading) heading.textContent='Günün Koşu Kalibrasyonu';
  let intro=$('dailyCalibrationIntroF6018');
  if(!intro){
    intro=document.createElement('section');
    intro.id='dailyCalibrationIntroF6018';
    intro.className='xcal-card';
    intro.innerHTML='<h3>Bugünkü koşuya benzeyen geçmiş yarışları seç</h3><p>Yıllık Arşivden aynı şehir, pist, mesafe, sınıf ve yaş grubuna benzeyen yarışları seç. Sistem gerçek kazananın 5 modeldeki Top1/Top2/Top3/Top5 yerini ölçerek yalnız kuponun tek/dar/geniş kararını kalibre eder.</p><div class="xcal-chips"><i>Sabit F37 kapalı</i><i>Seçim kullanıcıya ait</i><i>At sırası değişmez</i><i>İki kupon çıkar</i></div>';
    wrap.insertBefore(intro,wrap.firstChild||null);
  }
  const status=$('xcalStatus');
  if(status) status.textContent='Önce hedef bugünkü koşuyu, sonra Yıllık Arşivden benzer geçmiş yarışları seç. Kalibrasyon tamamlandığında Kupon Oluştur menüsü hem kalibresiz hem kalibreli kupon üretir.';
  const grid=$('xcalRunSelected')?.parentElement;
  if(grid&&!$('xcalRetryIncompleteF6018')){
    const retry=document.createElement('button');
    retry.id='xcalRetryIncompleteF6018';
    retry.className='xcal-secondary';
    retry.type='button';
    retry.textContent='Eksik / Hatalı Yarışları Yeniden Dene';
    retry.addEventListener('click',()=>void retryIncomplete());
    grid.appendChild(retry);
  }
  document.querySelectorAll('#analysisContent button').forEach(button=>{
    const t=button.textContent||'';
    if(t.includes('Yıllık Arşivde Tam Eşleşmeleri Aç')) button.textContent='Yıllık Arşivde Benzer Geçmiş Yarışları Seç';
    if(t.includes('Seçilen Tam Eşleşmeleri Kalibre Et')) button.textContent='Seçilen Geçmiş Yarışlarla Kalibre Et';
  });
}

function openDailyCalibration(event){
  const button=event.target?.closest?.('[data-view="scenario"]');
  if(!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try{$('closeMenu')?.click()}catch{}
  const dialog=$('analysisDialog');
  if(!dialog) return;
  dialog.dataset.view='scenario';
  dialog.dataset.dailyCalibrationF6018='1';
  window.ATExactMatchCalibrationV1691F594?.render?.();
  decorate();
  if(!dialog.open) dialog.showModal();
}

window.addEventListener('click',openDailyCalibration,true);
document.addEventListener('at-ai:annual-archive-selection',()=>setTimeout(decorate,50));
document.addEventListener('change',event=>{
  if(event.target?.matches?.('#xcalRace,#analysisRace')) setTimeout(decorate,120);
},true);
document.addEventListener('click',event=>{
  if(event.target?.closest?.('#runAnalysis')) {
    setTimeout(decorate,180);
    setTimeout(decorate,900);
  }
},true);
window.addEventListener('focus',()=>setTimeout(decorate,80));
patchMenu();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchMenu,{once:true});
window.ATDailyRaceCalibrationV6018={version:VERSION,open:()=>{document.querySelector('[data-view="scenario"]')?.click()}};
console.info('[AT AI]',VERSION,'active — scenario menu is selected-history daily calibration.');
})();