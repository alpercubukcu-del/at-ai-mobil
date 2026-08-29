const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f47.cjs');
const PATCH = path.join(ROOT, 'career-stability-rollback-v1691f51.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F51] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio:'inherit' });

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F51] Previous build output missing: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
app += '\n' + fs.readFileSync(PATCH, 'utf8') + '\n';

for (const token of [
  'CAREER-STABILITY-ROLLBACK-V16.9.1F51',
  'ATCareerStabilityRollbackV1691F51',
  'CAREER-FIVE-MODEL-PANEL-STARTER-V16.9.1F47',
  'CAREER-FAST-API-CACHE-V16.9.1F46',
  'CAREER-ARCHIVE-IDB-ROOT-FIX-V16.9.1F43',
  'DAILY-CAREER-PDF-V14.11-DYNAMIC-NAME-WIDTH'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F51] Verification failed: ' + token);
}

for (const forbidden of [
  'DAILY-FIVE-MODEL-ARCHIVE-FIRST-V16.9.1F48',
  'DAILY-FIVE-MODEL-PREP-UX-V16.9.1F49',
  'DAILY-FIVE-MODEL-PREP-STALE-BREAKER-V16.9.1F50'
]) {
  if (app.includes(forbidden)) throw new Error('[V16.9.1F51] Rollback verification failed; forbidden layer present: ' + forbidden);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169152');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169152')) throw new Error('[V16.9.1F51] Cache bust update failed.');

console.log('[AT AI] V16.9.1F51 build complete: F48-F50 daily 5 Model precompute removed; Career core restored to F47 + cleanup guard.');
