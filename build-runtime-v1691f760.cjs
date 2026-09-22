const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ROOT=__dirname,BASE=path.join(ROOT,'build-runtime-v1691f759.cjs'),PATCH=path.join(ROOT,'menu8-query-archive-v1691f760.js'),APP=path.join(ROOT,'public','at-ai-app-v142.js'),INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE)||!fs.existsSync(PATCH))throw Error('[F60.94.31.43] build source missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');const patch=fs.readFileSync(PATCH,'utf8');new Function(patch);app+='\n\n'+patch+'\n';new Function(app);fs.writeFileSync(APP,app);
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693013');fs.writeFileSync(INDEX,html);
console.log('[AT AI] F60.94.31.43: Menu 8 lazy query/archive injected; no startup network work.');