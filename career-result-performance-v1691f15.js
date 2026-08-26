/* AT AI Mobil - V16.9.1F15 RESULT PERFORMANCE ADJUSTMENT
   - Tam sart/kariyer eslesmesini korur.
   - Eslesen yol satirlarinda bitiris derecesi ve HP farkini performans katsayisi olarak uygular.
   - Eski F12/F14 cache sonuclari yeniden hesaplanmadan gecerli sayilmaz.
*/
(() => {
'use strict';
if (window.__AT_CAREER_RESULT_PERFORMANCE_V1691F15__) return;
window.__AT_CAREER_RESULT_PERFORMANCE_V1691F15__ = true;
const VERSION = 'CAREER-RESULT-PERFORMANCE-V16.9.1F15';
const BASE_RULE = 'EXACT_CLASS + EXACT_AGE_GROUP + CARRIED_WEIGHT + FINISH_RESULT + HP_DELTA';
const finite = v => {
  if (v === null || v === undefined || v === '') return null;
  const m = String(v).replace(',', '.').match(/-?\d+(?:[.,]\d+)?/);
  const n = Number((m ? m[0] : v).toString().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(v) || 0));
const finish = r => finite(r?.finish ?? r?.rank ?? r?.sira ?? r?.der);
const hp = r => finite(r?.hp ?? r?.hpu ?? r?.HP);

function finishFactor(a, b) {
  const af = finish(a), bf = finish(b);
  if (af === null || bf === null) return { factor:1, delta:null, label:'derece yok' };
  const delta = af - bf;
  if (delta <= -4) return { factor:1.12, delta, label:'cok daha iyi derece' };
  if (delta === -3) return { factor:1.09, delta, label:'daha iyi derece' };
  if (delta === -2) return { factor:1.06, delta, label:'daha iyi derece' };
  if (delta === -1) return { factor:1.03, delta, label:'bir sira iyi' };
  if (delta === 0) return { factor:1, delta, label:'ayni derece' };
  if (delta === 1) return { factor:.92, delta, label:'bir sira kotu' };
  if (delta === 2) return { factor:.82, delta, label:'iki sira kotu' };
  if (delta === 3) return { factor:.72, delta, label:'uc sira kotu' };
  if (delta === 4) return { factor:.62, delta, label:'dort sira kotu' };
  return { factor:.52, delta, label:'cok daha kotu derece' };
}
function hpFactor(a, b) {
  const ah = hp(a), bh = hp(b);
  if (ah === null || bh === null) return { factor:1, delta:null, label:'HP yok' };
  const delta = ah - bh;
  if (delta >= 15) return { factor:1.08, delta, label:'HP cok yuksek' };
  if (delta >= 8) return { factor:1.05, delta, label:'HP yuksek' };
  if (delta >= 4) return { factor:1.03, delta, label:'HP az yuksek' };
  if (delta > -4) return { factor:1, delta, label:'HP denk' };
  if (delta > -8) return { factor:.97, delta, label:'HP az dusuk' };
  if (delta > -15) return { factor:.94, delta, label:'HP dusuk' };
  return { factor:.90, delta, label:'HP cok dusuk' };
}
function resultAdjustment(a, b) {
  const f = finishFactor(a, b), h = hpFactor(a, b);
  return {
    factor: clamp(f.factor * h.factor, .45, 1.12),
    finishFactor:f.factor,
    hpFactor:h.factor,
    finishDelta:f.delta,
    hpDelta:h.delta,
    label:`${f.label}; ${h.label}`
  };
}
window.finishPerformanceFactorV1691F15 = finishFactor;
window.hpPerformanceFactorV1691F15 = hpFactor;
window.careerResultAdjustmentV1691F15 = resultAdjustment;

const rowBefore = typeof careerRowSimilarity === 'function' ? careerRowSimilarity : null;
if (rowBefore) {
  careerRowSimilarity = function(a, b) {
    const base = Number(rowBefore(a, b));
    if (!Number.isFinite(base) || base < 0) return base;
    const adj = resultAdjustment(a, b);
    return clamp(base * adj.factor);
  };
}

const cacheBefore = typeof isValidCareerCache === 'function' ? isValidCareerCache : null;
if (cacheBefore) {
  isValidCareerCache = function(cached) {
    if (!cacheBefore(cached)) return false;
    return (cached.races || []).every(race =>
      (race.horses || []).every(item =>
        item?.galibiyetBenzerligi?.resultPerformanceVersion === VERSION
      )
    );
  };
}
function hasF15Result(career) {
  return (career?.races || []).some(race =>
    (race?.horses || []).some(item =>
      item?.galibiyetBenzerligi?.resultPerformanceVersion === VERSION
    )
  );
}
if (state?.analyses?.career && !hasF15Result(state.analyses.career)) {
  state.analyses.career = {};
  try { save(); } catch {}
}
try { if (typeof careerModelCacheV112 !== 'undefined') careerModelCacheV112.clear(); } catch {}

if (typeof calculateGalibiyetBenzerligi === 'function') {
  const calcBefore = calculateGalibiyetBenzerligi;
  calculateGalibiyetBenzerligi = function(...args) {
    const out = calcBefore(...args) || {};
    out.resultPerformanceVersion = VERSION;
    out.rowMatchRule = BASE_RULE;
    out.performanceRule = 'Eslesen kariyer satirinda bugunku at daha kotu bitirdiyse skor dusurulur, daha iyi bitirdiyse sinirli artirilir; HP farki kucuk destek/ceza olarak eklenir.';
    if (Array.isArray(out.byYear)) {
      out.byYear = out.byYear.map(row => ({
        ...row,
        resultPerformanceVersion:VERSION,
        rowMatchRule:BASE_RULE
      }));
    }
    return out;
  };
}

const yearBefore = typeof yearSimilarityHtml === 'function' ? yearSimilarityHtml : null;
if (yearBefore) {
  yearSimilarityHtml = function(sim) {
    const html = yearBefore(sim);
    const ok = sim?.resultPerformanceVersion === VERSION;
    const badge = `<div style="margin:7px 0;padding:7px 9px;border-radius:8px;font-size:10px;line-height:1.4;background:${ok?'rgba(126,226,168,.08)':'rgba(255,173,102,.09)'};border:1px solid ${ok?'rgba(126,226,168,.22)':'rgba(255,173,102,.25)'}"><b>${ok?'✓ F15 bitiris derecesi + HP etkisi aktif':'⚠ Eski performanssiz kariyer puani'}</b>${ok?' · Guclu kosu cifti yuzdesi artik derece farkina gore azalir/artar.':' · Yeni matematik icin Yeniden Hesapla.'}</div>`;
    return badge + html;
  };
}

window.__AT_CAREER_RESULT_PERFORMANCE_VERSION__ = VERSION;
console.info('[AT AI]', VERSION, 'aktif - bitiris derecesi ve HP farki kariyer eslesme skoruna katsayi olarak girer.');
})();
