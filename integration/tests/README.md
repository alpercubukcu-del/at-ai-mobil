# Klasik Analiz canlı köprü regresyonları

Bu test, mevcut APK'den çıkarılan `assets/node/public/classic/core.js` ile çalıştırılır. `node test_classic_bridge.cjs /path/to/core.js`

Kontroller: eski hesaplama korunur; yalnızca üretim onaylı, yarış tarihinden önce eğitilmiş model uygulanır; gelecekte eğitilmiş veya onaysız model reddedilir; hata durumunda eski tahmine dönülür; yarıştan sonraki sonuçlar tahmine girmez.

Bu test **FOGD/Son800 entegrasyonunun veya APK imzasının doğrulaması değildir**.
