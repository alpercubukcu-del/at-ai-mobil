const $ = id => document.getElementById(id);

const STORAGE_KEY = 'at_ai_mobil_state_v2';
const CAREER_UI_VERSION = 'CAREER-UI-V3';

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

  return Array.isArray(direct)
    ? direct.map(normalizeRace)
    : [];
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
  const rows =
    Array.isArray(roadmap)
      ? roadmap
      : [];

  if (!rows.length) {
    return `
      <div style="
        padding:10px;
        opacity:.7;
      ">
        İlk 5 bitiriş kaydı bulunamadı.
      </div>
    `;
  }

  return `
    <div style="
      overflow-x:auto;
      width:100%;
    ">
      <table style="
        width:100%;
        border-collapse:collapse;
        font-size:12px;
        min-width:720px;
      ">
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
          ${rows
            .map(
              row => `
                <tr>
                  <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap;">
                    ${escapeHtml(
                      row.date ||
                      row.isoDate ||
                      ''
                    )}
                  </td>

                  <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">
                    ${escapeHtml(row.city || '')}
                  </td>

                  <td style="padding:7px;text-align:center;font-weight:700;border-bottom:1px solid rgba(255,255,255,.08);">
                    ${escapeHtml(
                      row.finish ??
                      row.rank ??
                      row.sira ??
                      ''
                    )}
                  </td>

                  <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">
                    ${escapeHtml(
                      row.class ||
                      row.raceClass ||
                      '-'
                    )}
                  </td>

                  <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">
                    ${escapeHtml(
                      row.ageGroup ||
                      row.group ||
                      '-'
                    )}
                  </td>

                  <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">
                    ${escapeHtml(
                      row.track ||
                      row.pist ||
                      '-'
                    )}
                  </td>

                  <td style="padding:7px;border-bottom:1px solid rgba(255,255,255,.08);">
                    ${escapeHtml(
                      row.distance ||
                      row.mesafe ||
                      row.msf ||
                      '-'
                    )}
                  </td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* =========================================================
   AT KARİYER KARTI
========================================================= */

function careerHorseHtml(item) {
  const horse = item?.horse;
  const career = item?.career;

  if (!horse) return '';

  if (!horse.id) {
    return `
      <section style="
        margin:12px 0;
        padding:12px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:12px;
      ">
        <strong>
          ${escapeHtml(horse.no)}.
          ${escapeHtml(horse.name)}
        </strong>

        <div style="margin-top:6px;opacity:.7;">
          TJK At ID bulunamadığı için kariyer alınamadı.
        </div>
      </section>
    `;
  }

  if (!career?.ok) {
    return `
      <section style="
        margin:12px 0;
        padding:12px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:12px;
      ">
        <strong>
          ${escapeHtml(horse.no)}.
          ${escapeHtml(horse.name)}
        </strong>

        <div style="margin-top:6px;opacity:.7;">
          Kariyer verisi alınamadı:
          ${escapeHtml(
            career?.error ||
            'Bilinmeyen hata'
          )}
        </div>
      </section>
    `;
  }

  return `
    <section style="
      margin:12px 0;
      padding:12px;
      border:1px solid rgba(255,255,255,.14);
      border-radius:12px;
      background:rgba(255,255,255,.02);
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:flex-start;
      ">
        <div>
          <div style="
            font-size:16px;
            font-weight:800;
          ">
            ${escapeHtml(horse.no)}.
            ${escapeHtml(horse.name)}
          </div>

          ${
            horse.jockey
              ? `
                <div style="
                  margin-top:3px;
                  opacity:.7;
                  font-size:12px;
                ">
                  Jokey:
                  ${escapeHtml(horse.jockey)}
                </div>
              `
              : ''
          }
        </div>

        <div style="
          font-size:11px;
          opacity:.65;
        ">
          TJK ID:
          ${escapeHtml(horse.id)}
        </div>
      </div>

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
  const horses =
    Array.isArray(race?.horses)
      ? race.horses
      : [];

  return `
    <details
      ${forceOpen ? 'open' : ''}
      style="
        margin:10px 0;
        border:1px solid rgba(255,255,255,.15);
        border-radius:12px;
        overflow:hidden;
        background:rgba(255,255,255,.02);
      "
    >
      <summary style="
        cursor:pointer;
        list-style:none;
        padding:12px;
        background:#0d2032;
        user-select:none;
      ">
        <div style="
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:center;
        ">
          <div>
            <div style="
              font-size:16px;
              font-weight:800;
            ">
              ${escapeHtml(race.no)}. KOŞU
            </div>

            <div style="
              font-size:12px;
              opacity:.72;
              margin-top:3px;
            ">
              ${escapeHtml(race.class || '-')}
              ·
              ${escapeHtml(race.distance || '-')}
              ·
              ${escapeHtml(race.track || '-')}
            </div>
          </div>

          <div style="
            font-size:12px;
            opacity:.7;
            white-space:nowrap;
          ">
            ${horses.length} at ▾
          </div>
        </div>
      </summary>

      <div style="padding:2px 10px 10px 10px;">
        ${
          horses.length
            ? horses
                .map(careerHorseHtml)
                .join('')
            : `
              <div style="
                padding:12px;
                opacity:.7;
              ">
                Bu koşunun kariyer verisi yeniden hesaplanmalıdır.
              </div>
            `
        }
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
  const content =
    $('analysisContent');

  if (!content) return;

  const horsesToLoad = [];

  for (const race of selectedRaces) {
    const horses =
      Array.isArray(race.horses)
        ? race.horses
        : [];

    for (const horse of horses) {
      horsesToLoad.push({
        raceNo: race.no,
        horse
      });
    }
  }

  if (horsesToLoad.length === 0) {
    content.innerHTML =
      'Seçilen koşularda at bulunamadı.';
    return;
  }

  content.innerHTML = `
    <div style="padding:15px;">
      Kariyer yol haritaları hazırlanıyor…
      <br><br>
      <b>${horsesToLoad.length}</b>
      atın ilk 5 kariyer sonuçları TJK'den alınıyor.
    </div>
  `;

  let completed = 0;

  const loaded =
    await mapLimit(
      horsesToLoad,
      4,
      async item => {
        const career =
          await fetchCareer(
            item.horse.id,
            state.date
          );

        completed++;

        content.innerHTML = `
          <div style="padding:15px;">
            Kariyer yol haritaları hazırlanıyor…
            <br><br>
            ${completed}
            /
            ${horsesToLoad.length}
            at tamamlandı.
          </div>
        `;

        return {
          ...item,
          career
        };
      }
    );

  const calculatedRaces =
    selectedRaces.map(
      race => ({
        no: race.no,
        class: race.class,
        distance: race.distance,
        track: race.track,

        horses:
          loaded
            .filter(
              x =>
                x &&
                Number(x.raceNo) ===
                Number(race.no)
            )
            .map(
              x => ({
                horse: x.horse,
                career:
                  normalizeCareerResponse(
                    x.career || {}
                  )
              })
            )
      })
    );

  const previous =
    state.analyses?.career;

  let mergedRaces =
    calculatedRaces;

  /*
    Tek koşu hesaplanırsa daha önce Tüm Koşular ile
    hesaplanan diğer koşuları silme. Yalnız seçilen
    koşuyu güncelle.
  */
  if (
    raceValue !== 'all' &&
    isValidCareerCache(previous)
  ) {
    const map =
      new Map(
        previous.races.map(
          race => [
            String(race.no),
            race
          ]
        )
      );

    for (
      const race of calculatedRaces
    ) {
      map.set(
        String(race.no),
        race
      );
    }

    mergedRaces =
      Array.from(
        map.values()
      ).sort(
        (a, b) =>
          Number(a.no) -
          Number(b.no)
      );
  }

  const result = {
    type: 'career',
    version: CAREER_UI_VERSION,
    careerApiVersion:
      'CAREER-ROADMAP-V8',

    date: state.date,
    city: state.city,
    cityName: getCityName(),

    /*
      Veri kapsamı:
      all = tüm koşular hesaplandı.
      partial = en az bir koşu hesaplandı.
    */
    coverage:
      raceValue === 'all'
        ? 'all'
        : (
            previous?.coverage === 'all'
              ? 'all'
              : 'partial'
          ),

    calculatedRace:
      raceValue,

    rule:
      'SADECE_ILK_5_VE_YARIS_TARIHINDEN_ONCE',

    races:
      mergedRaces,

    generatedAt:
      new Date()
        .toISOString()
  };

  state.analyses.career =
    result;

  save();

  renderCareerAnalysis(
    result,
    raceValue
  );
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
