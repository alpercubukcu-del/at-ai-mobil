# AT AI Mobil Android APK

Bu branch Vercel yayınına dokunmadan Android APK denemesi üretmek için hazırlandı.

## Ne yapar?

- Mevcut AT AI Mobil web arayüzünü APK içine asset olarak paketler.
- GitHub Actions ile debug APK üretir.
- Android WebView icindeki `/api/...` isteklerini native Android internet katmanına aktarır.
- Varsayılan API adresi `https://at-ai-mobil.vercel.app` olarak kalır.
- Ekranın sağ altında küçük `API` düğmesi vardır; ileride Vercel dışı API adresi kurulunca buradan değiştirilebilir.

## Önemli durum

Vercel hesabı/projesi şu anda `DEPLOYMENT_DISABLED` olduğu için varsayılan API adresi cevap vermeyebilir. APK açılır, fakat veri çekme işlemlerinin tam çalışması için API katmanını Vercel dışı bir adrese taşımamız gerekir.

## APK üretimi

GitHub Actions etkinse bu branch'e push gelince `Android APK` workflow'u çalışır. Çıktı artifact adı:

`at-ai-mobil-debug-apk`

İndirilecek dosya:

`android-app-debug.apk`

## Sıradaki adım

API fonksiyonlarını ücretsiz bir backend'e taşımak:
- Cloudflare Workers
- Netlify Functions
- Render / Railway free benzeri alternatifler

Bu Android APK, o yeni API adresini `API` düğmesinden alabilecek şekilde hazırlandı.
