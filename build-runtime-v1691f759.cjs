const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f758.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const MENU_GUARD=path.join(ROOT,'menu-authority-guard-v1691f698.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.42] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
// Mobile startup safety: disable the legacy always-on drawer MutationObserver guard.
// Menu repair remains click-driven elsewhere; this observer can churn on the home screen.
app=app.replace(/\/\* AT AI Mobil — V16\.9\.1F60\.94\.6 canonical drawer authority guard[\s\S]*?console\.info\('\[AT AI\]',VERSION,'active — canonical eight-item drawer owns labels\/order; F60\.45 menu rewrites are auto-repaired\.'\);\s*\}\)\(\);/g,'/* F60.94.31.42: legacy menu authority observer disabled on startup */');

// F18 Menu 7 opener tek yetkili kalsın. Final bundle'da bulunan genel drawer guard
// biçimlerini annualArchiveBtn için pas geç; diğer menüleri değiştirme.
let changed=0;
const patches=[
 ["if(!b || b.id==='closeMenu')return;","if(!b || b.id==='closeMenu' || b.id==='annualArchiveBtn')return;"],
 ["if(!b||b.id==='closeMenu')return;","if(!b||b.id==='closeMenu'||b.id==='annualArchiveBtn')return;"]
];
for(const [from,to] of patches){const n=app.split(from).length-1;if(n>0){app=app.replaceAll(from,to);changed+=n;}}
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8')
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693012')
 .replaceAll('F60.94.31.40','F60.94.31.42');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] F60.94.31.42 build complete; mobile Menu 7 guard patches:',changed,'cache=1693011');
