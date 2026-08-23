/* AT AI Mobil — V16.6.8 Kör Test İlerleme Göstergesi
   Not: /api/tjk-conditional-v4-blind tek HTTP isteği olduğundan sunucu gerçek yüzde akışı göndermez.
   Bu katman isteğin canlı olduğunu gösterir; yüzde "yaklaşık" olarak işaretlenir ve 95%'te bekler.
*/
(() => {
'use strict';
if (window.__AT_WINNER_PATH_PROGRESS_V1668__) return;
window.__AT_WINNER_PATH_PROGRESS_V1668__ = true;

const VERSION='WINNER-PATH-PROGRESS-V16.6.8';
let timer=null;
let startedAt=0;
let activeHost=null;

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();

function ensureStyle(){
  if($('winnerPathProgressStyleV1668')) return;
  const s=document.createElement('style');
  s.id='winnerPathProgressStyleV1668';
  s.textContent=`
    .wpb-progress-v1668{margin-top:12px;border:1px solid rgba(96,183,255,.22);border-radius:13px;padding:11px;background:rgba(4,15,27,.55)}
    .wpb-progress-head-v1668{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:7px}
    .wpb-progress-head-v1668 b{font-size:14px}.wpb-progress-percent-v1668{font-size:19px;font-weight:900;color:#8fd3ff}
    .wpb-progress-track-v1668{height:9px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08)}
    .wpb-progress-fill-v1668{display:block;height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#32b5ff,#5977ff);transition:width .7s ease}
    .wpb-progress-phase-v1668{margin-top:8px;font-size:12px;color:#d4e7f8;font-weight:700}
    .wpb-progress-foot-v1668{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:5px;font-size:11px;color:#93aac0}
    .wpb-start-note-v1668{margin-top:10px!important;padding:9px 10px;border-radius:10px;background:rgba(82,167,234,.08);border:1px solid rgba(82,167,234,.16)}
    .wpb-done-v1668{color:#78e0a5!important}
  `;
  document.head.appendChild(s);
}

function estimate(ms){
  const sec=ms/1000;
  const spans=[
    [0,5,5,12,'Körlük kilidi ve hedef koşu kontrolü'],
    [5,20,12,28,'Koşacak atların yarış öncesi kariyerleri hazırlanıyor'],
    [20,50,28,48,'Geçmiş kazanan referansları aranıyor'],
    [50,90,48,66,'1. olanların yarış öncesi yolları hazırlanıyor'],
    [90,140,66,80,'Kazanan yolları ile güncel atlar karşılaştırılıyor'],
    [140,190,80,90,'Kronolojik yol puanları ve sıralama hesaplanıyor'],
    [190,230,90,95,'Son kontroller yapılıyor'],
    [230,99999,95,95,'Sunucu yanıtı bekleniyor']
  ];
  for(const [a,b,p0,p1,label] of spans){
    if(sec>=a&&sec<b){
      const t=b>90000?0:Math.max(0,Math.min(1,(sec-a)/(b-a)));
      return {pct:Math.round(p0+(p1-p0)*t),label};
    }
  }
  return {pct:95,label:'Sunucu yanıtı bekleniyor'};
}

function panelHtml(){
  return `<div class="wpb-progress-v1668" data-at-v1668="1">
    <div class="wpb-progress-head-v1668"><b>Kör test çalışıyor</b><span class="wpb-progress-percent-v1668">5%</span></div>
    <div class="wpb-progress-track-v1668"><i class="wpb-progress-fill-v1668"></i></div>
    <div class="wpb-progress-phase-v1668">Körlük kilidi ve hedef koşu kontrolü</div>
    <div class="wpb-progress-foot-v1668"><span>Yaklaşık ilerleme · istek aktif</span><span class="wpb-progress-time-v1668">0 sn</span></div>
  </div>`;
}

function update(){
  if(!activeHost||!document.contains(activeHost)){stop();return;}
  const elapsed=Date.now()-startedAt;
  const x=estimate(elapsed);
  const pctEl=activeHost.querySelector('.wpb-progress-percent-v1668');
  const fill=activeHost.querySelector('.wpb-progress-fill-v1668');
  const phase=activeHost.querySelector('.wpb-progress-phase-v1668');
  const time=activeHost.querySelector('.wpb-progress-time-v1668');
  if(pctEl) pctEl.textContent=`${x.pct}%`;
  if(fill) fill.style.width=`${x.pct}%`;
  if(phase) phase.textContent=x.label;
  if(time) time.textContent=`${Math.floor(elapsed/1000)} sn`;
}
function stop(){
  if(timer){clearInterval(timer);timer=null;}
  activeHost=null;
}
function start(loader){
  if(!loader||loader.dataset.atProgressV1668==='1') return;
  loader.dataset.atProgressV1668='1';
  loader.style.display='none';
  const card=loader.closest('.wpb-card');
  if(!card) return;
  card.insertAdjacentHTML('beforeend',panelHtml());
  activeHost=card.querySelector('.wpb-progress-v1668');
  startedAt=Date.now();
  update();
  if(timer) clearInterval(timer);
  timer=setInterval(update,800);
}
function addStartNote(root=document){
  const title=clean(root.querySelector?.('#dialogTitle')?.textContent||$('dialogTitle')?.textContent);
  if(!/Kazanan Yolu Kör Testi/i.test(title)) return;
  const content=$('analysisContent');
  const first=content?.querySelector('.wpb-card');
  if(first&&!first.querySelector('.wpb-start-note-v1668')&&!content.querySelector('.wpb-rank')){
    const p=document.createElement('p');
    p.className='wpb-start-note-v1668';
    p.innerHTML='Başlamak için yalnız <b>Kör Testi Çalıştır</b> yeterlidir. Öncesinde Güncel Analiz, Kariyer Yol Haritası veya başka bir menüyü çalıştırmanız gerekmez.';
    first.appendChild(p);
  }
}
function markDone(content){
  if(!content?.querySelector('.wpb-rank')) return false;
  stop();
  const chips=content.querySelector('.wpb-card .wpb-chips');
  if(chips&&!chips.querySelector('.wpb-done-v1668')){
    const s=document.createElement('span');
    s.className='wpb-chip wpb-done-v1668';
    s.textContent='100% · Kör test tamamlandı';
    chips.appendChild(s);
  }
  return true;
}
function scan(){
  ensureStyle();
  const content=$('analysisContent');
  if(!content) return;
  if(markDone(content)) return;
  const loader=content.querySelector('.wpb-progress:not([data-at-progress-v1668="1"])');
  if(loader) start(loader);
  addStartNote(document);
  if(content.querySelector('.wpb-bad')&&!content.querySelector('.wpb-progress-v1668')) stop();
}

const obs=new MutationObserver(()=>scan());
try{obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});}catch{}
window.addEventListener('load',()=>setTimeout(scan,50));
ensureStyle();
setTimeout(scan,0);
window.ATWinnerPathProgressV1668={VERSION,scan,estimate};
console.info('[AT AI]',VERSION,'aktif — yaklaşık yüzde + aşama + geçen süre.');
})();
