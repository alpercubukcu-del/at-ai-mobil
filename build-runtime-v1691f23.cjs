const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f22.cjs');
const PATCH = path.join(ROOT, 'career-proven-condition-win-v1691f23.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F23] Eksik dosya: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F23] Onceki build ciktisi bulunamadi.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-PROVEN-CONDITION-WIN-V16.9.1F23',
  'PROVEN_TARGET_CONDITION_WIN_FLOOR_V23',
  'provenConditionWinScore',
  'PROVEN_TARGET_CONDITION_WIN',
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22',
  'CAREER-RACE-READINESS-V16.9.1F21',
  'CAREER-CANDIDATE-SCORE-V16.9.1F20'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F23] Dogrulama basarisiz: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169126');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169126')) {
  throw new Error('[V16.9.1F23] cache-bust guncellenemedi.');
}

console.log('[AT AI] V16.9.1F23 build tamamlandi: bugunku kosu sartinda kazanmis at kariyer siralamasinda dibe dusmez.');
