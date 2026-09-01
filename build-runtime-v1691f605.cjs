const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f604.cjs');
const API = path.join(ROOT, 'api', 'tjk-model-roadmap-v11.js');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.5] Missing base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
if (!fs.existsSync(API)) throw new Error('[V16.9.1F60.5] Model roadmap API missing after base build.');

let source = fs.readFileSync(API, 'utf8');
const oldHeader = /res\.setHeader\(\s*['"]Cache-Control['"]\s*,\s*['"]no-store,\s*max-age=0['"]\s*\)/;
if (!oldHeader.test(source)) throw new Error('[V16.9.1F60.5] Model roadmap no-store header not found.');
source = source.replace(oldHeader, "res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600, stale-while-revalidate=86400')");
fs.writeFileSync(API, source, 'utf8');

console.log('[AT AI] V16.9.1F60.5 build complete: model roadmap response can use 6h CDN cache; scoring and matching unchanged.');
