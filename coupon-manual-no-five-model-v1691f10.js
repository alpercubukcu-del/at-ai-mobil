/* AT AI Mobil — V16.9.1F10 Manuel Kupon: 5 Model hazırlığını tamamen kapat
   - Bahis türü seçimi yalnız TJK resmi başlangıç/ayak planını belirler.
   - prepareManualTicketV117 artık 5 Model/Bileşik/Tam/İkiz/Aile/Kariyer modeli hesaplamaz.
   - Kupon üretimi F8 hibrit motorundan: Kariyer/Hazırlık; gerçek debut=Güncel Analiz.
*/
(() => {
'use strict';
if (window.__AT_COUPON_MANUAL_NO_FIVE_MODEL_V1691F10__) return;
window.__AT_COUPON_MANUAL_NO_FIVE_MODEL_V1691F10__ = true;
const VERSION='COUPON-MANUAL-NO-FIVE-MODEL-V16.9.1F10';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function legText(plan){
  return (Array.isArray(plan?.legs)?plan.legs:[]).map(r=>r?.no).filter(Boolean).join('-');
}
function scrubLegacyCopy(){
  document.querySelectorAll('.five-model-note-v11').forEach(note=>{
    note.innerHTML='<b>KARİYER / HAZIRLIK + MANUEL DÜZENLEME</b><span>Bahis türü resmi başlangıcı belirler</span><small>Ayaklarda sistemin Kariyer/Hazırlık sıralaması gelir; gerçek debut varsa Güncel Analiz desteği eklenir.</small>';
  });
  const source=$('signalSource');
  if(source) source.innerHTML='<option value="career">Kariyer/Hazırlık</option>';
}

async function prepareNoFiveModel(force=false){
  try{
    if (typeof manualTicketV117==='undefined' || !manualTicketV117) return null;
    manualTicketV117.busy=false;
    manualTicketV117.prepToken=(Number(manualTicketV117.prepToken)||0)+1;
    manualTicketV117.modelId='career';
    const type=String(manualTicketV117.betType||'').trim();
    const plan=type && typeof resolveBetStartV11==='function' ? resolveBetStartV11(type) : {ok:false,error:'Bahis türünü seç.'};
    manualTicketV117.plan=plan;
    manualTicketV117.raceDataMap=new Map();
    manualTicketV117.systemTicket=null;

    const modelBox=$('manualModelsV117');
    if(modelBox){modelBox.style.display='none';modelBox.setAttribute('aria-hidden','true');}
    const typeLabel=$('manualBetTypeLabelV117');
    const startLabel=$('manualBetStartLabelV117');
    const box=$('manualPlanV117');
    if(typeLabel) typeLabel.textContent=type||'Bahis türünü seç';
    if(startLabel) startLabel.textContent=plan?.ok ? `${plan.startRace}. koşudan başlar · Ayaklar ${legText(plan)}` : 'TJK resmi başlangıcı kullanılacak';
    if(box){
      box.classList.remove('empty');
      box.innerHTML=plan?.ok
        ? `<div style="padding:14px 12px;line-height:1.45"><b>${esc(type)}</b><br><small>${esc(plan.startRace)}. koşudan başlar · Ayaklar ${esc(legText(plan))}</small><div style="margin-top:10px;padding:10px;border:1px solid rgba(114,213,255,.22);border-radius:10px;background:rgba(114,213,255,.06)"><b>Hazır · Kariyer/Hazırlık kullanılacak</b><br><small>Kupon kaynağı Kariyer/Hazırlık. Gerçek debut at varsa yalnız Güncel Analiz puanı tamamlanır.</small></div></div>`
        : `<div style="padding:14px 12px">${esc(plan?.error||'Bahis türünü seç.')}</div>`;
    }
    const build=$('buildAllBtn');
    if(build&&type) build.textContent=`Kupon Oluştur · ${type}`;
    try{if(typeof status==='function'&&plan?.ok)status(`${type} hazır · Kariyer/Hazırlık kuponu hazır.`);}catch{}
    return plan;
  }catch(e){
    console.warn('[AT AI]',VERSION,e);
    return null;
  }
}

try{prepareManualTicketV117=prepareNoFiveModel;}catch(e){console.warn('[AT AI]',VERSION,'prepare override',e);}

function scrub(){
  scrubLegacyCopy();
  const models=$('manualModelsV117');
  if(models){models.style.display='none';models.setAttribute('aria-hidden','true');}
  const box=$('manualPlanV117');
  if(box&&/modeli hazırlanıyor|bileşik|bağımsız tarihsel modeller hazırlanıyor/i.test(String(box.textContent||''))){
    void prepareNoFiveModel(true);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scrub,{once:true});else scrub();
window.addEventListener('pageshow',scrub,{passive:true});
const mo=new MutationObserver(()=>{clearTimeout(scrub._t);scrub._t=setTimeout(scrub,0);});
try{mo.observe(document.documentElement,{subtree:true,childList:true});}catch{}
window.ATCouponManualNoFiveModelV1691F10={VERSION,prepare:prepareNoFiveModel};
console.info('[AT AI]',VERSION,'aktif — Manuel Kupon 5 Model hazırlığı kapalı.');
})();
