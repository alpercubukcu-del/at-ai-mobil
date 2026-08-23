const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1653.cjs');
const GUARD = path.join(ROOT, 'mobile-foreground-recovery-v1654.js');
const PUBLIC = path.join(ROOT, 'public');
const APP = path.join(PUBLIC, 'at-ai-app-v142.js');
const INDEX = path.join(PUBLIC, 'index.html');
const PUBLIC_GUARD = path.join(PUBLIC, 'mobile-foreground-recovery-v1654.js');

for (const file of [BASE, GUARD]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.5.4] Eksik dosya: ${path.basename(file)}`);
}

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V16.5.4] Production bundle/index oluşmadı.');

const guardText = fs.readFileSync(GUARD, 'utf8');
new Function(guardText);
fs.copyFileSync(GUARD, PUBLIC_GUARD);

let html = fs.readFileSync(INDEX, 'utf8');
const guardTag = '  <script src="/mobile-foreground-recovery-v1654.js?v=16540"></script>\n';
if (!html.includes('/mobile-foreground-recovery-v1654.js')) {
  const appTagMatch = html.match(/\s*<script src="\/at-ai-app-v142\.js\?v=\d+"><\/script>/);
  if (!appTagMatch) throw new Error('[V16.5.4] Ana uygulama script etiketi bulunamadı.');
  html = html.replace(appTagMatch[0], `\n${guardTag}  <script src="/at-ai-app-v142.js?v=16540"></script>`);
} else {
  html = html.replace(/\/mobile-foreground-recovery-v1654\.js\?v=\d+/, '/mobile-foreground-recovery-v1654.js?v=16540');
  html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16540');
}
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.5.4 build tamamlandı: mobil foreground/BFCache self-heal koruması aktif.');
