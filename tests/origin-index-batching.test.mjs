import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../menu8-compact-f60943147.js',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('function flushOriginIndex('),source.indexOf('function originIndexFresh('));
test('concurrent origin completions coalesce index writes without losing entries',async()=>{
 const idx={entries:{}},writes=[];let active=0,max=0;
 const ctx={originIndexWriting:null,originIndexRevision:0,originIndexSavedRevision:0,loadOriginIndex:async()=>idx,originKey:(s,n,id)=>s+'_'+(id||n),saveOriginIndex:async()=>{active++;max=Math.max(max,active);const data=JSON.stringify(idx);await new Promise(r=>setTimeout(r,5));writes.push(JSON.parse(data));active--}};
 vm.createContext(ctx);vm.runInContext(functions,ctx);
 await Promise.all(Array.from({length:8},(_,i)=>ctx.touchOriginIndex('dam','NAME'+i,String(i),'dam_'+i,'2026-10-04')));
 assert.equal(max,1);assert.ok(writes.length<=2);assert.equal(Object.keys(writes.at(-1).entries).length,16);
});
test('a failed index write stays dirty and can be retried',async()=>{
 let failed=true;const ctx={originIndexWriting:null,originIndexRevision:0,originIndexSavedRevision:0,loadOriginIndex:async()=>({entries:{}}),originKey:(s,n)=>s+n,saveOriginIndex:async()=>{if(failed)throw Error('disk')}};
 vm.createContext(ctx);vm.runInContext(functions,ctx);await assert.rejects(ctx.touchOriginIndex('dam','N','1','key','today'));
 assert.equal(ctx.originIndexSavedRevision,0);failed=false;await ctx.flushOriginIndex();assert.equal(ctx.originIndexSavedRevision,1);
});
