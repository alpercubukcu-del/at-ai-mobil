const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f679.cjs');
const API=path.join(ROOT,'api','tjk-meeting-resolve-v1.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.80] F60.79 builder missing');
if(!fs.existsSync(API))throw new Error('[F60.80] Y.G. resolver API missing');
const api=fs.readFileSync(API,'utf8');
for(const token of[
  'TJK-MEETING-RESOLVE-V1.1-F60.80',
  'findCityEntries',
  'QUIET_DAYS_AFTER_TARGET',
  'interveningMeetingNos',
  'TJK_PROGRAM_CITY_YG_EXACT_CONTINUATION_SCAN'
])if(!api.includes(token))throw new Error('[F60.80] resolver invariant missing: '+token);
new Function(api.replace(/^import .*?;\s*/,'').replace(/export default async function handler/,'async function handler'));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169286');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=169286'))throw new Error('[F60.80] cache bust failed');
console.log('[AT AI] V16.9.1F60.80 build complete: annual program remains the baseline; incomplete races are resolved by exact city + season Y.G. + race number across later dates. Intervening Y.G. meetings no longer stop the search; result date/track/distance stay authoritative.');
