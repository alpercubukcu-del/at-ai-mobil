const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f734.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.15] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/* F60.94.31.14 added the Veri header but its row replacement was too broad and could miss
   after earlier D/D-Sapma patches. Patch the stable T -> Güncel boundary directly so every
   body row has the same column count/order as the header. */
const oldBoundary="<td><b>${Number.isFinite(r.T)?r.T.toFixed(1):'—'}</b></td><td>${r.currentRank||'—'}</td><td>${r.degreeRank||'—'}</td>";
const newBoundary="<td><b>${Number.isFinite(r.T)?r.T.toFixed(1):'—'}</b></td><td class=\"fogd-coverage\"><b>${Number(r.componentCount)||0}/4</b><div style=\"font-size:9px;opacity:.62;white-space:nowrap;margin-top:3px\">%${Math.round((Number(r.componentCoverage)||0)*100)} ağırlık</div></td><td>${r.currentRank||'—'}</td><td>${r.degreeRank||'—'}</td>";
const boundaryCount=app.split(oldBoundary).length-1;
if(boundaryCount!==1)throw new Error('[F60.94.31.15] FOGD T/Veri/Güncel row boundary mismatch: '+boundaryCount);
app=app.replace(oldBoundary,newBoundary);

if((app.split('<th>Veri</th>').length-1)!==1)throw new Error('[F60.94.31.15] Veri header count mismatch');
if((app.split('class=\"fogd-coverage\"').length-1)!==1)throw new Error('[F60.94.31.15] Veri body cell missing');
if(!app.includes('componentCount:r.componentCount')||!app.includes('componentCoverage:r.componentCoverage'))throw new Error('[F60.94.31.15] coverage fields missing');
app=app.replace("buildVersion:'F60.94.31.14'","buildVersion:'F60.94.31.15'");
app+='\n/* FOGD-COLUMN-ALIGN-V16.9.1F60.94.31.15 */\n';
for(const token of['FOGD-COLUMN-ALIGN-V16.9.1F60.94.31.15','<th>Veri</th>','class="fogd-coverage"','ARCHIVE-EXACT-DATE-V16.9.1F60.94.31.12','FOGD-HISTORY-CALIBRATION-V16.9.1F60.94.31.11'])if(!app.includes(token))throw new Error('[F60.94.31.15] bundle invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692985');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692985'))throw new Error('[F60.94.31.15] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.15 build complete: FOGD Veri body cell restored; table columns aligned.');
