/* AT AI Mobil — V16.9.1F60.94.7 lightweight Pist/Bakım/Hava menu
   - Opens maintenance controls directly instead of opening the heavy annual archive dialog first.
   - Keeps annual archive and real-race archive separate.
*/
(()=>{
'use strict';
if(window.__AT_TRACK_MAINT_QUICK_F60947__)return;
window.__AT_TRACK_MAINT_QUICK_F60947__=true;
const VERSION='TRACK-MAINT-QUICK-V16.9.1F60.94.7';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mirrorObserver=null;
function currentYear(){return new Date().getFullYear()}
function ensureStyle(){
 if($('tmQuickStyleF60947'))return;
 const s=document.createElement('style');s.id='tmQuickStyleF60947';s.textContent=`
 #tmQuickDialogF60947{width:min(94vw,720px);max-height:92vh;background:#071522;color:#eef7ff;border:1px solid #27445d;border-radius:18px;padding:0;overflow:hidden}
 #tmQuickDialogF60947::backdrop{background:rgba(0,0,0,.7)}
 .tmq-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #21384b;position:sticky;top:0;background:#071522;z-index:2}
 .tmq-body{padding:16px;overflow:auto;max-height:78vh}.tmq-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tmq-body input,.tmq-body button{width:100%;box-sizing:border-box}.tmq-body input{margin-top:5px;min-height:44px;background:#081a2a;color:#eef7ff;border:1px solid #31506a;border-radius:10px;padding:8px 10px}.tmq-body button{min-height:46px;margin-top:9px;border-radius:11px}.tmq-note{font-size:12px;line-height:1.55;opacity:.82}.tmq-status{font-size:12px;line-height:1.5;margin-top:9px}.tmq-bar{height:6px;background:rgba(255,255,255,.09);border-radius:99px;overflow:hidden;margin-top:10px}.tmq-bar>i{display:block;height:100%;width:0;background:currentColor;opacity:.65;transition:width .2s}
 `;document.head.appendChild(s)
}
function ensureDialog(){
 let d=$('tmQuickDialogF60947');if(d)return d;ensureStyle();
 const y=currentYear();d=document.createElement('dialog');d.id='tmQuickDialogF60947';
 d.innerHTML=`<div class="tmq-head"><div><div style="font-size:11px;font-weight:900;letter-spacing:.11em;color:#72d5ff">AT AI ARŞİV</div><h2 style="margin:4px 0 0">Pist / Bakım / Hava Arşivi</h2></div><button id="tmQuickCloseF60947" type="button" style="width:44px;min-height:44px;margin:0;border:0;background:#15314a;color:white;font-size:22px">✕</button></div><div class="tmq-body"><div class="tmq-note">Bu pencere yalnız Pist/Bakım/Hava verisini yönetir. Yıllık Yarış Arşivi açılmaz. Sıcaklık, nem, basınç, gökyüzü, rüzgâr ve bakım kayıtları Derece-Hız modeline aktarılır.</div><div class="tmq-grid" style="margin-top:12px"><label>Başlangıç yılı<input id="tmQuickFromF60947" type="number" inputmode="numeric" min="1800" max="9999" step="1" value="${Math.max(1800,y-5)}"></label><label>Bitiş yılı<input id="tmQuickToF60947" type="number" inputmode="numeric" min="1800" max="9999" step="1" value="${y}"></label></div><button id="tmQuickBackfillF60947" class="primary" type="button">Seçili Yılları Bir Kez İndir</button><button id="tmQuickNowF60947" type="button">Bugüne Kadar Eksikleri Güncelle</button><div class="tmq-bar"><i id="tmQuickBarF60947"></i></div><div id="tmQuickStatusF60947" class="tmq-status">Hazır.</div><div id="tmQuickMetaF60947" class="tmq-status" style="opacity:.78"></div></div>`;
 document.body.appendChild(d);
 $('tmQuickCloseF60947').onclick=()=>d.close();
 $('tmQuickBackfillF60947').onclick=()=>void runBackfill();
 $('tmQuickNowF60947').onclick=()=>void runNow();
 return d
}
function setBusy(on,text=''){
 for(const id of['tmQuickBackfillF60947','tmQuickNowF60947']){const b=$(id);if(b)b.disabled=!!on}
 if(text&&$('tmQuickStatusF60947'))$('tmQuickStatusF60947').textContent=text
}
function syncMirror(){
 const status=$('tmStatusF6089'),bar=$('tmBarF6089'),meta=$('tmMetaF6089');
 if(status&&$('tmQuickStatusF60947'))$('tmQuickStatusF60947').textContent=status.textContent||'Hazır.';
 if(bar&&$('tmQuickBarF60947'))$('tmQuickBarF60947').style.width=bar.style.width||'0%';
 if(meta&&$('tmQuickMetaF60947'))$('tmQuickMetaF60947').innerHTML=meta.innerHTML||'';
}
function mirror(){
 try{mirrorObserver?.disconnect()}catch{}
 const host=$('trackMaintenanceSectionF6089');
 if(host){mirrorObserver=new MutationObserver(syncMirror);mirrorObserver.observe(host,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style']})}
 syncMirror()
}
async function runBackfill(){
 const api=window.ATTrackMaintenanceV1;if(!api?.backfillYears){setBusy(false,'Pist bakım motoru hazır değil.');return}
 const a=$('tmQuickFromF60947')?.value,b=$('tmQuickToF60947')?.value;setBusy(true,`${a}–${b} pist/bakım/hava arşivi hazırlanıyor…`);
 try{await api.backfillYears(a,b);syncMirror();if($('tmQuickStatusF60947')&&!$('tmQuickStatusF60947').textContent) $('tmQuickStatusF60947').textContent='Tamamlandı.'}
 catch(e){$('tmQuickStatusF60947').textContent='Hata: '+(e?.message||e)}finally{setBusy(false)}
}
async function runNow(){
 const api=window.ATTrackMaintenanceV1;if(!api?.autoSync){setBusy(false,'Pist bakım motoru hazır değil.');return}
 let date='';try{date=(typeof state!=='undefined'&&state?.date)||$('raceDate')?.value||new Date().toISOString().slice(0,10)}catch{date=new Date().toISOString().slice(0,10)}
 setBusy(true,`${date} tarihine kadar eksikler güncelleniyor…`);
 try{await api.autoSync(date);syncMirror()}catch(e){$('tmQuickStatusF60947').textContent='Hata: '+(e?.message||e)}finally{setBusy(false)}
}
function closeDrawer(){try{if(typeof window.closeDrawer==='function')window.closeDrawer()}catch{}try{$('drawer')?.classList.remove('open');$('drawer')?.setAttribute('aria-hidden','true');$('overlay')?.classList.remove('show')}catch{}}
function openQuick(){closeDrawer();const d=ensureDialog();mirror();if(!d.open)d.showModal();return true}
function bind(){const b=$('trackMaintenanceMenuBtnF60944');if(!b)return false;b.onclick=e=>{e.preventDefault();e.stopPropagation();openQuick()};b.dataset.quickMaintenanceVersion=VERSION;return true}
for(const ms of[0,80,300,900,1800])setTimeout(bind,ms);
document.addEventListener('click',e=>{if(e.target?.closest?.('#menuBtn'))setTimeout(bind,0)},true);
window.ATTrackMaintenanceQuickF60947={version:VERSION,open:openQuick,bind};
console.info('[AT AI]',VERSION,'active — maintenance opens directly without annual archive.');
})();