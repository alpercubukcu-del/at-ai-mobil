const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1666.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'winner-path-blind-ui-v1667.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.6.7] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.6.7] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('WINNER-PATH-BLIND-UI-V16.6.7')) app += `\n${patch}\n`;
if(!app.includes('Kör Testi Çalıştır')||!app.includes('/api/tjk-conditional-v4-blind')) throw new Error('[V16.6.7] Kör test ekranı production bundle içine girmedi.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16670');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.6.7 build tamamlandı: Menü 2 ham JSON yerine gerçek Kazanan Yolu Kör Testi ekranını açar; sonuç yalnız Sonucu Aç ile çağrılır.');
