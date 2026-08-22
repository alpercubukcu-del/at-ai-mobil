const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v156.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const RUNTIME = path.join(ROOT, 'yamak-class-alias-v157.js');
const FAST = path.join(ROOT, 'annual-roadmap-fast-v156.js');
const ADAPTIVE_V10 = path.join(ROOT, 'api', 'tjk-adaptive-roadmap-v10.js');
const ADAPTIVE_V102 = path.join(ROOT, 'api', 'tjk-adaptive-roadmap-v102.js');
const MODEL_V11 = path.join(ROOT, 'api', 'tjk-model-roadmap-v11.js');
const SIMILAR = path.join(ROOT, 'api', 'tjk-similar.js');

for (const file of [BASE, RUNTIME, FAST, ADAPTIVE_V10, ADAPTIVE_V102, MODEL_V11, SIMILAR]) {
  if (!fs.existsSync(file)) throw new Error(`[V15.7] Eksik dosya: ${path.basename(file)}`);
}

const helper = `function canonicalYamakClassV157(v = '') {
  const normalized = upper(v).replace(/\\s*\\/\\s*/g, '/').replace(/\\s*-\\s*/g, '-').replace(/\\s+/g, ' ').trim();
  if (!normalized) return '';
  const parts = normalized.split('/').map(x => x.trim()).filter(Boolean);
  if (!parts.length) return '';
  const out = [parts.shift()];
  for (const part of parts) {
    const compact = part.replace(/\\s+/g, '');
    let m = compact.match(/^Y-?([0-3])$/);
    if (m) { out.push('Y' + Number(m[1])); continue; }
    m = compact.match(/^(.*)Y-?([0-3])$/);
    if (m && m[1]) { out.push(m[1]); out.push('Y' + Number(m[2])); continue; }
    out.push(part);
  }
  return out.join('/');
}`;

function writePatched(file, patcher) {
  let source = fs.readFileSync(file, 'utf8');
  source = patcher(source);
  fs.writeFileSync(file, source, 'utf8');
}

function patchNormalizeCompact(file) {
  writePatched(file, source => {
    if (source.includes('function canonicalYamakClassV157')) return source;
    const old = `function normalizeClass(v = '') { return upper(v).replace(/\\s*\\/\\s*/g, '/').replace(/\\s*-\\s*/g, '-').replace(/\\s+/g, ' ').trim(); }`;
    if (!source.includes(old)) throw new Error(`[V15.7] normalizeClass bulunamadı: ${path.basename(file)}`);
    return source.replace(old, `${helper}\nfunction normalizeClass(v = '') { return canonicalYamakClassV157(v); }`);
  });
}

/* V15.6 yerel yıllık arşiv hızlı yolu + V10 fallback aynı Y kanoniğini kullanır. */
patchNormalizeCompact(FAST);
patchNormalizeCompact(ADAPTIVE_V10);

/* Eski exact-history/Yıllık Program yolu da bitişik/tireli Y biçimlerini aynı görür. */
writePatched(SIMILAR, source => {
  if (source.includes('function canonicalYamakClassV157')) return source;
  const old = `function normalizeClass(v = '') {
  return upper(v)
    .replace(/\\s*\\/\\s*/g, '/')
    .replace(/\\/{2,}/g, '/')
    .replace(/\\/+$/g, '')
    .replace(/\\s*-\\s*/g, '-')
    .replace(/\\s+/g, ' ')
    .trim();
}`;
  if (!source.includes(old)) throw new Error('[V15.7] tjk-similar normalizeClass bloğu bulunamadı.');
  return source.replace(old, `${helper}\n\nfunction normalizeClass(v = '') {\n  return canonicalYamakClassV157(v);\n}`);
});

/*
  V10.3 aday havuzu:
  TJK sorgu tablosu Y kodunu bazen Y2, bazen Y-2, bazen hiç göstermiyor.
  Bu yüzden Y yalnız SEARCH PREFILTER'da yok sayılır; sonuç sayfasındaki TAM sınıf
  doğrulamasında canonical Y kodu zorunlu kalır.
*/
writePatched(ADAPTIVE_V102, source => {
  if (!source.includes('function canonicalYamakClassV157')) {
    const oldKey = `function fullClassKey(v=''){return upper(v).replace(/\\s*\\/\\s*/g,'/').replace(/\\s+/g,' ').trim()}`;
    if (!source.includes(oldKey)) throw new Error('[V15.7] V10.3 fullClassKey bulunamadı.');
    source = source.replace(oldKey, `${helper}\nfunction fullClassKey(v=''){return canonicalYamakClassV157(v)}`);
  }
  const oldSuffix = `const suffix=parts.filter(Boolean).filter(x=>!QUERY_HIDDEN_TOKENS.has(x.replace(/\\s+/g,'')));`;
  const newSuffix = `const suffix=parts.filter(Boolean).filter(x=>!/^Y[0-3]$/.test(x.replace(/\\s+/g,''))).filter(x=>!QUERY_HIDDEN_TOKENS.has(x.replace(/\\s+/g,'')));`;
  if (source.includes(oldSuffix)) source = source.replace(oldSuffix, newSuffix);
  else if (!source.includes(newSuffix)) throw new Error('[V15.7] V10.3 queryCompatibleKey suffix bloğu bulunamadı.');
  source = source.replace(`const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.3.0-PARALLEL-FULL-CLASS';`, `const VERSION = 'TJK-ADAPTIVE-ROADMAP-V10.3.1-YAMAK-ALIAS';`);
  return source;
});

/* V11 5 Model nihai TJK sonuç sınıfı doğrulamasında Y2 = Y-2 kabul edilir. */
writePatched(MODEL_V11, source => {
  if (!source.includes('function canonicalYamakClassV157')) {
    const oldKey = `function fullClassKey(v=''){return upper(v).replace(/\\s*\\/\\s*/g,'/').replace(/\\s+/g,' ').trim()}`;
    if (!source.includes(oldKey)) throw new Error('[V15.7] V11 fullClassKey bulunamadı.');
    source = source.replace(oldKey, `${helper}\nfunction fullClassKey(v=''){return canonicalYamakClassV157(v)}`);
  }
  source = source.replace(`const VERSION = 'TJK-MODEL-ROADMAP-V11.12-FAST-FULL-CLASS';`, `const VERSION = 'TJK-MODEL-ROADMAP-V11.13-YAMAK-ALIAS';`);
  return source;
});

/* Önce mevcut V15.6 üretimini çalıştır; analiz formülleri aynen korunur. */
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[V15.7] Production bundle/index oluşmadı.');

/* Tarayıcı tarafındaki canonicalClassKeyV125/sameClass yolu için son katman. */
fs.appendFileSync(APP, '\n;/* ===== yamak-class-alias-v157.js ===== */\n' + fs.readFileSync(RUNTIME, 'utf8') + '\n', 'utf8');
fs.appendFileSync(APP, `\n;window.__AT_YAMAK_CLASS_FIX_V157__='YAMAK-CLASS-FIX-V15.7';\n`, 'utf8');
new Function(fs.readFileSync(APP, 'utf8'));

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=15700');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V15.7 build tamamlandı: Y0/Y-0, Y1/Y-1, Y2/Y-2, Y3/Y-3 ve bitişik Y kodları eşleştiriliyor; 5 Model formülleri değişmedi.');
