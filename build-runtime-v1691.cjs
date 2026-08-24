const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1690.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const ARCHIVE=path.join(ROOT,'coupon-daily-archive-source-v1691.js');
for(const f of [BASE,ARCHIVE])if(!fs.existsSync(f))throw new Error(`[V16.9.1] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX))throw new Error('[V16.9.1] Önceki build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
const archiveSource=fs.readFileSync(ARCHIVE,'utf8');

function replaceOnce(label,re,to){
  const before=app;app=app.replace(re,to);if(app===before)throw new Error(`[V16.9.1] ${label} patch kalıbı bulunamadı.`);
}

// Kupon ekranı açılır açılmaz önce Günlük Arşiv'i hydrate et. Böylece veri denetimi
// state'te yalnız son açılan koşuya bakıp diğer ayakları yanlışlıkla eksik saymaz.
replaceOnce('openScreen arşiv ön yükleme',
/function openScreen\(\)\{const s=screen\(\);s\.classList\.add\('open'\);s\.setAttribute\('aria-hidden','false'\);document\.documentElement\.style\.overflow='hidden';document\.body\.style\.overflow='hidden';renderAudit\(\);\}/,
`async function openScreen(){
  const s=screen();s.classList.add('open');s.setAttribute('aria-hidden','false');document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  const b=$('cdgBodyV1671');if(b)b.innerHTML='<div class="cdg-card"><h3>📚 Günlük Arşiv kontrol ediliyor</h3><p>Kariyer Yol Haritası ve 5 Model için daha önce hesaplanan kayıtlar yükleniyor. Arşivde olan ayaklar yeniden hesaplanmayacak.</p></div>';
  try{
    await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();
    await window.ATFiveModelSharedCacheV1685?.hydrateCurrent?.();
  }catch(e){console.warn('[AT AI] Kupon Günlük Arşiv ön yükleme uyarısı:',e);}
  renderAudit();
}`);

// Tekil "Tamamla" basıldığında da önce arşive bak; yalnız hâlâ eksikse hesapla.
replaceOnce('career tamamla arşiv önceliği',
/else if\(action==='career'\)\{progress\('Kariyer Yol Haritası','Tüm kupon ayaklarının yarış öncesi kariyerleri hazırlanıyor…',15,'Menü 4'\);await runMenuView\('career','Kariyer Yol Haritası'\);\}/,
`else if(action==='career'){
      progress('Kariyer Yol Haritası','Önce Günlük Arşiv kontrol ediliyor…',10,'Günlük Arşiv');
      try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();}catch{}
      if(audit().issues.some(x=>x.id==='career')){
        progress('Kariyer Yol Haritası','Arşivde bulunmayan ayaklar hesaplanıyor…',25,'Menü 3');
        await runMenuView('career','Kariyer Yol Haritası');
      }
    }`);
replaceOnce('models tamamla arşiv önceliği',
/else if\(action==='models'\)await completeModels\(\);/,
`else if(action==='models'){
      progress('5 Model Verisi','Önce Günlük Arşiv kontrol ediliyor…',10,'Günlük Arşiv');
      try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();await window.ATFiveModelSharedCacheV1685?.hydrateCurrent?.();}catch{}
      const aa=audit(),missing=aa.raceNos.filter(no=>!modelReady(no));if(missing.length)await completeModels(missing);
    }`);

// "Tüm Eksikleri Otomatik Tamamla" da ilk iş olarak arşivi tarar.
replaceOnce('otomatik tamamla arşiv önceliği',
/async function runAllMissing\(\)\{\n?\s*if\(busy\)return;busy=true;try\{\n?\s*let a=audit\(\);const order=/,
`async function runAllMissing(){
  if(busy)return;busy=true;try{
    progress('Günlük Arşiv','Kariyer Yol Haritası ve 5 Model arşiv kayıtları yükleniyor…',5,'Arşiv');
    try{await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();await window.ATFiveModelSharedCacheV1685?.hydrateCurrent?.();}catch{}
    let a=audit();const order=`);

// Eski progress metnini de kaynak davranışını açık anlatacak şekilde düzelt.
app=app.replace("progress('5 Model hazırlanıyor',`${no}. Koşu · Bileşik/Tam/İkiz/Aile/Kariyer…`,Math.round(i/list.length*100),`${i+1}/${list.length}`);","progress('5 Model Verisi',`${no}. Koşu · arşivde yok, Bileşik/Tam/İkiz/Aile/Kariyer hesaplanıyor…`,Math.round(i/list.length*100),`${i+1}/${list.length}`);");

if(!app.includes('COUPON-DAILY-ARCHIVE-SOURCE-V16.9.1'))app+=`\n${archiveSource}\n`;
app+=`\n;window.__AT_COUPON_ARCHIVE_FIRST_V1691__='ARCHIVE-FIRST-V16.9.1';\n`;
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16910');
fs.writeFileSync(INDEX,html,'utf8');

for(const token of ['COUPON-DAILY-ARCHIVE-SOURCE-V16.9.1','ARCHIVE-FIRST-V16.9.1','Günlük Arşiv kontrol ediliyor','Arşivde bulunmayan ayaklar hesaplanıyor']){
  if(!app.includes(token))throw new Error(`[V16.9.1] Doğrulama başarısız: ${token}`);
}
if(!html.includes('/at-ai-app-v142.js?v=16910'))throw new Error('[V16.9.1] cache-bust güncellenemedi.');
console.log('[AT AI] V16.9.1 build tamamlandı: Kupon Veri Denetimi Kariyer + 5 Model için Günlük Arşiv öncelikli çalışır; yalnız gerçek eksikler hesaplanır.');
