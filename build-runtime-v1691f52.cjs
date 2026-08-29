const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f51.cjs');
const MODEL = path.join(ROOT, 'api', 'tjk-model-roadmap-v11.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

for (const file of [BASE, MODEL]) {
  if (!fs.existsSync(file)) throw new Error('[V16.9.1F52] Missing file: ' + path.relative(ROOT, file));
}

// First build the known-stable F51 frontend. F52 only optimizes the server-side 5 Model data path.
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio:'inherit' });

let model = fs.readFileSync(MODEL, 'utf8');

model = model.replace("const VERSION = 'TJK-MODEL-ROADMAP-V11.16-CACHED';", "const VERSION = 'TJK-MODEL-ROADMAP-V11.17-FAST';");
model = model.replace("['v11.16',q.date,q.city,q.class,q.ageGroup,q.track,normalizeDistance(q.distance||''),q.minYear||'2000']", "['v11.17-fast',q.date,q.city,q.class,q.ageGroup,q.track,normalizeDistance(q.distance||''),q.minYear||'2000']");

// Internal same-origin requests must be allowed to hit Vercel CDN. The previous no-cache header
// forced repeated History/Career MISS responses even when stable data was already cached.
const oldFetchHeaders = "headers:{Accept:'application/json, text/plain, */*','Cache-Control':'no-cache'}";
const newFetchHeaders = "headers:{Accept:'application/json, text/plain, */*'}";
if (!model.includes(oldFetchHeaders)) throw new Error('[V16.9.1F52] fetchJson no-cache header not found.');
model = model.replace(oldFetchHeaders, newFetchHeaders);

const fastCareerBlock = `const FULL_CAREER_CACHE_TTL_MS=6*60*60*1000;
const FULL_CAREER_CACHE_MAX_ITEMS=240;
const fullCareerCache=globalThis.__TJK_MODEL_FULL_CAREER_V1117_CACHE__||(globalThis.__TJK_MODEL_FULL_CAREER_V1117_CACHE__=new Map());
function pruneFullCareerCache(now=Date.now()){for(const[key,hit]of fullCareerCache){if(!hit||(!hit.promise&&now-Number(hit.time||0)>FULL_CAREER_CACHE_TTL_MS))fullCareerCache.delete(key)}while(fullCareerCache.size>FULL_CAREER_CACHE_MAX_ITEMS){const first=fullCareerCache.keys().next().value;if(first===undefined)break;fullCareerCache.delete(first)}}
async function fetchFullCareer(baseUrl,horseId){const key=clean(horseId);if(!key)throw new Error('At ID bulunamadı.');const now=Date.now();pruneFullCareerCache(now);const hit=fullCareerCache.get(key);if(hit?.promise)return hit.promise;if(hit?.data&&now-Number(hit.time||0)<=FULL_CAREER_CACHE_TTL_MS)return hit.data;const url=new URL('/api/tjk-career-v10',baseUrl);url.searchParams.set('horseId',key);const promise=fetchJson(url.toString(),45000,INTERNAL_RETRIES);fullCareerCache.set(key,{time:now,promise});try{const data=await promise;if(!data?.ok)throw new Error(data?.error||'Tam kariyer alınamadı.');fullCareerCache.set(key,{time:Date.now(),data});pruneFullCareerCache();return data}catch(e){fullCareerCache.delete(key);throw e}}
function freezeCareerAt(career,before){const cutoff=clean(before);const raw=Array.isArray(career?.history)?career.history:[];const full=raw.filter(row=>!cutoff||clean(row?.isoDate||row?.date||'')<cutoff);const wins=full.filter(row=>Number(row?.finish??row?.rank??row?.sira)===1);const top5=full.filter(row=>{const f=Number(row?.finish??row?.rank??row?.sira);return f>=1&&f<=5});const recent=[...full].sort((a,b)=>clean(b?.isoDate||b?.date||'').localeCompare(clean(a?.isoDate||a?.date||''))).slice(0,5).sort((a,b)=>clean(a?.isoDate||a?.date||'').localeCompare(clean(b?.isoDate||b?.date||'')));const prep=top5.length?top5:recent;return{...career,before:cutoff||null,history:full,wins,top5,preparationPath:prep,recentForm:recent,analysisMode:wins.length?'WIN_PATH':full.length?'PREPARATION_PATH':'DEBUT',roadmap:wins.length?wins:prep,races:wins.length?wins:prep}}
async function buildHistoricalHorse(baseUrl,horse,date,careerCache){const result={...horse,career:{ok:false,fullPathBefore:[],historyBefore:[],winsBefore:[],top5Before:[],preparationPathBefore:[]}};if(!horse.horseId){result.career.error='At ID bulunamadı.';return result}const key=String(horse.horseId);let p=careerCache.get(key);if(!p){p=fetchFullCareer(baseUrl,key);careerCache.set(key,p)}try{const complete=await p;result.career=careerEnvelope(freezeCareerAt(complete,date));return result}catch(e){careerCache.delete(key);result.career.error=e?.message||'Tarihsel at kariyeri alınamadı.';return result}}`;

const careerRx = /async function buildHistoricalHorse\(baseUrl,horse,date,careerCache\)\{[\s\S]*?\}\n\n(?=async function buildRaces)/;
if (!careerRx.test(model)) throw new Error('[V16.9.1F52] buildHistoricalHorse block not found.');
model = model.replace(careerRx, fastCareerBlock + '\n\n');

const diagNeedle = 'careerConcurrency:CAREER_CONCURRENCY,sourceDurationMs';
if (!model.includes(diagNeedle)) throw new Error('[V16.9.1F52] diagnostics insertion point not found.');
model = model.replace(diagNeedle, "careerConcurrency:CAREER_CONCURRENCY,careerFetchMode:'FULL_HORSE_ONCE_LOCAL_FREEZE',fullCareerCacheSize:fullCareerCache.size,sourceDurationMs");

for (const token of [
  'TJK-MODEL-ROADMAP-V11.17-FAST',
  'v11.17-fast',
  'FULL_HORSE_ONCE_LOCAL_FREEZE',
  '__TJK_MODEL_FULL_CAREER_V1117_CACHE__',
  "new URL('/api/tjk-career-v10',baseUrl)"
]) {
  if (!model.includes(token)) throw new Error('[V16.9.1F52] Verification failed: ' + token);
}
if (model.includes(oldFetchHeaders)) throw new Error('[V16.9.1F52] no-cache header still present in internal model fetch.');
new Function(model.replace(/export default async function handler/, 'async function handler'));
fs.writeFileSync(MODEL, model, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169153');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169153')) throw new Error('[V16.9.1F52] Cache bust update failed.');

console.log('[AT AI] V16.9.1F52 build complete: 5 Model reuses one full career per horse, freezes locally by historical date, and allows CDN hits for internal History/Career calls.');
