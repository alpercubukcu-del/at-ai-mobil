const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v140.cjs');
const GENERATED = path.join(ROOT, '.build-runtime-v147.generated.cjs');

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`[V14.7] ${label}: hedef bulunamadı.`);
  if (source.indexOf(needle, first + needle.length) >= 0) {
    throw new Error(`[V14.7] ${label}: hedef birden fazla bulundu; güvenli dönüşüm durduruldu.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

const modeAwareRuntimeCode = `/* V11 mode-aware compact compatibility.
   V11.9 later replaces applyModeAwareScoresV11 with RAW_FULL_HISTORICAL_PATH logic. */
const TICKET_MODE_AWARE_VERSION = 'TICKET-MODE-AWARE-V11.0-COMPACT';
const prepareRaceModelsBaseV11 = prepareRaceModelsV11;
const buildOneTicketBaseV11 = buildOneTicketV11;
function rawSortV11(a,b,modelId){
  const sa=a?.scores?.[modelId]||{},sb=b?.scores?.[modelId]||{};
  const av=finiteV11(sa.score)??-1,bv=finiteV11(sb.score)??-1;
  return bv-av||Number(sb.strongYears||0)-Number(sa.strongYears||0)||Number(sb.supportYears||0)-Number(sa.supportYears||0)||(finiteV11(sb.latestScore)??-1)-(finiteV11(sa.latestScore)??-1)||Number(a?.horse?.no||999)-Number(b?.horse?.no||999);
}
function decisionScoreFromModeRankV11(index,size,coverageYears){
  const rankBase=size<=1?100:100-(index/Math.max(1,size-1))*40;
  const coverage=Math.max(0,Number(coverageYears)||0);
  return Math.round(rankBase*(0.75+0.25*Math.min(1,coverage/3)));
}
function applyModeAwareScoresV11(horses){return Array.isArray(horses)?horses:[];}
prepareRaceModelsV11=async function(race,progress){
  const result=await prepareRaceModelsBaseV11(race,progress);
  result.horses=applyModeAwareScoresV11(result.horses);
  result.modeAwareVersion=TICKET_MODE_AWARE_VERSION;
  return result;
};
buildOneTicketV11=function(plan,model,raceDataMap,budget,unitPrice,requestedSingles){
  const ticket=buildOneTicketBaseV11(plan,model,raceDataMap,budget,unitPrice,requestedSingles);
  ticket.modeAware=true;
  ticket.modeAwareVersion=TICKET_MODE_AWARE_VERSION;
  ticket.scoreRule='Ham tam-kariyer benzerliği ana skordur; mod sırası yalnız tanı bilgisidir.';
  return ticket;
};
console.info('[AT AI]',TICKET_MODE_AWARE_VERSION,'aktif — eski karar-skoru katmanı ayıklandı');`;

const classMatchRuntimeCode = `/* V11.12 compact null-score ranking guard. */
const CLASS_MATCH_V1112='GENERIC-CLASS-MATCH-V11.12-COMPACT';
const rankRaceForModelBeforeV1112=rankRaceForModelV11;
rankRaceForModelV11=function(raceData,modelId){
  const rows=rankRaceForModelBeforeV1112(raceData,modelId);
  return (Array.isArray(rows)?rows:[]).filter(row=>row?.score!==null&&row?.score!==undefined&&row?.score!==''&&Number.isFinite(Number(row.score)));
};
console.info('[AT AI]',CLASS_MATCH_V1112,'aktif — null skor guard kompakt');`;

const annualSelectedSetRuntimeCode = `/* Annual archive selectedIds compact capture hook. */
(()=>{
  'use strict';
  if(window.__AT_AA_SET_HOOK_V134__)return;
  window.__AT_AA_SET_HOOK_V134__=true;
  const NativeSet=window.Set;let captured=false;
  function CaptureSet(iterable){const instance=new NativeSet(iterable);if(!captured){captured=true;window.__AT_AA_SELECTED_IDS_V134__=instance;}return instance;}
  CaptureSet.prototype=NativeSet.prototype;
  try{Object.setPrototypeOf(CaptureSet,NativeSet);}catch{}
  window.Set=CaptureSet;
  setTimeout(()=>{if(window.Set===CaptureSet)window.Set=NativeSet;},0);
})();`;

const compactDeclarations =
  `const modeAwareCompat = ${JSON.stringify(modeAwareRuntimeCode)};\n` +
  `const classMatchCompat = ${JSON.stringify(classMatchRuntimeCode)};\n` +
  `const annualSelectedSetCompat = ${JSON.stringify(annualSelectedSetRuntimeCode)};\n\n`;

let source = fs.readFileSync(BASE, 'utf8');

source = replaceOnce(source, "  'ticket-models-v11-mode-aware.js',", "  '__MODE_AWARE_COMPAT__',", 'mode-aware runtime listesi');
source = replaceOnce(source, "  'class-match-v1112.js',", "  '__CLASS_MATCH_COMPAT__',", 'class-match runtime listesi');
source = replaceOnce(source, "  'annual-selected-set-hook-v134.js',", "  '__ANNUAL_SELECTED_SET_COMPAT__',", 'annual selected-set runtime listesi');

source = replaceOnce(
  source,
  'const historicalReferenceV125Compat = `',
  compactDeclarations + 'const historicalReferenceV125Compat = `',
  'compact katman bildirimleri'
);

source = replaceOnce(
  source,
  "  runtimeSourceSet.add('historical-reference-fullpath-v125.js');",
  "  runtimeSourceSet.add('historical-reference-fullpath-v125.js');\n  runtimeSourceSet.add('ticket-models-v11-mode-aware.js');\n  runtimeSourceSet.add('class-match-v1112.js');\n  runtimeSourceSet.add('annual-selected-set-hook-v134.js');",
  'deploy kaynak ayıklama listesi'
);

source = replaceOnce(
  source,
  "    if (file === '__HISTORICAL_V125_COMPAT__') {",
  "    if (file === '__MODE_AWARE_COMPAT__') {\n      runtimeChunks.push('\\n/* ticket-models-v11-mode-aware compact compatibility */\\n' + modeAwareCompat);\n      continue;\n    }\n    if (file === '__CLASS_MATCH_COMPAT__') {\n      runtimeChunks.push('\\n/* class-match-v1112 compact compatibility */\\n' + classMatchCompat);\n      continue;\n    }\n    if (file === '__ANNUAL_SELECTED_SET_COMPAT__') {\n      runtimeChunks.push('\\n/* annual-selected-set-hook-v134 compact compatibility */\\n' + annualSelectedSetCompat);\n      continue;\n    }\n    if (file === '__HISTORICAL_V125_COMPAT__') {",
  'runtime compact katman sırası'
);

source = source.replaceAll('V14.5.1', 'V14.7').replaceAll('V1451', 'V147');
source = source.replace(
  "console.log('[AT AI] Pruned full runtime modules: adaptive-history-v101.js; historical-reference-fullpath-v125.js.');",
  "console.log('[AT AI] Pruned full runtime modules: adaptive-history-v101.js; historical-reference-fullpath-v125.js; ticket-models-v11-mode-aware.js; class-match-v1112.js; annual-selected-set-hook-v134.js.');"
);
source = source.replace(
  "console.log('[AT AI] Pruned scoring layer: ticket-models-v11-weight.js; display helpers retained.');",
  "console.log('[AT AI] Pruned scoring layer: ticket-models-v11-weight.js; display helpers retained.');\n  console.log('[AT AI] Compact guards retained: mode-aware raw-path hooks; null-score ranking guard; annual selectedIds capture.');"
);

new Function(source);
fs.writeFileSync(GENERATED, source, 'utf8');

try {
  execFileSync(process.execPath, [GENERATED], { cwd: ROOT, stdio: 'inherit' });
} finally {
  fs.rmSync(GENERATED, { force: true });
}
