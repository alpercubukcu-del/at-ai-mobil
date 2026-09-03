const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f618.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.19] Missing F60.18 base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');

const oldApplyTail = "setTimeout(()=>{try{$(DIALOG)?.close()}catch{}ensure();$('runAnalysis')?.click()},80)";
const newApplyTail = "setTimeout(async()=>{try{$(DIALOG)?.close()}catch{}ensure();try{const stateNow=st();if(stateNow)stateNow.selectedRace=String(ctx.raceNo);const raceSelect=$('analysisRace');if(raceSelect&&[...raceSelect.options].some(o=>String(o.value)===String(ctx.raceNo)))raceSelect.value=String(ctx.raceNo)}catch{}try{const controls=window.ATCareerFiveModelPrepControlsV1691F55;if(controls?.prepareSelected){const status=$('ceDaily5StatusV1691F3');if(status){status.textContent=`${ids.size} seçili tarihsel eşleşme ile ${ctx.raceNo}. Koşu 5 Model hazırlanıyor…`;status.style.color=''}await controls.prepareSelected();try{await controls.refresh?.()}catch{}}else{throw new Error('Kariyer 5 Model hazırlama motoru hazır değil.')}}catch(e){const status=$('ceDaily5StatusV1691F3');if(status){status.textContent=`5 Model hazırlanamadı: ${e?.message||e}`;status.style.color='#ff9cab'}console.warn('[AT AI] CAREER-MATCH-APPLY-F60.19',e?.message||e);return}try{$('runAnalysis')?.click()}catch{}},80)";

const count = app.split(oldApplyTail).length - 1;
if (count !== 1) throw new Error(`[V16.9.1F60.19] Career apply patch target count=${count}.`);
app = app.replace(oldApplyTail, newApplyTail);

for (const token of [
  'CAREER-MATCH-SELECTOR-V16.9.1F60.12-BULK',
  'ATCareerFiveModelPrepControlsV1691F55',
  'prepareSelected',
  'seçili tarihsel eşleşme ile',
  'CAREER-MATCH-APPLY-F60.19',
  '__AT_DAILY_CALIBRATION_SELECTION_BRIDGE_V618__'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.19] Verification failed: ' + token);
}
if (app.includes(oldApplyTail)) throw new Error('[V16.9.1F60.19] Legacy Career apply tail still present.');

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169219');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.19 build complete: Career historical selection Apply now prepares selected race 5 Model before refreshing Career analysis.');
