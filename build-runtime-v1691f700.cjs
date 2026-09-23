const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f699.cjs');
const BRIDGE=path.join(ROOT,'track-maintenance-progress-bridge-v1691f700.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.8] F60.94.7 base builder missing');
if(!fs.existsSync(BRIDGE))throw new Error('[F60.94.8] maintenance progress bridge missing');
const bridge=fs.readFileSync(BRIDGE,'utf8');
for(const token of['TRACK-MAINT-PROGRESS-V16.9.1F60.94.8','at-ai:track-maintenance-status','window.ATTrackMaintenanceProgressF60948'])if(!bridge.includes(token))throw new Error('[F60.94.8] progress invariant missing: '+token);
new Function(bridge);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/* 1) One menu owner: the F60.94.4 canonical writer must never call the older workflow writer first. */
const legacyCall='try{legacyGuideApply?.()}catch{}';
if(app.includes(legacyCall))app=app.replaceAll(legacyCall,'/* F60.94.8: legacy workflow menu writer permanently bypassed. */');
/* Source may already be cleaned; keep the canonical no-legacy-call state valid. */

/* 2) Emit real maintenance progress from the existing F60.89 engine. */
const statusStart=app.indexOf("function setStatus(text,pct=null){const e=$('tmStatusF6089')");
const statusEnd=statusStart>=0?app.indexOf('\n\nasync function fetchPage',statusStart):-1;
if(statusStart<0||statusEnd<0)throw new Error('[F60.94.8] maintenance setStatus block not found');
const statusBlock=`function setStatus(text,pct=null){\n  const e=$('tmStatusF6089');if(e)e.textContent=text;\n  const b=$('tmBarF6089');if(b&&pct!==null)b.style.width=\`${'${'}Math.max(0,Math.min(100,pct))}%\`;\n  try{window.dispatchEvent(new CustomEvent('at-ai:track-maintenance-status',{detail:{text:String(text??''),pct:pct===null?null:Math.max(0,Math.min(100,Number(pct)||0)),version:VERSION}}))}catch{}\n}`;
app=app.slice(0,statusStart)+statusBlock+app.slice(statusEnd);

/* Manual backfill must not silently no-op when background auto-sync already owns the engine. */
const busyOld='async function backfillYears(from,to){if(busy)return;busy=true;';
const busyNew="async function backfillYears(from,to){if(busy)throw new Error('Pist/Bakım/Hava güncellemesi zaten çalışıyor. Lütfen mevcut işlem bitsin.');busy=true;";
if(!app.includes(busyOld))throw new Error('[F60.94.8] maintenance busy guard not found');
app=app.replace(busyOld,busyNew);

/* Expose busy state so the lightweight UI can distinguish real work from a silent auto-sync collision. */
const apiOld="window.ATTrackMaintenanceV1={version:VERSION,get:getReport,profile,infer,syncRange,backfillYears,autoSync,detailedSurface,windParts,getLastContext:()=>lastContext};";
const apiNew="window.ATTrackMaintenanceV1={version:VERSION,get:getReport,profile,infer,syncRange,backfillYears,autoSync,detailedSurface,windParts,getLastContext:()=>lastContext,isBusy:()=>busy};";
if(!app.includes(apiOld))throw new Error('[F60.94.8] maintenance API export not found');
app=app.replace(apiOld,apiNew);

/* 3) Strip every old click listener from menu 8 by replacing the DOM node once, then bind exactly one quick-dialog listener. */
const bindStart=app.indexOf("function bind(){const b=$('trackMaintenanceMenuBtnF60944')");
const bindEnd=bindStart>=0?app.indexOf('\nfor(const ms of[0,80,300,900,1800])',bindStart):-1;
if(bindStart<0||bindEnd<0)throw new Error('[F60.94.8] quick maintenance bind block not found');
const bindBlock=`function bind(){\n const old=$('trackMaintenanceMenuBtnF60944');if(!old)return false;\n if(old.dataset.quickMaintenanceBound==='F60.94.8')return true;\n const b=old.cloneNode(true);b.onclick=null;old.replaceWith(b);\n b.dataset.quickMaintenanceVersion=VERSION;b.dataset.quickMaintenanceBound='F60.94.8';\n b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openQuick()});\n try{window.ATMenuAuthorityGuardF60946?.repair?.('maintenance-button-rebound')}catch{}\n return true\n}`;
app=app.slice(0,bindStart)+bindBlock+app.slice(bindEnd);

/* Avoid reporting a manual 'update' as complete when an automatic maintenance sync is already running. */
const nowNeedle="const api=window.ATTrackMaintenanceV1;if(!api?.autoSync){setBusy(false,'Pist bakım motoru hazır değil.');return}";
if(!app.includes(nowNeedle))throw new Error('[F60.94.8] runNow API check not found');
app=app.replace(nowNeedle,nowNeedle+"\n if(api.isBusy?.()){setBusy(false,'Pist/Bakım/Hava güncellemesi zaten çalışıyor. Mevcut ilerleme gösteriliyor.');return}");

app+='\n\n'+bridge.trim()+'\n';
for(const token of['F60.94.8: legacy workflow menu writer permanently bypassed','quickMaintenanceBound=\'F60.94.8\'','at-ai:track-maintenance-status','TRACK-MAINT-PROGRESS-V16.9.1F60.94.8','DEGREE-SPEED-TOP5-V16.9.1F60.94.5'])if(!app.includes(token))throw new Error('[F60.94.8] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692948');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692948'))throw new Error('[F60.94.8] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.8 build complete: single menu owner, listener-clean menu 8, and live maintenance progress.');
