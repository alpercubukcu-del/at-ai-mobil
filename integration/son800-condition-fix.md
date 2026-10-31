# Son 800 pist durumu güvenliği

Mevcut APK'deki `assets/node/api/tjk-son800-v1.js` içinde pist durumu boş olduğunda `Normal` varsayımı yapılıyor. Bu, doğrulanmamış bir koşulun katsayı öğrenmesine sızmasına yol açabilir.

Düzeltme: `condition=conditionRaw||null`. `conditionAssumed:!conditionRaw` bayrağı korunur.

Bu düzeltme tek başına üç motorun canlı kalibrasyonu değildir. Tam APK oluşturulup cihazda doğrulanmadı.
