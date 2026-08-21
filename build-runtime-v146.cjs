const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v140.cjs');
const GENERATED = path.join(ROOT, '.build-runtime-v146.generated.cjs');

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`[V14.6] ${label}: hedef bulunamadı.`);
  if (source.indexOf(needle, first + needle.length) >= 0) {
    throw new Error(`[V14.6] ${label}: hedef birden fazla bulundu; güvenli dönüşüm durduruldu.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

const modeAwareCompat = String.raw`const modeAwareCompat = \`/* V11 mode-aware compact compatibility.\n   V11.9 later replaces applyModeAwareScoresV11 with RAW_FULL_HISTORICAL_PATH logic. */\nconst TICKET_MODE_AWARE_VERSION = 'TICKET-MODE-AWARE-V11.0-COMPACT';\nconst prepareRaceModelsBaseV11 = prepareRaceModelsV11;\nconst buildOneTicketBaseV11 = buildOneTicketV11;\nfunction rawSortV11(a,b,modelId){\n  const sa=a?.scores?.[modelId]||{},sb=b?.scores?.[modelId]||{};\n  const av=finiteV11(sa.score)??-1,bv=finiteV11(sb.score)??-1;\n  return bv-av||Number(sb.strongYears||0)-Number(sa.strongYears||0)||Number(sb.supportYears||0)-Number(sa.supportYears||0)||(finiteV11(sb.latestScore)??-1)-(finiteV11(sa.latestScore)??-1)||Number(a?.horse?.no||999)-Number(b?.horse?.no||999);\n}\nfunction decisionScoreFromModeRankV11(index,size,coverageYears){\n  const rankBase=size<=1?100:100-(index/Math.max(1,size-1))*40;\n  const coverage=Math.max(0,Number(coverageYears)||0);\n  return Math.round(rankBase*(0.75+0.25*Math.min(1,coverage/3)));\n}\nfunction applyModeAwareScoresV11(horses){return Array.isArray(horses)?horses:[];}\nprepareRaceModelsV11=async function(race,progress){\n  const result=await prepareRaceModelsBaseV11(race,progress);\n  result.horses=applyModeAwareScoresV11(result.horses);\n  result.modeAwareVersion=TICKET_MODE_AWARE_VERSION;\n  return result;\n};\nbuildOneTicketV11=function(plan,model,raceDataMap,budget,unitPrice,requestedSingles){\n  const ticket=buildOneTicketBaseV11(plan,model,raceDataMap,budget,unitPrice,requestedSingles);\n  ticket.modeAware=true;\n  ticket.modeAwareVersion=TICKET_MODE_AWARE_VERSION;\n  ticket.scoreRule='Ham tam-kariyer benzerliği ana skordur; mod sırası yalnız tanı bilgisidir.';\n  return ticket;\n};\nconsole.info('[AT AI]',TICKET_MODE_AWARE_VERSION,'aktif — eski karar-skoru katmanı ayıklandı');\n\`;\n\n`;

let source = fs.readFileSync(BASE, 'utf8');

source = replaceOnce(
  source,
  "  'ticket-models-v11-mode-aware.js',",
  "  '__MODE_AWARE_COMPAT__',",
  'runtime listesi'
);

source = replaceOnce(
  source,
  'const historicalReferenceV125Compat = `',
  modeAwareCompat + 'const historicalReferenceV125Compat = `',
  'compact katman bildirimi'
);

source = replaceOnce(
  source,
  "  runtimeSourceSet.add('historical-reference-fullpath-v125.js');",
  "  runtimeSourceSet.add('historical-reference-fullpath-v125.js');\n  runtimeSourceSet.add('ticket-models-v11-mode-aware.js');",
  'deploy kaynak ayıklama listesi'
);

source = replaceOnce(
  source,
  "    if (file === '__HISTORICAL_V125_COMPAT__') {",
  "    if (file === '__MODE_AWARE_COMPAT__') {\n      runtimeChunks.push('\\n/* ticket-models-v11-mode-aware compact compatibility */\\n' + modeAwareCompat);\n      continue;\n    }\n    if (file === '__HISTORICAL_V125_COMPAT__') {",
  'runtime compact katman sırası'
);

source = source.replaceAll('V14.5.1', 'V14.6').replaceAll('V1451', 'V146');
source = source.replace(
  "console.log('[AT AI] Pruned scoring layer: ticket-models-v11-weight.js; display helpers retained.');",
  "console.log('[AT AI] Pruned scoring layers: ticket-models-v11-weight.js; ticket-models-v11-mode-aware.js legacy decision-score body.');\n  console.log('[AT AI] Retained mode-aware hooks for V11.9 raw full-path ranking + diagnostics.');"
);

// Parse the generated build script itself before executing it.
new Function(source);
fs.writeFileSync(GENERATED, source, 'utf8');

try {
  execFileSync(process.execPath, [GENERATED], { cwd: ROOT, stdio: 'inherit' });
} finally {
  fs.rmSync(GENERATED, { force: true });
}
