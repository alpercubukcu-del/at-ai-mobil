/* AT AI Mobil — V11 doğrulanmış bahis başlangıçları */
const TICKET_BET_STARTS_VERSION = 'TICKET-BET-STARTS-V11.0';
const buildTicketsBeforeBetStartsV11 = buildTicketsV11;

async function refreshBetStartsV11() {
  if (!state?.date || !state?.city || !getCityName()) return { ok:false, error:'Tarih/şehir seçilmedi.' };
  try {
    const url =
      `/api/tjk-bet-starts-v11` +
      `?date=${encodeURIComponent(state.date)}` +
      `&cityId=${encodeURIComponent(state.city)}` +
      `&cityName=${encodeURIComponent(getCityName())}` +
      `&t=${Date.now()}`;
    const res = await fetch(url, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) return { ok:false, error:data?.error || `API ${res.status}` };

    const map = new Map((Array.isArray(data.races) ? data.races : []).map(r => [String(r.raceNo), Array.isArray(r.betStarts) ? r.betStarts : []]));
    let assigned = 0;
    state.races = (Array.isArray(state.races) ? state.races : []).map(race => {
      const starts = map.get(String(race.no)) || [];
      if (starts.length) assigned += starts.length;
      return { ...race, betStarts:starts };
    });
    state.analyses.ticketBetStartsV11 = {
      version:TICKET_BET_STARTS_VERSION,
      date:state.date,
      city:state.city,
      startCount:assigned,
      sourceVersion:data.version || null,
      generatedAt:new Date().toISOString()
    };
    save();
    return { ok:true, startCount:assigned, data };
  } catch (e) {
    return { ok:false, error:e?.message || 'TJK bahis başlangıçları doğrulanamadı.' };
  }
}

buildTicketsV11 = async function() {
  status('TJK bahis başlangıçları doğrulanıyor…');
  const startData = await refreshBetStartsV11();
  if (!startData.ok) {
    status(`Bahis başlangıçları doğrulanamadı: ${startData.error}`);
    return;
  }
  if (!startData.startCount) {
    status('TJK sayfasında “Bu koşudan başlar” bilgisi bulunamadı; kupon başlangıcı tahmin edilmeyecek.');
    return;
  }
  return buildTicketsBeforeBetStartsV11();
};

buildTickets = buildTicketsV11;
if ($('buildAllBtn')) $('buildAllBtn').onclick = buildTicketsV11;
if ($('ticketFromAnalysis')) $('ticketFromAnalysis').onclick = buildTicketsV11;

console.info('[AT AI]', TICKET_BET_STARTS_VERSION, 'aktif');
