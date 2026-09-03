const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f609.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const SELECTOR = path.join(ROOT, 'career-match-selector-v1691f610.js');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.10] Missing base build.');
if (!fs.existsSync(SELECTOR)) throw new Error('[V16.9.1F60.10] Missing Career match selector.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');

const oldChannel = `function channel(ctx, row) {
  const m = ctx.meta || {};
  if (sameClass(m.class, row.classRaw) && sameAge(m.ageGroup, row.groupRaw) && Number(m.distance) === Number(row.distance) && sameTrack(m.track, row.track) && keyText(ctx.city) === keyText(row.city)) return 'EXACT';
  if (sameClass(m.class, row.classRaw) && sameAge(m.ageGroup, row.groupRaw)) return 'CONDITION_TWIN';
  return 'RACE_FAMILY';
}`;
const newChannel = `function channel(ctx, row) {
  const m = ctx.meta || {};
  if (!sameClass(m.class, row.classRaw) || !sameAge(m.ageGroup, row.groupRaw)) return '';
  const cityMatch = keyText(ctx.city) === keyText(row.city);
  const distanceMatch = Number(m.distance) === Number(row.distance);
  const trackMatch = sameTrack(m.track, row.track);
  if (cityMatch && distanceMatch && trackMatch) return 'EXACT';
  if (distanceMatch && trackMatch) return 'CONDITION_TWIN';
  if (cityMatch) return 'RACE_FAMILY';
  return '';
}`;
if (!app.includes(oldChannel)) throw new Error('[V16.9.1F60.10] Annual channel patch target not found.');
app = app.replace(oldChannel, newChannel);

const oldSelection = `    const manual = (await selectedRows()).filter(r => r.raceNo && r.date < ctx.date);
    const automatic = await automaticExactRows(ctx);
    const rowMap = new Map();`;
const newSelection = `    const manualTarget = clean(window.__AT_CAREER_MANUAL_REFERENCE_TARGET_V610__ || '');
    const currentTarget = \`${'${ctx.date}'}|${'${keyText(ctx.city)}'}|${'${ctx.raceNo}'}\`;
    const manualMode = manualTarget === currentTarget;
    const manual = (await selectedRows()).filter(r => r.raceNo && r.date < ctx.date && channel(ctx, r));
    const automatic = manualMode ? [] : await automaticExactRows(ctx);
    const rowMap = new Map();`;
if (!app.includes(oldSelection)) throw new Error('[V16.9.1F60.10] Manual selection patch target not found.');
app = app.replace(oldSelection, newSelection);

app = app.replace(
  "if (out) out.innerHTML = '<div class=\"aa-note\">Yıllık arşivdeki tam eşleşmeler otomatik aranıyor…</div>';",
  "if (out) out.innerHTML = '<div class=\"aa-note\">Yıllık arşiv Kariyer referansları hazırlanıyor…</div>';"
);
app = app.split('⚡ 5 Model Hazırlama · 2000+').join('⚡ 5 Model Hazırlama · Yüklü Yıllık Arşiv');
app += '\n\n' + fs.readFileSync(SELECTOR, 'utf8');

for (const token of [
  '__AT_CAREER_MATCH_SELECTOR_V610__',
  '__AT_CAREER_MANUAL_REFERENCE_TARGET_V610__',
  "if (distanceMatch && trackMatch) return 'CONDITION_TWIN';",
  "if (cityMatch) return 'RACE_FAMILY';",
  '⚡ 5 Model Hazırlama · Yüklü Yıllık Arşiv'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.10] Verification failed: ' + token);
}
if (app.includes('⚡ 5 Model Hazırlama · 2000+')) throw new Error('[V16.9.1F60.10] Legacy 2000+ label still present.');
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169202');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.10 build complete: manual Career model-match selector; Exact/Twin/Family structural rules aligned; 2000+ removed.');
