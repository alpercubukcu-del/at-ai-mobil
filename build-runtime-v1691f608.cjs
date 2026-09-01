const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f607.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.8] Missing base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');

const functionMarker = 'fetchCareer = async function(horseId, before) {';
const functionStart = app.indexOf(functionMarker);
const bodyStart = app.indexOf('  const fullPromise = Promise.resolve()', functionStart);
const bodyEndMarker = '\n};\n\n/* Stale hata/debut kariyerlerini';
const bodyEnd = app.indexOf(bodyEndMarker, bodyStart);
if (functionStart < 0 || bodyStart < 0 || bodyEnd < 0) {
  throw new Error('[V16.9.1F60.8] V11.13 Career wrapper boundaries not found.');
}
const parallel = app.slice(bodyStart, bodyEnd);

const sequential = `  // F60.8: Ana kariyer isteğini gereksiz fallback yüküyle yarışa sokma.
  // Fallback yalnız ana servis gerçekten başarısız olursa çağrılır.
  const full = await Promise.resolve()
    .then(() => fetchCareerBeforeV1113(horseId, before))
    .then(repairCareerModeV1113)
    .catch(e => emptyCareerErrorV1113(e?.message || 'Tam kariyer sorgusu başarısız.'));
  if (full?.ok) return full;

  const fast = await fetchCareerFallbackV1113(horseId, before);
  if (fast?.ok) return fast;
  return emptyCareerErrorV1113(\`\${full?.error || 'Tam kariyer alınamadı.'} | \${fast?.error || 'Hızlı doğrulama alınamadı.'}\`);`;

if (!parallel.includes('Promise.race') || !parallel.includes('fetchCareerFallbackV1113')) throw new Error('[V16.9.1F60.8] Parallel fallback signature not found.');
app = app.slice(0, bodyStart) + sequential + app.slice(bodyEnd);

app = app.replace(
  'F60.7 hizli ve guvenli puanlama aktif: uzun kariyer yolları mobil icin sinirlandi.',
  'F60.8 kararlı kariyer aktif: ana servis once, fallback yalniz hata durumunda.'
);

for (const token of [
  'F60.8: Ana kariyer isteğini gereksiz fallback yüküyle yarışa sokma.',
  'const fast = await fetchCareerFallbackV1113(horseId, before);',
  'const CAREER_CONCURRENCY = 4;',
  'AT_AI_SCORE_PATH_LIMIT_F607 = 48'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.8] Verification failed: ' + token);
}
if (app.includes('const first = await Promise.race([')) {
  throw new Error('[V16.9.1F60.8] Parallel fallback race still present.');
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169182');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.8 build complete: primary Career first; fallback only after primary failure; foreign negative AtId routing preserved.');
