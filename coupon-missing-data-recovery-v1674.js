/* AT AI Mobil — V16.7.4 Kupon eksik veri tamamlayıcı
   Sorun: Kariyer / 5 Model / Kazanan Yolu toplu tamamlama bir ayakta hata alınca tüm zinciri bırakabiliyordu.
   Çözüm: Eksik ayakları tek tek tamamla, başarısız ayağı raporla, diğer ayaklara devam et.
*/
(() => {
'use strict';
if (window.__AT_COUPON_MISSING_RECOVERY_V1674__) return;
window.__AT_COUPON_MISSING_RECOVERY_V1674__ = true;

const VERSION='COUPON-MISSING-RECOVERY-V16.7.4';
const SCREEN_ID='couponDecisionGateV1671';
const BOX_ID='cdgRecoveryV1674';
let running=false;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const waitPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

function ensureStyle(){
  if($('cdgRecoveryStyleV1674')) return;
  const s=document.createElement('style');
  s.id='cdgRecoveryStyleV1674';
  s.textContent=`
#${BOX_ID}{position:fixed;left:12px;right:12px;top:max(82px,calc(env(safe-area-inset-top) + 70px));z-index:2147483646;background:#0b2032;border:1px solid rgba(83,189,255,.38);border-radius:14px;padding:11px 12px;color:#eef7ff;box-shadow:0 14px 40px rgba(0,0,0,.35)}
#${BOX_ID} b{display:block;font-size:14px;margin-bottom:4px}#${BOX_ID} span{display:block;font-size:12px;color:#b8cce0;line-height:1.4}#${BOX_ID} .bar{height:7px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin-top:8px}#${BOX_ID} .bar i{display:block;height:100%;background:linear-gradient(90deg,#2ab8ff,#64e0a8);transition:width .25s ease}
#${BOX_ID}.bad{border-color:rgba(255,121,121,.45)}
`;
  document.head.appendChild(s);
}
function showBox(title,text,pct=0,bad=false){
  ensureStyle();let box=$(BOX_ID);if(!box){box=document.createElement('div');box.id=BOX_ID;document.documentElement.appendChild(box);}box.classList.toggle('bad',!!bad);box.innerHTML=`<b>${esc(title)}</b><span>${esc(text)}</span><div class="bar"><i style="width:${Math.max(0,Math.min(100,Number(pct)||0))}%"></i></div>`;
}
function hideBox(delay=800){setTimeout(()=>$(BOX_ID)?.remove(),delay);}

function api(){return window.ATCouponDecisionV1671||null;}
function currentAudit(){try{return api()?.audit?.()||null;}catch{return null;}}
function issueBy(id){return currentAudit()?.issues?.find(x=>x?.id===id)||null;}
function raceNosForIssue(id){
  const a=currentAudit();if(!a)return[];
  const all=Array.isArray(a.raceNos)?a.raceNos.map(Number).filter(Number.isFinite):[];
  if(id==='career'){
    const rows=Array.isArray(state?.analyses?.career?.races)?state.analyses.career.races:[];const have=new Set(rows.map(r=>Number(r?.no)));return all.filter(no=>!have.has(no));
  }
  if(id==='models') return issueBy('models')?all:[];
  if(id==='winner') return all.filter(no=>{
    try{
      const city=(typeof getCityName==='function'?getCityName():$('citySelect')?.selectedOptions?.[0]?.textContent)||'';
      const key=[clean(state?.date),clean(city).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,''),Number(no)||0].join('|');
      const raw=JSON.parse(sessionStorage.getItem('at_ai_coupon_winnerpath_v1671')||'{}');return !raw?.[key];
    }catch{return true;}
  });
  return all;
}

async function completeCareerRace(no){
  if(typeof runAnalysis!=='function') throw new Error('Kariyer hesaplama fonksiyonu bulunamadı.');
  const d=$('analysisDialog'),sel=$('analysisRace');
  const oldView=d?.dataset?.view,oldVal=sel?.value;
  try{
    if(d)d.dataset.view='career';
    if(sel){sel.value=String(no);if(sel.value!==String(no)) throw new Error(`${no}.K analiz seçicisinde bulunamadı.`);}
    await waitPaint();
    await runAnalysis();
    await waitPaint();
    const rows=Array.isArray(state?.analyses?.career?.races)?state.analyses.career.races:[];
    if(!rows.some(r=>Number(r?.no)===Number(no))) throw new Error(`${no}.K kariyer sonucu kaydedilmedi.`);
  }finally{
    if(d){if(oldView)d.dataset.view=oldView;else delete d.dataset.view;}
    if(sel&&oldVal!==undefined)sel.value=oldVal;
  }
}

async function robustCategory(kind){
  const A=api();if(!A)throw new Error('Kupon karar motoru hazır değil.');
  let list=raceNosForIssue(kind);if(!list.length)return{done:[],errors:[]};
  const done=[],errors=[];
  const label=kind==='career'?'Kariyer Yol Haritası':kind==='models'?'5 Model Verisi':'Kazanan Yolu Kör Verisi';
  for(let i=0;i<list.length;i++){
    const no=list[i];showBox(label,`${no}. Koşu tamamlanıyor · ${i+1}/${list.length}`,Math.round(i/list.length*100));
    try{
      if(kind==='career')await completeCareerRace(no);
      else if(kind==='models')await A.completeModels([no]);
      else if(kind==='winner')await A.completeWinner([no]);
      done.push(no);
    }catch(e){errors.push(`${no}.K: ${e?.name==='AbortError'?'zaman aşımı':e?.message||e}`);}
    await waitPaint();
  }
  showBox(label,errors.length?`${done.length}/${list.length} tamamlandı · ${errors.join(' · ')}`:`${done.length}/${list.length} tamamlandı`,100,errors.length>0);
  try{$('cdgCheckV1671')?.click();}catch{}
  return{done,errors};
}

async function robustOne(kind){
  if(running)return;running=true;
  try{await robustCategory(kind);}finally{running=false;hideBox(1800);try{$('cdgCheckV1671')?.click();}catch{}}
}

async function robustAll(){
  if(running)return;running=true;const errors=[];
  try{
    for(const kind of ['career','models','winner']){
      if(!issueBy(kind))continue;
      const r=await robustCategory(kind);errors.push(...r.errors);
    }
    showBox('Eksik veri tamamlama',errors.length?`Tamamlanamayan ayaklar: ${errors.join(' · ')}`:'Bütün kalan veri kaynakları tamamlandı.',100,errors.length>0);
  }finally{running=false;hideBox(2500);try{$('cdgCheckV1671')?.click();}catch{}}
}

document.addEventListener('click',event=>{
  const screen=event.target?.closest?.(`#${SCREEN_ID}`);if(!screen)return;
  const btn=event.target?.closest?.('[data-cdg-action],#cdgAutoV1671');if(!btn)return;
  const action=btn.id==='cdgAutoV1671'?'auto':btn.dataset.cdgAction;
  if(!['career','models','winner','auto'].includes(action))return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(action==='auto')void robustAll();else void robustOne(action);
},true);

window.ATCouponMissingRecoveryV1674={VERSION,robustCategory,robustAll};
console.info('[AT AI]',VERSION,'aktif — eksik ayaklar tek tek tamamlanır; tek hata zinciri durdurmaz.');
})();
