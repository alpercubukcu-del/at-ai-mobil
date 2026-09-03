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

const channelPattern = /function\s+channel\(ctx,\s*row\)\s*\{[\s\S]{0,1400}?return\s*['"]RACE_FAMILY['"]\s*;?\s*\}(?=\s*async\s+function\s+resolveAnnualRaceNoF6022)/g;
const channelMatches = app.match(channelPattern) || [];
if (channelMatches.length !== 1) throw new Error(`[V16.9.1F60.10] Annual channel patch target count ${channelMatches.length}.`);
app = app.replace(channelPattern, `function channel(ctx, row) {
  const m = ctx.meta || {};
  if (!sameClass(m.class, row.classRaw) || !sameAge(m.ageGroup, row.groupRaw)) return '';
  const cityMatch = keyText(ctx.city) === keyText(row.city);
  const distanceMatch = Number(m.distance) === Number(row.distance);
  const trackMatch = sameTrack(m.track, row.track);
  if (cityMatch && distanceMatch && trackMatch) return 'EXACT';
  if (distanceMatch && trackMatch) return 'CONDITION_TWIN';
  if (cityMatch) return 'RACE_FAMILY';
  return '';
}`);

const automaticPattern = /automatic\s*=\s*await\s+automaticExactRows\(ctx\)/g;
const automaticMatches = app.match(automaticPattern) || [];
if (automaticMatches.length !== 1) throw new Error(`[V16.9.1F60.10] Automatic exact patch target count ${automaticMatches.length}.`);
app = app.replace(automaticPattern, `automatic = clean(window.__AT_CAREER_MANUAL_REFERENCE_TARGET_V610__ || '') === \`${'${ctx.date}'}|${'${keyText(ctx.city)}'}|${'${ctx.raceNo}'}\` ? [] : await automaticExactRows(ctx)`);

app = app.replace(/Yıllık arşivdeki tam eşleşmeler otomatik aranıyor…/g, 'Yıllık arşiv Kariyer referansları hazırlanıyor…');
app = app.split('⚡ 5 Model Hazırlama · 2000+').join('⚡ 5 Model Hazırlama · Yüklü Yıllık Arşiv');
app += '\n\n' + fs.readFileSync(SELECTOR, 'utf8');

for (const token of [
  '__AT_CAREER_MATCH_SELECTOR_V610__',
  '__AT_CAREER_MANUAL_REFERENCE_TARGET_V610__',
  "if (distanceMatch && trackMatch) return 'CONDITION_TWIN';",
  "if (cityMatch) return 'RACE_FAMILY';",
  "automatic = clean(window.__AT_CAREER_MANUAL_REFERENCE_TARGET_V610__ || '')",
  '⚡ 5 Model Hazırlama · Yüklü Yıllık Arşiv'
]) if (!app.includes(token)) throw new Error('[V16.9.1F60.10] Verification failed: ' + token);
if (app.includes('⚡ 5 Model Hazırlama · 2000+')) throw new Error('[V16.9.1F60.10] Legacy 2000+ label still present.');
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169204');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.10 build complete: manual Career model-match selector; Exact/Twin/Family structural rules aligned; 2000+ removed.');
