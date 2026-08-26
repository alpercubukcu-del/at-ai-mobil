/* AT AI Mobil — V16.9.1F13 EXPLAIN PATH STATE FIX
   - F12 strict skorunu değiştirmez.
   - Açıklama katmanı V13.9 ile aynı geniş kariyer alanlarını kullanır.
   - Eski arşiv skoru ile F12 strict skorunu görünür biçimde ayırır.
*/
(() => {
'use strict';
if (window.__AT_CAREER_PATH_EXPLAIN_STATE_FIX_V1691F13__) return;
window.__AT_CAREER_PATH_EXPLAIN_STATE_FIX_V1691F13__=true;
const VERSION='CAREER-PATH-EXPLAIN-STATE-FIX-V16.9.1F13';
const GAP=-0.18, MATCH_BASE=0.35, MAX_SHOW=5;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(',','.').match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.')??v);return Number.isFinite(n)?n:null};
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const finish=r=>finite(r?.finish??r?.rank??r?.sira);
const carried=r=>finite(r?.weight??r?.siklet??r?.kilo??r?.carriedWeight??r?.kg);

function currentItem(btn){
  const box=btn.closest?.('[data-v139-horse]'); if(!box) return null;
  const idx=Number(box.dataset.v139Horse||0);
  const sel=String(document.getElementById('analysisRace')?.value||'');
  const race=(Array.isArray(state?.analyses?.career?.races)?state.analyses.career.races:[]).find(r=>String(r?.no)===sel);
  if(!race) return null;
  const items=typeof sortCareerItemsV139==='function'?sortCareerItemsV139(Array.isArray(race.horses)?race.horses:[]):(race.horses||[]);
  return items[idx]||null;
}
function pathOf(c={}){
  for(const x of [
    c.roadmap,
    c.fullPathBefore,
    c.historyBefore,
    c.comparisonPathBefore,
    c.roadmapBefore,
    c.history,
    c.comparisonPath,
    c.top5,
    c.preparationPath,
    c.fullHistory,
    c.recentForm
  ]) if(Array.isArray(x)&&x.length) return x;
  return [];
}
function modeOf(item,row){return row?.analysisMode||item?.career?.analysisMode||item?.galibiyetBenzerligi?.analysisMode||'';}
function refPath(career,mode){
  try{if(typeof adaptiveReferencePath==='function'){const x=adaptiveReferencePath({career},mode);if(Array.isArray(x)&&x.length)return x;}}catch{}
  if(mode==='WIN_PATH'){
    const w=career?.winsBefore||career?.wins||[]; if(w.length)return w.filter(r=>finish(r)===1);
    return pathOf(career).filter(r=>finish(r)===1);
  }
  for(const x of [career?.top5Before,career?.top5,career?.preparationPathBefore,career?.preparationPath,career?.comparisonPathBefore,career?.roadmapBefore,career?.historyBefore,career?.fullPathBefore])
    if(Array.isArray(x)&&x.length)return x;
  return [];
}
const refCache=new Map();
async function loadRef(row){
  const id=clean(row?.historicalHorseId),before=clean(row?.raceDate);
  if(!id||!before) throw new Error('Referans at kimliği veya yarış tarihi arşivde yok.');
  const key=id+'|'+before; if(refCache.has(key)) return refCache.get(key);
  const p=(async()=>{if(typeof fetchCareer!=='function')throw new Error('Kariyer yükleme fonksiyonu yok.');const c=await fetchCareer(id,before);if(!c?.ok)throw new Error(c?.error||'Referans kariyeri alınamadı.');return c;})();
  refCache.set(key,p); try{return await p}catch(e){refCache.delete(key);throw e}
}
function compatible(a,b){try{return typeof strictCareerCompatibleV1691F12==='function'?strictCareerCompatibleV1691F12(a,b):true}catch{return true}}
function local(a,b){if(!compatible(a,b))return -1;try{return clamp(careerRowSimilarity(a,b))}catch{return 0}}
function trace(a,b){
  const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>Array(m+1).fill(0)),act=Array.from({length:n+1},()=>Array(m+1).fill(''));
  for(let i=1;i<=n;i++){dp[i][0]=i*GAP;act[i][0]='D'}
  for(let j=1;j<=m;j++){dp[0][j]=j*GAP;act[0][j]='I'}
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){
    const l=local(a[i-1],b[j-1]),ma=l>=0?dp[i-1][j-1]+l-MATCH_BASE:-Infinity,de=dp[i-1][j]+GAP,ins=dp[i][j-1]+GAP;
    if(ma>=de&&ma>=ins){dp[i][j]=ma;act[i][j]='M'}else if(de>=ins){dp[i][j]=de;act[i][j]='D'}else{dp[i][j]=ins;act[i][j]='I'}
  }
  const pairs=[];let i=n,j=m,gaps=0;
  while(i||j){const z=act[i][j];if(z==='M'){pairs.push({a:a[i-1],b:b[j-1],local:local(a[i-1],b[j-1])});i--;j--}else if(z==='D'){i--;gaps++}else{j--;gaps++}}
  return {pairs:pairs.reverse(),gaps};
}
function criterion(fn,args){try{if(typeof fn!=='function')return null;const n=Number(fn(...args));return Number.isFinite(n)?Math.round(clamp(n)*100):null}catch{return null}}
function weightSim(a,b){try{if(typeof carriedWeightSimilarityV1691F12==='function'){const x=carriedWeightSimilarityV1691F12(a?.weight??a?.siklet??a?.kilo??a?.carriedWeight??a?.kg,b?.weight??b?.siklet??b?.kilo??b?.carriedWeight??b?.kg);return finite(x)}}catch{}return null}
function line(r,prefix){return `${esc(prefix)} ${esc(clean(r?.date||r?.isoDate)||'-')} · ${esc(r?.city||r?.sehir||'-')} · ${esc(r?.class||r?.raceClass||'-')} · ${esc(r?.ageGroup||r?.group||'-')} · ${esc(r?.distance||r?.mesafe||r?.msf||'-')} ${esc(r?.track||r?.pist||'-')}${finish(r)!==null?` · ${esc(finish(r))}.`:''}${carried(r)!==null?` · ${esc(carried(r))} kg`:''}${finite(r?.hp)!==null?` · HP ${esc(finite(r?.hp))}`:''}`}
function pairHtml(p,name,i){
  const w=weightSim(p.a,p.b),parts=[
    ['Mesafe',criterion(typeof distanceSimilarity==='function'?distanceSimilarity:null,[p.a?.distance||p.a?.mesafe||p.a?.msf,p.b?.distance||p.b?.mesafe||p.b?.msf])],
    ['Pist',criterion(typeof trackSimilarity==='function'?trackSimilarity:null,[p.a?.track||p.a?.pist,p.b?.track||p.b?.pist])],
    ['Şehir',criterion(typeof citySimilarity==='function'?citySimilarity:null,[p.a?.city,p.b?.city])],
    ['HP',criterion(typeof hpSimilarityV11==='function'?hpSimilarityV11:null,[p.a?.hp,p.b?.hp])],
    ['Sıklet',w===null?null:Math.round(clamp(w)*100)]
  ].filter(x=>x[1]!==null);
  return `<div class="cpm-pair-v1691f11"><div class="cpm-pair-head-v1691f11"><b>${i+1}. güçlü koşu çifti</b><strong>%${Math.round(clamp(p.local)*100)}</strong></div><div class="cpm-rowline-v1691f11"><b>${line(p.a,'Bugünkü atın yolu:')}</b></div><div class="cpm-rowline-v1691f11">${line(p.b,(name||'Referans')+' yolu:')}</div><div class="cpm-criteria-v1691f11"><span>Sınıf <b>✓ TAM</b></span><span>Yaş/Grup <b>✓ TAM</b></span>${parts.map(([k,v])=>`<span>${esc(k)} <b>%${esc(v)}</b></span>`).join('')}</div></div>`;
}
async function renderFixed(btn,out){
  const item=currentItem(btn); if(!item) throw new Error('Aktif at bulunamadı.');
  const sim=item?.galibiyetBenzerligi||{},year=btn.dataset.cpmYear;
  const row=(Array.isArray(sim.byYear)?sim.byYear:[]).find(x=>String(x?.year)===String(year)); if(!row) throw new Error('Tarihsel yıl referansı bulunamadı.');
  const path=pathOf(item?.career||{});
  if(!path.length) throw new Error('Bugünkü atın arşivlenmiş kariyer yolu gerçekten yok. Bu puan eski/eksik arşivden geliyor; Yeniden Hesapla kullanın.');
  out.innerHTML='<div class="cpm-loading-v1691f11">Referans atın yarış öncesi kariyeri okunuyor…</div>';
  const rc=await loadRef(row),rp=refPath(rc,modeOf(item,row)); if(!rp.length) throw new Error('Referans atın karşılaştırılabilir yarış öncesi yolu yok.');
  const t=trace(path,rp),pairs=t.pairs.filter(p=>p.local>=MATCH_BASE).sort((a,b)=>b.local-a.local).slice(0,MAX_SHOW);
  const strict=sim?.strictRowMatchVersion==='CAREER-STRICT-CLASS-GROUP-WEIGHT-V16.9.1F12';
  if(!pairs.length){
    out.innerHTML=`<div class="cpm-note-v1691f11"><b>Katı sınıf + Yaş/Grup kuralında eşleşen koşu çifti bulunamadı.</b><br>${strict?'Bu durumda görünen tarihsel puan yeniden kontrol edilmelidir.':'Görünen %'+esc(row?.score??sim?.score??'-')+' eski arşiv kuralından kalmış olabilir. Bu koşuda Yeniden Hesapla yapın.'}</div>`;
    return;
  }
  out.innerHTML=`<div class="cpm-note-v1691f11"><b>${esc(year)} · ${esc(row?.historicalHorse||'-')} · ${strict?'F12 KATI EŞLEŞME':'ESKİ ARŞİV PUANI'}</b><br>Aktif kariyer yolu: ${esc(path.length)} yarış · strict eşleşen çift: ${esc(t.pairs.length)} · boşluk: ${esc(t.gaps)}.${strict?'':' Görünen ana puanı yeni sınıf/grup+kilo kuralına geçirmek için bu koşuda Yeniden Hesapla yapın.'}</div>${pairs.map((p,i)=>pairHtml(p,row?.historicalHorse||'Referans',i)).join('')}`;
}

/* F11/F12 document bubble handlerlarından önce yakala ve düzeltilmiş yolu kullan. */
document.addEventListener('click',e=>{
  const btn=e.target?.closest?.('[data-cpm-token]'); if(!btn) return;
  const dialog=document.getElementById('analysisDialog'); if(dialog?.dataset?.view!=='career') return;
  e.preventDefault(); e.stopImmediatePropagation();
  const ref=btn.closest('.cpm-ref-v1691f11'); const out=ref?.querySelector('.cpm-out-v1691f11'); if(!out) return;
  if(out.dataset.v13loaded==='1'){out.innerHTML='';out.dataset.v13loaded='0';return;}
  out.dataset.v13loaded='1';
  renderFixed(btn,out).catch(err=>{out.innerHTML=`<div class="cpm-note-v1691f11">⚠ ${esc(err?.message||String(err))}</div>`;});
},true);

/* Puanın hangi kuralla üretildiğini görünür yap. */
const yearBefore=typeof yearSimilarityHtml==='function'?yearSimilarityHtml:null;
if(yearBefore){
  yearSimilarityHtml=function(sim){
    const html=yearBefore(sim);
    const strict=sim?.strictRowMatchVersion==='CAREER-STRICT-CLASS-GROUP-WEIGHT-V16.9.1F12';
    const badge=`<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:${strict?'rgba(126,226,168,.08)':'rgba(255,173,102,.09)'};border:1px solid ${strict?'rgba(126,226,168,.22)':'rgba(255,173,102,.25)'}"><b>${strict?'✓ F12 katı sınıf + Yaş/Grup + sıklet kuralı':'⚠ Eski arşiv puanı'}</b>${strict?'':' · Yeni kurala geçirmek için Yeniden Hesapla.'}</div>`;
    return badge+html;
  };
}
console.info('[AT AI]',VERSION,'aktif — açıklama yolu V13.9 alanlarıyla senkron');
})();