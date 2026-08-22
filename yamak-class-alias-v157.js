/* AT AI Mobil — V15.7 Yamak class aliases
   Y0/Y-0, Y1/Y-1, Y2/Y-2, Y3/Y-3 are identical class decorators.
   Also tolerates a Y code attached to the previous decorator (e.g. H3Y2 / H3Y-2).
   This layer changes class identity parsing only; scoring/model formulas are untouched.
*/
(() => {
'use strict';
if (window.__AT_YAMAK_CLASS_ALIAS_V157__) return;
window.__AT_YAMAK_CLASS_ALIAS_V157__ = true;

const cleanV157 = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function normalizeYamakRawV157(value = '') {
  const normalized = cleanV157(value)
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';

  const parts = normalized.split('/').map(cleanV157).filter(Boolean);
  if (!parts.length) return '';
  const out = [parts.shift()];

  for (const part of parts) {
    const compact = cleanV157(part).replace(/\s+/g, '');
    let m = compact.match(/^Y-?([0-3])$/i);
    if (m) {
      out.push(`Y${Number(m[1])}`);
      continue;
    }
    m = compact.match(/^(.*)Y-?([0-3])$/i);
    if (m && m[1]) {
      out.push(m[1]);
      out.push(`Y${Number(m[2])}`);
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

const previousKeyV157 = typeof window.canonicalClassKeyV125 === 'function'
  ? window.canonicalClassKeyV125
  : null;
const previousDisplayV157 = typeof window.canonicalClassDisplayV125 === 'function'
  ? window.canonicalClassDisplayV125
  : null;

window.canonicalClassKeyV125 = function(value) {
  const fixed = normalizeYamakRawV157(value);
  if (previousKeyV157) return previousKeyV157(fixed);
  return fixed.toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
};

window.canonicalClassDisplayV125 = function(value) {
  const fixed = normalizeYamakRawV157(value);
  return previousDisplayV157 ? previousDisplayV157(fixed) : fixed;
};

/* Program metadata also leaves the browser in canonical Y form. */
try {
  if (typeof programRaceMeta === 'function') {
    const previousProgramRaceMetaV157 = programRaceMeta;
    programRaceMeta = function(...args) {
      const meta = previousProgramRaceMetaV157(...args);
      if (!meta || typeof meta !== 'object') return meta;
      return { ...meta, class:window.canonicalClassDisplayV125(meta.class || '') };
    };
  }
} catch {}

/* Existing similarity formula remains intact; only exact class identity gets the alias first. */
try {
  if (typeof classSimilarity === 'function') {
    const previousClassSimilarityV157 = classSimilarity;
    classSimilarity = function(a, b) {
      const ka = window.canonicalClassKeyV125(a);
      const kb = window.canonicalClassKeyV125(b);
      if (ka && kb && ka === kb) return 1;
      return previousClassSimilarityV157(a, b);
    };
  }
} catch {}

window.normalizeYamakClassV157 = normalizeYamakRawV157;
window.__AT_YAMAK_CLASS_ALIAS_VERSION__ = 'YAMAK-CLASS-ALIAS-V15.7';
})();
