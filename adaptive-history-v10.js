/* AT AI Mobil — Adaptive Historical Path V10
   exact-history-v9.js sonrasında yüklenir ve yalnız tarihsel/kariyer katmanını günceller. */

const ADAPTIVE_HISTORY_PATCH_VERSION = 'ADAPTIVE-HISTORY-UI-V10.0';

isValidCareerCache = function(cached) {
  return Boolean(
    cached &&
    cached.version === CAREER_UI_VERSION &&
    cached.exactHistoryV9 === true &&
    cached.adaptiveHistoryV10 === true &&
    cached.date === state.date &&
    String(cached.city) === String(state.city) &&
    Array.isArray(cached.races) &&
    cached.races.length &&
    cached.races.every(race =>
      race && Array.isArray(race.horses) &&
      race.horses.every(item => item?.galibiyetBenzerligi && Array.isArray(item.galibiyetBenzerligi.byYear))
    )
  );
};

if (state?.analyses?.career && !state.analyses.career.adaptiveHistoryV10) {
  state.analyses.career = {};
  save();
}

fetchCareer = async function(horseId, before) {
  if (!horseId) {
    return {
      ok:false,
      errorType:'INPUT',
      error:'At ID bulunamadı.',
      roadmap:[], wins:[], top5:[], preparationPath:[], history:[],
      summary:{ totalTop5:0, totalWins:0, first:0, second:0, third:0, fourth:0, fifth:0 }
    };
  }

  try {
    const url = `/api/tjk-career-v10?horseId=${encodeURIComponent(horseId)}&before=${encodeURIComponent(before)}&t=${Date.now()}`;
    const res = await fetch(url, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok:false,
        errorType:data?.errorType || 'RETRIEVAL_ERROR',
        error:data?.error || `API ${res.status}`,
        roadmap:[], wins:[], top5:[], preparationPath:[], history:[],
        summary:{ totalTop5:0, totalWins:0, first:0, second:0, third:0, fourth:0, fifth:0 }
      };
    }
    return normalizeCareerResponse(data);
  } catch (e) {
    return {
      ok:false,
      errorType:'RETRIEVAL_ERROR',
      error:e?.message || 'Kariyer alınamadı.',
      roadmap:[], wins:[], top5:[], preparationPath:[], history:[],
      summary:{ totalTop5:0, totalWins:0, first:0, second:0, third:0, fourth:0, fifth:0 }
    };
  }
};

fetchHistoricalRoadmap = async function(meta) {
  if (!meta?.ok) return { ok:false, error:meta?.error || 'Koşu koşulları eksik.' };
  try {
    const url =
      `/api/tjk-adaptive-roadmap-v10` +
      `?date=${encodeURIComponent(state.date)}` +
      `&city=${encodeURIComponent(getCityName())}` +
      `&class=${encodeURIComponent(meta.class || '')}` +
      `&ageGroup=${encodeURIComponent(meta.ageGroup || '')}` +
      `&track=${encodeURIComponent(meta.track || '')}` +
      `&distance=${encodeURIComponent(meta.distance || '')}` +
      `&minYear=2000&t=${Date.now()}`;
    const res = await fetch(url, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) return { ok:false, error:data?.error || `API ${res.status}` };
    return data;
  } catch (e) {
    return { ok:false, error:e?.message || 'Uyarlanabilir tarihsel yol haritası alınamadı.' };
  }
};

function adaptiveCurrentMode(path) {
  const rows = Array.isArray(path) ? path : [];
  if (!rows.length) return 'DEBUT';
  return rows.some(x => Number(x?.finish ?? x?.rank ?? x?.sira) === 1) ? 'WIN_PATH' : 'PREPARATION_PATH';
}

function adaptiveReferencePath(ref, mode) {
  if (mode === 'WIN_PATH') {
    return Array.isArray(ref?.career?.winsBefore)
      ? ref.career.winsBefore.filter(x => Number(x?.finish ?? x?.rank ?? x?.sira) === 1)
      : [];
  }
  const top5 = Array.isArray(ref?.career?.top5Before) ? ref.career.top5Before : [];
  if (top5.length) return top5;
  return Array.isArray(ref?.career?.preparationPathBefore) ? ref.career.preparationPathBefore : [];
}

calculateGalibiyetBenzerligi = function(currentPath, roadmapData) {
  const path = Array.isArray(currentPath) ? [...currentPath] : [];
  const mode = adaptiveCurrentMode(path);
  const historicalRaces = Array.isArray(roadmapData?.historicalRaces)
    ? roadmapData.historicalRaces.filter(race => race?.ok !== false).sort((a,b)=>Number(b?.sourceYear||0)-Number(a?.sourceYear||0))
    : [];
  const byYear = [];
  let referenceCount = 0;

  for (const race of historicalRaces) {
    const year = Number(race?.sourceYear || String(race?.date || '').slice(0,4)) || null;
    const conditionScore = Math.max(0, Math.min(100, Number(race?.transferabilityScore ?? race?.raceConditionSimilarity ?? 100) || 0));
    const refs = Array.isArray(race?.top3) ? race.top3 : [];
    let best = null;

    for (const ref of refs) {
      const refPath = adaptiveReferencePath(ref, mode);
      if (!path.length || !refPath.length) continue;
      referenceCount++;
      const rawPath = orderedPathSimilarity(path, refPath);
      const pathScore = Math.round(clamp01(rawPath) * 100);
      const effectiveScore = Math.round(pathScore * conditionScore / 100);
      const candidate = {
        year,
        score:effectiveScore,
        pathScore,
        conditionScore,
        historicalHorse:ref?.horseName || '',
        historicalHorseId:ref?.horseId || '',
        historicalFinish:Number(ref?.finish || 0) || null,
        historicalPathCount:refPath.length,
        currentPathCount:path.length,
        analysisMode:mode,
        raceDate:race?.date || '',
        raceCity:race?.city || '',
        raceNo:race?.raceNo || '',
        calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
        referenceType:race?.referenceType || 'EXACT',
        referenceLabel:race?.referenceLabel || 'TAM TARİHSEL EŞLEŞME',
        transferabilityTier:race?.transferabilityTier || (conditionScore >= 85 ? 'HIGH' : conditionScore >= 70 ? 'MEDIUM' : conditionScore >= 50 ? 'SUPPORT' : 'LOW'),
        transferabilityColor:race?.transferabilityColor || '',
        explanation:race?.explanation || '',
        distanceDifferencePct:Number(race?.distanceDifferencePct ?? 0),
        alternatives:Array.isArray(race?.alternatives) ? race.alternatives : []
      };
      if (!best || candidate.score > best.score || (candidate.score === best.score && candidate.pathScore > best.pathScore) || (candidate.score === best.score && candidate.pathScore === best.pathScore && Number(candidate.historicalFinish || 99) < Number(best.historicalFinish || 99))) {
        best = candidate;
      }
    }

    if (best) {
      byYear.push(best);
    } else {
      byYear.push({
        year, score:null, pathScore:null, conditionScore,
        historicalHorse:null, historicalFinish:null, analysisMode:mode,
        raceDate:race?.date || '', raceCity:race?.city || '', raceNo:race?.raceNo || '',
        calendarDayDifference:Number(race?.calendarDayDifference ?? 0),
        referenceType:race?.referenceType || 'EXACT', referenceLabel:race?.referenceLabel || 'Tarihsel referans',
        transferabilityTier:race?.transferabilityTier || 'LOW', explanation:race?.explanation || '',
        error: mode === 'DEBUT'
          ? 'Bugünkü atın yarış geçmişi yok; kariyer yolu yerine debut modeli kullanılmalı.'
          : mode === 'WIN_PATH'
            ? 'Geçmiş ilk 3 atının yarış öncesi galibiyet yolu alınamadı.'
            : 'Geçmiş ilk 3 atının yarış öncesi hazırlık/ilk 5 yolu alınamadı.'
      });
    }
  }

  byYear.sort((a,b)=>Number(b?.year||0)-Number(a?.year||0));
  const scored = byYear.filter(x => Number.isFinite(Number(x?.score)));
  const strongest = scored.length
    ? [...scored].sort((a,b)=>Number(b.score)-Number(a.score)||Number(b.pathScore||0)-Number(a.pathScore||0)||Number(b.year||0)-Number(a.year||0))[0]
    : null;

  return {
    score:strongest ? strongest.score : null,
    strongestYear:strongest?.year || null,
    strongest:strongest || null,
    byYear,
    matchedHistoricalHorse:strongest?.historicalHorse || null,
    matchedHistoricalFinish:strongest?.historicalFinish || null,
    matchedHistoricalRace:strongest ? `${strongest.raceDate} ${strongest.raceCity} ${strongest.raceNo}. Koşu` : null,
    referenceCount,
    currentPathCount:path.length,
    currentWinCount:path.filter(x=>Number(x?.finish ?? x?.rank ?? x?.sira)===1).length,
    analysisMode:mode,
    method:mode === 'WIN_PATH' ? 'YEAR_BY_YEAR_ADAPTIVE_WIN_PATH_V10' : mode === 'PREPARATION_PATH' ? 'YEAR_BY_YEAR_PREPARATION_PATH_V10' : 'DEBUT_NO_PATH',
    yearAggregation:'NONE',
    historicalRaceRule:'EXACT + SAME_RACE_FAMILY + CONDITION_TWIN; PM45_DAYS'
  };
};

function adaptiveModeLabel(mode) {
  if (mode === 'WIN_PATH') return 'Galibiyet Yolu';
  if (mode === 'PREPARATION_PATH') return 'Hazırlık / İlk 5 Yolu';
  return 'Debut';
}
function adaptiveTierColor(tier) {
  if (tier === 'HIGH') return '#7ee2a8';
  if (tier === 'MEDIUM') return '#f8df73';
  if (tier === 'SUPPORT') return '#ffad66';
  return '#ff7a88';
}
function adaptiveReferenceIcon(type) {
  if (type === 'EXACT') return '●';
  if (type === 'CONDITION_TWIN') return '◆';
  return '▲';
}

careerSummaryHtml = function(career) {
  const wins = Array.isArray(career?.wins) ? career.wins : [];
  const top5 = Array.isArray(career?.top5) ? career.top5 : [];
  const roadmap = Array.isArray(career?.roadmap) ? career.roadmap : [];
  const mode = career?.analysisMode || adaptiveCurrentMode(roadmap);
  const audit = career?.audit || {};
  const careerTotal = Number(audit?.careerTotal ?? career?.counts?.tjkCareerTotal ?? 0);
  const collected = Number(audit?.collectedTotal ?? career?.counts?.collectedTotal ?? 0);
  const coverage = audit?.coverageStatus || '';
  const coverageColor = coverage === 'TAM' ? '#7ee2a8' : coverage === 'KISMİ' ? '#ffad66' : '#ff7a88';
  return `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 8px;">
      <span style="padding:6px 9px;border-radius:999px;background:rgba(114,213,255,.09);border:1px solid rgba(114,213,255,.25);"><b>${escapeHtml(adaptiveModeLabel(mode))}</b></span>
      <span style="padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.15);">Galibiyet: <b>${escapeHtml(wins.length)}</b></span>
      <span style="padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.15);">İlk 5: <b>${escapeHtml(top5.length)}</b></span>
      ${careerTotal ? `<span style="padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.15);">TJK geçmiş: <b>${escapeHtml(collected)}/${escapeHtml(careerTotal)}</b></span>` : ''}
      ${coverage ? `<span style="padding:6px 9px;border-radius:8px;border:1px solid ${coverageColor};color:${coverageColor};">${escapeHtml(coverage)}</span>` : ''}
    </div>
    ${audit?.warning ? `<div style="font-size:11px;line-height:1.45;color:#ffbd82;margin-bottom:8px;">⚠ ${escapeHtml(audit.warning)}</div>` : ''}
    ${mode === 'DEBUT' ? `<div style="font-size:11px;opacity:.76;margin-bottom:8px;">Yarış geçmişi yok. Kariyer yüzdesi üretilmez; debut/orijin/idman/piyasa modeli kullanılmalıdır.</div>` : ''}
  `;
};

roadmapTableHtml = function(roadmap) {
  const rows = Array.isArray(roadmap) ? roadmap : [];
  if (!rows.length) return `<div style="padding:10px;opacity:.7;">Karşılaştırılabilir kariyer yolu bulunamadı.</div>`;
  return `
    <div style="font-size:11px;font-weight:800;letter-spacing:.04em;opacity:.75;margin:10px 0 6px;">KARİYER YOLU — KARŞILAŞTIRMADA KULLANILAN KOŞULAR</div>
    <div style="overflow-x:auto;width:100%;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:720px;">
        <thead><tr>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Tarih</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">İl</th>
          <th style="text-align:center;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Sıra</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Sınıf</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Yaş</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Pist</th>
          <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Mesafe</th>
        </tr></thead>
        <tbody>${rows.map(row => {
          const finish = Number(row?.finish ?? row?.rank ?? row?.sira ?? 0);
          return `<tr style="${finish===1?'background:rgba(34,197,94,.12);':''}">
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap;">${finish===1?'🏆 ':''}${escapeHtml(row?.date || row?.isoDate || '')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.city || '-')}</td>
            <td style="padding:7px;text-align:center;font-weight:800;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(finish || '-')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.class || row?.raceClass || '-')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.ageGroup || row?.group || '-')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.track || row?.pist || '-')}</td>
            <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row?.distance || row?.mesafe || row?.msf || '-')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
};

function yearSimilarityHtml(sim) {
  const rows = Array.isArray(sim?.byYear) ? sim.byYear : [];
  if (!rows.length) {
    return `<div style="margin-top:9px;padding:9px;border-radius:8px;background:rgba(255,255,255,.04);font-size:11px;opacity:.72;">±45 gün içinde tam eşleşme, aynı yarış ailesi veya koşul ikizi bulunamadı.</div>`;
  }
  return `
    <div style="margin-top:10px;border:1px solid rgba(114,213,255,.18);border-radius:10px;overflow:hidden;">
      <div style="padding:8px 9px;background:rgba(114,213,255,.07);font-size:11px;font-weight:800;">
        YILLARA GÖRE TARİHSEL YOL
        <span style="font-weight:500;opacity:.65;">· tam eşleşme / yarış ailesi / koşul ikizi · ±45 gün</span>
      </div>
      ${rows.map(row => {
        const hasScore = row?.score !== null && row?.score !== undefined && Number.isFinite(Number(row.score));
        const color = adaptiveTierColor(row?.transferabilityTier);
        return `<div style="padding:9px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;line-height:1.55;">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
            <div><b>${escapeHtml(row.year || '-')}</b> · <span style="color:${color};font-weight:800;">${adaptiveReferenceIcon(row.referenceType)} ${escapeHtml(row.referenceLabel || 'Tarihsel referans')}</span></div>
            ${hasScore ? `<strong style="font-size:16px;color:${color};">%${escapeHtml(row.score)}</strong>` : `<span style="opacity:.6;">—</span>`}
          </div>
          ${hasScore ? `<div><b>${escapeHtml(row.historicalHorse || '-')}</b> · geçmişte <b>${escapeHtml(row.historicalFinish || '-')}.</b> · ${escapeHtml(adaptiveModeLabel(row.analysisMode))}</div>
            <div style="opacity:.86;">Kariyer yolu <b>%${escapeHtml(row.pathScore)}</b> · koşul uyumu <b>%${escapeHtml(row.conditionScore)}</b> · etkin destek <b>%${escapeHtml(row.score)}</b></div>`
            : `<div style="opacity:.72;">${escapeHtml(row.error || 'Kariyer yolu hesaplanamadı.')}</div>`}
          <div style="opacity:.62;">${escapeHtml(row.raceDate || '')} ${escapeHtml(row.raceCity || '')} ${row.raceNo ? `${escapeHtml(row.raceNo)}. Koşu` : ''}${Number.isFinite(Number(row.calendarDayDifference)) ? ` · ${escapeHtml(row.calendarDayDifference)} gün` : ''}</div>
          ${row.explanation ? `<div style="margin-top:3px;color:${color};opacity:.9;">${escapeHtml(row.explanation)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

renderCareerAnalysis = function(result, raceFilter = null) {
  const content = $('analysisContent');
  if (!content) return;
  content.classList.remove('empty');
  const races = Array.isArray(result?.races) ? result.races : [];
  if (!races.length) { content.innerHTML = 'Kariyer verisi bulunamadı.'; return; }
  const selected = raceFilter ?? $('analysisRace')?.value ?? 'all';
  const shownRaces = selected === 'all' ? races : races.filter(race => String(race.no) === String(selected));
  if (!shownRaces.length) {
    content.innerHTML = `<div style="padding:12px;">${escapeHtml(selected)}. koşu hesaplanan kariyer verisinde bulunamadı.</div>`;
    return;
  }
  const allMode = selected === 'all';
  const tabs = [`<button class="career-race-pill ${selected==='all'?'active':''}" data-career-race="all">Tümü</button>`]
    .concat(races.map(r=>`<button class="career-race-pill ${String(selected)===String(r.no)?'active':''}" data-career-race="${escapeHtml(r.no)}">${escapeHtml(r.no)}. Koşu</button>`)).join('');
  content.innerHTML = `
    <div class="career-race-pills">${tabs}</div>
    <div style="margin-bottom:12px;font-size:13px;">
      <b>${escapeHtml(result.cityName || '')}</b> · ${escapeHtml(result.date || '')}<br>
      <span style="opacity:.78;line-height:1.55;">
        Önce aynı yarış ailesi bulunur. <b>Tam eşleşme</b> en güçlü referanstır; mesafe/pist değişmiş aynı hipodrom yarışları <b>yarış ailesi</b>, şehir farklı ama sınıf+yaş+mesafe+pist aynı yarışlar <b>koşul ikizi</b> olarak işaretlenir.<br>
        Galibiyeti olan atta <b>Galibiyet Yolu</b>; galibiyeti olmayan atta <b>Hazırlık / İlk 5 Yolu</b> kullanılır. Yarış geçmişi yoksa kariyer yüzdesi üretilmez.
      </span><br>
      <span style="display:inline-block;margin-top:6px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.06);font-size:12px;">
        ${allMode ? `${shownRaces.length} koşu hesaplandı.` : `${escapeHtml(selected)}. koşu gösteriliyor.`}
      </span>
    </div>
    ${shownRaces.map(race => careerRaceAccordionHtml(race, !allMode)).join('')}
  `;
  content.querySelectorAll('[data-career-race]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-career-race') || 'all';
      if ($('analysisRace')) $('analysisRace').value = value;
      renderCareerAnalysis(result, value);
    });
  });
};

runCareerAnalysis = async function(selectedRaces, raceValue) {
  const content = $('analysisContent');
  if (!content) return;
  const horsesToLoad = [];
  for (const race of selectedRaces) for (const horse of Array.isArray(race.horses) ? race.horses : []) horsesToLoad.push({ raceNo:race.no, horse });
  if (!horsesToLoad.length) { content.innerHTML = 'Seçilen koşularda at bulunamadı.'; return; }

  content.innerHTML = `<div style="padding:15px;">Tam/kısmi geçmiş kontrolü hazırlanıyor…<br><br><b>${horsesToLoad.length}</b> güncel at için galibiyet ve ilk-5 yolları ayrıştırılacak.</div>`;
  let completed = 0;
  const loaded = await mapLimit(horsesToLoad, 3, async item => {
    const career = await fetchCareer(item.horse.id, state.date);
    completed++;
    content.innerHTML = `<div style="padding:15px;">Güncel atların kariyer yolları doğrulanıyor…<br><br>${completed} / ${horsesToLoad.length} at tamamlandı.</div>`;
    return { ...item, career };
  });

  const calculatedRaces = [];
  let raceCompleted = 0;
  for (const race of selectedRaces) {
    raceCompleted++;
    content.innerHTML = `<div style="padding:15px;">Tarihsel yarış ailesi, koşul ikizleri ve ilk 3 hazırlanıyor…<br><br>${raceCompleted} / ${selectedRaces.length} koşu</div>`;
    const meta = programRaceMeta(race);
    const roadmap = meta?.ok ? await fetchHistoricalRoadmap(meta) : { ok:false, error:meta?.error || 'Günlük programda bu koşunun şartları eksik.' };
    const raceHorses = loaded.filter(x => x && Number(x.raceNo) === Number(race.no)).map(x => {
      const career = normalizeCareerResponse(x.career || {});
      const similarity = roadmap?.ok
        ? calculateGalibiyetBenzerligi(career.roadmap, roadmap)
        : { score:null, strongest:null, byYear:[], matchedHistoricalHorse:null, matchedHistoricalRace:null, referenceCount:0, analysisMode:career?.analysisMode || adaptiveCurrentMode(career?.roadmap), method:'ADAPTIVE_HISTORY_V10' };
      return { horse:x.horse, career, galibiyetBenzerligi:similarity };
    });
    calculatedRaces.push({
      no:race.no, class:race.class || meta?.class || '', ageGroup:race.ageGroup || meta?.ageGroup || '',
      distance:race.distance || meta?.distance || '', track:race.track || meta?.track || '', meta:meta?.ok ? meta : null,
      roadmapVersion:roadmap?.version || null,
      historicalRaceCount:Array.isArray(roadmap?.historicalRaces) ? roadmap.historicalRaces.length : 0,
      historicalYears:Array.isArray(roadmap?.historicalRaces) ? roadmap.historicalRaces.map(x=>x?.sourceYear).filter(Boolean) : [],
      roadmapError:roadmap?.ok ? null : (roadmap?.error || 'Tarihsel referans bulunamadı.'), horses:raceHorses
    });
  }

  const previous = state.analyses?.career;
  let mergedRaces = calculatedRaces;
  if (raceValue !== 'all' && isValidCareerCache(previous)) {
    const raceMap = new Map(previous.races.map(race => [String(race.no), race]));
    for (const race of calculatedRaces) raceMap.set(String(race.no), race);
    mergedRaces = Array.from(raceMap.values()).sort((a,b)=>Number(a.no)-Number(b.no));
  }

  const result = {
    type:'career', version:CAREER_UI_VERSION, exactHistoryV9:true, adaptiveHistoryV10:true,
    patchVersion:ADAPTIVE_HISTORY_PATCH_VERSION,
    careerApiVersion:'CAREER-ADAPTIVE-V10', roadmapApiVersion:'TJK-ADAPTIVE-ROADMAP-V10', raceSimilarityApiVersion:'ADAPTIVE_FAMILY_TWIN_V10',
    raceMetaApiVersion:'PROGRAM-DIRECT-NO-RESULT-DEPENDENCY', date:state.date, city:state.city, cityName:getCityName(),
    coverage:raceValue === 'all' ? 'all' : (previous?.coverage === 'all' ? 'all' : 'partial'), calculatedRace:raceValue,
    rule:'YEAR_BY_YEAR_PM45_EXACT_FAMILY_TWIN_WITH_WIN_OR_PREPARATION_PATH',
    similarityMethod:'YEAR_BY_YEAR_EFFECTIVE_SUPPORT_V10',
    similarityNote:'Kariyer yolu yüzdesi ile yarış koşulu aktarılabilirliği ayrı hesaplanır; etkin destek = yol benzerliği × koşul uyumu. Yıllar birbirine ortalanmaz.',
    races:mergedRaces, generatedAt:new Date().toISOString()
  };
  state.analyses.career = result;
  save();
  renderCareerAnalysis(result, raceValue);
};

console.info('[AT AI]', ADAPTIVE_HISTORY_PATCH_VERSION, 'aktif');
