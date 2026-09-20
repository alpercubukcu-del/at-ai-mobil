const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f728.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.9] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

const oldContext="const o=parseOrigin(h?.origin||''),u=new URL(API,location.origin);u.searchParams.set('horse',clean(h?.name));u.searchParams.set('raceDate',date);if(h?.id)u.searchParams.set('atId',String(h.id));";
const newContext="const hid=h?.id??h?.atId??h?.horseId??h?.at_id??null,orig=h?.origin??h?.orjin??h?.originText??h?.pedigree??'',o=parseOrigin(orig),u=new URL(API,location.origin);u.searchParams.set('horse',clean(h?.name));u.searchParams.set('raceDate',date);if(hid)u.searchParams.set('atId',String(hid));";
if((app.split(oldContext).length-1)!==1)throw new Error('[F60.94.31.9] horse context target mismatch');
app=app.replace(oldContext,newContext);

const oldFetch="const r=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'}});const d=await r.json();";
const newFetch="const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),9000);let r;try{r=await fetch(u.pathname+u.search,{cache:'no-store',headers:{accept:'application/json'},signal:ctl.signal})}finally{clearTimeout(timer)}const d=await r.json();";
if((app.split(oldFetch).length-1)!==1)throw new Error('[F60.94.31.9] FOGD fetch target mismatch');
app=app.replace(oldFetch,newFetch);

const oldWait="degreeScores(horses);setPanelStatus(`${no}. Koşu · TJK Orijin ve Galop verileri alınıyor 0/${horses.length}…`);let done=0;const contexts=await mapLimit(horses,3,async r=>{const d=await horseContext(date,r.program);done++;setPanelStatus(`${no}. Koşu · TJK Orijin ve Galop verileri ${done}/${horses.length}…`);return d});";
const newWait="degreeScores(horses);for(const r of horses){r.coverage=(Number.isFinite(r.F)?WEIGHTS.F:0)+(Number.isFinite(r.D)?WEIGHTS.D:0);r.coveragePct=Math.round(r.coverage*100);r.T=null;r.totalRank=null;r.signal='';r.actualFinish=null;r.actualDegree=''}renderResults(pr,[...horses].sort((a,b)=>(a.currentRank||999)-(b.currentRank||999)||Number(a.no)-Number(b.no)),null);setPanelStatus(`${no}. Koşu · F + D hazır · O/G tamamlanıyor 0/${horses.length}…`);let done=0;const contexts=await mapLimit(horses,6,async r=>{try{return await horseContext(date,r.program)}catch(e){return{error:e?.name==='AbortError'?'O/G zaman aşımı':(e?.message||String(e))}}finally{done++;setPanelStatus(`${no}. Koşu · F + D hazır · O/G ${done}/${horses.length}…`)}});";
if((app.split(oldWait).length-1)!==1)throw new Error('[F60.94.31.9] FOGD wait target mismatch');
app=app.replace(oldWait,newWait);

for(const t of['F + D hazır · O/G','mapLimit(horses,6','ctl.abort(),9000','h?.atId??h?.horseId','F60.94.31.8 FOGD background actual'])if(!app.includes(t))throw new Error('[F60.94.31.9] bundle invariant missing '+t);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692979');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692979'))throw new Error('[F60.94.31.9] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.9 build complete: F+D renders immediately; O/G is bounded, progressive and 6-way concurrent.');
