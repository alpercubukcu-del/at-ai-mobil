const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1692.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[V16.9.3] build-runtime-v1692.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.3] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');

// V12.8 compact auto-resume, uygulama açılışında yarım Kariyer checkpoint'ini
// kendi kendine "Devam et" ile başlatıyordu. Bu davranışı production bundle'dan
// fiziksel olarak çıkarıyoruz. Manuel checkpoint/Devam et yapısı korunur.
const marker='/* auto-resume compact */';
const start=app.indexOf(marker);
if(start<0)throw new Error('[V16.9.3] auto-resume compact başlangıcı bulunamadı.');
const end=app.indexOf('})();',start);
if(end<0)throw new Error('[V16.9.3] auto-resume compact sonu bulunamadı.');
app=app.slice(0,start)+'\n/* V16.9.3: automatic resume removed; manual resume only */\n'+app.slice(end+5);

// Eski bundle'dan kalmış global bayrağı da tanımlamayalım; sadece yeni davranış işareti.
app+=`\n;window.__AT_AUTO_RESUME_DISABLED_V1693__='MANUAL-RESUME-ONLY-V16.9.3';\n`;

if(app.includes('AUTO-RESUME-NETWORK-V12.8-COMPACT'))throw new Error('[V16.9.3] Otomatik devam kodu bundle içinde kaldı.');
if(app.includes("schedule(BOOT_DELAY_MS,'page-reload')"))throw new Error('[V16.9.3] Boot otomatik devam zamanlayıcısı bundle içinde kaldı.');
if(app.includes("ui.button.click();return true"))throw new Error('[V16.9.3] Otomatik Devam et tıklaması bundle içinde kaldı.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16930');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=16930'))throw new Error('[V16.9.3] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.3 build tamamlandı: uygulama açılışında Kariyer auto-resume tamamen kaldırıldı; yalnız manuel Devam et korunur.');
