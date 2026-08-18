/* AT AI Mobil — V11.2 KARİYER YOL HARİTASI / 5 MODEL GÖRÜNÜMÜ
   - Bileşik / Tam / İkiz / Aile / Kariyer sekmeleri
   - Seçilen modele göre at sıralaması
   - Kariyer tablosunda Irk / Kilo Şartı / Sıklet / HP görünürlüğü
   - Hesaplama motoru kupon V11 ile aynıdır; ikinci bir puan formülü üretilmez.
*/

const CAREER_MODEL_TABS_VERSION = 'CAREER-MODEL-TABS-V11.2';
const careerModelCacheV112 = new Map();
let careerModelRenderTokenV112 = 0;

const renderCareerAnalysisBaseV112 = renderCareerAnalysis;

function breedLabelV112(row = {}) {
  if (typeof breedValueV112 === 'function') return breedValueV112(row) || '-';
  const text = normalizeTextV11([
    row.breed, row.irk, row.ageGroup, row.group, row.groupRaw, row.classRaw, row.raceClass, row.class
  ].filter(Boolean).join(' '));
  if (text.includes('ARAP')) return 'Arap';
  if (text.includes('INGILIZ')) return 'İngiliz';
  return '-';
}

function weightConditionLabelV112(row = {}) {
  if (typeof weightConditionValueV111 === 'function') {
    const v = weightConditionValueV111(row);
    return v || '-';
  }
  return row.weightCondition || row.kiloCondition || row.kiloSarti || '-';
}

roadmapTableHtml = function(roadmap) {
  const rows = Array.isArray(roadmap) ? roadmap : [];
  if (!rows.length) return `<div style="padding:10px;opacity:.7;">Karşılaştırılabilir kariyer yolu bulunamadı.</div>`;

  return `
    <div style="font-size:11px;font-weight:800;letter-spacing:.04em;opacity:.75;margin:10px 0 6px;">
      KARİYER YOLU — PUANA GİREN KAYNAK KOŞULAR
    </div>
    <div style="overflow-x:auto;width:100%;">
      <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:1040px;">
        <thead><tr>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Tarih</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">İl</th>
          <th style="text-align:center;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Sıra</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Sınıf</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Yaş</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Irk</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Kilo Şartı</th>
          <th style="text-align:center;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Sıklet</th>
          <th style="text-align:center;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">HP</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Pist</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Mesafe</th>
        </tr></thead>
        <tbody>${rows.map(row => {
          const finish = Number(row?.finish ?? row?.rank ?? row?.sira ?? 0);
          const carried = row?.weight ?? row?.siklet ?? row?.carriedWeight;
          return `<tr style="${finish===1?'background:rgba(34,197,94,.12);':''}">
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap;">${finish===1?'🏆 ':''}${escapeHtml(row?.date || row?.isoDate || '')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.city || '-')}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid rgba(255,255,255,.08);"><b>${escapeHtml(finish || '-')}</b></td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.class || row?.raceClass || '-')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.ageGroup || row?.group || '-')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(breedLabelV112(row))}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(weightConditionLabelV112(row))}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(carried ?? '-')}</td>
            <td style="padding:7px;text-align:center;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.hp ?? '-')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.track || row?.pist || '-')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.distance || row?.mesafe || row?.msf || '-')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>
    <div style="font-size:10px;opacity:.62;margin-top:6px;line-height:1.45;">
      “-” görünen kriter kaynak kariyer satırında yoktur; eksik veri puanda 0 cezası olarak kullanılmaz.
    </div>`;
};

function careerModelKeyV112(race) {
  return [state.date, state.city, race?.no].join('|');
}

async function getCareerRaceModelsV112(race) {
  const key = careerModelKeyV112(race);
  if (careerModelCacheV112.has(key)) return careerModelCacheV112.get(key);
  const promise = prepareRaceModelsV11(race);
  careerModelCacheV112.set(key, promise);
  try {
    const result = await promise;
    careerModelCacheV112.set(key, Promise.resolve(result));
    return result;
  } catch (e) {
    careerModelCacheV112.delete(key);
    throw e;
  }
}

function modelDefinitionV112(id) {
  return TICKET_MODELS_V11.find(x => x.id === id) || { id, label:id, short:id };
}

function modelScoreV112(item, id) {
  const s = item?.scores?.[id] || {};
  return finiteV11(s.score);
}

function modelRankingV112(data, id) {
  return (Array.isArray(data?.horses) ? data.horses : [])
    .map(item => {
      const score = modelScoreV112(item, id);
      const detail = item?.scores?.[id] || {};
      return {
        ...item,
        displayScore:score,
        rawScore:finiteV11(detail.rawScore),
        coverageYears:Number(detail.coverageYears || 0),
        strongYears:Number(detail.strongYears || 0),
        supportYears:Number(detail.supportYears || 0)
      };
    })
    .filter(x => x.displayScore !== null)
    .sort((a,b) =>
      Number(b.displayScore)-Number(a.displayScore) ||
      Number(b.strongYears)-Number(a.strongYears) ||
      Number(b.supportYears)-Number(a.supportYears) ||
      Number(a?.horse?.no || 999)-Number(b?.horse?.no || 999)
    );
}

function careerCriteriaNoteV112() {
  return `<div class="career-criteria-v112">
    <b>Kariyer/Hazırlık izi:</b>
    İl + Sınıf + Yaş Grubu + Irk + Kilo Şartı + Mesafe + Pist + HP + Taşınan Sıklet + Galibiyet/İlk-5 kronolojik sırası.
    <span>Tam / İkiz / Aile kanallarında buna ayrıca tarihsel koşul aktarılabilirliği uygulanır.</span>
  </div>`;
}

function modelPanelV112(data, id, active) {
  const def = modelDefinitionV112(id);
  const ranking = modelRankingV112(data, id);
  const countMap = {
    exact:data?.modelCounts?.EXACT,
    twin:data?.modelCounts?.CONDITION_TWIN,
    family:data?.modelCounts?.RACE_FAMILY
  };
  const refCount = countMap[id];

  return `<div class="career-model-panel-v112 ${active?'active':''}" data-career-model-panel="${escapeHtml(id)}">
    <div class="career-model-panel-head-v112">
      <b>${escapeHtml(def.label)}</b>
      ${Number.isFinite(Number(refCount)) ? `<span>${escapeHtml(refCount)} tarihsel referans</span>` : ''}
    </div>
    ${ranking.length ? ranking.map((item, index) => {
      const mode = item?.scores?.analysisMode || 'DEBUT';
      const modeLabel = typeof modeLabelV11 === 'function' ? modeLabelV11(mode) : mode;
      const raw = item.rawScore;
      const score = item.displayScore;
      return `<div class="career-model-rank-v112">
        <span class="career-model-rank-no-v112">${index+1}</span>
        <div class="career-model-rank-horse-v112">
          <b>${escapeHtml(item?.horse?.no || '')}. ${escapeHtml(item?.horse?.name || '')}</b>
          <small>${escapeHtml(modeLabel)}${item.coverageYears ? ` · ${escapeHtml(item.coverageYears)} yıl` : ''}${item.strongYears ? ` · ${escapeHtml(item.strongYears)} güçlü yıl` : ''}</small>
        </div>
        <div class="career-model-rank-score-v112">
          <strong>%${escapeHtml(score)}</strong>
          ${raw !== null && raw !== score ? `<small>ham %${escapeHtml(raw)}</small>` : ''}
        </div>
      </div>`;
    }).join('') : `<div class="career-model-empty-v112">Bu koşuda ${escapeHtml(def.label)} için karşılaştırılabilir model verisi yok.</div>`}
  </div>`;
}

function bindCareerModelTabsV112(root) {
  if (!root) return;
  root.querySelectorAll('.career-model-body-v112').forEach(group => {
    group.querySelectorAll('[data-career-model-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const model = btn.getAttribute('data-career-model-tab');
        group.querySelectorAll('[data-career-model-tab]').forEach(x => x.classList.toggle('active', x === btn));
        group.querySelectorAll('[data-career-model-panel]').forEach(panel => {
          panel.classList.toggle('active', panel.getAttribute('data-career-model-panel') === model);
        });
      });
    });
  });
}

function raceModelShellV112(race, open) {
  return `<details class="career-model-race-v112" data-career-model-race="${escapeHtml(race.no)}" ${open?'open':''}>
    <summary><div><b>${escapeHtml(race.no)}. Koşu</b><small>${escapeHtml(race.class || '')} · ${escapeHtml(race.ageGroup || '')} · ${escapeHtml(race.distance || '')} ${escapeHtml(race.track || '')}</small></div><span>5 model ▾</span></summary>
    <div class="career-model-loading-v112">Tam / İkiz / Aile / Kariyer puanları hazırlanıyor…</div>
  </details>`;
}

async function hydrateCareerModelTabsV112(races, token) {
  for (const race of races) {
    if (token !== careerModelRenderTokenV112) return;
    const selector = `[data-career-model-race="${String(race.no).replace(/"/g, '\\"')}"]`;
    const shell = document.querySelector(selector);
    if (!shell) continue;
    try {
      const data = await getCareerRaceModelsV112(race);
      if (token !== careerModelRenderTokenV112) return;
      const modelIds = ['composite','exact','twin','family','career'];
      shell.innerHTML = `<summary><div><b>${escapeHtml(race.no)}. Koşu</b><small>${escapeHtml(race.class || '')} · ${escapeHtml(race.ageGroup || '')} · ${escapeHtml(race.distance || '')} ${escapeHtml(race.track || '')}</small></div><span>5 model ▾</span></summary>
        <div class="career-model-body-v112">
          ${careerCriteriaNoteV112()}
          <div class="career-model-tabs-v112">${modelIds.map((id,i) => `<button class="career-model-tab-v112 ${i===0?'active':''}" data-career-model-tab="${escapeHtml(id)}">${escapeHtml(modelDefinitionV112(id).short)}</button>`).join('')}</div>
          ${modelIds.map((id,i) => modelPanelV112(data,id,i===0)).join('')}
        </div>`;
      bindCareerModelTabsV112(shell);
    } catch (e) {
      shell.innerHTML = `<summary><div><b>${escapeHtml(race.no)}. Koşu</b></div><span>5 model ▾</span></summary><div class="career-model-empty-v112">⚠ ${escapeHtml(e?.message || '5 model verisi hazırlanamadı.')}</div>`;
    }
  }
}

renderCareerAnalysis = function(result, raceFilter = null) {
  renderCareerAnalysisBaseV112(result, raceFilter);
  const content = $('analysisContent');
  if (!content) return;

  const filter = raceFilter || $('analysisRace')?.value || 'all';
  const races = filter === 'all'
    ? (Array.isArray(state.races) ? state.races : [])
    : (Array.isArray(state.races) ? state.races.filter(r => String(r.no) === String(filter)) : []);
  if (!races.length) return;

  const old = $('careerFiveModelV112');
  if (old) old.remove();

  const section = document.createElement('section');
  section.id = 'careerFiveModelV112';
  section.className = 'career-five-model-v112';
  section.innerHTML = `<div class="career-five-model-head-v112"><div><b>5 MODEL KARİYER SIRALAMASI</b><small>Kupon motoruyla aynı puanlar</small></div><span>V11.2</span></div>
    ${races.map((race,i) => raceModelShellV112(race, races.length === 1 || i === 0)).join('')}
    <div class="career-detail-title-v112">DETAYLI KARİYER / YOL HARİTASI</div>`;
  content.prepend(section);

  const token = ++careerModelRenderTokenV112;
  hydrateCareerModelTabsV112(races, token);
};

console.info('[AT AI]', CAREER_MODEL_TABS_VERSION, 'aktif');
