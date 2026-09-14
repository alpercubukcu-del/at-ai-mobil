/* AT AI Mobil — F60.63 select-style açılır çoklu filtreler */
(() => {
'use strict';
if (window.__AT_F6063_COMPACT_FILTER_DROPDOWN__) return;
window.__AT_F6063_COMPACT_FILTER_DROPDOWN__ = true;
const VERSION='COMPACT-FILTER-DROPDOWN-V16.9.1F60.63';

function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

function ensureStyle(){
  if(document.getElementById('f6063CompactDropdownStyle')) return;
  const s=document.createElement('style');
  s.id='f6063CompactDropdownStyle';
  s.textContent=`
  .f62-picks{display:grid!important;gap:13px!important;overflow:visible!important}
  .f62-pick{position:relative!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;overflow:visible!important;z-index:1}
  .f62-pick[open]{z-index:300!important}
  .f6063-filter-label{display:block;margin:0 0 7px 2px;font-size:12px;font-weight:800;line-height:1.2;color:#d7e4ee}
  .f62-pick>summary{list-style:none!important;min-height:54px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;gap:8px!important;padding:7px 44px 7px 12px!important;border:1px solid #35516a!important;border-radius:16px!important;background:#0d1d2b!important;color:#eef7ff!important;cursor:pointer!important;user-select:none!important;position:relative!important;overflow:hidden!important}
  .f62-pick>summary::-webkit-details-marker{display:none!important}
  .f62-pick>summary:after{content:'⌄';position:absolute;right:15px;top:50%;transform:translateY(-52%);font-size:22px;line-height:1;color:#8fa8bd;transition:transform .16s ease}
  .f62-pick[open]>summary:after{transform:translateY(-48%) rotate(180deg)}
  .f6063-summary-values{display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;overflow:hidden;white-space:nowrap}
  .f6063-summary-chip{display:inline-flex;align-items:center;max-width:150px;min-height:31px;padding:4px 11px;border:1px solid #49627a;border-radius:13px;background:#1b2d3e;color:#eaf4fb;font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .f6063-summary-more{font-size:11px;font-weight:800;color:#b9cad7;white-space:nowrap}
  .f6063-summary-all{font-size:11px;font-weight:700;color:#9fb3c3}
  .f62-pick>.f62-chips{position:absolute!important;left:0!important;right:0!important;top:calc(100% + 6px)!important;z-index:400!important;display:block!important;max-height:355px!important;overflow-y:auto!important;overscroll-behavior:contain!important;margin:0!important;padding:8px!important;border:1px solid #40576b!important;border-radius:18px!important;background:#0f1d29!important;box-shadow:0 18px 48px rgba(0,0,0,.55)!important}
  .f62-pick .f62-chip,.f6063-all-row{display:flex!important;align-items:center!important;gap:12px!important;min-height:54px!important;box-sizing:border-box!important;width:100%!important;margin:0!important;padding:8px 12px!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#c9d6e0!important;font-size:13px!important;font-weight:600!important;line-height:1.25!important;cursor:pointer!important;text-align:left!important}
  .f62-pick .f62-chip+ .f62-chip{margin-top:2px!important}
  .f62-pick .f62-chip:hover,.f6063-all-row:hover{background:#ffffff08!important}
  .f62-pick .f62-chip:has(input:checked){background:#ffffff0d!important;color:#f3f8fc!important}
  .f6063-all-row{border-bottom:1px solid #ffffff12!important;border-radius:10px 10px 4px 4px!important;margin-bottom:5px!important;color:#e4edf4!important;font-size:14px!important}
  .f62-pick .f62-chip input,.f6063-all-row input{appearance:none!important;-webkit-appearance:none!important;flex:0 0 auto!important;width:24px!important;height:24px!important;margin:0!important;border:2px solid #718497!important;border-radius:6px!important;background:#111c25!important;position:relative!important;display:grid!important;place-items:center!important}
  .f62-pick .f62-chip input:checked,.f6063-all-row input:checked{border-color:#83b8e3!important;background:#315e82!important}
  .f62-pick .f62-chip input:checked:after,.f6063-all-row input:checked:after{content:'✓';font-size:17px;font-weight:900;line-height:1;color:#fff!important}
  .f6063-all-row input:indeterminate{border-color:#83b8e3!important;background:#315e82!important}
  .f6063-all-row input:indeterminate:after{content:'−';font-size:18px;font-weight:900;line-height:1;color:#fff!important}
  @media(max-width:560px){
    .f62-picks{gap:14px!important}
    .f6063-filter-label{font-size:12px!important}
    .f62-pick>summary{min-height:56px!important;border-radius:17px!important;padding-left:12px!important}
    .f62-pick>.f62-chips{max-height:min(54vh,390px)!important;border-radius:18px!important;padding:8px!important}
    .f62-pick .f62-chip,.f6063-all-row{min-height:56px!important;font-size:13px!important;padding:9px 12px!important}
    .f6063-summary-chip{max-width:130px!important}
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

function optionInputs(details){
  return [...details.querySelectorAll(':scope > .f62-chips input[type="checkbox"]')].filter(x=>!x.dataset.f6063All);
}

function ensureSelectAll(details){
  const chips=details.querySelector(':scope > .f62-chips');
  if(!chips || chips.querySelector('[data-f6063-all-row]')) return;
  const row=document.createElement('label');
  row.className='f6063-all-row';
  row.dataset.f6063AllRow='1';
  row.innerHTML='<input type="checkbox" data-f6063-all="1"><span>Tümünü Seç</span>';
  chips.prepend(row);
  const all=row.querySelector('input');
  all.addEventListener('change',e=>{
    const checked=Boolean(e.target.checked);
    const opts=optionInputs(details);
    for(const input of opts){
      if(input.checked===checked) continue;
      input.checked=checked;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    syncSelectAll(details);
    refreshSummary(details);
  });
}

function syncSelectAll(details){
  const all=details.querySelector('[data-f6063-all]');
  if(!all) return;
  const opts=optionInputs(details);
  const count=opts.filter(x=>x.checked).length;
  all.checked=Boolean(opts.length && count===opts.length);
  all.indeterminate=Boolean(count && count<opts.length);
}

function ensureStructure(details){
  const summary=details.querySelector(':scope > summary');
  if(!summary) return;
  const title=titleOf(details);
  if(!details.querySelector(':scope > .f6063-filter-label')){
    const label=document.createElement('div');
    label.className='f6063-filter-label';
    label.textContent=title;
    details.insertBefore(label,summary);
  }
  ensureSelectAll(details);
}

function refreshSummary(details){
  const summary=details.querySelector(':scope > summary');
  if(!summary) return;
  ensureStructure(details);
  const title=titleOf(details);
  const checked=optionInputs(details).filter(x=>x.checked);
  let html='';
  if(!checked.length){
    html='<span class="f6063-summary-all">TÜMÜ</span>';
  }else{
    const names=checked.map(x=>String(x.value||'').trim()).filter(Boolean);
    const visible=names.slice(0,2);
    html=`<span class="f6063-summary-values">${visible.map(name=>`<span class="f6063-summary-chip">${escapeHtml(name)}</span>`).join('')}${names.length>2?`<span class="f6063-summary-more">+${names.length-2}</span>`:''}</span>`;
  }
  summary.innerHTML=html;
  summary.setAttribute('aria-label',`${title}: ${checked.length?checked.map(x=>x.value).join(', '):'Tümü'}`);
  syncSelectAll(details);
}

function closeOthers(current){
  document.querySelectorAll('details.f62-pick[open]').forEach(d=>{if(d!==current)d.removeAttribute('open')});
}

function enhance(root=document){
  ensureStyle();
  const nodes=[];
  if(root?.matches?.('details.f62-pick')) nodes.push(root);
  root.querySelectorAll?.('details.f62-pick').forEach(d=>nodes.push(d));
  nodes.forEach(d=>{
    ensureStructure(d);
    if(!d.dataset.f6063Enhanced){
      d.dataset.f6063Enhanced='1';
      d.removeAttribute('open');
      d.addEventListener('toggle',()=>{
        if(d.open) closeOthers(d);
        refreshSummary(d);
      });
      d.addEventListener('change',e=>{
        if(!e.target?.matches?.('input[type="checkbox"]')) return;
        syncSelectAll(d);
        refreshSummary(d);
      });
    }
    refreshSummary(d);
  });
}

ensureStyle();
enhance(document);
const mo=new MutationObserver(ms=>{
  for(const m of ms){
    for(const n of m.addedNodes){if(n&&n.nodeType===1)enhance(n)}
  }
});
try{mo.observe(document.documentElement,{subtree:true,childList:true})}catch{}
document.addEventListener('pointerdown',e=>{
  if(e.target.closest?.('details.f62-pick'))return;
  document.querySelectorAll('details.f62-pick[open]').forEach(d=>d.removeAttribute('open'));
},{passive:true});
window.ATF6063CompactDropdown={version:VERSION,enhance,refreshSummary};
})();
