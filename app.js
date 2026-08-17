const $ = id => document.getElementById(id);

const STORAGE_KEY = 'at_ai_mobil_state_v2';
const CAREER_UI_VERSION = 'CAREER-UI-V4';

const BET_TYPES = [
  '7li Ganyan',
  '7li Plase',
  '1. 3lü Ganyan',
  '2. 3lü Ganyan',
  '1. 6lı Ganyan',
  '2. 6lı Ganyan',
  '1. 5li Ganyan',
  '2. 5li Ganyan',
  '4lü Ganyan'
];

const defaultState = {
  date: '',
  city: '',
  cities: [],
  races: [],
  selectedRace: 'all',
  signalSource: 'combined',
  tickets: [],
  analyses: {
    current: {},
    historical: {},
    scenario: {},
    career: {}
  }
};

let state = loadState();

/* =========================================================
   STATE
========================================================= */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return structuredClone(defaultState);
    }

    const parsed = JSON.parse(raw);

    const result = {
      ...structuredClone(defaultState),
      ...parsed,
      analyses: {
        ...structuredClone(defaultState.analyses),
        ...(parsed.analyses || {})
      }
    };

    /*
      V2 kariyer ekranı tüm koşuları uzun biçimde açıyordu.
      V3 ile eski kariyer görünümünü kullanmıyoruz.
    */
    if (
      result.analyses?.career &&
      result.analyses.career.version !== CAREER_UI_VERSION
    ) {
      result.analyses.career = {};
    }

    return result;
  } catch (e) {
    console.warn('State okunamadı:', e);
    return structuredClone(defaultState);
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('State kaydedilemedi:', e);
    return false;
  }
}

/* =========================================================
   GENEL
========================================================= */

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function status(text) {
  const el = $('status');
  if (el) el.textContent = text;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getCityName() {
  const c = state.cities.find(
    x => String(x.id) === String(state.city)
  );

  return c?.name || '';
}

/* =========================================================
   PROGRAM NORMALIZE
========================================================= */

function normalizeRace(race) {
  return {
    no: Number(race?.no || 0),
    time: race?.time || '',
    class: race?.class || race?.yaradi1 || '',
    ageGroup:
      race?.ageGroup ||
      race?.yaradi2 ||
      race?.group ||
      race?.age_group ||
      '',
    distance: race?.distance || race?.mesafe || '',
    track: race?.track || race?.pist || '',
    betStarts: Array.isArray(race?.betStarts) ? race.betStarts : [],
    horses: Array.isArray(race?.horses) ? race.horses : []
  };
}

function getCurrentRaceList(data, cityId) {
  if (!data?.racesByCity) return [];

  const direct =
    data.racesByCity[String(cityId)] ??
    data.racesByCity[Number(cityId)] ??
    [];

  return Array.isArray(direct)
    ? direct.map(normalizeRace)
    : [];
}


async function enrichProgramRaceMeta(races) {
  const list = Array.isArray(races) ? races : [];
  if (!list.length) return [];

  return mapLimit(list, 3, async race => {
    if (race.ageGroup) {
      return race;
    }

    const meta = await fetchRaceMeta(race.no);

    if (!meta?.ok) {
      return {
        ...race,
        ageGroup: '',
        metaError: meta?.error || 'Yaş grubu alınamadı.'
      };
    }

    return {
      ...race,
      ageGroup: meta.ageGroup || '',
      class: race.class || meta.class || '',
      distance: race.distance || meta.distance || '',
      track: race.track || meta.track || '',
      officialMeta: meta
    };
  });
}

/* =========================================================
   ŞEHİRLER
========================================================= */

function renderCities() {
  const select = $('citySelect');
  if (!select) return;

  if (!Array.isArray(state.cities) || state.cities.length === 0) {
    select.innerHTML =
      '<option value="">Şehir bulunamadı</option>';
    select.value = '';
    return;
  }

  const valid = state.cities.some(
    c => String(c.id) === String(state.city)
  );

  if (!valid) {
    state.city = String(state.cities[0].id);
  }

  select.innerHTML = state.cities
    .map(
      c => `
        <option
          value="${escapeHtml(c.id)}"
          ${
            String(c.id) === String(state.city)
              ? 'selected'
              : ''
          }
        >
          ${escapeHtml(c.name)}
        </option>
      `
    )
    .join('');

  select.value = String(state.city);
}

/* =========================================================
   BAHİSLER
========================================================= */

function renderBetTypes() {
  const box = $('betTypes');
  if (!box) return;

  box.innerHTML = BET_TYPES
    .map(
      name => `
        <label class="bet-card">
          <input
            type="checkbox"
            class="bet-check"
            value="${escapeHtml(name)}"
            checked
          >
          <span>${escapeHtml(name)}</span>
        </label>
      `
    )
    .join('');
}

/* =========================================================
   PROGRAM
========================================================= */

function renderProgram() {
  const raceTabs = $('raceTabs');
  const raceList = $('raceList');
  const analysisRace = $('analysisRace');

  if (!raceTabs || !raceList) return;

  if (!Array.isArray(state.races) || state.races.length === 0) {
    raceTabs.innerHTML = '';

    raceList.classList.add('empty');
    raceList.innerHTML =
      'Bu şehir için koşular henüz alınamadı veya program boş.';

    if (analysisRace) {
      analysisRace.innerHTML =
        '<option value="all">Tüm Koşular</option>';
    }

    return;
  }

  raceList.classList.remove('empty');

  raceTabs.innerHTML =
    `
      <button
        class="race-tab ${
          state.selectedRace === 'all' ? 'active' : ''
        }"
        data-race="all"
      >
        Tümü
      </button>
    ` +
    state.races
      .map(
        r => `
          <button
            class="race-tab ${
              String(state.selectedRace) === String(r.no)
                ? 'active'
                : ''
            }"
            data-race="${r.no}"
          >
            ${r.no}. Koşu
          </button>
        `
      )
      .join('');

  raceTabs
    .querySelectorAll('[data-race]')
    .forEach(btn => {
      btn.onclick = () => {
        state.selectedRace = btn.dataset.race;
        save();
        renderProgram();
      };
    });

  const shown =
    state.selectedRace === 'all'
      ? state.races
      : state.races.filter(
          r => String(r.no) === String(state.selectedRace)
        );

  raceList.innerHTML = shown
    .map(
      race => `
        <article class="race-card">

          <div class="race-head">
            <div>
              <strong>${race.no}. Koşu</strong>
              ${
                race.time
                  ? `<span>${escapeHtml(race.time)}</span>`
                  : ''
              }
            </div>
          </div>

          <div class="race-meta">
            ${
              race.class
                ? `<span>${escapeHtml(race.class)}</span>`
                : ''
            }
            ${
              race.ageGroup
                ? `<span><b>${escapeHtml(race.ageGroup)}</b></span>`
                : '<span style="opacity:.65;">Yaş grubu alınamadı</span>'
            }
            ${
              race.distance
                ? `<span>${escapeHtml(race.distance)}</span>`
                : ''
            }
            ${
              race.track
                ? `<span>${escapeHtml(race.track)}</span>`
                : ''
            }
          </div>

          ${
            race.betStarts?.length
              ? `
                <div class="bet-starts">
                  Başlayan bahisler:
                  ${race.betStarts
                    .map(x => `<b>${escapeHtml(x)}</b>`)
                    .join(' · ')}
                </div>
              `
              : ''
          }

          <div class="horse-list">
            ${
              race.horses.length
                ? race.horses
                    .map(
                      h => `
                        <div class="horse-row">
                          <div>
                            <b>
                              ${escapeHtml(h.no)}.
                              ${escapeHtml(h.name)}
                            </b>

                            ${
                              h.jockey
                                ? `<small>${escapeHtml(h.jockey)}</small>`
                                : ''
                            }
                          </div>

                          <div class="horse-stats">
                            ${
                              h.hp !== ''
                                ? `<span>HP ${escapeHtml(h.hp)}</span>`
                                : ''
                            }

                            ${
                              h.odds
                                ? `<span>Gny ${escapeHtml(h.odds)}</span>`
                                : ''
                            }
                          </div>
                        </div>
                      `
                    )
                    .join('')
                : `
                  <div class="empty">
                    At listesi alınamadı.
                  </div>
                `
            }
          </div>
        </article>
      `
    )
    .join('');

  if (analysisRace) {
    const oldValue = analysisRace.value || 'all';

    analysisRace.innerHTML =
      '<option value="all">Tüm Koşular</option>' +
      state.races
        .map(
          r =>
            `<option value="${r.no}">${r.no}. Koşu</option>`
        )
        .join('');

    const stillExists =
      oldValue === 'all' ||
      state.races.some(
        r => String(r.no) === String(oldValue)
      );

    analysisRace.value =
      stillExists ? oldValue : 'all';
  }
}

/* =========================================================
   PROGRAM YÜKLE
========================================================= */

async function loadProgram() {
  const date =
    $('raceDate')?.value ||
    todayLocal();

  status('TJK programı alınıyor…');

  try {
    const url =
      `/api/tjk-program?date=${encodeURIComponent(date)}` +
      `&t=${Date.now()}`;

    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        accept: 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`API ${res.status}`);
    }

    const data = await res.json();

    state.date = date;
    state.cities =
      Array.isArray(data.cities)
        ? data.cities
        : [];

    if (state.cities.length === 0) {
      state.city = '';
      state.races = [];

      save();
      renderCities();
      renderProgram();

      status(
        'Bu tarih için şehir bulunamadı.'
      );

      return;
    }

    const currentCityExists =
      state.cities.some(
        c =>
          String(c.id) ===
          String(state.city)
      );

    if (!currentCityExists) {
      const turkeyCity =
        state.cities.find(
          c =>
            /İstanbul|İzmir|Ankara|Bursa|Kocaeli|Adana|Antalya|Elazığ|Şanlıurfa|Diyarbakır/i.test(
              c.name
            )
        ) ||
        state.cities[0];

      state.city =
        String(turkeyCity.id);
    }

    state.races =
      getCurrentRaceList(
        data,
        state.city
      );

    status('Koşu yaş grupları TJK programından tamamlanıyor…');
    state.races = await enrichProgramRaceMeta(state.races);

    state.tickets = [];

    /*
      Program değiştiğinde eski kariyer
      analizini başka güne/şehre taşımıyoruz.
    */
    state.analyses.career = {};

    save();

    renderCities();
    renderProgram();
    renderTickets();

    status(
      `${state.cities.length} şehir bulundu · ${state.races.length} koşu`
    );
  } catch (err) {
    console.error(
      'loadProgram error:',
      err
    );

    state.cities = [];
    state.races = [];

    save();

    renderCities();
    renderProgram();

    status(
      `TJK erişimi şu anda alınamadı. API hatası: ${
        err?.message ||
        'Bilinmeyen hata'
      }`
    );
  }
}

/* =========================================================
   ŞEHİR DEĞİŞTİR
========================================================= */

async function changeCity(cityId) {
  state.city =
    String(cityId);

  state.selectedRace =
    'all';

  state.tickets = [];
  state.analyses.career = {};

  save();

  const date =
    $('raceDate')?.value ||
    state.date ||
    todayLocal();

  status(
    'Şehir programı yükleniyor…'
  );

  try {
    const res =
      await fetch(
        `/api/tjk-program?date=${encodeURIComponent(
          date
        )}&t=${Date.now()}`,
        {
          cache: 'no-store'
        }
      );

    if (!res.ok) {
      throw new Error(
        `API ${res.status}`
      );
    }

    const data =
      await res.json();

    state.cities =
      Array.isArray(data.cities)
        ? data.cities
        : [];

    state.races =
      getCurrentRaceList(
        data,
        state.city
      );

    status('Koşu yaş grupları TJK programından tamamlanıyor…');
    state.races = await enrichProgramRaceMeta(state.races);

    save();

    renderCities();
    renderProgram();
    renderTickets();

    status(
      `${state.races.length} koşu yüklendi.`
    );
  } catch (err) {
    console.error(
      'changeCity error:',
      err
    );

    state.races = [];

    save();
    renderProgram();

    status(
      `Şehir programı alınamadı: ${err.message}`
    );
  }
}

/* =========================================================
   KUPON
========================================================= */

function renderTickets() {
  const box = $('tickets');
  if (!box) return;

  if (!state.tickets.length) {
    box.classList.add('empty');
    box.innerHTML =
      'Henüz kupon oluşturulmadı.';
    return;
  }

  box.classList.remove('empty');

  box.innerHTML =
    state.tickets
      .map(
        t => `
          <div class="ticket-card">
            <strong>${escapeHtml(t.type)}</strong>
            <div>${escapeHtml(t.source)}</div>
            <small>${escapeHtml(t.createdAt)}</small>
          </div>
        `
      )
      .join('');
}

function buildTickets() {
  const selected = [
    ...document.querySelectorAll(
      '.bet-check:checked'
    )
  ].map(x => x.value);

  const source =
    $('signalSource')?.value ||
    'combined';

  if (!selected.length) {
    status(
      'En az bir bahis türü seçin.'
    );
    return;
  }

  state.signalSource = source;

  const now =
    new Date()
      .toLocaleString('tr-TR');

  state.tickets =
    selected.map(
      type => ({
        type,
        source,
        date: state.date,
        city: state.city,
        createdAt: now
      })
    );

  save();
  renderTickets();

  status(
    `${state.tickets.length} kupon taslağı oluşturuldu.`
  );
}

/* =========================================================
   TEMİZLE
========================================================= */

function clearAnalyses() {
  const ok =
    confirm(
      'Tüm analizler ve oluşturulan kuponlar silinsin mi?'
    );

  if (!ok) return;

  state.analyses =
    structuredClone(
      defaultState.analyses
    );

  state.tickets = [];

  save();
  renderTickets();

  const content =
    $('analysisContent');

  if (content) {
    content.innerHTML =
      'Analiz seçilmedi.';

    content
      .classList
      .add('empty');
  }

  status(
    'Analizler temizlendi.'
  );
}

/* =========================================================
   DRAWER
========================================================= */

function openDrawer() {
  $('drawer')
    ?.classList
    .add('open');

  $('overlay')
    ?.classList
    .add('show');

  $('drawer')
    ?.setAttribute(
      'aria-hidden',
      'false'
    );
}

function closeDrawer() {
  $('drawer')
    ?.classList
    .remove('open');

  $('overlay')
    ?.classList
    .remove('show');

  $('drawer')
    ?.setAttribute(
      'aria-hidden',
      'true'
    );
}

/* =========================================================
   CAREER V8 NORMALIZE
========================================================= */

function normalizeCareerSummary(
  data,
  roadmap
) {
  const apiSummary =
    data?.summary &&
    typeof data.summary ===
      'object'
      ? data.summary
      : {};

  const computed = {
    totalTop5:
      roadmap.length,

    first:
      roadmap.filter(
        x =>
          Number(x.finish) === 1
      ).length,

    second:
      roadmap.filter(
        x =>
          Number(x.finish) === 2
      ).length,

    third:
      roadmap.filter(
        x =>
          Number(x.finish) === 3
      ).length,

    fourth:
      roadmap.filter(
        x =>
          Number(x.finish) === 4
      ).length,

    fifth:
      roadmap.filter(
        x =>
          Number(x.finish) === 5
      ).length
  };

  return {
    totalTop5:
      numberValue(
        apiSummary.totalTop5,
        computed.totalTop5
      ),

    first:
      numberValue(
        apiSummary.first,
        computed.first
      ),

    second:
      numberValue(
        apiSummary.second,
        computed.second
      ),

    third:
      numberValue(
        apiSummary.third,
        computed.third
      ),

    fourth:
      numberValue(
        apiSummary.fourth,
        computed.fourth
      ),

    fifth:
      numberValue(
        apiSummary.fifth,
        computed.fifth
      )
  };
}

function normalizeCareerResponse(
  data
) {
  const roadmap =
    Array.isArray(data?.roadmap)
      ? data.roadmap
      : Array.isArray(data?.top5)
        ? data.top5
        : Array.isArray(data?.races)
          ? data.races
          : [];

  const summary =
    normalizeCareerSummary(
      data,
      roadmap
    );

  return {
    ...data,
    roadmap,
    summary,

    top5Count:
      summary.totalTop5,

    finishCounts: {
      first: summary.first,
      second: summary.second,
      third: summary.third,
      fourth: summary.fourth,
      fifth: summary.fifth
    }
  };
}

/* =========================================================
   V4 — GERÇEK KARİYER YOLU BENZERLİĞİ
========================================================= */

function normalizeTextTr(value = '') {
  return String(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function extractClassInfo(value = '') {
  const t = normalizeTextTr(value);
  const m = t.match(/(handikap|sartli|kv|g|maiden|satis)\s*[- ]?\s*(\d+)?/i);

  if (!m) {
    return { family: t, level: null };
  }

  return {
    family: m[1],
    level: m[2] ? Number(m[2]) : null
  };
}

function classSimilarity(a, b) {
  const aa = extractClassInfo(a);
  const bb = extractClassInfo(b);

  if (!aa.family || !bb.family) return 0.4;
  if (normalizeTextTr(a) === normalizeTextTr(b)) return 1;
  if (aa.family !== bb.family) return 0.2;

  if (aa.level == null || bb.level == null) return 0.82;

  const d = Math.abs(aa.level - bb.level);
  if (d === 0) return 0.95;
  if (d === 1) return 0.88;
  if (d === 2) return 0.76;
  if (d === 3) return 0.62;
  return 0.45;
}

function ageGroupSimilarity(a, b) {
  const aa = normalizeTextTr(a);
  const bb = normalizeTextTr(b);
  if (!aa || !bb) return 0.35;
  if (aa === bb) return 1;

  const breedA = aa.includes('arap') ? 'arap' : aa.includes('ingiliz') ? 'ingiliz' : '';
  const breedB = bb.includes('arap') ? 'arap' : bb.includes('ingiliz') ? 'ingiliz' : '';
  if (breedA && breedB && breedA !== breedB) return 0;

  const na = Number((aa.match(/\d+/) || [])[0]);
  const nb = Number((bb.match(/\d+/) || [])[0]);

  if (Number.isFinite(na) && Number.isFinite(nb)) {
    const d = Math.abs(na - nb);
    if (d === 1) return 0.72;
    if (d === 2) return 0.45;
  }

  return breedA && breedA === breedB ? 0.55 : 0.3;
}

function trackSimilarity(a, b) {
  const aa = normalizeTextTr(a);
  const bb = normalizeTextTr(b);
  if (!aa || !bb) return 0.35;
  if (aa === bb) return 1;
  return 0.12;
}

function distanceSimilarity(a, b) {
  const aa = Number(a);
  const bb = Number(b);
  if (!Number.isFinite(aa) || !Number.isFinite(bb)) return 0.35;
  const d = Math.abs(aa - bb);
  return clamp01(1 - d / 800);
}

const CITY_TIER = {
  istanbul: 1,
  ankara: 1,
  adana: 2,
  izmir: 2,
  bursa: 2,
  antalya: 2,
  kocaeli: 2,
  sanliurfa: 3,
  elazig: 3,
  diyarbakir: 3
};

function citySimilarity(a, b) {
  const aa = normalizeTextTr(a);
  const bb = normalizeTextTr(b);
  if (!aa || !bb) return 0.35;
  if (aa === bb) return 1;

  const ta = CITY_TIER[aa];
  const tb = CITY_TIER[bb];
  if (ta && tb && ta === tb) return 0.82;
  if (ta && tb && Math.abs(ta - tb) === 1) return 0.5;
  return 0.28;
}

function finishSimilarity(a, b) {
  const aa = Number(a);
  const bb = Number(b);
  if (!Number.isFinite(aa) || !Number.isFinite(bb)) return 0.35;
  const d = Math.abs(aa - bb);
  return clamp01(1 - d * 0.2);
}

function careerRowSimilarity(a, b) {
  if (!a || !b) return 0;

  const score =
    ageGroupSimilarity(a.ageGroup || a.group, b.ageGroup || b.group) * 0.22 +
    classSimilarity(a.class || a.raceClass, b.class || b.raceClass) * 0.24 +
    trackSimilarity(a.track || a.pist, b.track || b.pist) * 0.14 +
    distanceSimilarity(a.distance || a.mesafe || a.msf, b.distance || b.mesafe || b.msf) * 0.16 +
    citySimilarity(a.city, b.city) * 0.10 +
    finishSimilarity(a.finish ?? a.rank ?? a.sira, b.finish ?? b.rank ?? b.sira) * 0.14;

  return clamp01(score);
}

function orderedPathSimilarity(pathA, pathB) {
  const a = Array.isArray(pathA) ? pathA : [];
  const b = Array.isArray(pathB) ? pathB : [];
  if (!a.length || !b.length) return 0;

  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const gap = -0.18;

  for (let i = 1; i <= n; i++) dp[i][0] = i * gap;
  for (let j = 1; j <= m; j++) dp[0][j] = j * gap;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const local = careerRowSimilarity(a[i - 1], b[j - 1]);
      const match = dp[i - 1][j - 1] + (local - 0.35);
      const del = dp[i - 1][j] + gap;
      const ins = dp[i][j - 1] + gap;
      dp[i][j] = Math.max(match, del, ins);
    }
  }

  const maxLen = Math.max(n, m);
  const raw = dp[n][m] / Math.max(1, maxLen);
  const aligned = clamp01((raw + 0.35) / 0.65);

  const forward = a.reduce((sum, row) => {
    const best = Math.max(...b.map(ref => careerRowSimilarity(row, ref)));
    return sum + best;
  }, 0) / n;

  const backward = b.reduce((sum, row) => {
    const best = Math.max(...a.map(ref => careerRowSimilarity(row, ref)));
    return sum + best;
  }, 0) / m;

  const coverage = (forward + backward) / 2;
  return clamp01(aligned * 0.35 + coverage * 0.65);
}

function historicalFinishWeight(finish) {
  const f = Number(finish);
  if (f === 1) return 1;
  if (f === 2) return 0.95;
  if (f === 3) return 0.90;
  return 0.85;
}

function calculateGalibiyetBenzerligi(currentPath, roadmapData) {
  const historicalRaces = Array.isArray(roadmapData?.historicalRaces)
    ? roadmapData.historicalRaces.filter(x => x?.ok !== false)
    : [];

  if (!Array.isArray(currentPath) || !currentPath.length || !historicalRaces.length) {
    return {
      score: null,
      matchedHistoricalHorse: null,
      matchedHistoricalRace: null,
      referenceCount: 0
    };
  }

  let weightedSum = 0;
  let weightSum = 0;
  let globalBest = null;
  let referenceCount = 0;

  for (const race of historicalRaces) {
    const refs = Array.isArray(race.top3) ? race.top3 : [];
    let raceBest = null;

    for (const ref of refs) {
      const refPath = Array.isArray(ref?.career?.top5Before)
        ? ref.career.top5Before
        : [];
      if (!refPath.length) continue;

      referenceCount++;
      const pathScore = orderedPathSimilarity(currentPath, refPath);
      const adjusted = pathScore * historicalFinishWeight(ref.finish);

      if (!raceBest || adjusted > raceBest.adjusted) {
        raceBest = {
          adjusted,
          pathScore,
          horseName: ref.horseName || '',
          finish: ref.finish,
          raceDate: race.date || '',
          raceCity: race.city || '',
          raceNo: race.raceNo || '',
          raceConditionSimilarity: Number(race.raceConditionSimilarity || 0)
        };
      }
    }

    if (!raceBest) continue;

    const raceWeight = clamp01(Number(race.raceConditionSimilarity || 0) / 100) || 0.5;
    weightedSum += raceBest.adjusted * raceWeight;
    weightSum += raceWeight;

    if (!globalBest || raceBest.adjusted > globalBest.adjusted) {
      globalBest = raceBest;
    }
  }

  if (!weightSum) {
    return {
      score: null,
      matchedHistoricalHorse: null,
      matchedHistoricalRace: null,
      referenceCount
    };
  }

  return {
    score: Math.round(clamp01(weightedSum / weightSum) * 100),
    matchedHistoricalHorse: globalBest?.horseName || null,
    matchedHistoricalFinish: globalBest?.finish || null,
    matchedHistoricalRace: globalBest
      ? `${globalBest.raceDate} ${globalBest.raceCity} ${globalBest.raceNo}. Koşu`
      : null,
    referenceCount
  };
}

async function fetchRaceMeta(raceNo) {
  try {
    const cityName = getCityName();
    const url =
      `/api/tjk-race-meta` +
      `?date=${encodeURIComponent(state.date)}` +
      `&cityId=${encodeURIComponent(state.city)}` +
      `&city=${encodeURIComponent(cityName)}` +
      `&raceNo=${encodeURIComponent(raceNo)}` +
      `&t=${Date.now()}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || `API ${res.status}` };
    }
    return data;
  } catch (e) {
    return { ok: false, error: e?.message || 'Koşu meta verisi alınamadı.' };
  }
}

async function fetchHistoricalRoadmap(meta) {
  if (!meta?.ok) {
    return { ok: false, error: meta?.error || 'Koşu koşulları eksik.' };
  }

  try {
    const url =
      `/api/tjk-roadmap` +
      `?date=${encodeURIComponent(state.date)}` +
      `&city=${encodeURIComponent(getCityName())}` +
      `&class=${encodeURIComponent(meta.class || '')}` +
      `&ageGroup=${encodeURIComponent(meta.ageGroup || '')}` +
      `&track=${encodeURIComponent(meta.track || '')}` +
      `&distance=${encodeURIComponent(meta.distance || '')}` +
      `&similarLimit=2` +
      `&t=${Date.now()}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || `API ${res.status}` };
    }
    return data;
  } catch (e) {
    return { ok: false, error: e?.message || 'Tarihsel yol haritası alınamadı.' };
  }
}

/* =========================================================
   CAREER API
========================================================= */

async function fetchCareer(
  horseId,
  before
) {
  if (!horseId) {
    return {
      ok: false,
      error:
        'At ID bulunamadı.',
      roadmap: [],
      summary: {
        totalTop5: 0,
        first: 0,
        second: 0,
        third: 0,
        fourth: 0,
        fifth: 0
      }
    };
  }

  try {
    const url =
      `/api/tjk-career` +
      `?horseId=${encodeURIComponent(horseId)}` +
      `&before=${encodeURIComponent(before)}` +
      `&t=${Date.now()}`;

    const res =
      await fetch(
        url,
        {
          cache: 'no-store'
        }
      );

    const data =
      await res.json();

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error:
          data?.error ||
          `API ${res.status}`,
        roadmap: [],
        summary: {
          totalTop5: 0,
          first: 0,
          second: 0,
          third: 0,
          fourth: 0,
          fifth: 0
        }
      };
    }

    return normalizeCareerResponse(
      data
    );
  } catch (e) {
    return {
      ok: false,
      error:
        e?.message ||
        'Kariyer alınamadı.',
      roadmap: [],
      summary: {
        totalTop5: 0,
        first: 0,
        second: 0,
        third: 0,
        fourth: 0,
        fifth: 0
      }
    };
  }
}

/* =========================================================
   CONCURRENCY
========================================================= */

async function mapLimit(
  items,
  limit,
  worker
) {
  const results =
    new Array(items.length);

  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;

      try {
        results[index] =
          await worker(
            items[index],
            index
          );
      } catch (e) {
        results[index] = {
          error:
            e?.message ||
            'Hata'
        };
      }
    }
  }

  const count =
    Math.min(
      Math.max(1, limit),
      items.length
    );

  if (!count) return [];

  await Promise.all(
    Array.from(
      { length: count },
      () => run()
    )
  );

  return results;
}

/* =========================================================
   CAREER ÖZET
========================================================= */

function careerSummaryHtml(
  career
) {
  const roadmap =
    Array.isArray(
      career?.roadmap
    )
      ? career.roadmap
      : [];

  const summary =
    normalizeCareerSummary(
      career,
      roadmap
    );

  return `
    <div style="
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      margin:8px 0 12px 0;
    ">
      <span style="padding:5px 8px;border:1px solid rgba(255,255,255,.15);border-radius:8px;">
        İlk 5: <b>${summary.totalTop5}</b>
      </span>

      <span style="padding:5px 8px;border:1px solid rgba(255,255,255,.15);border-radius:8px;">
        1: <b>${summary.first}</b>
      </span>

      <span style="padding:5px 8px;border:1px solid rgba(255,255,255,.15);border-radius:8px;">
        2: <b>${summary.second}</b>
      </span>

      <span style="padding:5px 8px;border:1px solid rgba(255,255,255,.15);border-radius:8px;">
        3: <b>${summary.third}</b>
      </span>

      <span style="padding:5px 8px;border:1px solid rgba(255,255,255,.15);border-radius:8px;">
        4: <b>${summary.fourth}</b>
      </span>

      <span style="padding:5px 8px;border:1px solid rgba(255,255,255,.15);border-radius:8px;">
        5: <b>${summary.fifth}</b>
      </span>
    </div>
  `;
}

/* =========================================================
   ROADMAP TABLE
========================================================= */

function roadmapTableHtml(
  roadmap
) {
  const rows = Array.isArray(roadmap) ? roadmap : [];

  if (!rows.length) {
    return `
      <div style="padding:10px;opacity:.7;">
        İlk 5 bitiriş kaydı bulunamadı.
      </div>
    `;
  }

  return `
    <div style="overflow-x:auto;width:100%;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:720px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Tarih</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">İl</th>
            <th style="text-align:center;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Sıra</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Sınıf</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Yaş Grubu</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Pist</th>
            <th style="text-align:left;padding:7px;border-bottom:1px solid rgba(255,255,255,.18);">Mesafe</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => {
            const finish = Number(row.finish ?? row.rank ?? row.sira ?? 0);
            const winner = finish === 1;
            const rowStyle = winner
              ? 'background:rgba(34,197,94,.16);color:#baf7ca;'
              : '';
            return `
              <tr style="${rowStyle}">
                <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap;">${escapeHtml(row.date || row.isoDate || '')}</td>
                <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.city || '')}</td>
                <td style="padding:7px;text-align:center;font-weight:800;border-bottom:1px solid rgba(255,255,255,.08);">${winner ? '🏆 ' : ''}${escapeHtml(finish || '')}</td>
                <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.class || row.raceClass || '-')}</td>
                <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.ageGroup || row.group || '-')}</td>
                <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.track || row.pist || '-')}</td>
                <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">${escapeHtml(row.distance || row.mesafe || row.msf || '-')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* =========================================================
   AT KARİYER KARTI
========================================================= */

function careerHorseHtml(item, similarityRank = null) {
  const horse = item?.horse;
  const career = item?.career;
  const sim = item?.galibiyetBenzerligi || {};

  if (!horse) return '';

  const scoreHtml = Number.isFinite(Number(sim.score))
    ? `
      <div style="text-align:right;min-width:78px;">
        <div style="font-size:23px;font-weight:900;line-height:1;color:#7ee2a8;">%${escapeHtml(sim.score)}</div>
        <div style="font-size:10px;opacity:.72;margin-top:2px;">Galibiyet Benzerliği</div>
        ${similarityRank ? `<div style="font-size:10px;opacity:.65;margin-top:3px;">Sıra ${similarityRank}</div>` : ''}
      </div>
    `
    : `
      <div style="text-align:right;min-width:78px;opacity:.55;">
        <div style="font-size:20px;font-weight:800;">—</div>
        <div style="font-size:10px;">Benzerlik yok</div>
      </div>
    `;

  if (!horse.id) {
    return `
      <section style="margin:12px 0;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <strong>${escapeHtml(horse.no)}. ${escapeHtml(horse.name)}</strong>
          ${scoreHtml}
        </div>
        <div style="margin-top:6px;opacity:.7;">TJK At ID bulunamadığı için kariyer alınamadı.</div>
      </section>
    `;
  }

  if (!career?.ok) {
    return `
      <section style="margin:12px 0;padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <strong>${escapeHtml(horse.no)}. ${escapeHtml(horse.name)}</strong>
          ${scoreHtml}
        </div>
        <div style="margin-top:6px;opacity:.7;">Kariyer verisi alınamadı: ${escapeHtml(career?.error || 'Bilinmeyen hata')}</div>
      </section>
    `;
  }

  return `
    <section style="margin:12px 0;padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.02);">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
        <div style="min-width:0;">
          <div style="font-size:16px;font-weight:800;">${escapeHtml(horse.no)}. ${escapeHtml(horse.name)}</div>
          ${horse.jockey ? `<div style="margin-top:3px;opacity:.7;font-size:12px;">Jokey: ${escapeHtml(horse.jockey)}</div>` : ''}
          <div style="font-size:10px;opacity:.55;margin-top:3px;">TJK ID: ${escapeHtml(horse.id)}</div>
        </div>
        ${scoreHtml}
      </div>

      ${sim.matchedHistoricalHorse ? `
        <div style="margin-top:8px;padding:7px 9px;border-radius:8px;background:rgba(126,226,168,.08);font-size:11px;line-height:1.45;">
          En yakın tarihsel yol: <b>${escapeHtml(sim.matchedHistoricalHorse)}</b>
          ${sim.matchedHistoricalFinish ? ` · geçmişte ${escapeHtml(sim.matchedHistoricalFinish)}.` : ''}
          ${sim.matchedHistoricalRace ? `<br><span style="opacity:.7;">${escapeHtml(sim.matchedHistoricalRace)}</span>` : ''}
        </div>
      ` : ''}

      ${careerSummaryHtml(career)}
      ${roadmapTableHtml(career.roadmap)}
    </section>
  `;
}

/* =========================================================
   CAREER CACHE
========================================================= */

function isValidCareerCache(cached) {
  if (
    !cached ||
    cached.version !== CAREER_UI_VERSION ||
    cached.date !== state.date ||
    String(cached.city) !== String(state.city) ||
    !Array.isArray(cached.races) ||
    !cached.races.length
  ) {
    return false;
  }

  return cached.races.every(
    race =>
      race &&
      Array.isArray(race.horses)
  );
}

function cachedCareerHasRace(
  cached,
  raceNo
) {
  if (!isValidCareerCache(cached)) {
    return false;
  }

  return cached.races.some(
    race =>
      String(race.no) ===
      String(raceNo)
  );
}

function cachedCareerHasAllProgramRaces(
  cached
) {
  if (!isValidCareerCache(cached)) {
    return false;
  }

  return state.races.every(
    race =>
      cached.races.some(
        cachedRace =>
          String(cachedRace.no) ===
          String(race.no)
      )
  );
}

/* =========================================================
   KOŞU ACCORDION
========================================================= */

function careerRaceAccordionHtml(
  race,
  forceOpen
) {
  const horses = Array.isArray(race?.horses) ? [...race.horses] : [];

  horses.sort((a, b) => {
    const sa = Number(a?.galibiyetBenzerligi?.score);
    const sb = Number(b?.galibiyetBenzerligi?.score);
    const va = Number.isFinite(sa) ? sa : -1;
    const vb = Number.isFinite(sb) ? sb : -1;
    if (vb !== va) return vb - va;
    return Number(a?.horse?.no || 999) - Number(b?.horse?.no || 999);
  });

  const scoredCount = horses.filter(x => Number.isFinite(Number(x?.galibiyetBenzerligi?.score))).length;

  return `
    <details
      ${forceOpen ? 'open' : ''}
      style="margin:10px 0;border:1px solid rgba(255,255,255,.15);border-radius:12px;overflow:hidden;background:rgba(255,255,255,.02);"
    >
      <summary style="cursor:pointer;list-style:none;padding:12px;background:#0d2032;user-select:none;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
          <div>
            <div style="font-size:16px;font-weight:800;">${escapeHtml(race.no)}. KOŞU</div>
            <div style="font-size:12px;opacity:.72;margin-top:3px;">
              ${escapeHtml(race.meta?.class || race.class || '-')} ·
              ${escapeHtml(race.meta?.ageGroup || '-')} ·
              ${escapeHtml(race.meta?.distance || race.distance || '-')} ${escapeHtml(race.meta?.track || race.track || '')}
            </div>
          </div>
          <div style="font-size:12px;opacity:.7;white-space:nowrap;">
            ${scoredCount ? `${scoredCount}/${horses.length} sıralandı` : `${horses.length} at`} ▾
          </div>
        </div>
      </summary>

      <div style="padding:2px 10px 10px 10px;">
        ${race.roadmapError ? `
          <div style="margin:10px 0;padding:9px;border-radius:8px;background:rgba(245,158,11,.10);font-size:11px;">
            Galibiyet Benzerliği üretilemedi: ${escapeHtml(race.roadmapError)}
          </div>
        ` : ''}

        ${horses.length
          ? horses.map((item, index) => careerHorseHtml(item, Number.isFinite(Number(item?.galibiyetBenzerligi?.score)) ? index + 1 : null)).join('')
          : `<div style="padding:12px;opacity:.7;">Bu koşunun kariyer verisi yeniden hesaplanmalıdır.</div>`}
      </div>
    </details>
  `;
}

/* =========================================================
   KARİYER EKRANINI FİLTRELE
========================================================= */

function renderCareerAnalysis(
  result,
  raceFilter = null
) {
  const content =
    $('analysisContent');

  if (!content) return;

  content
    .classList
    .remove('empty');

  const races =
    Array.isArray(result?.races)
      ? result.races
      : [];

  if (!races.length) {
    content.innerHTML =
      'Kariyer verisi bulunamadı.';
    return;
  }

  const selected =
    raceFilter ??
    $('analysisRace')?.value ??
    'all';

  const shownRaces =
    selected === 'all'
      ? races
      : races.filter(
          race =>
            String(race.no) ===
            String(selected)
        );

  if (!shownRaces.length) {
    content.innerHTML = `
      <div style="padding:12px;">
        ${escapeHtml(selected)}. koşu daha önce hesaplanan kariyer verisinde bulunamadı.
        <br><br>
        Bu koşuyu seçip <b>Analizi Hesapla</b> düğmesine basabilirsiniz.
      </div>
    `;

    return;
  }

  const allMode =
    selected === 'all';

  content.innerHTML = `
    <div style="
      margin-bottom:12px;
      font-size:13px;
    ">
      <b>${escapeHtml(result.cityName || '')}</b>
      ·
      ${escapeHtml(result.date || '')}

      <br>

      <span style="opacity:.72;">
        Kural:
        yalnız yarış tarihinden önceki
        1., 2., 3., 4. ve 5. bitirişler.
        Galibiyet Benzerliği, geçmiş benzer koşuların gerçek ilk 3 atlarının dondurulmuş kariyer yollarıyla karşılaştırılır; kazanma olasılığı değildir.
      </span>

      <br>

      <span style="
        display:inline-block;
        margin-top:6px;
        padding:5px 8px;
        border-radius:8px;
        background:rgba(255,255,255,.06);
        font-size:12px;
      ">
        ${
          allMode
            ? `${shownRaces.length} koşu hesaplandı. Koşu başlığına dokunarak açın.`
            : `${escapeHtml(selected)}. koşu gösteriliyor. Diğer koşular hafızada kalıyor.`
        }
      </span>
    </div>

    ${
      shownRaces
        .map(
          race =>
            careerRaceAccordionHtml(
              race,
              !allMode
            )
        )
        .join('')
    }
  `;
}

/* =========================================================
   KARİYER HESAPLA
========================================================= */

async function runCareerAnalysis(
  selectedRaces,
  raceValue
) {
  const content = $('analysisContent');
  if (!content) return;

  const horsesToLoad = [];
  for (const race of selectedRaces) {
    const horses = Array.isArray(race.horses) ? race.horses : [];
    for (const horse of horses) {
      horsesToLoad.push({ raceNo: race.no, horse });
    }
  }

  if (horsesToLoad.length === 0) {
    content.innerHTML = 'Seçilen koşularda at bulunamadı.';
    return;
  }

  content.innerHTML = `
    <div style="padding:15px;">
      Kariyer yol haritaları ve Galibiyet Benzerliği hazırlanıyor…
      <br><br>
      <b>${horsesToLoad.length}</b> güncel atın ilk 5 kariyer sonuçları alınacak,
      ardından koşu koşulları tarihsel ilk 3 yol haritalarıyla karşılaştırılacak.
    </div>
  `;

  let completed = 0;
  const loaded = await mapLimit(horsesToLoad, 4, async item => {
    const career = await fetchCareer(item.horse.id, state.date);
    completed++;
    content.innerHTML = `
      <div style="padding:15px;">
        Güncel kariyerler alınıyor…<br><br>
        ${completed} / ${horsesToLoad.length} at tamamlandı.
      </div>
    `;
    return { ...item, career };
  });

  let raceCompleted = 0;
  const calculatedRaces = [];

  for (const race of selectedRaces) {
    raceCompleted++;
    content.innerHTML = `
      <div style="padding:15px;">
        Tarihsel yol haritası karşılaştırılıyor…<br><br>
        ${raceCompleted} / ${selectedRaces.length} koşu
      </div>
    `;

    const meta = await fetchRaceMeta(race.no);
    const roadmap = meta?.ok
      ? await fetchHistoricalRoadmap(meta)
      : { ok: false, error: meta?.error || 'Koşu meta verisi alınamadı.' };

    const raceHorses = loaded
      .filter(x => x && Number(x.raceNo) === Number(race.no))
      .map(x => {
        const career = normalizeCareerResponse(x.career || {});
        const similarity = roadmap?.ok
          ? calculateGalibiyetBenzerligi(career.roadmap, roadmap)
          : {
              score: null,
              matchedHistoricalHorse: null,
              matchedHistoricalRace: null,
              referenceCount: 0
            };

        return {
          horse: x.horse,
          career,
          galibiyetBenzerligi: similarity
        };
      });

    calculatedRaces.push({
      no: race.no,
      class: race.class,
      ageGroup: meta?.ageGroup || race.ageGroup || '',
      distance: race.distance,
      track: race.track,
      meta: meta?.ok ? meta : null,
      roadmapVersion: roadmap?.version || null,
      historicalRaceCount: Array.isArray(roadmap?.historicalRaces) ? roadmap.historicalRaces.length : 0,
      roadmapError: roadmap?.ok ? null : (roadmap?.error || 'Tarihsel referans bulunamadı.'),
      horses: raceHorses
    });
  }

  const previous = state.analyses?.career;
  let mergedRaces = calculatedRaces;

  if (raceValue !== 'all' && isValidCareerCache(previous)) {
    const map = new Map(previous.races.map(race => [String(race.no), race]));
    for (const race of calculatedRaces) {
      map.set(String(race.no), race);
    }
    mergedRaces = Array.from(map.values()).sort((a, b) => Number(a.no) - Number(b.no));
  }

  const result = {
    type: 'career',
    version: CAREER_UI_VERSION,
    careerApiVersion: 'CAREER-ROADMAP-V8',
    roadmapApiVersion: 'TJK-ROADMAP-V3',
    raceMetaApiVersion: 'TJK-RACE-META-V1',
    date: state.date,
    city: state.city,
    cityName: getCityName(),
    coverage: raceValue === 'all'
      ? 'all'
      : (previous?.coverage === 'all' ? 'all' : 'partial'),
    calculatedRace: raceValue,
    rule: 'SADECE_ILK_5_VE_YARIS_TARIHINDEN_ONCE',
    similarityMethod: 'ORDERED_CAREER_PATH_MATCH_V1',
    similarityNote: 'Galibiyet Benzerliği tarihsel ilk 3 kariyer yoluna benzerlik yüzdesidir; kalibre edilmiş kazanma olasılığı değildir.',
    races: mergedRaces,
    generatedAt: new Date().toISOString()
  };

  state.analyses.career = result;
  save();
  renderCareerAnalysis(result, raceValue);
}

/* =========================================================
   KARİYER SEÇİCİ DEĞİŞİNCE SADECE FİLTRELE
========================================================= */

function handleAnalysisRaceChange() {
  const dialog =
    $('analysisDialog');

  if (
    dialog?.dataset.view !==
    'career'
  ) {
    return;
  }

  const cached =
    state.analyses?.career;

  if (!isValidCareerCache(cached)) {
    return;
  }

  const raceValue =
    $('analysisRace')?.value ||
    'all';

  if (
    raceValue === 'all' ||
    cachedCareerHasRace(
      cached,
      raceValue
    )
  ) {
    /*
      BURASI KRİTİK:
      Yeni API isteği yok.
      Sadece daha önce hesaplanan veri filtreleniyor.
    */
    renderCareerAnalysis(
      cached,
      raceValue
    );
  }
}

/* =========================================================
   ANALİZ PENCERESİ
========================================================= */

function openAnalysis(view) {
  const dialog =
    $('analysisDialog');

  if (!dialog) return;

  const titles = {
    current:
      'Güncel Analiz',

    historical:
      'Tarihsel Benzerlik',

    scenario:
      'Koşu Senaryosu',

    career:
      'Kariyer Yol Haritası'
  };

  dialog.dataset.view =
    view;

  if ($('dialogTitle')) {
    $('dialogTitle').textContent =
      titles[view] ||
      'Analiz';
  }

  if ($('dialogEyebrow')) {
    $('dialogEyebrow').textContent =
      'AT AI ANALİZ';
  }

  const cached =
    state.analyses?.[view];

  const content =
    $('analysisContent');

  if (content) {
    if (
      view === 'career' &&
      isValidCareerCache(cached)
    ) {
      renderCareerAnalysis(
        cached,
        $('analysisRace')?.value ||
        'all'
      );
    } else if (
      view === 'career'
    ) {
      state.analyses.career = {};
      save();

      content
        .classList
        .add('empty');

      content.innerHTML =
        'Kariyer Yol Haritasını hesaplayın.';
    } else if (
      cached &&
      Object.keys(cached).length
    ) {
      content
        .classList
        .remove('empty');

      content.innerHTML =
        '<pre>' +
        escapeHtml(
          JSON.stringify(
            cached,
            null,
            2
          )
        ) +
        '</pre>';
    } else {
      content
        .classList
        .add('empty');

      content.innerHTML =
        'Bu analiz henüz hesaplanmadı.';
    }
  }

  closeDrawer();
  dialog.showModal();
}

/* =========================================================
   ANALİZ
========================================================= */

async function runAnalysis() {
  const dialog =
    $('analysisDialog');

  const view =
    dialog?.dataset.view ||
    'current';

  const raceValue =
    $('analysisRace')?.value ||
    'all';

  const content =
    $('analysisContent');

  if (!content) return;

  content
    .classList
    .remove('empty');

  if (!state.races.length) {
    content.innerHTML =
      'Önce TJK programını yüklemelisiniz.';
    return;
  }

  /*
    KARİYER:
    Daha önce Tüm Koşular hesaplandıysa
    yeniden TJK sorgusu yapma.
  */
  if (view === 'career') {
    const cached =
      state.analyses?.career;

    if (
      raceValue === 'all' &&
      cachedCareerHasAllProgramRaces(
        cached
      )
    ) {
      renderCareerAnalysis(
        cached,
        'all'
      );

      status(
        'Kariyer verisi hafızadan gösterildi.'
      );

      return;
    }

    if (
      raceValue !== 'all' &&
      cachedCareerHasRace(
        cached,
        raceValue
      )
    ) {
      renderCareerAnalysis(
        cached,
        raceValue
      );

      status(
        `${raceValue}. koşu daha önce hesaplanan veriden filtrelendi.`
      );

      return;
    }

    const selectedRaces =
      raceValue === 'all'
        ? state.races
        : state.races.filter(
            r =>
              String(r.no) ===
              String(raceValue)
          );

    await runCareerAnalysis(
      selectedRaces,
      raceValue
    );

    return;
  }

  content.innerHTML =
    'Analiz hazırlanıyor…';

  const selectedRaces =
    raceValue === 'all'
      ? state.races
      : state.races.filter(
          r =>
            String(r.no) ===
            String(raceValue)
        );

  const result = {
    type: view,
    date: state.date,
    city: state.city,
    race: raceValue,

    races:
      selectedRaces.map(
        r => ({
          no: r.no,
          class: r.class,
          ageGroup: r.ageGroup || '',
          distance: r.distance,
          track: r.track,
          horseCount:
            Array.isArray(r.horses)
              ? r.horses.length
              : 0
        })
      ),

    generatedAt:
      new Date()
        .toISOString()
  };

  state.analyses[view] =
    result;

  save();

  content.innerHTML =
    '<pre>' +
    escapeHtml(
      JSON.stringify(
        result,
        null,
        2
      )
    ) +
    '</pre>';
}

/* =========================================================
   INIT
========================================================= */

function initialize() {
  if (!state.date) {
    state.date =
      todayLocal();
  }

  if (
    state.analyses?.career &&
    state.analyses.career.version !==
      CAREER_UI_VERSION
  ) {
    state.analyses.career = {};
    save();
  }

  if ($('raceDate')) {
    $('raceDate').value =
      state.date;
  }

  if ($('signalSource')) {
    $('signalSource').value =
      state.signalSource ||
      'combined';

    $('signalSource').onchange =
      e => {
        state.signalSource =
          e.target.value;

        save();
      };
  }

  renderBetTypes();
  renderCities();
  renderProgram();
  renderTickets();

  if ($('loadProgramBtn')) {
    $('loadProgramBtn').onclick =
      loadProgram;
  }

  if ($('citySelect')) {
    $('citySelect').onchange =
      e => {
        changeCity(
          e.target.value
        );
      };
  }

  if ($('raceDate')) {
    $('raceDate').onchange =
      e => {
        state.date =
          e.target.value;

        state.city = '';
        state.cities = [];
        state.races = [];

        state.selectedRace =
          'all';

        state.tickets = [];
        state.analyses.career = {};

        save();

        renderCities();
        renderProgram();
        renderTickets();

        status(
          'Tarih değişti. Programı yeniden yükleyin.'
        );
      };
  }

  if ($('buildAllBtn')) {
    $('buildAllBtn').onclick =
      buildTickets;
  }

  if ($('clearBtn')) {
    $('clearBtn').onclick =
      clearAnalyses;
  }

  if ($('menuBtn')) {
    $('menuBtn').onclick =
      openDrawer;
  }

  if ($('closeMenu')) {
    $('closeMenu').onclick =
      closeDrawer;
  }

  if ($('overlay')) {
    $('overlay').onclick =
      closeDrawer;
  }

  document
    .querySelectorAll('[data-view]')
    .forEach(
      btn => {
        btn.onclick =
          () =>
            openAnalysis(
              btn.dataset.view
            );
      }
    );

  if ($('closeDialog')) {
    $('closeDialog').onclick =
      () => {
        $('analysisDialog')
          ?.close();
      };
  }

  if ($('runAnalysis')) {
    $('runAnalysis').onclick =
      runAnalysis;
  }

  /*
    V3:
    Koşu seçimi değiştiğinde kariyer verisini
    yeniden çekmek yerine önbellekteki sonucu
    anında daralt.
  */
  if ($('analysisRace')) {
    $('analysisRace').onchange =
      handleAnalysisRaceChange;
  }

  if ($('ticketFromAnalysis')) {
    $('ticketFromAnalysis').onclick =
      () => {
        const view =
          $('analysisDialog')
            ?.dataset
            .view ||
          'combined';

        if ($('signalSource')) {
          $('signalSource').value =
            view === 'scenario'
              ? 'combined'
              : view;
        }

        state.signalSource =
          view === 'scenario'
            ? 'combined'
            : view;

        save();
        buildTickets();
      };
  }

  status(
    state.cities.length
      ? `${state.cities.length} şehir kayıtlı.`
      : 'Hazır'
  );
}

initialize();
