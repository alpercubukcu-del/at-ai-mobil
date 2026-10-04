const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const R=__dirname,BASE=path.join(R,'build-runtime-v1691f773.cjs'),APP=path.join(R,'public','at-ai-app-v142.js'),INDEX=path.join(R,'public','index.html'),DNA=path.join(R,'fogd-score-center-v1691f721.js'),COUPON_CORE=path.join(R,'fogd-nine-coupon-core.js'),COUPON=path.join(R,'fogd-nine-coupon-v173.js'),CONDITION_CORE=path.join(R,'fogd-condition-core.js'),CONDITION=path.join(R,'fogd-condition-coupon-v174.js');
for(const f of[BASE,DNA,COUPON_CORE,CONDITION_CORE,CONDITION,COUPON])if(!fs.existsSync(f))throw new Error('[V17 CLEAN] missing '+path.basename(f));
const directory=fs.readFileSync(path.join(R,'archive-directory-v1741.js'),'utf8');
new Function(directory);
const program=fs.readFileSync(path.join(R,'archive-program-v1742.js'),'utf8');
new Function(program);
const maintenance=fs.readFileSync(path.join(R,'track-maintenance-archive-v1741.js'),'utf8');
new Function(maintenance);
const dna=fs.readFileSync(DNA,'utf8'),couponCore=fs.readFileSync(COUPON_CORE,'utf8'),coupon=fs.readFileSync(COUPON,'utf8'),conditionCore=fs.readFileSync(CONDITION_CORE,'utf8'),condition=fs.readFileSync(CONDITION,'utf8');
if(!dna.includes('FOGD-DNA-ENGINE-V17.0-REBUILD'))throw new Error('[V17 CLEAN] DNA engine token missing');
if(!dna.includes('FOGD-VERIFIED-CONNECTIONS-V17.1'))throw new Error('[V17 CLEAN] verified connections feature token missing');
new Function(dna);
new Function(couponCore);
new Function(conditionCore);
new Function(condition);
new Function(coupon);
execFileSync(process.execPath,[BASE],{cwd:R,stdio:'inherit'});
const calibration=fs.readFileSync(path.join(R,'degree-calibration-v1744.js'),'utf8');new Function(calibration);
const degreeHistory=fs.readFileSync(path.join(R,'degree-history-core-v1746.js'),'utf8');new Function(degreeHistory);
const verifiedTrack=fs.readFileSync(path.join(R,'verified-track-context-v17413.js'),'utf8');new Function(verifiedTrack);
let app=verifiedTrack.trim()+'\n\n'+degreeHistory.trim()+'\n\n'+calibration.trim()+'\n\n'+directory.trim()+'\n\n'+program.trim()+'\n\n'+fs.readFileSync(APP,'utf8');
// Capture official main-page payloads before normalization discards their scope.
const programAnchor='function getCurrentRaceList(data,cityId){';
if(!app.includes(programAnchor))throw Error('[V17 CLEAN] main program capture boundary missing');
app=app.replace(programAnchor,programAnchor+'window.ATArchiveProgramV1742.remember(data);');
// Do not publish the previous city's horses while a new city is loading.
const cityAnchor='async function changeCity(cityId){state.city=String(cityId);';
if(!app.includes(cityAnchor))throw Error('[V17 CLEAN] city-change boundary missing');
app=app.replace(cityAnchor,cityAnchor+'state.races=[];');
const programReady='state.races=await enrichProgramRaceMeta(state.races);';
if(app.split(programReady).length<3)throw Error('[V17 CLEAN] program provenance boundaries missing');
let provenanceCount=0;
app=app.replaceAll(programReady,()=>programReady+(provenanceCount++<2?'state.programDate=date;state.programCity=String(state.city);':''));
// Replace the first executing maintenance module after the historical build steps.
// Later compatibility copies retain their original guard and cannot replace this API.
const maintenanceMarker=app.indexOf("const VERSION='TRACK-MAINT-ARCHIVE-V16.9.1F60.89';");
const maintenanceStart=app.lastIndexOf(';(() => {',maintenanceMarker),maintenanceEnd=app.indexOf('\n})();',maintenanceMarker);
if(maintenanceMarker<0||maintenanceStart<0||maintenanceEnd<0)throw Error('[V17 CLEAN] maintenance module boundary missing');
app=app.slice(0,maintenanceStart)+maintenance.trim()+app.slice(maintenanceEnd+6);
// The old builder rewrites the first door binding; route that surviving binding
// to the current Menu 8 owner, even when the button appears after menu setup.
const doorScope=app.indexOf('/* AT AI Mobil - V16.9.1F60.94.16 real Pist/Bakim/Hava archive door */');
const doorBind=app.indexOf('function bindButton(){',doorScope),doorBindEnd=app.indexOf('async function refreshMeta',doorBind);
if(doorScope<0||doorBind<0||doorBindEnd<0)throw Error('[V17 CLEAN] archive menu binding boundary missing');
let binding=app.slice(doorBind,doorBindEnd);
if(!binding.includes('try{const hub='))throw Error('[V17 CLEAN] legacy archive binding marker missing');
binding=binding.replace('try{const hub=','if(window.ATM8F48?.open){window.ATM8F48.open();return false}\n  try{const hub=');
app=app.slice(0,doorBind)+binding+app.slice(doorBindEnd);
if(!app.includes('FOGD-DNA-ENGINE-V17.0-REBUILD'))throw new Error('[V17 CLEAN] V17 DNA was not emitted by production build chain');
if((app.match(/FOGD-DNA-ENGINE-V17\.0-REBUILD/g)||[]).length!==1)throw new Error('[V17 CLEAN] duplicate V17 DNA engine');
for(const token of['FOGD-STABLE-INPUTS-V17.4.4','DEGREE-STABLE-INPUTS-V17.4.4'])if(!app.includes(token))throw Error('[V17 CLEAN] stable calculation missing '+token);
app+='\n\n'+couponCore.trim()+'\n\n'+conditionCore.trim()+'\n\n'+condition.trim()+'\n\n'+coupon.trim()+'\n';
for(const token of['FOGD-NINE-COUPON-CORE-V17.3','FOGD-ALL-RACES-TEMPLATE-V17.3','FOGD-CONDITION-CORE-V17.4','FOGD-CONDITION-COUPON-V17.4','FOGD-COUPON-V17.4','FOGD_ALL_RACES_V173','fogdAllRacesBuildV173','9 BAĞIMSIZ TÜM-KOŞU ŞABLONU','10 · Koşul Uyumlu Yakınlık'])if(!app.includes(token))throw new Error('[V17 CLEAN] coupon invariant missing '+token);
for(const forbidden of['id="buildAllBtn"','Kupon kaynağı: Kariyer/Hazırlık'])if(coupon.includes(forbidden))throw new Error('[V17 CLEAN] legacy coupon route leaked into V17.3 runtime: '+forbidden);
const reference=fs.readFileSync(path.join(R,'reference-archive-v17412.js'),'utf8');new Function(reference);app=reference+'\n'+app;
const winnerJourney=fs.readFileSync(path.join(R,'career-winner-journey-menu-v1.js'),'utf8');new Function(winnerJourney);app+=String.fromCharCode(10,10)+winnerJourney.trim()+String.fromCharCode(10);
const canonicalDrawer=fs.readFileSync(path.join(R,'canonical-drawer-v17414.js'),'utf8');new Function(canonicalDrawer);app+=String.fromCharCode(10,10)+canonicalDrawer.trim()+String.fromCharCode(10);
new Function(app);
for(const token of ['CAREER-WINNER-JOURNEY-MENU-V1.0','FULL_DAY_CARD_AUDIT','queryArchive','WINNER_ONLY + SEASON','CANONICAL-DRAWER-V17.4.15','DEGREE-AUTO-CALIBRATION-V17.4.4','DEGREE-STABLE-INPUTS-V17.4.4','uncalibratedSec'])if(!app.includes(token))throw Error('[V17 CLEAN] calibration missing '+token);
fs.writeFileSync(APP,app,'utf8');
for(const token of['ARCHIVE-PROGRAM-V17.4.2','ARCHIVE-DIRECTORY-V17.4.1','ARCHIVE-MENU-V17.4.2','TRACK-LONGTERM-ARCHIVE-V17.4.1','TRACK-MAINT-ARCHIVE-V17.4.1'])if(!app.includes(token))throw Error('[V17 CLEAN] archive menu fix missing '+token);
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1700413');
fs.writeFileSync(INDEX,html,'utf8');
console.log('[AT AI] V17.4.13 verified: completed degree inputs + one V17 DNA engine + nine independent column templates + isolated condition-aware tenth method');
