/* AT AI Mobil — V11.6 MODEL KALİBRASYONU
   İlk sabit test günü: 18.08.2026 Kocaeli, 2. Altılı ayakları (3–8. koşular).

   Amaç:
   - Kupon tuttu/tutmadı yerine model sıralama kalitesini ölçmek.
   - Gerçek 1. için 1.lik modeli, gerçek 2. için 2.lik modeli, gerçek 3. için 3.lük modeli sınamak.
   - Bileşik / Tam / İkiz / Aile / Kariyer kanallarını ayrı ölçmek.
*/

const CALIBRATION_VERSION_V116 = 'MODEL-CALIBRATION-V11.6';
const CALIBRATION_CACHE_KEY_V116 = 'at_ai_calibration_v116';
const CALIBRATION_MODEL_IDS_V116 = ['composite','exact','twin','family','career'];
const CALIBRATION_MODEL_LABELS_V116 = {
  composite:'Bileşik', exact:'Tam', twin:'İkiz', family:'Aile', career:'Kariyer'
};

const CALIBRATION_DAYS_V116 = [{
  id:'2026-08-18-kocaeli-2altili',
  date:'2026-08-18',
  cityName:'Kocaeli',
  cityId:'9',
  title:'18.08.2026 Kocaeli · 2. Altılı',
  sourceLabel:'TJK resmi yarış sonuçları',
  raceNos:[3,4,5,6,7,8],
  truth:{
    3:{
      1:{no:12,name:'SELLYGIRL'},
      2:{no:3,name:'CHEF CURRY'},
      3:{no:9,name:'MEVLÜDE HATUN'}
    },
    4:{
      1:{no:7,name:'ALTINTEPE'},
      2:{no:9,name:'MÜZEYYEN ABLA'},
      3:{no:4,name:'KADER GÜCÜ'}
    },
    5:{
      1:{no:5,name:'LAGUNA SUNSET'},
      2:{no:3,name:'BOUNDLESS POWER'},
      3:{no:1,name:'DAELLA'}
    },
    6:{
      1:{no:4,name:'PAPETTİ'},
      2:{no:1,name:'BODRUMLU'},
      3:{no:6,name:'KONÇİÇEK'}
    },
    7:{
      1:{no:3,name:'LEJUR'},
      2:{no:5,name:'SECRET LAV'},
      3:{no:1,name:'PINEAL CODE'}
    },
    8:{
      1:{no:6,name:'SÜTLİMAN'},
      2:{no:13,name:'Bİ ANKA'},
      3:{no:5,name:'PRENSES SEDA'}
    }
  }
}];

function escCalV116(value='') {
  return typeof escapeHtml === 'function' ? escapeHtml(value) : String(value);
}

function finiteCalV116(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCalV116(value='') {
  return String(value)
    .toLocaleUpperCase('tr-TR')
    .replaceAll('İ','I').replaceAll('Ş','S').replaceAll('Ğ','G')
    .replaceAll('Ü','U').replaceAll('Ö','O').replaceAll('Ç','C')
    .replace(/[^A-Z0-9]+/g,' ')
    .trim();
}

function modelLabelCalV116(id) {
  return CALIBRATION_MODEL_LABELS_V116[id] || id;
}

function loadCalibrationCacheV116() {
  try {
    const raw = localStorage.getItem(CALIBRATION_CACHE_KEY_V116);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCalibrationCacheV116(dayId, result) {
  try {
    const all = loadCalibrationCacheV116();
    all[dayId] = result;
    localStorage.setItem(CALIBRATION_CACHE_KEY_V116, JSON.stringify(all));
  } catch (e) {
    console.warn('[AT AI] calibration cache yazılamadı', e);
  }
}

function findTruthRankV116(ranking, truth) {
  const targetNo = Number(truth?.no || 0);
  const targetName = normalizeCalV116(truth?.name || '');
  const index = (Array.isArray(ranking) ? ranking : []).findIndex(row => {
    const no = Number(row?.item?.horse?.no || 0);
    const name = normalizeCalV116(row?.item?.horse?.name || '');
    return (targetNo && no === targetNo) || (targetName && name === targetName);
  });
  if (index < 0) return { rank:null, row:null };
  return { rank:index + 1, row:ranking[index] };
}

function metricSummaryV116(records) {
  const valid = records.filter(row => Number.isFinite(Number(row.rank)));
  const ranks = valid.map(row => Number(row.rank));
  return {
    total:records.length,
    coverage:valid.length,
    top1:ranks.filter(rank => rank === 1).length,
    top3:ranks.filter(rank => rank <= 3).length,
    averageRank:ranks.length ? Math.round((ranks.reduce((a,b)=>a+b,0) / ranks.length) * 100) / 100 : null,
    mrr:ranks.length ? Math.round((ranks.reduce((a,b)=>a + 1/b,0) / ranks.length) * 1000) / 1000 : null
  };
}

function aggregateCalibrationV116(races) {
  const byFinish = {};
  const overall = {};
  for (const modelId of CALIBRATION_MODEL_IDS_V116) overall[modelId] = [];

  for (const finish of [1,2,3]) {
    byFinish[finish] = {};
    for (const modelId of CALIBRATION_MODEL_IDS_V116) {
      const records = races.map(race => ({
        raceNo:race.raceNo,
        ...(race?.finishes?.[finish]?.models?.[modelId] || {})
      }));
      byFinish[finish][modelId] = metricSummaryV116(records);
      overall[modelId].push(...records);
    }
  }

  const overallSummary = {};
  for (const modelId of CALIBRATION_MODEL_IDS_V116) {
    overallSummary[modelId] = metricSummaryV116(overall[modelId]);
  }
  return { byFinish, overall:overallSummary };
}

async function fetchCalibrationProgramV116(day) {
  const res = await fetch(`/api/tjk-program?date=${encodeURIComponent(day.date)}&t=${Date.now()}`, { cache:'no-store' });
  if (!res.ok) throw new Error(`Program API ${res.status}`);
  const data = await res.json();
  const cities = Array.isArray(data?.cities) ? data.cities : [];
  const city = cities.find(item => normalizeCalV116(item?.name) === normalizeCalV116(day.cityName)) ||
    cities.find(item => String(item?.id) === String(day.cityId));
  if (!city) throw new Error(`${day.cityName} programda bulunamadı.`);

  let races = [];
  if (typeof getCurrentRaceList === 'function') {
    races = getCurrentRaceList(data, city.id);
  } else {
    const raw = data?.racesByCity?.[String(city.id)] || data?.racesByCity?.[Number(city.id)] || [];
    races = Array.isArray(raw) ? raw : [];
  }
  races = races.filter(race => day.raceNos.includes(Number(race?.no)));
  if (races.length !== day.raceNos.length) {
    throw new Error(`Beklenen ${day.raceNos.length} koşudan ${races.length} tanesi programdan alındı.`);
  }
  return { data, cities, city, races };
}

async function calculateCalibrationV116(day, onProgress=()=>{}) {
  if (typeof prepareRaceModelsV11 !== 'function' || typeof modelRankingPodiumV115 !== 'function') {
    throw new Error('V11.5 derece bazlı model motoru yüklenmedi. Sayfayı yenileyin.');
  }

  const program = await fetchCalibrationProgramV116(day);
  const snapshot = {
    date:state.date,
    city:state.city,
    cities:state.cities,
    races:state.races,
    selectedRace:state.selectedRace
  };

  const raceResults = [];
  try {
    state.date = day.date;
    state.city = String(program.city.id);
    state.cities = program.cities;
    state.races = program.races;
    state.selectedRace = 'all';

    if (typeof careerModelCacheV112 !== 'undefined' && careerModelCacheV112?.clear) {
      careerModelCacheV112.clear();
    }

    for (let i = 0; i < day.raceNos.length; i++) {
      const raceNo = day.raceNos[i];
      const race = program.races.find(item => Number(item?.no) === Number(raceNo));
      if (!race) continue;
      onProgress({ index:i, total:day.raceNos.length, raceNo, text:`${raceNo}. Koşu V11.5 ile hesaplanıyor…` });
      const modelData = await prepareRaceModelsV11(race, progress => {
        if (progress?.message) onProgress({ index:i, total:day.raceNos.length, raceNo, text:`${raceNo}. Koşu · ${progress.message}` });
      });

      const raceOut = { raceNo, finishes:{} };
      for (const finish of [1,2,3]) {
        const truth = day.truth?.[raceNo]?.[finish];
        const finishOut = { truth, models:{} };
        for (const modelId of CALIBRATION_MODEL_IDS_V116) {
          const ranking = modelRankingPodiumV115(modelData, finish, modelId);
          const found = findTruthRankV116(ranking, truth);
          finishOut.models[modelId] = {
            rank:found.rank,
            score:finiteCalV116(found?.row?.channel?.score),
            rawScore:finiteCalV116(found?.row?.channel?.rawScore),
            rankedHorses:ranking.length,
            leader:ranking[0] ? {
              no:Number(ranking[0]?.item?.horse?.no || 0) || null,
              name:ranking[0]?.item?.horse?.name || '',
              score:finiteCalV116(ranking[0]?.channel?.score)
            } : null
          };
        }
        raceOut.finishes[finish] = finishOut;
      }
      raceResults.push(raceOut);
    }
  } finally {
    state.date = snapshot.date;
    state.city = snapshot.city;
    state.cities = snapshot.cities;
    state.races = snapshot.races;
    state.selectedRace = snapshot.selectedRace;
  }

  const result = {
    calibrationVersion:CALIBRATION_VERSION_V116,
    podiumVersion:typeof PODIUM_SIMILARITY_V115 !== 'undefined' ? PODIUM_SIMILARITY_V115 : 'V11.5',
    dayId:day.id,
    title:day.title,
    date:day.date,
    cityName:day.cityName,
    sourceLabel:day.sourceLabel,
    calculatedAt:new Date().toISOString(),
    races:raceResults,
    summary:aggregateCalibrationV116(raceResults)
  };
  saveCalibrationCacheV116(day.id, result);
  return result;
}

function rankClassCalV116(rank) {
  if (rank === 1) return 'cal-rank1-v116';
  if (rank !== null && rank <= 3) return 'cal-rank3-v116';
  if (rank !== null) return 'cal-rankout-v116';
  return 'cal-ranknone-v116';
}

function rankTextCalV116(item) {
  if (!item || item.rank === null) return '—';
  const raw = finiteCalV116(item.rawScore);
  const score = finiteCalV116(item.score);
  const parts = [`#${item.rank}`];
  if (score !== null) parts.push(`${score}p`);
  if (raw !== null && raw !== score) parts.push(`ham %${raw}`);
  return parts.join(' · ');
}

function finishTableCalV116(result, finish) {
  return `
    <div class="cal-table-wrap-v116">
      <table class="cal-table-v116">
        <thead><tr>
          <th>Koşu</th><th>Gerçek ${finish}.</th>
          ${CALIBRATION_MODEL_IDS_V116.map(id => `<th>${escCalV116(modelLabelCalV116(id))}</th>`).join('')}
        </tr></thead>
        <tbody>${result.races.map(race => {
          const row = race?.finishes?.[finish] || {};
          return `<tr>
            <td><b>${race.raceNo}.K</b></td>
            <td class="cal-truth-v116"><b>${escCalV116(row?.truth?.no || '')}. ${escCalV116(row?.truth?.name || '-')}</b></td>
            ${CALIBRATION_MODEL_IDS_V116.map(id => {
              const item = row?.models?.[id] || {};
              return `<td class="${rankClassCalV116(item.rank)}"><b>${escCalV116(rankTextCalV116(item))}</b></td>`;
            }).join('')}
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

function summaryTableCalV116(summary, finish) {
  const source = finish ? summary?.byFinish?.[finish] : summary?.overall;
  const title = finish ? `${finish}.LİK MODEL ÖZETİ` : '18 HEDEFİN GENEL ÖZETİ';
  return `
    <div class="cal-summary-v116">
      <b>${escCalV116(title)}</b>
      <div class="cal-table-wrap-v116">
        <table class="cal-table-v116 cal-summary-table-v116">
          <thead><tr><th>Model</th><th>Top-1</th><th>Top-3</th><th>Ort. sıra</th><th>Kapsama</th></tr></thead>
          <tbody>${CALIBRATION_MODEL_IDS_V116.map(id => {
            const s = source?.[id] || {};
            return `<tr>
              <td><b>${escCalV116(modelLabelCalV116(id))}</b></td>
              <td>${escCalV116(s.top1 ?? 0)}/${escCalV116(s.total ?? 0)}</td>
              <td>${escCalV116(s.top3 ?? 0)}/${escCalV116(s.total ?? 0)}</td>
              <td>${s.averageRank === null || s.averageRank === undefined ? '—' : escCalV116(s.averageRank)}</td>
              <td>${escCalV116(s.coverage ?? 0)}/${escCalV116(s.total ?? 0)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

function renderCalibrationResultV116(result) {
  if (!result) return '';
  return `
    <section class="cal-result-v116">
      <div class="cal-result-head-v116">
        <div><b>${escCalV116(result.title)}</b><small>${escCalV116(result.calibrationVersion)} · ${escCalV116(result.podiumVersion)}</small></div>
        <span>${result.calculatedAt ? new Date(result.calculatedAt).toLocaleString('tr-TR') : ''}</span>
      </div>
      ${summaryTableCalV116(result.summary, null)}
      <details class="cal-finish-v116" open><summary>🥇 1.LİK — gerçek kazanan modelde kaçıncıydı?</summary>${finishTableCalV116(result,1)}${summaryTableCalV116(result.summary,1)}</details>
      <details class="cal-finish-v116"><summary>🥈 2.LİK — gerçek ikinci modelde kaçıncıydı?</summary>${finishTableCalV116(result,2)}${summaryTableCalV116(result.summary,2)}</details>
      <details class="cal-finish-v116"><summary>🥉 3.LÜK — gerçek üçüncü modelde kaçıncıydı?</summary>${finishTableCalV116(result,3)}${summaryTableCalV116(result.summary,3)}</details>
      <div class="cal-legend-v116"><span class="cal-rank1-v116">#1 = tam isabet</span><span class="cal-rank3-v116">#2–3 = ilk 3 içinde</span><span class="cal-rankout-v116">#4+ = dışarıda</span><span class="cal-ranknone-v116">— = model verisi yok</span></div>
    </section>`;
}

function renderCalibrationHomeV116() {
  const content = $('analysisContent');
  if (!content) return;
  const day = CALIBRATION_DAYS_V116[0];
  const cached = loadCalibrationCacheV116()?.[day.id] || null;
  content.classList.remove('empty');
  content.innerHTML = `
    <section class="cal-home-v116">
      <div class="cal-hero-v116">
        <div><b>MODEL KALİBRASYONU</b><small>Gerçek sonuçla 1./2./3. derece bazında 5 model testi</small></div>
        <span>V11.6</span>
      </div>
      <div class="cal-day-v116">
        <b>${escCalV116(day.title)}</b>
        <p>3–8. koşular · 18 gerçek hedef (6 kazanan + 6 ikinci + 6 üçüncü).</p>
        <p>Gerçek sonuç sabit; model geçmişe dönük olarak hedef tarihten sonraki veriyi kullanmadan yeniden hesaplanır.</p>
        <button class="primary" id="runCalibrationV116">${cached ? 'V11.5 ile Yeniden Hesapla' : 'V11.5 ile Hesapla'}</button>
        <div id="calibrationStatusV116" class="cal-status-v116">${cached ? 'Kayıtlı test sonucu aşağıda gösteriliyor.' : 'Henüz hesaplanmadı.'}</div>
      </div>
      <div id="calibrationResultV116">${cached ? renderCalibrationResultV116(cached) : ''}</div>
    </section>`;

  $('runCalibrationV116')?.addEventListener('click', async () => {
    const btn = $('runCalibrationV116');
    const statusEl = $('calibrationStatusV116');
    const out = $('calibrationResultV116');
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Program hazırlanıyor…';
    try {
      const result = await calculateCalibrationV116(day, progress => {
        if (statusEl) statusEl.textContent = progress?.text || 'Hesaplanıyor…';
      });
      if (out) out.innerHTML = renderCalibrationResultV116(result);
      if (statusEl) statusEl.textContent = 'Kalibrasyon tamamlandı ve bu cihazda kaydedildi.';
      if (btn) btn.textContent = 'V11.5 ile Yeniden Hesapla';
    } catch (e) {
      console.error('[AT AI] calibration error', e);
      if (statusEl) statusEl.textContent = `⚠ ${e?.message || 'Kalibrasyon hesaplanamadı.'}`;
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function openCalibrationV116() {
  const dialog = $('analysisDialog');
  if (!dialog) return;
  $('closeMenu')?.click();
  dialog.classList.add('calibration-dialog-v116');
  if ($('dialogEyebrow')) $('dialogEyebrow').textContent = 'GERÇEK SONUÇ TESTİ';
  if ($('dialogTitle')) $('dialogTitle').textContent = 'Model Kalibrasyonu';
  renderCalibrationHomeV116();
  if (!dialog.open) dialog.showModal();
}

document.addEventListener('click', event => {
  const btn = event.target?.closest?.('[data-view="calibration"]');
  if (!btn) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openCalibrationV116();
}, true);

document.addEventListener('click', event => {
  const btn = event.target?.closest?.('[data-view]');
  if (!btn || btn.getAttribute('data-view') === 'calibration') return;
  $('analysisDialog')?.classList.remove('calibration-dialog-v116');
}, true);

$('closeDialog')?.addEventListener('click', () => {
  $('analysisDialog')?.classList.remove('calibration-dialog-v116');
});

console.info('[AT AI]', CALIBRATION_VERSION_V116, 'aktif');
