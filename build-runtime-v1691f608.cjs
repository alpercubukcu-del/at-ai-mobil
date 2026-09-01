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

const parallel = `  const fullPromise = Promise.resolve()
    .then(() => fetchCareerBeforeV1113(horseId, before))
    .then(repairCareerModeV1113)
    .catch(e => emptyCareerErrorV1113(e?.message || 'Tam kariyer sorgusu başarısız.'));
  const fastPromise = fetchCareerFallbackV1113(horseId, before);
  const first = await Promise.race([
    fullPromise.then(value => ({ source:'full', value })),
    fastPromise.then(value => ({ source:'fast', value }))
  ]);
  if (first.source === 'full') {
    if (first.value?.ok) return first.value;
    const fast = await fastPromise;
    return fast?.ok ? fast : emptyCareerErrorV1113(\`\${first.value?.error || 'Tam kariyer alınamadı.'} | \${fast?.error || 'Hızlı doğrulama alınamadı.'}\`);
  }
  if (first.value?.ok && careerCompleteV1113(first.value)) return first.value;
  const full = await fullPromise;
  if (full?.ok) return full;
  if (first.value?.ok) return first.value;
  return emptyCareerErrorV1113(\`\${full?.error || 'Tam kariyer alınamadı.'} | \${first.value?.error || 'Hızlı doğrulama alınamadı.'}\`);`;

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

if (!app.includes(parallel)) throw new Error('[V16.9.1F60.8] Parallel fallback block not found.');
app = app.replace(parallel, sequential);

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
