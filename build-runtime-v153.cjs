const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v150.cjs');
const ROADMAP = path.join(ROOT, 'api', 'tjk-roadmap.js');
const Y_API = path.join(ROOT, 'api', 'tjk-similar-y-v153.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
for (const f of [ROADMAP,Y_API,INDEX]) if (!fs.existsSync(f)) throw new Error(`[V15.3] Eksik dosya: ${path.basename(f)}`);

let roadmap = fs.readFileSync(ROADMAP,'utf8');
const oldLine = `    const similarUrl = new URL('/api/tjk-similar', baseUrl);`;
const newLine = `    const similarPath = /\\/Y-?\\d+/i.test(cleanText(raceClass)) ? '/api/tjk-similar-y-v153' : '/api/tjk-similar';\n    const similarUrl = new URL(similarPath, baseUrl);`;
if (!roadmap.includes(oldLine)) throw new Error('[V15.3] tjk-roadmap similar route satırı bulunamadı.');
roadmap = roadmap.replace(oldLine,newLine).replace(`const VERSION = 'TJK-ROADMAP-EXACT-V4.2';`,`const VERSION = 'TJK-ROADMAP-EXACT-V4.3';`);
fs.writeFileSync(ROADMAP,roadmap,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15300');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V15.3 build tamamlandı: arşiv şehir sekmeleri + Y-1/Y1 sınıflarında yıllık program doğrulamalı kesin tarihsel eşleştirme.');
