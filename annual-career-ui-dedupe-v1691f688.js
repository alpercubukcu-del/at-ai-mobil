/* AT AI Mobil — F60.88 Yıllık Arşiv Kariyer seçim ekranı tekleştirme */
(() => {
'use strict';
if (window.__AT_F6088_ANNUAL_CAREER_UI_DEDUPE__) return;
window.__AT_F6088_ANNUAL_CAREER_UI_DEDUPE__ = true;

const VERSION='ANNUAL-CAREER-UI-DEDUPE-V16.9.1F60.88';
const $=id=>document.getElementById(id);

function selectionSet(){
  return window.ATAnnualArchiveV13?.selectionSet || window.__AT_AA_SELECTED_IDS_V134__ || null;
}
function updateBatchState(){
  const host=$('f6088BatchState');
  if(!host)return;
  const shown=[...document.querySelectorAll('#f62aaList [data-f62-row]')];
  const selected=shown.filter(x=>x.checked).length;
  const total=selectionSet()?.size||0;
  host.textContent=`Gösterilen ${shown.length} yarış · gösterilende ${selected} seçili · toplam ${total} seçili`;
}
function applyShown(checked){
  const sel=selectionSet();
  for(const box of document.querySelectorAll('#f62aaList [data-f62-row]')){
    box.checked=checked;
    if(sel){ checked ? sel.add(box.dataset.f62Row) : sel.delete(box.dataset.f62Row); }
  }
  updateBatchState();
}
function clearAll(){
  selectionSet()?.clear?.();
  document.querySelectorAll('#f62aaList [data-f62-row]').forEach(x=>x.checked=false);
  updateBatchState();
  const st=$('f62aaStatus');if(st)st.textContent='Tüm tarihsel yarış seçimleri temizlendi.';
}
function install(){
  const sec=$('f62ArchiveSearch');
  if(!sec)return false;

  // F60.62 düğmesi gerçek kullanıcı düğmesidir; alttaki V14 düğmesi yalnız mevcut motor köprüsü olarak DOM'da kalır.
  const run=$('f62aaRun');
  if(run){
    run.textContent='Seçilen Yarışlarla Kariyer Analizi';
    run.classList.add('aa-btn','warn');
  }

  // Eski V14 sonuç bloğunu kullanıcıdan kaldır. İçindeki aaRunSelected DOM'da kalır ki F60.62 mevcut motoru aynen çağırabilsin.
  const oldRun=$('aaRunSelected');
  const oldSection=oldRun?.closest?.('.aa-section');
  if(oldSection){
    oldSection.dataset.f6088LegacySelection='1';
    oldSection.style.display='none';
  }

  let tools=$('f6088SelectionTools');
  if(!tools){
    tools=document.createElement('div');
    tools.id='f6088SelectionTools';
    tools.style.marginTop='10px';
    tools.innerHTML=`
      <div class="f62-actions">
        <button class="f62-btn" id="f6088SelectShown" type="button">Gösterilenleri Seç</button>
        <button class="f62-btn" id="f6088UnselectShown" type="button">Gösterilenlerin Seçimini Kaldır</button>
      </div>
      <button class="f62-btn" id="f6088ClearAll" type="button" style="width:100%;margin-top:8px">Tüm Seçimleri Kaldır</button>
      <div id="f6088BatchState" class="f62-status">Gösterilen 0 yarış · toplam 0 seçili</div>`;
    const list=$('f62aaList');
    if(list) list.insertAdjacentElement('afterend',tools);
    $('f6088SelectShown')?.addEventListener('click',()=>applyShown(true));
    $('f6088UnselectShown')?.addEventListener('click',()=>applyShown(false));
    $('f6088ClearAll')?.addEventListener('click',clearAll);
  }

  if(!sec.dataset.f6088Bound){
    sec.dataset.f6088Bound='1';
    sec.addEventListener('change',e=>{if(e.target?.matches?.('#f62aaList [data-f62-row]'))setTimeout(updateBatchState,0)});
    sec.addEventListener('click',e=>{
      if(e.target?.closest?.('#f62aaSearch,#f62aaPrepare,#f62aaClear')){
        for(const ms of [0,80,250])setTimeout(updateBatchState,ms);
      }
    },true);
  }
  updateBatchState();
  return true;
}
function schedule(){for(const ms of[0,60,180,500,1200])setTimeout(install,ms);}
const mo=new MutationObserver(()=>setTimeout(install,0));
try{mo.observe(document.documentElement,{subtree:true,childList:true})}catch{}
window.addEventListener('at-ai:annual-archive-open',schedule);
document.addEventListener('click',e=>{if(e.target?.closest?.('#annualArchiveBtn,#tjkAnnualArchiveButton,#annualArchiveButton'))schedule()},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.ATF6088AnnualCareerUi={version:VERSION,install,updateBatchState};
console.info('[AT AI]',VERSION,'aktif — yıllık arşiv kariyer seçimi tek arayüzde; eski tekrar eden V14 seçim bloğu yalnız motor köprüsü olarak gizli tutulur.');
})();
