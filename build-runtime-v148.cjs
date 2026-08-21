const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v140.cjs');
const GENERATED = path.join(ROOT, '.build-runtime-v148.generated.cjs');

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`[V14.8] ${label}: hedef bulunamadı.`);
  if (source.indexOf(needle, first + needle.length) >= 0) {
    throw new Error(`[V14.8] ${label}: hedef birden fazla bulundu; güvenli dönüşüm durduruldu.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

const modeAwareRuntimeCode = `const TICKET_MODE_AWARE_VERSION='TICKET-MODE-AWARE-V11.0-COMPACT';
const prepareRaceModelsBaseV11=prepareRaceModelsV11;
const buildOneTicketBaseV11=buildOneTicketV11;
function rawSortV11(a,b,modelId){const sa=a?.scores?.[modelId]||{},sb=b?.scores?.[modelId]||{};const av=finiteV11(sa.score)??-1,bv=finiteV11(sb.score)??-1;return bv-av||Number(sb.strongYears||0)-Number(sa.strongYears||0)||Number(sb.supportYears||0)-Number(sa.supportYears||0)||(finiteV11(sb.latestScore)??-1)-(finiteV11(sa.latestScore)??-1)||Number(a?.horse?.no||999)-Number(b?.horse?.no||999);}
function decisionScoreFromModeRankV11(index,size,coverageYears){const rankBase=size<=1?100:100-(index/Math.max(1,size-1))*40;const coverage=Math.max(0,Number(coverageYears)||0);return Math.round(rankBase*(0.75+0.25*Math.min(1,coverage/3)));}
function applyModeAwareScoresV11(horses){return Array.isArray(horses)?horses:[];}
prepareRaceModelsV11=async function(race,progress){const result=await prepareRaceModelsBaseV11(race,progress);result.horses=applyModeAwareScoresV11(result.horses);result.modeAwareVersion=TICKET_MODE_AWARE_VERSION;return result;};
buildOneTicketV11=function(plan,model,raceDataMap,budget,unitPrice,requestedSingles){const ticket=buildOneTicketBaseV11(plan,model,raceDataMap,budget,unitPrice,requestedSingles);ticket.modeAware=true;ticket.modeAwareVersion=TICKET_MODE_AWARE_VERSION;ticket.scoreRule='Ham tam-kariyer benzerliği ana skordur; mod sırası yalnız tanı bilgisidir.';return ticket;};`;

const classMatchRuntimeCode = `const CLASS_MATCH_V1112='GENERIC-CLASS-MATCH-V11.12-COMPACT';
const rankRaceForModelBeforeV1112=rankRaceForModelV11;
rankRaceForModelV11=function(raceData,modelId){const rows=rankRaceForModelBeforeV1112(raceData,modelId);return(Array.isArray(rows)?rows:[]).filter(row=>row?.score!==null&&row?.score!==undefined&&row?.score!==''&&Number.isFinite(Number(row.score)));};`;

const annualSelectedSetRuntimeCode = `(()=>{'use strict';if(window.__AT_AA_SET_HOOK_V134__)return;window.__AT_AA_SET_HOOK_V134__=true;const NativeSet=window.Set;let captured=false;function CaptureSet(iterable){const instance=new NativeSet(iterable);if(!captured){captured=true;window.__AT_AA_SELECTED_IDS_V134__=instance;}return instance;}CaptureSet.prototype=NativeSet.prototype;try{Object.setPrototypeOf(CaptureSet,NativeSet);}catch{}window.Set=CaptureSet;setTimeout(()=>{if(window.Set===CaptureSet)window.Set=NativeSet;},0);})();`;

const betStartStrictRuntimeCode = `const BET_START_STRICT_V118='BET-START-STRICT-V11.8-COMPACT';
resolveBetStartV11=function(type){const desc=betDescriptorV11(type);if(!desc.legs)return{ok:false,error:\`Bahis ayak sayısı okunamadı: \${type}\`,desc};const candidates=[];(Array.isArray(state.races)?state.races:[]).forEach((race,index)=>{for(const label of Array.isArray(race.betStarts)?race.betStarts:[]){if(labelMatchesBetV11(label,desc))candidates.push({race,index,label});}});let selected=null;if(desc.variant){selected=candidates.find(c=>new RegExp(\`(^|\\\\D)\${desc.variant}\\\\s*\\\\.\`).test(String(c.label)))||null;if(!selected&&candidates.length>=desc.variant)selected=candidates[desc.variant-1];}else selected=candidates[0]||null;if(!selected)return{ok:false,error:\`\${type} için TJK resmi başlangıç bilgisi bulunamadı. Başlangıç tahmin edilmeyecek.\`,desc,inferred:false};const legs=state.races.slice(selected.index,selected.index+desc.legs);if(legs.length!==desc.legs)return{ok:false,error:\`\${type} \${selected.race.no}. koşudan başlıyor fakat \${desc.legs} ayak tamamlanamıyor.\`,desc,inferred:false};return{ok:true,desc,startIndex:selected.index,startRace:selected.race.no,startLabel:selected.label,inferred:false,official:true,legs};};`;

const autoResumeRuntimeCode = `(()=>{'use strict';if(window.__AT_AUTO_RESUME_V128__)return;window.__AT_AUTO_RESUME_V128__=true;const VERSION='AUTO-RESUME-NETWORK-V12.8-COMPACT',AUTO_DELAY_MS=2500,BOOT_DELAY_MS=3500,CLICK_COOLDOWN_MS=15000;let timer=null,lastAutoClickAt=0;function resumeUi(){const box=document.getElementById('atAiResumeV127');if(!box||!box.classList.contains('show'))return null;const button=box.querySelector('button');if(!button)return null;return getComputedStyle(button).display!=='none'&&!button.disabled?{box,button}:null;}function tryAutoResume(reason='online'){if(!navigator.onLine)return false;const now=Date.now();if(now-lastAutoClickAt<CLICK_COOLDOWN_MS)return false;const ui=resumeUi();if(!ui)return false;lastAutoClickAt=now;const title=ui.box.querySelector('.at-resume-text b'),detail=ui.box.querySelector('.at-resume-text span');if(title)title.textContent='Bağlantı geri geldi';if(detail)detail.textContent='Eksik kalan analiz otomatik devam ettiriliyor… Tamamlanan veriler yeniden indirilmeyecek.';console.info('[AT AI]',VERSION,'otomatik devam:',reason);ui.button.click();return true;}function schedule(delay=AUTO_DELAY_MS,reason='online'){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;tryAutoResume(reason);},delay);}window.addEventListener('offline',()=>{if(timer){clearTimeout(timer);timer=null;}});window.addEventListener('online',()=>schedule(AUTO_DELAY_MS,'reconnect'));if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(BOOT_DELAY_MS,'page-reload'),{once:true});else schedule(BOOT_DELAY_MS,'page-reload');})();`;

const compactDeclarations =
  `const modeAwareCompat = ${JSON.stringify(modeAwareRuntimeCode)};\n` +
  `const classMatchCompat = ${JSON.stringify(classMatchRuntimeCode)};\n` +
  `const annualSelectedSetCompat = ${JSON.stringify(annualSelectedSetRuntimeCode)};\n` +
  `const betStartStrictCompat = ${JSON.stringify(betStartStrictRuntimeCode)};\n` +
  `const autoResumeCompat = ${JSON.stringify(autoResumeRuntimeCode)};\n\n`;

let source = fs.readFileSync(BASE, 'utf8');

source = replaceOnce(source, "  'ticket-models-v11-mode-aware.js',", "  '__MODE_AWARE_COMPAT__',", 'mode-aware runtime listesi');
source = replaceOnce(source, "  'class-match-v1112.js',", "  '__CLASS_MATCH_COMPAT__',", 'class-match runtime listesi');
source = replaceOnce(source, "  'annual-selected-set-hook-v134.js',", "  '__ANNUAL_SELECTED_SET_COMPAT__',", 'annual selected-set runtime listesi');
source = replaceOnce(source, "  'bet-start-strict-v118.js',", "  '__BET_START_STRICT_COMPAT__',", 'strict bet-start runtime listesi');
source = replaceOnce(source, "  'auto-resume-v128.js',", "  '__AUTO_RESUME_COMPAT__',", 'auto-resume runtime listesi');

source = replaceOnce(source,'const historicalReferenceV125Compat = `',compactDeclarations+'const historicalReferenceV125Compat = `','compact katman bildirimleri');

source = replaceOnce(
  source,
  "  runtimeSourceSet.add('historical-reference-fullpath-v125.js');",
  "  runtimeSourceSet.add('historical-reference-fullpath-v125.js');\n  runtimeSourceSet.add('ticket-models-v11-mode-aware.js');\n  runtimeSourceSet.add('class-match-v1112.js');\n  runtimeSourceSet.add('annual-selected-set-hook-v134.js');\n  runtimeSourceSet.add('bet-start-strict-v118.js');\n  runtimeSourceSet.add('auto-resume-v128.js');",
  'deploy kaynak ayıklama listesi'
);

source = replaceOnce(
  source,
  "    if (file === '__HISTORICAL_V125_COMPAT__') {",
  "    if (file === '__MODE_AWARE_COMPAT__') {\n      runtimeChunks.push('\\n/* mode-aware compact */\\n' + modeAwareCompat);\n      continue;\n    }\n    if (file === '__BET_START_STRICT_COMPAT__') {\n      runtimeChunks.push('\\n/* strict bet-start compact */\\n' + betStartStrictCompat);\n      continue;\n    }\n    if (file === '__CLASS_MATCH_COMPAT__') {\n      runtimeChunks.push('\\n/* class-match compact */\\n' + classMatchCompat);\n      continue;\n    }\n    if (file === '__AUTO_RESUME_COMPAT__') {\n      runtimeChunks.push('\\n/* auto-resume compact */\\n' + autoResumeCompat);\n      continue;\n    }\n    if (file === '__ANNUAL_SELECTED_SET_COMPAT__') {\n      runtimeChunks.push('\\n/* annual selected-set compact */\\n' + annualSelectedSetCompat);\n      continue;\n    }\n    if (file === '__HISTORICAL_V125_COMPAT__') {",
  'runtime compact katman sırası'
);

source = source.replaceAll('V14.5.1','V14.8').replaceAll('V1451','V148');
source = source.replace(
  "console.log('[AT AI] Pruned full runtime modules: adaptive-history-v101.js; historical-reference-fullpath-v125.js.');",
  "console.log('[AT AI] Pruned full runtime modules: adaptive-history-v101.js; historical-reference-fullpath-v125.js; ticket-models-v11-mode-aware.js; class-match-v1112.js; annual-selected-set-hook-v134.js; bet-start-strict-v118.js; auto-resume-v128.js.');"
);
source = source.replace(
  "console.log('[AT AI] Pruned scoring layer: ticket-models-v11-weight.js; display helpers retained.');",
  "console.log('[AT AI] Pruned scoring layer: ticket-models-v11-weight.js; display helpers retained.');\n  console.log('[AT AI] Compact guards retained: raw-path ranking; null-score filter; official bet-start only; reconnect auto-resume; annual selectedIds capture.');"
);

new Function(source);
fs.writeFileSync(GENERATED, source, 'utf8');
try { execFileSync(process.execPath, [GENERATED], { cwd: ROOT, stdio: 'inherit' }); }
finally { fs.rmSync(GENERATED, { force: true }); }
