const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1677.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const ROUTING_PATCH=path.join(ROOT,'coupon-gate-routing-v1678.js');
const MENU_PATCH=path.join(ROOT,'coupon-menu-v1681.js');
const NUMBER_PATCH=path.join(ROOT,'drawer-menu-numbering-v1682.js');
const COMPACT_PATCH=path.join(ROOT,'coupon-menu-compact-v1683.js');
const BET_DROPDOWN_PATCH=path.join(ROOT,'coupon-bet-dropdown-v1684.js');
const WINNER_SHARED_PATCH=path.join(ROOT,'winner-path-shared-cache-v1686.js');

for(const f of [BASE,ROUTING_PATCH,MENU_PATCH,NUMBER_PATCH,COMPACT_PATCH,BET_DROPDOWN_PATCH,WINNER_SHARED_PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.8.6] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.8.6] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const routingPatch=fs.readFileSync(ROUTING_PATCH,'utf8');
const menuPatch=fs.readFileSync(MENU_PATCH,'utf8');
const numberPatch=fs.readFileSync(NUMBER_PATCH,'utf8');
const compactPatch=fs.readFileSync(COMPACT_PATCH,'utf8');
const betDropdownPatch=fs.readFileSync(BET_DROPDOWN_PATCH,'utf8');
const winnerSharedPatch=fs.readFileSync(WINNER_SHARED_PATCH,'utf8');
if(!app.includes('COUPON-GATE-ROUTING-V16.7.8')) app += `\n${routingPatch}\n`;
if(!app.includes('COUPON-MENU-V16.8.1')) app += `\n${menuPatch}\n`;
if(!app.includes('DRAWER-MENU-NUMBERING-V16.8.2')) app += `\n${numberPatch}\n`;
if(!app.includes('COUPON-MENU-COMPACT-V16.8.3')) app += `\n${compactPatch}\n`;
if(!app.includes('COUPON-BET-DROPDOWN-V16.8.4')) app += `\n${betDropdownPatch}\n`;
if(!app.includes('WINNER-PATH-SHARED-CACHE-V16.8.6')) app += `\n${winnerSharedPatch}\n`;

for(const token of [
  'FIVE-MODEL-SHARED-CACHE-V16.8.5',
  'devam eden 5 Model hesabı bekleniyor',
  'WINNER-PATH-SHARED-CACHE-V16.8.6',
  'Menü 2 + Kupon aynı Kazanan Yolu kör isteğini paylaşır',
  'rawPersistent:false',
  'ATCouponDecisionV1671',
  'COUPON-MENU-V16.8.1',
  'DRAWER-MENU-NUMBERING-V16.8.2',
  'COUPON-MENU-COMPACT-V16.8.3',
  'COUPON-BET-DROPDOWN-V16.8.4',
  'COUPON-MISSING-RECOVERY-V16.7.4+V16.8.3',
  'couponCenterDialog',
  'couponMenuBtn',
  'coupon-menu-embedded',
  'legacy ana-sayfa routing kapalı',
  '7. Kariyer Excel Dışa Aktarım',
  '8. TJK Yıllık Yarış Arşivi',
  '#couponCenterDialog #betTypes{display:none!important}',
  'dialog içi ilerleme görünür',
  'bahis türleri yalnız 6. Kupon Oluştur içinde inline açılır'
]) {
  if(!app.includes(token)) throw new Error(`[V16.8.6] production bundle doğrulaması başarısız: ${token}`);
}
if(app.indexOf('FIVE-MODEL-SHARED-CACHE-V16.8.5')>app.indexOf('COUPON-DECISION-GATE-V16.7.1')) {
  throw new Error('[V16.8.6] ortak 5 Model cache kupon karar kapısından sonra yüklenmiş.');
}
if(app.indexOf('WINNER-PATH-SHARED-CACHE-V16.8.6')<app.indexOf('WINNER-PATH-DEDICATED-V16.6.9')) {
  throw new Error('[V16.8.6] ortak Kazanan Yolu cache dedicated kör test katmanından önce yüklenmiş.');
}
if(app.includes("attributeFilter:['class','style','aria-hidden']")) {
  throw new Error('[V16.8.6] eski style MutationObserver freeze yolu bundle içinde kaldı.');
}
if(app.includes("document.body.style.setProperty('position','fixed','important')")) {
  throw new Error('[V16.8.6] eski body position:fixed kupon kilidi bundle içinde kaldı.');
}
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
for(const token of ['id="couponMenuBtn"','id="couponCenterDialog"','id="couponSetupV1681"','id="couponAuditHostV1681"','id="tickets"']) {
  if(!html.includes(token)) throw new Error(`[V16.8.6] hamburger kupon HTML eksik: ${token}`);
}
const mainMatch=html.match(/<main>([\s\S]*?)<\/main>/i);
if(!mainMatch) throw new Error('[V16.8.6] <main> bulunamadı.');
for(const forbidden of ['buildAllBtn','betTypes','couponSetupV1681','id="tickets"','KUPON MERKEZİ','OLUŞTURULAN KUPON','manualBetSheetV117']) {
  if(mainMatch[1].includes(forbidden)) throw new Error(`[V16.8.6] ana sayfada kupon kalıntısı var: ${forbidden}`);
}
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16860');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.8.6 build tamamlandı: 5 Model reuse korunur; Menü 2 + Kupon Kazanan Yolu aynı kör istek/cache hattını paylaşır; ham kör payload yalnız RAM; cache v=16860.');
