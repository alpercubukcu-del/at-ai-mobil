const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v16915.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.16] build-runtime-v16915.cjs bulunamadi.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
for (const file of [APP, INDEX]) if (!fs.existsSync(file)) throw new Error('[V16.9.16] Build ciktilari bulunamadi.');

let app = fs.readFileSync(APP, 'utf8');

function replaceRequired(label, from, to) {
  if (!app.includes(from)) throw new Error('[V16.9.16] Patch kalibi bulunamadi: ' + label);
  app = app.replace(from, to);
}

// V16.9.15'te MutationObserver callback'i ayni text/innerHTML'i her childList
// degisiminde yeniden yazarak kendi kendini tekrar tetikliyordu. Her DOM dugumunu
// yalniz bir kez isaretleyip guncelle; yeni olusan dugumler yine patch alabilir.
replaceRequired(
  'career-only setup note idempotent',
  "if (note) note.innerHTML = '<b>Kupon kaynagi: Kariyer / Hazirlik Siralamasi</b><span>5 Model kupon uretiminden cikarildi. Kupon, Kariyer Yol Haritasi puan/sirasini kullanir.</span>';",
  "if (note && note.dataset.v16916 !== '1') { note.dataset.v16916='1'; note.innerHTML = '<b>Kupon kaynagi: Kariyer / Hazirlik Siralamasi</b><span>5 Model kupon uretiminden cikarildi. Kupon, Kariyer Yol Haritasi puan/sirasini kullanir.</span>'; }"
);
replaceRequired(
  'career-only build button idempotent',
  "const btn = $('buildAllBtn'); if (btn) btn.textContent = 'Kariyer/Hazirliktan Kupon Olustur';",
  "const btn = $('buildAllBtn'); if (btn && btn.dataset.v16916 !== '1') { btn.dataset.v16916='1'; btn.textContent = 'Kariyer/Hazirliktan Kupon Olustur'; }"
);
replaceRequired(
  'ticket summary small idempotent',
  "document.querySelectorAll('#tickets .ticket-group-v11 summary small').forEach(el => el.textContent = 'Kariyer/Hazirlik siralamasi');",
  "document.querySelectorAll('#tickets .ticket-group-v11 summary small').forEach(el => { if(el.dataset.v16916!=='1'){el.dataset.v16916='1';el.textContent='Kariyer/Hazirlik siralamasi';} });"
);
replaceRequired(
  'ticket summary span idempotent',
  "document.querySelectorAll('#tickets .ticket-group-v11 summary > span').forEach(el => el.textContent = 'Kariyer kaynagi ▾');",
  "document.querySelectorAll('#tickets .ticket-group-v11 summary > span').forEach(el => { if(el.dataset.v16916!=='1'){el.dataset.v16916='1';el.textContent='Kariyer kaynagi ▾';} });"
);

// Sonuc UI observer'i de ayni textContent'i her childList olayinda yeniden yazmasin.
replaceRequired(
  'result small idempotent',
  "root.querySelectorAll('.ticket-group-v11 summary small').forEach(el=>el.textContent='Kariyer/Hazırlık sıralaması');",
  "root.querySelectorAll('.ticket-group-v11 summary small').forEach(el=>{if(el.dataset.resultV16916!=='1'){el.dataset.resultV16916='1';el.textContent='Kariyer/Hazırlık sıralaması';}});"
);
replaceRequired(
  'result span idempotent',
  "root.querySelectorAll('.ticket-group-v11 summary > span').forEach(el=>el.textContent='Kariyer kaynağı ▾');",
  "root.querySelectorAll('.ticket-group-v11 summary > span').forEach(el=>{if(el.dataset.resultV16916!=='1'){el.dataset.resultV16916='1';el.textContent='Kariyer kaynağı ▾';}});"
);
replaceRequired(
  'result tab idempotent',
  "root.querySelectorAll('.ticket-model-tab-v11').forEach(el=>el.textContent='Kariyer/Hazırlık');",
  "root.querySelectorAll('.ticket-model-tab-v11').forEach(el=>{if(el.dataset.resultV16916!=='1'){el.dataset.resultV16916='1';el.textContent='Kariyer/Hazırlık';}});"
);

app += "\n;window.__AT_MOBILE_FREEZE_HOTFIX_V16916__='MUTATION-OBSERVER-IDEMPOTENT-V16.9.16';\n";
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169160');
fs.writeFileSync(INDEX, html, 'utf8');

for (const token of [
  'MUTATION-OBSERVER-IDEMPOTENT-V16.9.16',
  "note.dataset.v16916 !== '1'",
  "btn.dataset.v16916 !== '1'",
  'resultV16916',
  'COUPON-CAREER-RANKING-ONLY-V16.9.15',
  'FIVE-MODEL-ROADMAP-RECOVERY-V16.9.13',
  'FIVE-MODEL-DATE-CONTEXT-V16.9.14'
]) if (!app.includes(token)) throw new Error('[V16.9.16] Runtime dogrulamasi basarisiz: ' + token);
if (!html.includes('/at-ai-app-v142.js?v=169160')) throw new Error('[V16.9.16] cache-bust guncellenemedi.');

console.log('[AT AI] V16.9.16 build tamamlandi: V16.9.15 MutationObserver kendi-kendini tetikleme dongusu giderildi; ana ekran tekrar akici.');
