# AT AI MOBİL · KLASİK ANALİZ V3.2 — SABİT REFERANS (v1)
**Tarih:** 2026-11-04  
**Kapsam:** Yalnız Klasik Analiz. İki istemci: Android APK ve mobil web. FOGD/Son 800 bu ürünlere dahil edilmeyecek.  
**Koruma:** Ana dal, eski APK, hesaplama, imza, arşiv ve kullanıcı JSON dosyalarını izinsiz değiştirme/silme.

> **Her proje yanıtının başı için kısa özet:**  
> **KLASİK V3.2 | 39 alan (35+4) | AGF1/AGF2 ayrı | ±0/100/200/300/400 m | T=geçmiş+Δmesafe+Δpist/şehir+Δdurum+Δkilo+Δgünlük hız | tek bülten/sonuç arşivi | Android+Web | FOGD/Son800 yok.**
>
> Bu bir gereksinim ve hedef-formül belgesidir. Katsayıların ya da mobil ürünlerin canlı sisteme entegre edildiğine dair kanıt değildir.

## A. Sonuç veritabanı — kullanıcı tarafından en son verilen orijinal sırayla 39 alan

| # | Alan | Anlam / kullanıcı tanımı |
|---:|---|---|
| 1 | `der` | Atın bitiriş sırası |
| 2 | `pno` | Program at numarası |
| 3 | `kilo` | Yarışta taşınan ağırlık (kg) |
| 4 | `ganyan` | Ganyan oranı |
| 5 | `tarih` | Yarış tarihi |
| 6 | `mes` | Mesafe (m) |
| 7 | `ikramiye` | Yarış ikramiyesi |
| 8 | `yarrno` | Yarış kimlik/kayıt numarası — **TJK karşılığı teyit edilecek** |
| 9 | `yas` | At yaşı |
| 10 | `kno` | Koşu numarası / eski kullanım ile çakışma kontrol edilecek |
| 11 | `hpu` | Handikap puanı |
| 12 | `hsi` | Koşu içinde handikap puan sırası (yüksekten düşüğe) |
| 13 | `gsi` | Koşu içinde ganyan sırası (küçükten büyüğe) |
| 14 | `hpo` | Koşunun ortalama handikap puanı |
| 15 | `ghpo` | Atın geçtiği atların handikap puanı ortalaması |
| 16 | `g2hpo` | Atı geçen atların handikap puanı ortalaması |
| 17 | `sno` | Sonuç sıra/seri alanı — **kesin kaynak anlamı teyit edilecek** |
| 18 | `atadi` | At adı |
| 19 | `akses` | Aksesuar bilgisi |
| 20 | `orjin` | Baba/anne soy bilgisi |
| 21 | `jokey` | Jokey adı |
| 22 | `jimi` | Jokey statüsü (jokey boş / apranti) |
| 23 | `sahip` | At sahibi |
| 24 | `antrenor` | Antrenör |
| 25 | `muddet` | Atın gerçek bitiriş derecesi |
| 26 | `sehir` | Hipodrom/şehir |
| 27 | `yaradi1` | Yarış koşulu başlık parçası 1 |
| 28 | `yaradi2` | Yarış koşulu başlık parçası 2 |
| 29 | `yaradi3` | Yarış koşulu başlık parçası 3 |
| 30 | `pist` | Kum/Çim/Sentetik |
| 31 | `irk` | Arap/İngiliz |
| 32 | `pdurum` | Pist durumu; eksikse Normal varsayma |
| 33 | `uyr` | Uyruk |
| 34 | `ci` | Cinsiyet (d/e/g vb.) |
| 35 | `yaradi4` | Kısa yarış sınıfı (Maiden/Şartlı/Handikap/G1 vb.) |
| 36 | `agfs1` | AGF1 **sırası** |
| 37 | `agfo1` | AGF1 yüzde **oranı** |
| 38 | `agfs2` | AGF2 **sırası** |
| 39 | `agfo2` | AGF2 yüzde **oranı** |

**UYUMLULUK UYARISI:** Bazı eski 4.xx kaynak notlarında `sno` 39. sütun olarak tarif edildi. Kullanıcının en son verdiği 35'lik *orijinal dizide* `sno` 17. sütundur ve dört AGF alanı sona eklenir. Mevcut `validation/tjk39-contract.mjs` da bu 35+4 sırasını kullanıyor. Eski gerçek ZIP/JSON kolonları kontrol edilmeden 4.xx dosyaları otomatik yeniden sıralanmayacak; gerekirse sürümlü içe aktarma adaptörü kullanılacak.

**Alan anlamları:** Kullanıcı tanımları referanstır; `sno` ve `yarrno` gibi kaynak karşılıkları resmî örnekle doğrulanacaktır. Bir atın yarış sonrası bitiriş sırası `der`, zaman derecesi `muddet` alanında farklı veridir; biri diğerinden türetilmeyecektir.

## B. AGF1 / AGF2 kesin kurallar
- AGF1 üst satır: `agfs1` sıra; `agfo1` yüzde. AGF2 alt satır: `agfs2` sıra; `agfo2` yüzde.
- İkinci altılının başlangıcı sabit 4/5/6. koşu değil, **TJK resmî bahis başlangıçları** ile bulunur.
- AGF2 bulunmayan koşulda `agfs2` ve `agfo2` boş/null; AGF1 **asla** kopyalanmaz. "Yok" ve "indirilemedi/doğrulanmadı" ayrı arşiv kaynağı durumudur.
- Kaynak AGF sırası varsa onu koru. Sıra yoksa oran sıralamasını ayrı ve açık sürümlü kuralla hesaplamadan resmî AGF sırası diye işaretleme. Eşit oranların bağlayıcı kuralları doğrulanmalı.
- AGF alanları iki ayrı bağımsız karşılaştırma filtresi ve başarı raporunda kullanılabilir. AGF2 bulunmayan koşu AGF2 raporunun paydasına girmez.

## C. Klasik Analiz hedef derece formülü
```text
T_tahmin(saniye)
  = T_gecmis(saniye)
  + Δ_mesafe
  + Δ_pist_sehir
  + Δ_pist_durumu
  + Δ_kilo
  + Δ_gunluk_pist_hizi
  [+ yalnız ayrıca doğrulanmış ve çifte sayılmayan düzeltmeler]
```
- Tarihsel gözlemler: **Mümkün olan bütün atların** gerçek bitiriş dereceleri; referans için en hızlı 5/10/20 derece, aynı atın başka şehir/yüzeylerdeki dereceleri, yaş/ırk/sınıf karşılaştırmaları.
- `Δ_mesafe`: seçilen mesafe yakınlığı (±0, ±100, ±200, ±300, ±400 m) içindeki tarihsel kayıttan hedef mesafeye **veriden öğrenilen** dönüşüm; ±0 aynı mesafe.
- `Δ_pist_sehir`: şehir ve yüzey (Kum/Çim/Sentetik) birlikte kontrol edilerek hesaplanır, aynı şehir farkı bir de ikinci terimde eklenmez.
- `Δ_pist_durumu`: Normal/Nemli/Islak vb. gerçek doğrulanmış pist durumu; veri yoksa Normal uydurulmaz.
- `Δ_kilo`: tarihsel kilo ile hedef yarış kilosu farkı. Açıklayıcı iki-aşamalı biçim (katsayı β, saniye/kg ve ilgili şartlarda geçmiş yarışlardan öğrenilecek):
  `T_ref = T_obs + β_kg × (W_ref - W_obs)`
  `T_hedef_kilo = T_ref + β_kg × (W_hedef - W_ref)`.
- `Δ_gunluk_pist_hizi`: geçmiş yarış gününe ait doğrulanmış hızlı/yavaş pist farkı. **Hedef yarış sonucu gerçekleşmeden** geçmiş veya gelecek sonuçtan türetme.
- Tüm Δ'ler uygulanmadan önce saniye birimine dönüştürülür. Kayıt ve katsayı yeterli değilse eksik veri olarak işaretlenir; sessizce sıfırdan veya hayalî sayıdan "öğrenme" yapılmaz.
- Mevcut eski Klasik hesaplama **korunur**; yeni hesaplama gölge modelde gerçek sonuçlarla karşılaştırılıp iyileşme gösterirse ayrı kararla etkinleştirilir. Bu belge motorun canlıya bağlandığı anlamına gelmez.
- Tarihsel pist dönüşümleri (yalnız **başlangıç referansı**, birimi henüz teyit edilmemiş): Kum→Çim −0.33; Çim→Kum +0.33; Kum→Sentetik −0.20; Sentetik→Kum +0.20; Çim→Sentetik +0.13; Sentetik→Çim −0.13. Bunları doğrulanmadan saniye olarak canlı hesaba uygulama.

## D. Filtreler, kupon ve doğrulama matematiği
1. **Mesafe uygunluğu:** `abs(gecmis_mesafe - hedef_mesafe) <= tolerans_m` ; tolerans `0|100|200|300|400`.
2. **Kupon bedeli:** `toplam_bedel = birim_bedel × ∏(her ayakta seçili at sayısı)`; `toplam_bedel <= bütçe` zorunlu. Her ayakta en az bir at seçilir. Otomatik tek at seçimi ve manuel ekleme desteklenir; keyfî 5-at sınırı konulmaz.
3. **Tahmin testi:** Sadece yarış **başlamadan önce kaydedilmiş** Klasik analiz tahminleri, o yarışın resmi gerçek sonuçlarıyla kıyaslanır. Başarı metrikleri: gerçek kazananın tahmin sırası, birinci isabeti, ilk 3 isabeti, derece tahmin hatası; veri doğrulanmamışsa raporda belirtilir.
4. **Mükerrerlik:** tarih + şehir + resmî koşu no + at kimliği temelli; erteleme varsa program tarihi/gerçek koşu tarihi ayrı tutulur. Eksik koşu/atları saklama, yanlış numarayla eşleme ve başarısız indirmeyi tam sayma yasak.
5. **Tek bülten / tek sonuç arşivi:** 10 hipodrom (Adana, İzmir, İstanbul, Bursa, Ankara, Şanlıurfa, Elazığ, Diyarbakır, Kocaeli, Antalya). Var olan arşivler güncellemede korunur; kısmi işlem kaldığı yerden sürer.
6. **İki istemci:** APK + web aynı Klasik Analiz kurallarını paylaşmalı. Sadece tasarım görselleri mevcuttur; çalışan APK, web yayını, imzalama ve canlı TJK testi ayrıca kanıtlanacaktır.

## E. Kanıt / sürüm ayrımı
- Kaynakta mevcut `validation/tjk39-contract.mjs` ve `tests/tjk39-contract.test.mjs` (sentetik sözleşme testi) — **canlı arşiv/doğrulanmış APK testi değildir**.
- Canlı TJK HTML ayrıştırması, gerçek 39 sütunlu dosya aktarımı, AGF1/AGF2 çift havuz bağlantısı, Klasik hesaplama ve APK bu referansa göre **ayrı ayrı test edilecektir**.
- GitHub ana dalı ve FOGD/Son 800 dosyalarına dokunma; önce bağımsız `work/tjk39-agf-contract-20261104` dalında ilerle.
