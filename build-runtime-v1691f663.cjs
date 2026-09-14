const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f662.cjs');
const EXTRAS=[
  'current-analysis-multifilter-bridge-v1691f663.js',
  'compact-filter-dropdown-v1691f663.js',
  'current-analysis-mobile-scroll-fix-v1691f664.js',
  'current-analysis-outlier-filter-v1691f665.js',
  'home-market-manual-refresh-v1691f666.js'
].map(name=>path.join(ROOT,name));
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.67] Missing F60.62 baseline builder.');
for(const file of EXTRAS)if(!fs.existsSync(file))throw new Error('[F60.67] Missing runtime: '+path.basename(file));
let currentSource=fs.readFileSync(EXTRAS[0],'utf8');
const compactSource=fs.readFileSync(EXTRAS[1],'utf8');
const scrollSource=fs.readFileSync(EXTRAS[2],'utf8');
let outlierSource=fs.readFileSync(EXTRAS[3],'utf8');
const marketSource=fs.readFileSync(EXTRAS[4],'utf8');

function mustReplace(src,from,to,label){
  if(!src.includes(from))throw new Error('[F60.67] Patch target missing: '+label);
  const out=src.replace(from,to);
  if(out===src||out.includes(from))throw new Error('[F60.67] Patch failed: '+label);
  return out;
}

// F60.66 — Current Analysis must open instantly: no annual archive scan until the user explicitly enters Özel.
currentSource=mustReplace(currentSource,"let activeMode='custom';","let activeMode='standard';",'default Standard mode');
currentSource=mustReplace(
  currentSource,
  "if(mode==='custom'&&!universe.length)setTimeout(()=>prepare(selectedRaceContext(),true,false),0);",
  "if(mode==='custom'&&!universe.length){const status=$('f63Status');if(status)status.textContent='Özel filtreler hazır. Arşiv, Özel sekmesine dokunduğunuzda bir kez yüklenecek.';window.ATF6065Outlier?.reconcile?.();}",
  'remove eager setMode archive scan'
);
currentSource=mustReplace(
  currentSource,
  "p.addEventListener('click',e=>{const b=e.target.closest?.('[data-f63-mode]');if(b)setMode(b.dataset.f63Mode,b.dataset.f63Mode==='results');});",
  "p.addEventListener('click',e=>{const b=e.target.closest?.('[data-f63-mode]');if(!b)return;const mode=b.dataset.f63Mode;setMode(mode,mode==='results');if(mode==='custom'&&!universe.length){const run=()=>prepare(selectedRaceContext(),true,false);if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:900});else setTimeout(run,80);}});",
  'lazy load on explicit Custom click'
);
currentSource=mustReplace(
  currentSource,
  "const dateChange=()=>{loadedRange='';prepare(selectedRaceContext(),true,false);};",
  "const dateChange=()=>{loadedRange='';universe=[];const status=$('f63Status');if(status)status.textContent='Tarih aralığı değişti. Arşiv yalnız Hesapla dediğinizde yeniden okunacak.';window.ATF6065Outlier?.reconcile?.();};",
  'date change no scan'
);
currentSource=mustReplace(
  currentSource,
  "setDefaultDates(false).then(()=>prepare(selectedRaceContext(),true,false));",
  "{const cap=currentDate();if($('f63Start'))$('f63Start').value=yearsBack(cap,2);if($('f63End'))$('f63End').value=addDays(cap,-1);window.ATF6065Outlier?.reconcile?.();}",
  'initial panel no scan'
);
currentSource=mustReplace(
  currentSource,
  "handleAnalysisRaceChange=function(){const out=before.apply(this,arguments);setTimeout(()=>{updatePanel();loadedRange='';if(activeMode==='custom')prepare(selectedRaceContext(),true,false);},0);return out;};",
  "handleAnalysisRaceChange=function(){const out=before.apply(this,arguments);setTimeout(()=>{updatePanel();loadedRange='';universe=[];window.ATF6065Outlier?.reconcile?.();},0);return out;};",
  'race change no scan'
);
currentSource=mustReplace(
  currentSource,
  "const obs=new MutationObserver(scheduleWake);if(document.documentElement)obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open','data-view']});",
  "const obs=new MutationObserver(scheduleWake);if(document.documentElement)obs.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['open','data-view']});",
  'remove document childList wake storm'
);
currentSource=mustReplace(
  currentSource,
  "document.addEventListener('change',e=>{if(e.target?.id==='analysisRace')setTimeout(()=>{updatePanel();loadedRange='';if(activeMode==='custom')prepare(selectedRaceContext(),true,false);},0);},true);",
  "document.addEventListener('change',e=>{if(e.target?.id==='analysisRace')setTimeout(()=>{updatePanel();loadedRange='';universe=[];window.ATF6065Outlier?.reconcile?.();},0);},true);",
  'analysisRace change no scan'
);
currentSource=mustReplace(
  currentSource,
  "openArchiveDb();if(document.readyState==='loading')",
  "if(document.readyState==='loading')",
  'no DB open at boot'
);

// F60.67 — Race count limit: Tümü / Son 1..Son 10. Limit is applied LAST,
// after criterion matching and (when enabled) bad/outlier career-row removal.
currentSource=mustReplace(
  currentSource,
  '<select id="f63Limit" class="f63-selectbox"><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="50" selected>50</option><option value="100">100</option><option value="200">200</option></select>',
  '<select id="f63Limit" class="f63-selectbox"><option value="all" selected>Tümü</option><option value="1">Son 1</option><option value="2">Son 2</option><option value="3">Son 3</option><option value="4">Son 4</option><option value="5">Son 5</option><option value="6">Son 6</option><option value="7">Son 7</option><option value="8">Son 8</option><option value="9">Son 9</option><option value="10">Son 10</option></select>',
  'recent limit options'
);
currentSource=mustReplace(
  currentSource,
  "function selectedRefs(){\n  const f=selectedFilters(),limit=Math.max(1,Number($('f63Limit')?.value)||50),dropBad=!!$('f63DropBad')?.checked;\n  let rows=universe.filter(r=>r?.date<currentDate()&&C.rowPasses(r,f));\n  if(dropBad)rows=rows.filter(rowComplete);\n  rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(a.raceNo||0)-Number(b.raceNo||0));\n  return {filters:f,rows:rows.slice(0,limit)};\n}",
  "function selectedRefs(){\n  const f=selectedFilters(),rawLimit=clean($('f63Limit')?.value||'all'),n=Number(rawLimit),recentLimit=rawLimit==='all'||!Number.isFinite(n)?0:Math.min(10,Math.max(1,Math.trunc(n))),dropBad=!!$('f63DropBad')?.checked;\n  let rows=universe.filter(r=>r?.date<currentDate()&&C.rowPasses(r,f));\n  if(dropBad)rows=rows.filter(rowComplete);\n  rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(a.raceNo||0)-Number(b.raceNo||0));\n  return {filters:f,rows,recentLimit,dropBad};\n}",
  'defer recent limit until after filtering'
);
currentSource=mustReplace(
  currentSource,
  "function setConfigsForCurrentSelection(filters,rows){\n  const refs=rows.map(refFromRow),contexts=runContexts();\n  for(const ctx of contexts)configs.set(configKey(ctx),{filters:{...filters},refs:[...refs],updatedAt:new Date().toISOString(),mode:'custom'});\n  return contexts.length;\n}",
  "function setConfigsForCurrentSelection(filters,rows,recentLimit=0,dropBad=false){\n  const refs=rows.map(refFromRow),contexts=runContexts();\n  for(const ctx of contexts)configs.set(configKey(ctx),{filters:{...filters},refs:[...refs],recentLimit:Number(recentLimit)||0,dropBad:!!dropBad,updatedAt:new Date().toISOString(),mode:'custom'});\n  return contexts.length;\n}",
  'persist recent limit in analysis config'
);
currentSource=mustReplace(
  currentSource,
  "function filterCareerPayload(payload,cfg){\n  if(!payload||typeof payload!=='object'||payload.ok===false||!cfg)return payload;\n  const out={...payload},names=['history','preparationPath','top5','roadmap','races'];\n  for(const name of names){const arr=payload[name];if(!Array.isArray(arr))continue;out[name]=arr.filter(row=>{const n=careerRow(row);if(!n.date)return false;return cfg.refs?.length?cfg.refs.some(ref=>refMatch(n,ref)):C.rowPasses(n,cfg.filters);});}\n  out.f6063Filter={version:VERSION,referenceCount:cfg.refs?.length||0,filters:cfg.filters};return out;\n}",
  "function filterCareerPayload(payload,cfg){\n  if(!payload||typeof payload!=='object'||payload.ok===false||!cfg)return payload;\n  let source=payload;\n  if(cfg.dropBad&&window.ATF6065Outlier?.filterPayload){try{source=window.ATF6065Outlier.filterPayload(source).payload||source;}catch{}}\n  const out={...source},names=['history','preparationPath','top5','roadmap','races'],recentLimit=Math.min(10,Math.max(0,Number(cfg.recentLimit)||0));\n  const recentRows=arr=>{if(!recentLimit||arr.length<=recentLimit)return arr;const ranked=arr.map((row,i)=>({i,date:careerRow(row).date||''})).sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.i-a.i).slice(0,recentLimit),keep=new Set(ranked.map(x=>x.i));return arr.filter((_,i)=>keep.has(i));};\n  for(const name of names){const arr=source[name];if(!Array.isArray(arr))continue;const filtered=arr.filter(row=>{const n=careerRow(row);if(!n.date)return false;return cfg.refs?.length?cfg.refs.some(ref=>refMatch(n,ref)):C.rowPasses(n,cfg.filters);});out[name]=recentRows(filtered);}\n  out.f6063Filter={version:VERSION,referenceCount:cfg.refs?.length||0,recentLimit,dropBad:!!cfg.dropBad,filters:cfg.filters};return out;\n}",
  'apply bad filter then criteria then recent limit'
);
currentSource=mustReplace(
  currentSource,
  "    const {filters,rows}=selectedRefs();\n    if(!rows.length){if(status)status.textContent='Bu seçimlerle eşleşen geçmiş yarış bulunamadı. Filtrelerden birini genişlet.';return;}\n    const count=setConfigsForCurrentSelection(filters,rows);\n    if(status)status.textContent=`${fmt(rows.length)} geçmiş yarış seçildi · ${count||1} koşu için Güncel Analiz hesaplanıyor…`;\n    if(typeof runAnalysis==='function')await runAnalysis();\n    if(status)status.textContent=`Hesap tamamlandı · ${fmt(rows.length)} geçmiş yarış özel filtrede kullanıldı.`;",
  "    const {filters,rows,recentLimit,dropBad}=selectedRefs();\n    if(!rows.length){if(status)status.textContent='Bu seçimlerle eşleşen geçmiş yarış bulunamadı. Filtrelerden birini genişlet.';return;}\n    const count=setConfigsForCurrentSelection(filters,rows,recentLimit,dropBad),limitText=recentLimit?`Son ${recentLimit}`:'Tümü';\n    if(status)status.textContent=`${fmt(rows.length)} eşleşen geçmiş yarış bulundu · limit ${limitText} · ${dropBad?'kötü/aykırı yarışlar atıldıktan sonra':'kötü/aykırı yarışlar atılmadan'} uygulanacak · ${count||1} koşu hesaplanıyor…`;\n    if(typeof runAnalysis==='function')await runAnalysis();\n    if(status)status.textContent=`Hesap tamamlandı · ${limitText} limiti ${dropBad?'ayıklama sonrası kalan geçerli yarışlara':'eşleşen yarışlara'} uygulandı.`;",
  'calculate status and config'
);
currentSource=mustReplace(
  currentSource,
  "  if($('f63Limit'))$('f63Limit').value='50';if($('f63DropBad'))$('f63DropBad').checked=false;",
  "  if($('f63Limit'))$('f63Limit').value='all';if($('f63DropBad'))$('f63DropBad').checked=false;",
  'reset limit to all'
);

// F60.65 used a whole-document observer. Keep its behavior, but only react to the Analysis dialog itself.
outlierSource=mustReplace(
  outlierSource,
  "const mo=new MutationObserver(()=>queueMicrotask(reconcile));\n  try{mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-view','hidden','open']});}catch{}",
  "const mo=new MutationObserver(()=>queueMicrotask(reconcile));\n  const target=$('analysisDialog');\n  try{if(target)mo.observe(target,{attributes:true,attributeFilter:['data-view','open']});}catch{}",
  'scope outlier observer'
);

const selectedRefFirst="out[name]=arr.filter(row=>{const n=careerRow(row);if(!n.date)return false;return cfg.refs?.length?cfg.refs.some(ref=>refMatch(n,ref)):C.rowPasses(n,cfg.filters);});";
for(const token of[
  'CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63','indexedDB.open(DB_NAME,DB_VERSION)',"d.dataset.view==='current'",'filterCareerPayload','Standart','Özel','Sonuçlar','Analiz Parametreleri','Koşu Sayısı Limiti','Sıfırla','Hesapla','calculateCustom',
  "let activeMode='standard';",'requestIdleCallback',"Tarih aralığı değişti. Arşiv yalnız Hesapla dediğinizde yeniden okunacak.",
  '<option value="all" selected>Tümü</option>','<option value="1">Son 1</option>','<option value="10">Son 10</option>','recentLimit','cfg.dropBad&&window.ATF6065Outlier?.filterPayload','ayıklama sonrası kalan geçerli yarışlara'
])if(!currentSource.includes(token))throw new Error('[F60.67] Current Analysis invariant missing: '+token);
for(const token of[
  'COMPACT-FILTER-DROPDOWN-V16.9.1F60.63','Tümünü Seç','f6063-summary-chip','f6063-all-row','display:block!important'
])if(!compactSource.includes(token))throw new Error('[F60.63] Select-style UI invariant missing: '+token);
for(const token of[
  'CURRENT-ANALYSIS-MOBILE-SCROLL-V16.9.1F60.64',"data-f63-scroll-mode='custom'",'overflow-y:auto!important','touch-action:pan-y!important','#analysisContent','detectMode'
])if(!scrollSource.includes(token))throw new Error('[F60.64] Mobile scroll invariant missing: '+token);
for(const token of[
  'CURRENT-ANALYSIS-OUTLIER-FILTER-V16.9.1F60.65','Aşırı Sapma Gösteren Yarışları At','Seçenekler hazırlanıyor','outlierKeys','z>4.5&&rel>0.12','HP, ganyan veya sırf kötü bitiriş nedeniyle yarış silinmez','f6065Outlier',"mo.observe(target,{attributes:true,attributeFilter:['data-view','open']})"
])if(!outlierSource.includes(token))throw new Error('[F60.67] Outlier/observer invariant missing: '+token);
for(const token of[
  'HOME-MARKET-MANUAL-REFRESH-V16.9.1F60.66','if(force!==true) return false','clearInterval(liveMarketStateV113.timer)','mode:\'manual-only\''
])if(!marketSource.includes(token))throw new Error('[F60.66] Manual market invariant missing: '+token);
if(currentSource.includes('deleteDatabase(')||outlierSource.includes('deleteDatabase('))throw new Error('[F60.67] Archive deletion is forbidden.');
for(const src of[currentSource,compactSource,scrollSource,outlierSource,marketSource])new Function(src);

execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
for(const src of[currentSource,compactSource,scrollSource,outlierSource,marketSource])app+='\n\n'+src.trim()+'\n';
for(const token of[
  'CALENDAR-MULTIFILTER-REPAIR-V16.9.1F60.62','CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63','COMPACT-FILTER-DROPDOWN-V16.9.1F60.63','CURRENT-ANALYSIS-MOBILE-SCROLL-V16.9.1F60.64','CURRENT-ANALYSIS-OUTLIER-FILTER-V16.9.1F60.65','HOME-MARKET-MANUAL-REFRESH-V16.9.1F60.66','PERFORMANCE-SAFE-V16.9.1F60.61','const CAREER_CONCURRENCY = 4;','Analiz Parametreleri','data-f63-mode="custom"','data-f63-scroll-mode','Aşırı Sapma Gösteren Yarışları At',"let activeMode='standard';",'<option value="all" selected>Tümü</option>','<option value="10">Son 10</option>','recentLimit','cfg.dropBad&&window.ATF6065Outlier?.filterPayload'
])if(!app.includes(token))throw new Error('[F60.67] Verification failed: '+token);
if(app.includes("if(mode==='custom'&&!universe.length)setTimeout(()=>prepare(selectedRaceContext(),true,false),0);"))throw new Error('[F60.67] Eager custom archive scan survived build.');
if(app.includes('<option value="50" selected>50</option>'))throw new Error('[F60.67] Legacy race-count limits survived build.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169273');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169273'))throw new Error('[F60.67] Cache bust failed.');
console.log('[AT AI] V16.9.1F60.67 build complete: Koşu Sayısı Limiti = Tümü / Son 1..Son 10; limit criterion matching and optional bad/outlier removal AFTER filtering, so Son N means Son N geçerli yarış; F60.66 lazy Current Analysis and manual GNY/AGF refresh preserved.');
