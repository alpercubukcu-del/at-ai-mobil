/* AT AI Mobil — Annual Archive Current Race Picker V13.3
   Standalone picker: lists all races for the loaded day/city and fills archive filters.
   Does not modify Career analysis source files.
*/
(() => {
  'use strict';
  if (window.__AT_ANNUAL_CURRENT_RACE_V133__) return;
  window.__AT_ANNUAL_CURRENT_RACE_V133__ = true;

  const STORAGE_KEY = 'at_ai_mobil_state_v2';
  const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const fold = v => clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function readMainState() {
    try {
      if (typeof state !== 'undefined' && state && typeof state === 'object') return state;
    } catch {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function cityName(s) {
    const cityId = clean(s?.city);
    return clean((Array.isArray(s?.cities) ? s.cities : []).find(c => clean(c?.id) === cityId)?.name)
      || clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent)
      || cityId;
  }

  function raceContext(s, race) {
    return {
      race,
      raceNo: Number(race?.no || race?.raceNo || race?.kosuNo || 0),
      city: cityName(s),
      cityId: clean(s?.city),
      date: clean(s?.date || document.getElementById('raceDate')?.value),
      classRaw: clean(race?.class || race?.yaradi1),
      ageGroup: clean(race?.ageGroup || race?.yaradi2 || race?.group || race?.age_group),
      distance: clean(race?.distance || race?.mesafe),
      track: clean(race?.track || race?.pist),
      raceName: clean(race?.raceName || race?.kosuIsmi || race?.name),
      time: clean(race?.time || race?.yaris_saati)
    };
  }

  function allCurrentRaceContexts() {
    const s = readMainState();
    const races = Array.isArray(s?.races) ? s.races : [];
    return races
      .map(r => raceContext(s, r))
      .filter(x => x.raceNo)
      .sort((a, b) => a.raceNo - b.raceNo);
  }

  function canonicalToken(v = '') {
    const t = fold(v).replace(/\s+/g, '');
    if (!t) return '';
    if (t === 'D' || t === 'DISI') return 'DISI';
    if (t === 'E' || t === 'ERKEK') return 'ERKEK';
    const y = t.match(/^Y-?(\d+)$/); if (y) return `Y${y[1]}`;
    const h = t.match(/^H-?(\d+)$/); if (h) return `H${h[1]}`;
    return t;
  }

  function splitClass(raw = '') {
    const parts = clean(raw).replace(/\s*\/\s*/g, '/').split('/').map(clean).filter(Boolean);
    return { base: parts.shift() || '', tokens: parts.map(canonicalToken).filter(Boolean) };
  }

  function setSelect(id, value) {
    const el = document.getElementById(id);
    if (!el || !clean(value)) return false;
    const wanted = fold(value);
    const option = [...el.options].find(o => clean(o.value) === clean(value))
      || [...el.options].find(o => fold(o.value) === wanted)
      || [...el.options].find(o => fold(o.textContent) === wanted);
    if (!option) return false;
    el.value = option.value;
    return true;
  }

  function formatDate(v = '') {
    const m = clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : clean(v);
  }

  function ensurePickerBox() {
    const button = document.getElementById('aaFillCurrent');
    const actions = button?.closest('.aa-actions');
    if (!actions) return null;
    let box = document.getElementById('aaCurrentRacePicker');
    if (!box) {
      box = document.createElement('div');
      box.id = 'aaCurrentRacePicker';
      box.style.marginTop = '8px';
      actions.insertAdjacentElement('afterend', box);
    }
    return box;
  }

  function renderPicker() {
    const box = ensurePickerBox();
    if (!box) return;
    const races = allCurrentRaceContexts();
    if (!races.length) {
      box.className = 'aa-note';
      box.style.color = '#ffbd82';
      box.innerHTML = '<b>Bugünkü koşular bulunamadı</b><br>Önce ana ekrandan TJK programını yükleyin ve şehri seçin.';
      return;
    }

    const city = races[0].city || '-';
    const date = formatDate(races[0].date);
    box.className = '';
    box.style.color = '';
    box.innerHTML = `
      <div class="aa-note" style="margin-bottom:8px"><b>${esc(city)} · ${esc(date)}</b><br>${races.length} koşu bulundu. Filtreye aktaracağın koşuya dokun.</div>
      <div class="aa-list" id="aaCurrentRaceChoices">
        ${races.map(ctx => {
          const head = [ctx.city, `${ctx.raceNo}.K`, ctx.time].filter(Boolean).join(' · ');
          const full = [ctx.classRaw, ctx.ageGroup, ctx.distance && ctx.track ? `${ctx.distance} ${ctx.track}` : (ctx.distance || ctx.track), ctx.raceName].filter(Boolean).join(' · ');
          return `<button type="button" class="aa-row aa-current-race-choice" data-aa-race="${ctx.raceNo}" style="width:100%;text-align:left;cursor:pointer;border:0">
            <div class="aa-row-main"><div class="aa-row-title">${esc(head)}</div><div class="aa-row-sub">${esc(full)}</div></div>
          </button>`;
        }).join('')}
      </div>`;

    box.querySelectorAll('[data-aa-race]').forEach(btn => {
      btn.addEventListener('click', () => {
        const no = Number(btn.dataset.aaRace || 0);
        const ctx = races.find(x => x.raceNo === no);
        if (ctx) applyRace(ctx);
      });
    });
  }

  function showSelected(ctx, missing = []) {
    const box = ensurePickerBox();
    if (!box) return;
    const top = [ctx.city, `${ctx.raceNo}.K`, formatDate(ctx.date), ctx.time].filter(Boolean).join(' · ');
    const full = [ctx.classRaw, ctx.ageGroup, ctx.distance && ctx.track ? `${ctx.distance} ${ctx.track}` : (ctx.distance || ctx.track), ctx.raceName].filter(Boolean).join(' · ');
    box.className = 'aa-note';
    box.style.color = '';
    box.innerHTML = `<b>Seçili bugünkü koşu</b><br>${esc(top)}<br><strong>${esc(full)}</strong>${missing.length ? `<br><small style="color:#ffbd82">Yerel yıllık arşivde henüz eşleşmeyen alan: ${esc(missing.join(', '))}. İlgili yılı güncelleyin.</small>` : ''}<br><button type="button" id="aaChooseAnotherRace" class="aa-btn secondary" style="margin-top:8px">Başka Koşu Seç</button>`;
    document.getElementById('aaChooseAnotherRace')?.addEventListener('click', renderPicker);
  }

  function applyRace(ctx) {
    const ci = splitClass(ctx.classRaw);
    const missing = [];
    if (!setSelect('aaCity', ctx.city)) missing.push('Şehir');
    if (!setSelect('aaGroup', ctx.ageGroup)) missing.push('Grup');
    if (!setSelect('aaClassBase', ci.base)) missing.push('Koşu Cinsi');
    if (!setSelect('aaDistance', ctx.distance)) missing.push('Mesafe');
    if (!setSelect('aaTrack', ctx.track)) missing.push('Pist');

    const wantedTokens = new Set(ci.tokens);
    document.querySelectorAll('#aaTokens input[type="checkbox"]').forEach(input => {
      input.checked = wantedTokens.has(canonicalToken(input.value));
    });

    const trigger = document.getElementById('aaTrack') || document.getElementById('aaClassBase');
    trigger?.dispatchEvent(new Event('change', { bubbles: true }));
    showSelected(ctx, missing);
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('#aaFillCurrent');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderPicker();
  }, true);
})();
