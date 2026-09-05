/* AT AI Mobil - V16.9.1F60.26 final coupon routing
   - The coupon entry point hydrates only saved Career/Preparation races.
   - The audit screen remains the single gate before ticket creation.
   - Ticket ranking is the Career Roadmap raw evidence order from F60.23.
   - Five Model archives and calibrated coupon builders are never called here.
*/
(() => {
'use strict';
if (window.__AT_COUPON_CAREER_ONLY_FINAL_V1691F627__) return;
window.__AT_COUPON_CAREER_ONLY_FINAL_V1691F627__ = true;

const VERSION = 'COUPON-CAREER-ONLY-FINAL-V16.9.1F60.27';
const SOURCE = 'CAREER_ROADMAP_RANKING_RAW_EVIDENCE_F6023';
const TICKET_VERSION = 'CAREER-COUPON-V16.9.1F60.27-CAREER-ONLY';
let busy = false;

const $ = id => document.getElementById(id);
const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const baseGateOpen = typeof window.ATCouponDecisionV1671?.open === 'function'
  ? window.ATCouponDecisionV1671.open.bind(window.ATCouponDecisionV1671)
  : null;

function currentState() {
  try { if (typeof state === 'object' && state) return state; } catch {}
  return window.state || null;
}

function removeLegacyCopy(value) {
  return clean(value)
    .replace(/(?:\s*·\s*(?:Kalibresiz|Kalibreli))+\s*$/gi, '')
    .trim();
}

function patchUi() {
  const note = document.querySelector('#couponCenterDialog .five-model-note-v11');
  if (note) {
    note.innerHTML = '<b>KUPON KAYNAĞI: KARİYER / HAZIRLIK</b><span>Kupon yalnız Kariyer Yol Haritasındaki Kanıt sırasından oluşturulur.</span><small>5 Model kupon akışında kullanılmaz, aranmaz ve hesaplanmaz.</small>';
  }
  const button = $('buildAllBtn');
  if (button && !button.dataset.f626Busy) button.textContent = 'Kupon Oluştur';
  $('couponIstanbulCalibrationF37')?.remove();
}

function setStatus(text, kind = '') {
  const box = $('couponFusionStatusF6015');
  if (box) {
    box.textContent = text;
    box.style.color = kind === 'error' ? '#ff9cab' : kind === 'ok' ? '#7ee2a8' : '#dcefff';
  }
  const button = $('buildAllBtn');
  if (button) {
    button.dataset.f626Busy = kind === 'busy' ? '1' : '';
    button.textContent = text;
  }
}

async function hydrateCareerOnly() {
  const hydrate = window.ATCouponDailyArchiveV1691?.hydrateCurrent;
  if (typeof hydrate !== 'function') return null;
  return hydrate.call(window.ATCouponDailyArchiveV1691);
}

function audit() {
  try {
    return window.ATCouponCareerOnlyV1691F1?.audit?.() || { ready:false, issues:[] };
  } catch (error) {
    return { ready:false, issues:[{ id:'audit', detail:error?.message || String(error) }] };
  }
}

async function open() {
  setStatus('Kariyer/Hazırlık kayıtları denetleniyor…', 'busy');
  try {
    await hydrateCareerOnly();

    // F60.27: couponCenterDialog is a native <dialog> in the top layer.
    // The audit gate is a normal fixed section; if the dialog stays open,
    // the gate renders behind it and looks like nothing happened.
    const couponDialog = $('couponCenterDialog');
    if (couponDialog?.open) {
      try { couponDialog.close(); }
      catch {
        try { couponDialog.removeAttribute('open'); } catch {}
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    if (baseGateOpen) await baseGateOpen();
    else throw new Error('Kupon Veri Denetimi açılamadı.');
    patchUi();
    setStatus('Kariyer/Hazırlık veri denetimi hazır.', '');
  } catch (error) {
    console.error('[AT AI]', VERSION, 'audit open failed', error);
    setStatus(`Kupon denetimi açılamadı: ${error?.message || error}`, 'error');
  } finally {
    patchUi();
  }
}

function normalizeTickets(list) {
  return (Array.isArray(list) ? list : [])
    .filter(ticket => ticket?.available !== false && Array.isArray(ticket?.legs) && ticket.legs.length)
    .map(ticket => ({
      ...ticket,
      type:removeLegacyCopy(ticket.type),
      modelId:'career',
      modelLabel:'Kariyer/Hazırlık',
      careerCouponVersion:TICKET_VERSION,
      scoreVersion:VERSION,
      source:SOURCE,
      calibrationVariant:'NONE_CAREER_ONLY',
      archiveOnly:false,
      warnings:[
        'Kupon sırası yalnız Kariyer Yol Haritasındaki Kanıt sırasından alındı.',
        ...(Array.isArray(ticket?.warnings)
          ? ticket.warnings.filter(message => !/5 Model|kalibrasyonlu|kalibresiz/i.test(clean(message)))
          : [])
      ]
    }));
}

async function build() {
  if (busy) return [];
  busy = true;
  setStatus('Kariyer/Hazırlık kuponu oluşturuluyor…', 'busy');
  try {
    await hydrateCareerOnly();
    const check = audit();
    if (!check.ready) {
      await open();
      return [];
    }

    const st = currentState();
    if (!st) throw new Error('Kupon durumu okunamadı.');
    st.tickets = [];

    const careerBuilder = window.ATIstanbulOutcomeCalibrationV1691F37?.buildCareerOnly;
    if (typeof careerBuilder !== 'function') {
      throw new Error('Kariyer/Hazırlık kupon motoru bulunamadı.');
    }
    await careerBuilder();

    const tickets = normalizeTickets(st.tickets);
    if (!tickets.length) {
      throw new Error('Kariyer/Hazırlık sıralamasından kupon oluşturulamadı.');
    }

    st.tickets = tickets;
    st.analyses = st.analyses || {};
    st.analyses.ticketV11 = {
      version:TICKET_VERSION,
      scoreVersion:VERSION,
      source:SOURCE,
      fiveModelUsed:false,
      calibrated:false,
      variants:['CAREER_PREPARATION'],
      dailyArchiveFirst:true,
      date:st.date,
      city:st.city,
      generatedAt:new Date().toISOString(),
      raceNos:Array.isArray(check.raceNos) ? check.raceNos : []
    };

    try { if (typeof save === 'function') save(); } catch {}
    if (typeof renderTicketsV11 === 'function') renderTicketsV11();
    else if (typeof renderTickets === 'function') renderTickets();

    patchUi();
    setStatus('Kupon hazır · Kariyer/Hazırlık sıralaması kullanıldı.', 'ok');
    setTimeout(() => {
      try { $('cdgCloseV1671')?.click(); } catch {}
      try { $('tickets')?.scrollIntoView?.({ behavior:'smooth', block:'start' }); } catch {}
    }, 220);
    return tickets;
  } catch (error) {
    console.error('[AT AI]', VERSION, 'coupon build failed', error);
    setStatus(`Kupon oluşturulamadı: ${error?.message || error}`, 'error');
    try { alert(`Kupon oluşturulamadı: ${error?.message || error}`); } catch {}
    return [];
  } finally {
    busy = false;
    setTimeout(patchUi, 0);
  }
}

function route(event) {
  const target = event?.target?.closest?.('#buildAllBtn,#careerOnlyBuildV1691F1');
  if (!target) return;
  if (target.id === 'buildAllBtn') void open();
  else void build();
}

try { buildTicketsV11 = open; } catch {}
try { buildTickets = open; } catch {}

if (window.ATCouponDecisionV1671) {
  window.ATCouponDecisionV1671.open = open;
}
if (window.ATCouponCareerOnlyV1691F1) {
  window.ATCouponCareerOnlyV1691F1.buildCareerTickets = build;
}
if (window.ATCouponHybridV1691F8) {
  window.ATCouponHybridV1691F8.build = build;
}

window.ATCouponCareerOnlyFinalV627 = {
  version:VERSION,
  source:SOURCE,
  open,
  build,
  route,
  audit,
  mode:'CAREER_ONLY_NO_FIVE_MODEL'
};

// F60.27: capture before legacy target-level handlers.
// This guarantees that the visible audit gate's "Kuponu Oluştur" button
// uses the Career-only builder and that the main button opens the audit page.
document.addEventListener('click', event => {
  const target = event?.target?.closest?.('#buildAllBtn,#careerOnlyBuildV1691F1');
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (target.id === 'buildAllBtn') void open();
  else void build();
}, true);

patchUi();
console.info('[AT AI]', VERSION, 'active - coupon uses Career/Preparation only; Five Model coupon path disabled.');
})();
