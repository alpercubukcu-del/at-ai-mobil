/* AT AI Mobil — V16.7.7 legacy compatibility shim
   V16.8.1: eski Kupon Veri Denetimi mobil reset/scroll overlay kodu DEVRE DIŞI.
   resetGateToTop belirteci yalnız eski build zinciri uyumluluğu içindir.
   V16.7.9 HOTFIX · V16.8.0 MOBILE NATIVE FIX
*/
(() => {
'use strict';
if (window.__AT_COUPON_GATE_MOBILE_RESET_V1677__) return;
window.__AT_COUPON_GATE_MOBILE_RESET_V1677__ = true;
const VERSION='COUPON-GATE-MOBILE-RESET-V16.7.7';
const resetGateToTop='disabled-v1681';
window.__AT_COUPON_GATE_MOBILE_RESET_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'legacy overlay reset kapalı — V16.8.1 hamburger kupon ekranı aktif.',resetGateToTop);
})();
