const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1658.cjs');
const PATCH = path.join(ROOT, 'mobile-layer-lock-v1659.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.5.9] Eksik dosya: ${path.basename(file)}`);
}

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.5.9] Production bundle/index oluşmadı.');

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8');
if (!app.includes('MOBILE-LAYER-LOCK-V16.5.9')) {
  app += `\n\n${patch}\n`;
  fs.writeFileSync(APP, app, 'utf8');
}
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16590');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.5.9 build tamamlandı: mobilde drawer + dialog aynı anda görünemez; hard layer lock aktif.');
