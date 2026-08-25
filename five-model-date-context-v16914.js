/* AT AI Mobil — V16.9.14 5 Model Date Context Fix
   - Kariyer ekranindaki lazy 5 Model paneli state.date bos/yerel formatta olsa da
     secili kosu, Kariyer sonucu veya tarih kutusundan YYYY-MM-DD tarihi bulur.
   - prepareRaceModelsV11 ve getCareerRaceModelsV112 cagrilarindan hemen once
     state.date'i kanonik hale getirir; mevcut model formullerine dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_DATE_CONTEXT_V16914__) return;
window.__AT_FIVE_MODEL_DATE_CONTEXT_V16914__ = true;

const VERSION = 'FIVE-MODEL-DATE-CONTEXT-V16.9.14';
const STORAGE_KEY = 'at_ai_mobil_state_v2';
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function validYmd(y, m, d) {
  const yy = Number(y), mm = Number(m), dd = Number(d);
  if (!Number.isInteger(yy) || !Number.isInteger(mm) || !Number.isInteger(dd)) return false;
  if (yy < 2000 || yy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  return dt.getUTCFullYear() === yy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd;
}

function canonicalDate(value) {
  const s = clean(value);
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m && validYmd(m[1], m[2], m[3])) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[.\/-](\d{2})[.\/-](\d{4})$/);
  if (m && validYmd(m[3], m[2], m[1])) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})[.\/](\d{2})[.\/](\d{2})$/);
  if (m && validYmd(m[1], m[2], m[3])) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}

function storedDate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    const s = JSON.parse(raw);
    return canonicalDate(s?.date || s?.analyses?.career?.date);
  } catch { return ''; }
}

function resolveDate(race) {
  const candidates = [
    race?.date,
    race?.tarih,
    race?.raceDate,
    race?.programDate,
    (() => { try { return state?.date; } catch { return ''; } })(),
    (() => { try { return state?.analyses?.career?.date; } catch { return ''; } })(),
    (() => { try { return document.getElementById('raceDate')?.value; } catch { return ''; } })(),
    storedDate()
  ];
  for (const value of candidates) {
    const d = canonicalDate(value);
    if (d) return d;
  }
  return '';
}

function ensureDate(race) {
  const date = resolveDate(race);
  if (!date) {
    throw new Error('Seçili yarış tarihi bulunamadı. Yarış tarihini yeniden seçip tekrar deneyin.');
  }
  try {
    if (typeof state !== 'undefined' && state && state.date !== date) state.date = date;
  } catch {}
  try {
    const input = document.getElementById('raceDate');
    if (input && !canonicalDate(input.value)) input.value = date;
  } catch {}
  return date;
}

window.ATFiveModelDateContextV16914 = { VERSION, canonicalDate, resolveDate, ensureDate };

try {
  if (typeof prepareRaceModelsV11 === 'function') {
    const basePrepare = prepareRaceModelsV11;
    prepareRaceModelsV11 = async function(race, progress) {
      ensureDate(race);
      return basePrepare(race, progress);
    };
  }
} catch (e) {
  console.warn('[AT AI]', VERSION, 'prepareRaceModelsV11 sarmalanamadi:', e);
}

try {
  if (typeof getCareerRaceModelsV112 === 'function') {
    const baseGet = getCareerRaceModelsV112;
    getCareerRaceModelsV112 = async function(race) {
      ensureDate(race);
      return baseGet(race);
    };
  }
} catch (e) {
  console.warn('[AT AI]', VERSION, 'getCareerRaceModelsV112 sarmalanamadi:', e);
}

console.info('[AT AI]', VERSION, 'aktif — 5 Model tarihi kanonik baglamdan alinacak.');
})();
