const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f702.cjs');
const GUARD=path.join(ROOT,'final-drawer-order-v1691f704.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.12] F60.94.10 base builder missing');
if(!fs.existsSync(GUARD))throw new Error('[F60.94.12] final drawer guard missing');
const guard=fs.readFileSync(GUARD,'utf8');
for(const token of[
 'FINAL-DRAWER-ORDER-V16.9.1F60.94.12',
 'atPreviewChromeGuardCssF609412',
 'trackMaintenanceMenuBtnF60944'
])if(!guard.includes(token))throw new Error('[F60.94.12] guard invariant missing: '+token);
new Function(guard);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+guard.trim()+'\n';
for(const token of[
 'FINAL-DRAWER-ORDER-V16.9.1F60.94.12',
 'atPreviewChromeGuardCssF609412',
 'trackMaintenanceMenuBtnF60944',
 'READY-ONCE-MENU-V16.9.1F60.94.10',
 'DEGREE-SPEED-TOP5-V16.9.1F60.94.5'
])if(!app.includes(token))throw new Error('[F60.94.12] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692952');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692952'))throw new Error('[F60.94.12] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.12 build complete: standalone final drawer guard appended and preview toolbar hidden.');
