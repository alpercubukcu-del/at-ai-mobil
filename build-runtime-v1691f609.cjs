const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f608.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.9] Missing base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');
for (const token of ['__AT_CAREER_BACKGROUND_SAFE_V609__','VISIBILITY_SAFE_YIELD','__AT_CAREER_FETCH_POLICY_V608__']) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.9] Verification failed: ' + token);
}
app = app.replace(
  'F60.8 kararlı kariyer aktif: ana servis once, fallback yalniz hata durumunda.',
  'F60.9 arka plan devam aktif: pencere kapansa veya uygulama degisse analiz surer.'
);
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169189');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.11 build complete: cache-busted daily archive KH/current fusion; F60.9 background safety preserved.');
