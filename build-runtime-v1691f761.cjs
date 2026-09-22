const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ROOT=__dirname,BASE=path.join(ROOT,'build-runtime-v1691f759.cjs'),APP=path.join(ROOT,'public','at-ai-app-v142.js'),INDEX=path.join(ROOT,'public','index.html');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const marks=['MOBILE-FOREGROUND-RECOVERY-V16.5.4','Kilidi Aç'];
let removed=0;
const start=app.indexOf('/* AT AI Mobil — MOBILE-FOREGROUND-RECOVERY-V16.5.4');
if(start>=0){const end=app.indexOf('})();',start);if(end>=0){app=app.slice(0,start)+'/* F60.94.31.44 mobile foreground recovery disabled */'+app.slice(end+5);removed++;}}
app=app.replace(/setInterval\(\(\) => \{[\s\S]*?lastPaintAt[\s\S]*?\}, 10000\);/g,'');
new Function(app);fs.writeFileSync(APP,app);
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693014');
html=html.replace(/<script[^>]*mobile-foreground-recovery-v1654\.js[^>]*><\/script>/g,'');
fs.writeFileSync(INDEX,html);
console.log('[AT AI] F60.94.31.44 startup recovery disabled; removed=',removed);