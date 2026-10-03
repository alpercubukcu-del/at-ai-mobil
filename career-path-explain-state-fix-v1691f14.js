/* Build compatibility: CAREER-PATH-EXPLAIN-STATE-FIX-V16.9.1F14 · comparisonPathBefore · roadmapBefore · F12 KATI EŞLEŞME · CAREER-STRICT-CLASS-GROUP-WEIGHT-V16.9.1F12 · carriedWeightSimilarityV1691F12(a,b)\n   AT AI Mobil — SEZONLUK KAZANAN YOLU V2
   Tekil "güçlü koşu çifti" yaklaşımını kaldırır.
   Her tarihsel yıl için yalnız hedef yarışın KAZANANI referanstır.
   Aday ve kazananın aynı sezon içindeki kronolojik yarış silsilesi birlikte hizalanır.
   Ocak hedeflerinde önceki takvim yılının tamamı iki tarafa da bağlanır.
*/
(() => {
'use strict';
if(window.__AT_CAREER_SEASON_SEQUENCE_V2__)return;
window.__AT_CAREER_SEASON_SEQUENCE_V2__=true;\nwindow.__AT_CAREER_PATH_EXPLAIN_STATE_FIX_V1691F14__=true;
const VERSION='CAREER-SEASON-WINNER-SEQUENCE-V2.1';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(',','.').match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.')??v);return Number.isFinite(n)?n:null};
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const dateOf=r=>clean(r?.date||r?.isoDate);
const finish=r=>num(r?.finish??r?.rank??r?.sira);
const weight=r=>num(r?.weight??r?.siklet??r?.kilo??r?.carriedWeight??r?.kg);
const hp=r=>num(r?.hp??r?.handicap);
const dist=r=>num(r?.distance??r?.mesafe??r?.msf);
const norm=v=>String(v??'').toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const klass=r=>norm(r?.class??r?.raceClass??r?.classRaw);
const group=r=>norm(r?.ageGroup??r?.group??r?.groupRaw);
const track=r=>norm(r?.track??r?.pist);
const city=r=>norm(r?.city??r?.sehir);
function pathOf(c={}){for(const x of[c.history,c.fullPathBefore,c.historyBefore,c.roadmap,c.comparisonPathBefore,c.roadmapBefore,c.fullHistory,c.top5,c.preparationPath])if(Array.isArray(x)&&x.length)return x;return[]}
function seasonWindow(rows,cutoff){
 const d=clean(cutoff),y=Number(d.slice(0,4)),m=Number(d.slice(5,7)),start=m===1?String(y-1)+'-01-01':String(y)+'-01-01';
 return (Array.isArray(rows)?rows:[]).filter(r=>{const x=dateOf(r);return x&&x>=start&&x<d}).sort((a,b)=>dateOf(a).localeCompare(dateOf(b)));
}
function near(a,b){const x=dist(a),y=dist(b);return x!==null&&y!==null?Math.max(0,1-Math.abs(x-y)/600):0}
function levelSim(a,b,scale){const x=num(a),y=num(b);if(x===null||y===null)return null;return Math.max(0,1-Math.abs(x-y)/scale)}
function dir(v){return v>0.35?1:v<-.35?-1:0}
function delta(rows,i,get){if(i<=0)return null;const a=get(rows[i-1]),b=get(rows[i]);return a===null||b===null?null:b-a}
function pairScore(a,b){
 const ce=klass(a)&&klass(a)===klass(b),ge=group(a)&&group(a)===group(b),te=track(a)&&track(a)===track(b),dd=near(a,b);
 if(!ce||!ge||!te||dd<.34)return null;
 const af=finish(a),bf=finish(b);if(af===null||bf===null||af>bf)return null;
 const ws=levelSim(weight(a),weight(b),8),hs=levelSim(hp(a),hp(b),25),cs=city(a)&&city(a)===city(b)?1:.55;
 let parts=[[.34,1],[.12,1],[.12,1],[.16,dd],[.08,cs],[.09,ws],[.09,hs]].filter(x=>x[1]!==null);
 const den=parts.reduce((s,x)=>s+x[0],0),base=parts.reduce((s,x)=>s+x[0]*x[1],0)/den;
 return clamp(base);
}
function align(cur,ref){
 const n=cur.length,m=ref.length,gap=-.16,dp=Array.from({length:n+1},()=>Array(m+1).fill(0)),act=Array.from({length:n+1},()=>Array(m+1).fill(''));
 for(let i=1;i<=n;i++){dp[i][0]=i*gap;act[i][0]='D'}for(let j=1;j<=m;j++){dp[0][j]=j*gap;act[0][j]='I'}
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){const p=pairScore(cur[i-1],ref[j-1]),ma=p===null?-1e9:dp[i-1][j-1]+p-.42,de=dp[i-1][j]+gap,ins=dp[i][j-1]+gap;if(ma>=de&&ma>=ins){dp[i][j]=ma;act[i][j]='M'}else if(de>=ins){dp[i][j]=de;act[i][j]='D'}else{dp[i][j]=ins;act[i][j]='I'}}
 const pairs=[];let i=n,j=m;while(i||j){const z=act[i][j];if(z==='M'){pairs.push({ci:i-1,ri:j-1,a:cur[i-1],b:ref[j-1],quality:pairScore(cur[i-1],ref[j-1])});i--;j--}else if(z==='D')i--;else j--}
 pairs.reverse();
 let trendHits=0,trendChecks=0;
 for(let k=1;k<pairs.length;k++){for(const get of[weight,hp,finish]){const ca=delta(cur,pairs[k].ci,get),ra=delta(ref,pairs[k].ri,get);if(ca===null||ra===null)continue;trendChecks++;if(dir(ca)===dir(ra))trendHits++}}
 const coverage=ref.length?Math.min(1,pairs.length/ref.length):0,quality=pairs.length?pairs.reduce((s,p)=>s+p.quality,0)/pairs.length:0,trend=trendChecks?trendHits/trendChecks:.5;
 const evidence=pairs.length>=2;const score=evidence?Math.round(100*clamp(coverage*.42+quality*.38+trend*.20)):null;
 return{pairs,coverage,quality,trend,trendHits,trendChecks,score,evidence};
}
function winnerOf(race){const refs=Array.isArray(race?.top3)?race.top3:[];return refs.find(x=>Number(x?.finish)===1)||null}
function winnerPath(ref){return pathOf(ref?.career||{})}
function calc(currentPath,roadmapData){
 const targetDate=clean(state?.date||document.getElementById('raceDate')?.value),cur=seasonWindow(currentPath,targetDate),races=(Array.isArray(roadmapData?.historicalRaces)?roadmapData.historicalRaces:[]).filter(x=>x?.ok!==false).sort((a,b)=>Number(b?.sourceYear||0)-Number(a?.sourceYear||0)),byYear=[];let referenceCount=0;
 for(const race of races){const year=Number(race?.sourceYear||String(race?.date||'').slice(0,4))||null,w=winnerOf(race);if(!w){byYear.push({year,score:null,error:'Bu tarihsel yarışın kazananı alınamadı.',raceDate:race?.date||'',raceCity:race?.city||'',raceNo:race?.raceNo||''});continue}
  referenceCount++;const ref=seasonWindow(winnerPath(w),clean(race?.date));const a=align(cur,ref);
  byYear.push({year,score:a.score,pathScore:a.score,sequenceScore:a.score,historicalHorse:w.horseName||'',historicalHorseId:w.horseId||'',historicalFinish:1,currentPathCount:cur.length,historicalPathCount:ref.length,matchedSteps:a.pairs.length,coveragePct:Math.round(a.coverage*100),pairQualityPct:Math.round(a.quality*100),trendPct:Math.round(a.trend*100),trendHits:a.trendHits,trendChecks:a.trendChecks,sequencePairs:a.pairs,raceDate:race?.date||'',raceCity:race?.city||'',raceNo:race?.raceNo||'',referenceType:race?.referenceType||'EXACT',referenceLabel:race?.referenceLabel||'TARİHSEL HEDEF',conditionScore:Number(race?.transferabilityScore??race?.raceConditionSimilarity??100)||0,error:a.evidence?null:(ref.length?'En az 2 kronolojik başarı adımı eşleşmedi.':'Kazananın o sezon yarış yolu yok.')});
 }
 const scored=byYear.filter(x=>Number.isFinite(Number(x.score))),strongest=scored.sort((a,b)=>b.score-a.score||b.matchedSteps-a.matchedSteps)[0]||null;
 return{score:strongest?.score??null,strongest,strongestYear:strongest?.year||null,byYear,matchedHistoricalHorse:strongest?.historicalHorse||null,matchedHistoricalFinish:1,matchedHistoricalRace:strongest?`${strongest.raceDate} ${strongest.raceCity} ${strongest.raceNo}. Koşu`:null,referenceCount,currentPathCount:cur.length,method:'SEASON_WINNER_SEQUENCE_V2',yearAggregation:'NONE',seasonRule:Number(targetDate.slice(5,7))===1?'JANUARY_PREVIOUS_FULL_YEAR_PLUS_CURRENT':'JAN_1_TO_TARGET',winnerOnly:true};
}
calculateGalibiyetBenzerligi=calc;

function rowText(r){return `${esc(dateOf(r)||'-')} · ${esc(r?.city||r?.sehir||'-')} · ${esc(r?.class||r?.raceClass||'-')} · ${esc(dist(r)??'-')} ${esc(r?.track||r?.pist||'-')} · ${esc(finish(r)??'-')}. · ${esc(weight(r)??'-')} kg · HP ${esc(hp(r)??'-')}`}
function trendLabel(pairs){
 if(pairs.length<2)return'Yetersiz adım';
 let w=0,h=0,f=0,cw=0,ch=0,cf=0;for(let k=1;k<pairs.length;k++){const x=pairs[k-1],y=pairs[k];const vals=[[weight(x.a),weight(y.a),weight(x.b),weight(y.b),'w'],[hp(x.a),hp(y.a),hp(x.b),hp(y.b),'h'],[finish(x.a),finish(y.a),finish(x.b),finish(y.b),'f']];for(const [a1,a2,b1,b2,t]of vals){if([a1,a2,b1,b2].some(v=>v===null))continue;const ok=dir(a2-a1)===dir(b2-b1);if(t==='w'){cw++;if(ok)w++}if(t==='h'){ch++;if(ok)h++}if(t==='f'){cf++;if(ok)f++}}}
 return `Sıklet yönü ${w}/${cw||0} · HP yönü ${h}/${ch||0} · bitiriş yönü ${f}/${cf||0}`;
}
yearSimilarityHtml=function(sim){
 const rows=Array.isArray(sim?.byYear)?sim.byYear:[];if(!rows.length)return'<div class="season-empty-v2">Tarihsel kazanan sezonu bulunamadı.</div>';
 return `<div class="season-years-v2"><div class="season-title-v2">SEZONLUK KAZANAN YOL HARİTASI <small>· tek yarış değil, yarış silsilesi</small></div>${rows.map(row=>{const ok=Number.isFinite(Number(row.score)),pairs=Array.isArray(row.sequencePairs)?row.sequencePairs:[];return `<details class="season-year-v2" ${ok&&row===sim.strongest?'open':''}><summary><span><b>${esc(row.year||'-')}</b> · 🏆 ${esc(row.historicalHorse||'Kazanan alınamadı')}</span><strong>${ok?'%'+esc(row.score):'—'}</strong></summary><div class="season-body-v2"><div class="season-metrics-v2"><span>Eşleşen adım <b>${esc(row.matchedSteps??0)}/${esc(row.historicalPathCount??0)}</b></span><span>Kapsama <b>%${esc(row.coveragePct??0)}</b></span><span>Koşul kalitesi <b>%${esc(row.pairQualityPct??0)}</b></span><span>Gelişim yönü <b>%${esc(row.trendPct??0)}</b></span></div><div class="season-note-v2">${ok?`Bu yüzde ${esc(row.matchedSteps)} kronolojik yarış adımının birlikte örtüşmesinden oluşur. ${esc(trendLabel(pairs))}.`:`⚠ ${esc(row.error||'Yeterli yarış silsilesi yok.')}`}</div>${pairs.length?`<div class="season-grid-head-v2"><b>Bugünkü adayın sezon yolu</b><b>${esc(row.year)} kazananının sezon yolu</b></div>${pairs.map((p,i)=>`<div class="season-grid-v2"><div><em>Adım ${i+1}</em>${rowText(p.a)}</div><div><em>Adım ${i+1}</em>${rowText(p.b)}</div><div class="season-match-v2">Koşul %${Math.round(p.quality*100)} · bitiriş kapısı ✓</div></div>`).join('')}`:''}</div></details>`}).join('')}</div>`;
};

/* Eski "güçlü koşu çifti" açıklama tıklamasını tamamen devre dışı bırak. */
document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-cpm-token]');if(!b)return;const d=document.getElementById('analysisDialog');if(d?.dataset?.view!=='career')return;e.preventDefault();e.stopImmediatePropagation();const ref=b.closest('.cpm-ref-v1691f11');if(ref)ref.style.display='none';},true);

const oldRender=typeof renderCareerAnalysis==='function'?renderCareerAnalysis:null;
if(oldRender)renderCareerAnalysis=function(result,...rest){const out=oldRender(result,...rest);const c=document.getElementById('analysisContent');if(c)c.querySelectorAll('.cpm-ref-v1691f11').forEach(x=>x.remove());return out};

function installTheme(){let s=document.getElementById('careerSeasonThemeV2');if(s)s.remove();s=document.createElement('style');s.id='careerSeasonThemeV2';s.textContent=`
#analysisDialog[data-view="career"]{background:#050b14!important;color:#eef5ff!important;border-color:#203b5b!important}
#analysisDialog[data-view="career"] .dialog-head,#analysisDialog[data-view="career"] .toolbar{background:#07111f!important;border-color:#203b5b!important}
#analysisDialog[data-view="career"] .analysis-content{background:radial-gradient(circle at top,#10243d 0,#07111f 36%,#040912 100%)!important}
#analysisDialog[data-view="career"] .primary,#analysisDialog[data-view="career"] button.primary{background:linear-gradient(135deg,#28b5ff,#426eff)!important;color:#fff!important}
#analysisDialog[data-view="career"] .secondary,#analysisDialog[data-view="career"] button:not(.primary):not(.icon-btn){background:#193452!important;color:#dff6ff!important;border:1px solid #315b81!important}
#analysisDialog[data-view="career"] .icon-btn{background:#12243a!important;color:#eef5ff!important}
#analysisDialog[data-view="career"] details,#analysisDialog[data-view="career"] section{border-color:#203b5b!important;background:rgba(8,20,33,.94)!important}
#analysisDialog[data-view="career"] summary{background:#0d2032!important;color:#eef5ff!important}
.season-years-v2{margin-top:10px;border:1px solid #294663;border-radius:14px;overflow:hidden;background:#081421}
.season-title-v2{padding:10px 11px;background:#10243a;color:#72d5ff;font-size:12px;font-weight:900}.season-title-v2 small{color:#a9bbd2;font-weight:600}
.season-year-v2{margin:0!important;border:0!important;border-top:1px solid #203b5b!important;border-radius:0!important}.season-year-v2>summary{display:flex;justify-content:space-between;gap:8px;padding:11px!important}.season-year-v2>summary strong{color:#67e0a7;font-size:18px}
.season-body-v2{padding:10px}.season-metrics-v2{display:flex;flex-wrap:wrap;gap:6px}.season-metrics-v2 span{padding:5px 7px;border:1px solid #294663;border-radius:8px;background:#071321;font-size:10px}
.season-note-v2{margin:8px 0;padding:8px;border-radius:9px;background:#10243a;color:#bed4e9;font-size:11px;line-height:1.5}
.season-grid-head-v2,.season-grid-v2{display:grid;grid-template-columns:1fr 1fr;gap:7px}.season-grid-head-v2{padding:7px 0;color:#72d5ff;font-size:10px}.season-grid-v2{position:relative;margin:7px 0 13px}.season-grid-v2>div:not(.season-match-v2){padding:8px;border:1px solid #233f5d;border-radius:9px;background:#071521;font-size:10px;line-height:1.5}.season-grid-v2 em{display:block;color:#67d2ff;font-style:normal;font-weight:900;margin-bottom:3px}.season-match-v2{grid-column:1/-1;text-align:center;color:#67e0a7;font-size:10px;margin-top:-3px}
@media(max-width:520px){.season-grid-head-v2,.season-grid-v2{grid-template-columns:1fr}.season-grid-head-v2 b:last-child{display:none}.season-match-v2{grid-column:1}}
`;document.head.appendChild(s)}
installTheme();
try{if(state?.analyses?.career){state.analyses.career={};save()}}catch{}
console.info('[AT AI]',VERSION,'aktif — kazanan-only sezon silsilesi, çoklu adım ve yeni mavi tema');
})();