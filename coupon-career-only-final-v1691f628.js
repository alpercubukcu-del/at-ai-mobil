/* AT AI Mobil - V16.9.1F60.28 direct Career coupon build
   - Main "Kupon Oluştur" button creates the ticket directly.
   - Career/Preparation hydration and audit are advisory, not a dead-end gate.
   - Ticket ranking remains Career Roadmap raw evidence order from F60.23.
   - Five Model coupon path stays disabled.
*/
(() => {
'use strict';
if (window.__AT_COUPON_CAREER_ONLY_DIRECT_V1691F628__) return;
window.__AT_COUPON_CAREER_ONLY_DIRECT_V1691F628__ = true;

const VERSION = 'COUPON-CAREER-ONLY-DIRECT-V16.9.1F60.28';
const SOURCE = 'CAREER_ROADMAP_EVIDENCE_TRUE_DEBUT_CURRENT_F6030';
const TICKET_VERSION = 'CAREER-COUPON-V16.9.1F60.28-CAREER-ONLY';
let busy = false;

const $ = id => document.getElementById(id);
const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

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
    note.innerHTML = '<b>KUPON KAYNAĞI: KARİYER / HAZIRLIK</b><span>Kariyeri olan at = Kariyer Yol Haritası Kanıt sırası. Gerçek debut = Güncel Analiz puanı.</span><small>5 Model kupon akışında kullanılmaz.</small>';
  }
  const button = $('buildAllBtn');
  if (button && !busy) button.textContent = 'Kupon Oluştur';
  $('couponIstanbulCalibrationF37')?.remove();
}

function setStatus(text, kind = '') {
  const box = $('couponFusionStatusF6015');
  if (box) {
    box.textContent = text;
    box.style.color = kind === 'error' ? '#ff9cab' : kind === 'ok' ? '#7ee2a8' : '#dcefff';
    box.style.display = '';
  }
  const button = $('buildAllBtn');
  if (button) {
    if (kind === 'busy') button.textContent = 'Kariyer/Hazırlık kuponu oluşturuluyor…';
    else if (kind === 'error') button.textContent = 'Tekrar Dene';
    else if (kind === 'ok') button.textContent = 'Kupon Hazır';
    else button.textContent = text || 'Kupon Oluştur';
  }
}

async function hydrateCareerOnly() {
  const hydrate = window.ATCouponDailyArchiveV1691?.hydrateCurrent;
  if (typeof hydrate !== 'function') return { skipped:true };
  return hydrate.call(window.ATCouponDailyArchiveV1691);
}

function audit() {
  try {
    return window.ATCouponCareerOnlyV1691F1?.audit?.() || { ready:false, issues:[] };
  } catch (error) {
    return { ready:false, issues:[{ id:'audit', detail:error?.message || String(error) }] };
  }
}

function auditIssueText(check) {
  const issues = Array.isArray(check?.issues) ? check.issues : [];
  return issues
    .map(item => clean(item?.detail || item?.message || item?.label || item?.id || item))
    .filter(Boolean)
    .slice(0, 4)
    .join(' · ');
}

function normalizeTickets(list, check) {
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
      auditReady:check?.ready === true,
      warnings:[
        'Kariyeri olan atlar Kariyer Yol Haritası Kanıt sırasından; doğrulanmış gerçek debut atlar Güncel Analiz puanından alındı.',
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

  let hydrateError = '';
  try {
    try {
      await hydrateCareerOnly();
    } catch (error) {
      hydrateError = clean(error?.message || error);
      console.warn('[AT AI]', VERSION, 'career hydrate warning', error);
    }

    const check = audit();
    const st = currentState();
    if (!st) throw new Error('Kupon durumu okunamadı.');

    st.tickets = [];

    const careerBuilder = window.ATIstanbulOutcomeCalibrationV1691F37?.buildCareerOnly;
    if (typeof careerBuilder !== 'function') {
      throw new Error('Kariyer/Hazırlık kupon motoru bulunamadı.');
    }

    // F60.28: audit is informative only. Always attempt the Career builder.
    await careerBuilder();

    const tickets = normalizeTickets(st.tickets, check);
    if (!tickets.length) {
      const details = [auditIssueText(check), hydrateError].filter(Boolean).join(' · ');
      throw new Error(details
        ? 'Kariyer/Hazırlık sıralamasından kupon oluşturulamadı. ' + details
        : 'Kariyer/Hazırlık sıralamasından kupon oluşturulamadı.');
    }

    st.tickets = tickets;
    st.analyses = st.analyses || {};
    st.analyses.ticketV11 = {
      version:TICKET_VERSION,
      scoreVersion:VERSION,
      source:SOURCE,
      fiveModelUsed:false,
      calibrated:false,
      trueDebutRule:'VERIFIED_ZERO_PREVIOUS_RACES_USES_CURRENT_ANALYSIS_F6030',
      variants:['CAREER_PREPARATION'],
      dailyArchiveFirst:true,
      auditReady:check?.ready === true,
      auditIssues:Array.isArray(check?.issues) ? check.issues : [],
      date:st.date,
      city:st.city,
      generatedAt:new Date().toISOString(),
      raceNos:Array.isArray(check?.raceNos) ? check.raceNos : []
    };

    try { if (typeof save === 'function') save(); } catch {}
    if (typeof renderTicketsV11 === 'function') renderTicketsV11();
    else if (typeof renderTickets === 'function') renderTickets();

    setStatus('Kupon hazır · Kariyer/Hazırlık sıralaması kullanıldı.', 'ok');

    const couponDialog = $('couponCenterDialog');
    setTimeout(() => {
      try {
        if (couponDialog?.open && typeof couponDialog.close === 'function') couponDialog.close();
      } catch {}
      try { $('tickets')?.scrollIntoView?.({ behavior:'smooth', block:'start' }); } catch {}
    }, 180);

    return tickets;
  } catch (error) {
    const message = clean(error?.message || error) || 'Bilinmeyen kupon hatası.';
    console.error('[AT AI]', VERSION, 'coupon build failed', error);
    setStatus('Kupon oluşturulamadı: ' + message, 'error');
    try { alert('Kupon oluşturulamadı: ' + message); } catch {}
    return [];
  } finally {
    busy = false;
  }
}

function route(event) {
  const target = event?.target?.closest?.('#buildAllBtn,#careerOnlyBuildV1691F1');
  if (!target) return;
  const five = window.ATCouponFiveModelCalibratedV631?.buildAll;
  if (typeof five === 'function') void five();
  else void build();
}

try { buildTicketsV11 = build; } catch {}
try { buildTickets = build; } catch {}

if (window.ATCouponCareerOnlyV1691F1) {
  window.ATCouponCareerOnlyV1691F1.buildCareerTickets = build;
}
if (window.ATCouponHybridV1691F8) {
  window.ATCouponHybridV1691F8.build = build;
}

window.ATCouponCareerOnlyFinalV628 = {
  version:VERSION,
  source:SOURCE,
  build,
  open:build,
  route,
  audit,
  mode:'CAREER_ONLY_DIRECT_NO_FIVE_MODEL'
};

// Capture before legacy target handlers so the visible button always builds directly.
document.addEventListener('click', event => {
  const target = event?.target?.closest?.('#buildAllBtn,#careerOnlyBuildV1691F1');
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const five = window.ATCouponFiveModelCalibratedV631?.buildAll;
  if (typeof five === 'function') void five();
  else void build();
}, true);

patchUi();
console.info('[AT AI]', VERSION, 'active - direct Career/Preparation coupon build; Five Model coupon path disabled.');
})();
