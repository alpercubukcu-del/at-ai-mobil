/* AT AI Mobil - V16.9.1F35 COUPON MISSING CAREER BATCH FIX
   - Replaces the fragile coupon "Eksik Kariyer Sıralamasını Tamamla" click path.
   - Completes all missing coupon legs in one Career batch without cycling the global race selector.
   - Preserves already scored Career legs and reopens the coupon audit with the accumulated result.
*/
(() => {
'use strict';
if (window.__AT_COUPON_MISSING_CAREER_BATCH_FIX_V1691F35__) return;
window.__AT_COUPON_MISSING_CAREER_BATCH_FIX_V1691F35__ = true;

const VERSION = 'COUPON-MISSING-CAREER-BATCH-FIX-V16.9.1F35';
const SCREEN_ID = 'couponDecisionGateV1671';
const BODY_ID = 'cdgBodyV1671';
let busy = false;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

function $(id) {
  try { return document.getElementById(id); } catch { return null; }
}

function currentState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  try { if (window.state && typeof window.state === 'object') return window.state; } catch {}
  return null;
}

function canonicalDate(value) {
  const s = clean(value);
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = s.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return s;
}

function sameDate(a, b) {
  return canonicalDate(a) === canonicalDate(b);
}

function sameCity(a, b) {
  return clean(a) === clean(b);
}

function careerResult() {
  const st = currentState();
  return st?.analyses?.career || null;
}

function careerRace(no) {
  const career = careerResult();
  return (Array.isArray(career?.races) ? career.races : [])
    .find(race => String(race?.no) === String(no)) || null;
}

function scoreRows(no) {
  try {
    const api = window.ATCouponCareerOnlyV1691F1;
    if (api?.scoreRows) {
      const rows = api.scoreRows(no);
      return Array.isArray(rows) ? rows : [];
    }
  } catch {}

  const race = careerRace(no);
  return (Array.isArray(race?.horses) ? race.horses : [])
    .map(item => {
      const score = Number(item?.galibiyetBenzerligi?.score);
      return Number.isFinite(score) ? { item, horse:item?.horse || {}, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || Number(a?.horse?.no || 999) - Number(b?.horse?.no || 999));
}

function auditRaceNos() {
  try {
    const audit = window.ATCouponCareerOnlyV1691F1?.audit?.() || window.ATCouponDecisionV1671?.audit?.();
    if (Array.isArray(audit?.raceNos)) return audit.raceNos.map(Number).filter(Number.isFinite);
  } catch {}
  return [];
}

function programRace(no) {
  const st = currentState();
  return (Array.isArray(st?.races) ? st.races : [])
    .find(race => String(race?.no) === String(no)) || null;
}

function missingRaceNos() {
  const st = currentState();
  const career = careerResult();
  const raceNos = auditRaceNos();
  if (!raceNos.length) return [];

  const wrongHeader = !career ||
    !sameDate(career?.date, st?.date) ||
    !sameCity(career?.city, st?.city);

  if (wrongHeader) return raceNos;
  return raceNos.filter(no => !careerRace(no) || !scoreRows(no).length);
}

function waitPaint() {
  return new Promise(resolve => {
    try {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    } catch {
      setTimeout(resolve, 0);
    }
  });
}

function showProgress(title, detail = '') {
  const screen = $(SCREEN_ID);
  const body = $(BODY_ID);
  if (!screen || !body) return;
  screen.classList.add('open');
  screen.setAttribute('aria-hidden', 'false');

  let box = $('couponCareerBatchStatusF35');
  if (!box) {
    box = document.createElement('div');
    box.id = 'couponCareerBatchStatusF35';
    box.className = 'cdg-card';
    body.prepend(box);
  }
  box.innerHTML = `
    <h3>${esc(title)}</h3>
    ${detail ? `<p>${esc(detail)}</p>` : ''}
  `;
}

function restoreDialog(old) {
  const dialog = $('analysisDialog');
  const selector = $('analysisRace');
  if (dialog) {
    if (old.view) dialog.dataset.view = old.view;
    else delete dialog.dataset.view;
  }
  if (selector && old.value !== undefined) selector.value = old.value;
}

async function reopenAudit(message = '') {
  try {
    await window.ATCouponDailyArchiveV1691?.hydrateCurrent?.();
  } catch {}
  try {
    await window.ATCouponDecisionV1671?.open?.();
  } catch {}
  if (message) showProgress(message);
}

async function completeMissingCareerBatch() {
  if (busy) return;
  busy = true;

  const dialog = $('analysisDialog');
  const selector = $('analysisRace');
  const old = {
    view:dialog?.dataset?.view || '',
    value:selector?.value
  };

  try {
    const nos = missingRaceNos();
    if (!nos.length) {
      await reopenAudit('Eksik kariyer sıralaması kalmadı.');
      return;
    }

    const races = nos.map(programRace).filter(Boolean);
    const notFound = nos.filter(no => !programRace(no));
    if (notFound.length) {
      throw new Error(`${notFound.map(no => `${no}.K`).join(', ')} günlük programda bulunamadı.`);
    }
    if (typeof runCareerAnalysis !== 'function') {
      throw new Error('Kariyer hesaplama fonksiyonu bulunamadı.');
    }

    showProgress(
      'Eksik kariyer sıralamaları tamamlanıyor',
      `${races.map(race => `${race.no}.K`).join(', ')} tek seferde hesaplanıyor.`
    );

    if (dialog) dialog.dataset.view = 'career';
    if (selector) selector.value = 'all';

    await waitPaint();
    await runCareerAnalysis(races, null);
    await waitPaint();

    const stillMissing = missingRaceNos();
    if (stillMissing.length) {
      throw new Error(`${stillMissing.map(no => `${no}.K`).join(', ')} hâlâ sıralama üretmedi.`);
    }

    restoreDialog(old);
    await reopenAudit('Kariyer/Hazırlık sıralamaları tamamlandı.');
  } catch (error) {
    restoreDialog(old);
    showProgress('Tamamlama hatası', error?.message || String(error));
  } finally {
    busy = false;
  }
}

document.addEventListener('click', event => {
  const target = event.target?.closest?.('#careerOnlyCompleteV1691F1');
  if (!target) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  void completeMissingCareerBatch();
}, true);

window.ATCouponMissingCareerBatchFixV1691F35 = {
  version:VERSION,
  complete:completeMissingCareerBatch,
  missingRaceNos
};

console.info('[AT AI]', VERSION, 'active - coupon missing Career legs are completed in one batch.');
})();
