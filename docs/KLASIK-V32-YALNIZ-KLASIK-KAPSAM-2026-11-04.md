# AT AI MOBİL — Klasik Analiz V3.2 (Kesin kapsam)

Tarih: 2026-11-04
Kullanıcı kapsam düzeltmesi: **"sadece Klasik Analiz üzerine belirlemiş olduğumuz kurallarla oluşturulacak."**

## Kesin teslim hedefleri
1. **Android APK:** Klasik Analiz V3.2'nin telefon ekranına uygun tam uygulaması; referans Windows görselindeki işlevler mobil sekmelere/kartlara uyarlanacak.
2. **Mobil uyumlu web uygulaması:** Paylaşılan ikinci görseldeki telefon tasarımına uygun, tarayıcıdan çalışan Klasik Analiz V3.2.

**Bu iki üründe yalnızca Klasik Analiz bulunacak. FOGD ve Son 800 modülleri, analiz ve kupon motorları kapsam dışıdır.** Var olan FOGD/Son 800 kaynaklarına dokunulmayacak. Ortak servis veya verinin mevcut uygulamada bulunması, bu iki motorun V3.2'ye dahil edilmesi anlamına gelmez.

## Klasik Analiz gereksinimleri
- Tek Bülten Arşivi + Tek Sonuç Arşivi; 10 hipodrom, tarih/şehir/koşu güvenilir eşleştirmesi, kısmi indirmeye devam, mükerrer kayıt denetimi.
- 35 orijinal yarış alanını ve ek AGF1/AGF2 sıra-oran alanlarını kapsayan 39 alanlı kayıt; sıra/alan anlamları için kullanıcı açıklamaları esas alınacak. Mevcut arşivler sessizce dönüştürülmeyecek/silinmeyecek.
- `agfs1` AGF1 sırası, `agfo1` AGF1 oranı, `agfs2` AGF2 sırası, `agfo2` AGF2 oranı. İkinci altılı başlangıcı resmî programdan; AGF2 yoksa AGF1 kopyalanmaz.
- Klasik Analiz filtreleri: şehir, tarih, koşu, sınıf/grup, pist/yüzey, pist durumu, mesafe yakınlığı ±0/±100/±200/±300/±400 m.
- Klasik Analiz'e özgü tahmini derece ve sıralama; pist, mesafe, kilo, pist durumu ve şehir farklarının veriye dayalı kalibrasyonu. Yeni katsayılar önce eski Klasik hesaplamayla yan yana test edilir; doğrulanmadan ana sonucu değiştirmez.
- Bütçeye göre otomatik kupon, tek at seçimi, manuel at ekleme ve kuponu yeniden hesaplama.
- **Yalnızca Klasik Analiz** tahminlerinin yarış öncesi kayıtlarının gerçek sonuçlarla karşılaştırılması; gelecekteki sonuçların geçmiş tahminlere sızmasının engellenmesi.
- İki uygulamada aynı Klasik Analiz veri sözleşmesi/hesaplama sonuçları, ancak telefon içi arşiv ile web depolamasının kendiliğinden eşitlendiği varsayılmayacak.
- Android'de mevcut paket kimliği/imza uyumluluğu ve JSON veri kaybı olmadan yükseltme için cihaz testi zorunlu. Ekran görselleri örnek tasarımdır; gerçek uygulama veya doğrulanmış tahmin değildir.

## Kaydedilmesi gereken karar ve sınırlar
- Tasarım 1: Geniş masaüstü Windows görünümünü mobilde aynı boyutlarda sıkıştırma; üst üç adımlı arşiv/analiz akışını koru, at/koşu detayları sekmeli göster.
- Tasarım 2: Mobil web ekranı; ana sayfa, bülten, sonuç, analiz, tahmini derece, kupon ve arşiv bölümleri.
- Bu belge **kapsam sözleşmesidir**, mevcut uygulama üzerinde entegrasyon, APK üretimi, canlı TJK verisi testi veya kurulum tamamlandığı anlamına gelmez.

## Not: Sütun sırası çelişkisi
4 Kasım'da kullanıcı tarafından verilen 35'lik listede `sno` orijinal dizide 17. alandır. Daha eski 39 alanlı sürüm notlarında `sno` 39. alan olarak tarif edilmiştir. Canlı dosya biçimini değiştirmeden önce örnek veri ve kaynak şema doğrulanacak; bu farkı sessizce düzeltmeye çalışma.
