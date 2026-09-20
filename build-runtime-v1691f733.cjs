const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f732.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.13] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const start=app.indexOf('async function ensureAnalysis(){');
const end=app.indexOf('async function compute(no){',start);
if(start<0||end<0||end<=start)throw new Error('[F60.94.31.13] FOGD ensureAnalysis target missing');
const ensure=`async function ensureAnalysis(no){let c=currentResult(),date=dateNow(),targetNo=Number(no);const hasTarget=()=>!!((currentResult()?.races||[]).find(r=>Number(r?.no)===targetNo));if(c?.races?.length&&clean(c?.date||date)===date&&hasTarget()){try{if(!c.degreeSpeed&&window.ATDegreeSpeedF6090?.enrichCurrent)await window.ATDegreeSpeedF6090.enrichCurrent()}catch{}return currentResult()||c}if(typeof gRunCurrentV1657!=='function')throw new Error('Güncel Analiz motoru hazır değil.');const sel=$('analysisRace');if(!sel)throw new Error('Güncel Analiz yarış seçici hazır değil.');const target=String(targetNo);if(![...(sel.options||[])].some(o=>String(o.value)===target)){const pr=programRaceFor(targetNo);if(!pr)throw new Error(targetNo+'. Koşu programda bulunamadı.');const opt=document.createElement('option');opt.value=target;opt.textContent=target+'. Koşu';sel.appendChild(opt)}sel.value=target;if(sel.value!==target)throw new Error(targetNo+'. Koşu Güncel Analiz için seçilemedi.');setPanelStatus(targetNo+'. Koşu · Güncel Analiz hazırlanıyor…');await gRunCurrentV1657();c=currentResult();if(!c?.races?.length)throw new Error('Güncel Analiz sonucu oluşmadı.');if(!hasTarget())throw new Error(targetNo+'. Koşu Güncel Analiz tarafından üretilemedi.');try{if(window.ATDegreeSpeedF6090?.enrichCurrent)await window.ATDegreeSpeedF6090.enrichCurrent()}catch{}try{window.ATDegreePredictionAuditF609430?.ensureEveryHorse?.(c)}catch{}return currentResult()||c}\n`;
app=app.slice(0,start)+ensure+app.slice(end);
const oldCall='await ensureAnalysis();const cr=currentRaceFor(no);';
const newCall='await ensureAnalysis(no);const cr=currentRaceFor(no);';
if((app.split(oldCall).length-1)!==1)throw new Error('[F60.94.31.13] FOGD ensureAnalysis call target mismatch');
app=app.replace(oldCall,newCall);
for(const token of[
 'async function ensureAnalysis(no)',
 "Güncel Analiz yarış seçici hazır değil.",
 "Güncel Analiz tarafından üretilemedi.",
 'await ensureAnalysis(no);const cr=currentRaceFor(no);',
 'ARCHIVE-EXACT-DATE-V16.9.1F60.94.31.12',
 'FOGD-HISTORY-CALIBRATION-V16.9.1F60.94.31.11'
])if(!app.includes(token))throw new Error('[F60.94.31.13] bundle invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692983');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692983'))throw new Error('[F60.94.31.13] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.13 build complete: FOGD guarantees the selected race exists in Current Analysis before scoring.');
