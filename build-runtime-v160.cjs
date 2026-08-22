const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v159.cjs');
const EXPORT_FULL = path.join(ROOT, 'career-export-full-v160.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, EXPORT_FULL]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.0] Eksik dosya: ${path.basename(file)}`);
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.0] Production bundle/index oluşmadı.');

fs.appendFileSync(APP, '\n;/* ===== career-export-full-v160.js ===== */\n' + fs.readFileSync(EXPORT_FULL, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, "\n;window.__AT_CAREER_EXPORT_BUILD_V160__='CAREER-EXPORT-FULL-V16.0';\n", 'utf8');
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16000');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.0 build tamamlandı: Kariyer Excel Tam Analiz Paketi; koşacak atların tüm kariyeri + tarihsel referans ilk 3 atların cutoff öncesi tüm kariyeri; analiz formülleri değişmedi.');
