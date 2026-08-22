/* AT AI Mobil — V14.7 Sade Günlük Kariyer PDF
   - PDF'de yalnız 5 Model sıralamaları + Kariyer/Hazırlık sıralaması bulunur.
   - Üst bölümde 5 model açıklamaları gösterilir.
   - En altta tüm analiz sıralamalarını tek matriste karşılaştırır.
   - Arşivlenmiş puanları kullanır; PDF üretirken puanı yeniden hesaplamaz.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CAREER_PDF_V147__) return;
window.__AT_DAILY_CAREER_PDF_V147__ = true;

const VERSION = 'DAILY-CAREER-PDF-V14.7';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const MODEL_IDS = ['composite','exact','twin','family','career'];
const MODEL_NAMES = {
  composite:'Bileşik',
  exact:'Tam Eşleşme',
  twin:'Koşul İkizi',
  family:'Yarış Ailesi',
  career:'Kariyer'
};
const MODEL_SHORT = { composite:'Bileşik', exact:'Tam', twin:'İkiz', family:'Aile', career:'Kariyer' };
const MODEL_EXPLANATIONS = [
  ['Bileşik', 'Tam %40 + Koşul İkizi %25 + Yarış Ailesi %20 + Kariyer %15. Veri bulunan kanallar kendi ağırlıklarıyla birleştirilir.'],
  ['Tam Eşleşme', 'Hedef koşuya aynı şehir, sınıf/şart, yaş grubu, mesafe ve pist bakımından en doğrudan tarihsel eşleşme kanalıdır.'],
  ['Koşul İkizi', 'Hedef koşunun temel şartlarını çok yakın taşıyan tarihsel yarışları kullanır; tam eşleşme yoksa güçlü ikinci referans katmanıdır.'],
  ['Yarış Ailesi', 'Aynı yarış ailesindeki daha geniş tarihsel örnekleri kullanır. Mesafe/pist/şehir farklarının aktarılabilirliği ayrıca dikkate alınır.'],
  ['Kariyer', 'Koşul ağırlığından bağımsız olarak atın yarış tarihinden önceki tam kariyer yolunu, geçmiş referans atların tam kariyer yollarıyla karşılaştırır.']
];

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const esc = v => clean(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Number(v);
let dbPromise = null;
let pdfLibPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

async function dbGet(key) {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function listDate(date) {
  const db = await openDb();
  if (!db) return [];
  return new Promise(resolve => {
    const out = [];
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const index = store.index('date');
      const req = index.openCursor(IDBKeyRange.only(String(date || '')));
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return;
        out.push(cur.value);
        cur.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = tx.onabort = () => resolve(out);
    } catch { resolve(out); }
  });
}

function modelKey(date, city, raceNo) {
  return `model|${clean(date)}|${clean(city)}|${clean(raceNo)}`;
}

function careerRows(item = {}) {
  const c = item.career || {};
  for (const rows of [c.fullPathBefore,c.historyBefore,c.comparisonPathBefore,c.roadmapBefore,c.history,c.roadmap,c.top5]) {
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}

function modeText(mode) {
  try { if (typeof modeLabelV11 === 'function') return modeLabelV11(mode); } catch {}
  if (mode === 'FULL_PATH') return 'Tam Kariyer Yolu';
  if (mode === 'WIN_PATH') return 'Galibiyet Yolu';
  if (mode === 'PREPARATION_PATH') return 'Hazırlık / İlk 5';
  if (mode === 'DEBUT') return 'Debut';
  return clean(mode) || 'Kariyer';
}

function careerRanking(race = {}) {
  return (Array.isArray(race.horses) ? race.horses : []).map(item => ({
    horse:item?.horse || {},
    score:finite(item?.galibiyetBenzerligi?.score),
    mode:clean(item?.career?.analysisMode || item?.galibiyetBenzerligi?.analysisMode),
    careerCount:careerRows(item).length
  })).sort((a,b) => (b.score ?? -1) - (a.score ?? -1) || Number(a.horse?.no || 999) - Number(b.horse?.no || 999));
}

function modelScore(item, id) {
  const channel = item?.scores?.[id] || {};
  return finite(channel.score ?? channel.rawScore);
}

function modelRanking(modelData, id) {
  const horses = Array.isArray(modelData?.horses) ? modelData.horses : [];
  return horses.map(item => ({
    horse:item?.horse || {},
    score:modelScore(item,id)
  })).filter(x => x.score !== null)
    .sort((a,b) => b.score - a.score || Number(a.horse?.no || 999) - Number(b.horse?.no || 999));
}

function rankingTable(title, rows, extraColumns = false) {
  return `<div class="pdf-template-v147">
    <h3>${esc(title)}</h3>
    <table>
      <thead><tr><th class="rank">Sıra</th><th>At</th><th class="score">Puan</th>${extraColumns?'<th>Yol</th><th class="career-count">Kariyer yarışı</th>':''}</tr></thead>
      <tbody>${rows.length ? rows.map((r,i) => `<tr>
        <td class="rank">${i+1}</td>
        <td><b>${esc(r.horse?.no ?? '')}. ${esc(r.horse?.name || '')}</b></td>
        <td class="score">${r.score===null?'—':'%'+esc(r.score)}</td>
        ${extraColumns?`<td>${esc(modeText(r.mode))}</td><td class="career-count">${esc(r.careerCount)}</td>`:''}
      </tr>`).join('') : `<tr><td colspan="${extraColumns?5:3}" class="empty">Bu şablon için arşivlenmiş sıralama yok.</td></tr>`}</tbody>
    </table>
  </div>`;
}

function modelExplanationsHtml() {
  return `<section class="pdf-model-info-v147">
    <h2>5 Model Şablonları</h2>
    <div class="pdf-model-info-grid-v147">${MODEL_EXPLANATIONS.map(([name,text]) => `<div class="pdf-model-info-card-v147"><b>${esc(name)}</b><span>${esc(text)}</span></div>`).join('')}</div>
    <div class="pdf-rule-v147">Not: PDF yalnız arşivdeki hesaplanmış sonuçları gösterir. PDF oluşturulurken model puanları yeniden hesaplanmaz.</div>
  </section>`;
}

function raceTemplatesHtml(pair) {
  const rec = pair.race;
  const race = rec?.race || {};
  const modelData = pair.model?.data || null;
  const modelBlocks = MODEL_IDS.map(id => rankingTable(`${MODEL_NAMES[id]} Sıralaması`, modelData ? modelRanking(modelData,id) : [], false)).join('');
  return `<section class="pdf-race-v147">
    <div class="pdf-race-head-v147">
      <h2>${esc(rec.cityName || rec.city)} · ${esc(rec.raceNo)}. Koşu</h2>
      <div>${esc(race.class || race.meta?.class || '')} · ${esc(race.ageGroup || race.meta?.ageGroup || '')} · ${esc(race.distance || race.meta?.distance || '')} ${esc(race.track || race.meta?.track || '')}</div>
    </div>
    <div class="pdf-five-models-v147">${modelBlocks}</div>
    ${rankingTable('Kariyer / Hazırlık Sıralaması', careerRanking(race), true)}
  </section>`;
}

function rankMap(rows) {
  return new Map(rows.map((r,i) => [String(r.horse?.id || `${r.horse?.no}|${clean(r.horse?.name).toLocaleUpperCase('tr-TR')}`), {rank:i+1,score:r.score,horse:r.horse}]));
}

function allAnalysisSummaryHtml(pairs) {
  const sections = pairs.map(pair => {
    const rec = pair.race;
    const race = rec?.race || {};
    const modelData = pair.model?.data || null;
    const maps = Object.fromEntries(MODEL_IDS.map(id => [id, rankMap(modelData ? modelRanking(modelData,id) : [])]));
    const career = careerRanking(race);
    const careerMap = rankMap(career);
    const horses = (Array.isArray(race.horses) ? race.horses : []).map(x => x?.horse || {}).sort((a,b) => Number(a.no||999)-Number(b.no||999));
    const key = h => String(h?.id || `${h?.no}|${clean(h?.name).toLocaleUpperCase('tr-TR')}`);
    const cell = x => x ? `<b>#${x.rank}</b>${x.score===null?'':`<small>%${esc(x.score)}</small>`}` : '—';
    return `<div class="pdf-all-race-v147">
      <h3>${esc(rec.cityName || rec.city)} · ${esc(rec.raceNo)}. Koşu</h3>
      <table class="pdf-all-table-v147">
        <thead><tr><th>At</th>${MODEL_IDS.map(id => `<th>${esc(MODEL_SHORT[id])}</th>`).join('')}<th>K/H</th></tr></thead>
        <tbody>${horses.map(h => { const k=key(h); return `<tr><td><b>${esc(h.no)}. ${esc(h.name)}</b></td>${MODEL_IDS.map(id => `<td>${cell(maps[id].get(k))}</td>`).join('')}<td>${cell(careerMap.get(k))}</td></tr>`; }).join('')}</tbody>
      </table>
    </div>`;
  }).join('');
  return `<section class="pdf-all-analysis-v147"><h2>Tüm Analiz Sıralaması</h2><div class="pdf-rule-v147">Her hücrede # model sırası, altında varsa arşivlenmiş puan gösterilir. “K/H” Kariyer / Hazırlık sıralamasıdır.</div>${sections}</section>`;
}

function documentHtml(date,pairs) {
  return `<div id="careerArchivePdfRootV147">
    <header class="pdf-title-v147"><h1>AT AI — Günlük Kariyer Analizi</h1><div>${esc(date)} · ${pairs.length} koşu</div></header>
    ${modelExplanationsHtml()}
    ${pairs.map(raceTemplatesHtml).join('')}
    ${allAnalysisSummaryHtml(pairs)}
    <footer>${esc(VERSION)} · Sade PDF şablonu</footer>
  </div>`;
}

function cssText() {
  return `
    #careerArchivePdfRootV147{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;font-size:11px;line-height:1.35}
    #careerArchivePdfRootV147 *{box-sizing:border-box}
    .pdf-title-v147{margin:0 0 16px}.pdf-title-v147 h1{font-size:25px;margin:0 0 5px}.pdf-title-v147>div{font-size:13px;color:#666}
    .pdf-model-info-v147{border:1px solid #d9dee5;border-radius:10px;padding:12px;margin:0 0 18px;break-inside:avoid}
    .pdf-model-info-v147 h2,.pdf-all-analysis-v147>h2{font-size:17px;margin:0 0 9px}
    .pdf-model-info-grid-v147{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pdf-model-info-card-v147{border:1px solid #e2e5e9;border-radius:7px;padding:7px 8px}.pdf-model-info-card-v147 b{display:block;margin-bottom:2px}.pdf-model-info-card-v147 span{font-size:10px;color:#444}
    .pdf-rule-v147{font-size:9px;color:#666;margin-top:7px}
    .pdf-race-v147{break-before:page}.pdf-race-v147:first-of-type{break-before:auto}.pdf-race-head-v147{margin:0 0 10px}.pdf-race-head-v147 h2{font-size:20px;margin:0 0 4px}.pdf-race-head-v147>div{font-size:12px;color:#555}
    .pdf-five-models-v147{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}.pdf-five-models-v147 .pdf-template-v147:first-child{grid-column:1/-1}
    .pdf-template-v147{break-inside:avoid;margin:0 0 10px}.pdf-template-v147 h3{font-size:13px;margin:0 0 4px;padding-bottom:3px;border-bottom:1px solid #d8d8d8}
    table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #d9d9d9;padding:4px 5px;text-align:left;vertical-align:middle}th{background:#f5f6f7;font-size:9px}.rank{width:38px;text-align:center}.score{width:60px;text-align:center}.career-count{width:80px;text-align:center}.empty{text-align:center;color:#777}
    .pdf-all-analysis-v147{break-before:page}.pdf-all-race-v147{break-inside:avoid;margin:12px 0 16px}.pdf-all-race-v147 h3{font-size:14px;margin:0 0 5px}.pdf-all-table-v147 th,.pdf-all-table-v147 td{text-align:center;font-size:8.5px;padding:3px}.pdf-all-table-v147 th:first-child,.pdf-all-table-v147 td:first-child{text-align:left}.pdf-all-table-v147 td small{display:block;font-size:7.5px;color:#666;margin-top:1px}
    footer{margin-top:18px;border-top:1px solid #ddd;padding-top:6px;font-size:8px;color:#777}
    @media print{.pdf-race-v147{break-before:page}.pdf-all-analysis-v147{break-before:page}}
  `;
}

async function loadPdfLib() {
  if (window.html2pdf) return window.html2pdf;
  if (!pdfLibPromise) pdfLibPromise = new Promise((resolve,reject) => {
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
    s.onload=()=>resolve(window.html2pdf);
    s.onerror=()=>reject(new Error('PDF kitaplığı yüklenemedi.'));
    document.head.appendChild(s);
  });
  return pdfLibPromise;
}

function safeFile(v) { return clean(v).replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_') || 'AT_AI'; }

async function buildPairsForDate(date, onlyKey='') {
  const rows = await listDate(date);
  let races = rows.filter(r => r.kind === 'race');
  if (onlyKey) races = races.filter(r => r.key === onlyKey);
  races.sort((a,b) => clean(a.cityName).localeCompare(clean(b.cityName),'tr') || Number(a.raceNo)-Number(b.raceNo));
  const pairs=[];
  for (const race of races) {
    const model = rows.find(r => r.kind === 'model' && clean(r.city) === clean(race.city) && String(r.raceNo) === String(race.raceNo)) || await dbGet(modelKey(race.date,race.city,race.raceNo));
    pairs.push({race,model:model || null});
  }
  return pairs;
}

async function makePdf(date,pairs,suffix) {
  if (!pairs.length) return alert('PDF için arşivlenmiş kariyer analizi bulunamadı.');
  const host=document.createElement('div');
  host.style.position='fixed';host.style.left='-100000px';host.style.top='0';host.style.width='794px';host.style.background='#fff';
  host.innerHTML=`<style>${cssText()}</style>${documentHtml(date,pairs)}`;
  document.body.appendChild(host);
  const filename=`${safeFile(date)}_${safeFile(suffix)}.pdf`;
  try {
    const lib=await loadPdfLib();
    await lib().set({margin:[8,8,10,8],filename,image:{type:'jpeg',quality:.96},html2canvas:{scale:1.35,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(host).save();
    try { if (typeof status === 'function') status('Sade 5 Model PDF hazırlandı.'); } catch {}
  } catch(e) {
    console.warn('[AT AI] V14.7 PDF üretimi:',e);
    const w=window.open('','_blank');
    if(w){w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(filename)}</title><style>${cssText()}</style></head><body>${documentHtml(date,pairs)}<script>setTimeout(()=>window.print(),350)<\/script></body></html>`);w.document.close();}
    else alert(e?.message||'PDF hazırlanamadı.');
  } finally {host.remove();}
}

async function exportDay(date) {
  const pairs=await buildPairsForDate(date);
  return makePdf(date,pairs,'GUNLUK_5_MODEL_KARIYER');
}

async function exportOne(key) {
  const rec=await dbGet(key);
  if(!rec)return;
  const pairs=await buildPairsForDate(rec.date,key);
  return makePdf(rec.date,pairs,`${rec.cityName||rec.city}_${rec.raceNo}K_5_MODEL_KARIYER`);
}

/* V14.6 PDF düğmelerini yakalayıp sade V14.7 çıktısını üretir. */
document.addEventListener('click',event=>{
  const target=event.target?.closest?.('#careerArchivePdfV146,#careerArchiveDayPdfV146,[data-pdf]');
  if(!target)return;
  const archiveDialog=target.closest?.('#careerArchiveDialogV146');
  if(target.matches('[data-pdf]')&&!archiveDialog)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(target.matches('[data-pdf]')) exportOne(target.dataset.pdf).catch(e=>alert(e?.message||'PDF hazırlanamadı.'));
  else exportDay(clean(typeof state!=='undefined'?state?.date:document.getElementById('raceDate')?.value)).catch(e=>alert(e?.message||'PDF hazırlanamadı.'));
},true);

window.ATDailyCareerPdfV147={version:VERSION,exportDay,exportOne};
console.info('[AT AI]',VERSION,'aktif — 5 model açıklaması + sade sıralamalar + tüm analiz özeti');
})();
