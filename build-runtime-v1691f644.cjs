const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname,BASE=path.join(ROOT,'build-runtime-v1691f642.cjs'),EXTRA=path.join(ROOT,'daily-package-planner-v1691f645.js'),APP=path.join(ROOT,'public','at-ai-app-v142.js'),INDEX=path.join(ROOT,'public','index.html'),HEADERS=path.join(ROOT,'public','_headers');
if(!fs.existsSync(BASE))throw new Error('[F60.44] Missing F60.42 complete asset builder.');
if(!fs.existsSync(EXTRA))throw new Error('[F60.45] Missing daily package planner module.');
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
app+='\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';
for(const token of['TJK-ANNUAL-ARCHIVE-V14.2-SCHEMA-REPAIR','lastDbWriteError','ANNUAL-DB-COEXISTENCE-V16.9.1F60.43','PROCESS-FLOW-PLANNER-V16.9.1F60.45','Yerel Katalogu Say','Seçilen Benzer Yarışları İndir','CAREER-PAIR-DISPLAY-FIX-V16.9.1F60.46','Uyum %','HP\',hp(p.a)===null||hp(p.b)===null?\'yok\''])if(!app.includes(token))throw new Error('[F60.46] Verification failed: '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
const CACHE_BUST='169254';
const BOOT_GUARD_VERSION='BOOT-STATE-GUARD-V16.9.1F60.54';
const MENU_BRIDGE_VERSION='MENU-BRIDGE-V16.9.1F60.54';
const bootGuard=`
<script id="atBootStateGuardV169254">
(() => {
'use strict';
if (window.__AT_BOOT_STATE_GUARD_V169254__) return;
window.__AT_BOOT_STATE_GUARD_V169254__ = true;
const VERSION = 'BOOT-STATE-GUARD-V16.9.1F60.54';
const KEY = 'at_ai_mobil_state_v2';
const MAX_BYTES = 320000;
function dateFrom(raw) {
  const match = String(raw || '').match(/"date"\\s*:\\s*"(\\d{4}-\\d{2}-\\d{2})"/);
  return match ? match[1] : '';
}
function reset(raw, reason) {
  const next = {
    date: dateFrom(raw),
    city: '',
    cities: [],
    races: [],
    selectedRace: 'all',
    signalSource: 'combined',
    tickets: [],
    analyses: { current: {}, historical: {}, scenario: {}, career: {} },
    compactedBy: VERSION,
    compactedReason: reason
  };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { try { localStorage.removeItem(KEY); } catch {} }
}
try {
  const raw = localStorage.getItem(KEY);
  if (raw && raw.length > MAX_BYTES) reset(raw, 'oversized:' + raw.length);
} catch {}
})();
</script>`;
const menuBridge=`
<script id="atMenuBridgeV169254">
(() => {
'use strict';
if (window.__AT_MENU_BRIDGE_V169254__) return;
window.__AT_MENU_BRIDGE_V169254__ = true;
const VERSION = 'MENU-BRIDGE-V16.9.1F60.54';
const MAIN_SCRIPT_SRC = '/at-ai-app-v142.js?v=169254';
const STORAGE_KEY = 'at_ai_mobil_state_v2';
const MAX_STATE_BYTES = 320000;
const $ = id => document.getElementById(id);
const titles = {
  current: 'Güncel Analiz',
  historical: 'Tarihsel Benzerlik',
  scenario: 'Koşu Senaryosu',
  career: 'Kariyer Yol Haritası',
  calibration: 'Günlük Koşu Kalibrasyonu'
};
let callbacks = [];
let lastActivation = 0;

function status(text) {
  const el = $('status');
  if (el) el.textContent = text;
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '{}';
    if (raw.length > MAX_STATE_BYTES) {
      const match = raw.match(/"date"\\s*:\\s*"(\\d{4}-\\d{2}-\\d{2})"/);
      const next = {
        date: match ? match[1] : '',
        city: '',
        cities: [],
        races: [],
        selectedRace: 'all',
        signalSource: 'combined',
        tickets: [],
        analyses: { current: {}, historical: {}, scenario: {}, career: {} }
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    }
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function clearLocks() {
  try {
    document.documentElement.classList.remove(
      'at-menu-force-open-v169247',
      'at-menu-force-open-v169250',
      'at-menu-force-open-v169251',
      'at-menu-force-open-v169252',
      'at-menu-force-open-v169253',
      'at-menu-force-open-v169254',
      'at-hard-modal-lock-v1659',
      'drawer-open',
      'modal-open'
    );
    document.body?.classList.remove('drawer-open', 'modal-open');
  } catch {}
}

function closeDrawerSafe() {
  clearLocks();
  $('drawer')?.classList.remove('open');
  $('overlay')?.classList.remove('show');
  $('drawer')?.setAttribute('aria-hidden', 'true');
}

function showDialog(dialog) {
  if (!dialog) return;
  try {
    if (!dialog.open) dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }
}

function syncAnalysisRace(state) {
  const select = $('analysisRace');
  if (!select) return;
  const races = Array.isArray(state.races) ? state.races : [];
  const old = select.value || state.selectedRace || 'all';
  select.innerHTML = '<option value="all">Tüm Koşular</option>' + races.map(race => {
    const no = race.no || race.raceNo || '';
    return '<option value="' + esc(no) + '">' + esc(no) + '. Koşu</option>';
  }).join('');
  select.value = old === 'all' || races.some(r => String(r.no || r.raceNo || '') === String(old)) ? old : 'all';
}

function selectedRaces(state) {
  const races = Array.isArray(state.races) ? state.races : [];
  const wanted = $('analysisRace')?.value || state.selectedRace || 'all';
  return wanted === 'all' ? races : races.filter(race => String(race.no || race.raceNo || '') === String(wanted));
}

function lightRank(race) {
  const horses = Array.isArray(race?.horses) ? race.horses : [];
  const agfs = horses.map(horse => num(horse.agf)).filter(value => value !== null && value > 0);
  const odds = horses.map(horse => num(horse.odds)).filter(value => value !== null && value > 0);
  const maxAgf = Math.max(0, ...agfs);
  const minOdds = odds.length ? Math.min(...odds) : null;
  return horses.map(horse => {
    const agf = num(horse.agf);
    const odd = num(horse.odds);
    const agfScore = maxAgf && agf !== null ? agf / maxAgf * 100 : 0;
    const oddsScore = minOdds && odd ? minOdds / odd * 100 : agfScore;
    const score = Math.round((agfScore * 0.6 + oddsScore * 0.4) * 10) / 10;
    return { horse, score, agf, odd };
  }).sort((a, b) => b.score - a.score || Number(a.horse?.no || 999) - Number(b.horse?.no || 999));
}

function renderCurrentAnalysis() {
  const content = $('analysisContent');
  if (!content) return;
  const state = readState();
  syncAnalysisRace(state);
  const races = selectedRaces(state);
  content.classList.remove('empty');
  if (!races.length) {
    content.innerHTML = '<div style="padding:15px;line-height:1.55">Önce TJK programını yükleyin.</div>';
    return;
  }
  content.innerHTML =
    '<div style="padding:12px 2px 14px;line-height:1.5">' +
    '<b>Hafif Güncel Analiz</b><br>' +
    '<span style="opacity:.75">Ana sayfayı kilitlemeden AGF ağırlıklı hızlı sıralama. Ağır motor yalnız siz başlatırsanız yüklenir.</span>' +
    '</div>' +
    races.map(race => {
      const ranked = lightRank(race).slice(0, 8);
      return '<section class="race-card" style="margin-bottom:12px">' +
        '<div class="race-head"><div><strong>' + esc(race.no || race.raceNo || '') + '. Koşu</strong> ' + esc(race.time || '') + '</div></div>' +
        '<div class="race-meta">' + esc(race.class || '') + ' · ' + esc(race.ageGroup || '') + ' · ' + esc(race.distance || '') + ' ' + esc(race.track || '') + '</div>' +
        '<div class="horse-list">' + ranked.map((item, index) => (
          '<div class="horse-row">' +
          '<div><b>' + (index + 1) + '. ' + esc(item.horse?.no || '') + ' ' + esc(item.horse?.name || item.horse?.atadi || '') + '</b>' +
          '<small>HP ' + esc(item.horse?.hp ?? '-') + ' · KGS ' + esc(item.horse?.kgs ?? '-') + '</small></div>' +
          '<div class="horse-stats"><span>Skor ' + esc(item.score.toLocaleString('tr-TR')) + '</span><span>AGF ' + esc(item.agf ?? '-') + '</span></div>' +
          '</div>'
        )).join('') + '</div>' +
        '</section>';
    }).join('');
}

function writeState(next) {
  try {
    const compact = {
      date: next?.date || '',
      city: next?.city || '',
      cities: Array.isArray(next?.cities) ? next.cities : [],
      races: Array.isArray(next?.races) ? next.races : [],
      selectedRace: next?.selectedRace || 'all',
      signalSource: next?.signalSource || 'combined',
      tickets: Array.isArray(next?.tickets) ? next.tickets : [],
      analyses: { current: {}, historical: {}, scenario: {}, career: {} }
    };
    let raw = JSON.stringify(compact);
    if (raw.length > MAX_STATE_BYTES) {
      compact.tickets = [];
      compact.analyses = { current: {}, historical: {}, scenario: {}, career: {} };
      raw = JSON.stringify(compact);
    }
    localStorage.setItem(STORAGE_KEY, raw);
    return compact;
  } catch {
    return next || {};
  }
}

function stateCityName(state) {
  const cities = Array.isArray(state?.cities) ? state.cities : [];
  const found = cities.find(city => String(city?.id || '') === String(state?.city || ''));
  return found?.name || '';
}

function selectedProgramUrl(state) {
  const date = state?.date || $('raceDate')?.value || '';
  const cityId = state?.city || $('citySelect')?.value || '';
  if (!date || !cityId) return '';
  const params = new URLSearchParams({ date, scope: 'selected', enrichIds: '1', t: String(Date.now()) });
  params.set('cityId', cityId);
  const selected = currentRaceValue();
  if (selected && selected !== 'all') params.set('raceNo', selected);
  const cityName = stateCityName(state);
  if (cityName) params.set('cityName', cityName);
  return '/api/tjk-program?' + params.toString();
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 30000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || ('API ' + response.status));
    }
    return data || {};
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('API 30 saniyede cevap vermedi.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function currentRaceValue() {
  return $('analysisRace')?.value || readState().selectedRace || 'all';
}

function raceNo(race) {
  return race?.no || race?.raceNo || '';
}

function findRace(races, value) {
  return (Array.isArray(races) ? races : []).find(race => String(raceNo(race)) === String(value));
}

function hasMissingHorseIds(race) {
  const horses = Array.isArray(race?.horses) ? race.horses : [];
  return horses.some(horse => !horse?.id);
}

function careerRows(data) {
  for (const key of ['roadmap', 'top5', 'races', 'preparationPath', 'recentForm', 'history', 'wins']) {
    if (Array.isArray(data?.[key]) && data[key].length) return data[key];
  }
  return [];
}

function careerModeLabel(mode) {
  if (mode === 'WIN_PATH') return 'Galibiyet yolu';
  if (mode === 'PREPARATION_PATH') return 'Hazırlık yolu';
  if (mode === 'DEBUT') return 'Debut';
  return mode || 'Kariyer';
}

function lightCareerScore(horse, career) {
  const summary = career?.summary || {};
  const counts = career?.counts || {};
  const rows = careerRows(career);
  const wins = Number(summary.first ?? counts.wins ?? 0) || 0;
  const top5 = Number(summary.totalTop5 ?? counts.top5 ?? rows.length ?? 0) || 0;
  const agf = num(horse?.agf) || 0;
  const hp = num(horse?.hp) || 0;
  const odd = num(horse?.odds);
  const oddsScore = odd && odd > 0 ? Math.max(0, 40 - odd) : 0;
  const score = wins * 14 + top5 * 3 + Math.min(rows.length, 12) * 1.2 + agf * 1.1 + hp * 0.18 + oddsScore * 0.25;
  return Math.round(score * 10) / 10;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runOne() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await worker(items[current], current);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, runOne);
  await Promise.all(runners);
  return results;
}

function renderCareerIntro(message) {
  const content = $('analysisContent');
  if (!content) return;
  const state = readState();
  syncAnalysisRace(state);
  const races = Array.isArray(state.races) ? state.races : [];
  const selected = currentRaceValue();
  content.classList.remove('empty');
  if (!races.length) {
    content.innerHTML = '<div style="padding:15px;line-height:1.55"><b>Kariyer Yol Haritası</b><br>Önce ana sayfadan TJK programını yükleyin.</div>';
    return;
  }
  const raceButtons = races.map(race => (
    '<button type="button" class="secondary small" data-at-light-career-race="' + esc(raceNo(race)) + '">' + esc(raceNo(race)) + '. Koşu</button>'
  )).join('');
  content.innerHTML =
    '<div style="padding:15px;line-height:1.55">' +
      '<b>Kariyer Yol Haritası</b><br>' +
      '<span style="opacity:.78">Telefonun kilitlenmemesi için kariyer hesabı tek koşu üzerinden çalışır.</span>' +
      (message ? '<div style="margin-top:10px;color:#ffbd82">' + esc(message) + '</div>' : '') +
      '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:7px">' + raceButtons + '</div>' +
      '<div style="margin-top:12px;opacity:.72">Seçim: <b>' + esc(selected === 'all' ? 'Tüm koşular' : selected + '. Koşu') + '</b>. Analizi Hesapla düğmesine basınca sadece seçili koşu hesaplanır.</div>' +
      '<button type="button" class="secondary small" data-at-load-full="career" style="margin-top:12px">Tam motoru ayrıca yükle</button>' +
    '</div>';
}

async function refreshProgramWithIds(state, content) {
  const url = selectedProgramUrl(state);
  if (!url) throw new Error('Tarih veya şehir seçili değil.');
  if (content) {
    content.innerHTML = '<div style="padding:15px;line-height:1.55">At ID eşleştirmesi TJK linklerinden tamamlanıyor...</div>';
  }
  const data = await fetchJson(url, 33000);
  const selectedId = String(data.selectedCityId || state.city || '');
  const incomingRaces = data?.racesByCity?.[selectedId] || data?.programs?.[selectedId] || [];
  const selected = currentRaceValue();
  let races = incomingRaces;
  if (
    selected &&
    selected !== 'all' &&
    incomingRaces.length &&
    Array.isArray(state.races) &&
    state.races.length > incomingRaces.length
  ) {
    const incoming = incomingRaces[0];
    let replaced = false;
    races = state.races.map(race => {
      if (String(raceNo(race)) !== String(selected)) return race;
      replaced = true;
      return incoming;
    });
    if (!replaced) races = [...races, incoming];
  }
  const incomingCities = Array.isArray(data.cities) ? data.cities : [];
  const oldCities = Array.isArray(state.cities) ? state.cities : [];
  const cities = incomingCities.length === 1 && oldCities.length > 1 ? oldCities : (incomingCities.length ? incomingCities : oldCities);
  const next = writeState({
    ...state,
    date: data.date || state.date,
    city: selectedId || state.city,
    cities,
    races,
    selectedRace: currentRaceValue(),
    tickets: [],
    analyses: { current: {}, historical: {}, scenario: {}, career: {} }
  });
  syncAnalysisRace(next);
  return next;
}

function careerRowLine(row) {
  const date = row?.isoDate || row?.date || row?.tarih || '';
  const city = row?.city || row?.sehir || '';
  const klass = row?.class || row?.raceClass || '';
  const distance = row?.distance || row?.mesafe || '';
  const finish = row?.finish ?? row?.rank ?? row?.sira ?? row?.der ?? '';
  return [date, city, klass, distance ? distance + 'm' : '', finish ? finish + '.' : ''].filter(Boolean).join(' · ');
}

function renderLightCareerResult(race, items, skippedCount) {
  const content = $('analysisContent');
  if (!content) return;
  const sorted = [...items].sort((a, b) => Number(b.score || -1) - Number(a.score || -1) || Number(a.horse?.no || 999) - Number(b.horse?.no || 999));
  content.classList.remove('empty');
  content.innerHTML =
    '<div style="margin-bottom:10px;font-size:13px;line-height:1.5">' +
      '<b>Hafif Kariyer Yol Haritası · ' + esc(raceNo(race)) + '. Koşu</b><br>' +
      '<span style="opacity:.72">' + esc(race?.class || '') + ' · ' + esc(race?.ageGroup || '') + ' · ' + esc(race?.distance || '') + ' ' + esc(race?.track || '') + '</span>' +
      (skippedCount ? '<br><span style="color:#ffbd82">' + esc(skippedCount) + ' at ID gelmediği için kariyerden atlandı.</span>' : '') +
    '</div>' +
    sorted.map((item, index) => {
      const rows = careerRows(item.career).slice(0, 6);
      const ok = item.ok !== false;
      return '<details class="career-horse-accordion-v104">' +
        '<summary><div class="career-horse-summary-v104">' +
          '<div style="min-width:0"><div class="career-horse-name-v104">' + esc(item.horse?.no || '') + '. ' + esc(item.horse?.name || item.horse?.atadi || '') + '</div>' +
          '<div class="career-horse-status-v104">' + (ok ? esc(careerModeLabel(item.career?.analysisMode)) + ' · ' + esc(rows.length) + ' kayıt önizleme' : esc(item.error || 'Kariyer alınamadı')) + '</div></div>' +
          '<div class="career-horse-score-v104"><div><div style="font-size:18px;font-weight:900;line-height:1;color:' + (ok ? '#7ee2a8' : '#ffbd82') + '">' + (ok ? esc(item.score.toLocaleString('tr-TR')) : '-') + '</div><div style="font-size:9px;opacity:.72;margin-top:2px">Sıra ' + esc(index + 1) + '</div></div><div class="career-detail-label-v104">Detay</div></div>' +
        '</div></summary>' +
        '<div style="padding:6px 10px 12px;line-height:1.45;font-size:12px">' +
          (ok && rows.length ? rows.map(row => '<div style="padding:6px 0;border-top:1px solid rgba(120,160,200,.18)">' + esc(careerRowLine(row)) + '</div>').join('') : '<div style="opacity:.72">' + esc(item.error || 'Kariyer kaydı yok.') + '</div>') +
        '</div>' +
      '</details>';
    }).join('');
}

let lightCareerRunning = false;

async function runLightCareer() {
  if (lightCareerRunning) return;
  lightCareerRunning = true;
  const content = $('analysisContent');
  try {
    let state = readState();
    syncAnalysisRace(state);
    const selected = currentRaceValue();
    if (selected === 'all') {
      renderCareerIntro('Lütfen tek koşu seçin; tüm koşuları aynı anda hesaplamak telefonda kilitlenmeye yol açıyordu.');
      return;
    }
    let race = findRace(state.races, selected);
    if (!race) {
      renderCareerIntro('Seçilen koşu programda bulunamadı. Programı yeniden yükleyin.');
      return;
    }
    if (hasMissingHorseIds(race)) {
      state = await refreshProgramWithIds(state, content);
      race = findRace(state.races, selected);
    }
    const horses = Array.isArray(race?.horses) ? race.horses : [];
    const withId = horses.filter(horse => horse?.id);
    const skippedCount = horses.length - withId.length;
    if (!withId.length) {
      if (content) content.innerHTML = '<div style="padding:15px;line-height:1.55;color:#ffbd82"><b>Kariyer için At ID alınamadı.</b><br>Program kartları geldi, fakat TJK at linkleri Cloudflare tarafında ID vermediği için yanlış ata bağlamamak adına hesap durduruldu.</div>';
      return;
    }
    let done = 0;
    if (content) content.innerHTML = '<div style="padding:15px;line-height:1.55">Kariyer kayıtları alınıyor: 0/' + esc(withId.length) + '</div>';
    const items = await mapLimit(withId, 2, async horse => {
      try {
        const data = await fetchJson('/api/tjk-career-v10?horseId=' + encodeURIComponent(horse.id) + '&before=' + encodeURIComponent(state.date || ''), 45000);
        return { horse, career: data, ok: true, score: lightCareerScore(horse, data) };
      } catch (error) {
        return { horse, career: null, ok: false, error: error?.message || 'Kariyer alınamadı.', score: -1 };
      } finally {
        done += 1;
        if (content) content.innerHTML = '<div style="padding:15px;line-height:1.55">Kariyer kayıtları alınıyor: ' + esc(done) + '/' + esc(withId.length) + '</div>';
      }
    });
    renderLightCareerResult(race, items, skippedCount);
  } finally {
    lightCareerRunning = false;
  }
}

function fallbackAnalysis(view) {
  closeDrawerSafe();
  const dialog = $('analysisDialog');
  if (!dialog) {
    status('Analiz penceresi bulunamadı.');
    return;
  }
  dialog.dataset.view = view;
  dialog.classList.toggle('calibration-dialog-v116', view === 'calibration');
  if (view !== 'calibration') delete dialog.dataset.dailyCalibrationF6018;
  const title = $('dialogTitle');
  const eyebrow = $('dialogEyebrow');
  const content = $('analysisContent');
  if (title) title.textContent = titles[view] || 'Analiz';
  if (eyebrow) eyebrow.textContent = view === 'calibration' ? 'GÜNLÜK KALİBRASYON' : 'AT AI ANALİZ';
  if (content) {
    content.classList.add('empty');
    content.innerHTML = view === 'career'
      ? 'Kariyer Yol Haritasını hesaplayın.'
      : 'Bu analiz henüz hesaplanmadı.';
  }
  showDialog(dialog);
}

function callOpenAnalysis(view) {
  try {
    const fn = window.openAnalysis || (typeof openAnalysis === 'function' ? openAnalysis : null);
    if (typeof fn === 'function') {
      fn(view);
      return true;
    }
  } catch (error) {
    console.warn('[AT AI]', VERSION, 'openAnalysis hata', error);
  }
  return false;
}

function finishMainScript() {
  window.__AT_EARLY_MAIN_LOADED__ = true;
  window.__AT_MAIN_SCRIPT_LOADING__ = false;
  const pending = callbacks.splice(0);
  for (const callback of pending) setTimeout(callback, 0);
}

function ensureMainScript(callback) {
  if (typeof callback === 'function') callbacks.push(callback);
  if (window.__AT_EARLY_MAIN_LOADED__) {
    finishMainScript();
    return;
  }
  if (window.__AT_MAIN_SCRIPT_LOADING__) {
    setTimeout(() => {
      if (window.__AT_EARLY_MAIN_LOADED__) finishMainScript();
      else ensureMainScript();
    }, 140);
    return;
  }
  const existing = document.querySelector('script[src*="at-ai-app-v142.js"]');
  if (existing) {
    window.__AT_MAIN_SCRIPT_LOADING__ = true;
    existing.addEventListener('load', finishMainScript, { once: true });
    existing.addEventListener('error', () => {
      window.__AT_MAIN_SCRIPT_LOADING__ = false;
      status('Ana uygulama dosyası yüklenemedi. Sayfayı yenileyin.');
    }, { once: true });
    return;
  }
  window.__AT_MAIN_SCRIPT_LOADING__ = true;
  const script = document.createElement('script');
  script.src = MAIN_SCRIPT_SRC;
  script.async = true;
  script.onload = finishMainScript;
  script.onerror = () => {
    window.__AT_MAIN_SCRIPT_LOADING__ = false;
    callbacks = [];
    status('Ana uygulama dosyası yüklenemedi. Sayfayı yenileyin.');
  };
  document.body.appendChild(script);
}

function loadFullFor(kind) {
  status('Tam analiz motoru yükleniyor...');
  ensureMainScript(() => {
    setTimeout(() => {
      if (kind === 'coupon') {
        try {
          window.ATCouponDecisionV1671?.open?.();
        } catch (error) {
          console.warn('[AT AI]', VERSION, 'coupon full hata', error);
        }
        showDialog($('couponCenterDialog'));
        return;
      }
      if (!callOpenAnalysis(kind)) fallbackAnalysis(kind);
    }, 60);
  });
}

function lightNotice(view) {
  return '<div style="padding:15px;line-height:1.55">' +
    '<b>' + esc(titles[view] || 'Analiz') + '</b><br>' +
    '<span style="opacity:.78">Telefonun ana sayfada kilitlenmemesi için ağır modül başlangıçta yüklenmedi.</span><br><br>' +
    '<button type="button" class="primary small" data-at-load-full="' + esc(view) + '">Tam Modülü Yükle</button>' +
    '</div>';
}

function openLightView(view) {
  closeDrawerSafe();
  const dialog = $('analysisDialog');
  if (!dialog) return;
  const state = readState();
  syncAnalysisRace(state);
  dialog.dataset.view = view;
  dialog.classList.toggle('calibration-dialog-v116', view === 'calibration');
  if (view !== 'calibration') delete dialog.dataset.dailyCalibrationF6018;
  if ($('dialogTitle')) $('dialogTitle').textContent = titles[view] || 'Analiz';
  if ($('dialogEyebrow')) $('dialogEyebrow').textContent = view === 'calibration' ? 'GÜNLÜK KALİBRASYON' : 'AT AI ANALİZ';
  showDialog(dialog);
  if (view === 'current') renderCurrentAnalysis();
  else if (view === 'career') renderCareerIntro();
  else if ($('analysisContent')) {
    $('analysisContent').classList.remove('empty');
    $('analysisContent').innerHTML = lightNotice(view);
  }
}

function injectCouponStyle() {
  if ($('atLightCouponStyleV169254')) return;
  const style = document.createElement('style');
  style.id = 'atLightCouponStyleV169254';
  style.textContent = '#couponCenterDialog{position:fixed!important;inset:0!important;width:100%!important;max-width:100%!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border:0!important;border-radius:0!important;background:#07131f!important;color:#eef7ff!important;overflow:hidden!important}#couponCenterDialog[open]{display:flex!important;flex-direction:column!important}#couponCenterDialog::backdrop{background:#07131f!important;opacity:1!important}.coupon-menu-scroll-v1681{flex:1 1 auto;min-height:0;overflow:auto;padding:12px;box-sizing:border-box}';
  document.head.appendChild(style);
}

function renderLightCoupon() {
  const box = $('tickets');
  if (!box) return;
  const state = readState();
  const races = Array.isArray(state.races) ? state.races : [];
  box.classList.remove('empty');
  if (!races.length) {
    box.innerHTML = 'Önce TJK programını yükleyin.';
    return;
  }
  box.innerHTML = races.map(race => {
    const top = lightRank(race).slice(0, 3);
    return '<div class="ticket-card"><strong>' + esc(race.no || race.raceNo || '') + '. Koşu</strong><div>' +
      top.map(item => esc(item.horse?.no || '') + ' ' + esc(item.horse?.name || item.horse?.atadi || '')).join(' · ') +
      '</div><small>Hafif önizleme. Kariyer/Hazırlık kuponu için tam modülü yükleyin.</small></div>';
  }).join('') +
    '<button type="button" class="primary small" data-at-load-full="coupon" style="width:100%;margin-top:10px">Tam Kupon Motorunu Yükle</button>';
}

function bindLightCoupon() {
  $('couponAuditSectionV1681')?.setAttribute('hidden', '');
  $('couponSetupV1681')?.removeAttribute('hidden');
  $('couponResultV1681')?.removeAttribute('hidden');
  const close = $('closeCouponMenuV1681');
  if (close && close.dataset.lightV169254 !== '1') {
    close.dataset.lightV169254 = '1';
    close.addEventListener('click', () => {
      try { $('couponCenterDialog')?.close(); } catch { $('couponCenterDialog')?.removeAttribute('open'); }
    });
  }
}

function openLightCoupon() {
  closeDrawerSafe();
  injectCouponStyle();
  bindLightCoupon();
  showDialog($('couponCenterDialog'));
  renderLightCoupon();
}

function handleDrawerActivation(event) {
  const button = event.target?.closest?.('#drawer button');
  if (!button || button.id === 'closeMenu') return;
  const view = button.dataset?.view || '';
  const isCoupon = button.id === 'couponMenuBtn';
  if (!view && !isCoupon) return;
  if (window.__AT_EARLY_MAIN_LOADED__) {
    setTimeout(() => {
      if (view && !$('analysisDialog')?.open) fallbackAnalysis(view);
      if (isCoupon && !$('couponCenterDialog')?.open) openLightCoupon();
    }, 320);
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  const now = Date.now();
  if (now - lastActivation < 450) return;
  lastActivation = now;
  if (isCoupon) openLightCoupon();
  else openLightView(view);
}

document.addEventListener('pointerdown', handleDrawerActivation, true);
document.addEventListener('click', handleDrawerActivation, true);
document.addEventListener('click', event => {
  const lightCareerRace = event.target?.closest?.('[data-at-light-career-race]');
  if (lightCareerRace && !window.__AT_EARLY_MAIN_LOADED__) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const select = $('analysisRace');
    if (select) select.value = lightCareerRace.getAttribute('data-at-light-career-race') || 'all';
    runLightCareer();
    return;
  }
  const load = event.target?.closest?.('[data-at-load-full]');
  if (load) {
    event.preventDefault();
    event.stopImmediatePropagation();
    loadFullFor(load.getAttribute('data-at-load-full') || 'current');
    return;
  }
  const run = event.target?.closest?.('#runAnalysis');
  if (run && !window.__AT_EARLY_MAIN_LOADED__) {
    const view = $('analysisDialog')?.dataset?.view || 'current';
    event.preventDefault();
    event.stopImmediatePropagation();
    if (view === 'current') renderCurrentAnalysis();
    else if (view === 'career') runLightCareer();
    else loadFullFor(view);
    return;
  }
  const build = event.target?.closest?.('#buildAllBtn');
  if (build && !window.__AT_EARLY_MAIN_LOADED__) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderLightCoupon();
  }
}, true);
$('analysisRace')?.addEventListener('change', () => {
  if (!window.__AT_EARLY_MAIN_LOADED__ && $('analysisDialog')?.dataset?.view === 'current') renderCurrentAnalysis();
  if (!window.__AT_EARLY_MAIN_LOADED__ && $('analysisDialog')?.dataset?.view === 'career') renderCareerIntro();
});
window.ATMenuBridgeV169254 = { version: VERSION, openLightView, openLightCoupon, loadFullFor, closeDrawerSafe, runLightCareer };
console.info('[AT AI]', VERSION, 'aktif');
})();
</script>`;
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/g,'/at-ai-app-v142.js?v='+CACHE_BUST);
html=html.replace(/<script id="atBootStateGuardV\d+">[\s\S]*?<\/script>\s*/g,'');
html=html.replace(/<script id="atMenuBridgeV169\d+">[\s\S]*?<\/script>\s*/g,'');
html=html.includes('<script>\n    (() => {')?html.replace('<script>\n    (() => {',bootGuard+'\n  <script>\n    (() => {'):bootGuard+html;
html=html.includes('</body>')?html.replace('</body>',menuBridge+'\n</body>'):html+menuBridge;
fs.writeFileSync(INDEX,html,'utf8');
fs.writeFileSync(HEADERS,'/*\n  Cache-Control: no-store\n','utf8');
if(!html.includes('/at-ai-app-v142.js?v='+CACHE_BUST))throw new Error('[F60.54] Cache bust failed.');
if(!html.includes(BOOT_GUARD_VERSION))throw new Error('[F60.54] Boot state guard injection failed.');
if(!html.includes(MENU_BRIDGE_VERSION))throw new Error('[F60.54] Menu bridge injection failed.');
console.log('[AT AI] V16.9.1F60.54 build complete: lightweight drawer plus single-race career mode avoid mobile freezes.');
