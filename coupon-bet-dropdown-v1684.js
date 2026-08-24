/* AT AI Mobil — V16.8.4 Kupon içi bahis türü açılır listesi
   - Eski body alt-sheet tamamen devre dışı.
   - Bahis türleri yalnız 6. Kupon Oluştur dialogu içinde, seçici satırının hemen altında açılır.
   - Ana sayfaya hiçbir bahis sheet/overlay eklenmez.
   - Bahis başlangıcı ve kupon hesaplama mantığı değişmez.
*/
(() => {
'use strict';
if(window.__AT_COUPON_BET_DROPDOWN_V1684__) return;
window.__AT_COUPON_BET_DROPDOWN_V1684__=true;
const VERSION='COUPON-BET-DROPDOWN-V16.8.4';
const DIALOG_ID='couponCenterDialog';
const BTN_ID='manualBetTypeBtnV117';
const DROP_ID='manualBetDropdownV1684';
const STYLE_ID='manualBetDropdownStyleV1684';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function installStyle(){
  if($(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
#${DIALOG_ID} #${DROP_ID}{
  display:none;position:relative;width:calc(100% - 16px);margin:-1px 8px 7px;
  border:1px solid rgba(114,213,255,.28);border-radius:0 0 12px 12px;
  background:#091a2a;overflow:hidden;box-shadow:0 12px 28px rgba(0,0,0,.26);z-index:5;
}
#${DIALOG_ID} #${DROP_ID}.open{display:block}
#${DIALOG_ID} #${DROP_ID} .bet-drop-status-v1684{padding:9px 10px;font-size:10px;color:#91a9c2}
#${DIALOG_ID} #${DROP_ID} .bet-drop-list-v1684{max-height:300px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
#${DIALOG_ID} #${DROP_ID} .bet-drop-row-v1684{
  width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;
  border:0;border-top:1px solid rgba(255,255,255,.07);border-radius:0;
  background:#0b1d2e;color:#eaf6ff;padding:10px 11px;text-align:left;min-height:50px;
}
#${DIALOG_ID} #${DROP_ID} .bet-drop-row-v1684:first-child{border-top:0}
#${DIALOG_ID} #${DROP_ID} .bet-drop-row-v1684.selected{background:rgba(45,142,202,.22)}
#${DIALOG_ID} #${DROP_ID} .bet-drop-row-v1684 b{display:block;font-size:13px;line-height:1.2}
#${DIALOG_ID} #${DROP_ID} .bet-drop-row-v1684 small{display:block;margin-top:3px;font-size:9px;color:#8faac3;line-height:1.25}
#${DIALOG_ID} #${DROP_ID} .bet-drop-row-v1684>span{font-size:17px;color:#72d5ff;flex:0 0 auto}
#${DIALOG_ID} #${BTN_ID}[aria-expanded="true"]{background:rgba(114,213,255,.06)!important}
#${DIALOG_ID} #${BTN_ID}[aria-expanded="true"]>strong,
#${DIALOG_ID} #${BTN_ID}[aria-expanded="true"] .manual-bet-chevron-v1113{transform:rotate(180deg)}
`;
  document.head.appendChild(s);
}

function cleanupLegacy(){
  try{$('manualBetSheetV117')?.remove();document.body?.classList.remove('manual-sheet-open-v117');}catch{}
}
function syncHiddenBet(value){
  const v=String(value||'').trim();
  if(!v) return;
  const inputs=[...document.querySelectorAll('#betTypes .bet-check')];
  const input=inputs.find(x=>String(x.value||'').trim()===v);
  if(!input) return;
  try{
    if(window.ATCouponTypeV1675?.choose) window.ATCouponTypeV1675.choose(input);
    else{
      for(const x of inputs)x.checked=x===input;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }catch{}
}
function ensureDrop(){
  installStyle();cleanupLegacy();
  const btn=$(BTN_ID);if(!btn||!btn.closest(`#${DIALOG_ID}`)) return null;
  let drop=$(DROP_ID);
  if(!drop){drop=document.createElement('div');drop.id=DROP_ID;drop.setAttribute('aria-label','Bahis türleri');btn.insertAdjacentElement('afterend',drop);}
  return drop;
}
function closeDrop(){
  const d=$(DROP_ID);if(d)d.classList.remove('open');
  const b=$(BTN_ID);if(b)b.setAttribute('aria-expanded','false');
}
async function openDrop(){
  cleanupLegacy();
  const dialog=$(DIALOG_ID);if(!dialog?.open) return;
  const btn=$(BTN_ID),drop=ensureDrop();if(!btn||!drop)return;
  if(drop.classList.contains('open')){closeDrop();return;}
  btn.setAttribute('aria-expanded','true');drop.classList.add('open');
  drop.innerHTML='<div class="bet-drop-status-v1684">TJK resmi bahis başlangıçları okunuyor…</div>';
  let bets=[];
  try{bets=typeof availableBetsV117==='function'?await availableBetsV117():[];}catch(e){drop.innerHTML=`<div class="bet-drop-status-v1684">${esc(e?.message||'Bahis türleri alınamadı.')}</div>`;return;}
  if(!drop.classList.contains('open'))return;
  if(!bets.length){drop.innerHTML='<div class="bet-drop-status-v1684">Bu programda desteklenen resmi çoklu bahis başlangıcı bulunamadı.</div>';return;}
  drop.innerHTML=`<div class="bet-drop-list-v1684">${bets.map(({type,plan})=>`<button type="button" class="bet-drop-row-v1684 ${type===manualTicketV117.betType?'selected':''}" data-inline-bet-v1684="${esc(type)}"><div><b>${esc(type)}</b><small>${esc(plan.startRace)}. koşudan başlar · ${esc(typeof legRangeTextV117==='function'?legRangeTextV117(plan):'')}</small></div><span>›</span></button>`).join('')}</div>`;
}
async function choose(btn){
  const value=btn?.dataset?.inlineBetV1684||'';if(!value)return;
  manualTicketV117.betType=value;
  syncHiddenBet(value);
  closeDrop();
  try{await prepareManualTicketV117(true);}catch(e){console.warn('[AT AI]',VERSION,'bahis hazırlama',e?.message||e);}
}
function bind(){
  installStyle();cleanupLegacy();
  const btn=$(BTN_ID);if(!btn||!btn.closest(`#${DIALOG_ID}`))return;
  btn.setAttribute('aria-haspopup','listbox');
  if(!btn.hasAttribute('aria-expanded'))btn.setAttribute('aria-expanded','false');
  ensureDrop();
}

// Eski onclick body alt-sheet açmadan önce capture aşamasında sahiplen.
document.addEventListener('click',e=>{
  const btn=e.target?.closest?.(`#${DIALOG_ID} #${BTN_ID}`);
  if(btn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void openDrop();return;}
  const row=e.target?.closest?.(`#${DIALOG_ID} [data-inline-bet-v1684]`);
  if(row){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void choose(row);return;}
  if($(DROP_ID)?.classList.contains('open')&&!e.target?.closest?.(`#${DROP_ID}`))closeDrop();
},true);

// Eski fonksiyon çağrıları da artık inline listeye yönlenir.
try{openBetSheetV117=openDrop;closeBetSheetV117=closeDrop;}catch{}

const mo=new MutationObserver(()=>{cleanupLegacy();bind();});
try{mo.observe(document.documentElement,{subtree:true,childList:true});}catch{}
bind();
window.addEventListener('pageshow',()=>{cleanupLegacy();bind();},{passive:true});
window.__AT_COUPON_BET_DROPDOWN_VERSION__=VERSION;
console.info('[AT AI]',VERSION,'aktif — bahis türleri yalnız 6. Kupon Oluştur içinde inline açılır.');
})();
