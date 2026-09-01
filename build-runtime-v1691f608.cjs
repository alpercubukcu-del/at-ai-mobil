const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f607.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.8] Missing base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');
for (const token of [
  '__AT_CAREER_FETCH_POLICY_V608__',
  'PRIMARY_THEN_FALLBACK'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.8] Verification failed: ' + token);
}

app = app.replace(
  'F60.7 hizli ve guvenli puanlama aktif: uzun kariyer yolları mobil icin sinirlandi.',
  'F60.8 kararlı kariyer aktif: ana servis once, fallback yalniz hata durumunda.'
);

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169182');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.8 build complete: primary Career first; fallback only after primary failure; foreign negative AtId routing preserved.');
