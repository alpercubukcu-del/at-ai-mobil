/* AT AI Mobil — Annual Archive Current Race Bridge V13.2
   Standalone bridge: reads the main app's selected race without modifying Career files.
*/
(() => {
  'use strict';
  if (window.__AT_ANNUAL_CURRENT_RACE_V132__) return;
  window.__AT_ANNUAL_CURRENT_RACE_V132__ = true;

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
      // app.js uses a global lexical `let state`; later classic scripts can read it by identifier.
      if (typeof state !== 'undefined' && state && typeof state === 'object') return state;
    } catch {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function selectedRaceContext() {
    const s = readMainState();
    const races = Array.isArray(s?.races) ? s.races : [];
    let selected = clean(s?.selectedRace);

    if (!selected || selected === 'all') {
      const active = document.querySelector('#raceTabs .race-tab.active[data-race]:not([data-race="all"])');
      if (active?.dataset?.race) selected = clean(active.dataset.race);
    }
    if (!selected || selected === 'all') {
      const analysisRace = document.getElementById('analysisRace');
      if (analysisRace?.value && analysisRace.value !== 'all') selected = clean(analysisRace.value);
    }
    if ((!selected || selected === 'all') && races.length === 1) selected = clean(races[0]?.no);

    if (!selected || selected === 'all') {
      return { error: 'Önce ana ekrandan tek bir koşuya dokunun. “Tümü” seçiliyken hangi koşunun aktarılacağı belli değil.' };
    }

    const race = races.find(r => clean(r?.no ?? r?.raceNo ?? r?.kosuNo) === selected);
    if (!race) return { error: `${selected}. koşu ana programda bulunamadı. Programı yeniden yükleyip koşuya tekrar dokunun.` };

    const cityId = clean(s?.city);
    const city = clean((Array.isArray(s?.cities) ? s.cities : []).find(c => clean(c?.id) === cityId)?.name)
      || clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent)
      || cityId;
    const date = clean(s?.date || document.getElementById('raceDate')?.value);
    const classRaw = clean(race.class || race.yaradi1);
    const ageGroup = clean(race.ageGroup || race.yaradi2 || race.group || race.age_group);
    const distance = clean(race.distance || race.mesafe);
    const track = clean(race.track || race.pist);
    const raceName = clean(race.raceName || race.kosuIsmi || race.name);
    const time = clean(race.time || race.yaris_saati);

    return {
      race,
      raceNo: Number(race.no || race.raceNo || selected),
      city,
      cityId,
      date,
      classRaw,
      ageGroup,
      distance,
      track,
      raceName,
      time
    };
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
    return {
      base: parts.shift() || '',
      tokens: parts.map(canonicalToken).filter(Boolean)
    };
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

  function showSummary(ctx, error = '') {
    const button = document.getElementById('aaFillCurrent');
    if (!button) return;
    const actions = button.closest('.aa-actions');
    if (!actions) return;
    let box = document.getElementById('aaCurrentRaceSummary');
    if (!box) {
      box = document.createElement('div');
      box.id = 'aaCurrentRaceSummary';
      box.className = 'aa-note';
      box.style.marginTop = '8px';
      actions.insertAdjacentElement('afterend', box);
    }
    if (error) {
      box.style.color = '#ffbd82';
      box.innerHTML = `<b>Bugünkü koşu seçilemedi</b><br>${esc(error)}`;
      return;
    }
    box.style.color = '';
    const top = [ctx.city, ctx.raceNo ? `${ctx.raceNo}.K` : '', formatDate(ctx.date), ctx.time].filter(Boolean).join(' · ');
    const full = [ctx.classRaw, ctx.ageGroup, ctx.distance && ctx.track ? `${ctx.distance} ${ctx.track}` : (ctx.distance || ctx.track), ctx.raceName].filter(Boolean).join(' · ');
    box.innerHTML = `<b>Seçili bugünkü koşu</b><br>${esc(top)}<br><strong>${esc(full)}</strong>`;
  }

  function applyCurrentRace() {
    const ctx = selectedRaceContext();
    if (ctx?.error) {
      showSummary(null, ctx.error);
      return;
    }

    showSummary(ctx);
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

    // One change event is enough; the archive module reads all filter values in one pass.
    const trigger = document.getElementById('aaTrack') || document.getElementById('aaClassBase');
    trigger?.dispatchEvent(new Event('change', { bubbles: true }));

    if (missing.length) {
      const box = document.getElementById('aaCurrentRaceSummary');
      if (box) box.innerHTML += `<br><small style="color:#ffbd82">Yerel yıllık arşivde henüz eşleşmeyen alan: ${esc(missing.join(', '))}. İlgili yılı güncelleyin.</small>`;
    }
  }

  // Capture phase prevents the old V13 handler (which expected window.state) from silently returning first.
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('#aaFillCurrent');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyCurrentRace();
  }, true);
})();
