/* AT AI Mobil — V14.7.1 PDF blank-render fix
   - V14.7 raporunu veri/formül değiştirmeden düzeltir.
   - html2pdf'e ekran dışındaki taşıyıcı yerine gerçek PDF kökünü verir.
   - Render sırasında kökü görünür koordinata taşır; kullanıcıya kısa hazırlanıyor katmanı gösterir.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CAREER_PDF_V1471_FIX__) return;
window.__AT_DAILY_CAREER_PDF_V1471_FIX__ = true;

const VERSION = 'DAILY-CAREER-PDF-V14.7.1-FIX';
let libPromise = null;

function clean(v) { return String(v ?? '').replace(/\s+/g, ' ').trim(); }

function ensureHtml2Pdf() {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => String(s.src || '').includes('html2pdf.bundle.min.js'));
    if (existing) {
      const wait = () => window.html2pdf ? resolve(window.html2pdf) : setTimeout(wait, 50);
      wait();
      setTimeout(() => { if (!window.html2pdf) reject(new Error('PDF kitaplığı yüklenemedi.')); }, 12000);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
    s.onload = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('PDF kitaplığı başlatılamadı.'));
    s.onerror = () => reject(new Error('PDF kitaplığı yüklenemedi.'));
    document.head.appendChild(s);
  });
  return libPromise;
}

function createBusyOverlay() {
  const old = document.getElementById('careerPdfBusyV1471');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'careerPdfBusyV1471';
  el.innerHTML = '<div><b>PDF hazırlanıyor…</b><small>Arşivdeki sıralamalar sayfalara aktarılıyor.</small></div>';
  Object.assign(el.style, {
    position:'fixed', inset:'0', zIndex:'2147483647',
    display:'grid', placeItems:'center', background:'rgba(8,21,34,.97)',
    color:'#eef7ff', fontFamily:'Arial,sans-serif', textAlign:'center', padding:'24px'
  });
  const box = el.firstElementChild;
  if (box) Object.assign(box.style, {padding:'18px 22px',border:'1px solid rgba(126,226,168,.32)',borderRadius:'14px',background:'#10253a'});
  const small = el.querySelector('small');
  if (small) Object.assign(small.style, {display:'block',marginTop:'6px',opacity:'.72',fontSize:'11px'});
  document.body.appendChild(el);
  return el;
}

async function runWithFixedRenderer(job) {
  const real = await ensureHtml2Pdf();
  if (typeof real !== 'function') throw new Error('PDF motoru kullanılamıyor.');
  const overlay = createBusyOverlay();

  const proxy = function(...args) {
    const worker = real(...args);
    if (!worker || typeof worker.from !== 'function') return worker;
    const originalFrom = worker.from;
    worker.from = function(source, ...rest) {
      let src = source;
      let host = null;
      try {
        if (source?.id === 'careerArchivePdfRootV147') {
          src = source;
          host = source.parentElement;
        } else if (source?.querySelector) {
          const root = source.querySelector('#careerArchivePdfRootV147');
          if (root) {
            src = root;
            host = source;
          }
        }
        if (host) {
          Object.assign(host.style, {
            position:'absolute', left:'0px', top:'0px', width:'794px',
            display:'block', visibility:'visible', background:'#ffffff',
            zIndex:'2147483000', margin:'0', padding:'0'
          });
        }
        if (src?.style) {
          src.style.background = '#ffffff';
          src.style.visibility = 'visible';
          src.style.display = 'block';
        }
      } catch (e) {
        console.warn('[AT AI] PDF kökü hazırlama uyarısı:', e);
      }
      return originalFrom.call(this, src, ...rest);
    };
    return worker;
  };

  try {
    Object.assign(proxy, real);
  } catch {}

  window.html2pdf = proxy;
  try {
    return await job();
  } finally {
    if (window.html2pdf === proxy) window.html2pdf = real;
    overlay.remove();
  }
}

function currentDate() {
  try {
    if (typeof state !== 'undefined' && state?.date) return clean(state.date);
  } catch {}
  return clean(document.getElementById('raceDate')?.value);
}

async function fixedExport(target) {
  const api = window.ATDailyCareerPdfV147;
  if (!api) throw new Error('V14.7 PDF katmanı bulunamadı.');
  return runWithFixedRenderer(async () => {
    if (target?.matches?.('[data-pdf]')) return api.exportOne(target.dataset.pdf);
    return api.exportDay(currentDate());
  });
}

/* Window capture, document'taki V14.7 listener'ından önce çalışır. */
window.addEventListener('click', event => {
  const target = event.target?.closest?.('#careerArchivePdfV146,#careerArchiveDayPdfV146,[data-pdf]');
  if (!target) return;
  if (target.matches('[data-pdf]') && !target.closest?.('#careerArchiveDialogV146')) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  fixedExport(target).catch(e => {
    console.error('[AT AI] V14.7.1 PDF:', e);
    alert(e?.message || 'PDF hazırlanamadı.');
  });
}, true);

window.ATDailyCareerPdfV1471Fix = { version:VERSION, exportDay:() => runWithFixedRenderer(() => window.ATDailyCareerPdfV147?.exportDay(currentDate())) };
console.info('[AT AI]', VERSION, 'aktif — boş PDF render düzeltmesi');
})();
