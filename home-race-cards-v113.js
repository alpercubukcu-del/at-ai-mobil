/* AT AI Mobil — V11.3 ANA SAYFA CANLI KOŞU KARTLARI
   - TJK benzeri kompakt at gösterimi
   - Canlı GNY + AGF
   - %60 normalize AGF + %40 normalize ters-GNY puanı
   - Koşu içi puan sırası
   - Bugün için 30 sn otomatik piyasa yenileme
*/

const HOME_RACE_CARDS_VERSION = 'HOME-RACE-CARDS-V11.3';
const LIVE_MARKET_INTERVAL_V113 = 30000;
const renderProgramBaseV113 = renderProgram;

const liveMarketStateV113 = {
  inFlight:false,
  lastSuccess:null,
  lastError:null,
  timer:null
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

  const agfTotal = horses.reduce((sum, h) => {
    const a = finiteMarketV113(h.agf);
    return sum + (a !== null && a >= 0 ? a : 0);
  }, 0);

  const invGnyTotal = horses.reduce((sum, h) => {
    const g = finiteMarketV113(h.gny ?? h.odds);
    return sum + (g !== null && g > 0 ? 1 / g : 0);
  }, 0);

  const rows = horses.map(h => {
    const agf = finiteMarketV113(h.agf);
    const gny = finiteMarketV113(h.gny ?? h.odds);
    const normAgf = agf !== null && agf >= 0 && agfTotal > 0
      ? agf / agfTotal * 100
      : null;
    const normGny = gny !== null && gny > 0 && invGnyTotal > 0
      ? (1 / gny) / invGnyTotal * 100
      : null;
    const score = normAgf !== null && normGny !== null
      ? normAgf * 0.60 + normGny * 0.40
      : null;

    return {
      horse:h,
      key:horseMarketKeyV113(h),
      agf,
      gny,
      normAgf,
      normGny,
      score
    };
  });

  const ranked = rows
    .filter(x => x.score !== null)
    .sort((a,b) => b.score - a.score || Number(a.horse?.no || 999) - Number(b.horse?.no || 999));

  const rankMap = new Map(ranked.map((x, i) => [x.key, i + 1]));
  return {
    rows:rows.map(x => ({ ...x, rank:rankMap.get(x.key) || null })),
    rankedCount:ranked.length
  };
}

function fmtMarketV113(v, digits = 2) {
  const n = finiteMarketV113(v);
  if (n === null) return '—';
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits:digits,
    maximumFractionDigits:digits
  });
}

function fmtWeightV113(v) {
  const n = finiteMarketV113(v);
  if (n === null) return '';
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits:1 })} kg`;
}

function liveClockV113() {
  if (!liveMarketStateV113.lastSuccess) return '';
  return liveMarketStateV113.lastSuccess.toLocaleTimeString('tr-TR', {
    hour:'2-digit', minute:'2-digit', second:'2-digit'
  });
}

function horseCardHtmlV113(row, rankedCount) {
  const h = row.horse || {};
  const score = row.score;
  const rank = row.rank;
  const detailBits = [fmtWeightV113(h.weight), h.age || ''].filter(Boolean);
  const statBits = [
    h.st !== null && h.st !== undefined && h.st !== '' ? `ST:${h.st}` : '',
    h.kgs !== null && h.kgs !== undefined && h.kgs !== '' ? `KGS:${h.kgs}` : '',
    h.hp !== null && h.hp !== undefined && h.hp !== '' ? `HP:${h.hp}` : ''
  ].filter(Boolean);

  return `
    <div class="home-horse-card-v113 ${rank === 1 ? 'leader' : ''}">
      <div class="home-horse-no-v113">${escapeHtml(h.no ?? '')}</div>

      <div class="home-horse-main-v113">
        <div class="home-horse-name-v113">${escapeHtml(h.name || '')}</div>
        <div class="home-horse-detail-v113">${escapeHtml(detailBits.join(' · ') || '—')}</div>
        ${h.origin ? `<div class="home-horse-origin-v113">${escapeHtml(h.origin)}</div>` : ''}

        <div class="home-market-row-v113">
          <span class="market-chip-v113 gny"><small>GNY</small><b>${fmtMarketV113(row.gny, 2)}</b></span>
          <span class="market-chip-v113 agf"><small>AGF</small><b>${row.agf === null ? '—' : `%${fmtMarketV113(row.agf, 1)}`}</b></span>
          <span class="market-chip-v113 score"><small>PUAN</small><b>${score === null ? '—' : `%${fmtMarketV113(score, 1)}`}</b></span>
          <span class="market-rank-v113"><small>SIRA</small><b>${rank ? `${rank}/${rankedCount}` : '—'}</b></span>
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

  const shown = state.selectedRace === 'all'
    ? state.races
    : state.races.filter(r => String(r.no) === String(state.selectedRace));

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
          <b>${isToday ? '● CANLI GNY + AGF' : 'GNY + AGF'}</b>
          <small>PUAN = %60 normalize AGF + %40 normalize GNY</small>
        </div>
        <button type="button" class="market-refresh-v113" title="Canlı piyasa verisini yenile">↻ ${clock || 'Yenile'}</button>
      </div>
      <div class="home-horse-list-v113">
        ${ordered.length
          ? ordered.map(row => horseCardHtmlV113(row, metrics.rankedCount)).join('')
          : '<div class="empty">At listesi alınamadı.</div>'}
      </div>
      ${liveMarketStateV113.lastError && isToday
        ? `<div class="live-market-error-v113">Son canlı yenileme alınamadı; ekranda son başarılı değerler korunuyor.</div>`
        : ''}`;
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
      const agf = finiteMarketV113(live.agf);

      h.gny = gny;
      h.odds = gny;
      h.agf = agf;
    }
  }
}

async function refreshLiveMarketV113(force = false) {
  if (liveMarketStateV113.inFlight) return;
  if (!Array.isArray(state.races) || !state.races.length || !state.city || !state.date) return;
  if (!force && state.date !== todayLocal()) return;

  liveMarketStateV113.inFlight = true;
  try {
    const res = await fetch(`/api/tjk-program?date=${encodeURIComponent(state.date)}&t=${Date.now()}`, {
      cache:'no-store',
      headers:{ accept:'application/json' }
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || 'TJK piyasa verisi alınamadı.');

    const liveRaces = data?.racesByCity?.[String(state.city)] || data?.programs?.[String(state.city)] || [];
    if (!Array.isArray(liveRaces) || !liveRaces.length) throw new Error('Seçili şehir için canlı koşu verisi yok.');

    mergeLiveMarketV113(liveRaces);
    liveMarketStateV113.lastSuccess = new Date();
    liveMarketStateV113.lastError = null;
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

/* İlk renderı yeni kart biçimine çevir; bugünün piyasasını hemen tazele. */
renderProgram();
startLiveMarketV113();
setTimeout(() => refreshLiveMarketV113(false), 400);

console.info('[AT AI]', HOME_RACE_CARDS_VERSION, 'aktif');
