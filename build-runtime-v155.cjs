const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v153.cjs');
const ADAPTIVE = path.join(ROOT, 'adaptive-history-v10.js');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const f of [BASE, ADAPTIVE]) {
  if (!fs.existsSync(f)) throw new Error(`[V15.5] Eksik dosya: ${path.basename(f)}`);
}

/*
  V15.5 — yalnız çalışma planı optimizasyonu.
  - Analiz formülleri, tarih aralığı, benzerlik ve puanlama değişmez.
  - Güncel at kariyerleri 3 yerine 4 paralel istekle alınır.
  - Tarihsel roadmap koşuları seri yerine 2'li paralel hazırlanır.
  - mapLimit çıktı sırasını koruduğu için hesap/ekran yarış sırası değişmez.
*/
let adaptive = fs.readFileSync(ADAPTIVE, 'utf8');

const careerOld = `const loaded = await mapLimit(horsesToLoad, 3, async item => {`;
const careerNew = `const loaded = await mapLimit(horsesToLoad, 4, async item => {`;
if (!adaptive.includes(careerOld)) throw new Error('[V15.5] Güncel kariyer concurrency satırı bulunamadı.');
adaptive = adaptive.replace(careerOld, careerNew);

const roadmapOld = `  const calculatedRaces = [];
  let raceCompleted = 0;
  for (const race of selectedRaces) {
    raceCompleted++;
    content.innerHTML = \`<div style="padding:15px;">Tarihsel yarış ailesi, koşul ikizleri ve ilk 3 hazırlanıyor…<br><br>\${raceCompleted} / \${selectedRaces.length} koşu</div>\`;
    const meta = programRaceMeta(race);
    const roadmap = meta?.ok ? await fetchHistoricalRoadmap(meta) : { ok:false, error:meta?.error || 'Günlük programda bu koşunun şartları eksik.' };
    const raceHorses = loaded.filter(x => x && Number(x.raceNo) === Number(race.no)).map(x => {`;

const roadmapNew = `  let roadmapCompletedV155 = 0;
  const roadmapRowsV155 = await mapLimit(selectedRaces, 2, async race => {
    const meta = programRaceMeta(race);
    const roadmap = meta?.ok ? await fetchHistoricalRoadmap(meta) : { ok:false, error:meta?.error || 'Günlük programda bu koşunun şartları eksik.' };
    roadmapCompletedV155++;
    content.innerHTML = \`<div style="padding:15px;">Tarihsel yarış ailesi, koşul ikizleri ve ilk 3 hazırlanıyor…<br><br>\${roadmapCompletedV155} / \${selectedRaces.length} koşu · 2'li paralel</div>\`;
    return { race, meta, roadmap };
  });

  const calculatedRaces = [];
  let raceCompleted = 0;
  for (const rowV155 of roadmapRowsV155) {
    const race = rowV155.race;
    const meta = rowV155.meta;
    const roadmap = rowV155.roadmap;
    raceCompleted++;
    content.innerHTML = \`<div style="padding:15px;">Tarihsel veriler puanlanıyor…<br><br>\${raceCompleted} / \${selectedRaces.length} koşu</div>\`;
    const raceHorses = loaded.filter(x => x && Number(x.raceNo) === Number(race.no)).map(x => {`;

if (!adaptive.includes(roadmapOld)) throw new Error('[V15.5] Seri roadmap bloğu bulunamadı.');
adaptive = adaptive.replace(roadmapOld, roadmapNew);

fs.writeFileSync(ADAPTIVE, adaptive, 'utf8');
execFileSync(process.execPath, ['--check', ADAPTIVE], { cwd:ROOT, stdio:'inherit' });

/* V15.4 üretimini aynen çalıştır; yalnız üstteki performans yaması kaynakta hazırdır. */
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V15.5] Production bundle/index oluşmadı.');

fs.appendFileSync(APP, `\n;window.__AT_CAREER_PERF_V155__='CAREER-PERF-V15.5';\n`, 'utf8');
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15500');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V15.5 build tamamlandı: formüller değişmeden güncel kariyer 4 paralel, tarihsel roadmap 2 koşu paralel çalışıyor.');
