const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f700.cjs');
const ONESHOT=path.join(ROOT,'one-shot-menu-v1691f701.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.9] F60.94.8 base builder missing');
if(!fs.existsSync(ONESHOT))throw new Error('[F60.94.9] one-shot menu runtime missing');
const oneShot=fs.readFileSync(ONESHOT,'utf8');
for(const token of['ONE-SHOT-MENU-V16.9.1F60.94.9','__AT_ONE_SHOT_MENU_INSTALLED_F60949__','tmQuickDialogF60949','no menu repair loop'])if(!oneShot.includes(token))throw new Error('[F60.94.9] one-shot invariant missing: '+token);
new Function(oneShot);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

function stripRuntime(marker,label){
  const start=app.indexOf(marker);
  if(start<0)throw new Error(`[F60.94.9] ${label} marker missing`);
  const term='\n})();';
  const end=app.indexOf(term,start);
  if(end<0)throw new Error(`[F60.94.9] ${label} terminator missing`);
  app=app.slice(0,start)+`/* F60.94.9 removed ${label}: one-shot menu owns drawer. */\n`+app.slice(end+term.length);
}

/* Remove all post-load menu repair/rebind runtimes. They were fighting over the same drawer. */
stripRuntime('/* AT AI Mobil — V16.9.1F60.94.4 stable analysis drawer + track maintenance entry','F60.94.4 stable menu runtime');
stripRuntime('/* AT AI Mobil — V16.9.1F60.94.6 canonical drawer authority guard','F60.94.6 authority guard runtime');
stripRuntime('/* AT AI Mobil — V16.9.1F60.94.7 lightweight Pist/Bakım/Hava menu','F60.94.7 repeated quick-menu binder');

/* F60.45 lifecycle callbacks may still invoke applyProcessMenu later. Make it a strict no-op. */
const menuStart=app.indexOf('function applyProcessMenu() {');
const menuEnd=menuStart>=0?app.indexOf('\nfunction ensureAll()',menuStart):-1;
if(menuStart<0||menuEnd<0)throw new Error('[F60.94.9] applyProcessMenu block missing');
app=app.slice(0,menuStart)+`function applyProcessMenu() {\n  /* F60.94.9: data planner never owns drawer labels/order. */\n  return false;\n}\n`+app.slice(menuEnd);

/* Preserve F60.94.8 real maintenance progress and all analysis logic; append exactly one static menu owner last. */
app+='\n\n'+oneShot.trim()+'\n';

const forbidden=[
  'for(const ms of [50,350,1200,2550,3300]) setTimeout(applyStableMenu,ms)',
  'new MutationObserver(()=>{\n    if(repairing||repairQueued) return;',
  'for(const ms of[0,80,300,900,1800])setTimeout(bind,ms)',
  "try{window.ATStableAnalysisMenuF60944?.apply?.()}catch{}"
];
for(const token of forbidden)if(app.includes(token))throw new Error('[F60.94.9] legacy menu loop survived: '+token.slice(0,70));
for(const token of['ONE-SHOT-MENU-V16.9.1F60.94.9','TRACK-MAINT-PROGRESS-V16.9.1F60.94.8','at-ai:track-maintenance-status','DEGREE-SPEED-TOP5-V16.9.1F60.94.5','return false;\n}\n\nfunction ensureAll()'])if(!app.includes(token))throw new Error('[F60.94.9] bundle verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692949');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692949'))throw new Error('[F60.94.9] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.9 build complete: one-shot menu only; no observer/timer/rebind drawer loops; maintenance progress retained.');
