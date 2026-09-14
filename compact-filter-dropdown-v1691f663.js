/* AT AI Mobil — F60.63 compact açılır çoklu filtreler */
(() => {
'use strict';
if (window.__AT_F6063_COMPACT_FILTER_DROPDOWN__) return;
window.__AT_F6063_COMPACT_FILTER_DROPDOWN__ = true;
const VERSION='COMPACT-FILTER-DROPDOWN-V16.9.1F60.63';

function ensureStyle(){
  if(document.getElementById('f6063CompactDropdownStyle')) return;
  const s=document.createElement('style');
  s.id='f6063CompactDropdownStyle';
  s.textContent=`
  .f62-picks{gap:7px!important}
  .f62-pick{position:relative!important;padding:0!important;overflow:visible!important;background:#0b2436!important}
  .f62-pick>summary{list-style:none;min-height:46px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 13px;border-radius:10px;cursor:pointer;font-size:12px!important;font-weight:800!important;color:#eaf6ff;user-select:none}
  .f62-pick>summary::-webkit-details-marker{display:none}
  .f62-pick>summary:after{content:'⌄';font-size:18px;line-height:1;opacity:.8;transition:transform .16s ease}
  .f62-pick[open]>summary:after{transform:rotate(180deg)}
  .f62-pick[open]{z-index:100}
  .f62-pick>.f62-chips{position:absolute!important;left:0;right:0;top:calc(100% + 4px);z-index:120;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px!important;max-height:290px!important;overflow:auto!important;margin:0!important;padding:10px!important;border:1px solid #315f7f;border-radius:13px;background:#0a1c2b;box-shadow:0 18px 44px #0009}
  .f62-pick .f62-chip{min-height:42px!important;border-radius:12px!important;padding:6px 9px!important;font-size:11px!important;background:#ffffff08!important}
  .f62-pick .f62-chip:has(input:checked){background:#1b4765!important;border-color:#6fb7e7!important}
  .f62-pick .f62-chip input{flex:0 0 auto}
  .f6063-selected-preview{font-weight:500;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58%}
  @media(max-width:560px){
    .f62-pick>.f62-chips{grid-template-columns:1fr 1fr;max-height:260px!important}
    .f62-pick>summary{min-height:48px;font-size:12px!important}
    .f6063-selected-preview{max-width:52%}
  }
  `;
  document.head.appendChild(s);
}

function titleOf(details){
  const summary=details.querySelector(':scope > summary');
  if(!summary) return '';
  if(!details.dataset.f6063Title){
    const raw=(summary.textContent||'').trim();
    details.dataset.f6063Title=(raw.split('·')[0]||raw||'Seçenekler').trim();
  }
  return details.dataset.f6063Title;
}

function refreshSummary(details){
  const summary=details.querySelector(':scope > summary');
  if(!summary) return;
  const title=titleOf(details);
  const checked=[...details.querySelectorAll('.f62-chips input[type="checkbox"]:checked')];
  const all=[...details.querySelectorAll('.f62-chips input[type="checkbox"]')];
  let label='Tümü';
  if(checked.length){
    const names=checked.map(x=>String(x.value||'').trim()).filter(Boolean);
    label=names.length<=2?names.join(', '):`${names.length} seçili`;
  }
  summary.innerHTML=`<span>${title}</span><span class="f6063-selected-preview">${escapeHtml(label)}</span>`;
  summary.setAttribute('aria-label',`${title}: ${label}`);
  if(all.length===1&&checked.length===1) summary.dataset.single='1'; else delete summary.dataset.single;
}

function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

function closeOthers(current){
  document.querySelectorAll('details.f62-pick[open]').forEach(d=>{if(d!==current)d.removeAttribute('open')});
}

function enhance(root=document){
  ensureStyle();
  root.querySelectorAll?.('details.f62-pick').forEach(d=>{
    if(!d.dataset.f6063Enhanced){
      d.dataset.f6063Enhanced='1';
      d.removeAttribute('open');
      d.addEventListener('toggle',()=>{if(d.open)closeOthers(d);refreshSummary(d)});
      d.addEventListener('change',()=>refreshSummary(d));
    }
    refreshSummary(d);
  });
}

ensureStyle();
enhance(document);
const mo=new MutationObserver(ms=>{for(const m of ms){for(const n of m.addedNodes){if(n&&n.nodeType===1)enhance(n)}}});
try{mo.observe(document.documentElement,{subtree:true,childList:true})}catch{}
document.addEventListener('pointerdown',e=>{
  if(e.target.closest?.('details.f62-pick'))return;
  document.querySelectorAll('details.f62-pick[open]').forEach(d=>d.removeAttribute('open'));
},{passive:true});
window.ATF6063CompactDropdown={version:VERSION,enhance};
})();
