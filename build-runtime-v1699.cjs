const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1698.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.9] build-runtime-v1698.cjs bulunamadı.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.9] Build sonrası eksik dosya: ${path.relative(ROOT, file)}`);
}

const app = fs.readFileSync(APP, 'utf8');
for (const token of [
  'FIVE-MODEL-MOBILE-CACHE-V16.9.9',
  'at_ai_five_model_compact_v1699:',
  'perRaceStorage:true',
  'COUPON-ARCHIVE-MOBILE-YIELD-V16.9.9',
  'shared?.prime?.(rec.raceNo,rec.data,{persist:true})',
  'FIVE-MODEL-REPAIR-PROGRESS-V16.9.7',
  'CAREER-RUN-BACKGROUND-PROGRESS-V16.9.8'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.9] Runtime doğrulaması başarısız: ${token}`);
}
for (const forbidden of [
  "const SESSION_KEY='at_ai_five_model_compact_v1687';",
  "const MODEL_SESSION='at_ai_five_model_compact_v1687';",
  'const store=sessionLoad();\n  store[k]',
  'const store=modelSessionLoad();'
]) {
  if (app.includes(forbidden)) throw new Error(`[V16.9.9] Eski tek-parça mobil cache yolu bundle içinde kaldı: ${forbidden}`);
}
new Function(app);

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16990');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=16990')) throw new Error('[V16.9.9] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.9 build tamamlandı: Android tek-parça 5 Model cache kaldırıldı; koşu-bazlı idle cache aktif.');
