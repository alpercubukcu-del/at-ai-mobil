# AT AI Mobil — bağımsız Android uygulaması

Bu APK arayüzü, analiz motorunu ve TJK API ayrıştırıcılarını uygulama içinde çalıştırır. Vercel sitesi yüklenmez. GitHub, uygulamanın çalışması için gerekli değildir; kaynak geliştirme için kullanılır.

Yerel Node.js servisi yalnız `127.0.0.1:18743` üzerinde dinler. Sabit port, uygulama yeniden açıldığında WebView arşiv/state verilerinin aynı origin üzerinde korunmasını sağlar. Oturuma özel cookie olmadan API erişimi reddedilir; yabancı origin istekleri engellenir. Android klasör köprüsü sistem klasör seçicisi ve kalıcı SAF izni kullanır. JSON yazımı destekleyen sağlayıcılarda geçici belge ve rename ile tamamlanır; diğer sağlayıcılarda eski içerik yedeklenir ve hata halinde geri yüklenir.

## Kurulum

İmzalı ARM64 APK Samsung A54 için uygundur (Android 7.0+). APK’yı açarak kurun. İlk arşiv işleminde **Arşiv Klasörünü Seç** ile mevcut **AT AI MOBIL** klasörünüzü seçin. Chrome'un klasör izni Android uygulamasına aktarılmaz; dosyaları yeniden indirmeniz gerekmez. Tarayıcıdaki IndexedDB ve localStorage kayıtları ayrı kalır; kalıcı klasördeki arşiv kullanılabilir.

TJK'dan yeni veri indirmek için internet gerekir. Kayıtlı dosyalar, uygulama kodu ve PDF/Excel kütüphaneleri cihazdadır. Uygulama kaldırılırsa uygulamanın iç verileri silinir; seçilen ortak klasör uygulamanın iç klasörü değildir.

## Derleme

Gereksinimler: Node 22+ (paket içi çalışma zamanı Node 18.20.4), JDK 17, Android SDK 35 / Build Tools 35.0.0, NDK 27.2.12479018, CMake 3.22.1, unzip. `android/local.properties` içine SDK yolunu ekleyin.

```sh
npm install
node build-runtime-v17-clean.cjs
npm ci --prefix android/runtime
node android/scripts/bootstrap.mjs
node android/scripts/prepare.mjs
cd android
./gradlew assembleDebug
```

Emülatör için `./gradlew assembleDebug -PtestAbi=x86_64`; gerçek telefon paketi varsayılan ARM64'tür. İmzalı sürüm için `AT_AI_KEYSTORE` ve `AT_AI_STORE_PASSWORD` ortam değişkenlerini ayarlayıp `./gradlew assembleRelease` çalıştırın. İmza anahtarı ve parolası kaynak depoya eklenmez. Aynı uygulamayı veri kaybı olmadan güncellemek için aynı imza anahtarı ve artan `versionCode` kullanılmalıdır.

## Doğrulama ve sınırlar

- Web analiz/arşiv regresyon testleri: 188 geçti.
- Node 18'de yerel API, oturum, origin, TJK ayrıştırıcı importları ve arşiv köprüsü testleri geçti.
- Canlı TJK at geçmişi: 19 koşu; tarihsel sorgu: 24 kayıt. İstekler cihaz içi sunucu modelinden doğrudan TJK'ya gider.
- ARM64 APK derlendi ve imzası kontrol edildi.
- Bu geliştirme ortamında Android emülatörü tam açılamadı. Fiziksel A54'te açılış, klasör seçimi, bir şehir indirme, analiz ve PDF/Excel dışa aktarma henüz doğrulanmadı. İlk sürüm bu cihaz testleri için hazırlanmıştır.
- Arka planda sınırsız indirme garantisi verilmez; ilk cihaz denemesinde uygulamayı açık tutun.

## Üçüncü taraf bileşenler

Node.js Mobile 18.20.4 (MIT/Node lisansları), cheerio 1.0.0 (MIT), pdf-parse 1.1.1 (MIT), html2pdf.js 0.10.2 (MIT), pdfmake 0.2.12 (MIT), PDF/Roboto ve SheetJS 0.18.5 bileşenleri kendi lisanslarını korur. Dışa aktarma kütüphaneleri `vendor-manifest.json` içindeki sabit sürüm ve SHA-256 değerleriyle paketlenir.
