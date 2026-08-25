const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v16914.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PATCH = path.join(ROOT, 'coupon-career-ranking-only-v16915.js');
const RESULT_UI = path.join(ROOT, 'coupon-career-ranking-result-ui-v16915.js');

for (const file of [BASE, PATCH, RESULT_UI]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.15] Eksik dosya: ' + path.basename(file));
}
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.15] Build sonrasi eksik dosya: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
app += '\n' + fs.readFileSync(PATCH, 'utf8') + '\n';
app += '\n' + fs.readFileSync(RESULT_UI, 'utf8') + '\n';

for (const token of [
  'COUPON-CAREER-RANKING-ONLY-V16.9.15',
  'CAREER_PREPARATION_RANKING',
  'galibiyetBenzerligi.score',
  '5 Model kupon kaynagi iptal',
  'COUPON-CAREER-RESULT-UI-V16.9.15',
  'FIVE-MODEL-ROADMAP-RECOVERY-V16.9.13',
  'FIVE-MODEL-DATE-CONTEXT-V16.9.14'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.15] Runtime dogrulamasi basarisiz: ' + token);
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169150');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169150')) throw new Error('[V16.9.15] cache-bust guncellenemedi.');

console.log('[AT AI] V16.9.15 build tamamlandi: Kupon yalniz Kariyer/Hazirlik Siralamasi ile uretilir; 5 Model kupon akisi iptal.');
