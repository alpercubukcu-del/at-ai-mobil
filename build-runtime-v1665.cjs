const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1664.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');

if(!fs.existsSync(BASE)) throw new Error('[V16.6.5] build-runtime-v1664.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX)) throw new Error('[V16.6.5] Production bundle/index oluşmadı.');

let html=fs.readFileSync(INDEX,'utf8');
const oldMenu='<button data-view="historical">2. Tarihsel Benzerlik</button>';
const newMenu='<button data-view="historical">2. Kazanan Yolu Kör Testi</button>';
if(!html.includes(oldMenu)) throw new Error('[V16.6.5] Tarihsel Benzerlik menü butonu bulunamadı.');
html=html.replace(oldMenu,newMenu);
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16650');
fs.writeFileSync(INDEX,html,'utf8');

let app=fs.readFileSync(APP,'utf8');
const titlePattern=/historical\s*:\s*(['"])Tarihsel Benzerlik\1/;
if(!titlePattern.test(app)) throw new Error('[V16.6.5] historical analiz başlığı bulunamadı.');
app=app.replace(titlePattern,'historical:"Kazanan Yolu Kör Testi"');
app += "\n;window.__AT_WINNER_PATH_BLIND_MENU_V1665__={version:'V16.6.5',label:'Kazanan Yolu Kör Testi',winnerOnly:true};\n";
new Function(app);
fs.writeFileSync(APP,app,'utf8');

console.log('[AT AI] V16.6.5 build tamamlandı: 2. menü Kazanan Yolu Kör Testi olarak adlandırıldı.');
