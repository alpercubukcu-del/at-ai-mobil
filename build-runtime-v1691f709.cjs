const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f708.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.18-clean] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
// Legacy Menu 8 archive hub permanently retired. Do not append archive-hub-menu8-v1691f709.js.
app=app.replaceAll('8. Gerçek Yarış Arşivi + Pist / Bakım / Hava','8. Gerçek Yarış Arşivi');
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693078');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] F60.94.18-clean: legacy Menu 8 hub retired at its original build stage.');
