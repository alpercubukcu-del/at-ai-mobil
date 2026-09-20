const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f729.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.10] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/* FOGD: after a real result exists, discrepancy must compare D against the REAL finish/time,
   not against the separate Güncel Analiz rank. Keep the old pre-race confirmations only while
   there is no actual result. */
const oldSignal="function signal(r,leaders){if(r.currentRank===1&&r.degreeRank===1&&r.totalRank===1)return'ÜÇLÜ TEYİT';if(r.currentRank===1&&r.degreeRank===1)return'ÇİFT TEYİT';if(r.currentRank===1&&r.totalRank===1)return'TOPLAM TEYİT';if(r.currentRank===1&&Number(r.degreeRank)>=4)return'D UYUŞMAZLIK';if(r.totalRank===1)return'T LİDERİ';return''}";
const newSignal="function degreeAudit(r){const pred=Number(r?.predictedSec),actual=Number(r?.actualSec),dRank=Number(r?.degreeRank),finish=Number(r?.actualFinish);return{timeError:Number.isFinite(pred)&&pred>0&&Number.isFinite(actual)&&actual>0?Number((actual-pred).toFixed(2)):null,rankError:Number.isFinite(dRank)&&dRank>0&&Number.isFinite(finish)&&finish>0?finish-dRank:null}}\nfunction degreeMismatchText(r){const m=degreeAudit(r),a=[];if(Number.isFinite(m.timeError))a.push(`${m.timeError>=0?'+':''}${m.timeError.toFixed(2)} sn`);if(Number.isFinite(m.rankError))a.push(m.rankError===0?'sıra ✓':`${Math.abs(m.rankError)} sıra`);return a.join(' · ')||'—'}\nfunction signal(r,leaders){const actualKnown=Number.isFinite(Number(r?.actualFinish))&&Number(r.actualFinish)>0,degreeKnown=Number.isFinite(Number(r?.degreeRank))&&Number(r.degreeRank)>0;if(actualKnown){const m=degreeAudit(r),a=[];if(degreeKnown&&Number(r.actualFinish)===1&&Number(r.degreeRank)===1)a.push('D KAZANAN TEYİDİ');else if(degreeKnown&&Number(r.actualFinish)===1)a.push(`D KAZANAN ${Number(r.degreeRank)}.`);if(Number.isFinite(m.timeError)&&Math.abs(m.timeError)>=1)a.push('D SÜRE UYUŞMAZLIK');if(Number.isFinite(m.rankError)&&Math.abs(m.rankError)>=3)a.push('D SIRA UYUŞMAZLIK');if(r.totalRank===1)a.push('T LİDERİ');return a.join(' · ')}if(r.currentRank===1&&r.degreeRank===1&&r.totalRank===1)return'ÜÇLÜ TEYİT';if(r.currentRank===1&&r.degreeRank===1)return'ÇİFT TEYİT';if(r.currentRank===1&&r.totalRank===1)return'TOPLAM TEYİT';if(r.currentRank===1&&Number(r.degreeRank)>=4)return'D UYUŞMAZLIK';if(r.totalRank===1)return'T LİDERİ';return''}";
if((app.split(oldSignal).length-1)!==1)throw new Error('[F60.94.31.10] FOGD signal target mismatch');
app=app.replace(oldSignal,newSignal);

const oldActual="for(const r of horses){const a=matchActual(actual,r.program);r.actualFinish=Number(a?.finish)||null;r.actualDegree=clean(a?.degree)||'';r.actualSec=degreeSec(a?.degree);r.signal=signal(r)}";
const newActual="for(const r of horses){const a=matchActual(actual,r.program);r.actualFinish=Number(a?.finish)||null;r.actualDegree=clean(a?.degree)||'';r.actualSec=degreeSec(a?.degree);const dm=degreeAudit(r);r.degreeTimeErrorSec=dm.timeError;r.degreeRankError=dm.rankError;r.signal=signal(r)}";
if((app.split(oldActual).length-1)!==1)throw new Error('[F60.94.31.10] FOGD actual target mismatch');
app=app.replace(oldActual,newActual);

const oldSnapshot="predictedSec:r.predictedSec,actualFinish:r.actualFinish,actualDegree:r.actualDegree,signal:r.signal";
const newSnapshot="predictedSec:r.predictedSec,actualFinish:r.actualFinish,actualDegree:r.actualDegree,actualSec:r.actualSec,degreeTimeErrorSec:r.degreeTimeErrorSec,degreeRankError:r.degreeRankError,signal:r.signal";
if((app.split(oldSnapshot).length-1)!==1)throw new Error('[F60.94.31.10] FOGD snapshot target mismatch');
app=app.replace(oldSnapshot,newSnapshot);

const oldHead="<th>Tahmini</th><th>Gerçek</th><th>Sinyal</th>";
const newHead="<th>Tahmini</th><th>Gerçek</th><th>D Sapma</th><th>Sinyal</th>";
if((app.split(oldHead).length-1)!==1)throw new Error('[F60.94.31.10] FOGD table header target mismatch');
app=app.replace(oldHead,newHead);
const oldRow="<td>${secText(r.predictedSec)}</td><td>${r.actualFinish?`${r.actualFinish}. · ${esc(r.actualDegree||'—')}`:'—'}</td><td><b>${esc(r.signal||'')}</b></td>";
const newRow="<td>${secText(r.predictedSec)}</td><td>${r.actualFinish?`${r.actualFinish}. · ${esc(r.actualDegree||'—')}`:'—'}</td><td><b>${esc(degreeMismatchText(r))}</b></td><td><b>${esc(r.signal||'')}</b></td>";
if((app.split(oldRow).length-1)!==1)throw new Error('[F60.94.31.10] FOGD table row target mismatch');
app=app.replace(oldRow,newRow);

/* Calibration: track/maintenance/weather/rail are race-level effects. One 14-horse race must not
   count as fourteen independent observations. Collapse horse residuals to one robust median per
   race (minimum 3 valid finishers), then train/validate on race units. */
const oldFit="function fitModel(samples){const work=(samples||[]).filter(s=>Number.isFinite(Number(s?.timeErrorSec))).map(s=>({sample:s,residual:Number(s.timeErrorSec)})),stages=[];for(const spec of SPECS){const map=stageMap(work,spec);stages.push({spec,map});for(const w of work){const k=spec.key(w.sample),g=k?map.get(k):null;if(g?.usable)w.residual-=g.correction}}return{n:work.length,stages,apply(sample){const parts=[];let total=0;for(const st of stages){const k=st.spec.key(sample),g=k?st.map.get(k):null,corr=g?.usable?g.correction:0;parts.push({id:st.spec.id,label:st.spec.label,key:k,n:g?.n||0,phase:phase(g?.n||0),correction:corr,usable:!!g?.usable,median:g?.median??null});total+=corr}return{parts,total}}}}";
const newFit="function raceUnitKey(s){return`${s?.date||''}|${fold(s?.city)}|${Number(s?.raceNo)||0}`}\nfunction collapseRaceSamples(samples){const src=(samples||[]).filter(s=>Number.isFinite(Number(s?.timeErrorSec)));if(!src.length)return[];if(src.every(s=>s?.calibrationUnit==='race'))return src;const g=new Map();for(const s of src){const k=raceUnitKey(s);if(!k||k.endsWith('|0'))continue;if(!g.has(k))g.set(k,[]);g.get(k).push(s)}const out=[];for(const[k,rows]of g){if(rows.length<3)continue;const med=median(rows.map(x=>Number(x.timeErrorSec)));if(!Number.isFinite(med))continue;const base=rows[0];out.push({...base,key:`race|${k}`,horseNo:null,horseName:`${rows.length} at medyanı`,timeErrorSec:Number(med.toFixed(3)),calibrationUnit:'race',calibrationHorseN:rows.length})}return out}\nfunction fitModel(samples){const units=collapseRaceSamples(samples),work=units.map(s=>({sample:s,residual:Number(s.timeErrorSec)})),stages=[];for(const spec of SPECS){const map=stageMap(work,spec);stages.push({spec,map});for(const w of work){const k=spec.key(w.sample),g=k?map.get(k):null;if(g?.usable)w.residual-=g.correction}}return{n:work.length,stages,apply(sample){const parts=[];let total=0;for(const st of stages){const k=st.spec.key(sample),g=k?st.map.get(k):null,corr=g?.usable?g.correction:0;parts.push({id:st.spec.id,label:st.spec.label,key:k,n:g?.n||0,phase:phase(g?.n||0),correction:corr,usable:!!g?.usable,median:g?.median??null});total+=corr}return{parts,total}}}}";
if((app.split(oldFit).length-1)!==1)throw new Error('[F60.94.31.10] calibration fit target mismatch');
app=app.replace(oldFit,newFit);

const oldSplit="function splitChronological(samples){const rows=[...(samples||[])].filter(s=>s?.date&&Number.isFinite(Number(s?.timeErrorSec))).sort((a,b)=>String(a.date).localeCompare(String(b.date))),dates=[...new Set(rows.map(x=>String(x.date)))];";
const newSplit="function splitChronological(samples){const rows=collapseRaceSamples(samples).filter(s=>s?.date&&Number.isFinite(Number(s?.timeErrorSec))).sort((a,b)=>String(a.date).localeCompare(String(b.date))),dates=[...new Set(rows.map(x=>String(x.date)))];";
if((app.split(oldSplit).length-1)!==1)throw new Error('[F60.94.31.10] calibration split target mismatch');
app=app.replace(oldSplit,newSplit);

const oldTrainN="trainN:train.length";
const newTrainN="trainN:model.n";
if((app.split(oldTrainN).length-1)!==1)throw new Error('[F60.94.31.10] calibration train count target mismatch');
app=app.replace(oldTrainN,newTrainN);
app=app.replace('En az <b>30</b> eşleşme olmadan düzeltme uygulanmaz;','En az <b>30 bağımsız yarış</b> olmadan düzeltme uygulanmaz; kalibrasyon n değeri at sayısı değil yarış sayısıdır;');

for(const t of['function degreeAudit(r)','D SÜRE UYUŞMAZLIK','D Sapma','degreeTimeErrorSec','function collapseRaceSamples(samples)','calibrationUnit:\'race\'','30 bağımsız yarış'])if(!app.includes(t))throw new Error('[F60.94.31.10] bundle invariant missing '+t);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692980');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692980'))throw new Error('[F60.94.31.10] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.10 build complete: FOGD compares D against real finish/time; race-level calibration uses one median residual per race.');
