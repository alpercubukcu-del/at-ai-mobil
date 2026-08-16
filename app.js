const $ = id => document.getElementById(id);

const STORAGE_KEY = 'at_ai_mobil_state_v2';

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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);

    const parsed = JSON.parse(raw);

    return {
      ...structuredClone(defaultState),
      ...parsed,
      analyses: {
        ...structuredClone(defaultState.analyses),
        ...(parsed.analyses || {})
      }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

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

function normalizeRace(race) {
  return {
    no: Number(race?.no || 0),
    time: race?.time || '',
    class: race?.class || '',
    distance: race?.distance || '',
    track: race?.track || '',
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

  return Array.isArray(direct) ? direct.map(normalizeRace) : [];
}

function renderCities() {
  const select = $('citySelect');
  if (!select) return;

  if (!Array.isArray(state.cities) || state.cities.length === 0) {
    select.innerHTML = '<option value="">Şehir bulunamadı</option>';
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
          ${String(c.id) === String(state.city) ? 'selected' : ''}
        >
          ${escapeHtml(c.name)}
        </option>
      `
    )
    .join('');

  select.value = String(state.city);
}

function renderBetTypes() {
  const box = $('betTypes');
  if (!box) return;

  box.innerHTML = BET_TYPES.map(
    name => `
      <label class="bet-card">
        <input type="checkbox" class="bet-check" value="${escapeHtml(name)}" checked>
        <span>${escapeHtml(name)}</span>
      </label>
    `
  ).join('');
}

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
    `<button class="race-tab ${state.selectedRace === 'all' ? 'active' : ''}" data-race="all">Tümü</button>` +
    state.races
      .map(
        r => `
          <button
            class="race-tab ${String(state.selectedRace) === String(r.no) ? 'active' : ''}"
            data-race="${r.no}"
          >
            ${r.no}. Koşu
          </button>
        `
      )
      .join('');

  raceTabs.querySelectorAll('[data-race]').forEach(btn => {
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
              ${race.time ? `<span>${escapeHtml(race.time)}</span>` : ''}
            </div>
          </div>

          <div class="race-meta">
            ${race.class ? `<span>${escapeHtml(race.class)}</span>` : ''}
            ${race.distance ? `<span>${escapeHtml(race.distance)}</span>` : ''}
            ${race.track ? `<span>${escapeHtml(race.track)}</span>` : ''}
          </div>

          ${
            race.betStarts?.length
              ? `<div class="bet-starts">
                  Başlayan bahisler:
                  ${race.betStarts.map(x => `<b>${escapeHtml(x)}</b>`).join(' · ')}
                </div>`
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
                            <b>${escapeHtml(h.no)}. ${escapeHtml(h.name)}</b>
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
                : '<div class="empty">At listesi alınamadı.</div>'
            }
          </div>
        </article>
      `
    )
    .join('');

  if (analysisRace) {
    analysisRace.innerHTML =
      '<option value="all">Tüm Koşular</option>' +
      state.races
        .map(
          r =>
            `<option value="${r.no}">${r.no}. Koşu</option>`
        )
        .join('');
  }
}

async function loadProgram() {
  const date = $('raceDate')?.value || todayLocal();

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
    state.cities = Array.isArray(data.cities) ? data.cities : [];

    if (state.cities.length === 0) {
      state.city = '';
      state.races = [];
      save();
      renderCities();
      renderProgram();
      status('Bu tarih için şehir bulunamadı.');
      return;
    }

    const currentCityExists = state.cities.some(
      c => String(c.id) === String(state.city)
    );

    if (!currentCityExists) {
      const turkeyCity =
        state.cities.find(c =>
          /İstanbul|İzmir|Ankara|Bursa|Kocaeli|Adana|Antalya|Elazığ|Şanlıurfa|Diyarbakır/i.test(
            c.name
          )
        ) || state.cities[0];

      state.city = String(turkeyCity.id);
    }

    state.races = getCurrentRaceList(data, state.city);

    save();
    renderCities();
    renderProgram();

    status(
      `${state.cities.length} şehir bulundu · ${state.races.length} koşu`
    );
  } catch (err) {
    console.error('loadProgram error:', err);
    state.cities = [];
    state.races = [];
    save();
    renderCities();
    renderProgram();

    status(
      `TJK erişimi şu anda alınamadı. API hatası: ${
        err?.message || 'Bilinmeyen hata'
      }`
    );
  }
}

async function changeCity(cityId) {
  state.city = String(cityId);
  state.selectedRace = 'all';
  save();

  const date = $('raceDate')?.value || state.date || todayLocal();

  status('Şehir programı yükleniyor…');

  try {
    const res = await fetch(
      `/api/tjk-program?date=${encodeURIComponent(date)}&t=${Date.now()}`,
      { cache: 'no-store' }
    );

    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();

    state.cities = Array.isArray(data.cities) ? data.cities : [];
    state.races = getCurrentRaceList(data, state.city);

    save();
    renderCities();
    renderProgram();

    status(
      `${state.races.length} koşu yüklendi.`
    );
  } catch (err) {
    console.error('changeCity error:', err);
    state.races = [];
    save();
    renderProgram();

    status(`Şehir programı alınamadı: ${err.message}`);
  }
}

function renderTickets() {
  const box = $('tickets');
  if (!box) return;

  if (!state.tickets.length) {
    box.classList.add('empty');
    box.innerHTML = 'Henüz kupon oluşturulmadı.';
    return;
  }

  box.classList.remove('empty');

  box.innerHTML = state.tickets
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
    ...document.querySelectorAll('.bet-check:checked')
  ].map(x => x.value);

  const source = $('signalSource')?.value || 'combined';

  if (!selected.length) {
    status('En az bir bahis türü seçin.');
    return;
  }

  state.signalSource = source;

  const now = new Date().toLocaleString('tr-TR');

  state.tickets = selected.map(type => ({
    type,
    source,
    date: state.date,
    city: state.city,
    createdAt: now
  }));

  save();
  renderTickets();

  status(`${state.tickets.length} kupon taslağı oluşturuldu.`);
}

function clearAnalyses() {
  const ok = confirm(
    'Tüm analizler ve oluşturulan kuponlar silinsin mi?'
  );

  if (!ok) return;

  state.analyses = structuredClone(defaultState.analyses);
  state.tickets = [];
  save();

  renderTickets();

  const analysisContent = $('analysisContent');
  if (analysisContent) {
    analysisContent.innerHTML = 'Analiz seçilmedi.';
    analysisContent.classList.add('empty');
  }

  status('Analizler temizlendi.');
}

function openDrawer() {
  $('drawer')?.classList.add('open');
  $('overlay')?.classList.add('show');
  $('drawer')?.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  $('drawer')?.classList.remove('open');
  $('overlay')?.classList.remove('show');
  $('drawer')?.setAttribute('aria-hidden', 'true');
}

function openAnalysis(view) {
  const dialog = $('analysisDialog');
  if (!dialog) return;

  const titles = {
    current: 'Güncel Analiz',
    historical: 'Tarihsel Benzerlik',
    scenario: 'Koşu Senaryosu',
    career: 'Kariyer Yol Haritası'
  };

  dialog.dataset.view = view;

  if ($('dialogTitle')) {
    $('dialogTitle').textContent = titles[view] || 'Analiz';
  }

  if ($('dialogEyebrow')) {
    $('dialogEyebrow').textContent = 'AT AI ANALİZ';
  }

  const cached = state.analyses?.[view];

  if ($('analysisContent')) {
    if (cached && Object.keys(cached).length) {
      $('analysisContent').classList.remove('empty');
      $('analysisContent').innerHTML =
        '<pre>' +
        escapeHtml(JSON.stringify(cached, null, 2)) +
        '</pre>';
    } else {
      $('analysisContent').classList.add('empty');
      $('analysisContent').innerHTML =
        'Bu analiz henüz hesaplanmadı.';
    }
  }

  closeDrawer();
  dialog.showModal();
}

async function runAnalysis() {
  const dialog = $('analysisDialog');
  const view = dialog?.dataset.view || 'current';
  const raceValue = $('analysisRace')?.value || 'all';

  const content = $('analysisContent');
  if (!content) return;

  content.classList.remove('empty');
  content.innerHTML = 'Analiz hazırlanıyor…';

  if (!state.races.length) {
    content.innerHTML =
      'Önce TJK programını yüklemelisiniz.';
    return;
  }

  const selectedRaces =
    raceValue === 'all'
      ? state.races
      : state.races.filter(
          r => String(r.no) === String(raceValue)
        );

  const result = {
    type: view,
    date: state.date,
    city: state.city,
    race: raceValue,
    races: selectedRaces.map(r => ({
      no: r.no,
      class: r.class,
      distance: r.distance,
      track: r.track,
      horseCount: r.horses.length
    })),
    generatedAt: new Date().toISOString()
  };

  state.analyses[view] = result;
  save();

  content.innerHTML =
    '<pre>' +
    escapeHtml(JSON.stringify(result, null, 2)) +
    '</pre>';
}

function initialize() {
  if (!state.date) state.date = todayLocal();

  if ($('raceDate')) {
    $('raceDate').value = state.date;
  }

  if ($('signalSource')) {
    $('signalSource').value =
      state.signalSource || 'combined';

    $('signalSource').onchange = e => {
      state.signalSource = e.target.value;
      save();
    };
  }

  renderBetTypes();
  renderCities();
  renderProgram();
  renderTickets();

  if ($('loadProgramBtn')) {
    $('loadProgramBtn').onclick = loadProgram;
  }

  if ($('citySelect')) {
    $('citySelect').onchange = e => {
      changeCity(e.target.value);
    };
  }

  if ($('raceDate')) {
    $('raceDate').onchange = e => {
      state.date = e.target.value;
      state.city = '';
      state.cities = [];
      state.races = [];
      state.selectedRace = 'all';
      save();

      renderCities();
      renderProgram();

      status('Tarih değişti. Programı yeniden yükleyin.');
    };
  }

  if ($('buildAllBtn')) {
    $('buildAllBtn').onclick = buildTickets;
  }

  if ($('clearBtn')) {
    $('clearBtn').onclick = clearAnalyses;
  }

  if ($('menuBtn')) {
    $('menuBtn').onclick = openDrawer;
  }

  if ($('closeMenu')) {
    $('closeMenu').onclick = closeDrawer;
  }

  if ($('overlay')) {
    $('overlay').onclick = closeDrawer;
  }

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.onclick = () => openAnalysis(btn.dataset.view);
  });

  if ($('closeDialog')) {
    $('closeDialog').onclick = () => {
      $('analysisDialog')?.close();
    };
  }

  if ($('runAnalysis')) {
    $('runAnalysis').onclick = runAnalysis;
  }

  if ($('ticketFromAnalysis')) {
    $('ticketFromAnalysis').onclick = () => {
      const view =
        $('analysisDialog')?.dataset.view || 'combined';

      if ($('signalSource')) {
        $('signalSource').value =
          view === 'scenario' ? 'combined' : view;
      }

      state.signalSource =
        view === 'scenario' ? 'combined' : view;

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
