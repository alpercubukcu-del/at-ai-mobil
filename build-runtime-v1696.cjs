const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1695.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.6] build-runtime-v1695.cjs bulunamadı.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) {
  throw new Error('[V16.9.6] Önceki build çıktısı bulunamadı.');
}

let app = fs.readFileSync(APP, 'utf8');

/* V11.13 her at için tam ve hızlı kariyer uç noktalarını aynı anda açıyordu.
   Tam cevap başarılıysa mevcut seçim mantığı zaten tam cevabı kullanır. V16.9.6,
   hızlı doğrulamayı yalnız tam istek başarısız olduğunda çalıştırır. */
const careerStart = 'const fetchCareerBeforeV1113=fetchCareer;';
const careerEnd = ';const cachedCareerBeforeV1113=';
const careerStartIndex = app.indexOf(careerStart);
const careerEndIndex = app.indexOf(careerEnd, careerStartIndex + careerStart.length);
if (careerStartIndex < 0 || careerEndIndex < 0) {
  throw new Error('[V16.9.6] V11.13 kariyer istek bloğu bulunamadı.');
}
const oldCareerBlock = app.slice(careerStartIndex, careerEndIndex);
for (const token of ['fullPromise', 'fastPromise', 'Promise.race']) {
  if (!oldCareerBlock.includes(token)) {
    throw new Error(`[V16.9.6] Beklenen paralel kariyer işareti bulunamadı: ${token}`);
  }
}

const sequentialCareerBlock = `const fetchCareerBeforeV1113=fetchCareer;fetchCareer=async function(horseId,before){if(!horseId)return emptyCareerErrorV1113("TJK At ID bulunamadı.","INPUT");const full=await Promise.resolve().then(()=>fetchCareerBeforeV1113(horseId,before)).then(repairCareerModeV1113).catch(e=>emptyCareerErrorV1113(e?.message||"Tam kariyer sorgusu başarısız."));if(full?.ok)return full;const fast=await fetchCareerFallbackV1113(horseId,before);if(fast?.ok)return fast;return emptyCareerErrorV1113(\`${'${full?.error||"Tam kariyer alınamadı."}'} | ${'${fast?.error||"Hızlı doğrulama alınamadı."}'}\`)};`;
app = app.slice(0, careerStartIndex) + sequentialCareerBlock + app.slice(careerEndIndex);

/* Kariyer analizi çalışırken aynı düğmeye tekrar dokunmak ikinci bir 16-at işi
   başlatmasın. Pencere kapatma ve diğer arayüz kontrolleri kullanılabilir kalır. */
const singleFlightPatch = `
;(()=>{"use strict";
if(window.__AT_CAREER_MOBILE_FREEZE_V1696__)return;
window.__AT_CAREER_MOBILE_FREEZE_V1696__=true;
const VERSION="CAREER-MOBILE-SINGLE-FLIGHT-V16.9.6";
const runAnalysisBeforeV1696=runAnalysis;
let careerRunPromiseV1696=null;
runAnalysis=async function(...args){
  const dialog=document.getElementById("analysisDialog");
  if(dialog?.dataset?.view!=="career")return runAnalysisBeforeV1696.apply(this,args);
  if(careerRunPromiseV1696){
    try{status("Kariyer analizi zaten çalışıyor; ikinci işlem başlatılmadı.")}catch{}
    return careerRunPromiseV1696;
  }
  const button=document.getElementById("runAnalysis");
  const oldText=button?.textContent||"Analizi Hesapla";
  if(button){button.disabled=true;button.setAttribute("aria-busy","true");button.textContent="Hesaplanıyor…"}
  const task=Promise.resolve().then(()=>runAnalysisBeforeV1696.apply(this,args));
  careerRunPromiseV1696=task;
  try{return await task}
  finally{
    if(careerRunPromiseV1696===task)careerRunPromiseV1696=null;
    if(button){button.disabled=false;button.removeAttribute("aria-busy");button.textContent=oldText}
  }
};
const runButtonV1696=document.getElementById("runAnalysis");
if(runButtonV1696)runButtonV1696.onclick=runAnalysis;
console.info("[AT AI]",VERSION,"aktif — tek kariyer işi + gerektiğinde fallback");
})();`;

app += singleFlightPatch;
for (const token of [
  'CAREER-MOBILE-SINGLE-FLIGHT-V16.9.6',
  'window.__AT_CAREER_MOBILE_FREEZE_V1696__',
  'const fetchCareerBeforeV1113=fetchCareer;'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.6] Runtime doğrulaması başarısız: ${token}`);
}
if (app.includes('const fastPromise=fetchCareerFallbackV1113')) {
  throw new Error('[V16.9.6] Paralel hızlı kariyer çağrısı final bundle içinde kaldı.');
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=16960');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=16960')) {
  throw new Error('[V16.9.6] cache-bust güncellenemedi.');
}

console.log('[AT AI] V16.9.6 build tamamlandı: Kariyer fallback yalnız hata halinde; Analizi Hesapla tek işlem korumalı.');
