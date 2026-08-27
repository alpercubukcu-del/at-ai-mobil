const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f21.cjs');
const PATCH = path.join(ROOT, 'career-juvenile-maiden-readiness-v1691f22.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F22] Eksik dosya: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F22] Onceki build ciktisi bulunamadi.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-JUVENILE-MAIDEN-READINESS-V16.9.1F22',
  'JUVENILE_MAIDEN_SINGLE_PREP_READINESS_V22',
  'juvenileMaidenReadinessScore',
  'JUVENILE_MAIDEN_SINGLE_PREP_READINESS',
  'CAREER-RACE-READINESS-V16.9.1F21',
  'CAREER-CANDIDATE-SCORE-V16.9.1F20',
  'ANNUAL-PARTIAL-SUPPORT-V16.9.1F19'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F22] Dogrulama basarisiz: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169125');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169125')) {
  throw new Error('[V16.9.1F22] cache-bust guncellenemedi.');
}

console.log('[AT AI] V16.9.1F22 build tamamlandi: 2 yasli Maiden tek guclu hazirlik kosusu kariyer skoruna taban destek verir.');
