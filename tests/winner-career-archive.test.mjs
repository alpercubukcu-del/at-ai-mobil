import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import * as cheerio from 'cheerio';import {extractHorseName} from '../api/tjk-career-v10.js';
const code=fs.readFileSync(new URL('../winner-career-archive-v18.js',import.meta.url),'utf8');
const ref={date:'2017-08-08',city:'Kocaeli',raceNo:2,winner:'ŞUBAR',winnerUrl:'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?QueryParameter_AtId=999',heading:{class:'ŞARTLI 3/Dişi',group:'3 ve Yukarı İngilizler',distance:1700,track:'Kum'}};
const race={isoDate:'2017-08-08',city:'Kocaeli',raceNoName:'2',class:'ŞARTLI 3/Dişi',ageGroup:'3 ve Yukarı İngilizler',distance:1700,track:'Kum',finish:1,weight:56,hp:41};
const history=[{...race,isoDate:'2018-01-01'},race,{...race,isoDate:'2017-07-11',class:'Handikap 14/Dişi',distance:1800,finish:3,weight:52},{...race,isoDate:'2016-10-01',class:'Maiden',finish:5}];
const complete=()=>({ok:true,horseId:'999',horseName:'ŞUBAR',before:null,history:structuredClone(history),audit:{coverageStatus:'TAM',collectedTotal:history.length},validation:{valid:true},top5:structuredClone(history),wins:structuredClone(history)});
function harness(files=new Map(),options={}){
 const writes=[];const root={name:'AT AI MOBIL',getDirectoryHandle:async name=>directory(name)};
 function directory(path){return{getDirectoryHandle:async name=>directory(path+'/'+name),async getFileHandle(name,{create=false}={}){const key=path+'/'+name;if(!create&&!files.has(key)){const e=Error('missing');e.name='NotFoundError';throw e}return{getFile:async()=>({text:async()=>files.get(key)}),createWritable:async()=>{let bytes;return{write:async value=>bytes=value,close:async()=>{if(options.failWrite&&name==='999.json')throw Error('disk failed');files.set(key,bytes);writes.push(key)},abort:async()=>{}}}}}}}
 const window={ATArchiveDirectoryV1741:{getHandle:()=>root,ready:()=>options.ready!==false,child:async(p,n,o)=>p.getDirectoryHandle(n,o)}};const context=vm.createContext({window,URL,console,Date});vm.runInContext(code,context);
 return{api:window.ATWinnerCareerArchiveV18,files,writes,root};
}
test('missing winner career is verified, saved in Atlar and reused after restart without network',async()=>{
 const h=harness();let fetched=0,resolved=0;const deps={fetchCareer:async id=>{fetched++;assert.equal(id,'999');return complete()},resolveWinner:async()=>{resolved++;throw Error('ID already present')}};
 const first=await h.api.get(ref,deps);assert.equal(first.source,'tjk');assert.equal(first.permanent,true);assert.equal(fetched,1);assert.equal(resolved,0);
 assert.deepEqual(Array.from(first.career.history,r=>r.isoDate),['2017-07-11','2016-10-01']);assert.ok(first.career.top5.every(r=>r.isoDate<ref.date));assert.ok(first.career.wins.every(r=>r.isoDate<ref.date));
 const doc=JSON.parse(h.files.get('Gerçek Yarış Arşivi/Atlar/999.json'));assert.equal(doc.races.length,4);assert.equal(doc.races[0].date,'2018-01-01');assert.equal(doc.verifiedCareer.data.audit.coverageStatus,'TAM');
 const restart=harness(h.files);const second=await restart.api.get({...ref,winnerUrl:''},{fetchCareer:async()=>{throw Error('offline')},resolveWinner:async()=>{throw Error('offline')}});assert.equal(second.source,'phone');assert.equal(second.career.history.length,2);assert.equal(restart.writes.length,0);
});
test('existing unverified horse records are preserved while full career is verified once',async()=>{
 const files=new Map([['Gerçek Yarış Arşivi/Atlar/999.json',JSON.stringify({horseId:'999',name:'ŞUBAR',origin:'retained',races:[{date:'2015-01-01',city:'Bursa',distance:1200,track:'Çim',finish:2}]})]]),h=harness(files);let calls=0;
 await h.api.get(ref,{fetchCareer:async()=>{calls++;return complete()}});const doc=JSON.parse(files.get('Gerçek Yarış Arşivi/Atlar/999.json'));assert.equal(doc.origin,'retained');assert.equal(doc.races.length,5);await h.api.get(ref,{fetchCareer:async()=>{calls++;return complete()}});assert.equal(calls,1);
});
test('partial history and a wrong winning-race header cannot be saved as verified',async()=>{
 for(const change of [d=>d.audit.coverageStatus='KISMİ',d=>d.horseName='YANLIŞ AT',d=>d.history[1].distance=1900]){const h=harness(),data=complete();change(data);await assert.rejects(h.api.get(ref,{fetchCareer:async()=>data}),/doğrulanamadı/);assert.equal(h.files.size,0)}
});
test('two references for one winner share a fetch and retain both index entries',async()=>{
 const h=harness(),second={...ref,date:'2018-01-01'},data=complete();let calls=0;
 const deps={fetchCareer:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,5));return data}};
 const [a,b]=await Promise.all([h.api.get(ref,deps),h.api.get(second,deps)]);assert.equal(calls,1);assert.equal(a.career.history.length,2);assert.equal(b.career.history.length,3);
 const idx=JSON.parse(h.files.get('Gerçek Yarış Arşivi/Atlar/_winner-career-index-v1.json'));assert.equal(Object.keys(idx.entries).length,2);
});
test('failed disk write never marks the reference saved; retry persists successfully',async()=>{
 const options={failWrite:true},h=harness(new Map(),options),deps={fetchCareer:async()=>complete()};await assert.rejects(h.api.get(ref,deps),/disk failed/);assert.equal(h.files.size,0);options.failWrite=false;const result=await h.api.get(ref,deps);assert.equal(result.permanent,true);assert.equal(h.files.size,2);
});
test('missing folder permission stops before downloading',async()=>{const h=harness(new Map(),{ready:false});let calls=0;await assert.rejects(h.api.get(ref,{fetchCareer:async()=>{calls++;return complete()}}),/klasörünü seçin/);assert.equal(calls,0)});

test('winner without an ID link is resolved once then found by permanent index offline',async()=>{const h=harness(),legacy={...ref,winnerUrl:''};let resolved=0;await h.api.get(legacy,{resolveWinner:async()=>{resolved++;return{horseId:'999',horseName:'ŞUBAR'}},fetchCareer:async()=>complete()});assert.equal(resolved,1);const restarted=harness(h.files);assert.equal((await restarted.api.get(legacy,{resolveWinner:async()=>{throw Error('offline')},fetchCareer:async()=>{throw Error('offline')}})).source,'phone')});

test('generic TJK page titles are not treated as horse names',()=>{assert.equal(extractHorseName(cheerio.load('<h2>At Koşu Bilgileri</h2><h1>ŞUBAR</h1>')),'ŞUBAR');assert.equal(extractHorseName(cheerio.load('<h2>At Koşu Bilgileri</h2><title>TJK</title>')),'')});
test('missing page name still requires the verified identity and exact winning race',async()=>{const h=harness(),data=complete();data.horseName='';const r=await h.api.get(ref,{fetchCareer:async()=>data});assert.equal(r.horseName,'ŞUBAR');assert.equal(JSON.parse(h.files.get('Gerçek Yarış Arşivi/Atlar/999.json')).name,'ŞUBAR');const invalid=complete();invalid.horseName='';invalid.history[1].finish=2;assert.throws(()=>h.api.validateCareer(ref,invalid,'999'),/birincilik doğrulanamadı/)});
