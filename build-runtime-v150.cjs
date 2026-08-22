const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v149-fixed.cjs');
const PUBLIC = path.join(ROOT, 'public');
const APP = path.join(PUBLIC, 'at-ai-app-v142.js');
const STYLE = path.join(PUBLIC, 'at-ai-styles-v141.css');
const INDEX = path.join(PUBLIC, 'index.html');
const ARCHIVE_JS = path.join(ROOT, 'daily-career-archive-v146.js');
const ARCHIVE_CSS = path.join(ROOT, 'daily-career-archive-v146.css');

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

for (const file of [APP, STYLE, INDEX, ARCHIVE_JS, ARCHIVE_CSS]) {
  if (!fs.existsSync(file)) throw new Error(`[V15.0] Gerekli dosya bulunamadı: ${path.basename(file)}`);
}

fs.appendFileSync(APP, '\n;/* ===== daily-career-archive-v146.js ===== */\n' + fs.readFileSync(ARCHIVE_JS, 'utf8') + '\n', 'utf8');
new Function(fs.readFileSync(APP, 'utf8'));
fs.appendFileSync(STYLE, '\n/* ===== daily-career-archive-v146.css ===== */\n' + fs.readFileSync(ARCHIVE_CSS, 'utf8') + '\n', 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html
  .replace('/at-ai-styles-v141.css?v=1410', '/at-ai-styles-v141.css?v=1460')
  .replace('/at-ai-app-v142.js?v=1420', '/at-ai-app-v142.js?v=1460');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V15.0 build tamamlandı: günlük kariyer arşivi + kalıcı 5 Model cache + PDF export eklendi.');
