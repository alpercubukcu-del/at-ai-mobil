import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../menu8-compact-f60943147.js',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('function flushOriginIndex('),source.indexOf('function originIndexFresh('));
test('concurrent origin completions coalesce index writes without losing entries',async()=>{
 const idx={entries:{}},writes=[];let active=0,max=0;
 const ctx={originIndexBatch:false,originIndexWriting:null,originIndexRevision:0,originIndexSavedRevision:0,loadOriginIndex:async()=>idx,originKey:(s,n,id)=>s+'_'+(id||n),saveOriginIndex:async()=>{active++;max=Math.max(max,active);const data=JSON.stringify(idx);await new Promise(r=>setTimeout(r,5));writes.push(JSON.parse(data));active--}};
 vm.createContext(ctx);vm.runInContext(functions,ctx);
 await Promise.all(Array.from({length:8},(_,i)=>ctx.touchOriginIndex('dam','NAME'+i,String(i),'dam_'+i,'2026-10-04')));
 assert.equal(max,1);assert.ok(writes.length<=2);assert.equal(Object.keys(writes.at(-1).entries).length,16);
});
test('a failed index write stays dirty and can be retried',async()=>{
 let failed=true;const ctx={originIndexBatch:false,originIndexWriting:null,originIndexRevision:0,originIndexSavedRevision:0,loadOriginIndex:async()=>({entries:{}}),originKey:(s,n)=>s+n,saveOriginIndex:async()=>{if(failed)throw Error('disk')}};
 vm.createContext(ctx);vm.runInContext(functions,ctx);await assert.rejects(ctx.touchOriginIndex('dam','N','1','key','today'));
 assert.equal(ctx.originIndexSavedRevision,0);failed=false;await ctx.flushOriginIndex();assert.equal(ctx.originIndexSavedRevision,1);
});

test('phone origin file writing admits at most two writers and releases every waiting job',async()=>{
 const code=source.slice(source.indexOf('let originFileActive='),source.indexOf('async function saveOriginLineage(')),ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
 let active=0,max=0,finished=0;
 await Promise.all(Array.from({length:8},async()=>{await ctx.originFileSlot();active++;max=Math.max(max,active);try{await new Promise(r=>setTimeout(r,2));finished++}finally{active--;ctx.releaseOriginFileSlot()}}));
 assert.equal(max,2);assert.equal(finished,8);assert.equal(active,0);
});
test('a whole download run commits one index and can recover file metadata before that commit',async()=>{
 const idx={entries:{}},writes=[];const ctx={originIndexBatch:true,originIndexWriting:null,originIndexRevision:0,originIndexSavedRevision:0,loadOriginIndex:async()=>idx,originKey:(s,n,id)=>s+'_'+(id||n),saveOriginIndex:async()=>writes.push(JSON.parse(JSON.stringify(idx)))};
 vm.createContext(ctx);vm.runInContext(functions,ctx);await Promise.all(Array.from({length:176},(_,i)=>ctx.touchOriginIndex('dam','N'+i,String(i),'dam_'+i,'2026-10-04')));assert.equal(writes.length,0);ctx.originIndexBatch=false;await ctx.flushOriginIndex();assert.equal(writes.length,1);assert.equal(Object.keys(writes[0].entries).length,352);
});
test('a committed origin file is recoverable by name before its shared index is saved',async()=>{
 const files=new Map();let closed=false,touched=false;const dir={async getFileHandle(key){return{async createWritable(){let data;return{async write(s){data=s},async close(){files.set(key,data);closed=true},async abort(){}}},async getFile(){if(!files.has(key))throw Error('missing');return{text:async()=>files.get(key)}}}}};
 const root={},ctx={rootDir:root,directory:()=>({ready:()=>true,getHandle:()=>root}),archiveChild:async()=>dir,archiveWriter:h=>h.createWritable(),originFileSlot:async()=>{},releaseOriginFileSlot(){},originKey:(sec,name,id)=>sec+'_'+(id||name),touchOriginIndex:async()=>{assert.equal(closed,true);touched=true}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function originLineageFile('),source.indexOf('let originFileActive='))+source.slice(source.indexOf('async function saveOriginLineage('),source.indexOf('function numField(')),ctx);
 await ctx.saveOriginLineage('dam','NAME','123',[{horse:'A'}],'TJK');assert.equal(touched,true);const recovered=await ctx.originLineageFile('dam','NAME');assert.equal(recovered.id,'123');assert.equal(recovered.rows.length,1);
});
