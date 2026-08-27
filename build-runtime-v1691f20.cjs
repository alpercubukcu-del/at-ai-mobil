const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f19.cjs');
const PATCH = path.join(ROOT, 'career-candidate-score-v1691f20.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[V16.9.1F20] Eksik dosya: ${path.basename(file)}`);
  }
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.1F20] Onceki build ciktisi bulunamadi.');
}

let app = fs.readFileSync(APP, 'utf8');
app += `\n${fs.readFileSync(PATCH, 'utf8')}\n`;

for (const token of [
  'CAREER-CANDIDATE-SCORE-V16.9.1F20',
  'HYBRID_WIN_PREP_FULL_PATH_WITH_CANDIDATE_SUPPORT_V20',
  'MODEL_ROADMAP_PRIMARY_FOR_CAREER_F20',
  'candidateCareerScore',
  'candidateSupportVersion',
  'CAREER-PARTIAL-SUPPORT-V16.9.1F17',
  'PODIUM-PARTIAL-SUPPORT-V16.9.1F18',
  'ANNUAL-PARTIAL-SUPPORT-V16.9.1F19'
]) {
  if (!app.includes(token)) {
    throw new Error(`[V16.9.1F20] Dogrulama basarisiz: ${token}`);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169123');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169123')) {
  throw new Error('[V16.9.1F20] cache-bust guncellenemedi.');
}

console.log('[AT AI] V16.9.1F20 build tamamlandi: Ana kariyer siralamasi model-roadmap kaynakli hibrit aday destek skoru kullanir.');
