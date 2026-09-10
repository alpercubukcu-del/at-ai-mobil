/* AT AI Mobil - V16.9.1F60.50 Career run bridge
   - Keeps the F31 Career scoring engine untouched.
   - If the Career button path returns to an empty/stale screen, starts the
     selected race/all-races calculation directly through runCareerAnalysis.
*/
(() => {
'use strict';
if (window.__AT_CAREER_ALL_RECOMPUTE_BRIDGE_V1691F650__) return;
window.__AT_CAREER_ALL_RECOMPUTE_BRIDGE_V1691F650__ = true;

const VERSION = 'CAREER-ALL-RECOMPUTE-BRIDGE-V16.9.1F60.50';
let fallbackBusy = false;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const finite = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Number(v);
const esc = v => {
  try { return typeof escapeHtml === 'function' ? escapeHtml(v) : clean(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  catch { return clean(v); }
};
const nextFrame = () => new Promise(resolve => {
  try {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
  } catch {}
  setTimeout(resolve, 0);
});

function currentState() {
  try { return state || window.state || {}; } catch { return window.state || {}; }
}

function contentEl() {
  try { return document.getElementById('analysisContent'); } catch { return null; }
}

function isCareerView() {
  try { return document.getElementById('analysisDialog')?.dataset?.view === 'career'; }
  catch { return false; }
}

function selectedValue() {
  try { return clean(document.getElementById('analysisRace')?.value || currentState()?.selectedRace || 'all') || 'all'; }
  catch { return 'all'; }
}

function programRaces() {
  const races = currentState()?.races;
  return Array.isArray(races) ? races : [];
}

function wantedNos(value = selectedValue()) {
  const races = programRaces();
  if (value === 'all') return races.map(r => String(r?.no)).filter(Boolean);
  return [String(value)].filter(Boolean);
}

function racesFor(value = selectedValue()) {
  const races = programRaces();
  if (value === 'all') return races;
  return races.filter(r => String(r?.no) === String(value));
}

function itemScore(item) {
  const sim = item?.galibiyetBenzerligi || {};
  const candidates = [
    sim.rankingRawScore,
    sim.score,
    sim.evidenceScore,
    sim.finalScore,
    sim.displayScore,
    sim?.strongest?.rankingRawScore,
    sim?.strongest?.score
  ];
  for (const value of candidates) {
    const n = finite(value);
    if (n !== null) return n;
  }
  return null;
}

function raceHasEvidence(race) {
  const horses = Array.isArray(race?.horses) ? race.horses : [];
  return horses.some(item => itemScore(item) !== null);
}

function validCareerEnvelope(career) {
  const st = currentState();
  if (!career || clean(career?.date) !== clean(st?.date) || clean(career?.city) !== clean(st?.city)) return false;
  if (!Array.isArray(career?.races) || !career.races.length) return false;
  try {
    if (typeof isValidCareerCache === 'function' && !isValidCareerCache(career)) return false;
  } catch {}
  return true;
}

function hasSelectionRows(career, value = selectedValue()) {
  if (!validCareerEnvelope(career)) return false;
  const map = new Map(career.races.map(r => [String(r?.no), r]));
  const nos = wantedNos(value);
  return Boolean(nos.length && nos.every(no => Array.isArray(map.get(no)?.horses) && map.get(no).horses.length));
}

function hasSelectionEvidence(career, value = selectedValue()) {
  if (!validCareerEnvelope(career)) return false;
  const map = new Map(career.races.map(r => [String(r?.no), r]));
  const nos = wantedNos(value);
  return Boolean(nos.length && nos.every(no => raceHasEvidence(map.get(no))));
}

function careerSignature(career) {
  if (!career) return '';
  try {
    const races = Array.isArray(career.races) ? career.races : [];
    const scoreCount = races.reduce((sum, race) => sum + (raceHasEvidence(race) ? 1 : 0), 0);
    return [career.generatedAt, career.fastProgressVersion, career.calculatedRace, races.length, scoreCount].map(clean).join('|');
  } catch {
    return String(career);
  }
}

function clearSelectedCareer(value) {
  const st = currentState();
  try {
    st.analyses = st.analyses || {};
    if (value === 'all') {
      st.analyses.career = {};
    } else {
      const old = st.analyses.career;
      if (Array.isArray(old?.races)) {
        old.races = old.races.filter(r => String(r?.no) !== String(value));
        if (!old.races.length) st.analyses.career = {};
      } else {
        st.analyses.career = {};
      }
    }
    st.selectedRace = value;
    st.careerAllRecomputeBridgeVersion = VERSION;
    if (typeof careerModelCacheV112 !== 'undefined') {
      if (value === 'all' && careerModelCacheV112?.clear) careerModelCacheV112.clear();
      else if (careerModelCacheV112?.delete) careerModelCacheV112.delete([st.date, st.city, value].join('|'));
    }
    window.ATFiveModelSharedCacheV1685?.clear?.();
    window.ATFiveModelSharedCacheV1687?.clear?.();
    if (typeof save === 'function') save();
  } catch {}
}

function showStarting(value) {
  const content = contentEl();
  if (!content) return;
  const count = racesFor(value).length;
  content.classList.remove('empty');
  content.innerHTML = `
    <div style="padding:15px;line-height:1.55;">
      <div style="font-size:18px;font-weight:800;margin-bottom:10px;">Kariyer hesaplama başlatılıyor...</div>
      <div>${value === 'all' ? `${count} koşu sıraya alındı.` : `${esc(value)}. koşu yeniden hesaplanıyor.`}</div>
      <div style="margin-top:10px;font-size:11px;opacity:.7;">${VERSION}: boş veya eski arşiv ekranı bekletmeden F31 kariyer motoruna bağlandı.</div>
    </div>
  `;
}

function insertNoEvidenceNotice(value) {
  const content = contentEl();
  if (!content || content.querySelector('[data-career-bridge-no-evidence]')) return;
  content.classList.remove('empty');
  const label = value === 'all' ? 'seçili koşularda' : `${esc(value)}. koşuda`;
  content.insertAdjacentHTML('afterbegin', `
    <div data-career-bridge-no-evidence style="margin:0 0 10px;padding:10px 12px;border:1px solid rgba(255,183,77,.4);border-radius:10px;background:rgba(255,183,77,.10);line-height:1.45;">
      <b>Kariyer hesabı çalıştı ancak ${label} kupon için geçerli Kariyer Kanıtı puanı oluşmadı.</b><br>
      Yıllık/TJK referans verisi alınamadığında günlük arşive geçerli kayıt yazılmaz; veri hazırlandıktan sonra aynı buton yeniden hesaplar.
    </div>
  `);
}

function showFailure(error) {
  const content = contentEl();
  if (content) {
    content.classList.remove('empty');
    content.innerHTML = `
      <div style="padding:15px;line-height:1.55;">
        <b>Kariyer hesaplama başlatılamadı.</b><br>
        ${esc(error?.message || error || 'Bilinmeyen hata')}
      </div>
    `;
  }
  try { if (typeof status === 'function') status('Kariyer hesaplama başlatılamadı.'); } catch {}
}

async function directRun(value = selectedValue(), reason = 'fallback') {
  if (fallbackBusy) return currentState()?.analyses?.career || null;
  if (typeof runCareerAnalysis !== 'function') return null;
  const races = racesFor(value);
  if (!races.length) return null;
  fallbackBusy = true;
  try {
    clearSelectedCareer(value);
    showStarting(value);
    await nextFrame();
    const result = await runCareerAnalysis(races, value);
    await nextFrame();
    const career = currentState()?.analyses?.career || result || null;
    if (!hasSelectionEvidence(career, value) && hasSelectionRows(career, value)) insertNoEvidenceNotice(value);
    try { if (typeof status === 'function') status(`${value === 'all' ? 'Tüm koşular' : value + '. koşu'} kariyer hesabı çalıştırıldı.`); } catch {}
    return career;
  } finally {
    fallbackBusy = false;
    try { window.__AT_CAREER_ALL_RECOMPUTE_BRIDGE_LAST__ = { version:VERSION, value, reason, at:new Date().toISOString() }; } catch {}
  }
}

if (typeof runAnalysis === 'function') {
  const baseRunAnalysis = runAnalysis;
  runAnalysis = async function(...args) {
    const userEvent = Boolean(args[0] && typeof args[0].preventDefault === 'function');
    if (!isCareerView()) return baseRunAnalysis.apply(this, args);
    const value = selectedValue();
    const before = currentState()?.analyses?.career;
    const beforeSignature = careerSignature(before);
    try {
      const out = await baseRunAnalysis.apply(this, args);
      await nextFrame();
      const after = currentState()?.analyses?.career;
      if (hasSelectionEvidence(after, value)) return out;
      const changed = after && (after !== before || careerSignature(after) !== beforeSignature);
      if (changed && hasSelectionRows(after, value)) {
        insertNoEvidenceNotice(value);
        return out;
      }
      const fallback = await directRun(value, 'runAnalysis-empty-or-stale');
      return fallback || out;
    } catch (error) {
      showFailure(error);
      if (!userEvent) throw error;
      return null;
    }
  };
}

function bindButton() {
  try {
    const btn = document.getElementById('runAnalysis');
    if (btn) btn.onclick = runAnalysis;
  } catch {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindButton, { once:true });
else bindButton();
window.addEventListener('pageshow', bindButton, { passive:true });

window.ATCareerAllRecomputeBridgeV1691F650 = {
  version:VERSION,
  run:directRun,
  hasSelectionEvidence:() => hasSelectionEvidence(currentState()?.analyses?.career, selectedValue())
};

console.info('[AT AI]', VERSION, 'active - Career buttons recover empty/stale all-race runs without changing scoring rules.');
})();
