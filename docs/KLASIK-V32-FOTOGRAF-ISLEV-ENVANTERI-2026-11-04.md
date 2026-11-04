# Klasik Analiz V3.2 — Fotoğraflardan Onaylı V3.1 İşlev Envanteri
Tarih: 2026-11-04

**Kapsam kararı:** Kullanıcının gönderdiği V3.1 masaüstü ekranları ve yeni lacivert V3.2 tasarımındaki işlevleri koru; **yalnız FOGD yeni uygulamadan çıkarılacak**. Ayrı FOGD/Son 800 motorları bu ürünün parçası değildir, mevcut kodlarına müdahale edilmeyecek.

## Kullanıcı tarafından gönderilen ekranların gösterdiği işlevler

| Bölüm | V3.1 kanıtı (ekran) | V3.2 kabul kriterleri |
|---|---|---|
| Üst menü | Analiz / İstatistik / Bülten / Güncelle / Ayarlar / Yardım | Ayrı erişilebilir ekranlar; menüden çıkış işlevleri |
| Tarihsel arşiv sorgulama | At adı, jokey, sahip, antrenör, grup, yarış cinsi, kilo/mesafe/derece/tarih aralıkları, ırk, pist, pist durumu, şehir, sıralama, sonuç sayacı | Kombinasyonlu sorgu, bütün sonuç tablosu yatay/dikey görünüm, kayıt sayısı, CSV/JSON dışa aktarım (tasarım hedefi) |
| Geniş tarihsel at sonuç tablosu | Tarih, şehir, at adı, UYR, aksesuar, jokey, kilo, mesafe, pist, durum, KN, süre, GNY, grup, yarış cinsi, ikramiye, orijin, sahip, antrenör, HPU/HSI/GSI/HPO/GHPO/G2HPO | Değerler gerçek arşivden gelmeli; sütun seçici ve geniş tablo; hiçbir sütun kaybolmamalı |
| İstatistik sorgusu | Grup / yarış cinsi (Genel ve Tam seçenekleri) / şehir / mesafe / pist / pist durumu; 'Toplam 72 yarış' örneği | Filtreleme ve altı kazanan dağılım tablosu; Genel/Tam anlamları mevcut koda/veriye göre kesinleştirilecek |
| Altı istatistik tablosu | Handikap puan sırası, ganyan sırası, kulvar no, yaş, cinsiyet, kilo; TOPLAM ve % ORANI | Kazananların koşul bazlı sayımı, filtrelenmiş gerçek yarışlar üzerinde toplam ve payda; eksik kategori verilerini uydurma |
| Bülten yükle | Tarih seçimi, Bülteni Yükle; ekranda 'internet bağlantınız yok yada hatalı' uyarısı | TJK API/sunucu hata bildirimi, tekrar deneme ve mevcut arşivi koruma |
| Bülten incele | Tarih + şehir + Göster, koşu listesi ve seçili koşunun at tablosu | 10 hipodrom, gerçek program tarih/şehir, koşu No/grup/cins/mesafe/pist/durum/ikramiye/şehir/tarih |
| Seçili koşu atları | At no/isim/UYR/aksesuar/yaş/cinsiyet/kilo/jokey/KN/HPU/HSI/orijin/sahip/antrenör; başlık HPO | Satır seçimi, Detay, İstatistiklere Bak, Kupon Hazırla, Koşularını Göster, Sonucu Tahmin Et |
| Koşularını Göster | 'Sadece Bursa', 'Sadece Çim', '1400m ±0/100/200/300/400', 'Gösterilecek koşu sayısı limiti:10'; önceki koşular renkli satırlar ve BMKS/NBMKS vb. | Filtreleri ayrı ayrı uygula; 0=aynı mesafe; limit parametresi; tarih/at eşleştirme; renkler yalnız açıklamalı vurgu (belirsiz ölçüm kolonları ayrıca doğrulanacak) |
| Sonucu Tahmin Et | Şehir/pist/mesafe filtreleri, tahmini bitiş derecesine göre atların yeniden sıralanması, koşusu yok uyarısı | **Klasik** derece sıralaması, kaynak ve normalizasyon açıklaması, eksik geçmiş koşulara uydurma derece yazmama |
| Bülten güncelle / tarihsel paketler | Koşu Sonuçlarını Yükle; Geçmiş Yıllara Ait Paketleri Yükle; güncel tarih aralığı | Tek bülten + tek sonuç arşivi, yarım kalana devam, mükerrer tespiti, 10 hipodrom |
| Kupon hazırlama | Altılı Ganyan, Oyun Sistemi ('Normal', '2 Tane Tek'), bütçe, altı ayak tablo, Otomatik Hazırla, At Ekle, Seçili At Çıkar, Kuponu Yazdır | Dinamik resmî altılı başlangıç koşuları, ayak başına sınırsız at sayısı, tek belirleme, puan/derece sırası, manuel müdahale, yeniden bütçe hesabı |
| Kupon Parametreleri | Birim fiyat, yalnız şehir/pist/mesafe geçmiş yarışları, ±0/100/200/300/400 | Kupon bedeli = birim × ayaklardaki at sayılarının çarpımı; kullanıcı seçimleri ve mevcut diğer filtreler korunmalı |
| Seçili at ekleme | 'Başka at ekleme' seçim kutuları; ayak ve seçili koşu at tablosundan ekleme | Sistem otomatik kupondan sonra manuel ekleme/çıkarma ve bütçe yeniden hesaplama |
| V3.2 lacivert hedef | Sol gezinme, üstte üç aşamalı iş akışı, ortada yarış ve atlar, sağda analiz/istatistik/tahmin/kupon kartları | Masaüstü düzen ve mobilde sekmeli-kartlı görünüm, **gerçek hesaplanmamış sonuçları örnek olarak dahi canlı tahmin diye gösterme** |

## Kritiklik: veri alanları ve görselden doğrulanan anlamlar

- Eski masaüstü tablosunda **KN = kulvar numarası**, 39 alanlı şemadaki `kno` olarak eşleştirilmelidir. **Koşu no ayrı yarış metaverisidir, kno'ya yazılamaz.**
- `der` bitiriş sırası, `muddet` atın gerçekleşmiş bitiş süresidir; **tahmini süre** ayrıca tutulmalı, gerçek sonuç alanına yazılmamalı.
- `hsi` HP sırası, `gsi` ganyan sırası; `hpo/ghpo/g2hpo` için kullanıcı tanımı sabit referansta korunmalı.
- Kullanıcı tarafından verilen orijinal 35 sıralamada `sno` 17. alandır. Eski 4.xx kaynak notlarında 39. sırada göründüğü için gerçek örnek dosya üzerinden sürümlü aktarım yapılmadan sıra değiştirilmemeli.
- Geçmiş yarış görünümündeki BMKS/NBMKS/HPO2/HPO3 gibi türetilmiş metrikler resmî 39 alanın parçası sanılmamalı. Kaynak ve hesaplama kuralı ayrıca doğrulanacak.
- **AGF1** üst satırın sırası/yüzdesi, **AGF2** ikinci altılı başladıktan sonraki resmî alt satırın sırası/yüzdesi. AGF2 yoksa AGF1 kopyalanmayacak.
- 2010–2026, 25.653 kayıt ve 72 yarış gibi ekran sayıları V3.1 ekranındaki **örnek/snapshot** bilgileridir, V3.2 arşivinin şu an indirildiğinin kanıtı değildir.

## Mevcut geliştirme ile farklar
- `klasik-v32/` mobil web iskeletinde Bülten/Sonuç/AGF/39 alan JSON görüntüleme altyapısı var.
- Eksik: ayrıntılı arşiv filtreleri; altı istatistik tablosu; seçili koşunun bütün atlarının detaylı tablosu; atın filtreli geçmiş yarışları; Klasik tahmin formülü; manuel/otomatik kupon algoritması; tam yıllık arşiv indirme; Android APK.
- Kritik kaynak hatası: `klasik-v32/core.mjs` daha önce `kno`ya koşu numarasını yazıyordu; bu görüntülerdeki KN (kulvar) ile çelişir. `kno` kulvar olarak düzeltilmeli, koşu numarası 39 alan dışında metaveride tutulmalı.
- Bu görüntüler V3.1'deki **seçeneklerin ve davranışların** kanıtıdır; tam derece tahmin formülünün veya otomatik kupon karar algoritmasının kaynak kodu değildir. Eski EXE/gerçek veri veya kurallara ilişkin açıklama olmadan bunların bire bir çalıştığı iddia edilmeyecek.

## Uygulama sırası
1. Kaynak adaptöründe kulvar/koşu numarası karışıklığını düzelt, 39 alan + koşu metadata testlerini çalıştır.
2. Tarihsel sorgulama, altı istatistik ve atın geçmiş yarışları için yalnızca doğrulanmış veriyi kullanan ayrı modüller ekle.
3. Gerçek bülten/sonuç arşivi bütünlüğünü doğrula; AGF sıra/oran bağlantısını tamamla.
4. Klasik derece hesabını eski/yeni gölge karşılaştırmasıyla entegre et.
5. Kupon optimizasyonu ve manuel eklemeleri test et; sahte tek/kupon üretme.
6. Önizleme web yayını, ardından Android cihazda paket kimliği/imza/JSON koruma doğrulaması. FOGD kodunu değiştirme.

**Durum:** Fotoğraf incelemesi ve kabul kriterleri çıkarıldı. Bu belge işlevsel şartnamedir; çalışan tüm özelliklerin tamamlandığı anlamına gelmez.
