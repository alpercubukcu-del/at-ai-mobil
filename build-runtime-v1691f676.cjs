const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f675.cjs');
const UI=path.join(ROOT,'results-first-ui-enforcer-v1691f676.js');
const API=path.join(ROOT,'api','tjk-result-index-v1.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.76] F60.75.1 builder missing');
if(!fs.existsSync(UI))throw new Error('[F60.76] results-first UI enforcer missing');
if(!fs.existsSync(API))throw new Error('[F60.76] result index API missing');
const ui=fs.readFileSync(UI,'utf8'),api=fs.readFileSync(API,'utf8');
for(const token of['RESULTS-FIRST-UI-V16.9.1F60.76','#annualArchiveBtn','Yıllık Yarış Sonuç Arşivi','f62rRepair'])if(!ui.includes(token))throw new Error('[F60.76] UI invariant missing: '+token);
for(const token of['TJK-RESULT-INDEX-V1-F60.76','sourceSignature','PageNumber:page','sourceRowCount'])if(!api.includes(token))throw new Error('[F60.76] API invariant missing: '+token);
new Function(ui);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const marker='async function discoverYear(year,start,end,force=false){';
const a=app.lastIndexOf(marker),b=a>=0?app.indexOf('async function saveRace(',a):-1;
if(a<0||b<0)throw new Error('[F60.76] F60.75 discoverYear block not found');
const discover=`async function discoverYear(year,start,end,force=false){
  const ys=\`${'${year}'}-01-01\`,ye=\`${'${year}'}-12-31\`,from=start>ys?start:ys,to=end<ye?end:ye;if(from>to)return[];
  const key=\`f6076:index:${'${year}'}:${'${from}'}:${'${to}'}\`,cached=await get(ensureResultsDb(),META,key),today=new Date().toISOString().slice(0,10),isCurrent=Number(today.slice(0,4))===Number(year),ageMs=cached?.updatedAt?Date.now()-Date.parse(cached.updatedAt):Infinity;
  if(!force&&cached?.status==='complete'&&Array.isArray(cached?.groups)&&(!isCurrent||ageMs<6*3600e3))return cached.groups;
  const map=new Map(),seenPages=new Set();let page=1,exhausted=false;
  while(page<=1000){
    const u=new URL('/api/tjk-result-index-v1',location.origin);u.searchParams.set('start',from);u.searchParams.set('end',to);u.searchParams.set('page',String(page));u.searchParams.set('_f6076','1');
    const data=await fetchJson(u.pathname+u.search),rows=Array.isArray(data?.rows)?data.rows:[],sourceCount=Number(data?.sourceRowCount||0),sig=clean(data?.sourceSignature||'');
    if(sourceCount<=0){exhausted=true;break}
    const pageSig=\`${'${sourceCount}'}|${'${sig}'}\`;
    if(seenPages.has(pageSig))throw new Error(\`TJK sonuç listelemesi ${'${page}'}. sayfada tekrar etti. Eksik liste tam kabul edilmedi; tekrar deneyin.\`);
    seenPages.add(pageSig);
    for(const r of rows){const date=iso(r.date),city=clean(r.city),no=Number(r.raceNo||0);if(!date||!city||!no)continue;const k=dayKey(date,city);if(!map.has(k))map.set(k,{key:k,date,city,expectedNos:[]});const g=map.get(k);if(!g.expectedNos.includes(no))g.expectedNos.push(no)}
    page++;
  }
  if(!exhausted)throw new Error('TJK sonuç listesi 1000 sayfa sınırında bitmedi. Arşiv eksik kabul edilmedi.');
  const groups=[...map.values()].map(g=>({...g,expectedNos:g.expectedNos.sort((x,y)=>x-y)})).sort((x,y)=>x.date.localeCompare(y.date)||x.city.localeCompare(y.city,'tr'));
  await put(ensureResultsDb(),META,{key,year,from,to,status:'complete',groups,pages:page-1,updatedAt:new Date().toISOString(),source:'RESULTS-FIRST-F60.76'});return groups;
}
`;
app=app.slice(0,a)+discover+app.slice(b);
app+='\n\n'+ui.trim()+'\n';
for(const token of['RESULTS-FIRST-HISTORICAL-V16.9.1F60.75.1','RESULTS-FIRST-UI-V16.9.1F60.76','f6076:index:','sourceSignature','TJK sonuç listelemesi'])if(!app.includes(token))throw new Error('[F60.76] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169283');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169283'))throw new Error('[F60.76] cache bust failed');
console.log('[AT AI] V16.9.1F60.76 build complete: realized-results pagination continues until a truly empty source page; repeated pages fail closed; stale 8/8 discovery cache is bypassed; old annual-program UI is hidden.');
