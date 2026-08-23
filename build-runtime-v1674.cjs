const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1673.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const PATCH=path.join(ROOT,'coupon-missing-data-recovery-v1674.js');

for(const f of [BASE,PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.7.4] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX]) if(!fs.existsSync(f)) throw new Error(`[V16.7.4] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

let app=fs.readFileSync(APP,'utf8');
const patch=fs.readFileSync(PATCH,'utf8');
if(!app.includes('COUPON-MISSING-RECOVERY-V16.7.4')) app += `\n${patch}\n`;
if(!app.includes('COUPON-MISSING-RECOVERY-V16.7.4')||!app.includes('robustCategory')||!app.includes('tek hata zinciri durdurmaz')) throw new Error('[V16.7.4] eksik veri recovery production bundle içine girmedi.');

const couponTypePatch=String.raw`
/* AT AI Mobil — V16.7.5 Kupon tipi tek seçim + görünür geri bildirim */
(()=>{
'use strict';
if(window.__AT_COUPON_TYPE_V1675__)return;window.__AT_COUPON_TYPE_V1675__=true;
const VER='COUPON-TYPE-SELECTION-V16.7.5',KEY='at_ai_selected_bet_type_v1675';
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function inputs(){return [...document.querySelectorAll('#betTypes .bet-check')];}
function saved(){try{return clean(localStorage.getItem(KEY)||'');}catch{return'';}}
function store(v){try{localStorage.setItem(KEY,v);}catch{}}
function style(){if(document.getElementById('betTypeStyleV1675'))return;const s=document.createElement('style');s.id='betTypeStyleV1675';s.textContent='#betTypes .bet-card{position:relative;transition:.16s ease}#betTypes .bet-card.bet-selected-v1675{border-color:#42c9ff!important;background:linear-gradient(180deg,rgba(37,143,204,.30),rgba(13,63,99,.34))!important;box-shadow:0 0 0 2px rgba(66,201,255,.15) inset}#betTypes .bet-card.bet-selected-v1675:after{content:"✓ SEÇİLDİ";position:absolute;right:8px;top:7px;font-size:9px;font-weight:900;color:#9af0c8;background:rgba(7,86,58,.84);border-radius:999px;padding:3px 6px}#betTypeStatusV1675{margin:9px 0 0;padding:9px 11px;border:1px solid rgba(90,190,255,.24);border-radius:12px;background:rgba(18,57,86,.30);font-size:12px;color:#cfe7f7}#betTypeStatusV1675 b{color:#8be3ff}';document.head.appendChild(s);}
function status(){const box=document.getElementById('betTypes');if(!box)return;let el=document.getElementById('betTypeStatusV1675');if(!el){el=document.createElement('div');el.id='betTypeStatusV1675';box.insertAdjacentElement('afterend',el);}const x=inputs().find(i=>i.checked);el.innerHTML=x?'<b>Seçili kupon:</b> '+clean(x.value)+' · Kupon Oluştur’a dokun.':'<b>Kupon tipi seçilmedi.</b> Oynamak istediğin kupon türüne dokun.';const b=document.getElementById('buildAllBtn');if(b)b.textContent=x?'Kupon Oluştur · '+clean(x.value):'Kupon Oluştur';}
function paint(){for(const x of inputs())x.closest('.bet-card')?.classList.toggle('bet-selected-v1675',!!x.checked);status();}
function choose(input){if(!input)return;for(const x of inputs())x.checked=x===input;store(clean(input.value));paint();}
function normalize(){const all=inputs();if(!all.length)return;const v=saved();const hit=v&&all.find(x=>clean(x.value)===v);if(hit)choose(hit);else{for(const x of all)x.checked=false;paint();}}
document.addEventListener('click',e=>{const card=e.target?.closest?.('#betTypes .bet-card');if(!card)return;const input=card.querySelector('.bet-check');if(!input)return;e.preventDefault();e.stopPropagation();choose(input);},true);
const mo=new MutationObserver(ms=>{if(ms.some(m=>m.type==='childList'&&(m.target?.id==='betTypes'||m.target?.closest?.('#betTypes'))))requestAnimationFrame(normalize);});try{mo.observe(document.documentElement,{subtree:true,childList:true});}catch{}
style();requestAnimationFrame(()=>requestAnimationFrame(normalize));
window.ATCouponTypeV1675={VERSION:VER,choose,normalize};console.info('[AT AI]',VER,'aktif — kupon tipi tek seçim ve görünür geri bildirim.');
})();
`;
if(!app.includes('COUPON-TYPE-SELECTION-V16.7.5')) app += `\n${couponTypePatch}\n`;
if(!app.includes('COUPON-TYPE-SELECTION-V16.7.5')||!app.includes('bet-selected-v1675')) throw new Error('[V16.7.5] kupon tipi seçim düzeltmesi production bundle içine girmedi.');
new Function(app);
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16750');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.7.5 build tamamlandı: Kupon tipi Android tek dokunuşla tek seçim olur; seçim görünür ve Kupon Oluştur düğmesinde yazılır.');
