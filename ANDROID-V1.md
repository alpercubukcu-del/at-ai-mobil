# AT AI Mobil Android V1

Bu dal Android/Capacitor kabuğunu içerir.

## İlk test APK
1. `npm install`
2. `npx cap add android` (android klasörü henüz yoksa)
3. `npm run android:sync`
4. `npm run android:build`

Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

V1 mevcut Vercel uygulamasını güvenli HTTPS WebView içinde açar. Böylece mevcut API rotaları ve çalışan analiz motorları korunur. Yerel AT AI MOBIL dosya deposu ikinci aşamada native filesystem köprüsüyle eklenecektir.
