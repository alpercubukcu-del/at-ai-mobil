const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1692.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[V16.9.4] build-runtime-v1692.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.4] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');

// build-runtime-v148, auto-resume-v128.js yerine aşağıdaki compact IIFE'yi final bundle'a ekliyor.
// Yorumlar compact aşamada kaybolabildiği için benzersiz global bayraktan bloğun gerçek sınırlarını buluyoruz.
const token='if(window.__AT_AUTO_RESUME_V128__)return;';
const tokenIndex=app.indexOf(token);
if(tokenIndex<0)throw new Error('[V16.9.4] compact auto-resume global bayrağı bulunamadı.');
let start=app.lastIndexOf("(()=>{'use strict';",tokenIndex);
if(start<0)start=app.lastIndexOf('(()=>{"use strict";',tokenIndex);
if(start<0)throw new Error('[V16.9.4] compact auto-resume IIFE başlangıcı bulunamadı.');
const endMarker='})();';
const end=app.indexOf(endMarker,tokenIndex);
if(end<0)throw new Error('[V16.9.4] compact auto-resume IIFE sonu bulunamadı.');
const removed=app.slice(start,end+endMarker.length);
if(!removed.includes('AUTO-RESUME-NETWORK-V12.8-COMPACT')||!removed.includes('page-reload')||!removed.includes('ui.button.click()')){
  throw new Error('[V16.9.4] Bulunan blok beklenen auto-resume kodu değil; güvenli dönüşüm durduruldu.');
}
app=app.slice(0,start)+"\n/* V16.9.4 boot auto-resume removed: manual resume only */\n"+app.slice(end+endMarker.length);
app+=`\n;window.__AT_AUTO_RESUME_DISABLED_V1694__='MANUAL-RESUME-ONLY-V16.9.4';\n`;

for(const bad of ['AUTO-RESUME-NETWORK-V12.8-COMPACT',"schedule(BOOT_DELAY_MS,'page-reload')",'ui.button.click();return true']){
  if(app.includes(bad))throw new Error(`[V16.9.4] Otomatik devam kalıntısı bulundu: ${bad}`);
}
if(!app.includes('ATCareerResumeV127'))throw new Error('[V16.9.4] Manuel Kariyer devam mekanizması yanlışlıkla kaldırıldı.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16940');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=16940'))throw new Error('[V16.9.4] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.4 build tamamlandı: V12.8 compact boot auto-resume final bundle’dan fiziksel olarak kaldırıldı; manuel Devam et korundu.');
