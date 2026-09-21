/* AT AI Mobil — F60.94.31.38 Menu 7 F60.94.31.18 restore + Koşu Sorgulama source
   Amaç:
   - 7. menünün F60.94.31.18'deki Günlük Veri Arşivi + TJK Yıllık Arşivi görünümünü korumak.
   - Yıllık arşiv indirme kaynağını TJK yıllık program sayfasından ayırmak.
   - Seçili yılları TJK Koşu Sorgulama listesinden indirip aynı at_ai_tjk_annual_archive_v13 veritabanına yazmak.
   - Kariyer/5 Model tarafının mevcut arşiv DB okuma yolunu değiştirmemek.
*/
(() => {
'use strict';
if (window.__AT_MENU7_F18_QUERY_BRIDGE_F60943138__) return;
window.__AT_MENU7_F18_QUERY_BRIDGE_F60943138__ = true;

const VERSION = 'F60.94.31.38 · MENU7-F18-QUERY';
const DB_NAME = 'at_ai_tjk_annual_archive_v13';
const META_STORE = 'meta';
const PROGRESS_KEY = 'at_ai_menu7_f18_query_progress_v1';
let running = false;
let stopRequested = false;

const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const fold = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function dialog() { return document.getElementById('tjkAnnualArchiveDialog'); }
function menuButton() { return document.getElementById('annualArchiveBtn'); }
function headingText(el) { return fold(el?.textContent || ''); }

function findSectionByHeading(token) {
  const d = dialog(); if (!d) return null;
  const wanted = fold(token);
  const h = [...d.querySelectorAll('h2,h3,h4')].find(x => headingText(x).includes(wanted));
  return h?.closest('.aa-section,section,div') || null;
}

function normalizeUi() {
  const b = menuButton();
  if (b) b.textContent = '7. Yıllık Yarış Arşivi';
  const d = dialog(); if (!d) return;
  const eye = d.querySelector('.aa-eyebrow');
  if (eye) eye.textContent = 'AT AI SYSTEM · TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.1-TOP3-YEARBEST';
  const h2 = d.querySelector('.aa-head h2, h2');
  if (h2) h2.textContent = 'Günlük Veri Arşivi ve TJK Yıllık Arşivi';
}

function topYearSection() {
  return findSectionByHeading('Yıllık Arşiv Yönetimi') || findSectionByHeading('Yıllık katalog yönetimi') || dialog()?.querySelector('.aa-section') || null;
}

function labeledSelect(section, labelToken) {
  if (!section) return null;
  const wanted = fold(labelToken);
  for (const label of section.querySelectorAll('label')) {
    if (headingText(label).includes(wanted)) {
      const s = label.querySelector('select');
      if (s) return s;
    }
  }
  return null;
}

function readYearRange() {
  const section = topYearSection();
  let from = Number(labeledSelect(section, 'Başlangıç yılı')?.value || 0);
  let to = Number(labeledSelect(section, 'Bitiş yılı')?.value || 0);
  if (!from || !to) {
    const selects = [...(section?.querySelectorAll('select') || [])].map(x => Number(x.value || 0)).filter(Number.isFinite).filter(Boolean);
    if (!from) from = selects[0] || 0;
    if (!to) to = selects[1] || from;
  }
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

function setTopStatus(text) {
  const section = topYearSection();
  const candidates = [
    section?.querySelector('#aaUpdateStatus'),
    section?.querySelector('.aa-status'),
    document.getElementById('aaUpdateStatus')
  ].filter(Boolean);
  if (candidates[0]) candidates[0].textContent = text;
}

function setButtonsBusy(busy) {
  const section = topYearSection(); if (!section) return;
  for (const b of section.querySelectorAll('button')) {
    const t = fold(b.textContent);
    if (t.includes('SECILI YILLARI SIRAYLA INDIR') || t === 'DEVAM ET') b.disabled = Boolean(busy);
    if (t === 'DURDUR') b.disabled = !busy;
  }
}

function saveProgress(value) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(value)); } catch {}
}
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); } catch { return null; }
}
function clearProgress() { try { localStorage.removeItem(PROGRESS_KEY); } catch {} }

function openDbExisting() {
  return new Promise(resolve => {
    let q; try { q = indexedDB.open(DB_NAME); } catch { return resolve(null); }
    q.onsuccess = () => resolve(q.result);
    q.onerror = q.onblocked = () => resolve(null);
  });
}

async function yearMeta(year) {
  const db = await openDbExisting(); if (!db || !db.objectStoreNames.contains(META_STORE)) { try { db?.close(); } catch {} return null; }
  return new Promise(resolve => {
    try {
      const q = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(`year:${Number(year)}`);
      q.onsuccess = () => { const v = q.result?.value ?? q.result ?? null; try { db.close(); } catch {} resolve(v); };
      q.onerror = () => { try { db.close(); } catch {} resolve(null); };
    } catch { try { db.close(); } catch {} resolve(null); }
  });
}

async function yearReadyFromQuery(year) {
  const m = await yearMeta(year);
  return Boolean(m && m.status === 'complete' && Number(m.recordCount || m.totalReported || 0) > 0 && fold(m.source) === 'TJK_KOSU_SORGULAMA');
}

async function refreshUi() {
  normalizeUi();
  try { await window.ATAnnualArchiveV13?.refreshMeta?.(true); } catch {}
  try { window.dispatchEvent(new CustomEvent('at-ai:annual-archive-open', { detail: { version: VERSION, source: 'TJK_KOSU_SORGULAMA' } })); } catch {}
  try { await window.ATF6087AnnualYearManager?.render?.(); } catch {}
}

async function updateOneYear(year) {
  const src = window.ATAnnualQuerySourceF60943134;
  if (!src || typeof src.updateYear !== 'function') throw new Error('Koşu Sorgulama yıllık kaynak köprüsü hazır değil.');
  setTopStatus(`${year}: TJK Koşu Sorgulama listesinden gerçekleşmiş yarışlar alınıyor…`);
  await src.updateYear(Number(year));
  const ok = await yearReadyFromQuery(year);
  if (!ok) throw new Error(`${year}: Koşu Sorgulama arşivi tamamlandı olarak doğrulanamadı.`);
  await refreshUi();
}

async function runYearRange({ resume = false } = {}) {
  if (running) return;
  const { from, to } = readYearRange();
  if (!from || !to) { setTopStatus('Başlangıç ve bitiş yılını seçin.'); return; }
  running = true; stopRequested = false; setButtonsBusy(true);
  let nextYear = from;
  const old = loadProgress();
  if (resume && old && Number(old.from) === from && Number(old.to) === to && Number(old.nextYear) >= from && Number(old.nextYear) <= to) nextYear = Number(old.nextYear);
  try {
    for (let y = nextYear; y <= to; y++) {
      if (stopRequested) break;
      saveProgress({ from, to, nextYear: y, source: 'TJK_KOSU_SORGULAMA', at: Date.now() });
      if (await yearReadyFromQuery(y)) {
        setTopStatus(`${y}: Koşu Sorgulama arşivi zaten hazır · sonraki yıla geçiliyor…`);
        saveProgress({ from, to, nextYear: y + 1, source: 'TJK_KOSU_SORGULAMA', at: Date.now() });
        await sleep(30);
        continue;
      }
      await updateOneYear(y);
      saveProgress({ from, to, nextYear: y + 1, source: 'TJK_KOSU_SORGULAMA', at: Date.now() });
      await sleep(40);
    }
    if (stopRequested) {
      const p = loadProgress();
      setTopStatus(`Durduruldu. Kaldığı yer kaydedildi${p?.nextYear ? ` · sıradaki yıl ${p.nextYear}` : ''}.`);
    } else {
      clearProgress();
      setTopStatus(`${from}-${to} tamamlandı · kaynak TJK Koşu Sorgulama · kariyer eşleşmeleri bu yerel arşivi kullanacak.`);
    }
  } catch (e) {
    setTopStatus(`Hata: ${e?.message || e} · Devam Et ile kaldığı yerden sürdürülebilir.`);
    console.warn('[AT AI]', VERSION, e);
  } finally {
    running = false;
    setButtonsBusy(false);
    await refreshUi();
  }
}

function isDownloadButton(btn) { return fold(btn?.textContent).includes('SECILI YILLARI SIRAYLA INDIR'); }
function isResumeButton(btn) { return fold(btn?.textContent) === 'DEVAM ET'; }
function isStopButton(btn) { return fold(btn?.textContent) === 'DURDUR'; }

/* F60.94.31.18 görünümünün üst yıl yöneticisini sahiplenir. Alt bölümlerdeki Durdur düğmelerine dokunmaz. */
document.addEventListener('click', event => {
  const btn = event.target?.closest?.('button');
  const section = topYearSection();
  if (!btn || !section || !section.contains(btn)) return;
  if (isDownloadButton(btn)) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
    void runYearRange({ resume: false });
    return;
  }
  if (isResumeButton(btn)) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
    void runYearRange({ resume: true });
    return;
  }
  if (isStopButton(btn)) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
    stopRequested = true;
    setTopStatus('Durdurma istendi · mevcut yıl tamamlanınca işlem duracak.');
  }
}, true);

for (const ms of [0, 80, 250, 700, 1600, 3200]) setTimeout(normalizeUi, ms);
window.addEventListener('at-ai:annual-archive-open', () => { normalizeUi(); setTimeout(normalizeUi, 50); setTimeout(normalizeUi, 300); });
document.addEventListener('click', e => { if (e.target?.closest?.('#annualArchiveBtn')) { setTimeout(normalizeUi, 0); setTimeout(normalizeUi, 120); setTimeout(normalizeUi, 500); } }, true);

window.ATMenu7F18QueryBridgeF60943138 = { version: VERSION, normalizeUi, runYearRange, yearReadyFromQuery };
console.info('[AT AI]', VERSION, 'aktif — Menu 7 F60.94.31.18 görünümü; yıllık kaynak yalnız TJK Koşu Sorgulama.');
})();
