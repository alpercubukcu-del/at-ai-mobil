import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function runtime(fetch){
  const context={console,setTimeout,clearTimeout,AbortController,fetch,indexedDB:{open(){throw new Error('no local database')}}};
  context.window=context;vm.createContext(context);
  for(const name of['fogd-condition-core.js','fogd-condition-coupon-v174.js'])vm.runInContext(fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8'),context);
  return context.ATFogdConditionCouponV174;
}
const race={no:1,distance:1500,track:'Sentetik',horses:[{no:1,id:'12345'}]};
const snapshot={date:'2026-09-29',rows:[{no:1,name:'TEST',F:40,D:99,program:{id:'12345'}}]};
test('history transport deduplicates requests and leaves nine-model snapshots unchanged',async()=>{
  let requests=0;
  const transport=runtime(async url=>{assert.match(url,/atId=12345$/);requests++;return{ok:true,json:async()=>({ok:true,atId:'12345',races:[{date:'2026-01-01',city:'Adana',distance:1500,track:'Sentetik',finish:2,degree:'1.43.00'}]})}});
  const before=JSON.stringify(snapshot),map=new Map([['1',snapshot]]);
  const[one,two]=await Promise.all([transport.enrichSnapshots(map,[race],{date:'2026-09-29',city:'Adana'}),transport.enrichSnapshots(map,[race],{date:'2026-09-29',city:'Adana'})]);
  assert.equal(requests,1);assert.equal(one.map.get('1').rows[0].conditionHistoryRecords.length,1);
  assert.equal(two.map.get('1').rows[0].conditionHistorySource,'TJK');assert.equal(JSON.stringify(snapshot),before);
  await transport.enrichSnapshots(map,[race],{date:'2026-09-30',city:'Adana'});assert.equal(requests,2);
});
test('failed or mismatched API responses stay missing and can be retried',async()=>{
  let requests=0;
  const transport=runtime(async()=>{requests++;return{ok:true,json:async()=>({ok:true,atId:'99999',races:[]})}});
  const map=new Map([['1',snapshot]]);
  const result=await transport.enrichSnapshots(map,[race],{date:'2026-09-29',city:'Adana'});
  assert.equal(result.map.get('1').rows[0].conditionHistoryRecords,undefined);
  assert.match(result.map.get('1').rows[0].conditionHistoryError,/kimliği/);
  await transport.enrichSnapshots(map,[race],{date:'2026-09-29',city:'Adana'});assert.equal(requests,2);
});
test('missing horse identity never starts a request or invents history',async()=>{
  const transport=runtime(()=>{throw new Error('fetch should not be called')});
  const result=await transport.enrichSnapshots(new Map([['1',{rows:[{no:2}]}]]),[race],{date:'2026-09-29',city:'Adana'});
  assert.equal(result.map.get('1').rows[0].conditionHistoryRecords,undefined);
  assert.match(result.map.get('1').rows[0].conditionHistoryError,/kimliği yok/);
});
