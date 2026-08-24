/* AT AI Mobil — V16.7.8 legacy compatibility shim
   V16.8.1: ana sayfadaki buildAllBtn yönlendirme/overlay zorlaması DEVRE DIŞI.
   Yeni yol: hamburger menü > 6. Kupon Oluştur > native dialog.
   ATCouponDecisionV1671 mevcut karar motoru olarak korunur.
   V16.7.9 HOTFIX · V16.8.0 MOBILE NATIVE FIX · document.body.appendChild(el)
*/
(() => {
'use strict';
if (window.__AT_COUPON_GATE_ROUTING_V1678__) return;
window.__AT_COUPON_GATE_ROUTING_V1678__ = true;
const VERSION='COUPON-GATE-ROUTING-V16.7.8';
window.__AT_COUPON_GATE_ROUTING_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'legacy ana-sayfa routing kapalı — V16.8.1 hamburger kupon ekranı aktif.');
})();
