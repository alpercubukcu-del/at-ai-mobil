/* AT AI Mobil - F/O/G/D/J/S/E/A/T nine-model coupon core */
((root)=>{
'use strict';
if(root.ATFogdNineCouponCoreV1)return;

const VERSION='FOGD-NINE-COUPON-CORE-V17.3';
const TARGET_CAPTURE=.85;
const MODELS=[
  {id:'dna-f',key:'F',short:'F',label:'F · Form',minCoverage:.85},
  {id:'dna-o',key:'O',short:'O',label:'O · Orijin',minCoverage:.70},
  {id:'dna-g',key:'G',short:'G',label:'G · Galop',minCoverage:.70},
  {id:'dna-d',key:'D',short:'D',label:'D · Derece',minCoverage:.85},
  {id:'dna-j',key:'J',short:'J',label:'J · Jokey',minCoverage:.70},
  {id:'dna-s',key:'S',short:'S',label:'S · Sahip',minCoverage:.70},
  {id:'dna-e',key:'E',short:'E',label:'E · Ekip',minCoverage:.70},
  {id:'dna-a',key:'A',short:'A',label:'A · Antrenör',minCoverage:.70},
  {id:'dna-t',key:'T',short:'T',label:'T · Toplam',minCoverage:.85}
];

const finite=v=>{
  if(v===null||v===undefined||v===''||typeof v==='boolean')return null;
  const n=Number(v);return Number.isFinite(n)?n:null;
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const product=xs=>xs.reduce((a,b)=>a*Math.max(0,Number(b)||0),1);
const modelById=id=>MODELS.find(m=>m.id===id)||null;
const scoreFor=(row,model)=>{
  const score=finite(row?.[model?.key]);
  if(score===null)return null;
  // Ekip puanı tek bir bağlantının yeniden ölçeklenmesine dayanmasın.
  if(model?.key==='E'&&Number(row?.connectionMeta?.verified||0)<2)return null;
  return score;
};
const horseNo=row=>Number(row?.no??row?.program?.no)||0;

function rankSnapshot(snapshot,modelOrId,eligibleNos){
  const model=typeof modelOrId==='string'?modelById(modelOrId):modelOrId;
  if(!model)return{model:null,rows:[],ranking:[],coverage:0,total:0,scored:0,usable:false,error:'Bilinmeyen puan modeli.'};
  const allowed=eligibleNos&&typeof eligibleNos.has==='function'?eligibleNos:null;
  const rows=(Array.isArray(snapshot?.rows)?snapshot.rows:[]).filter(row=>!allowed||allowed.has(String(row?.no))||allowed.has(Number(row?.no)));
  const ranking=rows.map(row=>({
    row,
    horse:{no:row?.no,name:row?.name,id:row?.program?.id||null},
    score:scoreFor(row,model)
  })).filter(x=>x.score!==null).sort((a,b)=>b.score-a.score||horseNo(a.row)-horseNo(b.row));
  const total=rows.length,scored=ranking.length,coverage=total?scored/total:0;
  const minimum=Math.min(2,total);
  const usable=total>0&&scored>=minimum&&coverage+1e-9>=model.minCoverage;
  const error=!total?'Koşu puan kaydı bulunamadı.':scored<minimum?`${model.short} için sıralanabilir at yok.`:coverage+1e-9<model.minCoverage?`${model.short} veri kapsamı %${Math.round(coverage*100)}; gerekli en az %${Math.round(model.minCoverage*100)}.`:'';
  return{model,rows,ranking,coverage,total,scored,usable,error};
}

function profileFromSnapshots(snapshots,modelOrId){
  const model=typeof modelOrId==='string'?modelById(modelOrId):modelOrId;
  const hits=[0,0,0,0,0,0],gapStats=new Map([6,8,10,12,15].map(x=>[x,{cases:0,wins:0}]));
  let sample=0,rankTotal=0,missingWinnerScore=0;
  for(const snapshot of Array.isArray(snapshots)?snapshots:[]){
    const rows=Array.isArray(snapshot?.rows)?snapshot.rows:[];
    const winner=rows.find(row=>Number(row?.actualFinish)===1);
    if(!winner)continue;
    const ranked=rankSnapshot(snapshot,model);
    if(!ranked.total||ranked.coverage+1e-9<model.minCoverage||ranked.scored<Math.min(2,ranked.total))continue;
    sample++;
    const index=ranked.ranking.findIndex(x=>x.row===winner||String(x.row?.no)===String(winner?.no));
    const rank=index>=0?index+1:Number.POSITIVE_INFINITY;
    if(Number.isFinite(rank))rankTotal+=rank;else missingWinnerScore++;
    for(let k=1;k<=5;k++)if(rank<=k)hits[k]++;
    const first=ranked.ranking[0]?.score,second=ranked.ranking[1]?.score;
    if(first!==undefined&&second!==undefined){
      const gap=first-second;
      for(const [threshold,stat] of gapStats){
        if(gap+1e-9<threshold)continue;
        stat.cases++;if(rank===1)stat.wins++;
      }
    }
  }
  const rates={};for(let k=1;k<=5;k++)rates[k]=sample?hits[k]/sample:0;
  let recommendedWidth=3;
  if(sample>=20){recommendedWidth=5;for(let k=1;k<=5;k++){if(rates[k]>=TARGET_CAPTURE){recommendedWidth=k;break}}}
  let singleGap=12,singleCases=0,singleRate=0;
  if(sample>=20){
    for(const threshold of[6,8,10,12,15]){
      const stat=gapStats.get(threshold),rate=stat.cases?stat.wins/stat.cases:0;
      if(stat.cases>=12&&rate>=.45){singleGap=threshold;singleCases=stat.cases;singleRate=rate;break}
    }
    if(!singleCases){const stat=gapStats.get(12);singleCases=stat.cases;singleRate=stat.cases?stat.wins/stat.cases:0}
  }
  return{
    modelId:model?.id||'',modelKey:model?.key||'',sample,hits,rates,
    recommendedWidth:clamp(recommendedWidth,1,5),targetCapture:TARGET_CAPTURE,
    singleGap,singleCases,singleRate,missingWinnerScore,
    meanWinnerRank:sample&&rankTotal?rankTotal/Math.max(1,sample-missingWinnerScore):null,
    reliability:sample>=100?'yüksek':sample>=30?'orta':sample>=20?'sınırlı':'öğreniyor'
  };
}

function recommendWidth(rankingInput,profile={},options={}){
  const ranking=Array.isArray(rankingInput)?rankingInput:[];
  const n=ranking.length,maxWidth=Math.min(n,Math.max(1,Number(options.maxWidth)||5));
  if(!n)return{width:0,singleQualified:false,leaderGap:null,boundaryGap:null,reason:'puan yok'};
  if(n===1)return{width:1,singleQualified:true,leaderGap:null,boundaryGap:null,reason:'tek koşan at'};
  const score=i=>finite(ranking[i]?.score)??0;
  const leaderGap=score(0)-score(1),coverage=Number(options.coverage)||0;
  const learned=Number(profile.sample)>=20;
  const singleThreshold=learned?Math.max(6,Number(profile.singleGap)||12):15;
  const learnedSingleOk=!learned||(Number(profile.singleCases)>=12&&Number(profile.singleRate)>=.45);
  const singleQualified=coverage>=.85&&score(0)>=55&&leaderGap+1e-9>=singleThreshold&&learnedSingleOk;
  let width=clamp(learned?Number(profile.recommendedWidth)||3:3,2,maxWidth);
  const gaps=[];for(let boundary=1;boundary<Math.min(n,5);boundary++)gaps.push({boundary,gap:score(boundary-1)-score(boundary)});
  const strongBefore=gaps.filter(x=>x.boundary>=2&&x.boundary<width&&x.gap>=10).sort((a,b)=>b.gap-a.gap||a.boundary-b.boundary)[0];
  if(strongBefore)width=strongBefore.boundary;
  while(width<maxWidth&&score(width-1)-score(width)<2.5)width++;
  const boundaryGap=width<n?score(width-1)-score(width):null;
  const reason=singleQualified?`lider farkı ${leaderGap.toFixed(1)}; güvenli tek`:
    strongBefore?`${strongBefore.boundary}. sırada ${strongBefore.gap.toFixed(1)} puan kırılması`:
    learned?`geçmiş %${Math.round(TARGET_CAPTURE*100)} yakalama hedefi · ilk ${width}`:
    `öğrenme dönemi · puan bandı ilk ${width}`;
  return{width,singleQualified,leaderGap,boundaryGap,reason};
}

function ticketMoney(counts,unitPrice){const combinations=product(counts);return{combinations,cost:Number((combinations*Math.max(.01,Number(unitPrice)||1)).toFixed(2))}}

function buildAllRacesTemplate({modelId,races,snapshotsByRace,profiles,eligibleByRace,maxWidth=5}){
  const model=modelById(modelId),profile=profiles?.[modelId]||profileFromSnapshots([],model);
  const templateBase={
    version:'FOGD-ALL-RACES-TEMPLATE-V17.3',couponMode:'FOGD_ALL_RACES_V173',scoreVersion:VERSION,
    modelId:model?.id||modelId,modelKey:model?.key||'',modelLabel:model?.label||modelId,
    available:false,complete:false,profile,allRaces:true
  };
  if(!model)return{...templateBase,error:'Bilinmeyen puan modeli.',legs:[]};
  const ordered=(Array.isArray(races)?races:[]).slice().sort((a,b)=>(Number(a?.no)||0)-(Number(b?.no)||0));
  if(!ordered.length)return{...templateBase,error:'Programda koşu bulunamadı.',legs:[]};
  const legs=ordered.map(race=>{
    const raceNo=Number(race?.no)||0;
    const snapshot=snapshotsByRace&&typeof snapshotsByRace.get==='function'?snapshotsByRace.get(String(raceNo)):null;
    const eligible=eligibleByRace&&typeof eligibleByRace.get==='function'?eligibleByRace.get(String(raceNo)):null;
    const ranked=rankSnapshot(snapshot,model,eligible);
    if(!snapshot||!ranked.usable){
      return{
        raceNo,raceClass:race?.class||'',distance:race?.distance||'',track:race?.track||'',time:race?.time||'',
        available:false,coverage:ranked.coverage||0,selections:[],ranking:ranked.ranking.map((r,j)=>({no:r.horse.no,name:r.horse.name,id:r.horse.id,score:r.score,rank:j+1})),
        error:!snapshot?'Yarış DNA kaydı yok.':ranked.error||`${model.short} puanı kullanılamıyor.`
      };
    }
    const cut=recommendWidth(ranked.ranking,profile,{coverage:ranked.coverage,maxWidth});
    const selectedWidth=cut.singleQualified?1:Math.max(1,Math.min(ranked.ranking.length,cut.width||2));
    return{
      raceNo,raceClass:race?.class||'',distance:race?.distance||'',track:race?.track||'',time:race?.time||'',
      available:true,coverage:ranked.coverage,single:selectedWidth===1,
      cut:{...cut,selectedWidth,automatic:true},
      selections:ranked.ranking.slice(0,selectedWidth).map((r,j)=>({no:r.horse.no,name:r.horse.name,id:r.horse.id,score:r.score,modelRank:j+1,coverage:ranked.coverage,analysisMode:model.key})),
      ranking:ranked.ranking.map((r,j)=>({no:r.horse.no,name:r.horse.name,id:r.horse.id,score:r.score,rank:j+1}))
    };
  });
  const ready=legs.filter(x=>x.available).length,missing=legs.length-ready;
  const warnings=[];
  if(profile.sample<20)warnings.push(`${model.short} geçmiş kalibrasyonu ${profile.sample} koşu; kesim öğrenme döneminde ilk 3 bandından başlar.`);
  else warnings.push(`${model.short} geçmiş ${profile.sample} koşu: İlk1 %${Math.round(profile.rates[1]*100)} · İlk2 %${Math.round(profile.rates[2]*100)} · İlk3 %${Math.round(profile.rates[3]*100)} · İlk4 %${Math.round(profile.rates[4]*100)} · İlk5 %${Math.round(profile.rates[5]*100)}.`);
  if(missing)warnings.push(`${missing} koşu veri kapsamı nedeniyle şablonda uyarı olarak gösterildi; başka puan sütunuyla doldurulmadı.`);
  return{
    ...templateBase,available:ready>0,complete:missing===0,readyRaces:ready,totalRaces:legs.length,missingRaces:missing,
    selectionsTotal:legs.reduce((sum,x)=>sum+(x.selections?.length||0),0),warnings,legs,generatedAt:new Date().toISOString()
  };
}

function buildModelTicket({plan,type,modelId,snapshotsByRace,profiles,budget=500,unitPrice=1,maxSingles=1,eligibleByRace}){
  const model=modelById(modelId),profile=profiles?.[modelId]||profileFromSnapshots([],model);
  const ticketBase={version:'FIVE-TICKET-MODELS-V11.0',couponMode:'FOGD_OFFICIAL_BET_V173',scoreVersion:VERSION,type:type||plan?.desc?.type||'Bahis',modelId:model?.id||modelId,modelLabel:model?.label||modelId,available:false,budget:Number(budget)||500,unitPrice:Number(unitPrice)||1,profile};
  if(!model)return{...ticketBase,error:'Bilinmeyen puan modeli.'};
  if(!plan?.ok)return{...ticketBase,error:plan?.error||'Bahis başlangıcı bulunamadı.'};
  const legsData=(plan.legs||[]).map(race=>{
    const no=Number(race?.no)||0,snapshot=snapshotsByRace&&typeof snapshotsByRace.get==='function'?snapshotsByRace.get(String(no)):null;
    const eligible=eligibleByRace&&typeof eligibleByRace.get==='function'?eligibleByRace.get(String(no)):null;
    const ranked=rankSnapshot(snapshot,model,eligible);
    const cut=recommendWidth(ranked.ranking,profile,{coverage:ranked.coverage,maxWidth:5});
    return{race,no,snapshot,ranked,cut};
  });
  const missing=legsData.filter(x=>!x.snapshot||!x.ranked.usable);
  if(missing.length)return{...ticketBase,startRace:plan.startRace,error:missing.map(x=>`${x.no}.K ${x.snapshot?(x.ranked.error||'veri yetersiz'):'Yarış DNA kaydı yok'}`).join(' · '),legs:missing.map(x=>({raceNo:x.no,selections:[],noData:true}))};
  const singleLimit=Math.max(0,Math.min(Number(maxSingles)||0,legsData.length));
  const candidates=legsData.map((x,i)=>({i,qualified:x.cut.singleQualified,strength:(x.cut.leaderGap||0)+(Number(profile.rates?.[1])||0)*20})).filter(x=>x.qualified).sort((a,b)=>b.strength-a.strength).slice(0,singleLimit);
  const singles=new Set(candidates.map(x=>x.i));
  const counts=legsData.map((x,i)=>singles.has(i)?1:Math.max(1,Math.min(x.ranked.ranking.length,x.cut.width||2)));
  let money=ticketMoney(counts,unitPrice);
  while(money.cost>budget){
    let drop=null;
    for(let i=0;i<legsData.length;i++){
      const min=singles.has(i)?1:Math.min(2,legsData[i].ranked.ranking.length);
      if(counts[i]<=min)continue;
      const removed=legsData[i].ranked.ranking[counts[i]-1],previous=legsData[i].ranked.ranking[counts[i]-2];
      const value=(finite(removed?.score)||0)+(finite(previous?.score)-finite(removed?.score)||0)*.25;
      if(!drop||value<drop.value)drop={i,value};
    }
    if(!drop)break;counts[drop.i]--;money=ticketMoney(counts,unitPrice);
  }
  const legs=legsData.map((x,i)=>{
    const ranking=x.ranked.ranking;
    return{
      raceNo:x.no,raceClass:x.race?.class||'',distance:x.race?.distance||'',track:x.race?.track||'',single:counts[i]===1,
      coverage:x.ranked.coverage,cut:{...x.cut,selectedWidth:counts[i],budgetReduced:counts[i]<(x.cut.width||0)},
      selections:ranking.slice(0,counts[i]).map((r,j)=>({no:r.horse.no,name:r.horse.name,id:r.horse.id,score:r.score,modelRank:j+1,coverage:x.ranked.coverage,analysisMode:model.key})),
      ranking:ranking.map((r,j)=>({no:r.horse.no,name:r.horse.name,id:r.horse.id,score:r.score,rank:j+1}))
    };
  });
  const warnings=[];
  if(profile.sample<20)warnings.push(`${model.short} geçmiş kalibrasyonu ${profile.sample} koşu; model öğrenme döneminde, varsayılan ilk 3 bandı kullanıldı.`);
  else warnings.push(`${model.short} geçmiş ${profile.sample} koşu: İlk1 %${Math.round(profile.rates[1]*100)} · İlk2 %${Math.round(profile.rates[2]*100)} · İlk3 %${Math.round(profile.rates[3]*100)} · İlk4 %${Math.round(profile.rates[4]*100)} · İlk5 %${Math.round(profile.rates[5]*100)}.`);
  if(singleLimit>candidates.length&&singleLimit>0)warnings.push(`En fazla ${singleLimit} tek istendi; yalnız ${candidates.length} ayak güvenli fark eşiğini geçti.`);
  if(money.cost>budget)warnings.push('Kesim normal ayaklarda 2 atın altına indirilemediği için bu model bütçeyi aşıyor.');
  warnings.push('Bütçe bu model kuponunun üst sınırıdır; dokuz kuponun ortak toplam bütçesi değildir.');
  return{...ticketBase,available:true,startRace:plan.startRace,startLabel:plan.startLabel,startInferred:plan.inferred,requestedSingles:singleLimit,actualSingles:legs.filter(x=>x.single).length,combinations:money.combinations,cost:money.cost,overBudget:money.cost>budget,minimumCostExceeded:money.cost>budget,warnings,legs,generatedAt:new Date().toISOString()};
}

root.ATFogdNineCouponCoreV1={VERSION,TARGET_CAPTURE,MODELS,finite,modelById,scoreFor,rankSnapshot,profileFromSnapshots,recommendWidth,ticketMoney,buildAllRacesTemplate,buildModelTicket};
})(typeof globalThis!=='undefined'?globalThis:this);
