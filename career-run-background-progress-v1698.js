/* AT AI Mobil — V16.9.8 Ana Kariyer Arka Planı + İlerleme
   - Ana Kariyer Yol Haritası hesabında Kör Test biçiminde yaklaşık yüzde,
     aktif aşama ve geçen süre gösterir.
   - Hesap sürerken kullanıcı dialogu kapatıp menüye dönebilir; iş kesilmez.
   - Tek işlem korumasını ve mevcut puanlama/sıralama formüllerini değiştirmez.
*/
(() => {
'use strict';
if (window.__AT_CAREER_RUN_BACKGROUND_PROGRESS_V1698__) return;
window.__AT_CAREER_RUN_BACKGROUND_PROGRESS_V1698__ = true;

const VERSION = 'CAREER-RUN-BACKGROUND-PROGRESS-V16.9.8';
let activeJob = null;
let toastTimer = null;

function ensureStyle() {
  if (document.getElementById('careerRunProgressStyleV1698')) return;
  const style = document.createElement('style');
  style.id = 'careerRunProgressStyleV1698';
  style.textContent = `
    #analysisDialog #closeDialog{min-width:46px!important;min-height:46px!important;z-index:80!important;pointer-events:auto!important;touch-action:manipulation!important}
    .career-run-progress-v1698{position:sticky;top:0;z-index:70;margin:8px 10px 10px;padding:11px;border:1px solid rgba(96,183,255,.28);border-radius:13px;background:rgba(4,15,27,.97);box-shadow:0 8px 24px rgba(0,0,0,.24)}
    .career-run-head-v1698{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px}
    .career-run-head-v1698 b{font-size:14px}.career-run-percent-v1698{font-size:19px;font-weight:900;color:#8fd3ff}
    .career-run-track-v1698{height:9px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08)}
    .career-run-fill-v1698{display:block;height:100%;width:5%;border-radius:999px;background:linear-gradient(90deg,#32b5ff,#5977ff);transition:width .7s ease}
    .career-run-phase-v1698{margin-top:8px;font-size:12px;color:#d4e7f8;font-weight:750;line-height:1.35}
    .career-run-foot-v1698{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:5px;font-size:11px;color:#93aac0}
    .career-run-progress-v1698 button{width:100%;min-height:46px;margin-top:10px;position:relative;z-index:72;pointer-events:auto!important;touch-action:manipulation!important}
    .career-run-toast-v1698{position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483647;padding:11px 13px;border-radius:12px;background:#0b2033;border:1px solid rgba(96,183,255,.32);box-shadow:0 10px 30px rgba(0,0,0,.38);color:#d9edff;font-size:12px;font-weight:750;text-align:center;pointer-events:none}
    .career-run-progress-v1698.is-done .career-run-percent-v1698{color:#8ae6ad}
    .career-run-progress-v1698.is-done .career-run-fill-v1698{background:#4cc97d}
    .career-run-progress-v1698.is-error .career-run-percent-v1698{color:#ffd0d7}
    .career-run-progress-v1698.is-error .career-run-fill-v1698{background:#dc6175}
    @media(max-width:700px){.career-run-progress-v1698{margin:7px 2px 9px}.career-run-phase-v1698{font-size:11px}}
  `;
  document.head.appendChild(style);
}

function estimate(ms) {
  const sec = ms / 1000;
  const spans = [
    [0,2,5,11,'Analiz işi ve önbellek kontrolü hazırlanıyor'],
    [2,10,11,31,'Güncel atların kariyerleri alınıyor'],
    [10,24,31,57,'Galibiyet ve ilk-5 yolları ayrıştırılıyor'],
    [24,42,57,78,'Kariyer yolları karşılaştırılıyor'],
    [42,65,78,92,'Puanlar ve sıralama hazırlanıyor'],
    [65,99999,95,95,'Son yanıt bekleniyor; uygulama kullanılabilir']
  ];
  for (const [a,b,p0,p1,label] of spans) {
    if (sec >= a && sec < b) {
      const ratio = b > 90000 ? 0 : Math.max(0, Math.min(1, (sec-a)/(b-a)));
      return { pct:Math.round(p0+(p1-p0)*ratio), label };
    }
  }
  return { pct:95, label:'Son yanıt bekleniyor; uygulama kullanılabilir' };
}

function panelHtml() {
  return `<section class="career-run-progress-v1698" role="status" aria-live="polite">
    <div class="career-run-head-v1698"><b>Kariyer analizi çalışıyor</b><span class="career-run-percent-v1698">5%</span></div>
    <div class="career-run-track-v1698"><i class="career-run-fill-v1698"></i></div>
    <div class="career-run-phase-v1698">Analiz işi ve önbellek kontrolü hazırlanıyor</div>
    <div class="career-run-foot-v1698"><span>Yaklaşık ilerleme · tek işlem koruması aktif</span><span class="career-run-time-v1698">0 sn</span></div>
    <button type="button" class="secondary" data-career-background-v1698>Arka planda sürdür ve menüye dön</button>
  </section>`;
}

function showToast(text, holdMs = 3200) {
  let toast = document.getElementById('careerRunToastV1698');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'careerRunToastV1698';
    toast.className = 'career-run-toast-v1698';
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast?.remove(), holdMs);
}

function closeToBackground() {
  const dialog = document.getElementById('analysisDialog');
  try { if (dialog?.open) dialog.close(); } catch {}
  try { window.ATFiveModelRepairV1697?.repair?.(); } catch {}
  showToast('Kariyer analizi arka planda sürüyor. Menü ve diğer sayfaları kullanabilirsiniz.');
}

function ensurePanel(job) {
  const dialog = document.getElementById('analysisDialog');
  const toolbar = dialog?.querySelector('.toolbar');
  if (!dialog || !toolbar) return null;
  let panel = dialog.querySelector('.career-run-progress-v1698');
  if (!panel) {
    toolbar.insertAdjacentHTML('afterend', panelHtml());
    panel = dialog.querySelector('.career-run-progress-v1698');
    panel?.querySelector('[data-career-background-v1698]')?.addEventListener('click', closeToBackground);
  }
  if (job) job.panel = panel;
  return panel;
}

function actualPhase() {
  const content = document.getElementById('analysisContent');
  const text = String(content?.innerText || content?.textContent || '').replace(/\s+/g,' ').trim();
  if (!text || text.length > 260 || /henuz bu oturumda hesaplanmadi/i.test(text)) return '';
  if (/Tam\/kısmi geçmiş|güncel at|kariyer|galibiyet|ilk-5|hazırl/i.test(text)) return text.slice(0,150);
  return '';
}

function update(job) {
  if (!job || job.done) return;
  const panel = ensurePanel(job);
  if (!panel) return;
  const elapsed = Date.now() - job.startedAt;
  const step = estimate(elapsed);
  const pct = panel.querySelector('.career-run-percent-v1698');
  const fill = panel.querySelector('.career-run-fill-v1698');
  const phase = panel.querySelector('.career-run-phase-v1698');
  const time = panel.querySelector('.career-run-time-v1698');
  if (pct) pct.textContent = `${step.pct}%`;
  if (fill) fill.style.width = `${step.pct}%`;
  if (phase) phase.textContent = actualPhase() || step.label;
  if (time) time.textContent = `${Math.floor(elapsed/1000)} sn`;
}

function finish(job, error) {
  if (!job) return;
  job.done = true;
  if (job.timer) clearInterval(job.timer);
  const elapsedSec = Math.max(0, Math.round((Date.now()-job.startedAt)/1000));
  const panel = ensurePanel(job);
  if (panel) {
    panel.classList.toggle('is-error', Boolean(error));
    panel.classList.toggle('is-done', !error);
    const pct = panel.querySelector('.career-run-percent-v1698');
    const fill = panel.querySelector('.career-run-fill-v1698');
    const phase = panel.querySelector('.career-run-phase-v1698');
    const time = panel.querySelector('.career-run-time-v1698');
    const button = panel.querySelector('[data-career-background-v1698]');
    if (pct) pct.textContent = error ? 'Hata' : '100%';
    if (fill) fill.style.width = '100%';
    if (phase) phase.textContent = error ? (error?.message || 'Kariyer analizi tamamlanamadı.') : 'Kariyer analizi hazır';
    if (time) time.textContent = `${elapsedSec} sn`;
    if (button) button.remove();
    setTimeout(() => panel.remove(), error ? 6500 : 2800);
  }
  showToast(error ? `Kariyer analizi tamamlanamadı: ${error?.message || 'Bilinmeyen hata'}` : `Kariyer analizi hazır · ${elapsedSec} sn`);
}

ensureStyle();
const runAnalysisBeforeV1698 = typeof runAnalysis === 'function' ? runAnalysis : null;
if (runAnalysisBeforeV1698) {
  runAnalysis = async function(...args) {
    const dialog = document.getElementById('analysisDialog');
    if (dialog?.dataset?.view !== 'career') return runAnalysisBeforeV1698.apply(this,args);
    if (activeJob && !activeJob.done) {
      ensurePanel(activeJob);
      return activeJob.promise;
    }
    const job = { startedAt:Date.now(), timer:null, panel:null, done:false, promise:null };
    activeJob = job;
    ensurePanel(job);
    update(job);
    job.timer = setInterval(() => update(job), 750);
    const promise = Promise.resolve().then(() => runAnalysisBeforeV1698.apply(this,args));
    job.promise = promise;
    try {
      const out = await promise;
      finish(job, null);
      return out;
    } catch (error) {
      finish(job, error);
      throw error;
    } finally {
      if (activeJob === job) activeJob = null;
    }
  };
  const runButton = document.getElementById('runAnalysis');
  if (runButton) runButton.onclick = runAnalysis;
} else {
  console.warn('[AT AI]', VERSION, 'runAnalysis bulunamadı.');
}

const dialog = document.getElementById('analysisDialog');
if (dialog) {
  new MutationObserver(() => {
    if (dialog.open && dialog.dataset.view === 'career' && activeJob && !activeJob.done) {
      ensurePanel(activeJob);
      update(activeJob);
    }
  }).observe(dialog, { attributes:true, attributeFilter:['open','data-view'] });
}

window.ATCareerRunProgressV1698 = {
  VERSION,
  active:() => Boolean(activeJob && !activeJob.done),
  stats:() => activeJob ? { active:!activeJob.done, elapsedMs:Date.now()-activeJob.startedAt } : { active:false }
};
console.info('[AT AI]', VERSION, 'aktif — ana Kariyer yüzde/aşama/süre + arka planda menüye dönüş');
})();
