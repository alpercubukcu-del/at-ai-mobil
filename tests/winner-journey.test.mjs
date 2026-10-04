import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function load(oldFetch){
 const window={},document={getElementById(){return null},createElement(){return {}},head:{appendChild(){}},body:{},addEventListener(){}};
 const context={window,document,MutationObserver:class{observe(){}},console:{info(){}},setTimeout,URL,fetchHistoricalRoadmap:oldFetch,state:{date:'2026-10-04',city:'Ankara',races:[]},calculateGalibiyetBenzerligi:null,renderCareerAnalysis:null};
 vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../career-winner-journey-menu-v1.js',import.meta.url),'utf8'),context);
 return {api:window.ATWinnerJourneyMenuV1,context,window};
}
const h=no=>({raceNo:no,class:'ŞARTLI '+no,group:'3 Yaşlı Araplar',track:'Kum',distance:1400});
test('missing headings cannot count as matching races',()=>{const {api}=load();assert.equal(api.hsim({},{}),0);assert.equal(api.cardScore([h(1),h(2),h(3)],[{},{},{}],h(1)).score,0)});
test('race numbers may change while the entire card matches one to one',()=>{const {api}=load(),now=[h(1),h(2),h(3),h(4)],old=now.map(x=>({...x,raceNo:x.raceNo+4}));const audit=api.cardScore(now,old,now[0]);assert.equal(audit.exact,4);assert.equal(audit.targetPair.historical.raceNo,5);assert.equal(audit.score,100)});
test('three differences in either day reject an incomplete program',()=>{const {api}=load(),now=Array.from({length:8},(_,i)=>h(i+1)),old=now.slice(0,5);assert.equal(api.cardScore(now,old,now[0]).score,0)});
test('January journey includes the previous year and excludes the target race',()=>{const {api}=load();const rows=[{isoDate:'2025-01-01'},{isoDate:'2026-01-03'},{isoDate:'2026-01-04'},{isoDate:'2024-12-31'}];assert.equal(api.season(rows,'2026-01-04').length,2);assert.equal(api.season(rows,'2026-10-04').length,2)});
test('one common test cannot generate a journey score; blank finishes stay missing',()=>{const {api}=load(),r={class:'ŞARTLI 3',ageGroup:'3 Yaşlı Araplar',track:'Kum',distance:1400,city:'Ankara',finish:1};assert.equal(api.journey([r],[r]).score,null);assert.equal(api.journey([{...r,finish:''},{...r,finish:''}],[r,r]).pairs.length,0);assert.ok(api.journey([r,r],[r,r]).score>0)});
test('an absent local program stops before expensive legacy historical downloads',async()=>{let calls=0;const {context}=load(async()=>{calls++;return{ok:true}});const result=await context.fetchHistoricalRoadmap(h(1));assert.equal(result.ok,false);assert.equal(calls,0)});
test('conflicting archive and detailed winners cannot become a reference',async()=>{const {context,window}=load(async()=>({ok:true,historicalRaces:[{date:'2025-10-04',raceNo:1,top3:[{finish:1,horseName:'YANLIŞ AT'}]}]}));context.state.races=[h(1),h(2),h(3)];window.ATReferenceArchiveV17412={queryArchive:async()=>context.state.races.map(x=>({...x,ageGroup:x.group,date:'2025-10-04',city:'Ankara',winner:'DOĞRU AT'}))};const result=await context.fetchHistoricalRoadmap(h(1));assert.equal(result.ok,false);assert.equal(result.historicalRaces.length,0);assert.match(result.error,/uyuşmuyor/)});
