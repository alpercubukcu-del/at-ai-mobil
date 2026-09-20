const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f733.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const OUT=path.join(ROOT,'public','f60943114-debug.json');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
const app=fs.readFileSync(APP,'utf8');
const count=s=>(app.split(s).length-1);
const result={
  ensureStart:app.indexOf('async function ensureAnalysis(no){'),
  ensureEnd:app.indexOf('async function compute(no){',app.indexOf('async function ensureAnalysis(no){')),
  degreeStart:app.indexOf('function degreeScores(rows){'),
  degreeEnd:app.indexOf('async function openExisting(name){',app.indexOf('function degreeScores(rows){')),
  auditStart:app.indexOf('function degreeAudit(r){'),
  auditEnd:app.indexOf('function degreeMismatchText(r){',app.indexOf('function degreeAudit(r){')),
  oldTotal:count("workoutScores(horses);for(const r of horses)r.T=weighted({F:r.F,O:r.O,G:r.G,D:r.D},WEIGHTS);horses.sort((a,b)=>(Number(b.T)||-1)-(Number(a.T)||-1)||Number(a.no)-Number(b.no));horses.forEach((r,i)=>r.totalRank=i+1);"),
  snapScore:count('D:r.D,T:r.T,currentRank:r.currentRank'),
  snapDegree:count('predictedSec:r.predictedSec,actualFinish:r.actualFinish'),
  dLeader:count('d1=rows.find(x=>x.degreeRank===1),t1='),
  oldHead:count('<th>D</th><th>T</th><th>Güncel</th><th>D Sıra</th>'),
  oldCells:count("<td>${Number.isFinite(r.D)?r.D.toFixed(1):'—'}</td><td><b>${Number.isFinite(r.T)?r.T.toFixed(1):'—'}</b></td><td>${r.currentRank||'—'}</td><td>${r.degreeRank||'—'}</td>"),
  oldNote:count('<b>T · Toplam</b>: mevcut bileşenlerin ağırlıklı puanı. Eksik veri sıfır sayılmaz; ağırlık kalan bileşenlere dağıtılır.'),
  appLength:app.length
};
fs.writeFileSync(OUT,JSON.stringify(result,null,2));
console.log('[AT AI] F60.94.31.14 diagnostic',JSON.stringify(result));
