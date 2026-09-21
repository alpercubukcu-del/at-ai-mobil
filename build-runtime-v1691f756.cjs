const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f755.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.36] base builder missing');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

// F60.94.31.22/23/24 eski Yıllık Yarış Arşivi düğmesini menü 8'e yönlendirmişti.
// Menü 7'nin görünümü ve işlevi F60.94.31.18'deki ATAnnualArchiveV13 ekranına geri döner.
// Yıllık katalog kaynağı ise F60.94.31.34 köprüsüyle TJK Koşu Sorgulama olarak kalır.
app=app.replaceAll('7. Tarihsel Sonuç Arşivi · Koşu Sorgulama','7. Yıllık Yarış Arşivi');

const F22='/* AT AI Mobil - F60.94.31.22 home/menu freeze hotfix */';
const F23='/* AT AI Mobil - F60.94.31.23 analysis menu order + missing menu 8 fix */';
const F24='/* AT AI Mobil - F60.94.31.24 analysis menu dedupe + late mutation guard */';
const f22s=app.indexOf(F22),f23s=app.indexOf(F23),f24s=app.indexOf(F24);
if(f22s<0||f23s<0||f24s<0)throw new Error('[F60.94.31.36] inherited menu patches not found');

let f22=app.slice(f22s,f23s);
const wrong22='window.ATArchiveHubMenu8F609418?.open?.()';
if(!f22.includes(wrong22))throw new Error('[F60.94.31.36] F22 wrong route missing');
f22=f22.replace(wrong22,'window.ATAnnualArchiveV13?.open?.()');
app=app.slice(0,f22s)+f22+app.slice(f23s);

const n23=app.indexOf(F23),n24=app.indexOf(F24,n23);
let f23=app.slice(n23,n24);
const openStart=f23.indexOf('function openArchiveHub(history=false){');
const wireStart=f23.indexOf('function wire(el,history){',openStart);
if(openStart<0||wireStart<0)throw new Error('[F60.94.31.36] F23 openArchiveHub scope missing');
const restoredOpen=`function openArchiveHub(history=false){
  try{window.closeDrawer?.()}catch{}
  setTimeout(()=>{
    try{
      if(history)window.ATAnnualArchiveV13?.open?.();
      else window.ATArchiveHubMenu8F609418?.open?.();
    }catch(e){console.warn('[AT AI F60.94.31.36] archive menu open',e)}
  },0);
}
`;
f23=f23.slice(0,openStart)+restoredOpen+f23.slice(wireStart);
app=app.slice(0,n23)+f23+app.slice(n24);

const bridge=`\n/* AT AI Mobil - F60.94.31.36 full annual archive restore bridge */\n(()=>{\n'use strict';\nif(window.__AT_F18_ANNUAL_FULL_RESTORE_F60943136__)return;\nwindow.__AT_F18_ANNUAL_FULL_RESTORE_F60943136__=true;\nconst label='7. Yıllık Yarış Arşivi';\nfunction annualButton(){return document.getElementById('annualArchiveHistoryBtnF60943123')||document.getElementById('annualArchiveBtnSafeF60943122')||document.getElementById('annualArchiveBtn')||[...document.querySelectorAll('button')].find(b=>String(b.textContent||'').trim().startsWith('7. '));}\nfunction normalize(){\n const b=annualButton();if(b&&b.textContent!==label)b.textContent=label;\n const title=document.querySelector('#annualArchiveDialog h2,#annualArchiveDialog .aa-title,h2#aaTitle');if(title&&/Tarihsel Sonuç|Yıllık Yarış Arşivi/i.test(title.textContent||''))title.textContent='Yıllık Yarış Arşivi';\n const u=document.getElementById('aaUpdateYear');if(u)u.textContent='Seçili Yılı Koşu Sorgulamadan Güncelle';\n}\nfunction open(){try{window.closeDrawer?.()}catch{}requestAnimationFrame(()=>requestAnimationFrame(()=>{try{window.ATAnnualArchiveV13?.open?.();normalize();}catch(e){console.warn('[AT AI F60.94.31.36] annual open',e)}}));}\nfor(const ms of[0,80,250,700,1600,3200])setTimeout(normalize,ms);\ndocument.addEventListener('click',e=>{const b=e.target?.closest?.('#annualArchiveHistoryBtnF60943123,#annualArchiveBtnSafeF60943122,#annualArchiveBtn');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();open();},true);\nwindow.addEventListener('at-ai:annual-archive-open',normalize);\nwindow.ATF18AnnualFullRestoreF60943136={open,normalize};\nconsole.info('[AT AI] F60.94.31.36 active - exact annual archive UI restored; Koşu Sorgulama source retained.');\n})();\n`;
app+='\n'+bridge+'\n';

app=app.replaceAll('F60.94.31.35 · F18-ANNUAL-OPEN-RESTORE','F60.94.31.36 · F18-ANNUAL-FULL-RESTORE');

for(const token of[
 'window.ATAnnualArchiveV13',
 '/api/tjk-race-query-v1',
 'TJK_KOSU_SORGULAMA',
 '/api/tjk-day-results-v1',
 '7. Yıllık Yarış Arşivi',
 'AT_F18_ANNUAL_FULL_RESTORE_F60943136',
 'F60.94.31.36 · F18-ANNUAL-FULL-RESTORE'
])if(!app.includes(token))throw new Error('[F60.94.31.36] invariant missing '+token);

const check23s=app.indexOf(F23),check24s=app.indexOf(F24,check23s),check23=app.slice(check23s,check24s);
if(!check23.includes('if(history)window.ATAnnualArchiveV13?.open?.()'))throw new Error('[F60.94.31.36] F23 annual route not restored');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8')
 .replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1693006')
 .replaceAll('F60.94.31.35','F60.94.31.36');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1693006'))throw new Error('[F60.94.31.36] cache bust failed');
console.log('[AT AI] F60.94.31.36 build complete: F60.94.31.18 annual archive screen restored; annual catalog remains sourced from TJK Koşu Sorgulama.');
