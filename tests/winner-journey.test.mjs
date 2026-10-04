import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const real=JSON.parse(fs.readFileSync(new URL('./fixtures/winner-journey-real.json',import.meta.url),'utf8'));
test('actual 2023–2025 programs locate the named winners despite changed race numbers',()=>{
 const {api}=load(),now=real.programs.find(p=>p.date==='2026-10-03').races.map(api.heading),target=now.find(r=>r.raceNo===5);
 for(const [year,no,winner] of [[2025,6,'TOWSON'],[2024,5,'MISS PETIT'],[2023,1,'RUNNER GIRL']]){
  const old=real.programs.find(p=>p.date.startsWith(String(year))).races.map(api.heading),audit=api.cardScore(now,old,target);
  assert.ok(audit.score>0);assert.equal(audit.targetPair.historical.raceNo,no);assert.equal(audit.targetPair.historical.winner,winner);
 }
});
test('actual winner journeys retain entire seasons and never assign a percentage for fewer than two matches',()=>{
 const {api}=load(),candidate=real.careers.find(c=>c.id==='104248'),current=api.season(candidate.history,candidate.cutoff);
 assert.equal(current.length,11);
 for(const historic of real.careers.filter(c=>c.id!=='104248')){
  const prior=api.season(historic.history,historic.cutoff),comparison=api.journey(current,prior);
  assert.ok(comparison.displayRows.length>=Math.max(current.length,prior.length));
  if(comparison.pairs.length<2)assert.equal(comparison.score,null);
  assert.ok(current.every(r=>r.isoDate<candidate.cutoff));
 }
});
function load(oldFetch){
 const window={},document={getElementById(){return null},createElement(){return {}},head:{appendChild(){}},body:{},addEventListener(){}};
 const context={window,document,MutationObserver:class{observe(){}},console:{info(){}},setTimeout,clearTimeout,AbortController,location:{origin:"https://example.test"},URL,fetchHistoricalRoadmap:oldFetch,state:{date:'2026-10-04',city:'Ankara',races:[]},normalizeCareerResponse:data=>data,calculateGalibiyetBenzerligi:null,renderCareerAnalysis:null};
 vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../career-winner-journey-menu-v1.js',import.meta.url),'utf8'),context);
 return {api:window.ATWinnerJourneyMenuV1,context,window};
}
const h=no=>({raceNo:no,class:'ŞARTLI '+no,group:'3 Yaşlı Araplar',track:'Kum',distance:1400});
test('long incompatible careers never create false matches through accumulated skip penalties',()=>{
 const {api}=load(),a={class:'Maiden',ageGroup:'3 Yaşlı İngilizler',track:'Kum',distance:1500,finish:2},b={...a,class:'ŞARTLI 4'};
 const j=api.journey(Array.from({length:30},()=>({...a})),Array.from({length:90},()=>({...b})));
 assert.equal(j.pairs.length,0);assert.equal(j.score,null);
});
test('full-career scoring retains earlier-year evidence and excludes the winning target race',()=>{
 const {api,context}=load(),a={isoDate:'2024-04-01',class:'Maiden',ageGroup:'3 Yaşlı İngilizler',track:'Kum',distance:1500,finish:2};
 context.state.date='2026-10-03';const current=[a,{...a,isoDate:'2025-04-01'},{...a,isoDate:'2026-10-03'}];
 const result=context.calculateGalibiyetBenzerligi(current,{historicalRaces:[{date:'2023-10-03',top3:[{finish:1,horseName:'REF',career:{fullPathBefore:[{...a,isoDate:'2021-04-01'},{...a,isoDate:'2022-04-01'},{...a,isoDate:'2023-10-03'}]}}]}]});
 assert.equal(result.byYear[0].currentPathCount,2);assert.equal(result.byYear[0].historicalPathCount,2);assert.equal(result.byYear[0].matchedSteps,2);
 assert.equal(api.lifetime(current,'2026-10-03').length,2);
});
test('each actual archived year loads its selected winner career directly with an exclusive date cutoff',async()=>{
 const {context,window}=load(),current=real.programs[0];context.state.date=current.date;context.state.city=current.city;context.state.races=current.races;
 window.ATReferenceArchiveV17412={queryArchive:async()=>real.programs.slice(1).flatMap(p=>p.races.map(r=>({...r,date:p.date,city:p.city})))};
 const calls=[];context.fetch=async raw=>{const u=new URL(raw,"https://example.test");calls.push(u);let data;
  if(u.pathname==='/api/tjk-history'){
   const program=real.programs.find(p=>p.date===u.searchParams.get('date')),race=program.races.find(r=>Number(r.no)===Number(u.searchParams.get('raceNo'))),career=real.careers.find(c=>c.name===race.winner);
   data={ok:true,...race,top3:[{finish:1,horseName:career.name,horseId:career.id}]};
  }else{const career=real.careers.find(c=>c.id===u.searchParams.get('horseId'));assert.equal(u.searchParams.get('before'),career.cutoff);data={ok:true,history:career.history,validation:{valid:true},audit:{coverageStatus:'TAM'}}}
  return{ok:true,json:async()=>data};
 };
 const result=await context.fetchHistoricalRoadmap(current.races.find(r=>r.no===5));assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.historicalRaces.length,3);assert.equal(calls.length,6);
 for(const ref of result.historicalRaces)assert.ok(ref.top3[0].career.fullPathBefore.every(r=>r.isoDate<ref.date));
});
test('missing headings cannot count as matching races',()=>{const {api}=load();assert.equal(api.hsim({},{}),0);assert.equal(api.cardScore([h(1),h(2),h(3)],[{},{},{}],h(1)).score,0)});
test('race numbers may change while the entire card matches one to one',()=>{const {api}=load(),now=[h(1),h(2),h(3),h(4)],old=now.map(x=>({...x,raceNo:x.raceNo+4}));const audit=api.cardScore(now,old,now[0]);assert.equal(audit.exact,4);assert.equal(audit.targetPair.historical.raceNo,5);assert.equal(audit.score,100)});
test('three differences in either day reject an incomplete program',()=>{const {api}=load(),now=Array.from({length:8},(_,i)=>h(i+1)),old=now.slice(0,5);assert.equal(api.cardScore(now,old,now[0]).score,0)});
test('January journey includes the previous year and excludes the target race',()=>{const {api}=load();const rows=[{isoDate:'2025-01-01'},{isoDate:'2026-01-03'},{isoDate:'2026-01-04'},{isoDate:'2024-12-31'}];assert.equal(api.season(rows,'2026-01-04').length,2);assert.equal(api.season(rows,'2026-10-04').length,2)});
test('one common test cannot generate a journey score; blank finishes stay missing',()=>{const {api}=load(),r={class:'ŞARTLI 3',ageGroup:'3 Yaşlı Araplar',track:'Kum',distance:1400,city:'Ankara',finish:1};assert.equal(api.journey([r],[r]).score,null);assert.equal(api.journey([{...r,finish:''},{...r,finish:''}],[r,r]).pairs.length,0);assert.ok(api.journey([r,r],[r,r]).score>0)});
test('an absent local program stops before expensive legacy historical downloads',async()=>{let calls=0;const {context}=load(async()=>{calls++;return{ok:true}});const result=await context.fetchHistoricalRoadmap(h(1));assert.equal(result.ok,false);assert.equal(calls,0)});
test('conflicting archive and detailed winners cannot become a reference',async()=>{const {context,window}=load(async()=>({ok:true,historicalRaces:[{date:'2025-10-04',raceNo:1,top3:[{finish:1,horseName:'YANLIŞ AT'}]}]}));context.state.races=[h(1),h(2),h(3)];context.fetch=async()=>({ok:true,json:async()=>({ok:true,top3:[{finish:1,horseName:'YANLIŞ AT'}]})});window.ATReferenceArchiveV17412={queryArchive:async()=>context.state.races.map(x=>({...x,ageGroup:x.group,date:'2025-10-04',city:'Ankara',winner:'DOĞRU AT'}))};const result=await context.fetchHistoricalRoadmap(h(1));assert.equal(result.ok,false);assert.equal(result.historicalRaces.length,0);assert.match(result.error,/uyuşmuyor/)});
test('archive lookup resolves the selected numeric city ID to its actual name',async()=>{const {context,window}=load();context.state.city='4';context.getCityName=()=> 'Diyarbakır';context.state.races=[h(1),h(2),h(3)];let selectedCity;window.ATReferenceArchiveV17412={queryArchive:async opts=>{selectedCity=opts.city;return context.state.races.map(x=>({...x,ageGroup:x.group,date:'2025-10-04',city:'Diyarbakır',winner:'AT'}))}};const day=await window.ATWinnerJourneyMenuV1.findHistoricalDay(h(1));assert.equal(selectedCity,'Diyarbakır');assert.equal(day.city,'Diyarbakır')});
test('missing archive errors are visible rather than labeled as one matching race',()=>{const {context}=load();const content={innerHTML:''};context.document.getElementById=id=>id==='analysisContent'?content:null;context.renderCareerAnalysis({races:[{no:5,roadmapError:'Arşivde program eşleşmedi',horses:[{horse:{no:6,name:'PROMISE ME DELIGHT'},galibiyetBenzerligi:{score:null,referenceCount:0}}]}]});assert.match(content.innerHTML,/Arşivde program eşleşmedi/);assert.match(content.innerHTML,/7\. Tarihsel Sonuç Arşivi/);assert.doesNotMatch(content.innerHTML,/Tek yarış eşleşmesi kabul edilmedi/)});

test('full history reaches journey scoring even when the legacy roadmap contains only top-five finishes',()=>{const {context}=load(),row={isoDate:'2026-04-01',class:'Handikap 13',ageGroup:'3 ve Yukarı İngilizler',track:'Kum',distance:1700,city:'Diyarbakır',finish:7};const full=[row,{...row,isoDate:'2026-05-01'}],career=context.normalizeCareerResponse({history:full,roadmap:[]});const reference=full.map(r=>({...r,isoDate:r.isoDate.replace('2026','2025')}));const score=context.calculateGalibiyetBenzerligi(career.roadmap,{historicalRaces:[{date:'2025-10-04',top3:[{finish:1,horseName:'GEÇMİŞ KAZANAN',career:{fullPathBefore:reference}}]}]});assert.equal(score.byYear[0].currentPathCount,2);assert.equal(score.byYear[0].matchedSteps,2);assert.ok(score.score>0);assert.equal(career.roadmap.length,0)});
test('every archived year is selected independently, with calendar proximity breaking program ties',async()=>{const {api,context,window}=load();context.state.races=[h(1),h(2),h(3)];let query;window.ATReferenceArchiveV17412={queryArchive:async opts=>{query=opts;return ['2025-10-04','2024-10-05','2024-04-01','2023-09-30'].flatMap(date=>context.state.races.map(x=>({...x,ageGroup:x.group,date,city:'Ankara',winner:'AT'})))}};const days=await api.findHistoricalDays(h(1));assert.equal(query.start,undefined);assert.equal(days.length,3);assert.equal(days[1].date,'2024-10-05');assert.equal(days[2].year,2023)});
test('program similarity cannot substitute a different target race class',()=>{const {api}=load(),now=[h(1),h(2),h(3),h(4)],old=now.map(x=>({...x}));old[0].class='ŞARTLI 19';assert.equal(api.cardScore(now,old,now[0]).score,0)});
test('the complete aligned display keeps unmatched starts and excludes future outcomes',()=>{const {api}=load(),r={isoDate:'2026-01-01',class:'ŞARTLI 3',ageGroup:'3 Yaşlı Araplar',track:'Kum',distance:1400,city:'Ankara',finish:1,weight:55,hp:40},a=[r,{...r,class:'Maiden',isoDate:'2026-02-01'},{...r,isoDate:'2026-03-01'}],b=[r,{...r,isoDate:'2026-03-01'}];const result=api.journey(a,b);assert.equal(result.pairs.length,2);assert.equal(result.displayRows.length,3);assert.equal(result.displayRows[1].matched,false);assert.equal(result.displayRows[1].b,null)});
test('opposite intermediate weight/HP movements lower similarity despite equal endpoints',()=>{const {api}=load(),r={class:'ŞARTLI 3',ageGroup:'3 Yaşlı Araplar',track:'Kum',distance:1400,city:'Ankara',finish:1,weight:55,hp:40};const ref=[r,{...r,weight:59,hp:50},r],opposite=[r,{...r,weight:51,hp:30},r];const same=api.journey(ref,ref),different=api.journey(opposite,ref);assert.ok(same.score>different.score);assert.equal(different.pairs[1].changes.currentWeight,-4);assert.equal(different.pairs[1].changes.historicalWeight,4);assert.equal(different.pairs[2].changes.currentHp,10)});
test('missing weight or HP supplies no invented level/trend contribution',()=>{const {api}=load(),r={class:'ŞARTLI 3',ageGroup:'3 Yaşlı Araplar',track:'Kum',distance:1400,city:'Ankara',finish:1},score=api.journey([r,r],[r,r]);assert.equal(score.trend,null);assert.equal(score.missingLevelTrend,true);assert.equal(score.score,85)});
test('rendering includes every historical year and each intermediate change',()=>{const {context}=load();const content={innerHTML:''};context.document.getElementById=id=>id==='analysisContent'?content:null;const a={class:'ŞARTLI 3',ageGroup:'3 Yaşlı Araplar',track:'Kum',distance:1400,city:'Ankara',finish:1,weight:55,hp:40};const j=context.window.ATWinnerJourneyMenuV1.journey([a,{...a,weight:57,hp:43}],[a,{...a,weight:57,hp:43}]);const years=[2025,2024,2023].map(year=>({...j,year,score:100,historicalHorse:'KAZANAN '+year,currentPathCount:2,historicalPathCount:2,matchedSteps:2}));context.renderCareerAnalysis({races:[{no:5,horses:[{horse:{no:6,name:'ADAY'},galibiyetBenzerligi:{score:100,byYear:years}}]}]});for(const year of [2025,2024,2023])assert.match(content.innerHTML,new RegExp('KAZANAN '+year));assert.match(content.innerHTML,/\+2 kg/);assert.match(content.innerHTML,/\+3/)});
