/* AT AI Mobil — Analysis Navigation Performance V13.9.1
   - Menuden analiz secmek hesaplama/render tetiklemez.
   - Kariyer state'i localStorage'a yazilmaz; yalniz oturum belleğinde kalir.
   - Kariyer tek kosu ve at bazinda lazy render edilir.
   - 5 Model yalniz panel acildiginda, yalniz secili kosu icin hazirlanir.
   - Alt at kartlarindaki puan/sira, acik 5 Model sekmesiyle eszamanlanir.
*/
(() => {
'use strict';
if (window.__AT_ANALYSIS_NAV_PERF_V139__) return;
window.__AT_ANALYSIS_NAV_PERF_V139__ = true;

const VERSION='ANALYSIS-NAV-PERFORMANCE-V13.9.1';
const STORAGE_KEY_V139='at_ai_mobil_state_v2';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};

/* Heavy Career analysis remains available in memory, but is not synchronously
   serialized on every tab/menu/save operation. */
try {
  save = function() {
    try {
      const analyses = state?.analyses && typeof state.analyses==='object' ? state.analyses : {};
      const snapshot = {
        ...state,
        analyses:{ ...analyses, career:{} }
      };
      localStorage.setItem(STORAGE_KEY_V139, JSON.stringify(snapshot));
      return true;
    } catch (e) {
      console.warn('[AT AI] V13.9 compact state kaydedilemedi:', e);
      return false;
    }
  };
  /* Shrink any old giant localStorage payload once V13.9 is loaded. */
  save();
} catch (e) {
  console.warn('[AT AI] V13.9 save override uyarisi:', e);
}

function cancelBackgroundCareerModelsV139() {
  try { if (typeof careerModelRenderTokenV112!=='undefined') careerModelRenderTokenV112++; } catch {}
}

function titleForV139(view) {
  return ({
    current:'Güncel Analiz',
    historical:'Tarihsel Benzerlik',
    scenario:'Koşu Senaryosu',
    career:'Kariyer Yol Haritası'
  })[view] || 'Analiz';
}

function cachedCareerV139() {
  try {
    const c=state?.analyses?.career;
    return typeof isValidCareerCache==='function' && isValidCareerCache(c) ? c : null;
  } catch { return null; }
}

/* Lightweight dialog open. No JSON stringify, no Career DOM, no 5-model fetch. */
try {
  openAnalysis = function(view) {
    const dialog=document.getElementById('analysisDialog');
    if (!dialog) return;
    cancelBackgroundCareerModelsV139();
    try { if (typeof lockAnalysisPageV104==='function') lockAnalysisPageV104(); } catch {}

    dialog.dataset.view=view;
    dialog.classList.remove('calibration-dialog-v116');
    const title=document.getElementById('dialogTitle');
    const eyebrow=document.getElementById('dialogEyebrow');
    const content=document.getElementById('analysisContent');
    const selector=document.getElementById('analysisRace');
    if (title) title.textContent=titleForV139(view);
    if (eyebrow) eyebrow.textContent='AT AI ANALİZ';

    if (view==='career' && selector) {
      const selected=String(state?.selectedRace??'');
      if (selected && [...selector.options].some(o=>String(o.value)===selected)) selector.value=selected;
    }

    if (content) {
      content.classList.add('empty');
      if (view==='career') {
        const cached=cachedCareerV139();
        const raceValue=selector?.value||'all';
        content.innerHTML=cached
          ? `<div style="padding:15px;line-height:1.55"><b>Kariyer verisi hafizada.</b><br>${esc(cached.races?.length||0)} kosu bu oturumda mevcut.<br><br><b>${esc(raceValue==='all'?'Bir kosu secin':raceValue+'. kosu')}</b> ve <b>Analizi Hesapla</b> dugmesine basin. Ekran yalniz secilen kosuyu cizecek; 5 Model ancak panelini acarsaniz hazirlanacak.</div>`
          : '<div style="padding:15px;line-height:1.55"><b>Kariyer Yol Haritasi henuz bu oturumda hesaplanmadi.</b><br><br>Bir kosu secip <b>Analizi Hesapla</b> dugmesine basin. Tum kosular ayni anda cizilmeyecek.</div>';
      } else {
        const cached=state?.analyses?.[view];
        content.innerHTML=cached && Object.keys(cached).length
          ? '<div style="padding:15px;line-height:1.55"><b>Bu analizin sonucu hafizada.</b><br>Menuden acilirken agir JSON/DOM cizimi yapilmadi. Guncellemek icin <b>Analizi Hesapla</b> dugmesine basin.</div>'
          : '<div style="padding:15px">Bu analiz henuz hesaplanmadi.</div>';
      }
    }

    try { if (typeof closeDrawer==='function') closeDrawer(); } catch {}
    if (!dialog.open) dialog.showModal();
  };
} catch (e) {
  console.warn('[AT AI] V13.9 openAnalysis override uyarisi:', e);
}

function careerPathRowsV139(career={}) {
  for (const rows of [career.fullPathBefore,career.historyBefore,career.comparisonPathBefore,career.roadmapBefore,career.history,career.roadmap,career.top5]) {
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}
function careerModeLabelV139(item={}) {
  const mode=item?.career?.analysisMode||item?.galibiyetBenzerligi?.analysisMode||'';
  try { if (typeof modeLabelV11==='function') return modeLabelV11(mode); } catch {}
  if (mode==='FULL_PATH') return 'Tam Kariyer Yolu';
  if (mode==='WIN_PATH') return 'Galibiyet Yolu';
  if (mode==='PREPARATION_PATH') return 'Hazirlik / Ilk 5';
  if (mode==='DATA_ERROR') return 'Veri alinamadi';
  return mode||'Kariyer';
}
function sortCareerItemsV139(items=[]) {
  return [...items].sort((a,b)=>{
    const as=finite(a?.galibiyetBenzerligi?.score),bs=finite(b?.galibiyetBenzerligi?.score);
    return (bs??-1)-(as??-1)||Number(a?.horse?.no||999)-Number(b?.horse?.no||999);
  });
}
function horseKeyV139(horse={}) {
  const no=clean(horse?.no);
  if (no) return `no:${no}`;
  return `name:${clean(horse?.name).toLocaleUpperCase('tr-TR')}`;
}
function modelRankingForLowerV139(data,modelId='composite') {
  try {
    if (typeof modelRankingV112==='function') return modelRankingV112(data,modelId);
  } catch {}
  return (Array.isArray(data?.horses)?data.horses:[])
    .map(item=>({ ...item, displayScore:finite(item?.scores?.[modelId]?.score) }))
    .filter(item=>item.displayScore!==null)
    .sort((a,b)=>Number(b.displayScore)-Number(a.displayScore)||Number(a?.horse?.no||999)-Number(b?.horse?.no||999));
}
function syncLowerCareerScoresV139(box,data,modelId='composite') {
  const content=box?.closest?.('#analysisContent')||document.getElementById('analysisContent');
  const list=content?.querySelector('[data-v139-horse-list]');
  if (!list) return;
  const ranking=modelRankingForLowerV139(data,modelId);
  const byKey=new Map(ranking.map((item,index)=>[
    horseKeyV139(item?.horse||{}),
    { score:finite(item?.displayScore??item?.scores?.[modelId]?.score), rank:index+1 }
  ]));
  const nodes=[...list.querySelectorAll('[data-v139-horse-key]')];
  nodes.forEach((el,originalIndex)=>{
    const row=byKey.get(el.dataset.v139HorseKey)||null;
    const scoreEl=el.querySelector('[data-v139-score-value]');
    const rankEl=el.querySelector('[data-v139-rank-label]');
    if (scoreEl) {
      scoreEl.textContent=row?.score===null||row?.score===undefined?'—':`%${row.score}`;
      scoreEl.style.opacity=row?.score===null||row?.score===undefined?'.55':'1';
      scoreEl.style.color=row?.score===null||row?.score===undefined?'':'#7ee2a8';
    }
    if (rankEl) rankEl.textContent=row?`Sira ${row.rank}`:'Sira —';
    el.dataset.v139ModelRank=String(row?.rank??(10000+originalIndex));
  });
  nodes
    .sort((a,b)=>Number(a.dataset.v139ModelRank)-Number(b.dataset.v139ModelRank))
    .forEach(el=>list.appendChild(el));
  if (box) box.dataset.v139ActiveModel=modelId;
}
function horseDetailV139(item) {
  const career=item?.career||{};
  const sim=item?.galibiyetBenzerligi||{};
  const path=careerPathRowsV139(career);
  let years='';
  try { if (typeof yearSimilarityHtml==='function') years=yearSimilarityHtml(sim)||''; } catch {}
  let summary='';
  try { if (typeof careerSummaryHtml==='function') summary=careerSummaryHtml(career)||''; } catch {}
  let table='';
  try { if (typeof roadmapTableHtml==='function') table=roadmapTableHtml(path)||''; } catch {}
  const strongest=sim?.strongest;
  return `${years}${strongest?`<div style="margin:8px 0;padding:8px 9px;border-radius:8px;background:rgba(126,226,168,.08);font-size:11px;line-height:1.5">En guclu tarihsel yol: <b>${esc(strongest.year||'')}</b> · <b>${esc(strongest.historicalHorse||'')}</b> · %${esc(strongest.score??'-')}</div>`:''}${summary}${table||`<div style="padding:10px;opacity:.7">${path.length?esc(path.map(r=>r?.finish??r?.rank??r?.sira??'-').join(' → ')):'Kariyer yolu yok.'}</div>`}`;
}

async function loadFiveModelV139(box,race) {
  if (!box || box.dataset.loaded==='1') return;
  box.dataset.loaded='1';
  const body=box.querySelector('[data-v139-model-body]');
  if (body) body.innerHTML='<div class="career-model-loading-v112">Secili kosunun 5 Model verisi hazirlaniyor…</div>';
  try {
    if (typeof getCareerRaceModelsV112!=='function') throw new Error('5 Model motoru bulunamadi.');
    const data=await getCareerRaceModelsV112(race);
    const ids=['composite','exact','twin','family','career'];
    if (body) body.innerHTML=`${typeof careerCriteriaNoteV112==='function'?careerCriteriaNoteV112():''}<div class="career-model-tabs-v112">${ids.map((id,i)=>`<button class="career-model-tab-v112 ${i===0?'active':''}" data-career-model-tab="${esc(id)}">${esc(typeof modelDefinitionV112==='function'?modelDefinitionV112(id).short:id)}</button>`).join('')}</div>${ids.map((id,i)=>typeof modelPanelV112==='function'?modelPanelV112(data,id,i===0):'').join('')}`;
    try { if (typeof bindCareerModelTabsV112==='function') bindCareerModelTabsV112(box); } catch {}
    syncLowerCareerScoresV139(box,data,'composite');
    box.querySelectorAll('[data-career-model-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>syncLowerCareerScoresV139(box,data,btn.getAttribute('data-career-model-tab')||'composite'));
    });
  } catch (e) {
    if (body) body.innerHTML=`<div class="career-model-empty-v112">⚠ ${esc(e?.message||'5 Model verisi hazirlanamadi.')}</div>`;
  }
}

/* Final Career renderer: initial DOM is only summaries. Horse tables and 5-model
   data are created when the user explicitly opens them. */
try {
  renderCareerAnalysis = function(result,raceFilter=null) {
    const content=document.getElementById('analysisContent');
    if (!content) return;
    cancelBackgroundCareerModelsV139();
    let repaired=result;
    try { if (typeof repairStoredCareerV1113==='function') repaired=repairStoredCareerV1113(result); } catch {}
    const races=Array.isArray(repaired?.races)?repaired.races:[];
    const selected=String(raceFilter??document.getElementById('analysisRace')?.value??'all');
    content.classList.remove('empty');

    if (!races.length) {
      content.innerHTML='<div style="padding:15px">Kariyer verisi bulunamadi.</div>';
      return;
    }

    if (selected==='all') {
      content.innerHTML=`<div style="padding:15px;line-height:1.55"><b>${esc(repaired.cityName||'')} · ${esc(repaired.date||'')}</b><br><br>Telefon performansi icin <b>${races.length} kosu ayni anda cizilmiyor.</b> Yukaridaki kosu secicisinden tek kosu secin. Hesaplanmis kosular:<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${races.map(r=>`<button type="button" class="secondary small" data-v139-race="${esc(r.no)}">${esc(r.no)}. Kosu</button>`).join('')}</div></div>`;
      content.querySelectorAll('[data-v139-race]').forEach(btn=>btn.addEventListener('click',()=>{
        const sel=document.getElementById('analysisRace');
        if (sel) sel.value=btn.dataset.v139Race;
        renderCareerAnalysis(repaired,btn.dataset.v139Race);
      }));
      return;
    }

    const race=races.find(r=>String(r?.no)===selected);
    if (!race) {
      content.innerHTML=`<div style="padding:15px">${esc(selected)}. kosu hafizadaki Kariyer verisinde yok. <b>Analizi Hesapla</b> dugmesine basin.</div>`;
      return;
    }
    const currentRace=(Array.isArray(state?.races)?state.races:[]).find(r=>String(r?.no)===selected)||null;
    const items=sortCareerItemsV139(Array.isArray(race.horses)?race.horses:[]);
    content.innerHTML=`<div style="margin-bottom:10px;font-size:13px;line-height:1.5"><b>${esc(repaired.cityName||'')} · ${esc(repaired.date||'')} · ${esc(race.no)}. Kosu</b><br><span style="opacity:.72">${esc(race.class||race.meta?.class||'')} · ${esc(race.ageGroup||race.meta?.ageGroup||'')} · ${esc(race.distance||race.meta?.distance||'')} ${esc(race.track||race.meta?.track||'')}</span><br><span style="opacity:.62">Hafif mod: yalniz acilan at detayi DOM'a eklenir.</span></div>${currentRace?`<details class="career-model-race-v112" id="careerFiveModelV139"><summary><div><b>5 MODEL KARIYER SIRALAMASI</b><small>Yalniz bu kosu · acmak icin dokunun</small></div><span>▾</span></summary><div data-v139-model-body class="career-model-loading-v112">Panel acildiginda hazirlanacak.</div></details>`:''}<div data-v139-horse-list style="margin-top:10px">${items.map((item,index)=>{const score=finite(item?.galibiyetBenzerligi?.score);const horseKey=horseKeyV139(item?.horse||{});return `<details class="career-horse-accordion-v104" data-v139-horse="${index}" data-v139-horse-key="${esc(horseKey)}"><summary><div class="career-horse-summary-v104"><div style="min-width:0"><div class="career-horse-name-v104">${esc(item?.horse?.no||'')}. ${esc(item?.horse?.name||'')}</div><div class="career-horse-status-v104">${esc(careerModeLabelV139(item))} · ${esc(careerPathRowsV139(item?.career||{}).length)} kariyer yarisi</div></div><div class="career-horse-score-v104"><div><div data-v139-score-value style="font-size:18px;font-weight:900;line-height:1;${score===null?'opacity:.55':'color:#7ee2a8'}">${score===null?'—':'%'+esc(score)}</div><div data-v139-rank-label style="font-size:9px;opacity:.72;margin-top:2px">Sira ${index+1}</div></div><div class="career-detail-label-v104">Detay ▾</div></div></div></summary><div data-v139-horse-body style="padding:4px 8px 10px"><div style="padding:10px;opacity:.65">Detay acildiginda hazirlanacak.</div></div></details>`}).join('')}</div>`;

    content.querySelectorAll('[data-v139-horse]').forEach(el=>el.addEventListener('toggle',()=>{
      if (!el.open || el.dataset.loaded==='1') return;
      el.dataset.loaded='1';
      const item=items[Number(el.dataset.v139Horse)||0];
      const body=el.querySelector('[data-v139-horse-body]');
      if (body) body.innerHTML=horseDetailV139(item);
    }));
    const modelBox=document.getElementById('careerFiveModelV139');
    if (modelBox && currentRace) modelBox.addEventListener('toggle',()=>{ if (modelBox.open) loadFiveModelV139(modelBox,currentRace); });
  };
} catch (e) {
  console.warn('[AT AI] V13.9 renderCareerAnalysis override uyarisi:', e);
}

/* Existing onchange captured the old eager renderer during initialize(). Replace it. */
const analysisRaceV139=document.getElementById('analysisRace');
if (analysisRaceV139) {
  analysisRaceV139.onchange=()=>{
    const dialog=document.getElementById('analysisDialog');
    if (dialog?.dataset.view!=='career') return;
    const cached=cachedCareerV139();
    const value=analysisRaceV139.value||'all';
    if (cached && (value==='all' || cached.races?.some(r=>String(r?.no)===String(value)))) {
      renderCareerAnalysis(cached,value);
    } else {
      const content=document.getElementById('analysisContent');
      if (content) content.innerHTML=`<div style="padding:15px">${esc(value==='all'?'Bu secim':value+'. kosu')} hafizada yok. <b>Analizi Hesapla</b> dugmesine basin.</div>`;
    }
  };
}

console.info('[AT AI]',VERSION,'aktif — hafif analiz gezintisi + lazy Kariyer DOM + model puan eszamanlama');
})();
