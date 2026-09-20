const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f733.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.14] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/* F60.94.31.14
   1) Never trust a stale/partial Current Analysis race merely because the race number exists.
      The selected race must contain every horse in the live program; otherwise rebuild it.
   2) Re-run Degree-Speed when D is incomplete and always run the all-horse prediction audit.
   3) Race-median D fallback is informational only, never a full D component.
   4) FOGD T is coverage-aware: missing component weight is NOT redistributed to the others. */

const ensureStart=app.indexOf('async function ensureAnalysis(no){');
const ensureEnd=app.indexOf('async function compute(no){',ensureStart);
if(ensureStart<0||ensureEnd<0||ensureEnd<=ensureStart)throw new Error('[F60.94.31.14] ensureAnalysis target missing');
const ensure=`async function ensureAnalysis(no){let c=currentResult(),date=dateNow(),targetNo=Number(no),pr=programRaceFor(targetNo);const targetRace=()=>((currentResult()?.races||[]).find(r=>Number(r?.no)===targetNo)||null),sameHorse=(x,h)=>Number(x?.no)===Number(h?.no)||fold(x?.name)===fold(h?.name),hasTarget=()=>!!targetRace(),targetComplete=()=>{const rr=targetRace(),expected=pr?.horses||[],got=rr?.horses||[];if(!rr)return false;if(!expected.length)return true;return got.length>=expected.length&&expected.every(h=>got.some(x=>sameHorse(x,h)))},degreeIncomplete=()=>{const rr=targetRace(),expected=pr?.horses||[];if(!rr||!expected.length)return false;return expected.some(h=>{const x=(rr.horses||[]).find(y=>sameHorse(y,h));return !x||!Number.isFinite(Number(x?.degreeModel?.predictedSec))})};if(c?.races?.length&&clean(c?.date||date)===date&&hasTarget()&&targetComplete()){try{if((!c.degreeSpeed||degreeIncomplete())&&window.ATDegreeSpeedF6090?.enrichCurrent)await window.ATDegreeSpeedF6090.enrichCurrent()}catch{}try{window.ATDegreePredictionAuditF609430?.ensureEveryHorse?.(currentResult()||c)}catch{}return currentResult()||c}if(typeof gRunCurrentV1657!=='function')throw new Error('Güncel Analiz motoru hazır değil.');const sel=$('analysisRace');if(!sel)throw new Error('Güncel Analiz yarış seçici hazır değil.');const target=String(targetNo);if(![...(sel.options||[])].some(o=>String(o.value)===target)){if(!pr)throw new Error(targetNo+'. Koşu programda bulunamadı.');const opt=document.createElement('option');opt.value=target;opt.textContent=target+'. Koşu';sel.appendChild(opt)}sel.value=target;if(sel.value!==target)throw new Error(targetNo+'. Koşu Güncel Analiz için seçilemedi.');setPanelStatus(targetNo+'. Koşu · Güncel Analiz tam at listesiyle hazırlanıyor…');await gRunCurrentV1657();c=currentResult();if(!c?.races?.length)throw new Error('Güncel Analiz sonucu oluşmadı.');if(!hasTarget())throw new Error(targetNo+'. Koşu Güncel Analiz tarafından üretilemedi.');if(!targetComplete())throw new Error(targetNo+'. Koşu Güncel Analiz tüm program atlarını üretmedi.');try{if(window.ATDegreeSpeedF6090?.enrichCurrent)await window.ATDegreeSpeedF6090.enrichCurrent()}catch{}try{window.ATDegreePredictionAuditF609430?.ensureEveryHorse?.(c)}catch{}return currentResult()||c}\n`;
app=app.slice(0,ensureStart)+ensure+app.slice(ensureEnd);

const degreeStart=app.indexOf('function degreeScores(rows){');
const degreeEnd=app.indexOf('async function openExisting(name){',degreeStart);
if(degreeStart<0||degreeEnd<0||degreeEnd<=degreeStart)throw new Error('[F60.94.31.14] degreeScores target missing');
const degreeBlock=`function degreeScores(rows){const isFallback=r=>!!r?.analysis?.degreeModel?.fallback||clean(r?.analysis?.degreeModel?.method)==='YARIS_MEDYAN_FALLBACK',trusted=rows.filter(r=>Number.isFinite(Number(r?.analysis?.degreeModel?.predictedSec))&&!isFallback(r)),map=normalizeLower(trusted,r=>Number(r.analysis.degreeModel.predictedSec)),ranked=[...trusted].sort((a,b)=>Number(a.analysis.degreeModel.predictedSec)-Number(b.analysis.degreeModel.predictedSec)||Number(a.no)-Number(b.no)),rankMap=new Map(ranked.map((r,i)=>[r,i+1]));for(const r of rows){const dm=r?.analysis?.degreeModel||null,pred=Number(dm?.predictedSec),fallback=isFallback(r);r.predictedSec=Number.isFinite(pred)?pred:null;r.degreeFallback=fallback;r.degreeMethod=clean(dm?.method||'');r.degreeRank=!fallback&&rankMap.has(r)?rankMap.get(r):null;r.D=!fallback&&map.has(r)?map.get(r):null;r.degreeReason=!r.analysis?'Güncel Analiz kaydı yok':!Number.isFinite(pred)?'Derece-Hız için yeterli geçmiş örnek yok':fallback?'Yarış medyanı fallback · T puanına katılmadı':(r.degreeMethod||'Derece-Hız tahmini')}}\nfunction fogdTotal(r){const values={F:r.F,O:r.O,G:r.G,D:r.D};let sum=0,coverage=0,count=0;for(const k of Object.keys(WEIGHTS)){const v=values[k];if(Number.isFinite(v)){sum+=v*WEIGHTS[k];coverage+=WEIGHTS[k];count++}}return{score:coverage?Number(sum.toFixed(1)):null,normalized:coverage?Number((sum/coverage).toFixed(1)):null,coverage:Number(coverage.toFixed(2)),count}}\n`;
app=app.slice(0,degreeStart)+degreeBlock+app.slice(degreeEnd);

const auditStart=app.indexOf('function degreeAudit(r){');
const auditEnd=app.indexOf('function degreeMismatchText(r){',auditStart);
if(auditStart<0||auditEnd<0||auditEnd<=auditStart)throw new Error('[F60.94.31.14] degreeAudit target missing');
const degreeAudit=`function degreeAudit(r){const pred=Number(r?.predictedSec),actual=Number(r?.actualSec),dRank=Number(r?.degreeRank),finish=Number(r?.actualFinish),trusted=!r?.degreeFallback;return{timeError:trusted&&Number.isFinite(pred)&&pred>0&&Number.isFinite(actual)&&actual>0?Number((actual-pred).toFixed(2)):null,rankError:trusted&&Number.isFinite(dRank)&&dRank>0&&Number.isFinite(finish)&&finish>0?finish-dRank:null}}\n`;
app=app.slice(0,auditStart)+degreeAudit+app.slice(auditEnd);

const oldTotal="workoutScores(horses);for(const r of horses)r.T=weighted({F:r.F,O:r.O,G:r.G,D:r.D},WEIGHTS);horses.sort((a,b)=>(Number(b.T)||-1)-(Number(a.T)||-1)||Number(a.no)-Number(b.no));horses.forEach((r,i)=>r.totalRank=i+1);";
const newTotal="workoutScores(horses);for(const r of horses){const t=fogdTotal(r);r.T=t.score;r.TNormalized=t.normalized;r.componentCoverage=t.coverage;r.componentCount=t.count}horses.sort((a,b)=>(Number(b.T)||-1)-(Number(a.T)||-1)||(Number(b.componentCoverage)||0)-(Number(a.componentCoverage)||0)||Number(a.no)-Number(b.no));horses.forEach((r,i)=>r.totalRank=i+1);";
if((app.split(oldTotal).length-1)!==1)throw new Error('[F60.94.31.14] total score target mismatch');
app=app.replace(oldTotal,newTotal);

const snapScore='D:r.D,T:r.T,currentRank:r.currentRank';
const snapScoreNew='D:r.D,T:r.T,TNormalized:r.TNormalized,componentCount:r.componentCount,componentCoverage:r.componentCoverage,currentRank:r.currentRank';
if((app.split(snapScore).length-1)!==1)throw new Error('[F60.94.31.14] snapshot score target mismatch');
app=app.replace(snapScore,snapScoreNew);
const snapDegree='predictedSec:r.predictedSec,actualFinish:r.actualFinish';
const snapDegreeNew='predictedSec:r.predictedSec,degreeFallback:r.degreeFallback,degreeMethod:r.degreeMethod,degreeReason:r.degreeReason,actualFinish:r.actualFinish';
if((app.split(snapDegree).length-1)!==1)throw new Error('[F60.94.31.14] snapshot degree target mismatch');
app=app.replace(snapDegree,snapDegreeNew);

const dLeader='d1=rows.find(x=>x.degreeRank===1),t1=';
const dLeaderNew='d1=rows.find(x=>x.degreeRank===1&&!x.degreeFallback&&Number.isFinite(x.D)),t1=';
if((app.split(dLeader).length-1)!==1)throw new Error('[F60.94.31.14] D leader target mismatch');
app=app.replace(dLeader,dLeaderNew);

const oldHead='<th>D</th><th>T</th><th>Güncel</th><th>D Sıra</th>';
const newHead='<th>D</th><th>T</th><th>Veri</th><th>Güncel</th><th>D Sıra</th>';
if((app.split(oldHead).length-1)!==1)throw new Error('[F60.94.31.14] table head target mismatch');
app=app.replace(oldHead,newHead);
const oldCells="<td>${Number.isFinite(r.D)?r.D.toFixed(1):'—'}</td><td><b>${Number.isFinite(r.T)?r.T.toFixed(1):'—'}</b></td><td>${r.currentRank||'—'}</td><td>${r.degreeRank||'—'}</td>";
const newCells="<td>${Number.isFinite(r.D)?r.D.toFixed(1):'—'}${r.degreeReason?`<div style=\"font-size:9px;opacity:.62;max-width:150px;margin-top:3px\">${esc(r.degreeReason)}</div>`:''}</td><td><b>${Number.isFinite(r.T)?r.T.toFixed(1):'—'}</b></td><td><b>${Number(r.componentCount)||0}/4</b><div style=\"font-size:9px;opacity:.62\">%${Math.round((Number(r.componentCoverage)||0)*100)} ağırlık</div></td><td>${r.currentRank||'—'}</td><td>${r.degreeRank||'—'}</td>";
if((app.split(oldCells).length-1)!==1)throw new Error('[F60.94.31.14] table cells target mismatch');
app=app.replace(oldCells,newCells);

const oldNote='<b>T · Toplam</b>: mevcut bileşenlerin ağırlıklı puanı. Eksik veri sıfır sayılmaz; ağırlık kalan bileşenlere dağıtılır.';
const newNote='<b>T · Toplam</b>: bileşenlerin sabit ağırlıklı puanı. Eksik bileşenin ağırlığı diğerlerine dağıtılmaz; 4/4 tam veri %100 kapsamdır. 3/4 satırda eksik bileşenin ağırlığı T puanına eklenmez. Yarış medyanı D fallback yalnız bilgi amaçlıdır.';
if((app.split(oldNote).length-1)!==1)throw new Error('[F60.94.31.14] explanatory note target mismatch');
app=app.replace(oldNote,newNote);

for(const token of[
 'Güncel Analiz tam at listesiyle hazırlanıyor',
 'Güncel Analiz tüm program atlarını üretmedi',
 'function fogdTotal(r)',
 'degreeFallback',
 'Yarış medyanı fallback · T puanına katılmadı',
 '<th>Veri</th>',
 '4/4 tam veri %100 kapsamdır',
 'ARCHIVE-EXACT-DATE-V16.9.1F60.94.31.12',
 'FOGD-HISTORY-CALIBRATION-V16.9.1F60.94.31.11'
])if(!app.includes(token))throw new Error('[F60.94.31.14] bundle invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692984');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692984'))throw new Error('[F60.94.31.14] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.14 build complete: stale Current Analysis repaired; D fallback separated; FOGD uses fixed-weight coverage-aware T.');
