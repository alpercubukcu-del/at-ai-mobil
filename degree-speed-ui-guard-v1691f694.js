;(() => {
'use strict';
if(window.__AT_DEGREE_SPEED_UI_GUARD_F6094__)return;
window.__AT_DEGREE_SPEED_UI_GUARD_F6094__=true;
const VERSION='DEGREE-SPEED-UI-GUARD-V16.9.1F60.94.2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
let enriching=false,watched=null,observer=null,timer=null;
function rawCurrentResult(){try{return state?.analyses?.current||null}catch{return null}}
function liveContext(){
  let s={};try{s=state||{}}catch{}
  const date=clean(s?.date||document.getElementById('raceDate')?.value);
  const cityId=clean(s?.city||document.getElementById('citySelect')?.value);
  let cityName='';
  try{cityName=clean(typeof getCityName==='function'?getCityName():document.querySelector('#citySelect option:checked')?.textContent)}catch{}
  const race=clean(document.getElementById('analysisRace')?.value||s?.selectedRace||'all');
  return{date,cityId,cityName,race};
}
function resultContext(result){return{date:clean(result?.date),cityId:clean(result?.city),cityName:clean(result?.cityName)}}
function sameContext(result){
  if(!result)return false;
  const live=liveContext(),r=resultContext(result);
  if(live.date&&r.date&&live.date!==r.date)return false;
  if(live.cityId&&r.cityId&&fold(live.cityId)!==fold(r.cityId))return false;
  if((!live.cityId||!r.cityId)&&live.cityName&&r.cityName&&fold(live.cityName)!==fold(r.cityName))return false;
  return true;
}
function currentResult(){const r=rawCurrentResult();return sameContext(r)?r:null}
function contextKey(result=null){
  const live=liveContext(),r=result?resultContext(result):{};
  return [clean(r.date||live.date),fold(r.cityId||r.cityName||live.cityId||live.cityName)].join('|');
}
function liveKey(){const c=liveContext();return[clean(c.date),fold(c.cityId||c.cityName)].join('|')}
function clearStaleCard(){
  const card=document.getElementById('degreeSpeedShadowF6090');if(!card)return;
  const rr=currentResult(),expected=rr?contextKey(rr):'';
  if(!expected||clean(card.dataset.analysisContext)!==expected)card.remove();
}
function shortError(e){return String(e?.message||e||'bilinmeyen hata').slice(0,180)}
function cardHtml(result){
  const ctx=result?.degreeSpeed?.trackContext||{},w=ctx?.weather||{},errors=Array.isArray(result?.degreeSpeed?.errors)?result.degreeSpeed.errors:[],key=contextKey(result);
  const source=ctx?.source==='EXACT_TJK'?'TJK gerçek kayıt':ctx?.source==='LAST_KNOWN_PLUS_SEASONAL'?'son kayıt + mevsimsel tahmin':ctx?.source?'mevsimsel/tahmini pist bağlamı':'pist bağlamı sınırlı';
  const provenance=[clean(result?.cityName||result?.city),clean(result?.date)].filter(Boolean).join(' · ');
  const races=(result?.races||[]).map(r=>{
    const hs=(r?.horses||[]).filter(h=>Number.isFinite(h?.degreeModel?.predictedSec)).sort((a,b)=>a.degreeModel.predictedSec-b.degreeModel.predictedSec).slice(0,4);
    const err=errors.find(x=>String(x?.raceNo)===String(r?.no));
    const rows=hs.length?hs.map(h=>`<tr><td style="padding:5px;text-align:center"><b>${esc(h.degreeModel.rank||'')}</b></td><td style="padding:5px"><b>${esc(h.no)}. ${esc(h.name)}</b></td><td style="padding:5px;text-align:center"><b>${esc(h.degreeModel.predictedText||'—')}</b></td><td style="padding:5px;text-align:center">${esc(h.degreeModel.rangeText||'—')}</td><td style="padding:5px;text-align:center">%${esc(h.degreeModel.confidence??'—')}</td><td style="padding:5px;text-align:center">${esc(h.degreeModel.horseSamples??0)}/${esc(h.degreeModel.baselineSamples??0)}</td><td style="padding:5px;text-align:center">${esc(h.degreeModel.pedigree?.level||'—')} (${esc(h.degreeModel.pedigree?.examples??0)})</td></tr>`).join(''):`<tr><td colspan="7" style="padding:7px;opacity:.7">${err?`Bu koşunun derece hesabı atlandı: ${esc(err.message)}`:'Bu koşuda tahmini derece için yeterli geçmiş derece örneği yok.'}</td></tr>`;
    return `<details style="margin-top:8px" ${String(document.getElementById('analysisRace')?.value||'all')===String(r.no)?'open':''}><summary><b>${esc(r.no)}. Koşu</b>${hs[0]?` · Derece lideri ${esc(hs[0].no)}-${esc(hs[0].name)} ${esc(hs[0].degreeModel.predictedText)}`:''}</summary><div style="overflow-x:auto;margin-top:6px"><table style="width:100%;min-width:620px;border-collapse:collapse;font-size:11px"><thead><tr><th>#</th><th style="text-align:left">At</th><th>Tahmini</th><th>Derece aralığı</th><th>Güven</th><th>Geçmiş</th><th>Orijin</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }).join('');
  const resilient=result?.degreeSpeed?.resilient?`<div style="margin-top:5px;font-size:10px;opacity:.68">Koruma modu aktif${errors.length?` · ${errors.length} koşu hata yalıtıldı`:''}. Bir koşudaki hata diğer koşuların derece hesabını durdurmaz.</div>`:'';
  return `<div id="degreeSpeedShadowF6090" data-ui-guard="${VERSION}" data-analysis-context="${esc(key)}" style="margin:0 0 12px;border:1px solid rgba(126,226,168,.25);border-radius:12px;padding:10px;background:rgba(126,226,168,.04)"><b>DERECE-HIZ · GÖLGE MODEL</b><div style="font-size:11px;opacity:.75;margin-top:4px">Tahmini derece, derece aralığı ve orijin desteği. Ana sıralamayı şimdilik değiştirmez.</div>${provenance?`<div style="font-size:10px;opacity:.62;margin-top:3px">${esc(provenance)}</div>`:''}<div style="margin-top:7px;font-size:11px;line-height:1.6">${esc(source)}${Number.isFinite(w.temperature)?` · ${esc(w.temperature)}°C`:''}${Number.isFinite(w.humidity)?` · Nem %${esc(w.humidity)}`:''}${Number.isFinite(w.pressure)?` · ${esc(w.pressure)} hPa`:''}${w.sky?` · ${esc(w.sky)}`:''}${w.wind?` · ${esc(w.wind)}`:''}</div>${resilient}${races}</div>`;
}
async function resilientEnrich(){
  const engine=window.ATDegreeSpeedF6090,live=rawCurrentResult();
  if(!engine?.enrichCurrent||!live?.races?.length||!sameContext(live))return false;
  const startResult=live,startKey=liveKey();
  const valid=()=>rawCurrentResult()===startResult&&sameContext(startResult)&&liveKey()===startKey;
  try{
    await engine.enrichCurrent();
    if(!valid())return false;
    if(startResult?.degreeSpeed){startResult.degreeSpeed.contextKey=contextKey(startResult);startResult.degreeSpeed.contextDate=clean(startResult.date);startResult.degreeSpeed.contextCity=clean(startResult.city||startResult.cityName);return true}
  }catch(e){console.warn('[AT AI]',VERSION,'toplu derece hesabı başarısız; koşu bazlı koruma başlıyor:',e)}
  if(!valid())return false;
  const result=startResult;
  if(!result?.races?.length)return false;
  const original=[...result.races],errors=[];
  let lastMeta=result.degreeSpeed||null,okCount=0;
  try{
    for(const race of original){
      if(!valid())return false;
      result.races=[race];
      try{
        await engine.enrichCurrent();
        if(!valid())return false;
        lastMeta=result.degreeSpeed||lastMeta;
        if((race?.horses||[]).some(h=>Number.isFinite(h?.degreeModel?.predictedSec)))okCount++;
      }catch(e){
        const item={raceNo:race?.no??'',message:shortError(e)};
        errors.push(item);
        console.warn('[AT AI]',VERSION,`${item.raceNo}. koşu derece hesabı atlandı:`,e);
      }
    }
  }finally{
    result.races=original;
  }
  if(!valid())return false;
  result.degreeSpeed={...(lastMeta||{}),version:VERSION,shadow:true,resilient:true,errors,successfulRaceCount:okCount,totalRaceCount:original.length,contextKey:contextKey(result),contextDate:clean(result.date),contextCity:clean(result.city||result.cityName),generatedAt:new Date().toISOString()};
  try{save()}catch{}
  return true;
}
async function ensureCard(result=null){
  clearStaleCard();
  const initial=result&&sameContext(result)?result:currentResult(),content=document.getElementById('analysisContent');
  if(!initial?.races?.length||!content)return;
  if(!currentResult()?.degreeSpeed&&window.ATDegreeSpeedF6090?.enrichCurrent&&!enriching){
    enriching=true;try{await resilientEnrich()}finally{enriching=false}
  }
  const rr=currentResult();if(!rr?.degreeSpeed)return;
  const expected=contextKey(rr),existing=document.getElementById('degreeSpeedShadowF6090');
  if(existing){if(clean(existing.dataset.analysisContext)===expected)return;existing.remove()}
  if(!sameContext(rr))return;
  content.insertAdjacentHTML('afterbegin',cardHtml(rr));
}
function schedule(result=null){clearTimeout(timer);timer=setTimeout(()=>{void ensureCard(result)},20)}
try{
  if(typeof gRenderCurrentV1657==='function'){
    const priorRender=gRenderCurrentV1657;
    gRenderCurrentV1657=function(result,raceFilter='all'){const out=priorRender(result,raceFilter);if(sameContext(result))schedule(result);else clearStaleCard();return out};
  }
  if(typeof gRunCurrentV1657==='function'){
    const priorRun=gRunCurrentV1657;
    gRunCurrentV1657=async function(){const start=liveKey(),out=await priorRun();if(liveKey()!==start){clearStaleCard();return out}await ensureCard(currentResult());return out};
  }
}catch(e){console.warn('[AT AI]',VERSION,'hook:',e)}
function attachObserver(){
  const content=document.getElementById('analysisContent');if(!content||content===watched)return;
  try{observer?.disconnect()}catch{}watched=content;
  observer=new MutationObserver(()=>{clearStaleCard();if(!document.getElementById('degreeSpeedShadowF6090'))schedule(currentResult())});
  observer.observe(content,{childList:true});clearStaleCard();schedule(currentResult());
}
function contextChanged(){clearTimeout(timer);clearStaleCard();schedule(currentResult())}
for(const id of['raceDate','citySelect','analysisRace'])document.addEventListener('change',e=>{if(e?.target?.id===id)contextChanged()},true);
setInterval(()=>{attachObserver();clearStaleCard()},1200);attachObserver();
window.ATDegreeSpeedUiGuardF6094={version:VERSION,ensure:ensureCard,resilientEnrich,currentContextKey:liveKey,sameContext};
console.info('[AT AI]',VERSION,'aktif — derece kartı tarih/şehir bağlamına kilitli; eski gün sonucu yeni güne taşınmaz.');
})();