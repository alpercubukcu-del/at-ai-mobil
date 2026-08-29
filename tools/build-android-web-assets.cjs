const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB_BUILD = path.join(ROOT, 'build-runtime-v1691f45.cjs');
const BRIDGE_SOURCE = path.join(ROOT, 'mobile', 'android-mobile-bridge.js');
const PUBLIC_DIR = path.join(ROOT, 'public');
const INDEX = path.join(PUBLIC_DIR, 'index.html');
const BRIDGE_OUT = path.join(PUBLIC_DIR, 'android-mobile-bridge.js');

for (const file of [WEB_BUILD, BRIDGE_SOURCE]) {
  if (!fs.existsSync(file)) {
    throw new Error('[ANDROID] Missing required file: ' + path.relative(ROOT, file));
  }
}

execFileSync(process.execPath, [WEB_BUILD], { cwd: ROOT, stdio: 'inherit' });

for (const file of [INDEX, path.join(PUBLIC_DIR, 'at-ai-app-v142.js')]) {
  if (!fs.existsSync(file)) {
    throw new Error('[ANDROID] Web build output missing: ' + path.relative(ROOT, file));
  }
}

fs.copyFileSync(BRIDGE_SOURCE, BRIDGE_OUT);

let html = fs.readFileSync(INDEX, 'utf8');
if (!html.includes('/android-mobile-bridge.js')) {
  html = html.replace(
    /\s*<script src="\/at-ai-app-v142\.js\?v=\d+"><\/script>/,
    '\n  <script src="/android-mobile-bridge.js?v=1"></script>\n  <script src="/at-ai-app-v142.js?v=169146"></script>'
  );
}
fs.writeFileSync(INDEX, html, 'utf8');

const app = fs.readFileSync(path.join(PUBLIC_DIR, 'at-ai-app-v142.js'), 'utf8');
for (const token of [
  'CAREER-ARCHIVE-FRESHNESS-GUARD-V16.9.1F45',
  'CAREER-PROGRESS-FEEDBACK-V16.9.1F44',
  'DAILY-CAREER-PDF-V14.11-DYNAMIC-NAME-WIDTH'
]) {
  if (!app.includes(token)) {
    throw new Error('[ANDROID] Production web token missing: ' + token);
  }
}
if (!html.includes('/android-mobile-bridge.js?v=1')) {
  throw new Error('[ANDROID] Android bridge script was not injected into index.html.');
}

console.log('[AT AI Android] Web assets are ready for APK packaging.');
