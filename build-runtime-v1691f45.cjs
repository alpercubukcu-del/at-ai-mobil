const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f44.cjs');
const PATCH = path.join(ROOT, 'career-archive-freshness-guard-v1691f45.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F45] Missing file: ' + path.basename(file));
}

execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F45] Previous build output missing: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
app += '\n' + fs.readFileSync(PATCH, 'utf8') + '\n';

for (const token of [
  'CAREER-ARCHIVE-FRESHNESS-GUARD-V16.9.1F45',
  'ATCareerArchiveFreshnessGuardV1691F45',
  'CAREER-PROGRESS-FEEDBACK-V16.9.1F44',
  'ATCareerProgressFeedbackV1691F44',
  'CAREER-ARCHIVE-IDB-ROOT-FIX-V16.9.1F43',
  'CAREER-FIVE-MODEL-FRESH-START-RECOVERY-V16.9.1F41',
  'DAILY-CAREER-PDF-V14.11-DYNAMIC-NAME-WIDTH'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F45] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169146');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169146')) throw new Error('[V16.9.1F45] Cache bust update failed.');

console.log('[AT AI] V16.9.1F45 build complete: old flexible Career archive rows refresh before reuse.');
