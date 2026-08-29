const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f51.cjs');
const PATCH = path.join(ROOT, 'career-five-model-persist-only-v1691f53.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const MODEL = path.join(ROOT, 'api', 'tjk-model-roadmap-v11.js');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F53] Missing file: ' + path.relative(ROOT, file));
}

/* Restore the known fast/stable F51/F47 calculation path first.
   F53 intentionally does NOT inherit F52's server-side full-career-once rewrite. */
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

for (const file of [APP, INDEX, MODEL]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F53] Previous build output missing: ' + path.relative(ROOT, file));
}

let app = fs.readFileSync(APP, 'utf8');
app += '\n' + fs.readFileSync(PATCH, 'utf8') + '\n';

for (const token of [
  'CAREER-FIVE-MODEL-PERSIST-ONLY-V16.9.1F53',
  'ATCareerFiveModelPersistOnlyV1691F53',
  'CAREER-STABILITY-ROLLBACK-V16.9.1F51',
  'CAREER-FIVE-MODEL-PANEL-STARTER-V16.9.1F47',
  'CAREER-FAST-PROGRESS-V16.9.1F31'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F53] Verification failed: ' + token);
}

for (const forbidden of [
  'DAILY-FIVE-MODEL-ARCHIVE-FIRST-V16.9.1F48',
  'DAILY-FIVE-MODEL-PREP-UX-V16.9.1F49',
  'DAILY-FIVE-MODEL-PREP-STALE-BREAKER-V16.9.1F50'
]) {
  if (app.includes(forbidden)) throw new Error('[V16.9.1F53] Forbidden bulk-prep layer present: ' + forbidden);
}

/* F53 deliberately restores the pre-F52 roadmap implementation because the user's
   raw Career ranking regressed after the F52 server rewrite. Persistence is solved
   separately in the browser and must not alter the scoring/calculation path. */
let model = fs.readFileSync(MODEL, 'utf8');
if (!model.includes('TJK-MODEL-ROADMAP-V11.16-CACHED')) {
  throw new Error('[V16.9.1F53] Expected V11.16 cached roadmap engine was not restored.');
}
for (const forbidden of ['TJK-MODEL-ROADMAP-V11.17-FAST', 'FULL_HORSE_ONCE_LOCAL_FREEZE', '__TJK_MODEL_FULL_CAREER_V1117_CACHE__']) {
  if (model.includes(forbidden)) throw new Error('[V16.9.1F53] F52 server rewrite still present: ' + forbidden);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169154');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169154')) throw new Error('[V16.9.1F53] Cache bust update failed.');

console.log('[AT AI] V16.9.1F53 build complete: F51/F47 fast Career path restored; only completed 5 Model race results persist in IndexedDB.');
