const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const APP_OUT = path.join(PUBLIC, 'at-ai-app-v142.js');
const STYLE_OUT = path.join(PUBLIC, 'at-ai-styles-v141.css');

const runtimeFiles = [
  'exact-history-v9.js',
  'adaptive-history-v10.js',
  'adaptive-history-v102.js',
  'ticket-models-v11.js',
  'ticket-models-v11-mode-aware.js',
  'ticket-bet-starts-v11.js',
  'career-model-tabs-v112.js',
  'home-race-cards-v113.js',
  'foreign-program-v114.js',
  'podium-similarity-v115.js',
  'calibration-v116.js',
  'manual-ticket-v117.js',
  'bet-start-strict-v118.js',
  'at-ai-loop-guard-v1111.js',
  'class-match-v1112.js',
  'ui-career-fixes-v1113.js',
  'calibration-fixes-v117.js',
  'historical-path-v119.js',
  'model-roadmap-recovery-v120.js',
  'career-export-v121.js',
  'career-margin-v124.js',
  'historical-reference-fullpath-v125.js',
  'historical-reference-exact-v1251.js',
  'five-model-fullpath-fallback-v126.js',
  'resumable-career-v127.js',
  'auto-resume-v128.js',
  '__ANNUAL_DOMPARSER_BRIDGE__',
  'annual-selected-set-hook-v134.js',
  'tjk-annual-archive-v13.js',
  'annual-current-race-v133.js',
  'annual-top3-cache-v137.js',
  'annual-archive-guard-v136.js',
  'annual-career-five-model-v138.js',
  'analysis-navigation-performance-v139.js'
];

const styleFiles = [
  'styles.css',
  'adaptive-history-v10.css',
  'ticket-models-v11.css',
  'career-model-tabs-v112.css',
  'home-race-cards-v113.css',
  'podium-similarity-v115.css',
  'calibration-v116.css',
  'manual-ticket-v117.css',
  'ui-career-fixes-v1113.css',
  'tjk-annual-archive-v13.css'
];

const parserBridge = `(() => {\n  const nativeParse = DOMParser.prototype.parseFromString;\n  DOMParser.prototype.parseFromString = function(source, type) {\n    if (type === 'text/html' && typeof source === 'string' && /^\\s*<tbody\\b/i.test(source) && source.includes('YillikYarisProgramiCoklu')) {\n      source = \`<table>\${source}</table>\`;\n    }\n    return nativeParse.call(this, source, type);\n  };\n})();`;

// V10.1 was only a bridge from V10 to V10.2. V10.2 already owns the final roadmap
// endpoint and cache validator, so we keep the single legacy cache bit without shipping
// the complete V10.1 patch module.
const adaptiveV101Compat = `(() => {\n  if (typeof runCareerAnalysis !== 'function') return;\n  const base = runCareerAnalysis;\n  runCareerAnalysis = async function(...args) {\n    const result = await base.apply(this, args);\n    try {\n      if (typeof state === 'object' && state?.analyses?.career) {\n        state.analyses.career.adaptiveHistoryV101 = true;\n        if (typeof save === 'function') save();\n      }\n    } catch {}\n    return result;\n  };\n})();`;

// The V11.2 weight module's scoring override is superseded by career-margin-v124.
// Only these two display helpers are still referenced by career-model-tabs-v112.
const ticketWeightDisplayCompat = `\nfunction weightConditionValueV111(row = {}) {\n  const direct = [row.weightCondition,row.kiloCondition,row.kgCondition,row.raceWeightCondition,row.kiloSarti,row.kilo_sarti]\n    .find(v => v !== null && v !== undefined && String(v).trim());\n  if (direct !== undefined) return String(direct).trim();\n  const text = [row.classRaw,row.raceClass,row.class,row.raceNoName,row.groupRaw,row.ageGroup].filter(Boolean).join(' | ');\n  const matches = [...text.matchAll(/(\\d{2}(?:[.,]\\d+)?)\\s*KG\\b/gi)];\n  return matches.length ? matches.map(m => m[1].replace(',', '.')).join('/') : null;\n}\nfunction breedValueV112(row = {}) {\n  const direct = [row.breed,row.irk,row.raceBreed,row.horseBreed].find(v => v !== null && v !== undefined && String(v).trim());\n  const raw = direct !== undefined ? String(direct) : [row.ageGroup,row.group,row.groupRaw,row.classRaw,row.raceClass,row.class].filter(Boolean).join(' ');\n  const n = typeof normalizeTextV11 === 'function' ? normalizeTextV11(raw) : String(raw).toUpperCase();\n  if (n.includes('ARAP')) return 'Arap';\n  if (n.includes('INGILIZ')) return 'İngiliz';\n  return null;\n}\n`;

function humanBytes(n) {
  const value = Number(n) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  fs.rmSync(PUBLIC, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC, { recursive: true });

  const runtimeSourceSet = new Set(runtimeFiles.filter(file => file !== '__ANNUAL_DOMPARSER_BRIDGE__'));
  runtimeSourceSet.add('adaptive-history-v101.js');
  runtimeSourceSet.add('ticket-models-v11-weight.js');
  const styleSourceSet = new Set(styleFiles);

  // Deploy only assets that remain independent browser requests. All application JS
  // and linked CSS sources stay in the repository for maintenance and are bundled below.
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (runtimeSourceSet.has(name) || styleSourceSet.has(name) || name === 'app.js') continue;
    if (/\.js$/i.test(name)) continue;
    if (!/\.(?:html|css|json|ico|png|jpg|jpeg|webp|svg|txt)$/i.test(name)) continue;
    if (name === 'package.json' || name === 'package-lock.json' || name === 'vercel.json') continue;
    fs.copyFileSync(path.join(ROOT, name), path.join(PUBLIC, name));
  }

  const activeModuleCount = runtimeFiles.filter(file => file !== '__ANNUAL_DOMPARSER_BRIDGE__').length;
  const runtimeChunks = [
    '/* AT AI SYSTEM — CONSOLIDATED RUNTIME V14.4 */',
    `/* Generated at ${new Date().toISOString()} from ${activeModuleCount} active modules. */`,
    'window.__AT_RUNTIME_BUNDLE_V144__ = true;'
  ];

  for (const file of runtimeFiles) {
    if (file === '__ANNUAL_DOMPARSER_BRIDGE__') {
      runtimeChunks.push('\n/* annual DOMParser compatibility bridge */\n' + parserBridge);
      continue;
    }
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) throw new Error(`Missing runtime source: ${file}`);
    runtimeChunks.push(`\n/* ===== ${file} ===== */\n` + fs.readFileSync(full, 'utf8'));
  }
  runtimeChunks.push('\n/* adaptive-history-v101 compatibility only; source module intentionally pruned */\n' + adaptiveV101Compat);
  runtimeChunks.push('\n/* ticket-models-v11-weight display compatibility only; scoring override intentionally pruned */\n' + ticketWeightDisplayCompat);

  const runtimeBundle = runtimeChunks.join('\n;\n') + '\n';
  const kernelPath = path.join(ROOT, 'app.js');
  if (!fs.existsSync(kernelPath)) throw new Error('Missing application kernel: app.js');
  const kernel = fs.readFileSync(kernelPath, 'utf8');
  const appBundle = [
    '/* AT AI SYSTEM — SINGLE APPLICATION BUNDLE V14.4 */',
    `/* app.js kernel + ${activeModuleCount} active runtime modules */`,
    '\n/* ===== app.js KERNEL ===== */\n' + kernel,
    '\n/* ===== CONSOLIDATED RUNTIME ===== */\n' + runtimeBundle
  ].join('\n;\n') + '\n';

  // First parse the exact source bundle. Then compact it without compression or name
  // mangling so classic-script globals and patch order remain semantic-equivalent.
  new Function(appBundle);
  const minified = await minify(appBundle, {
    ecma: 2020,
    module: false,
    compress: false,
    mangle: false,
    format: { comments: false, semicolons: true }
  });
  if (!minified.code) throw new Error('Terser produced an empty application bundle.');
  new Function(minified.code);
  fs.writeFileSync(APP_OUT, minified.code + '\n', 'utf8');

  const styleChunks = ['/* AT AI SYSTEM — CONSOLIDATED STYLES V14.1 */'];
  for (const file of styleFiles) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) throw new Error(`Missing style source: ${file}`);
    styleChunks.push(`\n/* ===== ${file} ===== */\n` + fs.readFileSync(full, 'utf8'));
  }
  const styles = styleChunks.join('\n') + '\n';
  fs.writeFileSync(STYLE_OUT, styles, 'utf8');

  const rawBytes = Buffer.byteLength(appBundle);
  const minBytes = Buffer.byteLength(minified.code);
  const savedPct = rawBytes ? ((rawBytes - minBytes) / rawBytes * 100).toFixed(1) : '0.0';
  console.log(`[AT AI] App V14.4 generated: public/${path.basename(APP_OUT)} (kernel + ${activeModuleCount} modules)`);
  console.log('[AT AI] Pruned runtime modules: adaptive-history-v101.js; ticket-models-v11-weight.js scoring layer.');
  console.log('[AT AI] Retained compatibility: V10.1 cache bit + weight/breed display helpers.');
  console.log(`[AT AI] JS compacted safely: ${humanBytes(rawBytes)} -> ${humanBytes(minBytes)} (-${savedPct}%)`);
  console.log(`[AT AI] Styles V14.1 generated: public/${path.basename(STYLE_OUT)} (${styleFiles.length} stylesheets, ${Buffer.byteLength(styles)} bytes)`);
  console.log('[AT AI] Public output pruned: source JS/CSS files are not deployed separately.');
}

main().catch(error => {
  console.error('[AT AI] Build failed:', error?.stack || error);
  process.exit(1);
});
