/* AT AI Mobil — V16.9.1F12 STRICT CLASS/GROUP + CARRIED WEIGHT
   - Kariyer yolu satırları yalnız yarış sınıfı TAM ve yarış/yaş grubu TAM ise eşleşebilir.
   - Uyuşmayan sınıf/grup DP hizalamasında gerçek eşleşme sayılmaz.
   - Taşınan sıklet mevcut üretim skoruna eklenir; eksik kilo 0 cezası değildir.
   - Galibiyet sıklet profili ve geçmiş yarış tablolarında sıklet görünür.
   - F11 açıklama butonları strict kuralla yeniden izlenir.
*/
(() => {
'use strict';
if (window.__AT_CAREER_STRICT_CLASS_GROUP_WEIGHT_V1691F12__) return;
window.__AT_CAREER_STRICT_CLASS_GROUP_WEIGHT_V1691F12__=true;
const VERSION='CAREER-STRICT-CLASS-GROUP-WEIGHT-V16.9.1F12';
const GAP=-0.18, MATCH_BASE=0.35, MAX_SHOW=5;
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(',','.').match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.') ?? v);return Number.isFinite(n)?n:null};
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const finish=r=>finite(r?.finish??r?.rank??r?.sira);
const norm=v=>{
  try { if(typeof normalizeTextV11==='function') return normalizeTextV11(v); } catch{}
  return String(v??'').toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
};
const classValue=r=>norm(r?.class??r?.raceClass??r?.classRaw??r?.yaradi1??'');
function canonicalGroup(v){
  const raw=String(v??'').toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
  const n=norm(v),age=raw.match(/\d+/)?.[0]||'';
  const plus=/\d\s*\+|\bVE\s+YUKARI\b|\bVE\s+UZERI\b|\bVE\s+USTU\b|\bYUKARI\b|\bUZERI\b/.test(raw);
  const breed=/\bARAP/.test(raw)?'ARAP':(/\bING/.test(raw)?'INGILIZ':'');
  const gender=/\bDISI\b/.test(raw)?' DISI':'';
  return age&&breed?`${age}${plus?'+':''} ${breed}${gender}`:n;
}
const groupValue=r=>canonicalGroup(r?.ageGroup??r?.group??r?.groupRaw??r?.yaradi2??'');
const carried=r=>finite(r?.weight??r?.siklet??r?.kilo??r?.carriedWeight??r?.kg);

function strictCompatible(a,b){
  const ac=classValue(a),bc=classValue(b),ag=groupValue(a),bg=groupValue(b);
  return Boolean(ac&&bc&&ag&&bg&&ac===bc&&ag===bg);
}
function weightSimilarity(a,b){
  const x=carried(a),y=carried(b);if(x===null||y===null)return null;
  const d=Math.abs(x-y);
  if(d<=0.5)return 1;
  if(d<=1.5)return .90;
  if(d<=3)return .75;
  if(d<=5)return .50;
  return .25;
}
window.strictCareerCompatibleV1691F12=strictCompatible;
window.carriedWeightSimilarityV1691F12=weightSimilarity;

const rowBefore=typeof careerRowSimilarity==='function'?careerRowSimilarity:null;
careerRowSimilarity=function(a,b){
  if(!a||!b||!strictCompatible(a,b)) return -1;
  let base=0;
  try { base=rowBefore?Number(rowBefore(a,b)):0; } catch { base=0; }
  base=clamp(base);
  const w=weightSimilarity(a,b);
  return w===null?base:clamp(base*.82+w*.18);
};

/* Yeni hesaplarda hangi kuralın kullanıldığı arşive/sim nesnesine işlensin. */
if(typeof calculateGalibiyetBenzerligi==='function'){
  const calcBefore=calculateGalibiyetBenzerligi;
  calculateGalibiyetBenzerligi=function(...args){
    const out=calcBefore(...args)||{};
    out.strictRowMatchVersion=VERSION;
    out.rowMatchRule='EXACT_CLASS + EXACT_AGE_GROUP + CARRIED_WEIGHT';
    return out;
  };
}
try { if(typeof careerModelCacheV112!=='undefined') careerModelCacheV112.clear(); } catch{}

function rowsOfCareer(c={}){
  for(const x of [c.history,c.fullPathBefore,c.historyBefore,c.roadmap,c.roadmapBefore,c.comparisonPathBefore,c.top5]) if(Array.isArray(x)&&x.length)return x;
  return [];
}
function avg(xs){return xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:null}
function median(xs){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function fmtKg(v){return v===null?'—':`${Number(v.toFixed(2))} kg`}
function weightProfileHtml(career={}){
  const rows=rowsOfCareer(career),all=rows.map(carried).filter(x=>x!==null),wins=rows.filter(r=>finish(r)===1).map(carried).filter(x=>x!==null);
  if(!all.length)return '';
  const allAvg=avg(all),med=median(all),winAvg=avg(wins),winMin=wins.length?Math.min(...wins):null,winMax=wins.length?Math.max(...wins):null;
  let label='Galibiyet sıklet verisi yok';
  if(winAvg!==null&&allAvg!==null){const d=winAvg-allAvg;label=d<=-1?'Hafif kilo eğilimi':d>=1?'Ağır kilo eğilimi':'Dengeli kilo profili';}
  return `<div style="margin:8px 0 10px;padding:9px;border:1px solid rgba(114,213,255,.20);border-radius:9px;background:rgba(114,213,255,.055);font-size:10px;line-height:1.5"><b>⚖ GALİBİYET SIKLET PROFİLİ · ${esc(label)}</b><br>Tüm yarışlar ort.: <b>${esc(fmtKg(allAvg))}</b> · medyan: <b>${esc(fmtKg(med))}</b>${wins.length?`<br>Galibiyetler: <b>${esc(fmtKg(winAvg))}</b> ort. · aralık <b>${esc(fmtKg(winMin))}–${esc(fmtKg(winMax))}</b> · ${esc(wins.length)} galibiyet`:''}</div>`;
}
const summaryBefore=typeof careerSummaryHtml==='function'?careerSummaryHtml:null;
if(summaryBefore){careerSummaryHtml=function(career){return (summaryBefore(career)||'')+weightProfileHtml(career||{});};}

/* Kariyer geçmiş tablosu: kilo alanlarının tüm olası adlarını görünür yap. */
roadmapTableHtml=function(roadmap){
  const rows=Array.isArray(roadmap)?roadmap:[];
  if(!rows.length)return '<div style="padding:10px;opacity:.7;">Karşılaştırılabilir kariyer yolu bulunamadı.</div>';
  const td=v=>`<td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${esc(v??'-')}</td>`;
  return `<div style="font-size:11px;font-weight:800;letter-spacing:.04em;opacity:.75;margin:10px 0 6px;">KARİYER YOLU — PUANA GİREN KAYNAK KOŞULAR</div><div style="overflow-x:auto;width:100%;"><table style="width:100%;border-collapse:collapse;font-size:11px;min-width:1050px"><thead><tr>${['Tarih','İl','Sıra','Sınıf','Yaş/Grup','Irk','Kilo Şartı','Sıklet','HP','Pist','Mesafe'].map(x=>`<th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>{const f=finish(r),w=carried(r);let breed='-';try{breed=typeof breedLabelV112==='function'?breedLabelV112(r):'-'}catch{}let wc='-';try{wc=typeof weightConditionLabelV112==='function'?weightConditionLabelV112(r):'-'}catch{}return `<tr style="${f===1?'background:rgba(34,197,94,.12);':''}">${td(`${f===1?'🏆 ':''}${clean(r?.date||r?.isoDate)||'-'}`)}${td(r?.city||r?.sehir||'-')}${td(f??'-')}${td(r?.class||r?.raceClass||'-')}${td(r?.ageGroup||r?.group||'-')}${td(breed)}${td(wc)}${td(w===null?'-':w)}${td(r?.hp??'-')}${td(r?.track||r?.pist||'-')}${td(r?.distance||r?.mesafe||r?.msf||'-')}</tr>`}).join('')}</tbody></table></div><div style="font-size:10px;opacity:.62;margin-top:6px;line-height:1.45">Sınıf ve Yaş/Grup artık zorunlu tam eşleşme kapısıdır. Sıklet mevcutsa benzerlik puanına girer; eksik sıklet 0 cezası değildir.</div>`;
};

function currentItemFromButton(btn){
  const horseBox=btn.closest?.('[data-v139-horse]');
  if(!horseBox)return null;
  const idx=Number(horseBox.dataset.v139Horse||0),sel=String(document.getElementById('analysisRace')?.value||'');
  const races=Array.isArray(state?.analyses?.career?.races)?state.analyses.career.races:[];
  const race=races.find(r=>String(r?.no)===sel);if(!race)return null;
  const items=typeof sortCareerItemsV139==='function'?sortCareerItemsV139(Array.isArray(race.horses)?race.horses:[]):(race.horses||[]);
  return items[idx]||null;
}
function currentPath(item){const c=item?.career||{};for(const x of [c.roadmap,c.history,c.fullPathBefore,c.historyBefore])if(Array.isArray(x)&&x.length)return x;return []}
function modeOf(item,row){return row?.analysisMode||item?.career?.analysisMode||item?.galibiyetBenzerligi?.analysisMode||''}
function refPath(career,mode){try{if(typeof adaptiveReferencePath==='function')return adaptiveReferencePath({career},mode)||[]}catch{}if(mode==='WIN_PATH')return (career?.winsBefore||career?.wins||[]).filter(x=>finish(x)===1);const t=career?.top5Before||career?.top5||[];return t.length?t:(career?.preparationPathBefore||career?.preparationPath||[])}
const refCache=new Map();
async function refCareer(row){const id=clean(row?.historicalHorseId),before=clean(row?.raceDate);if(!id||!before)throw new Error('Referans at kimliği/tarihi yok.');const k=id+'|'+before;if(refCache.has(k))return refCache.get(k);const p=(async()=>{const c=await fetchCareer(id,before);if(!c?.ok)throw new Error(c?.error||'Referans kariyeri alınamadı.');return c})();refCache.set(k,p);try{return await p}catch(e){refCache.delete(k);throw e}}
function trace(a,b){const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>Array(m+1).fill(0)),act=Array.from({length:n+1},()=>Array(m+1).fill(''));for(let i=1;i<=n;i++){dp[i][0]=i*GAP;act[i][0]='D'}for(let j=1;j<=m;j++){dp[0][j]=j*GAP;act[0][j]='I'}for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){const ok=strictCompatible(a[i-1],b[j-1]),local=ok?clamp(careerRowSimilarity(a[i-1],b[j-1])):-1,ma=ok?dp[i-1][j-1]+local-MATCH_BASE:-Infinity,de=dp[i-1][j]+GAP,ins=dp[i][j-1]+GAP;if(ma>=de&&ma>=ins){dp[i][j]=ma;act[i][j]='M'}else if(de>=ins){dp[i][j]=de;act[i][j]='D'}else{dp[i][j]=ins;act[i][j]='I'}}const pairs=[];let i=n,j=m,gaps=0;while(i||j){const z=act[i][j];if(z==='M'){pairs.push({a:a[i-1],b:b[j-1],local:clamp(careerRowSimilarity(a[i-1],b[j-1]))});i--;j--}else if(z==='D'){i--;gaps++}else{j--;gaps++}}pairs.reverse();return{pairs,gaps}}
function criterion(fn,args){try{if(typeof fn!=='function')return null;const n=Number(fn(...args));return Number.isFinite(n)?Math.round(clamp(n)*100):null}catch{return null}}
function pairHtml(p,name,i){const w=weightSimilarity(p.a,p.b),parts=[['Mesafe',criterion(typeof distanceSimilarity==='function'?distanceSimilarity:null,[p.a?.distance||p.a?.mesafe||p.a?.msf,p.b?.distance||p.b?.mesafe||p.b?.msf])],['Pist',criterion(typeof trackSimilarity==='function'?trackSimilarity:null,[p.a?.track||p.a?.pist,p.b?.track||p.b?.pist])],['Şehir',criterion(typeof citySimilarity==='function'?citySimilarity:null,[p.a?.city,p.b?.city])],['HP',criterion(typeof hpSimilarityV11==='function'?hpSimilarityV11:null,[p.a?.hp,p.b?.hp])],['Sıklet',w===null?null:Math.round(w*100)]].filter(x=>x[1]!==null);const line=(r,prefix)=>`${esc(prefix)} ${esc(clean(r?.date||r?.isoDate)||'-')} · ${esc(r?.city||r?.sehir||'-')} · ${esc(r?.class||r?.raceClass||'-')} · ${esc(r?.ageGroup||r?.group||'-')} · ${esc(r?.distance||r?.mesafe||r?.msf||'-')} ${esc(r?.track||r?.pist||'-')}${finish(r)!==null?` · ${esc(finish(r))}.`:''}${carried(r)!==null?` · ${esc(carried(r))} kg`:''}${finite(r?.hp)!==null?` · HP ${esc(finite(r?.hp))}`:''}`;return `<div class="cpm-pair-v1691f11"><div class="cpm-pair-head-v1691f11"><b>${i+1}. güçlü koşu çifti</b><strong>%${Math.round(p.local*100)}</strong></div><div class="cpm-rowline-v1691f11"><b>${line(p.a,'Bugünkü atın yolu:')}</b></div><div class="cpm-rowline-v1691f11">${line(p.b,(name||'Referans')+' yolu:')}</div><div class="cpm-criteria-v1691f11"><span>Sınıf <b>✓ TAM</b></span><span>Yaş/Grup <b>✓ TAM</b></span>${parts.map(([k,v])=>`<span>${esc(k)} <b>%${esc(v)}</b></span>`).join('')}</div></div>`}
async function loadStrict(btn,out){const item=currentItemFromButton(btn);if(!item)throw new Error('Aktif at bulunamadı.');const sim=item.galibiyetBenzerligi||{},year=btn.dataset.cpmYear,row=(sim.byYear||[]).find(x=>String(x?.year)===String(year));if(!row)throw new Error('Tarihsel yıl referansı bulunamadı.');const path=currentPath(item);if(!path.length)throw new Error('Bugünkü kariyer yolu yok.');out.innerHTML='<div class="cpm-loading-v1691f11">Tam sınıf/grup eşleşmeleri hazırlanıyor…</div>';const c=await refCareer(row),rp=refPath(c,modeOf(item,row));const tr=trace(path,rp),shown=[...tr.pairs].sort((x,y)=>y.local-x.local).slice(0,MAX_SHOW);out.innerHTML=`<div class="cpm-note-v1691f11"><b>${esc(year)} · ${esc(row.historicalHorse||'-')}</b><br>Sadece <b>aynı yarış sınıfı + aynı Yaş/Grup</b> satırları hizalandı. Farklı sınıf/grup yarışlar dışlandı. Taşınan sıklet mevcutsa puana dahildir. Eşleşen çift: ${esc(tr.pairs.length)} · boşluk: ${esc(tr.gaps)}.</div>${shown.length?shown.map((p,i)=>pairHtml(p,row.historicalHorse,i)).join(''):'<div class="cpm-loading-v1691f11">Tam sınıf + tam grup şartını sağlayan koşu çifti yok.</div>'}`}

/* F11 butonunu capture aşamasında sahiplen: eski fuzzy açıklama çalışmasın. */
document.addEventListener('click',e=>{if(window.__AT_CAREER_PATH_EXPLAIN_STATE_FIX_V1691F13__||window.__AT_CAREER_PATH_EXPLAIN_STATE_FIX_V1691F14__)return;const btn=e.target?.closest?.('[data-cpm-token][data-cpm-year]');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const key=(btn.dataset.cpmToken||'')+'-'+(btn.dataset.cpmYear||''),out=[...document.querySelectorAll('[data-cpm-out]')].find(x=>x.getAttribute('data-cpm-out')===key);if(!out)return;if(out.dataset.strictLoaded==='1'){out.innerHTML='';out.dataset.strictLoaded='0';return}out.dataset.strictLoaded='1';loadStrict(btn,out).catch(err=>{out.innerHTML=`<div class="cpm-loading-v1691f11">⚠ ${esc(err?.message||err)}</div>`})},true);

/* Eski arşiv skorunun yeni kuraldan önce üretildiğini görünür belirt. */
const renderBefore=typeof renderCareerAnalysis==='function'?renderCareerAnalysis:null;
if(renderBefore){renderCareerAnalysis=function(result,...rest){const out=renderBefore(result,...rest);try{const strict=(result?.races||[]).some(r=>(r?.horses||[]).some(i=>i?.galibiyetBenzerligi?.strictRowMatchVersion===VERSION));if(!strict){const c=document.getElementById('analysisContent');if(c&&!c.querySelector('[data-strict-old-warning]'))c.insertAdjacentHTML('afterbegin','<div data-strict-old-warning style="margin:0 0 9px;padding:8px 9px;border:1px solid rgba(255,183,77,.35);border-radius:8px;background:rgba(255,183,77,.08);font-size:10px;line-height:1.45">⚠ Bu arşiv sonucu eski esnek sınıf/grup kuralıyla hesaplanmış. Yeni <b>TAM sınıf + TAM Yaş/Grup + Sıklet</b> puanı için bu koşuda <b>Yeniden Hesapla</b> işlemini bir kez çalıştır.</div>')}}catch{}return out};}

window.__AT_CAREER_STRICT_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif — farklı sınıf/grup satırları eşleşmez; sıklet puana ve geçmiş döküme dahildir.');
})();
