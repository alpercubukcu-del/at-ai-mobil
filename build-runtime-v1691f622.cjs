const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f621.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.22] Missing F60.21 base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');

// Career Roadmap: the visible analysisRace is the authoritative selected race.
// Legacy ceRace may remain stale because the old Career Export selector still exists in DOM.
const oldSelectedRace = "const n = clean(document.getElementById('ceRace')?.value || state?.selectedRace || document.getElementById('analysisRace')?.value);";
const newSelectedRace = "const n = clean(document.getElementById('analysisRace')?.value || state?.selectedRace || document.getElementById('ceRace')?.value);";
const selectedCount = app.split(oldSelectedRace).length - 1;
if (selectedCount !== 1) throw new Error(`[V16.9.1F60.22] Daily 5 Model selected-race target count=${selectedCount}.`);
app = app.replace(oldSelectedRace, newSelectedRace);

// Keep the legacy selector synchronized when possible; otherwise explicitly clear its stale value
// so it can never override the Career Roadmap selection on later legacy paths.
const oldLegacySync = "if (legacy && n && [...legacy.options].some(o => String(o.value) === String(n))) legacy.value = n;\n  try { if (n) st().selectedRace = n; } catch {}";
const newLegacySync = "if (legacy && n) {\n    const hasRace = [...legacy.options].some(o => String(o.value) === String(n));\n    if (hasRace) legacy.value = n;\n    else { legacy.value = ''; legacy.selectedIndex = -1; }\n  }\n  try { if (n) st().selectedRace = n; } catch {}";
const legacyCount = app.split(oldLegacySync).length - 1;
if (legacyCount !== 1) throw new Error(`[V16.9.1F60.22] Career legacy race sync target count=${legacyCount}.`);
app = app.replace(oldLegacySync, newLegacySync);

for (const token of [
  'CAREER-MATCH-SELECTOR-V16.9.1F60.12-BULK',
  'CAREER-MATCH-APPLY-F60.19',
  '__AT_CAREER_FIVE_MODEL_LIVE_PROGRESS_V1691F620__',
  '__AT_DAILY_CALIBRATION_RACE_SELECTOR_V621__',
  "document.getElementById('analysisRace')?.value || state?.selectedRace || document.getElementById('ceRace')?.value",
  "legacy.selectedIndex = -1"
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.22] Verification failed: ' + token);
}
if (app.includes(oldSelectedRace)) throw new Error('[V16.9.1F60.22] Stale ceRace-first selected-race logic still present.');

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169222');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.22 build complete: Career selected-race 5 Model preparation now follows visible analysisRace; stale ceRace cannot override it. Matching/scoring unchanged.');
