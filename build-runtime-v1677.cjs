const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1676.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'coupon-gate-mobile-reset-v1677.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.7] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.7] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('COUPON-GATE-MOBILE-RESET-V16.7.7')) app += `\n${patch}\n`;
for(const token of ['COUPON-GATE-MOBILE-RESET-V16.7.7','resetGateToTop','Kupon Veri Denetimi her açılışta üstten tam ekran başlar']) {
  if(!app.includes(token)) throw new Error(`[V16.7.7] production bundle doğrulaması başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16770');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.7 build tamamlandı: Kupon Veri Denetimi Android mobilde her açılışta başlıktan ve tam viewport olarak açılır.');
