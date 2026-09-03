const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f610.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.11] Missing F60.10 base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');

const eager = "void meta();return true";
const lazy = "const el=$('cmsMeta');if(el){const c=context(),saved=c?loadSaved(c):new Set();if(c&&saved.size)window.__AT_CAREER_MANUAL_REFERENCE_TARGET_V610__=target(c);el.textContent=c?(saved.size?`${saved.size} seçim kayıtlı · Arşiv yalnız Eşleşmeleri Gör ve Seç düğmesine basınca taranır.`:'Arşiv yalnız Eşleşmeleri Gör ve Seç düğmesine basınca taranır.'):'Önce tek bir koşu seçin.'}return true";
if (!app.includes(eager)) throw new Error('[V16.9.1F60.11] Eager meta target not found.');
app = app.replace(eager, lazy);

const obsOld = "o.observe(d,{attributes:true,attributeFilter:['open','data-view'],childList:true})";
const obsNew = "o.observe(d,{attributes:true,attributeFilter:['open','data-view']})";
if (!app.includes(obsOld)) throw new Error('[V16.9.1F60.11] MutationObserver target not found.');
app = app.replace(obsOld, obsNew);

app = app.split('Yüklü Yıllık Arşiv okunuyor…').join('Arşiv yalnız seçim düğmesine basınca taranır.');
app = app.split("window.ATCareerMatchSelectorV610={version:VERSION,open,ensure,refresh:meta}").join("window.ATCareerMatchSelectorV610={version:'CAREER-MATCH-SELECTOR-V16.9.1F60.11-LAZY',open,ensure,refresh:meta}");

for (const token of [
  'CAREER-MATCH-SELECTOR-V16.9.1F60.11-LAZY',
  'Arşiv yalnız Eşleşmeleri Gör ve Seç düğmesine basınca taranır.',
  "o.observe(d,{attributes:true,attributeFilter:['open','data-view']})"
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.11] Verification failed: ' + token);
}
if (app.includes("void meta();return true")) throw new Error('[V16.9.1F60.11] Eager archive meta call still present.');
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169211');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.11 build complete: Career menu no longer reads annual IndexedDB on open; archive scan is explicit/lazy; childList observer removed.');
