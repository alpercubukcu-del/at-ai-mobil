const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(PUBLIC, 'at-ai-runtime-v140.js');

const runtimeFiles = [
  'exact-history-v9.js',
  'adaptive-history-v10.js',
  'adaptive-history-v101.js',
  'adaptive-history-v102.js',
  'ticket-models-v11.js',
  'ticket-models-v11-weight.js',
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

const parserBridge = `(() => {\n  const nativeParse = DOMParser.prototype.parseFromString;\n  DOMParser.prototype.parseFromString = function(source, type) {\n    if (type === 'text/html' && typeof source === 'string' && /^\\s*<tbody\\b/i.test(source) && source.includes('YillikYarisProgramiCoklu')) {\n      source = \`<table>\${source}</table>\`;\n    }\n    return nativeParse.call(this, source, type);\n  };\n})();`;

fs.rmSync(PUBLIC, { recursive: true, force: true });
fs.mkdirSync(PUBLIC, { recursive: true });

// Copy all top-level browser assets so the deployed static surface stays identical.
for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const name = entry.name;
  if (!/\.(?:html|css|js|json|ico|png|jpg|jpeg|webp|svg|txt)$/i.test(name)) continue;
  if (name === 'package.json' || name === 'package-lock.json' || name === 'vercel.json') continue;
  fs.copyFileSync(path.join(ROOT, name), path.join(PUBLIC, name));
}

const chunks = [
  '/* AT AI SYSTEM — CONSOLIDATED RUNTIME V14.0 */',
  `/* Generated at ${new Date().toISOString()} from ${runtimeFiles.length - 1} active modules. */`,
  'window.__AT_RUNTIME_BUNDLE_V140__ = true;'
];

for (const file of runtimeFiles) {
  if (file === '__ANNUAL_DOMPARSER_BRIDGE__') {
    chunks.push('\n/* annual DOMParser compatibility bridge */\n' + parserBridge);
    continue;
  }
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) throw new Error(`Missing runtime source: ${file}`);
  chunks.push(`\n/* ===== ${file} ===== */\n` + fs.readFileSync(full, 'utf8'));
}

const bundle = chunks.join('\n;\n') + '\n';
new Function(bundle);
fs.writeFileSync(OUT, bundle, 'utf8');
console.log(`[AT AI] Runtime V14.0 generated: public/${path.basename(OUT)} (${runtimeFiles.length - 1} modules, ${Buffer.byteLength(bundle)} bytes)`);
