const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f758.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.41] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

// F18 Menü 7 tek açılış otoritesi annual-archive-menu-fix-v1662 olsun.
// V16.5.9 genel mobil drawer kilidinin yalnız kendi bloğundaki pointerdown/click
// kontrollerinden annualArchiveBtn'i çıkar; diğer menü/dialog korumalarına dokunma.
const marker="const VERSION='MOBILE-LAYER-LOCK-V16.5.9';";
const start=app.indexOf(marker);
const end=app.indexOf("console.info('[AT AI]',VERSION,'aktif');",start);
if(start<0||end<0)throw new Error('[F60.94.31.41] mobile layer lock block missing');
let block=app.slice(start,end);
const oldCond="if(!b || b.id==='closeMenu')return;";
const newCond="if(!b || b.id==='closeMenu' || b.id==='annualArchiveBtn')return;";
const before=block.split(oldCond).length-1;
if(before!==2)throw new Error('[F60.94.31.41] expected 2 early drawer guards, found '+before);
block=block.replaceAll(oldCond,newCond);
if((block.split(newCond).length-1)!==2)throw new Error('[F60.94.31.41] Menu 7 exemption patch failed');
app=app.slice(0,start)+block+app.slice(end);

for(const token of[
 'ANNUAL-ARCHIVE-MENU-FIX-V16.6.3',
 'openAnnualArchiveV1663',
 'window.ATAnnualArchiveV13',
 '/api/tjk-race-query-v1',
 'TJK_KOSU_SORGULAMA',
 'ATMenu7F18QueryBridgeF60943138'
])if(!app.includes(token))throw new Error('[F60.94.31.41] invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8')
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693011')
 .replaceAll('F60.94.31.40','F60.94.31.41');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1693011'))throw new Error('[F60.94.31.41] cache bust failed');
console.log('[AT AI] F60.94.31.41 build complete: F18 Menu 7 owns its mobile drawer-to-dialog transition; Koşu Sorgulama annual source retained.');
