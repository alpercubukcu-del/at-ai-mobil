const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1696.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PATCH = path.join(ROOT, 'five-model-repair-progress-v1697.js');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.7] Eksik dosya: ${path.basename(file)}`);
}
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.7] Build sonrası eksik dosya: ${path.relative(ROOT,file)}`);
}

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8');

/* V13.9 loader IIFE içinde yerel kaldığı için sonradan yalnız global fonksiyonu
   değiştirmek yetmez. Yerel loader'a V16.9.7 onarım modülünü çalışma anında
   devralan güvenli bir kapı eklenir; modül yoksa eski davranış aynen sürer. */
const loaderStart = 'async function loadFiveModelV139(box,race){';
const rendererStart = 'try{renderCareerAnalysis=function';
const loaderIndex = app.indexOf(loaderStart);
const rendererIndex = app.indexOf(rendererStart, loaderIndex + loaderStart.length);
if (loaderIndex < 0 || rendererIndex < 0) {
  throw new Error('[V16.9.7] V13.9 5 Model lazy loader bloğu bulunamadı.');
}
let loaderBlock = app.slice(loaderIndex, rendererIndex);
for (const token of ['getCareerRaceModelsV112(race)', 'Secili kosunun 5 Model verisi hazirlaniyor']) {
  if (!loaderBlock.includes(token)) throw new Error(`[V16.9.7] Loader doğrulama işareti bulunamadı: ${token}`);
}
loaderBlock = loaderBlock.replace(
  loaderStart,
  `${loaderStart}if(window.ATFiveModelRepairV1697?.load)return window.ATFiveModelRepairV1697.load(box,race);`
);
app = app.slice(0, loaderIndex) + loaderBlock + app.slice(rendererIndex);

if (!app.includes('FIVE-MODEL-REPAIR-PROGRESS-V16.9.7')) app += `\n${patch}\n`;
for (const token of [
  'FIVE-MODEL-REPAIR-PROGRESS-V16.9.7',
  'window.ATFiveModelRepairV1697.load(box,race)',
  'Arka planda sürdür ve menüye dön',
  'Yaklaşık ilerleme · tek istek koruması aktif',
  'duplicatesBlocked',
  'CAREER-MOBILE-SINGLE-FLIGHT-V16.9.6'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.7] Runtime doğrulaması başarısız: ${token}`);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16970');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=16970')) {
  throw new Error('[V16.9.7] cache-bust güncellenemedi.');
}

console.log('[AT AI] V16.9.7 build tamamlandı: 5 Model yüzde/aşama/süre; arka planda menüye dönüş; otomatik istek ve kilit onarımı.');
