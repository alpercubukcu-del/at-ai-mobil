;(() => {
'use strict';
if(window.__AT_ARCHIVE_FREE_YEAR_F6093__)return;
window.__AT_ARCHIVE_FREE_YEAR_F6093__=true;
const VERSION='ARCHIVE-FREE-YEAR-V16.9.1F60.93';
function replace(id){const old=document.getElementById(id);if(!old||old.tagName!=='SELECT')return false;const n=document.createElement('input');n.type='number';n.id=id;n.min='1800';n.max='9999';n.step='1';n.inputMode='numeric';n.value=old.value||String(new Date().getFullYear());n.className=old.className;n.style.cssText=old.style.cssText||'width:100%;box-sizing:border-box';old.replaceWith(n);return true}
function apply(){replace('tmFromF6089');replace('tmToF6089');const dlg=document.getElementById('tjkAnnualArchiveDialog');if(!dlg)return false;for(const s of dlg.querySelectorAll('.aa-section')){if(s.id==='realRaceArchiveSectionF6093'||s.id==='trackMaintenanceSectionF6089')continue;const t=String(s.textContent||'').toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');if(t.includes('YERLIYARISSONUCARSIVI')||t.includes('YILLIKYARISPROGRAM')||t.includes('PROGRAMARSIVI')){s.style.display='none';s.dataset.f6093LegacyHidden='1'}}return true}
function boot(){apply();const dlg=document.getElementById('tjkAnnualArchiveDialog');if(dlg)new MutationObserver(()=>apply()).observe(dlg,{childList:true,subtree:true});let n=0;const t=setInterval(()=>{n++;apply();if(n>40)clearInterval(t)},500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('at-ai:annual-archive-open',()=>setTimeout(apply,0));
window.ATArchiveFreeYearF6093={version:VERSION,apply};
console.info('[AT AI]',VERSION,'aktif — arşiv yıl alanları sabit liste yerine serbest sayı girişi kullanır.');
})();
