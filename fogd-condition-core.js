/* AT AI Mobil — tenth coupon method. Pure, isolated from the nine column models. */
((root)=>{
'use strict';
if(root.ATFogdConditionCoreV1)return;
const VERSION='FOGD-CONDITION-CORE-V17.4';
const MODEL={id:'dna-condition',key:'C',short:'10',label:'10 · Koşul Uyumlu Yakınlık'};
const KEYS=['F','O','G','D','J','S','A'];
// Provisional decision rules, not learned win probabilities.
const RULES=Object.freeze({strongGap:5,followGap:10,saturation:.4,saturatedWeight:.25,
  main:2.5,watch:1.75,single:3.5,strongSources:3,nearDistance:200,
  protectionStarts:2,protectionTop4:.5,recentDays:365,standardStarts:3});
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const finite=v=>{
  if(v===null||v===undefined||typeof v==='boolean'||!clean(v)||clean(v)==='—')return null;
  const n=Number(clean(v).replace(',','.'));return Number.isFinite(n)?n:null;
};
const median=values=>{const a=values.filter(Number.isFinite).slice().sort((a,b)=>a-b),m=Math.floor(a.length/2);return !a.length?null:a.length%2?a[m]:(a[m-1]+a[m])/2};
const weightedMedian=values=>{
  const a=values.filter(x=>Number.isFinite(x.value)&&x.weight>0).slice().sort((a,b)=>a.value-b.value);
  const half=a.reduce((s,x)=>s+x.weight,0)/2;let sum=0;
  for(const x of a){sum+=x.weight;if(sum>=half)return x.value}return null;
};
function isoDate(value){
  const text=clean(value),m=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const date=m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:text.match(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/)?text.slice(0,10):'';
  if(!date)return'';const ms=Date.parse(date+'T00:00:00Z');
  return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===date?date:'';
}
function surface(value){
  const text=clean(value).toLocaleUpperCase('tr-TR'),key=fold(text);
  if(key.includes('SENTETIK')||/^S\s*:/.test(text)||key==='S')return'SENTETIK';
  if(key.includes('KUM')||/^K\s*:/.test(text)||key==='K')return'KUM';
  if(key.includes('CIM')||/^Ç\s*:/.test(text)||key==='C')return'CIM';
  return'';
}
function seconds(value){
  if(typeof value==='number')return Number.isFinite(value)&&value>0?value:null;
  const text=clean(value).replace(/,/g,'.'),m=text.match(/^(\d{1,2})[.:](\d{2})[.:](\d{1,2})$/);
  if(m&&Number(m[2])<60)return Number(m[1])*60+Number(m[2])+Number(m[3])/100;
  const n=finite(text);return n!==null&&n>0?n:null;
}
function rawValue(raw,names){
  for(const name of names){const key=Object.keys(raw||{}).find(k=>fold(k)===fold(name));if(key!==undefined&&clean(raw[key]))return raw[key]}
  return undefined;
}
function historyRows(payload){
  if(Array.isArray(payload))return payload;
  const record=payload?.record?.data||payload?.record||payload?.data||payload;
  return Array.isArray(record?.races)?record.races:[];
}
function normalizeHistory(payload,cutoff){
  const before=isoDate(cutoff),seen=new Set();if(!before)return[];
  return historyRows(payload).map(row=>{
    const raw=row?.raw||{},get=(names,value)=>rawValue(raw,names)??value;
    return{
      date:isoDate(get(['Tarih'],row.isoDate??row.date??row.tarih)),
      city:clean(get(['Şehir','Hipodrom'],row.city??row.sehir)),
      distance:finite(get(['Msf','Mesafe'],row.distance??row.msf??row.mesafe)),
      surface:surface(get(['Pist'],row.track??row.pist??row.surface)),
      finish:finite(get(['S','Sıra','Derece Sıra'],row.finish??row.rank??row.sira)),
      sec:seconds(get(['Derece'],row.degree??row.derece??row.sec)),
      weight:finite(get(['Sıklet','Kilo'],row.weight??row.kilo??row.siklet)),
      raceClass:clean(get(['Kcins','Koşu Türü'],row.raceType??row.raceClass??row.class)),
      hp:finite(get(['HP'],row.hp)),raceNo:clean(get(['K. No-K. Adı'],row.raceNo))
    };
  }).filter(row=>{
    // Undated, same-day, future and non-running records cannot be prediction input.
    if(!row.date||row.date>=before||!row.surface||!(row.distance>0)||!(row.finish>0))return false;
    const key=[row.date,fold(row.city),row.distance,row.surface,row.raceNo].join('|');
    if(seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>b.date.localeCompare(a.date));
}
const daysBetween=(a,b)=>(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000;
function contextFor(race,date,city){return{date:isoDate(date),city:clean(city),distance:finite(race?.distance??race?.mesafe??race?.mes),surface:surface(race?.track??race?.pist),breed:breed(race)}}
function breed(race){
  const key=fold([race?.breed,race?.ageGroup,race?.yaradi2,race?.class,race?.raceClass].filter(Boolean).join(' '));
  if(key.includes('ARAP')||key.includes('DHO'))return'ARAP';
  if(key.includes('INGILIZ'))return'INGILIZ';return'';
}
const finishScore=position=>[100,82,68,56,46,38,32,27,23][Math.round(position)-1]??18;
function conditionHistory(payload,context){
  const rows=normalizeHistory(payload,context.date),compatible=rows.filter(r=>context.surface&&context.distance>0&&r.surface===context.surface&&Math.abs(r.distance-context.distance)<=RULES.nearDistance);
  const weighted=compatible.map(r=>{
    const days=daysBetween(r.date,context.date),cityWeight=fold(r.city)===fold(context.city)?1:.75;
    return{row:r,weight:Math.exp(-days/365)*cityWeight*Math.exp(-Math.abs(r.distance-context.distance)/200)};
  });
  const totalWeight=weighted.reduce((s,x)=>s+x.weight,0);
  const form=totalWeight?weighted.reduce((s,x)=>s+x.weight*finishScore(x.row.finish),0)/totalWeight:null;
  const top4=compatible.filter(r=>r.finish<=4).length,wins=compatible.filter(r=>r.finish===1).length;
  const recentSuccess=compatible.some(r=>r.finish<=4&&daysBetween(r.date,context.date)<=RULES.recentDays);
  const protectedCandidate=compatible.length>=RULES.protectionStarts&&top4>=2&&top4/compatible.length>=RULES.protectionTop4&&recentSuccess;
  return{rows,compatible,form:form===null?null:Number(form.toFixed(1)),starts:compatible.length,top4,wins,
    top4Rate:compatible.length?top4/compatible.length:null,protectedCandidate,recentSuccess,
    sameCityStarts:compatible.filter(r=>fold(r.city)===fold(context.city)).length,
    reason:protectedCandidate?`${compatible.length} benzer pist/mesafe koşusu · ${top4} ilk 4 · ${wins} birincilik`:compatible.length?`${compatible.length} benzer pist/mesafe koşusu`:'Benzer pist/mesafe geçmişi yok.'};
}
function buildStandards(records,cutoff){
  const before=isoDate(cutoff),groups=new Map();
  for(const record of Array.isArray(records)?records:[]){
    const date=isoDate(record?.date),race=record?.race||{},city=fold(record?.city),track=surface(race.track??race.pist),distance=finite(race.distance??race.mesafe),b=breed(race),sec=seconds(race?.winner?.degree??race?.winner?.muddet);
    if(!before||!date||date>=before||daysBetween(date,before)>730||!city||!track||!b||!(distance>0)||sec===null)continue;
    const key=[city,track,distance,b].join('|'),group=groups.get(key)||{values:[],seen:new Set()};
    const id=[date,race.no??race.raceNo??record.raceNo??'',sec].join('|');
    if(group.seen.has(id))continue;group.seen.add(id);group.values.push(sec);groups.set(key,group);
  }
  const out=new Map();for(const[key,group]of groups){
    if(group.values.length<RULES.standardStarts)continue;
    const value=median(group.values),spread=median(group.values.map(x=>Math.abs(x-value)));
    out.set(key,{sec:value,samples:group.values.length,spread});
  }return out;
}
function degreeEvidence(history,context,standards=new Map(),currentWeight=null){
  const targetKey=[fold(context.city),context.surface,context.distance,context.breed].join('|'),target=standards.get(targetKey),values=[];
  for(const row of history.compatible){
    if(row.sec===null||daysBetween(row.date,context.date)>730)continue;
    const exact=fold(row.city)===fold(context.city)&&row.distance===context.distance;
    const source=standards.get([fold(row.city),row.surface,row.distance,context.breed].join('|'));
    if(!exact&&(!context.breed||!source||!target))continue;
    const value=exact?row.sec:row.sec/source.sec*target.sec;
    const weight=Math.exp(-daysBetween(row.date,context.date)/365)*(exact?1:.75)*(currentWeight!==null&&row.weight!==null?Math.exp(-Math.abs(currentWeight-row.weight)/5):1);
    values.push({value,weight,date:row.date,city:row.city,distance:row.distance,converted:!exact,standards:exact?null:{source:source.samples,target:target.samples}});
  }
  const predictedSec=weightedMedian(values),spread=predictedSec===null?null:median(values.map(x=>Math.abs(x.value-predictedSec)));
  // One record is evidence, but not a full independent degree contribution.
  const trusted=values.length>=2&&spread!==null&&spread<=3;
  return{predictedSec,spread,samples:values.length,trusted,values,
    source:values.some(x=>x.converted)?'GEÇMİŞ PİST STANDARTLARI':'AYNI ŞEHİR / PİST / MESAFE',
    reason:!values.length?'Karşılaştırılabilir derece yok; şehir/mesafe dönüşümü için yeterli geçmiş pist standardı bulunamadı.':
      !trusted?`${values.length} derece kaydı · sınırlı veri; D puanına eklenmedi.`:`${values.length} karşılaştırılabilir derece kaydı`};
}
function prepareRows(snapshot,race,{date,city,standards=new Map(),eligible}={}){
  const context=contextFor(race,date||snapshot?.date,city||snapshot?.city);
  const sourceRows=(snapshot?.rows||[]).filter(row=>!eligible||eligible.has(String(row.no))||eligible.has(Number(row.no)));
  const rows=sourceRows.map(row=>{
    const supplied=row.conditionHistoryRecords??row.historyRecords;
    const history=conditionHistory(supplied,context),degree=degreeEvidence(history,context,standards,finite(row?.program?.weight??row?.program?.kilo));
    const scores=Object.fromEntries(KEYS.map(key=>[key,finite(row[key])]));
    scores.F=history.form??scores.F;scores.D=null;
    return{row,history,degree,scores,historyAvailable:Array.isArray(supplied),formSource:history.form!==null?'KOŞUL GEÇMİŞİ':'KAYITLI F',historyError:clean(row.conditionHistoryError)};
  });
  const trusted=rows.filter(x=>x.degree.trusted);
  if(trusted.length>=2){
    const fastest=Math.min(...trusted.map(x=>x.degree.predictedSec));
    const scale=Math.max(1.5,median(trusted.map(x=>x.degree.spread))||0);
    // Fixed time-gap scale avoids expanding a tiny gap to the entire 0–100 range.
    for(const item of trusted)item.scores.D=Number(Math.max(0,100-5*(item.degree.predictedSec-fastest)/scale).toFixed(1));
  }
  return{context,rows};
}
function band(gap){return gap<=RULES.strongGap+1e-9?1:gap<=RULES.followGap+1e-9?.5:0}
function assessPrepared(prepared){
  const{rows,context}=prepared,columns={};
  const degreeComparable=rows.filter(x=>Number.isFinite(x.degree.predictedSec)&&x.degree.samples>0);
  const degreeFastest=degreeComparable.length>=2?Math.min(...degreeComparable.map(x=>x.degree.predictedSec)):null;
  for(const key of KEYS){
    const valid=rows.filter(x=>x.scores[key]!==null),leader=valid.length?Math.max(...valid.map(x=>x.scores[key])):null;
    const strong=valid.filter(x=>band(leader-x.scores[key])===1).length,follow=valid.filter(x=>band(leader-x.scores[key])===.5).length;
    columns[key]={leader,valid:valid.length,strong,follow,saturated:valid.length>0&&(strong/valid.length>RULES.saturation+1e-9||follow/valid.length>RULES.saturation+1e-9)};
  }
  const corroboration={};for(const key of['E','T']){
    const scores=rows.map(x=>key==='E'&&Number(x.row?.connectionMeta?.verified||0)<2?null:finite(x.row[key])).filter(x=>x!==null);
    corroboration[key]=scores.length?Math.max(...scores):null;
  }
  const ranking=rows.map(item=>{
    const contributions={},gaps={};let score=0,strongSources=0;
    for(const key of KEYS){
      const column=columns[key],value=item.scores[key],gap=value===null||column.leader===null?null:Math.max(0,column.leader-value),raw=gap===null?0:band(gap);
      gaps[key]=gap;contributions[key]=raw*(column.saturated?RULES.saturatedWeight:1);score+=contributions[key];
      if(raw===1&&!column.saturated)strongSources++;
    }
    const confirmations=Object.fromEntries(['E','T'].map(key=>{
      const value=key==='E'&&Number(item.row?.connectionMeta?.verified||0)<2?null:finite(item.row[key]),leader=corroboration[key];
      return[key,value!==null&&leader!==null&&leader-value<=RULES.followGap+1e-9];
    }));
    const group=score>=RULES.main?'main':score>=RULES.watch&&(confirmations.E||confirmations.T)?'watch':item.history.protectedCandidate?'condition':'outside';
    const degreeReview=degreeFastest!==null&&item.degree.samples===1&&!item.degree.trusted&&Math.abs(item.degree.predictedSec-degreeFastest)<.005;
    return{no:item.row.no,name:item.row.name,id:item.row?.program?.id||null,score:Number(score.toFixed(3)),group,degreeReview,
      contributions,gaps,strongSources,confirmations,scores:item.scores,history:item.history,degree:item.degree,
      historyAvailable:item.historyAvailable,historyError:item.historyError,formSource:item.formSource};
  }).sort((a,b)=>b.score-a.score||Number(a.no)-Number(b.no));
  ranking.forEach((row,i)=>row.rank=i+1);
  const main=ranking.filter(x=>x.group==='main'),watch=ranking.filter(x=>x.group==='watch'),condition=ranking.filter(x=>x.group==='condition');
  const picks=ranking.filter(x=>x.group!=='outside'),historyCoverage=rows.length?rows.filter(x=>x.historyAvailable).length/rows.length:0;
  const contextCoverage=rows.length?rows.filter(x=>x.history.starts>0).length/rows.length:0;
  const singleQualified=main.length===1&&picks.length===1&&main[0].score>=RULES.single&&main[0].strongSources>=RULES.strongSources&&historyCoverage===1&&contextCoverage===1&&main[0].formSource==='KOŞUL GEÇMİŞİ'&&!!context.surface&&context.distance>0;
  const missingDegree=ranking.filter(x=>x.scores.D===null).length;
  const uncertainty=main.length===0||historyCoverage<1||contextCoverage<1||picks.length>Math.max(4,rows.length*.6)?'yüksek':'inceleme gerekli';
  const warnings=[];
  if(main.length===0)warnings.push('Ana gruba giren at yok; tek önerilmez.');
  if(historyCoverage<1)warnings.push(`${rows.length-Math.round(historyCoverage*rows.length)} atın geçmişi alınamadı; koşul uyumu eksik olabilir.`);
  const fallbackForm=rows.filter(x=>x.formSource==='KAYITLI F').length;
  if(fallbackForm)warnings.push(`${fallbackForm} atın F puanı kayıtlı analizden; benzer koşul geçmişiyle desteklenemedi.`);
  if(missingDegree)warnings.push(`${missingDegree} at için doğrulanabilir D puanı yok; yarış medyanıyla doldurulmadı.`);
  if(!context.surface||!(context.distance>0))warnings.push('Program pist/mesafe bilgisi eksik; koşul geçmişi değerlendirilemedi.');
  if(picks.length>Math.max(4,rows.length*.6))warnings.push('Aday grubu geniş; ilk dört sınırıyla otomatik daraltılmadı.');
  return{ranking,picks,main,watch,condition,degreeReviews:ranking.filter(x=>x.degreeReview),columns,historyCoverage,contextCoverage,singleQualified,uncertainty,warnings};
}
function buildAllRacesTemplate({races,snapshotsByRace,eligibleByRace,date,city,standards=new Map()}){
  const legs=(races||[]).slice().sort((a,b)=>Number(a.no)-Number(b.no)).map(race=>{
    const raceNo=Number(race.no),snapshot=snapshotsByRace?.get(String(raceNo)),base={raceNo,raceClass:race.class||'',distance:race.distance||'',track:race.track||'',time:race.time||''};
    if(!snapshot?.rows?.length)return{...base,available:false,selections:[],ranking:[],error:'Yarış DNA kaydı yok.'};
    // Withdrawn horses are excluded only here; legacy model eligibility is untouched.
    const withdrawn=new Set((race.horses||[]).filter(h=>h.withdrawn||h.nonRunner||h.kosmaz||fold(h.status)==='KOSMAZ').map(h=>String(h.no)));
    const eligible=eligibleByRace?.get(String(raceNo));
    const prepared=prepareRows({...snapshot,rows:snapshot.rows.filter(row=>!withdrawn.has(String(row.no)))},race,{date,city,standards,eligible});
    if(!prepared.rows.length)return{...base,available:false,selections:[],ranking:[],error:'Koşacak at bulunamadı.'};
    const result=assessPrepared(prepared);
    return{...base,available:true,automaticReady:result.picks.length>0,coverage:result.historyCoverage,single:result.singleQualified,
      cut:{selectedWidth:result.picks.length,automatic:true,singleQualified:result.singleQualified,
        reason:`${result.main.length} ana · ${result.watch.length} izleme · ${result.condition.length} koşul uyumu · ${result.uncertainty} belirsizlik`},
      selections:result.picks.map(row=>({...row,analysisMode:'C',modelRank:row.rank})),ranking:result.ranking,degreeReviews:result.degreeReviews,
      conditionSummary:{columns:result.columns,warnings:result.warnings,uncertainty:result.uncertainty,historyCoverage:result.historyCoverage,contextCoverage:result.contextCoverage}};
  });
  const ready=legs.filter(x=>x.available&&x.automaticReady).length;
  return{version:VERSION,scoreVersion:VERSION,couponMode:'FOGD_ALL_RACES_V173',modelId:MODEL.id,modelKey:MODEL.key,modelLabel:MODEL.label,
    allRaces:true,available:legs.some(x=>x.available),complete:legs.length>0&&ready===legs.length,readyRaces:ready,totalRaces:legs.length,missingRaces:legs.length-ready,
    selectionsTotal:legs.reduce((sum,x)=>sum+x.selections.length,0),legs,profile:null,
    warnings:['Yakınlık ve koşul uyumu kuralları deneme aşamasındadır; puanlar kazanma olasılığı değildir.'],generatedAt:new Date().toISOString()};
}
root.ATFogdConditionCoreV1={VERSION,MODEL,KEYS,RULES,finite,isoDate,surface,seconds,normalizeHistory,contextFor,conditionHistory,buildStandards,degreeEvidence,prepareRows,band,assessPrepared,buildAllRacesTemplate};
})(typeof globalThis!=='undefined'?globalThis:this);
