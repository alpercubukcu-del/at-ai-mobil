;(() => {
'use strict';
if (window.__AT_PROGRAM_WORKFLOW_GUIDE_V1691F661__) return;
window.__AT_PROGRAM_WORKFLOW_GUIDE_V1691F661__ = true;

const VERSION='PROGRAM-WORKFLOW-GUIDE-V16.9.1F60.61';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();

function ensureStyle(){
  if($('programGuideStyleV661'))return;
  const s=document.createElement('style');
  s.id='programGuideStyleV661';
  s.textContent=`
    #programGuideDialogV661{width:min(94vw,760px);max-height:90vh;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;padding:0}
    #programGuideDialogV661::backdrop{background:rgba(0,0,0,.68)}
    .pg661-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px 18px 12px;border-bottom:1px solid #21384b;position:sticky;top:0;background:#071522;z-index:2}
    .pg661-head h2{margin:4px 0 0}.pg661-eyebrow{font-size:11px;font-weight:900;letter-spacing:.11em;color:#72d5ff}.pg661-close{border:0;border-radius:11px;background:#15314a;color:white;font-size:22px;width:44px;height:44px}
    .pg661-body{padding:14px 16px 22px;overflow:auto;max-height:78vh}.pg661-card{border:1px solid #29465d;border-radius:14px;background:#0b1b29;padding:13px 14px;margin:10px 0}.pg661-card h3{margin:0 0 8px;font-size:15px}.pg661-card p{margin:5px 0;font-size:12px;line-height:1.55;color:#cad9e5}.pg661-card ol{margin:7px 0 0 19px;padding:0}.pg661-card li{margin:7px 0;font-size:12px;line-height:1.5;color:#e5f0f7}.pg661-rule{padding:9px 10px;border-radius:10px;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22);font-size:12px;line-height:1.5}.pg661-warn{padding:9px 10px;border-radius:10px;background:rgba(255,189,130,.08);border:1px solid rgba(255,189,130,.24);font-size:12px;line-height:1.5}
  `;
  document.head.appendChild(s);
}

function ensureDialog(){
  let d=$('programGuideDialogV661');
  if(d)return d;
  ensureStyle();
  d=document.createElement('dialog');
  d.id='programGuideDialogV661';
  d.innerHTML=`
    <div class="pg661-head"><div><div class="pg661-eyebrow">AT AI SYSTEM · ${VERSION}</div><h2>Kullanım Talimatı ve Analiz Sırası</h2></div><button class="pg661-close" id="programGuideCloseV661" type="button">✕</button></div>
    <div class="pg661-body">
      <div class="pg661-card"><h3>Günlük çalışma sırası</h3><ol>
        <li><b>Yıllık Yarış Arşivi:</b> geçmiş program ve yerli sonuç arşivini güncelle. Son sonuç tarihi ve eksik gün sayısını kontrol et.</li>
        <li><b>Güncel Analiz:</b> bugünkü program, AGF/Ganyan ve hedef tarihten önceki kariyer verisiyle hesabı yap. Sonucu Günlük Arşiv'e kaydet.</li>
        <li><b>Kariyer Yol Haritası:</b> seçili koşunun kariyer/hazırlık hesabını yap. Günlük Kariyer Arşivi ve hazır 5 Model kayıtlarını oluştur.</li>
        <li><b>Model Kalibrasyonu:</b> Yıllık Arşivdeki TAM eşleşmelerde gerçek kazananın Bileşik/Tam/İkiz/Aile/Kariyer modelinde kaçıncı sırada kaldığını ölç.</li>
        <li><b>Koşu Senaryosu:</b> ana sıralamayı değiştirmeyen destek/yorum katmanı olarak kontrol et.</li>
        <li><b>Kupon Oluştur:</b> en son aşamadır. Kariyer tabanı + hazır 5 Model kalibrasyonu + kesin kazanan sıra koruması birlikte değerlendirilir.</li>
      </ol></div>
      <div class="pg661-card"><h3>Kalibrasyon kuralı</h3><div class="pg661-rule"><b>Gerçek kazanan sırası:</b> geçmiş TAM eşleşmelerde gerçek 1.'nin her modeldeki kesin sırası saklanır. En az <b>3 geçmiş örnek</b> varsa, kazananların en az <b>%80'ini</b> kapsayan en küçük sıra genişliği (1 / 2 / 3 / 5) güvenlik sınırı kabul edilir.</div><p>Bugünkü kupon bu sınırdan daha darsa, model sıralamasındaki eksik at(lar) <b>mevcut seçimleri silmeden</b> kupona eklenir. Ek at bütçeyi aşırıyorsa kupon otomatik bozulmaz; at “önerilen güvenlik atı” olarak gösterilir. Bütçeyi artırarak veya manuel seçimle eklenebilir.</p></div>
      <div class="pg661-card"><h3>Arşiv önceliği</h3><p>Geçmiş yerli yarış sonuçlarında öncelik <b>telefonun Yıllık Sonuç Arşivi</b>dir. Kayıt yoksa mevcut TJK bağlantı yöntemi otomatik fallback olarak korunur. Yıllık program kataloğu eşleşme bulmak için yerelde kullanılır.</p><div class="pg661-warn"><b>Veri sızıntısı yok:</b> hedef yarışın sonucu, hedef yarış öncesi tahminde kullanılmaz. Geçmiş kalibrasyon yarışlarında da yalnız o yarış tarihinden önceki kariyer bilgisi model hesabına girer.</div></div>
      <div class="pg661-card"><h3>Günlük arşivler</h3><p><b>Güncel Analiz Günlük Arşivi</b> ve <b>Kariyer Günlük Arşivi</b> ayrı tutulur. Aynı gün/şehir/koşu için hesap sonucu tekrar kullanılabilir; bu sayede kupon aşamasında aynı veriyi yeniden TJK'dan istemek zorunda kalmayız.</p></div>
      <div class="pg661-card"><h3>Hız kuralı</h3><p>Analiz penceresi açıkken 30 saniyelik canlı piyasa yenilemesi bekletilir. Aynı race-meta isteği birleştirilir. Kariyer isteği zaman aşımında gerçekten iptal edilir. Bu katmanlar puan formüllerini ve mevcut kayıt yöntemlerini değiştirmez.</p></div>
    </div>`;
  document.body.appendChild(d);
  $('programGuideCloseV661').onclick=()=>d.close();
  return d;
}

function findByText(drawer,re){return[...drawer.querySelectorAll('button')].find(b=>re.test(clean(b.textContent)))||null}
function label(btn,text){if(btn&&clean(btn.textContent)!==text)btn.textContent=text}
function applyMenu(){
  const drawer=$('drawer');if(!drawer)return;
  let guide=$('programGuideBtnV661');
  if(!guide){
    guide=document.createElement('button');guide.id='programGuideBtnV661';guide.type='button';guide.textContent='1. Kullanım Talimatı';
    guide.onclick=()=>{try{if(typeof closeDrawer==='function')closeDrawer()}catch{}const d=ensureDialog();if(!d.open)d.showModal()};
  }
  const current=drawer.querySelector('[data-view="current"]');
  const career=drawer.querySelector('[data-view="career"]');
  const calibration=drawer.querySelector('[data-view="calibration"]');
  const scenario=drawer.querySelector('[data-view="scenario"]');
  const coupon=$('couponMenuBtn')||findByText(drawer,/Kupon Oluştur/i);
  const annual=$('annualArchiveBtn')||findByText(drawer,/Yıllık Yarış Arşivi/i);
  const oldExport=findByText(drawer,/Kariyer Excel/i);
  const historical=drawer.querySelector('[data-view="historical"]');
  if(historical)historical.style.display='none';
  if(oldExport){oldExport.style.display='none';oldExport.setAttribute('aria-hidden','true');}
  label(guide,'1. Kullanım Talimatı');
  label(current,'2. Güncel Analiz');
  label(career,'3. Kariyer Yol Haritası');
  label(calibration,'4. Model Kalibrasyonu');
  label(scenario,'5. Koşu Senaryosu');
  label(coupon,'6. Kupon Oluştur');
  label(annual,'7. Yıllık Yarış Arşivi');
  const note=drawer.querySelector('.drawer-note');
  const nodes=[guide,current,career,calibration,scenario,coupon,annual].filter(Boolean);
  for(const node of nodes){
    if(note)drawer.insertBefore(node,note);else drawer.appendChild(node);
    node.style.display='';node.removeAttribute('aria-hidden');
  }
  if(note)note.textContent='Önerilen sıra: Arşiv → Güncel Analiz → Kariyer → Kalibrasyon → Senaryo → Kupon. Geçmiş yerli sonuçlarda yerel arşiv önceliklidir; eksikte TJK fallback kullanılır.';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{applyMenu();ensureDialog()},{once:true});else{applyMenu();ensureDialog()}
setTimeout(applyMenu,300);setTimeout(applyMenu,1100);setTimeout(applyMenu,2400);
window.addEventListener('pageshow',applyMenu,{passive:true});
window.ATProgramWorkflowGuideV661={version:VERSION,open(){const d=ensureDialog();if(!d.open)d.showModal()},applyMenu};
console.info('[AT AI]',VERSION,'aktif — menüler önerilen analiz sırasına dizildi ve kullanım talimatı eklendi.');
})();
