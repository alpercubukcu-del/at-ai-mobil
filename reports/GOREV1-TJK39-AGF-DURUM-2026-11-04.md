# AT AI MOBİL — Görev 1: TJK 39 alan + AGF doğrulama

Tarih: 2026-11-04
İncelenen depo: `alpercubukcu-del/at-ai-mobil`
İncelenen ana dal commit'i: `3ce6f5bbeab545bea2a8fc6e8c23664a257c28e8`
Çalışma dalı: `work/tjk39-agf-contract-20261104`

## Erişim ve veri koruma
- GitHub deposuna okuma/yazma erişimi doğrulandı.
- Ana dal, mevcut Klasik/FOGD/Son 800 hesaplamaları ve kullanıcı arşivleri değiştirilmedi.
- Telefonun IndexedDB'si ve yerel `Gerçek Yarış Arşivi` dosyaları GitHub deposunda bulunmadığından bunlar fiilen okunamadı; gerçek kayıt sayısı ve bütünlük denetlenmedi.

## İncelenen kod ve mevcut durum
- `api/tjk-day-results-v1.js`: gerçek sonuç satırlarında `finish`, `programNo`, `degree`, `agf` vb. alanlar var; 39 alanlı düz kayıt ve dört ayrı AGF alanı çıkışta yok.
- `api/tjk-program.js`: program CSV/HTML ayrıştırıcılarında tek `agf` değeri var; AGF sıra ve çift havuz dönüşümü ana program satırlarına açıkça uygulanmıyor.
- `api/tjk-bet-starts-v11.js`: resmi bahis başlangıçlarını analiz ederek `agf.pool1` ve `agf.pool2` yüzdelerini gerçek havuz başlangıç koşusuna bağlıyor; 39 alanlı `agfs1/agfo1/agfs2/agfo2` satırına doğrudan dönüştürmüyor.
- `annual-results-archive-v1691f661.js`: tarih/şehir/koşu no tabanlı yarış anahtarı ve IndexedDB + kalıcı JSON yazma kodu var. Yıllık kayıt `race` alt nesnesiyle saklanıyor.
- `annual-results-yg-continuation-v1691f681.js`: gerçek TJK koşu numarası, eksik/ertelenmiş yarış ve kısmi indirme kontrolü kodu mevcut.
- Arşivdeki gerçek JSON kayıtları olmadan mükerrer/eksik/yanlış eşleşme için canlı doğrulama tamamlanamaz.

## Bu görevde eklenen izole sözleşme
- `validation/tjk39-contract.mjs` yalnız 35 orijinal alanın sırasını, son 4 AGF alanını, sayısal değer ve dinamik ikinci altılı kontrollerini doğrular.
- `tests/tjk39-contract.test.mjs` 12 bağımsız test içerir.
- Bu kod mevcut uygulama başlangıcına bağlanmamıştır; canlı arşivi ve tahmin motorlarını değiştirmez.

## Testler
Çalıştırma: `node --test tests/tjk39-contract.test.mjs`
Yerel ortam (Node 22): **12 geçti, 0 başarısız**.
Kapsam: 35+4 alan sırası, AGF1 sıra/oran ayrımı, boş AGF2'nin kopyalanmaması, ikinci altılının 4/5/6. koşuldan başlayabilmesi, geçersiz değer ve yarım AGF çiftleri, kaynak satırının korunması.
Kısıt: Bunlar sentetik testlerdir. Canlı TJK, gerçek 2004–2026 arşivi veya Android APK üzerinde uçtan uca test yapılmadı.

## Sonraki adımlar
1. Resmi `tjk-bet-starts-v11` çıktısındaki iki havuzun yüzdelerini, gerçek başlangıç koşu numarasına göre yarış satırına eşleştir. Sıra hesaplamasında eşit yüzdelerin kuralını açıkça belirle.
2. Tek `agf` alanından `agfs1/agfo1/agfs2/agfo2` alanlarına dönüşümü kontrollü ekle; bilinmeyen AGF2 boş kalsın, AGF1'den kopyalama yapma.
3. Eski sonuç yapısını koruyan yeni 39 alanlık ayrı dışa aktarımı ekle; gerçek sonuç JSON örnekleri üzerinde eksik gün/şehir/koşu ve mükerrer kayıt kontrollerini çalıştır.
4. Mevcut Klasik, FOGD, Son 800 motorlarını değiştirmeden regresyon testlerini çalıştır; bundan sonra Görev 2 (gerçek tahmin–sonuç eşleştirmesi) başlat.

## Çalışmayı devam ettirme notu
Bu rapordaki commit/dal üzerinden başla. Önce `validation/tjk39-contract.mjs` ve testleri çalıştır. Android imzalama veya APK üretimi bu görevin kapsamı dışındadır.
