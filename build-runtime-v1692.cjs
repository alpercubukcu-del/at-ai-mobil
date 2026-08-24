const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[V16.9.2] build-runtime-v1691.cjs bulunamadı.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.2] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
function rep(label,re,to){const before=app;app=app.replace(re,to);if(app===before)throw new Error(`[V16.9.2] ${label} kalıbı bulunamadı.`);}

// 1) Kupon veri ekranını GÜNLÜK ARŞİV hydrate tamamlanmadan açma.
// Böylece ilk render'da yanlış "eksik" görünümü oluşup eski tamamlayıcı zincire girmez.
rep('openScreen archive-before-open',
/async function openScreen\(\)\{\n  const s=screen\(\);s\.classList\.add\('open'\);s\.setAttribute\('aria-hidden','false'\);document\.documentElement\.style\.overflow='hidden';document\.body\.style\.overflow='hidden';\n  const b=\$\('cdgBodyV1671'\);if\(b\)b\.innerHTML='<div class="cdg-card"><h3>📚 Günlük Arşiv kontrol ediliyor<\/h3><p>Kariyer Yol Haritası ve 5 Model için daha önce hesaplanan kayıtlar yükleniyor\. Arşivde olan ayaklar yeniden hesaplanmayacak\.<\/p><\/div>';\n  try\{\n    await window\.ATCouponDailyArchiveV1691\?\.hydrateCurrent\?\.\(\);\n    await window\.ATFiveModelSharedCacheV1685\?\.hydrateCurrent\?\.\(\);\n  \}catch\(e\)\{console\.warn\('\[AT AI\] Kupon Günlük Arşiv ön yükleme uyarısı:',e\);\}\n  renderAudit\(\);\n\}/,
`async function openScreen(){
  const s=screen();
  const b=$('cdgBodyV1671');if(b)b.innerHTML='<div class="cdg-card"><h3>📚 Günlük Arşiv okunuyor</h3><p>Kupon için yalnız daha önce hesaplanmış Kariyer Yol Haritası ve 5 Model kayıtları kullanılacak.</p></div>';
  try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();await window.ATFiveModelSharedCacheV1685?.hydrateCurrent?.();}catch(e){console.warn('[AT AI] Kupon arşiv okuma uyarısı:',e);}
  s.classList.add('open');s.setAttribute('aria-hidden','false');document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  renderAudit();
}`);

// 2) Tekil Kariyer "Tamamla": hesaplama YOK, yalnız arşivi tekrar tara.
rep('career action archive-only',
/else if\(action==='career'\)\{\n      progress\('Kariyer Yol Haritası','Önce Günlük Arşiv kontrol ediliyor…',10,'Günlük Arşiv'\);\n      try\{await window\.ATCouponDailyArchiveV1691\?\.hydrateCurrent\?\.\(\);\}catch\{\}\n      if\(audit\(\)\.issues\.some\(x=>x\.id==='career'\)\)\{\n        progress\('Kariyer Yol Haritası','Arşivde bulunmayan ayaklar hesaplanıyor…',25,'Menü 3'\);\n        await runMenuView\('career','Kariyer Yol Haritası'\);\n      \}\n    \}/,
`else if(action==='career'){
      progress('Kariyer Yol Haritası','Günlük Arşiv tekrar kontrol ediliyor…',30,'Arşiv');
      try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();}catch{}
      const missing=audit().issues.find(x=>x.id==='career');
      if(missing)throw new Error('Kariyer Yol Haritası için gerekli ayaklar Günlük Arşivde yok: '+missing.detail+'. Kupon ekranı otomatik yeniden hesaplama yapmaz.');
    }`);

// 3) Tekil 5 Model "Tamamla": hesaplama YOK, yalnız arşiv/session hydrate.
rep('models action archive-only',
/else if\(action==='models'\)\{\n      progress\('5 Model Verisi','Önce Günlük Arşiv kontrol ediliyor…',10,'Günlük Arşiv'\);\n      try\{await window\.ATCouponDailyArchiveV1691\?\.hydrateCurrent\?\.\(\);await window\.ATFiveModelSharedCacheV1685\?\.hydrateCurrent\?\.\(\);\}catch\{\}\n      const aa=audit\(\),missing=aa\.raceNos\.filter\(no=>!modelReady\(no\)\);if\(missing\.length\)await completeModels\(missing\);\n    \}/,
`else if(action==='models'){
      progress('5 Model Verisi','Günlük Arşiv tekrar kontrol ediliyor…',30,'Arşiv');
      try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();await window.ATFiveModelSharedCacheV1685?.hydrateCurrent?.();}catch{}
      const missing=audit().issues.find(x=>x.id==='models');
      if(missing)throw new Error('5 Model için gerekli ayaklar Günlük Arşivde yok: '+missing.detail+'. Kupon ekranı otomatik yeniden hesaplama yapmaz.');
    }`);

// 4) "Tüm Eksikleri" zincirindeki kariyer/model hesap çağrılarını da arşiv-only yap.
rep('auto career archive-only',
/else if\(action==='career'\)await runMenuView\('career','Kariyer Yol Haritası'\);/,
`else if(action==='career'){try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();}catch{}}`);
rep('auto models archive-only',
/else if\(action==='models'\)await completeModels\(a\.raceNos\);/,
`else if(action==='models'){try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();await window.ATFiveModelSharedCacheV1685?.hydrateCurrent?.();}catch{}}`);

// 5) V16.7.4 tek-tek recovery katmanı da Kupon içinden Kariyer sayfasını açmasın / 5 Model hesaplamasın.
rep('recovery career-model archive-only',
/if\(kind==='career'\)await completeCareerRace\(no\);\n      else if\(kind==='models'\)await A\.completeModels\(\[no\]\);\n      else if\(kind==='winner'\)await A\.completeWinner\(\[no\]\);/,
`if(kind==='career'||kind==='models'){
        try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();if(kind==='models')await window.ATFiveModelSharedCacheV1685?.hydrateCurrent?.();}catch{}
        const still=(api()?.audit?.()?.issues||[]).some(x=>x?.id===kind);
        if(still)throw new Error('Günlük Arşivde hazır kayıt bulunamadı; otomatik hesaplama kapalı.');
      } else if(kind==='winner')await A.completeWinner([no]);`);

// 6) Kupon açıkken Kariyer ekranının 5 Model otomatik arşiv kuyruğuna yeni iş eklemesini engelle.
rep('autoarchive coupon guard',
/function enqueue\(raceNo\) \{\n  if \(raceNo === null/,
`function enqueue(raceNo) {
  if (document.getElementById('couponCenterDialog')?.open) return;
  if (raceNo === null`);

// 7) Son emniyet: Kupon native dialogu açıkken analysisDialog otomatik showModal/open olursa hemen kapat.
app+=`\n/* V16.9.2 Kupon -> analiz dialogu kaçış koruması */\n(()=>{\n if(window.__AT_COUPON_DIALOG_GUARD_V1692__)return;window.__AT_COUPON_DIALOG_GUARD_V1692__=true;\n const closeAnalysis=()=>{const c=document.getElementById('couponCenterDialog'),a=document.getElementById('analysisDialog');if(!c?.open||!a?.open)return;try{a.close();}catch{a.removeAttribute('open');}console.warn('[AT AI] V16.9.2 kupon açıkken otomatik analiz dialogu engellendi.');};\n const a=document.getElementById('analysisDialog');if(a){new MutationObserver(closeAnalysis).observe(a,{attributes:true,attributeFilter:['open']});}\n document.addEventListener('click',e=>{if(e.target?.closest?.('#couponMenuBtn,#buildAllBtn'))setTimeout(closeAnalysis,0);},true);\n})();\n;window.__AT_COUPON_ARCHIVE_ONLY_V1692__='ARCHIVE-ONLY-NO-CAREER-NAV-V16.9.2';\n`;

new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16920');
fs.writeFileSync(INDEX,html,'utf8');

for(const token of ['ARCHIVE-ONLY-NO-CAREER-NAV-V16.9.2','Kupon ekranı otomatik yeniden hesaplama yapmaz','kupon açıkken otomatik analiz dialogu engellendi'])if(!app.includes(token))throw new Error(`[V16.9.2] Doğrulama başarısız: ${token}`);
if(app.includes("await runMenuView('career','Kariyer Yol Haritası');"))throw new Error('[V16.9.2] Kupon içinde Kariyer menüsüne otomatik geçiş kalmış.');
if(!html.includes('/at-ai-app-v142.js?v=16920'))throw new Error('[V16.9.2] cache-bust güncellenemedi.');
console.log('[AT AI] V16.9.2 build tamamlandı: Kupon archive-only; Kariyer/5 Model otomatik hesaplama ve analiz sayfasına kaçış kapalı.');
