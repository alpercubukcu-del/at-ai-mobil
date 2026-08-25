const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1694.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[V16.9.5] build-runtime-v1694.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.5] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
for(const token of [
  'DAILY-CAREER-MODEL-MANUAL-V16.9.5',
  'RUNNING-OVERLAY-FIX-V16.9.5'
]){
  if(!app.includes(token))throw new Error(`[V16.9.5] Runtime doğrulaması başarısız: ${token}`);
}
const PATCH_SOURCE=path.join(ROOT,'daily-career-model-autoarchive-v149.js');
const patchSource=fs.readFileSync(PATCH_SOURCE,'utf8');
for(const hook of ['runCareerAnalysis = async function','renderCareerAnalysis = function']){
  if(patchSource.includes(hook))throw new Error(`[V16.9.5] Otomatik 5 Model hooku kaynakta kaldı: ${hook}`);
}
app+=`\n;window.__AT_CAREER_FREEZE_FIX_V1695__='LAZY-FIVE-MODEL-NO-RUNNING-OVERLAY-V16.9.5';\n`;
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16950');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=16950'))throw new Error('[V16.9.5] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.5 build tamamlandı: Kariyer açılışında otomatik 5 Model kapalı; çalışan analiz resume katmanı gizli; 5 Model kullanıcı paneliyle lazy hazırlanır.');
