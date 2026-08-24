const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1677.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const ROUTING_PATCH=path.join(ROOT,'coupon-gate-routing-v1678.js');
const MENU_PATCH=path.join(ROOT,'coupon-menu-v1681.js');

for(const f of [BASE,ROUTING_PATCH,MENU_PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.8.1] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.8.1] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const routingPatch=fs.readFileSync(ROUTING_PATCH,'utf8');
const menuPatch=fs.readFileSync(MENU_PATCH,'utf8');
if(!app.includes('COUPON-GATE-ROUTING-V16.7.8')) app += `\n${routingPatch}\n`;
if(!app.includes('COUPON-MENU-V16.8.1')) app += `\n${menuPatch}\n`;

for(const token of [
  'ATCouponDecisionV1671',
  'COUPON-MENU-V16.8.1',
  'couponCenterDialog',
  'couponMenuBtn',
  'coupon-menu-embedded',
  'legacy ana-sayfa routing kapalı'
]) {
  if(!app.includes(token)) throw new Error(`[V16.8.1] production bundle doğrulaması başarısız: ${token}`);
}
if(app.includes("attributeFilter:['class','style','aria-hidden']")) {
  throw new Error('[V16.8.1] eski style MutationObserver freeze yolu bundle içinde kaldı.');
}
if(app.includes("document.body.style.setProperty('position','fixed','important')")) {
  throw new Error('[V16.8.1] eski body position:fixed kupon kilidi bundle içinde kaldı.');
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
for(const token of ['id="couponMenuBtn"','id="couponCenterDialog"','id="couponSetupV1681"','id="couponAuditHostV1681"','id="tickets"']) {
  if(!html.includes(token)) throw new Error(`[V16.8.1] hamburger kupon HTML eksik: ${token}`);
}
const mainMatch=html.match(/<main>([\s\S]*?)<\/main>/i);
if(!mainMatch) throw new Error('[V16.8.1] <main> bulunamadı.');
for(const forbidden of ['buildAllBtn','betTypes','couponSetupV1681','id="tickets"','KUPON MERKEZİ','OLUŞTURULAN KUPON']) {
  if(mainMatch[1].includes(forbidden)) throw new Error(`[V16.8.1] ana sayfada kupon kalıntısı var: ${forbidden}`);
}
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16810');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.8.1 build tamamlandı: kupon ana sayfadan temizlendi; hamburger > 6. Kupon Oluştur native dialog aktif; cache v=16810.');
