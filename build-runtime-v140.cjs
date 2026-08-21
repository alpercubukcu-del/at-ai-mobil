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

const adaptiveV101Compat = `(() => {\n  if (typeof runCareerAnalysis !== 'function') return;\n  const base = runCareerAnalysis;\n  runCareerAnalysis = async function(...args) {\n    const result = await base.apply(this, args);\n    try {\n      if (typeof state === 'object' && state?.analyses?.career) {\n        state.analyses.career.adaptiveHistoryV101 = true;\n        if (typeof save === 'function') save();\n      }\n    } catch {}\n    return result;\n  };\n})();`;

const ticketWeightDisplayCompat = `\nfunction weightConditionValueV111(row = {}) {\n  const direct = [row.weightCondition,row.kiloCondition,row.kgCondition,row.raceWeightCondition,row.kiloSarti,row.kilo_sarti]\n    .find(v => v !== null && v !== undefined && String(v).trim());\n  if (direct !== undefined) return String(direct).trim();\n  const text = [row.classRaw,row.raceClass,row.class,row.raceNoName,row.groupRaw,row.ageGroup].filter(Boolean).join(' | ');\n  const matches = [...text.matchAll(/(\\d{2}(?:[.,]\\d+)?)\\s*KG\\b/gi)];\n  return matches.length ? matches.map(m => m[1].replace(',', '.')).join('/') : null;\n}\nfunction breedValueV112(row = {}) {\n  const direct = [row.breed,row.irk,row.raceBreed,row.horseBreed].find(v => v !== null && v !== undefined && String(v).trim());\n  const raw = direct !== undefined ? String(direct) : [row.ageGroup,row.group,row.groupRaw,row.classRaw,row.raceClass,row.class].filter(Boolean).join(' ');\n  const n = typeof normalizeTextV11 === 'function' ? normalizeTextV11(raw) : String(raw).toUpperCase();\n  if (n.includes('ARAP')) return 'Arap';\n  if (n.includes('INGILIZ')) return 'İngiliz';\n  return null;\n}\n`;

/*
 * V12.5 originally re-fetched and normalized historical Top-3 careers in the browser.
 * /api/tjk-model-roadmap-v11 now already returns frozen fullPathBefore/historyBefore,
 * winsBefore and top5Before for every historical Top-3 horse. Keep only the pieces that
 * later V12.5.1/V12.6 patches still need: class aliases + legacy-shaped roadmap fallback.
 */
const historicalReferenceV125Compat = `(() => {\n'use strict';\nconst VERSION='HISTORICAL-REFERENCE-FULLPATH-V12.5-COMPACT';\nconst TYPES=['EXACT','CONDITION_TWIN','RACE_FAMILY'];\nconst PRIORITY={EXACT:3,CONDITION_TWIN:2,RACE_FAMILY:1};\nconst cache=new Map();\nconst clean=v=>String(v??'').replace(/\\u00a0/g,' ').replace(/\\s+/g,' ').trim();\nconst upper=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'');\nfunction decorator(value){const raw=clean(value),token=upper(raw).replace(/\\s+/g,'');if(token==='D'||token==='DISI')return{key:'DISI',display:'Dişi'};if(token==='E'||token==='ERKEK')return{key:'ERKEK',display:'Erkek'};let m=token.match(/^Y-?(\\d+)$/);if(m)return{key:'Y'+Number(m[1]),display:'Y'+Number(m[1])};m=token.match(/^H-?(\\d+)$/);if(m)return{key:'H'+Number(m[1]),display:'H'+Number(m[1])};return{key:token,display:raw};}\nfunction key(value){const parts=clean(value).split('/').map(clean).filter(Boolean);if(!parts.length)return'';const head=upper(parts.shift()).replace(/\\s+/g,' ').trim();const suffix=parts.map(x=>decorator(x).key).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).sort();return[head,...suffix].join('/');}\nfunction display(value){const parts=clean(value).split('/').map(clean).filter(Boolean);if(!parts.length)return clean(value);const head=parts.shift(),suffix=parts.map(x=>decorator(x).display).filter(Boolean);return[head,...suffix].join('/');}\nwindow.canonicalClassKeyV125=key;window.canonicalClassDisplayV125=display;\nif(typeof programRaceMeta==='function'){const before=programRaceMeta;programRaceMeta=function(...args){const meta=before(...args);return meta&&typeof meta==='object'?{...meta,class:display(meta.class||'')}:meta;};}\nif(typeof classSimilarity==='function'){const before=classSimilarity;classSimilarity=function(a,b){const ka=key(a),kb=key(b);return ka&&kb&&ka===kb?1:before(a,b);};}\nfunction bestPerYear(data){const byYear=new Map();for(const type of TYPES){for(const raw of data?.models?.[type]||[]){if(!raw||raw.ok===false)continue;const race={...raw,referenceType:raw.referenceType||type},year=Number(race.sourceYear||String(race.date||'').slice(0,4));if(!year)continue;const prev=byYear.get(year),score=Number(race.transferabilityScore??race.raceConditionSimilarity??100)||0,prevScore=Number(prev?.transferabilityScore??prev?.raceConditionSimilarity??-1),p=PRIORITY[race.referenceType]||0,pp=PRIORITY[prev?.referenceType]||0,day=Number(race.calendarDayDifference??999),pday=Number(prev?.calendarDayDifference??999);if(!prev||score>prevScore||(score===prevScore&&p>pp)||(score===prevScore&&p===pp&&day<pday))byYear.set(year,race);}}return[...byYear.values()].sort((a,b)=>Number(b.sourceYear||0)-Number(a.sourceYear||0));}\nfunction shape(data){const historicalRaces=bestPerYear(data);return{...data,version:(data?.version||'TJK-MODEL-ROADMAP')+'+FULLPATH-V12.5-COMPACT',historicalRaces,byYear:historicalRaces.map(r=>({year:r.sourceYear,ok:r.ok!==false,date:r.date,city:r.city,raceNo:r.raceNo,referenceType:r.referenceType,transferabilityScore:r.transferabilityScore??r.raceConditionSimilarity??100,top3:r.top3,error:r.error||null})),yearResults:historicalRaces.map(r=>({year:r.sourceYear,anchorDate:r.anchorDate||null,windowDays:45,matchCount:1,best:r,matches:[r]})),fullReferencePathV125:true,fullReferencePathVersion:VERSION,rules:{...(data?.rules||{}),classAliases:'E=Erkek; D=Dişi; Y-1=Y1; H-2=H2',historicalCareer:'server-frozen full pre-race history',historicalPathComparison:'FULL_PRE_RACE_HISTORY'}};}\nconst fallback=typeof fetchHistoricalRoadmap==='function'?fetchHistoricalRoadmap:null;\nfetchHistoricalRoadmap=async function(meta){if(!meta?.ok)return{ok:false,error:meta?.error||'Koşu koşulları eksik.'};const fixed={...meta,class:display(meta.class||'')},city=typeof getCityName==='function'?getCityName():clean(state?.city),cacheKey=[state?.date,city,fixed.class,fixed.ageGroup,fixed.track,fixed.distance].join('|');if(cache.has(cacheKey))return cache.get(cacheKey);const promise=(async()=>{try{const url='/api/tjk-model-roadmap-v11?date='+encodeURIComponent(state.date)+'&city='+encodeURIComponent(city)+'&class='+encodeURIComponent(fixed.class||'')+'&ageGroup='+encodeURIComponent(fixed.ageGroup||'')+'&track='+encodeURIComponent(fixed.track||'')+'&distance='+encodeURIComponent(fixed.distance||'')+'&minYear=2000&t='+Date.now();const res=await fetch(url,{cache:'no-store'}),data=await res.json();if(!res.ok||!data?.ok)throw new Error(data?.error||('V11 roadmap API '+res.status));return shape(data);}catch(e){if(fallback)return fallback(fixed);return{ok:false,error:e?.message||'V11 model yol haritası alınamadı.'};}})();cache.set(cacheKey,promise);try{return await promise;}catch(e){cache.delete(cacheKey);throw e;}};\ntry{if(typeof state==='object'&&state&&state.fullReferencePathVersion!==VERSION){state.fullReferencePathVersion=VERSION;if(state.analyses&&typeof state.analyses==='object'){state.analyses.career={};state.analyses.historical={};}if(typeof save==='function')save();}}catch{}\nconsole.info('[AT AI]',VERSION,'aktif — V12.5 sınıf aliası + sunucu tam-yol fallback');\n})();`;

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
  runtimeSourceSet.add('historical-reference-fullpath-v125.js');
  const styleSourceSet = new Set(styleFiles);

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
    '/* AT AI SYSTEM — CONSOLIDATED RUNTIME V14.5 */',
    `/* Generated at ${new Date().toISOString()} from ${activeModuleCount} active modules. */`,
    'window.__AT_RUNTIME_BUNDLE_V145__ = true;'
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
  runtimeChunks.push('\n/* adaptive-history-v101 compatibility only */\n' + adaptiveV101Compat);
  runtimeChunks.push('\n/* ticket-models-v11-weight display compatibility only */\n' + ticketWeightDisplayCompat);
  runtimeChunks.push('\n/* historical-reference-fullpath-v125 compact compatibility */\n' + historicalReferenceV125Compat);

  const runtimeBundle = runtimeChunks.join('\n;\n') + '\n';
  const kernelPath = path.join(ROOT, 'app.js');
  if (!fs.existsSync(kernelPath)) throw new Error('Missing application kernel: app.js');
  const kernel = fs.readFileSync(kernelPath, 'utf8');
  const appBundle = [
    '/* AT AI SYSTEM — SINGLE APPLICATION BUNDLE V14.5 */',
    `/* app.js kernel + ${activeModuleCount} active runtime modules */`,
    '\n/* ===== app.js KERNEL ===== */\n' + kernel,
    '\n/* ===== CONSOLIDATED RUNTIME ===== */\n' + runtimeBundle
  ].join('\n;\n') + '\n';

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
  console.log(`[AT AI] App V14.5 generated: public/${path.basename(APP_OUT)} (kernel + ${activeModuleCount} modules)`);
  console.log('[AT AI] Pruned full runtime modules: adaptive-history-v101.js; historical-reference-fullpath-v125.js.');
  console.log('[AT AI] Pruned scoring layer: ticket-models-v11-weight.js; display helpers retained.');
  console.log('[AT AI] V12.5 compact layer keeps class aliases and server-backed full-path fallback without duplicate browser career normalization.');
  console.log(`[AT AI] JS compacted safely: ${humanBytes(rawBytes)} -> ${humanBytes(minBytes)} (-${savedPct}%)`);
  console.log(`[AT AI] Styles V14.1 generated: public/${path.basename(STYLE_OUT)} (${styleFiles.length} stylesheets, ${Buffer.byteLength(styles)} bytes)`);
  console.log('[AT AI] Public output pruned: source JS/CSS files are not deployed separately.');
}

main().catch(error => {
  console.error('[AT AI] Build failed:', error?.stack || error);
  process.exit(1);
});
