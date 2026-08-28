const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f37.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const MODEL = path.join(ROOT, 'api', 'tjk-model-roadmap-v11.js');
const COMPACT_BLOCK = "function numberOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null}\nfunction compactPathRow(row={}){const finish=Number(row?.finish??row?.rank??row?.sira??0)||null,distance=normalizeDistance(row?.distance??row?.mesafe??row?.msf),track=clean(row?.track??row?.pist??''),className=clean(row?.class??row?.raceClass??row?.classRaw??''),raceClass=clean(row?.raceClass??row?.class??row?.classRaw??''),hp=numberOrNull(row?.hp??row?.handicap),weight=numberOrNull(row?.weight??row?.kilo),odds=numberOrNull(row?.odds??row?.ganyan);return{isoDate:clean(row?.isoDate||row?.date||''),date:clean(row?.date||row?.isoDate||''),city:clean(row?.city||''),distance,mesafe:distance,msf:distance,track,pist:track,finish,rank:finish,sira:finish,class:className,raceClass,ageGroup:clean(row?.ageGroup??row?.group??''),hp,weight,degree:clean(row?.degree||row?.derece||''),odds,raceNoName:clean(row?.raceNoName||row?.raceName||'')}}\nfunction compactPath(rows=[]){return chronological(Array.isArray(rows)?rows:[]).map(compactPathRow)}\nfunction compactAudit(career={}){const audit=career?.audit||{},careerTotal=numberOrNull(audit.careerTotal??audit.expectedFirst??career.careerTotal),collectedTotal=numberOrNull(audit.collectedTotal??career.collectedTotal),coverageStatus=clean(audit.coverageStatus||''),warning=clean(audit.warning||'');return{careerTotal,collectedTotal,coverageStatus:coverageStatus||null,warning:warning||null}}\nfunction careerEnvelope(career={}){const rawFull=Array.isArray(career.history)?career.history:[],full=compactPath(rawFull),wins=compactPath(Array.isArray(career.wins)?career.wins:rawFull.filter(r=>Number(r?.finish??r?.rank??r?.sira)===1)),top5=compactPath(Array.isArray(career.top5)?career.top5:rawFull.filter(r=>{const f=Number(r?.finish??r?.rank??r?.sira);return f>=1&&f<=5})),prep=compactPath(Array.isArray(career.preparationPath)?career.preparationPath:top5);return{ok:Boolean(career.ok),error:career?.ok?null:(career?.error||'Kariyer alınamadı.'),cutoffExclusive:career.before||null,fullPathBefore:full,fullPathBeforeCount:full.length,winsBefore:wins,winsBeforeCount:wins.length,top5Before:top5,top5BeforeCount:top5.length,preparationPathBefore:prep,preparationPathBeforeCount:prep.length,analysisMode:career.analysisMode||(wins.length?'WIN_PATH':full.length?'PREPARATION_PATH':'DEBUT'),audit:compactAudit(career),version:career.version||null,compact:true,compactVersion:'COMPACT_MODEL_PAYLOAD_V1691F38',pathRule:'Tarihsel atın referans yarıştan önceki tüm yarışları tek kompakt yolda taşınır; istemci gerekli türev yolları buradan üretir.'}}";

if (!fs.existsSync(BASE)) {
  throw new Error('[V16.9.1F38] Missing file: build-runtime-v1691f37.cjs');
}

execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });

for (const file of [APP, INDEX, MODEL]) {
  if (!fs.existsSync(file)) {
    throw new Error('[V16.9.1F38] Previous build output was not found: ' + path.relative(ROOT, file));
  }
}

let app = fs.readFileSync(APP, 'utf8');
if (!app.includes('const ROADMAP_TIMEOUT_MS = 90000;')) {
  if (!app.includes('const ROADMAP_TIMEOUT_MS = 32000;')) {
    throw new Error('[V16.9.1F38] F27 roadmap timeout token was not found.');
  }
  app = app.replace('const ROADMAP_TIMEOUT_MS = 32000;', 'const ROADMAP_TIMEOUT_MS = 90000;');
}
app = app.replace(
  'slow career/roadmap requests no longer block the Career window.',
  'slow career/roadmap requests stay guarded without cutting off valid model responses.'
);

for (const token of [
  'ISTANBUL-OUTCOME-CALIBRATION-V16.9.1F37',
  'CAREER-STUCK-GUARD-V16.9.1F27',
  'const ROADMAP_TIMEOUT_MS = 90000;'
]) {
  if (!app.includes(token)) {
    throw new Error('[V16.9.1F38] Verification failed: ' + token);
  }
}

new Function(app);
fs.writeFileSync(APP, app, 'utf8');

function compactModelPayload(content) {
  let model = content.replace(
    /TJK-MODEL-ROADMAP-V11\.(?:12-FAST-FULL-CLASS|13-YAMAK-ALIAS|14-YAMAK-YEAR-WINDOW)/g,
    'TJK-MODEL-ROADMAP-V11.15-COMPACT-MOBILE'
  );
  const start = model.indexOf('function careerEnvelope(career={}){');
  const end = model.indexOf('\n\nfunction normalizeCandidate', start);
  if (start >= 0 && end > start) {
    model = model.slice(0, start) + COMPACT_BLOCK + model.slice(end);
  }
  if (!model.includes('COMPACT_MODEL_PAYLOAD_V1691F38')) {
    throw new Error('[V16.9.1F38] Compact model marker was not written.');
  }
  if (model.includes('historyBefore:full') || model.includes('roadmapBefore:full') || model.includes('comparisonPathBefore:full')) {
    throw new Error('[V16.9.1F38] Duplicate full-path aliases still exist.');
  }
  return model;
}

let model = fs.readFileSync(MODEL, 'utf8');
model = compactModelPayload(model);
fs.writeFileSync(MODEL, model, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169139');
fs.writeFileSync(INDEX, html, 'utf8');

if (!html.includes('/at-ai-app-v142.js?v=169139')) {
  throw new Error('[V16.9.1F38] Cache bust could not be updated.');
}

console.log('[AT AI] V16.9.1F38 build complete: model roadmap payload is compact and mobile timeout guard waits for valid responses.');
