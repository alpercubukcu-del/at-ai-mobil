const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f606.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.7] Missing base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');
const marker = 'function emptySimilarity(career, roadmap) {';
const helper = `
const AT_AI_SCORE_PATH_LIMIT_F607 = 48;
function atAiCapPathF607(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list.length > AT_AI_SCORE_PATH_LIMIT_F607
    ? list.slice(-AT_AI_SCORE_PATH_LIMIT_F607)
    : list;
}
function atAiCapCareerF607(career) {
  if (!career || typeof career !== 'object') return career;
  const out = { ...career };
  for (const key of ['roadmap','history','fullPathBefore','winsBefore','top5Before','preparationPathBefore','fullPath','wins','top5','preparationPath']) {
    if (Array.isArray(out[key])) out[key] = atAiCapPathF607(out[key]);
  }
  return out;
}
function atAiCapRoadmapF607(roadmap) {
  if (!roadmap || typeof roadmap !== 'object') return roadmap;
  const out = { ...roadmap };
  if (Array.isArray(roadmap.historicalRaces)) {
    out.historicalRaces = roadmap.historicalRaces.map(race => ({
      ...race,
      top3: Array.isArray(race?.top3) ? race.top3.map(ref => ({
        ...ref,
        career: atAiCapCareerF607(ref?.career)
      })) : race?.top3
    }));
  }
  return out;
}

`;

if (!app.includes(marker)) throw new Error('[V16.9.1F60.7] F31 score marker not found.');
app = app.replace(marker, helper + marker);

const oldCall = 'calculateGalibiyetBenzerligi(career.roadmap || [], roadmap)';
const newCall = 'calculateGalibiyetBenzerligi(atAiCapPathF607(career.roadmap || []), atAiCapRoadmapF607(roadmap))';
if (!app.includes(oldCall)) throw new Error('[V16.9.1F60.7] F31 scoring call not found.');
app = app.replace(oldCall, newCall);

app = app.replace(
  'F31 hizli ilerleme aktif: istekler paralel, puanlama at at isleniyor.',
  'F60.7 hizli ve guvenli puanlama aktif: uzun kariyer yolları mobil icin sinirlandi.'
);

for (const token of ['AT_AI_SCORE_PATH_LIMIT_F607 = 48', newCall, 'const CAREER_CONCURRENCY = 4;']) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.7] Verification failed: ' + token);
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169181');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.7 build complete: mobile Career scoring paths capped at 48 rows; stable 4-way retrieval preserved.');
