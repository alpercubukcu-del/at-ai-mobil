const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v158.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const WATCHDOG = path.join(ROOT, 'career-roadmap-watchdog-v159.js');

for (const file of [BASE, WATCHDOG]) {
  if (!fs.existsSync(file)) throw new Error(`[V15.9] Eksik dosya: ${path.basename(file)}`);
}

/* Önce mevcut V15.8 üretimini yap; analiz/formüller ve tüm önceki düzeltmeler korunur. */
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V15.9] Production bundle/index oluşmadı.');

/* Tarihsel roadmap için son katman watchdog. */
fs.appendFileSync(APP, '\n;/* ===== career-roadmap-watchdog-v159.js ===== */\n' + fs.readFileSync(WATCHDOG, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, `\n;window.__AT_CAREER_WATCHDOG_BUILD_V159__='CAREER-WATCHDOG-BUILD-V15.9';\n`, 'utf8');
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15900');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V15.9 build tamamlandı: hızlı roadmap 45 sn aşarsa remote fallback yarışa girer; 120 sn hard timeout; analiz formülleri değişmedi.');
