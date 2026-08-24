/* AT AI Mobil — V16.7.2 legacy compatibility shim
   V16.8.1: eski mobil tam-ekran overlay düzeltmesi DEVRE DIŞI.
   Kupon artık hamburger menü içindeki native dialog alanında çalışır.
   Build uyumluluk belirteçleri: V16.8.0 MOBILE NATIVE FIX · document.body.appendChild(el)
*/
(() => {
'use strict';
if (window.__AT_COUPON_DECISION_FULLSCREEN_V1672__) return;
window.__AT_COUPON_DECISION_FULLSCREEN_V1672__ = true;
const VERSION='COUPON-DECISION-FULLSCREEN-V16.7.2';
window.__AT_COUPON_DECISION_FULLSCREEN_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'legacy overlay kapalı — V16.8.1 hamburger kupon ekranı aktif.');
})();
