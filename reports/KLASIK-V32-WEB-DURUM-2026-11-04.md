# Klasik Analiz V3.2 — mobil web başlangıç uygulaması / durum raporu
Tarih: 2026-11-04
Dal: work/tjk39-agf-contract-20261104
İlk 39-alan referans dosyası: docs/KLASIK-V32-SABIT-FORMULLER-39-ALAN.md

## Kaydedilenler
- \`klasik-v32/index.html\`: bağımsız, yalnız Klasik Analiz ekranı (Bülten, Sonuç, Analiz, Kupon, Arşiv).
- \`klasik-v32/styles.css\`: masaüstü + dar mobil ekran tasarımı.
- \`klasik-v32/app.mjs\`: mevcut TJK program, sonuç, AGF API uç noktalarını çağırır; koşu seçimi, at sonuç görüntüleme, yerel IndexedDB'de gün bazlı kayıt, 39 alan JSON dışa aktarma. Eski kayıt üzerine sessizce yazmaz.
- \`klasik-v32/core.mjs\`: 10 şehir, 35+4 alan, mesafe filtreleri, eksik resmî AGF sırasını uydurmayan sonuç adaptörü, mükerrer kayıt denetimi.
- \`tests/klasik-v32-core.test.mjs\`: 12 bağımsız test.
- \`build-klasik-v32.cjs\`: ön test + mevcut legacy derleme + ek \`/klasik-v32/\` statik rota kopyası. Başka menüleri çıkarmaya/yeniden yazmaya çalışmaz.
- \`vercel.json\`: **yalnız bu geliştirme dalında** yeni derleme sarmalayıcısına yönlendirilmiştir; \`main\` değişmedi.

## Bu oturumun doğrulamaları
- 12 test işlevi V8 araç ortamında ilgili modül içeriğiyle çalıştırıldı: **12 geçti, 0 başarısız**.
- \`app.mjs\`, \`core.mjs\` ve \`build-klasik-v32.cjs\` JavaScript sözdizimi kontrolünden geçti.
- HTML'de referans verilen tüm UI ID'leri mevcut.
- Yeni uygulamanın HTML/JS'sinde FOGD ve Son 800 modülleri bulunmuyor.
- Yeni Vercel buildCommand JSON olarak geçerli.
- **Henüz Node CLI ile tüm proje derlemesi, canlı TJK ağ testi, Vercel deployment, gerçek Android APK / imza testi veya tarayıcı görsel testi gerçekleştirilmedi.** Bunlar yapılmış gibi gösterilmemelidir.

## Veri sınırlamaları
- TJK servislerinden alınan derece ve sonuç bilgileri gösterilir; tahmin edilmiş derece üretimi bu ilk web sürümünde devre dışı.
- AGF yüzde verisi TJK altılı havuzundan gelir; resmî AGF sırası yoksa \`agfs1/agfs2=null\`. Bu durum audit uyarısıdır; resmî sıra uydurulmaz.
- \`sno\` ve \`yarrno\` eşlemesi onaylanmadan boş bırakılır. Eski 4.xx kaynaklarında \`sno\` sona alındığından kullanıcı 35+4 sırası ile eski şema çelişebilir; dönüşüm yapmadan önce resmî örnekle denetle.
- Uygulama yalnızca görüntülenen tarih/şehir sonuçlarını yerel tarayıcı IndexedDB'sine ekleyebilir. Bu, tam tarihsel arşiv indirmesi, telefonlar arası eşitleme veya tamamlanmış 39-sütun veritabanı değildir.

## Sıradaki görev
1. Vercel önizleme dalının gerçek build ve API endpoint sağlık kontrollerini çalıştır; sadece \`/klasik-v32/\` rotasını doğrula.
2. TJK resmî AGF sıralarının kaynağını ve 4.xx şemasındaki \`sno\` sıra çelişkisini gerçek dosyayla kesinleştir.
3. Eksik/ertelenen koşu günlerini ve gerçek arşivdeki mükerrerleri test et.
4. Mevcut Klasik Analiz hesaplama motorunu inceleyip yalnız Klasik derece motorunu önce gölge modunda bağla; mesafe/pist/durum/kilo öğrenme katsayılarını gerçek geçmiş sonuçlarla doğrula.
5. Kupon otomasyonuna geçmeden önce bütçe formülü ve manuel seçimi test et.
6. Web başarı testinden sonra Android WebView/Capacitor ya da mevcut APK yapısına aynı Klasik arayüzün entegrasyonu, aynı paket kimliği/imza ve veri koruma testleri.
