const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[V16.9.1F] build-runtime-v1691.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1F] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');

/* V16.9.1 sıralama/tarihsel tarama mantığı aynen korunur.
   Yalnız sayfa açılışında yarım analizi kendiliğinden başlatan compact
   AUTO-RESUME bloğu fiziksel olarak kaldırılır. */
const token='if(window.__AT_AUTO_RESUME_V128__)return;';
const tokenIndex=app.indexOf(token);
if(tokenIndex<0)throw new Error('[V16.9.1F] compact auto-resume global bayrağı bulunamadı.');
let start=app.lastIndexOf("(()=>{'use strict';",tokenIndex);
if(start<0)start=app.lastIndexOf('(()=>{"use strict";',tokenIndex);
if(start<0)throw new Error('[V16.9.1F] compact auto-resume IIFE başlangıcı bulunamadı.');
const endMarker='})();';
const end=app.indexOf(endMarker,tokenIndex);
if(end<0)throw new Error('[V16.9.1F] compact auto-resume IIFE sonu bulunamadı.');
const removed=app.slice(start,end+endMarker.length);
if(!removed.includes('AUTO-RESUME-NETWORK-V12.8-COMPACT')||!removed.includes('page-reload')||!removed.includes('ui.button.click()')){
  throw new Error('[V16.9.1F] Bulunan blok beklenen auto-resume kodu değil.');
}
app=app.slice(0,start)+"\n/* V16.9.1F boot auto-resume disabled: user action only */\n"+app.slice(end+endMarker.length);
app+=`\n;window.__AT_V1691_FREEZE_GUARD__='V16.9.1F-MANUAL-FIVE-MODEL-NO-BOOT-RESUME';\n`;

for(const bad of ['AUTO-RESUME-NETWORK-V12.8-COMPACT',"schedule(BOOT_DELAY_MS,'page-reload')",'ui.button.click();return true']){
  if(app.includes(bad))throw new Error(`[V16.9.1F] Otomatik devam kalıntısı bulundu: ${bad}`);
}
if(!app.includes('DAILY-CAREER-MODEL-MANUAL-V16.9.1F'))throw new Error('[V16.9.1F] isteğe bağlı 5 Model katmanı bundle içinde yok.');
if(!app.includes('ARCHIVE-FIRST-V16.9.1'))throw new Error('[V16.9.1F] V16.9.1 temel sürümü korunmadı.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169101');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169101'))throw new Error('[V16.9.1F] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.1F build tamamlandı: V16.9.1 sıralama/tarihsel tarama korunur; boot auto-resume ve Kariyer açılışındaki otomatik 5 Model kapalı.');
