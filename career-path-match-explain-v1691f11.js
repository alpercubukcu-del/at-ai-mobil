/* AT AI Mobil — V16.9.1F11 Kariyer Yol Haritası uyum açıklaması
   - Mevcut Kariyer/Hazırlık puanını ve sıralamayı DEĞİŞTİRMEZ.
   - Mevcut arşiv sonucunu yeniden hesaplatmaz.
   - Kullanıcı isterse seçilen tarihsel referans atın yarış öncesi kariyerini lazy yükler.
   - orderedPathSimilarity ile aynı DP hizalamasını tekrar kurup en güçlü koşu çiftlerini gösterir.
*/
(() => {
'use strict';
if (window.__AT_CAREER_PATH_MATCH_EXPLAIN_V1691F11__) return;
window.__AT_CAREER_PATH_MATCH_EXPLAIN_V1691F11__ = true;
const VERSION='CAREER-PATH-MATCH-EXPLAIN-V16.9.1F11';
const GAP=-0.18;
const MATCH_BASE=0.35;
const MAX_SHOW=5;
const $=id=>document.getElementById(id);
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const clamp01x=v=>Math.max(0,Math.min(1,Number(v)||0));
const finish=r=>finite(r?.finish??r?.rank??r?.sira);
const rowDate=r=>clean(r?.date||r?.isoDate||'');
const rowClass=r=>clean(r?.class||r?.raceClass||'-');
const rowAge=r=>clean(r?.ageGroup||r?.group||'-');
const rowTrack=r=>clean(r?.track||r?.pist||'-');
const rowDistance=r=>clean(r?.distance||r?.mesafe||r?.msf||'-');
const rowCity=r=>clean(r?.city||r?.sehir||'-');
const rowHp=r=>finite(r?.hp);
const tokenMap=new Map();
const refCareerCache=new Map();
let tokenSeq=0;

function currentItemForSim(sim){
  try{
    for(const race of (Array.isArray(state?.analyses?.career?.races)?state.analyses.career.races:[])){
      for(const item of (Array.isArray(race?.horses)?race.horses:[])){
        if(item?.galibiyetBenzerligi===sim) return item;
      }
    }
  }catch{}
  return null;
}
function currentPath(item){
  const c=item?.career||{};
  if(Array.isArray(c.roadmap)&&c.roadmap.length)return c.roadmap;
  if(Array.isArray(c.history)&&c.history.length)return c.history;
  return [];
}
function modeOf(item,row){
  const path=currentPath(item);
  return row?.analysisMode||item?.career?.analysisMode||item?.galibiyetBenzerligi?.analysisMode||
    (typeof adaptiveCurrentMode==='function'?adaptiveCurrentMode(path):'');
}
function refPath(career,mode){
  try{
    if(typeof adaptiveReferencePath==='function') return adaptiveReferencePath({career},mode)||[];
  }catch{}
  if(mode==='WIN_PATH') return (career?.winsBefore||career?.wins||[]).filter(x=>finish(x)===1);
  const top5=career?.top5Before||career?.top5||[];
  return top5.length?top5:(career?.preparationPathBefore||career?.preparationPath||[]);
}
function localSimilarity(a,b){
  try{
    if(typeof strictCareerCompatibleV1691F12==='function'&&!strictCareerCompatibleV1691F12(a,b))return -1;
    if(typeof careerRowSimilarity!=='function')return 0;
    const x=Number(careerRowSimilarity(a,b));
    return Number.isFinite(x)?x:-1;
  }catch{return -1}
}
function traceOrderedPath(a0,b0){
  const a=Array.isArray(a0)?a0:[],b=Array.isArray(b0)?b0:[];
  const n=a.length,m=b.length;if(!n||!m)return{pairs:[],gaps:n+m};
  const dp=Array.from({length:n+1},()=>Array(m+1).fill(0));
  for(let i=1;i<=n;i++)dp[i][0]=i*GAP;
  for(let j=1;j<=m;j++)dp[0][j]=j*GAP;
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){
    const local=localSimilarity(a[i-1],b[j-1]);
    const match=dp[i-1][j-1]+(local-MATCH_BASE);
    const del=dp[i-1][j]+GAP,ins=dp[i][j-1]+GAP;
    dp[i][j]=Math.max(match,del,ins);
  }
  const pairs=[];let gaps=0,i=n,j=m;
  const near=(x,y)=>Math.abs(x-y)<1e-8;
  while(i>0||j>0){
    if(i>0&&j>0){
      const local=localSimilarity(a[i-1],b[j-1]);
      const match=dp[i-1][j-1]+(local-MATCH_BASE);
      if(near(dp[i][j],match)||match>=Math.max(i>0?dp[i-1][j]+GAP:-Infinity,j>0?dp[i][j-1]+GAP:-Infinity)-1e-8){
        pairs.push({a:a[i-1],b:b[j-1],local,positive:local>=MATCH_BASE});i--;j--;continue;
      }
    }
    if(i>0&&near(dp[i][j],dp[i-1][j]+GAP)){i--;gaps++;continue;}
    if(j>0){j--;gaps++;continue;}
    i--;gaps++;
  }
  pairs.reverse();
  return{pairs,gaps};
}
function criterion(fn,args){
  try{if(typeof fn!=='function')return null;const x=finite(fn(...args));return x===null?null:Math.round(clamp01x(x)*100)}catch{return null}
}
function criteria(a,b){
  return [
    ['Sınıf',criterion(typeof classSimilarity==='function'?classSimilarity:null,[a?.class||a?.raceClass,b?.class||b?.raceClass])],
    ['Yaş',criterion(typeof ageGroupSimilarity==='function'?ageGroupSimilarity:null,[a?.ageGroup||a?.group,b?.ageGroup||b?.group])],
    ['Mesafe',criterion(typeof distanceSimilarity==='function'?distanceSimilarity:null,[a?.distance||a?.mesafe||a?.msf,b?.distance||b?.mesafe||b?.msf])],
    ['Pist',criterion(typeof trackSimilarity==='function'?trackSimilarity:null,[a?.track||a?.pist,b?.track||b?.pist])],
    ['Şehir',criterion(typeof citySimilarity==='function'?citySimilarity:null,[a?.city,b?.city])],
    ['HP',criterion(typeof hpSimilarityV11==='function'?hpSimilarityV11:null,[a?.hp,b?.hp])]
  ].filter(x=>x[1]!==null);
}
function rowLine(r,prefix){
  const f=finish(r);
  return `<div class="cpm-rowline-v1691f11"><b>${esc(prefix)}</b> ${esc(rowDate(r)||'-')} · ${esc(rowCity(r))} · ${esc(rowClass(r))} · ${esc(rowDistance(r))} ${esc(rowTrack(r))}${f!==null?` · ${esc(f)}.`:''}${rowHp(r)!==null?` · HP ${esc(rowHp(r))}`:''}</div>`;
}
function pairHtml(pair,refName,index){
  const pct=Math.round(pair.local*100),parts=criteria(pair.a,pair.b);
  return `<div class="cpm-pair-v1691f11">
    <div class="cpm-pair-head-v1691f11"><b>${index+1}. güçlü koşu çifti</b><strong>%${esc(pct)}</strong></div>
    ${rowLine(pair.a,'Bugünkü atın yolu:')}
    ${rowLine(pair.b,`${refName||'Referans'} yolu:`)}
    ${parts.length?`<div class="cpm-criteria-v1691f11">${parts.map(([k,v])=>`<span>${esc(k)} <b>%${esc(v)}</b></span>`).join('')}</div>`:''}
  </div>`;
}
async function getRefCareer(row){
  const id=clean(row?.historicalHorseId),before=clean(row?.raceDate);
  if(!id||!before)throw new Error('Tarihsel referans at ID veya yarış tarihi arşivde yok.');
  const key=`${id}|${before}`;if(refCareerCache.has(key))return refCareerCache.get(key);
  const p=(async()=>{
    if(typeof fetchCareer!=='function')throw new Error('Kariyer yükleme fonksiyonu bulunamadı.');
    const c=await fetchCareer(id,before);
    if(!c?.ok)throw new Error(c?.error||'Referans atın yarış öncesi kariyeri alınamadı.');
    return c;
  })();
  refCareerCache.set(key,p);
  try{return await p}catch(e){refCareerCache.delete(key);throw e}
}
async function loadExplain(token,year,out){
  const ctx=tokenMap.get(token);if(!ctx)throw new Error('Kariyer detayı artık aktif değil.');
  const item=ctx.item,sim=ctx.sim;
  const row=(Array.isArray(sim?.byYear)?sim.byYear:[]).find(x=>String(x?.year)===String(year));
  if(!row)throw new Error(`${year} tarihsel referansı bulunamadı.`);
  const path=currentPath(item);if(!path.length)throw new Error('Bugünkü atın puana giren kariyer yolu bulunamadı.');
  out.innerHTML='<div class="cpm-loading-v1691f11">Referans atın yarış öncesi kariyeri okunuyor…</div>';
  const career=await getRefCareer(row),mode=modeOf(item,row),rp=refPath(career,mode);
  if(!rp.length)throw new Error(`${row.historicalHorse||'Referans'} için karşılaştırılabilir yarış öncesi yol bulunamadı.`);
  const trace=traceOrderedPath(path,rp);
  const pairFloor=typeof careerPairSupportFloorV1691F17==='function'?careerPairSupportFloorV1691F17():MATCH_BASE;
  const positive=trace.pairs.filter(x=>x.positive&&x.local>=pairFloor).sort((x,y)=>y.local-x.local);
  const shown=positive.slice(0,MAX_SHOW);
  out.innerHTML=`<div class="cpm-result-v1691f11">
    <div class="cpm-note-v1691f11"><b>${esc(row.year)} · ${esc(row.historicalHorse||'-')} · %${esc(row.pathScore??row.score??'-')}</b><br>Bu yüzde tek bir koşudan değil, iki kariyer yolunun sıralı hizalamasından oluşur. Aşağıda yalnız katı sınıf/yaş kuralını ve eşik puanını geçen ${esc(shown.length)} gerçek koşu çifti gösteriliyor. DP hizalaması: ${esc(trace.pairs.length)} · boşluk: ${esc(trace.gaps)}.</div>
    ${shown.length?shown.map((p,i)=>pairHtml(p,row.historicalHorse||'Referans',i)).join(''):'<div class="cpm-loading-v1691f11">Katı sınıf/yaş kuralını geçen gerçek koşu çifti bulunamadı. Bu ekrandaki eski puanı temizlemek için Yeniden Hesapla kullanın.</div>'}
  </div>`;
}
function installStyle(){
  if($('careerPathMatchExplainStyleV1691F11'))return;
  const s=document.createElement('style');s.id='careerPathMatchExplainStyleV1691F11';s.textContent=`
.cpm-wrap-v1691f11{margin:10px 0;border:1px solid rgba(114,213,255,.20);border-radius:10px;overflow:hidden;background:rgba(4,19,32,.45)}
.cpm-title-v1691f11{padding:8px 9px;background:rgba(114,213,255,.08);font-size:11px;font-weight:900;letter-spacing:.035em}
.cpm-ref-v1691f11{border-top:1px solid rgba(255,255,255,.07);padding:7px 8px}
.cpm-btn-v1691f11{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#10283d;border:1px solid rgba(114,213,255,.22);border-radius:8px;color:#eaf6ff;padding:8px 9px;text-align:left;font-size:11px}
.cpm-btn-v1691f11 span{min-width:0}.cpm-btn-v1691f11 strong{color:#7ee2a8;white-space:nowrap}
.cpm-out-v1691f11{margin-top:7px}.cpm-loading-v1691f11,.cpm-note-v1691f11{padding:8px 9px;border-radius:8px;background:rgba(255,255,255,.045);font-size:10px;line-height:1.45;color:#b9c9d8}
.cpm-pair-v1691f11{margin-top:7px;padding:8px;border-radius:9px;border:1px solid rgba(255,255,255,.10);background:#0b1d2e}
.cpm-pair-head-v1691f11{display:flex;justify-content:space-between;gap:8px;font-size:10px;margin-bottom:5px}.cpm-pair-head-v1691f11 strong{font-size:14px;color:#7ee2a8}
.cpm-rowline-v1691f11{font-size:10px;line-height:1.45;margin:3px 0;overflow-wrap:anywhere}.cpm-rowline-v1691f11 b{color:#9cdcf7}
.cpm-criteria-v1691f11{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.cpm-criteria-v1691f11 span{font-size:9px;padding:4px 6px;border-radius:999px;background:rgba(114,213,255,.07);border:1px solid rgba(114,213,255,.15)}
`;
  document.head.appendChild(s);
}

const yearBefore=typeof yearSimilarityHtml==='function'?yearSimilarityHtml:null;
if(yearBefore){
  yearSimilarityHtml=function(sim){
    const base=yearBefore(sim);const item=currentItemForSim(sim);if(!item)return base;
    const rows=(Array.isArray(sim?.byYear)?sim.byYear:[]).filter(r=>finite(r?.score)!==null&&clean(r?.historicalHorseId));
    if(!rows.length)return base;
    installStyle();const token=`cpm${++tokenSeq}`;tokenMap.set(token,{sim,item});
    const extra=`<div class="cpm-wrap-v1691f11"><div class="cpm-title-v1691f11">🔎 UYUMU OLUŞTURAN KOŞU EŞLEŞMELERİ</div>${rows.map(r=>`<div class="cpm-ref-v1691f11"><button type="button" class="cpm-btn-v1691f11" data-cpm-token="${esc(token)}" data-cpm-year="${esc(r.year)}"><span><b>${esc(r.year)}</b> · ${esc(r.historicalHorse||'-')} · geçmişte ${esc(r.historicalFinish||'-')}.</span><strong>%${esc(r.pathScore??r.score)}</strong></button><div class="cpm-out-v1691f11" data-cpm-out="${esc(token)}-${esc(r.year)}"></div></div>`).join('')}</div>`;
    return base+extra;
  };
}

document.addEventListener('click',e=>{
  const btn=e.target?.closest?.('[data-cpm-token]');if(!btn)return;
  e.preventDefault();e.stopPropagation();
  const token=btn.dataset.cpmToken,year=btn.dataset.cpmYear;
  const out=document.querySelector(`[data-cpm-out="${CSS.escape(token+'-'+year)}"]`);if(!out)return;
  if(out.dataset.loaded==='1'){out.innerHTML='';out.dataset.loaded='0';return;}
  out.dataset.loaded='1';
  loadExplain(token,year,out).catch(err=>{out.innerHTML=`<div class="cpm-loading-v1691f11">⚠ ${esc(err?.message||'Koşu eşleşmeleri hazırlanamadı.')}</div>`;out.dataset.loaded='0';});
},true);
installStyle();
window.__AT_CAREER_PATH_MATCH_EXPLAIN_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif — Kariyer puanı değişmeden koşu eşleşmeleri lazy gösterilir.');
})();
