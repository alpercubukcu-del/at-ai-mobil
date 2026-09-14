const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f662.cjs');
const EXTRAS=[
  'current-analysis-multifilter-bridge-v1691f663.js',
  'compact-filter-dropdown-v1691f663.js',
  'current-analysis-mobile-scroll-fix-v1691f664.js',
  'current-analysis-outlier-filter-v1691f665.js'
].map(name=>path.join(ROOT,name));
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.65] Missing F60.62 baseline builder.');
for(const file of EXTRAS)if(!fs.existsSync(file))throw new Error('[F60.65] Missing runtime: '+path.basename(file));
const currentSource=fs.readFileSync(EXTRAS[0],'utf8');
const compactSource=fs.readFileSync(EXTRAS[1],'utf8');
const scrollSource=fs.readFileSync(EXTRAS[2],'utf8');
const outlierSource=fs.readFileSync(EXTRAS[3],'utf8');
const selectedRefFirst="out[name]=arr.filter(row=>{const n=careerRow(row);if(!n.date)return false;return cfg.refs?.length?cfg.refs.some(ref=>refMatch(n,ref)):C.rowPasses(n,cfg.filters);});";
for(const token of[
  'CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63','indexedDB.open(DB_NAME,DB_VERSION)',"d.dataset.view==='current'",'filterCareerPayload','Standart','Özel','Sonuçlar','Analiz Parametreleri','Koşu Sayısı Limiti','Sıfırla','Hesapla','calculateCustom',selectedRefFirst
])if(!currentSource.includes(token))throw new Error('[F60.63] Current Analysis menu invariant missing: '+token);
for(const token of[
  'COMPACT-FILTER-DROPDOWN-V16.9.1F60.63','Tümünü Seç','f6063-summary-chip','f6063-all-row','display:block!important'
])if(!compactSource.includes(token))throw new Error('[F60.63] Select-style UI invariant missing: '+token);
for(const token of[
  'CURRENT-ANALYSIS-MOBILE-SCROLL-V16.9.1F60.64',"data-f63-scroll-mode='custom'",'overflow-y:auto!important','touch-action:pan-y!important','#analysisContent','detectMode'
])if(!scrollSource.includes(token))throw new Error('[F60.64] Mobile scroll invariant missing: '+token);
for(const token of[
  'CURRENT-ANALYSIS-OUTLIER-FILTER-V16.9.1F60.65','Aşırı Sapma Gösteren Yarışları At','Seçenekler hazırlanıyor','outlierKeys','z>4.5&&rel>0.12','HP, ganyan veya sırf kötü bitiriş nedeniyle yarış silinmez','f6065Outlier'
])if(!outlierSource.includes(token))throw new Error('[F60.65] Outlier/criteria invariant missing: '+token);
if(currentSource.includes('deleteDatabase(')||outlierSource.includes('deleteDatabase('))throw new Error('[F60.65] Archive deletion is forbidden.');
for(const src of[currentSource,compactSource,scrollSource,outlierSource])new Function(src);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
for(const src of[currentSource,compactSource,scrollSource,outlierSource])app+='\n\n'+src.trim()+'\n';
for(const token of[
  'CALENDAR-MULTIFILTER-REPAIR-V16.9.1F60.62','CURRENT-ANALYSIS-MULTIFILTER-BRIDGE-V16.9.1F60.63','COMPACT-FILTER-DROPDOWN-V16.9.1F60.63','CURRENT-ANALYSIS-MOBILE-SCROLL-V16.9.1F60.64','CURRENT-ANALYSIS-OUTLIER-FILTER-V16.9.1F60.65','PERFORMANCE-SAFE-V16.9.1F60.61','const CAREER_CONCURRENCY = 4;','Analiz Parametreleri','data-f63-mode="custom"','data-f63-scroll-mode','Aşırı Sapma Gösteren Yarışları At',selectedRefFirst
])if(!app.includes(token))throw new Error('[F60.65] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169271');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169271'))throw new Error('[F60.65] Cache bust failed.');
console.log('[AT AI] V16.9.1F60.65 build complete: Özel kriter başlıkları yükleme sırasında da görünür; switch gerçek bozuk/derecesiz + derece/mesafe robust outlier temizliği yapar; HP/ganyan/normal kötü performans korunur; F60.64 mobil kaydırma korunur.');
