/* AT AI Mobil — V11.4 ANA SAYFA CANLI KOŞU KARTLARI
   - TJK benzeri kompakt at gösterimi
   - Canlı GNY: günlük program
   - Canlı AGF-1 / AGF-2: resmi TJK AGFv2
   - Her AGF havuzu için %60 normalize AGF + %40 normalize ters-GNY puanı
   - Koşu içi puan sırası
   - Bugün için 30 sn otomatik piyasa yenileme
*/

const HOME_RACE_CARDS_VERSION = 'HOME-RACE-CARDS-V11.4-AGFV2';
const LIVE_MARKET_INTERVAL_V113 = 30000;
const renderProgramBaseV113 = renderProgram;

const liveMarketStateV113 = {
  inFlight:false,
  lastSuccess:null,
  lastError:null,
  timer:null,
  agfSource:null
};

function finiteMarketV113(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function horseMarketKeyV113(h = {}) {
  if (h.id) return `id:${h.id}`;
  return `no:${h.no}|${String(h.name || '').toLocaleUpperCase('tr-TR').trim()}`;
}

function marketMetricsV113(race = {}) {
  const horses = Array.isArray(race.horses) ? race.horses : [];

  const invGnyTotal = horses.reduce((sum, h) => {
    const g = finiteMarketV113(h.gny ?? h.odds);
    return sum + (g !== null && g > 0 ? 1 / g : 0);
  }, 0);

  const agf1Total = horses.reduce((sum, h) => {
    const a = finiteMarketV113(h.agf1);
    return sum + (a !== null && a >= 0 ? a : 0);
  }, 0);

  const agf2Total = horses.reduce((sum, h) => {
    const a = finiteMarketV113(h.agf2);
    return sum + (a !== null && a >= 0 ? a : 0);
  }, 0);

  const legacyAgfTotal = horses.reduce((sum, h) => {
    const a = finiteMarketV113(h.agf);
    return sum + (a !== null && a >= 0 ? a : 0);
  }, 0);

  const rows = horses.map(h => {
    const gny = finiteMarketV113(h.gny ?? h.odds);
    const agf1 = finiteMarketV113(h.agf1);
    const agf2 = finiteMarketV113(h.agf2);
    const legacyAgf = finiteMarketV113(h.agf);
    const normGny = gny !== null && gny > 0 && invGnyTotal > 0
      ? (1 / gny) / invGnyTotal * 100
      : null;

    const normAgf1 = agf1 !== null && agf1 >= 0 && agf1Total > 0 ? agf1 / agf1Total * 100 : null;
    const normAgf2 = agf2 !== null && agf2 >= 0 && agf2Total > 0 ? agf2 / agf2Total * 100 : null;
    const normLegacy = legacyAgf !== null && legacyAgf >= 0 && legacyAgfTotal > 0 ? legacyAgf / legacyAgfTotal * 100 : null;

    const score1 = normAgf1 !== null && normGny !== null ? normAgf1 * 0.60 + normGny * 0.40 : null;
    const score2 = normAgf2 !== null && normGny !== null ? normAgf2 * 0.60 + normGny * 0.40 : null;
    const legacyScore = score1 === null && score2 === null && normLegacy !== null && normGny !== null
      ? normLegacy * 0.60 + normGny * 0.40
      : null;

    return { horse:h, key:horseMarketKeyV113(h), gny, agf1, agf2, legacyAgf, score1, score2, legacyScore };
  });

  function ranks(field) {
    const ranked = rows
      .filter(x => x[field] !== null)
      .sort((a,b) => b[field] - a[field] || Number(a.horse?.no || 999) - Number(b.horse?.no || 999));
    return { count:ranked.length, map:new Map(ranked.map((x, i) => [x.key, i + 1])) };
  }

  const r1 = ranks('score1');
  const r2 = ranks('score2');
  const rl = ranks('legacyScore');

  return {
    rows:rows.map(x => ({
      ...x,
      rank1:r1.map.get(x.key) || null,
      rank2:r2.map.get(x.key) || null,
      legacyRank:rl.map.get(x.key) || null
    })),
    count1:r1.count,
    count2:r2.count,
    legacyCount:rl.count
  };
}

function fmtMarketV113(v, digits = 2) {
  const n = finiteMarketV113(v);
  if (n === null) return '—';
  return n.toLocaleString('tr-TR', { minimumFractionDigits:digits, maximumFractionDigits:digits });
}

function fmtWeightV113(v) {
  const n = finiteMarketV113(v);
  if (n === null) return '';
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits:1 })} kg`;
}

function liveClockV113() {
  if (!liveMarketStateV113.lastSuccess) return '';
  return liveMarketStateV113.lastSuccess.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function poolChipV114(label, agf, score, rank, count) {
  if (agf === null) return '';
  const suffix = label.endsWith('1') ? '1' : '2';
  return `
    <span class="market-chip-v113 agf"><small>${label}</small><b>%${fmtMarketV113(agf, 1)}</b></span>
    <span class="market-chip-v113 score"><small>P${suffix}</small><b>${score === null ? '—' : `%${fmtMarketV113(score, 1)}`}</b></span>
    <span class="market-rank-v113"><small>S${suffix}</small><b>${rank ? `${rank}/${count}` : '—'}</b></span>`;
}

function horseCardHtmlV113(row, metrics) {
  const h = row.horse || {};
  const detailBits = [fmtWeightV113(h.weight), h.age || ''].filter(Boolean);
  const statBits = [
    h.st !== null && h.st !== undefined && h.st !== '' ? `ST:${h.st}` : '',
    h.kgs !== null && h.kgs !== undefined && h.kgs !== '' ? `KGS:${h.kgs}` : '',
    h.hp !== null && h.hp !== undefined && h.hp !== '' ? `HP:${h.hp}` : ''
  ].filter(Boolean);

  const pool1 = poolChipV114('AGF-1', row.agf1, row.score1, row.rank1, metrics.count1);
  const pool2 = poolChipV114('AGF-2', row.agf2, row.score2, row.rank2, metrics.count2);
  const legacy = !pool1 && !pool2 && row.legacyAgf !== null ? `
    <span class="market-chip-v113 agf"><small>AGF</small><b>%${fmtMarketV113(row.legacyAgf, 1)}</b></span>
    <span class="market-chip-v113 score"><small>PUAN</small><b>${row.legacyScore === null ? '—' : `%${fmtMarketV113(row.legacyScore, 1)}`}</b></span>
    <span class="market-rank-v113"><small>SIRA</small><b>${row.legacyRank ? `${row.legacyRank}/${metrics.legacyCount}` : '—'}</b></span>` : '';

  const leader = row.rank1 === 1 || row.rank2 === 1 || row.legacyRank === 1;

  return `
    <div class="home-horse-card-v113 ${leader ? 'leader' : ''}">
      <div class="home-horse-no-v113">${escapeHtml(h.no ?? '')}</div>
      <div class="home-horse-main-v113">
        <div class="home-horse-name-v113">${escapeHtml(h.name || '')}</div>
        <div class="home-horse-detail-v113">${escapeHtml(detailBits.join(' · ') || '—')}</div>
        ${h.origin ? `<div class="home-horse-origin-v113">${escapeHtml(h.origin)}</div>` : ''}
        <div class="home-market-row-v113">
          <span class="market-chip-v113 gny"><small>GNY</small><b>${fmtMarketV113(row.gny, 2)}</b></span>
          ${pool1}${pool2}${legacy || (!pool1 && !pool2 ? '<span class="market-chip-v113 agf"><small>AGF</small><b>—</b></span><span class="market-chip-v113 score"><small>PUAN</small><b>—</b></span>' : '')}
        </div>
      </div>
      <div class="home-horse-side-v113">
        <div class="home-jockey-v113">${h.apprentice ? '<span>Ap</span> ' : ''}${escapeHtml(h.jockey || '—')}</div>
        <div class="home-stats-v113">${escapeHtml(statBits.join(' · ') || '—')}</div>
        ${h.best ? `<div class="home-best-v113">EİD: <b>${escapeHtml(h.best)}</b></div>` : ''}
      </div>
    </div>`;
}

function enhanceProgramCardsV113() {
  const raceList = $('raceList');
  if (!raceList || !Array.isArray(state.races) || !state.races.length) return;

  const shown = state.selectedRace === 'all' ? state.races : state.races.filter(r => String(r.no) === String(state.selectedRace));
  const cards = [...raceList.querySelectorAll('.race-card')];
  cards.forEach((card, index) => {
    const race = shown[index];
    if (!race) return;
    const list = card.querySelector('.horse-list');
    if (!list) return;

    const metrics = marketMetricsV113(race);
    const ordered = [...metrics.rows].sort((a,b) => Number(a.horse?.no || 999) - Number(b.horse?.no || 999));
    const isToday = state.date === todayLocal();
    const clock = liveClockV113();

    list.innerHTML = `
      <div class="live-market-head-v113">
        <div>
          <b>${isToday ? '● CANLI GNY + AGFv2' : 'GNY + AGF'}</b>
          <small>AGF-1 ve AGF-2 ayrı · PUAN = %60 normalize AGF + %40 normalize GNY</small>
        </div>
        <button type="button" class="market-refresh-v113" title="Canlı piyasa verisini yenile">↻ ${clock || 'Yenile'}</button>
      </div>
      <div class="home-horse-list-v113">
        ${ordered.length ? ordered.map(row => horseCardHtmlV113(row, metrics)).join('') : '<div class="empty">At listesi alınamadı.</div>'}
      </div>
      ${liveMarketStateV113.lastError && isToday ? `<div class="live-market-error-v113">${escapeHtml(liveMarketStateV113.lastError)}</div>` : ''}`;
  });

  raceList.querySelectorAll('.market-refresh-v113').forEach(btn => {
    btn.addEventListener('click', () => refreshLiveMarketV113(true));
  });
}

renderProgram = function() {
  renderProgramBaseV113();
  enhanceProgramCardsV113();
};

function mergeLiveMarketV113(liveRaces) {
  const raceMap = new Map((Array.isArray(liveRaces) ? liveRaces : []).map(r => [String(r.no), r]));
  for (const race of Array.isArray(state.races) ? state.races : []) {
    const liveRace = raceMap.get(String(race.no));
    if (!liveRace) continue;
    const liveById = new Map();
    const liveByNo = new Map();
    for (const h of Array.isArray(liveRace.horses) ? liveRace.horses : []) {
      if (h.id) liveById.set(String(h.id), h);
      if (h.no !== null && h.no !== undefined) liveByNo.set(String(h.no), h);
    }
    for (const h of Array.isArray(race.horses) ? race.horses : []) {
      const live = (h.id && liveById.get(String(h.id))) || liveByNo.get(String(h.no));
      if (!live) continue;
      const gny = finiteMarketV113(live.gny ?? live.odds);
      h.gny = gny;
      h.odds = gny;
      if (finiteMarketV113(live.agf) !== null && finiteMarketV113(h.agf1) === null && finiteMarketV113(h.agf2) === null) {
        h.agf = finiteMarketV113(live.agf);
      }
    }
  }
}

function mergeAgfPoolsV114(data) {
  const p1 = data?.agf?.pool1?.byRace || {};
  const p2 = data?.agf?.pool2?.byRace || {};
  let values = 0;
  for (const race of Array.isArray(state.races) ? state.races : []) {
    const map1 = p1[String(race.no)] || {};
    const map2 = p2[String(race.no)] || {};
    for (const h of Array.isArray(race.horses) ? race.horses : []) {
      const v1 = finiteMarketV113(map1[String(h.no)]);
      const v2 = finiteMarketV113(map2[String(h.no)]);
      h.agf1 = v1;
      h.agf2 = v2;
      if (v1 !== null || v2 !== null) values += 1;
      if (v1 !== null) h.agf = v1;
      else if (v2 !== null) h.agf = v2;
    }
  }
  liveMarketStateV113.agfSource = values ? 'AGFv2' : null;
  return values;
}

async function refreshLiveMarketV113(force = false) {
  if (liveMarketStateV113.inFlight) return;
  if (!Array.isArray(state.races) || !state.races.length || !state.city || !state.date) return;
  if (!force && state.date !== todayLocal()) return;

  liveMarketStateV113.inFlight = true;
  try {
    const cityName = getCityName();
    const [programResult, agfResult] = await Promise.allSettled([
      fetch(`/api/tjk-program?date=${encodeURIComponent(state.date)}&t=${Date.now()}`, {
        cache:'no-store', headers:{ accept:'application/json' }
      }).then(async res => {
        if (!res.ok) throw new Error(`Program API ${res.status}`);
        return res.json();
      }),
      fetch(`/api/tjk-bet-starts-v11?date=${encodeURIComponent(state.date)}&cityId=${encodeURIComponent(state.city)}&cityName=${encodeURIComponent(cityName)}&t=${Date.now()}`, {
        cache:'no-store', headers:{ accept:'application/json' }
      }).then(async res => {
        if (!res.ok) throw new Error(`AGF API ${res.status}`);
        return res.json();
      })
    ]);

    let success = false;
    const errors = [];

    if (programResult.status === 'fulfilled' && programResult.value?.ok) {
      const data = programResult.value;
      const liveRaces = data?.racesByCity?.[String(state.city)] || data?.programs?.[String(state.city)] || [];
      if (Array.isArray(liveRaces) && liveRaces.length) {
        mergeLiveMarketV113(liveRaces);
        success = true;
      }
    } else if (programResult.status === 'rejected') {
      errors.push(programResult.reason?.message || 'GNY alınamadı');
    }

    if (agfResult.status === 'fulfilled' && agfResult.value?.ok) {
      const count = mergeAgfPoolsV114(agfResult.value);
      if (count > 0) success = true;
      else errors.push('AGFv2 sayfasında eşleşen AGF bulunamadı');
    } else if (agfResult.status === 'rejected') {
      errors.push(agfResult.reason?.message || 'AGFv2 alınamadı');
    }

    if (!success) throw new Error(errors.join(' · ') || 'Canlı piyasa verisi alınamadı.');
    liveMarketStateV113.lastSuccess = new Date();
    liveMarketStateV113.lastError = errors.length ? errors.join(' · ') : null;
    save();
    renderProgram();
  } catch (e) {
    liveMarketStateV113.lastError = e?.message || String(e);
    enhanceProgramCardsV113();
  } finally {
    liveMarketStateV113.inFlight = false;
  }
}

function startLiveMarketV113() {
  if (liveMarketStateV113.timer) clearInterval(liveMarketStateV113.timer);
  liveMarketStateV113.timer = setInterval(() => {
    if (document.visibilityState === 'visible') refreshLiveMarketV113(false);
  }, LIVE_MARKET_INTERVAL_V113);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshLiveMarketV113(false);
});

renderProgram();
startLiveMarketV113();
setTimeout(() => refreshLiveMarketV113(false), 400);

console.info('[AT AI]', HOME_RACE_CARDS_VERSION, 'aktif');
