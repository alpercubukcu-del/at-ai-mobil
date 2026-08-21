/* AT AI Mobil — MANUEL KUPON OLUŞTURUCU V11.7 (compact source)
   V14.10: eski paralel-sınırsız prepareManualTicketV117 gövdesi kaldırıldı.
   Son prepareManualTicketV117 uygulaması V11.11 compact loop-guard katmanından gelir. */
const MANUAL_TICKET_V117 = 'MANUAL-TICKET-V11.7';
const manualTicketV117 = { betType:'', modelId:'composite', plan:null, raceDataMap:new Map(), systemTicket:null, selections:new Map(), activeLeg:0, busy:false, prepToken:0 };

function ensureManualRootV117() {
  const betTypes = $('betTypes');
  if (!betTypes) return null;
  let root = $('manualTicketV117');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'manualTicketV117';
  root.className = 'manual-ticket-v117';
  root.innerHTML = `
    <div class="manual-ticket-head-v117">
      <div><b>MANUEL KUPON</b><small>TJK resmi başlangıcı + AT AI sistem seçimleri</small></div><span>V11.7</span>
    </div>
    <button id="manualBetTypeBtnV117" class="manual-bet-type-v117" type="button">
      <div><small>Bahis Türü</small><b id="manualBetTypeLabelV117">Bahis türünü seç</b><span id="manualBetStartLabelV117">TJK “Bu koşudan başlar” bilgisi kullanılacak</span></div><strong>⌄</strong>
    </button>
    <div class="manual-models-v117" id="manualModelsV117">
      ${TICKET_MODELS_V11.map((m,i)=>`<button type="button" class="manual-model-v117 ${i===0?'active':''}" data-manual-model="${escapeHtml(m.id)}">${escapeHtml(m.short||m.label)}</button>`).join('')}
    </div>
    <div id="manualPlanV117" class="manual-plan-v117 empty">Önce bahis türünü seç.</div>`;

  betTypes.before(root);
  betTypes.classList.add('manual-hidden-v117');

  const buildBtn = $('buildAllBtn');
  if (buildBtn) { buildBtn.textContent = 'Kupon Oluştur'; buildBtn.onclick = createManualTicketV117; }

  $('manualBetTypeBtnV117').onclick = openBetSheetV117;
  root.querySelectorAll('[data-manual-model]').forEach(btn => {
    btn.onclick = async () => {
      manualTicketV117.modelId = btn.dataset.manualModel || 'composite';
      root.querySelectorAll('[data-manual-model]').forEach(x => x.classList.toggle('active', x === btn));
      if (manualTicketV117.betType) await prepareManualTicketV117(true);
    };
  });

  ['budget','unitPrice','singleCount'].forEach(id => {
    const el = $(id); if (!el) return;
    el.addEventListener('change', () => { if (manualTicketV117.betType) prepareManualTicketV117(true); });
  });
  return root;
}

async function availableBetsV117() {
  if (typeof refreshBetStartsV11 === 'function') {
    status('TJK bahis başlangıçları okunuyor…');
    await refreshBetStartsV11();
  }
  return (Array.isArray(BET_TYPES)?BET_TYPES:[])
    .map(type => ({ type, plan: typeof resolveBetStartV11==='function' ? resolveBetStartV11(type) : {ok:false} }))
    .filter(x => x.plan?.ok);
}

function legRangeTextV117(plan) { return (Array.isArray(plan?.legs)?plan.legs:[]).map(r=>r.no).join('-'); }

async function openBetSheetV117() {
  if (manualTicketV117.busy) return;
  const bets = await availableBetsV117();
  status(bets.length ? `${bets.length} resmi bahis başlangıcı bulundu.` : 'Desteklenen resmi bahis başlangıcı bulunamadı.');
  $('manualBetSheetV117')?.remove();
  const sheet = document.createElement('div');
  sheet.id = 'manualBetSheetV117';
  sheet.className = 'manual-bet-sheet-wrap-v117';
  sheet.innerHTML = `
    <div class="manual-bet-sheet-backdrop-v117" data-close-manual-bet></div>
    <section class="manual-bet-sheet-v117" role="dialog" aria-modal="true">
      <div class="manual-sheet-grip-v117"></div>
      <div class="manual-sheet-title-v117">Bahis Türünü Değiştir</div>
      <div class="manual-sheet-list-v117">
        ${bets.length ? bets.map(({type,plan})=>`
          <button type="button" class="manual-sheet-row-v117 ${type===manualTicketV117.betType?'selected':''}" data-manual-bet="${escapeHtml(type)}">
            <div><b>${escapeHtml(type)}</b><small>${escapeHtml(plan.startRace)}. koşudan başlar · ${escapeHtml(legRangeTextV117(plan))}</small></div><span>›</span>
          </button>`).join('') : '<div class="manual-sheet-empty-v117">Bu programda desteklenen çoklu bahis başlangıcı bulunamadı.</div>'}
      </div>
    </section>`;
  document.body.appendChild(sheet);
  document.body.classList.add('manual-sheet-open-v117');
  sheet.querySelectorAll('[data-close-manual-bet]').forEach(el=>el.onclick=closeBetSheetV117);
  sheet.querySelectorAll('[data-manual-bet]').forEach(btn=>btn.onclick=async()=>{
    manualTicketV117.betType = btn.dataset.manualBet || '';
    closeBetSheetV117();
    await prepareManualTicketV117(true);
  });
}

function closeBetSheetV117(){ $('manualBetSheetV117')?.remove(); document.body.classList.remove('manual-sheet-open-v117'); }
function modelV117(){ return TICKET_MODELS_V11.find(m=>m.id===manualTicketV117.modelId)||TICKET_MODELS_V11[0]; }
function manualBudgetV117(){ return Math.max(1,numberValue($('budget')?.value,500)); }
function manualUnitV117(){ return Math.max(.01,numberValue($('unitPrice')?.value,1)); }
function manualSinglesV117(){ return Math.max(0,Math.min(7,Math.floor(numberValue($('singleCount')?.value,1)))); }

/* prepareManualTicketV117 is intentionally supplied later by V11.11 loop-guard compact. */

function rankingForLegV117(raceNo){ const data=manualTicketV117.raceDataMap.get(String(raceNo)); return typeof rankRaceForModelV11==='function'?rankRaceForModelV11(data,manualTicketV117.modelId):[]; }
function selectedSetV117(raceNo){ const k=String(raceNo); if(!manualTicketV117.selections.has(k)) manualTicketV117.selections.set(k,new Set()); return manualTicketV117.selections.get(k); }

function renderManualPlanV117(){
  const box=$('manualPlanV117'), plan=manualTicketV117.plan; if(!box||!plan?.ok)return;
  const idx=Math.max(0,Math.min(manualTicketV117.activeLeg,plan.legs.length-1)); manualTicketV117.activeLeg=idx;
  const race=plan.legs[idx], ranking=rankingForLegV117(race.no), rankMap=new Map(ranking.map((x,i)=>[String(x.horse?.no),{...x,rank:i+1}])), selected=selectedSetV117(race.no);
  const counts=plan.legs.map(r=>selectedSetV117(r.no).size), valid=counts.every(x=>x>0), combinations=valid?productV11(counts):0, cost=combinations*manualUnitV117();
  box.innerHTML=`
    <div class="manual-summary-v117"><div><b>${escapeHtml(manualTicketV117.betType)}</b><small>${escapeHtml(plan.startRace)}. koşudan başlar · ${escapeHtml(legRangeTextV117(plan))}</small></div><div><b>${escapeHtml(modelV117().label)}</b><small>Sistem seçimleri + manuel düzenleme</small></div></div>
    <div class="manual-leg-tabs-v117">${plan.legs.map((r,i)=>`<button type="button" class="manual-leg-tab-v117 ${i===idx?'active':''}" data-manual-leg="${i}"><b>${i+1}. AYAK</b><span>${escapeHtml(r.no)}. Koşu</span><small>${selectedSetV117(r.no).size} at</small></button>`).join('')}</div>
    <div class="manual-race-title-v117"><div><b>${escapeHtml(race.no)}. Koşu</b><small>${escapeHtml(race.class||'')} · ${escapeHtml(race.ageGroup||'')} · ${escapeHtml(race.distance||'')} ${escapeHtml(race.track||'')}</small></div><span>${selected.size}/${race.horses.length}</span></div>
    <div class="manual-horses-v117">${(race.horses||[]).map(h=>{const row=rankMap.get(String(h.no)),on=selected.has(String(h.no));return `<button type="button" class="manual-horse-v117 ${on?'selected':''}" data-manual-horse="${escapeHtml(h.no)}"><span class="manual-horse-no-v117">${escapeHtml(h.no)}</span><span class="manual-horse-name-v117"><b>${escapeHtml(h.name||'-')}</b><small>${row?`${escapeHtml(modelV117().short||modelV117().label)} sıra ${row.rank}/${ranking.length}`:'Model verisi yok'}</small></span><span class="manual-horse-score-v117">${row?.score!==null&&row?.score!==undefined?`%${escapeHtml(row.score)}`:'—'}</span><span class="manual-check-v117">${on?'✓':'+'}</span></button>`;}).join('')}</div>
    <div class="manual-cost-v117 ${cost>manualBudgetV117()?'over':''}"><div><small>Seçimler</small><b>${counts.join(' × ')}</b></div><div><small>Kolon</small><b>${combinations}</b></div><div><small>Tutar</small><b>${cost.toFixed(2)} ₺</b></div></div>
    <div class="manual-footnote-v117">İşaretli atlar AT AI sistem seçimidir. Dokunarak ekle/çıkar. “Kupon Oluştur” yalnız bu bahis tipini oluşturur.</div>`;
  box.querySelectorAll('[data-manual-leg]').forEach(btn=>btn.onclick=()=>{manualTicketV117.activeLeg=Number(btn.dataset.manualLeg||0);renderManualPlanV117();});
  box.querySelectorAll('[data-manual-horse]').forEach(btn=>btn.onclick=()=>{const no=String(btn.dataset.manualHorse||''),set=selectedSetV117(race.no);if(set.has(no))set.delete(no);else set.add(no);renderManualPlanV117();});
}

function createManualTicketV117(){
  if(!manualTicketV117.betType||!manualTicketV117.plan?.ok){openBetSheetV117();return;}
  const plan=manualTicketV117.plan,model=modelV117(),legs=[];
  for(const race of plan.legs){
    const set=selectedSetV117(race.no); if(!set.size){status(`${race.no}. koşuda en az bir at seçmelisin.`);manualTicketV117.activeLeg=plan.legs.findIndex(x=>String(x.no)===String(race.no));renderManualPlanV117();return;}
    const ranking=rankingForLegV117(race.no), rankMap=new Map(ranking.map((row,i)=>[String(row.horse?.no),{...row,rank:i+1}]));
    const selections=(race.horses||[]).filter(h=>set.has(String(h.no))).map(h=>{const row=rankMap.get(String(h.no));return{no:h.no,name:h.name,id:h.id||null,score:row?.score??null,modelRank:row?.rank??null,coverage:row?.coverage??0,analysisMode:row?.analysisMode||row?.mode||null};});
    legs.push({raceNo:race.no,raceClass:race.class||'',distance:race.distance||'',track:race.track||'',single:selections.length===1,selections,ranking:ranking.map((row,i)=>({no:row.horse?.no,name:row.horse?.name,score:row.score,rank:i+1}))});
  }
  const counts=legs.map(x=>x.selections.length),combinations=productV11(counts),budget=manualBudgetV117(),unitPrice=manualUnitV117(),cost=combinations*unitPrice;
  state.tickets=[{version:TICKET_V11_VERSION,manualVersion:MANUAL_TICKET_V117,manual:true,type:manualTicketV117.betType,modelId:model.id,modelLabel:model.label,available:true,city:getCityName(),date:state.date,startRace:plan.startRace,startLabel:plan.startLabel,startInferred:plan.inferred,budget,unitPrice,requestedSingles:manualSinglesV117(),actualSingles:legs.filter(x=>x.single).length,combinations,cost,overBudget:cost>budget,warnings:cost>budget?[`Manuel kupon ${cost.toFixed(2)} ₺ ile ${budget.toFixed(2)} ₺ bütçeyi aşıyor.`]:[],legs,generatedAt:new Date().toISOString()}];
  save(); renderTicketsV11(); status(`${manualTicketV117.betType} oluşturuldu · ${combinations} kolon · ${cost.toFixed(2)} ₺`); $('tickets')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function resetManualForProgramV117(){ manualTicketV117.betType='';manualTicketV117.plan=null;manualTicketV117.raceDataMap=new Map();manualTicketV117.systemTicket=null;manualTicketV117.selections=new Map();manualTicketV117.activeLeg=0;if($('manualBetTypeLabelV117'))$('manualBetTypeLabelV117').textContent='Bahis türünü seç';if($('manualBetStartLabelV117'))$('manualBetStartLabelV117').textContent='TJK “Bu koşudan başlar” bilgisi kullanılacak';if($('manualPlanV117'))$('manualPlanV117').innerHTML='Önce bahis türünü seç.'; }

const loadProgramBeforeManualV117=loadProgram;
loadProgram=async function(){const out=await loadProgramBeforeManualV117();resetManualForProgramV117();ensureManualRootV117();return out;};
if($('loadProgramBtn'))$('loadProgramBtn').onclick=loadProgram;
const changeCityBeforeManualV117=changeCity;
changeCity=async function(cityId){const out=await changeCityBeforeManualV117(cityId);resetManualForProgramV117();ensureManualRootV117();return out;};
if($('citySelect'))$('citySelect').onchange=e=>changeCity(e.target.value);
ensureManualRootV117();
console.info('[AT AI]',MANUAL_TICKET_V117,'compact aktif');
