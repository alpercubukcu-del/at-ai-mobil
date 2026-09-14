const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f662.cjs');
const EXTRAS=[
  'current-analysis-multifilter-bridge-v1691f663.js',
  'compact-filter-dropdown-v1691f663.js'
].map(name=>path.join(ROOT,name));
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.63] Missing F60.62 baseline builder.');
for(const file of EXTRAS)if(!fs.existsSync(file))throw new Error('[F60.63] Missing runtime: '+path.basename(file));
const currentSource=fs.readFileSync(EXTRAS[0],'utf8');
const compactSource=fs.readFileSync(EXTRAS[1],'utf8');
const selectedRefFirst="out[name]=arr.filter(row=>{const n=careerRow(row);if(!n.date)return false;return cfg.refs?.length?cfg.refs.some(ref=>refMatch(n,ref)):C.rowPasses(n,cfg.filters);});";
for(const token of[
  'CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63',
  'indexedDB.open(DB_NAME,DB_VERSION)',
  "d.dataset.view==='current'",
  'filterCareerPayload',
  'Standart',
  'Özel',
  'Sonuçlar',
  'Analiz Parametreleri',
  'Koşu Sayısı Limiti',
  'Sıfırla',
  'Hesapla',
  'calculateCustom',
  selectedRefFirst
])if(!currentSource.includes(token))throw new Error('[F60.63] Current Analysis menu invariant missing: '+token);
for(const token of[
  'COMPACT-FILTER-DROPDOWN-V16.9.1F60.63',
  'Tümünü Seç',
  'f6063-summary-chip',
  'f6063-all-row',
  'display:block!important'
])if(!compactSource.includes(token))throw new Error('[F60.63] Select-style UI invariant missing: '+token);
if(currentSource.includes('deleteDatabase('))throw new Error('[F60.63] Archive deletion is forbidden.');
new Function(currentSource);
new Function(compactSource);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+currentSource.trim()+'\n';
app+='\n\n'+compactSource.trim()+'\n';
for(const token of[
  'CALENDAR-MULTIFILTER-REPAIR-V16.9.1F60.62',
  'CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63',
  'COMPACT-FILTER-DROPDOWN-V16.9.1F60.63',
  'PERFORMANCE-SAFE-V16.9.1F60.61',
  'const CAREER_CONCURRENCY = 4;',
  'Analiz Parametreleri',
  'data-f63-mode="custom"',
  selectedRefFirst
])if(!app.includes(token))throw new Error('[F60.63] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169269');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169269'))throw new Error('[F60.63] Cache bust failed.');
console.log('[AT AI] V16.9.1F60.63 build complete: Current Analysis rebuilt from reference video — Standart/Özel/Sonuçlar, inline Analiz Parametreleri, date range, white multi-selects, race limit, reset/calculate; F60.61 calculation stack preserved.');
