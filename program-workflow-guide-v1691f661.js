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
    #programGuideDialogV661{width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;inset:0;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;padding:0}
    #programGuideDialogV661::backdrop{background:rgba(0,0,0,.68)}
    .pg661-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px 18px 12px;border-bottom:1px solid #21384b;position:sticky;top:0;background:#071522;z-index:2}
    .pg661-head h2{margin:4px 0 0}.pg661-eyebrow{font-size:11px;font-weight:900;letter-spacing:.11em;color:#72d5ff}.pg661-close{border:0;border-radius:11px;background:#15314a;color:white;font-size:22px;width:44px;height:44px}
    .pg661-body{padding:14px 16px 22px;overflow:auto;max-height:none}.pg661-card{border:1px solid #29465d;border-radius:14px;background:#0b1b29;padding:13px 14px;margin:10px 0}.pg661-card h3{margin:0 0 8px;font-size:15px}.pg661-card p{margin:5px 0;font-size:12px;line-height:1.55;color:#cad9e5}.pg661-card ol{margin:7px 0 0 19px;padding:0}.pg661-card li{margin:7px 0;font-size:12px;line-height:1.5;color:#e5f0f7}.pg661-rule{padding:9px 10px;border-radius:10px;background:rgba(126,226,168,.08);border:1px solid rgba(126,226,168,.22);font-size:12px;line-height:1.5}.pg661-warn{padding:9px 10px;border-radius:10px;background:rgba(255,189,130,.08);border:1px solid rgba(255,189,130,.24);font-size:12px;line-height:1.5}
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
      <div class="pg661-card"><h3>1 · İlk kurulum ve program seçimi</h3><ol><li>Ana ekranda yarış tarihini seçin. Takvimde yıl, ay ve günü doğrudan seçip Uygula’ya basın.</li><li>Şehri seçin ve programı yükleyin. Analiz menülerinde aynı program kullanılır.</li><li>7. Gerçek Yarış Arşivi’nde Arşiv Klasörünü Seç’e basıp mevcut AT AI MOBIL klasörünü seçin. APK ilk kullanımda kendi klasör iznini ister.</li></ol><p>Aynı klasör sonraki açılışlarda hatırlanır. Uygulamayı güncellemek için silmeniz gerekmez.</p></div>
      <div class="pg661-card"><h3>2 · Günlük verileri arşivleyin · Menü 7</h3><ol><li>At Arşivi’nde program tarihini ve şehri seçin, Günlük Programı Bul’u kullanın ve at kayıtlarını güncelleyin.</li><li>Orijin’de Aygır, Kısrak ve Kısrak Babası kayıtlarını ayrı güncelleyin.</li><li>Galop’ta seçili programın galoplarını indirin.</li><li>Pist / Bakım / Hava’da başlangıç ve bitiş tarihini seçip Seçili Tarih Aralığını İndir’e basın. Sonraki günlerde Kaldığı Yerden Bugüne Güncelle’yi kullanın.</li></ol><p>Aynı günün mevcut kayıtları yeniden indirilmez. Hata varsa ilgili bölümde yalnız hatalıları tekrar deneyin. İndirme sırasında uygulamayı açık tutun.</p></div>
      <div class="pg661-card"><h3>3 · Geçmiş yarış referansları · Menü 6</h3><ol><li>Başlangıç ve bitiş tarihlerini seçin. Bu arşiv, atların bireysel kariyerinden ayrıdır.</li><li>Koşu Sorgulama Arşivini İndir’e basın. Kayıtlar ortak klasöre otomatik yazılır.</li><li>İşlemi Duraklat ile durdurabilir, Kaldığı Yerden Devam Et ile sürdürebilirsiniz. Yalnız Hatalı Günleri Tekrarla eksik günleri yeniden işler.</li><li>Alttaki Günün koşuları listesinden koşuyu seçin. Aynı grup, koşu cinsi, mesafe ve pistteki geçmiş kazananları 15 TJK sütunuyla karşılaştırın. Seçili şehir veya Tüm şehirler kapsamını kullanın; başlıklara dokunarak sıralayın. Listedeki Kazananların Kariyerlerini Arşivle ile tüm listedeki atların tam geçmişlerini toplu indirin; sadece görünen sayfayla sınırlı değildir.</li></ol><p>Koşu sorgulaması kazanan derecesi ve koşul bilgilerini getirir; bütün atların tam bitiriş listesini içermez. Derece modeli şehir, pist, mesafe ve sınıf uyumlu geçmiş referansları kullanır.</p></div>
      <div class="pg661-card"><h3>4 · Güncel Analiz ve Yarış DNA</h3><ol><li>2. Güncel Analiz’i açın; seçili koşuyu veya tüm koşuları hesaplayın.</li><li>F/O/G/D toplam puan menüsünde Yarış DNA Analizini Çalıştır’a basın. F: form, O: orijin, G: galop, D: derece; J/S/A: jokey, sahip ve antrenör; E: ekip; T: toplamdır.</li><li>Veri kapsamını, eksik sütunları ve derece aralığını kontrol edin. Derece lideri sınırlı kanıtla yalnız inceleme adayı olabilir; tek kayıt otomatik ana grup seçimi değildir.</li><li>Kayıtlı Analizi Aç veya Günlük Arşiv ile önceki hesabı tekrar görüntüleyin. Yeni veri geldiğinde yeniden hesaplayın.</li></ol></div>
      <div class="pg661-card"><h3>5 · Kariyer Yol Haritası · Menü 3</h3><p>Bu ekranda koşuyu ve Seçili şehir / Tüm şehirler kapsamını seçip Analizi Hesapla’ya basın. Önceden Menü 6’da aynı koşuyu seçmeniz gerekmez. Kazananları Arşivle ile karşılaştırmadan önce toplu indirme yapabilirsiniz; yalnız eksik kayıtlar alınır. Duraklat ve Yalnız Hatalıları Tekrarla ile işlemi sürdürebilirsiniz. İlk 5 bitirişli kariyer yarışları kronolojik olarak incelenir; en az iki ortak sınav gerekir. Kilo, handikap puanı ve ardışık değişimleri yan yana gösterilir. Tarihsel kazananın tam kariyeri önce kalıcı At Arşivi’nden okunur; eksikse TJK’den doğrulanarak aynı Atlar klasörüne kaydedilir. Kazandığı yarış ve sonraki sonuçlar yol karşılaştırmasına alınmaz. Yüzde, kazanma olasılığı değil yolculuk benzerliğidir.</p><p>Kayıt alınamazsa hatalı kazananlar bir kez listelenir. İki ortak yarış bulunamaması ile indirme hatası ayrı gösterilir. Kariyer benzerliği seçim puanına otomatik eklenmez.</p></div>
      <div class="pg661-card"><h3>6 · FOGD Kalibrasyon Merkezi · Menü 4</h3><ol><li>Şehir ve geçmiş tarih aralığını seçin.</li><li>Seçili Aralığı Hesapla + Kalibre Et ile geçmiş tahminleri gerçek sonuçlarla karşılaştırın.</li><li>İlerlemenin ve geçerli örnek sayısının arttığını kontrol edin. Gerekirse Kaldığı Yerden Devam Et veya Yalnız Hatalıları Tekrarla’yı kullanın.</li></ol><p>Derece sapmaları yeterli doğrulanmış örnekle kalibre edilir. F/O/G/D ağırlıkları otomatik öğrenilmez. Ayrı Günün Koşu Kalibrasyonu menüsü kaldırılmıştır.</p></div>
      <div class="pg661-card"><h3>7 · Kupon Oluştur · Menü 5</h3><p>Önce Yarış DNA hesaplarını tamamlayın. Kupon menüsünde F/O/G/D/J/S/A/E/T sütunlarının tüm koşu şablonlarını inceleyin. Koşul uyumlu yakınlık yönteminde F/O/G/D/J/S/A toplamı 2,5 ve üzeri ana gruptur; E ve T teyittir. Seçimleri ve bütçeyi kontrol edip gerekirse elle düzenleyin.</p></div>
      <div class="pg661-card"><h3>Sonuç geldikten sonra</h3><p>Gerçek sonuçlar bağlandığında tahmin ile bitiriş arasındaki farkı ve kalibrasyon örneklerini kontrol edin. Hedef yarışın sonucu yarış öncesi tahmin hesabına katılmaz. Pist bakımının yayın zamanı doğrulanmadığında bakım tahmine eklenmez. Eksik veri uydurulmaz.</p><p>Analiz ve kayıtları cihazda kullanabilirsiniz; yeni TJK verisi indirmek internet gerektirir. PDF ve Excel dışa aktarımlarını Dosyalarım’dan açın.</p></div>
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
  guide.onclick=()=>{try{if(typeof closeDrawer==='function')closeDrawer()}catch{}const d=ensureDialog();if(!d.open)d.showModal()};
  const current=drawer.querySelector('[data-view="current"]');
  const career=drawer.querySelector('[data-view="career"]');
  const calibration=drawer.querySelector('[data-view="calibration"]');
  const scenario=drawer.querySelector('[data-view="scenario"]');
  const coupon=$('couponMenuBtn')||findByText(drawer,/Kupon Oluştur/i);
  const annual=$('annualArchiveBtn')||findByText(drawer,/Tarihsel Sonuç Arşivi|Yıllık Yarış Arşivi/i);
  const oldExport=findByText(drawer,/Kariyer Excel/i);
  const historical=drawer.querySelector('[data-view="historical"]');
  if(historical)historical.style.display='none';
  if(oldExport){oldExport.style.display='none';oldExport.setAttribute('aria-hidden','true');}
  label(guide,'1. Kullanım Talimatı');
  label(current,'2. Güncel Analiz');
  label(career,'3. Kariyer Yol Haritası');
  label(calibration,'4. Model Kalibrasyonu');
  scenario?.remove();
  label(coupon,'5. Kupon Oluştur');
  label(annual,'6. Tarihsel Sonuç Arşivi');
  const note=drawer.querySelector('.drawer-note');
  const nodes=[guide,current,career,calibration,coupon,annual].filter(Boolean);
  for(const node of nodes){
    if(note)drawer.insertBefore(node,note);else drawer.appendChild(node);
    node.style.display='';node.removeAttribute('aria-hidden');
  }
  if(note)note.textContent='Önerilen sıra: Arşiv → Güncel Analiz → Kariyer → FOGD Kalibrasyon → Kupon. Geçmiş yerli sonuçlarda yerel arşiv önceliklidir; eksikte TJK fallback kullanılır.';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{applyMenu();ensureDialog()},{once:true});else{applyMenu();ensureDialog()}
setTimeout(applyMenu,300);setTimeout(applyMenu,1100);setTimeout(applyMenu,2400);
window.addEventListener('pageshow',applyMenu,{passive:true});
window.ATProgramWorkflowGuideV661={version:VERSION,open(){const d=ensureDialog();if(!d.open)d.showModal()},applyMenu};
console.info('[AT AI]',VERSION,'aktif — menüler önerilen analiz sırasına dizildi ve kullanım talimatı eklendi.');
})();
