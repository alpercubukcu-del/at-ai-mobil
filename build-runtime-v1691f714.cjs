const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f713.cjs');
const OLD_APP=path.join(ROOT,'public','at-ai-app-v142.js');
const NEW_NAME='at-ai-app-v142-f609423.js';
const NEW_APP=path.join(ROOT,'public',NEW_NAME);
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.23] F60.94.22 base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(OLD_APP,'utf8');
const RELEASE="PHYSICAL-ASSET-CACHE-BREAK-F60.94.23";
app+='\n;window.__AT_RELEASE_F609423__='+JSON.stringify(RELEASE)+';\n';
for(const token of[
 'STATIC-VISUAL-ORDER-V16.9.1F60.94.22',
 'FINAL-DRAWER-OWNER-V16.9.1F60.94.21',
 'ARCHIVE-HUB-MENU8-V16.9.1F60.94.18',
 'TRACK-MAINT-REAL-DOOR-V16.9.1F60.94.16',
 RELEASE
])if(!app.includes(token))throw new Error('[F60.94.23] final asset verification failed: '+token);
new Function(app);
fs.writeFileSync(NEW_APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/<script src="\/at-ai-app-v142(?:-f\d+)?\.js(?:\?v=\d+)?"><\/script>/,'<script src="/'+NEW_NAME+'"></script>');
if(!html.includes('/'+NEW_NAME))throw new Error('[F60.94.23] physical asset switch failed');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V16.9.1F60.94.23 build complete: physical JS filename changed to '+NEW_NAME+'; F60.94.22 order lock retained.');
