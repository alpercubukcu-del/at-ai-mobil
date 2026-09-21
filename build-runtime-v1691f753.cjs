const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname,BASE=path.join(ROOT,'build-runtime-v1691f752.cjs'),APP=path.join(ROOT,'public','at-ai-app-v142.js'),INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.33] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
if(!app.includes('ATAnnualArchiveV13'))throw new Error('[F60.94.31.33] historical archive runtime missing');
const start=app.indexOf('function repurposeAnnualMenu(){');
const end=app.indexOf('function hideLegacyProgramSections(){',start);
if(start<0||end<0)throw new Error('[F60.94.31.33] repurposeAnnualMenu block missing');
const restored=`function repurposeAnnualMenu(){
 const b=$('annualArchiveBtn');if(!b)return false;
 b.textContent='7. Tarihsel Yarış Arşivi';
 if(!b.dataset.historicalArchiveMenuF753){
  b.dataset.historicalArchiveMenuF753='F60.94.31.33';
  b.addEventListener('click',e=>{
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
   try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}
   try{window.ATAnnualArchiveV13?.open?.()}catch(err){console.warn('[AT AI] F60.94.31.33 tarihsel arşiv açılamadı:',err)}
   return false;
  },true);
 }
 return true;
}
`;
app=app.slice(0,start)+restored+app.slice(end);
app=app.replaceAll('F60.94.31.32 · SINGLE-TX-YEAR-DELETE','F60.94.31.33 · HISTORICAL-ARCHIVE-RESTORE');
for(const token of["b.textContent='7. Tarihsel Yarış Arşivi'","window.ATAnnualArchiveV13?.open?.()",'Tarihsel yarış seçimi','Seçilen Yarışlarla Kariyer Analizi','F60.94.31.33 · HISTORICAL-ARCHIVE-RESTORE'])if(!app.includes(token))throw new Error('[F60.94.31.33] invariant missing '+token);
if(app.includes("b.textContent='7. Tarihsel Sonuç Arşivi';if(!b.dataset.realDayMenu"))throw new Error('[F60.94.31.33] wrong menu-7 redirect survived');
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693003').replaceAll('F60.94.31.32','F60.94.31.33');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1693003'))throw new Error('[F60.94.31.33] cache bust failed');
console.log('[AT AI] F60.94.31.33 build complete: menu 7 restored to the historical race archive and manual historical matching screen; menu 8 remains the real-results/track-maintenance archive hub.');
