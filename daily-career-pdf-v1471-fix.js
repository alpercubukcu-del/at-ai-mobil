/* AT AI Mobil — V14.8 Direct Career PDF
   - html2canvas/html2pdf kullanmaz; mobil Chrome'daki boş sayfa sorununu kaldırır.
   - IndexedDB günlük arşivindeki hesaplanmış sonuçlardan pdfMake ile doğrudan PDF üretir.
   - Puan/formül değiştirmez; yalnız arşivlenmiş değerleri sıralayıp raporlar.
*/
(() => {
'use strict';
if (window.__AT_DAILY_CAREER_PDF_V148__) return;
window.__AT_DAILY_CAREER_PDF_V148__ = true;

const VERSION = 'DAILY-CAREER-PDF-V14.8-DIRECT';
const DB_NAME = 'at_ai_daily_career_archive_v146';
const STORE = 'entries';
const MODEL_IDS = ['composite','exact','twin','family','career'];
const MODEL_NAMES = { composite:'Bileşik', exact:'Tam Eşleşme', twin:'Koşul İkizi', family:'Yarış Ailesi', career:'Kariyer' };
const MODEL_SHORT = { composite:'Bileşik', exact:'Tam', twin:'İkiz', family:'Aile', career:'Kariyer' };
const MODEL_EXPLANATIONS = [
  ['Bileşik','Tam %40 + Koşul İkizi %25 + Yarış Ailesi %20 + Kariyer %15. Veri bulunan kanallar kendi ağırlıklarıyla birleştirilir.'],
  ['Tam Eşleşme','Hedef koşuya şehir, sınıf/şart, yaş grubu, mesafe ve pist bakımından en doğrudan tarihsel eşleşme kanalıdır.'],
  ['Koşul İkizi','Hedef koşunun temel şartlarını çok yakın taşıyan tarihsel yarışları kullanır; tam eşleşme yoksa güçlü ikinci referans katmanıdır.'],
  ['Yarış Ailesi','Aynı yarış ailesindeki daha geniş tarihsel örnekleri kullanır. Mesafe, pist ve şehir aktarılabilirliği ayrıca dikkate alınır.'],
  ['Kariyer','Atın yarış tarihinden önceki tam kariyer yolunu, geçmiş referans atların tam kariyer yollarıyla karşılaştırır.']
];

const clean = v => String(v ?? '').replace(/\s+/g,' ').trim();
const finite = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Number(v);
const safeFile = v => clean(v).replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_') || 'AT_AI';
let dbPromise = null;
let pdfMakePromise = null;

function currentDate() {
  try { if (typeof state !== 'undefined' && state?.date) return clean(state.date); } catch {}
  return clean(document.getElementById('raceDate')?.value);
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME,1);
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
      const req = db.transaction(STORE,'readonly').objectStore(STORE).get(key);
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
      const tx = db.transaction(STORE,'readonly');
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

function modelKey(date,city,raceNo) { return `model|${clean(date)}|${clean(city)}|${clean(raceNo)}`; }

function careerRows(item={}) {
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

function careerRanking(race={}) {
  return (Array.isArray(race.horses) ? race.horses : []).map(item => ({
    horse:item?.horse || {},
    score:finite(item?.galibiyetBenzerligi?.score),
    mode:clean(item?.career?.analysisMode || item?.galibiyetBenzerligi?.analysisMode),
    careerCount:careerRows(item).length
  })).sort((a,b) => (b.score ?? -1) - (a.score ?? -1) || Number(a.horse?.no || 999) - Number(b.horse?.no || 999));
}

function modelRanking(data,id) {
  return (Array.isArray(data?.horses) ? data.horses : []).map(item => {
    const detail = item?.scores?.[id] || {};
    return {
      horse:item?.horse || {},
      score:finite(detail.score ?? detail.rawScore),
      strongYears:Number(detail.strongYears || 0),
      supportYears:Number(detail.supportYears || 0)
    };
  }).filter(x => x.score !== null)
    .sort((a,b) => Number(b.score)-Number(a.score) || Number(b.strongYears)-Number(a.strongYears) || Number(b.supportYears)-Number(a.supportYears) || Number(a.horse?.no || 999)-Number(b.horse?.no || 999));
}

async function buildPairs(date,onlyKey='') {
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

function loadScript(src) {
  return new Promise((resolve,reject) => {
    const existing=[...document.scripts].find(s => String(s.src||'') === src);
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error('PDF kitaplığı yüklenemedi.')),{once:true});
      setTimeout(()=>resolve(),500);
      return;
    }
    const s=document.createElement('script');
    s.src=src; s.async=true;
    s.onload=()=>{s.dataset.loaded='1';resolve();};
    s.onerror=()=>reject(new Error('PDF kitaplığı yüklenemedi.'));
    document.head.appendChild(s);
  });
}

async function ensurePdfMake() {
  if (window.pdfMake?.createPdf && window.pdfMake?.vfs) return window.pdfMake;
  if (pdfMakePromise) return pdfMakePromise;
  pdfMakePromise=(async()=>{
    await loadScript('https://cdn.jsdelivr.net/npm/pdfmake@0.2.12/build/pdfmake.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/pdfmake@0.2.12/build/vfs_fonts.js');
    if (!window.pdfMake?.createPdf) throw new Error('PDF motoru başlatılamadı.');
    return window.pdfMake;
  })();
  return pdfMakePromise;
}

function busy(show,text='PDF hazırlanıyor…') {
  let el=document.getElementById('careerPdfBusyV148');
  if (!show) { el?.remove(); return; }
  if (!el) {
    el=document.createElement('div'); el.id='careerPdfBusyV148';
    Object.assign(el.style,{position:'fixed',inset:'0',zIndex:'2147483647',display:'grid',placeItems:'center',background:'rgba(8,21,34,.97)',color:'#eef7ff',fontFamily:'Arial,sans-serif',textAlign:'center',padding:'24px'});
    document.body.appendChild(el);
  }
  el.innerHTML=`<div style="padding:18px 22px;border:1px solid rgba(126,226,168,.32);border-radius:14px;background:#10253a"><b>${text}</b><small style="display:block;margin-top:6px;opacity:.72;font-size:11px">Arşivdeki sıralamalar doğrudan PDF tablolarına aktarılıyor.</small></div>`;
}

function tableLayout() {
  return { hLineColor:'#d9d9d9', vLineColor:'#d9d9d9', hLineWidth:()=>0.5, vLineWidth:()=>0.5, paddingLeft:()=>4, paddingRight:()=>4, paddingTop:()=>3, paddingBottom:()=>3 };
}

function rankingTable(title,rows,career=false) {
  const body = [[
    {text:'Sıra',style:'th'}, {text:'At',style:'th'}, {text:'Puan',style:'th'},
    ...(career ? [{text:'Yol',style:'th'},{text:'Kariyer yarışı',style:'th'}] : [])
  ]];
  if (!rows.length) {
    body.push([{text:'Bu şablon için arşivlenmiş sıralama yok.',colSpan:career?5:3,alignment:'center',color:'#777777'},...Array((career?5:3)-1).fill({})]);
  } else {
    rows.forEach((r,i)=>body.push([
      {text:String(i+1),alignment:'center'},
      {text:`${clean(r.horse?.no)}. ${clean(r.horse?.name)}`,bold:true},
      {text:r.score===null?'—':`%${r.score}`,alignment:'center'},
      ...(career ? [{text:modeText(r.mode)},{text:String(r.careerCount ?? 0),alignment:'center'}] : [])
    ]));
  }
  return [
    {text:title,style:'tableTitle',margin:[0,7,0,3]},
    {table:{headerRows:1,widths:career?[34,'*',46,100,72]:[34,'*',52],body},layout:tableLayout(),fontSize:8.5,margin:[0,0,0,4]}
  ];
}

function raceContent(pair,index) {
  const rec=pair.race || {};
  const race=rec.race || {};
  const modelData=pair.model?.data || null;
  const meta=[race.class || race.meta?.class,race.ageGroup || race.meta?.ageGroup,race.distance || race.meta?.distance,race.track || race.meta?.track].filter(Boolean).join(' · ');
  const out=[
    {text:`${clean(rec.cityName || rec.city)} · ${clean(rec.raceNo)}. Koşu`,style:'raceTitle',pageBreak:index===0?undefined:'before'},
    {text:meta,color:'#555555',fontSize:9,margin:[0,0,0,6]}
  ];
  MODEL_IDS.forEach(id => out.push(...rankingTable(`${MODEL_NAMES[id]} Sıralaması`,modelData ? modelRanking(modelData,id) : [],false)));
  out.push(...rankingTable('Kariyer / Hazırlık Sıralaması',careerRanking(race),true));
  return out;
}

function rankMap(rows) {
  const map=new Map();
  rows.forEach((r,i)=>{
    const key=String(r.horse?.id || `${r.horse?.no}|${clean(r.horse?.name).toLocaleUpperCase('tr-TR')}`);
    map.set(key,{rank:i+1,score:r.score,horse:r.horse});
  });
  return map;
}

function summaryContent(pairs) {
  const out=[{text:'Tüm Analiz Sıralaması',style:'sectionTitle',pageBreak:'before',margin:[0,0,0,4]},{text:'Her hücrede model sırası ve varsa puan gösterilir. K/H: Kariyer / Hazırlık.',fontSize:8,color:'#666666',margin:[0,0,0,8]}];
  pairs.forEach(pair=>{
    const rec=pair.race || {}, race=rec.race || {}, modelData=pair.model?.data || null;
    const maps=Object.fromEntries(MODEL_IDS.map(id=>[id,rankMap(modelData?modelRanking(modelData,id):[])]));
    const cMap=rankMap(careerRanking(race));
    const horses=(Array.isArray(race.horses)?race.horses:[]).map(x=>x?.horse||{}).sort((a,b)=>Number(a.no||999)-Number(b.no||999));
    const key=h=>String(h?.id || `${h?.no}|${clean(h?.name).toLocaleUpperCase('tr-TR')}`);
    const cell=x=>x?`#${x.rank}${x.score===null?'':`  %${x.score}`}`:'—';
    const body=[[{text:'At',style:'th'},...MODEL_IDS.map(id=>({text:MODEL_SHORT[id],style:'th'})),{text:'K/H',style:'th'}]];
    horses.forEach(h=>{const k=key(h);body.push([{text:`${clean(h.no)}. ${clean(h.name)}`,bold:true},...MODEL_IDS.map(id=>({text:cell(maps[id].get(k)),alignment:'center'})),{text:cell(cMap.get(k)),alignment:'center'}]);});
    out.push({text:`${clean(rec.cityName || rec.city)} · ${clean(rec.raceNo)}. Koşu`,style:'tableTitle',margin:[0,7,0,3]});
    out.push({table:{headerRows:1,widths:['*',42,34,34,34,42,38],body},layout:tableLayout(),fontSize:7.5,margin:[0,0,0,7]});
  });
  return out;
}

function docDefinition(date,pairs) {
  const content=[
    {text:'AT AI — Günlük Kariyer Analizi',style:'title'},
    {text:`${clean(date)} · ${pairs.length} koşu`,fontSize:10,color:'#666666',margin:[0,0,0,10]},
    {text:'5 Model Şablonları',style:'sectionTitle',margin:[0,0,0,5]}
  ];
  MODEL_EXPLANATIONS.forEach(([name,text])=>content.push({table:{widths:[90,'*'],body:[[{text:name,bold:true,fontSize:9},{text,fontSize:8.5,color:'#444444'}]]},layout:tableLayout(),margin:[0,0,0,3]}));
  content.push({text:'PDF yalnız arşivdeki hesaplanmış sonuçları gösterir; puanlar PDF oluşturulurken yeniden hesaplanmaz.',fontSize:7.5,color:'#777777',margin:[0,4,0,10]});
  pairs.forEach((pair,index)=>content.push(...raceContent(pair,index)));
  content.push(...summaryContent(pairs));
  return {
    pageSize:'A4', pageMargins:[24,28,24,28],
    defaultStyle:{font:'Roboto',fontSize:9,color:'#111111'},
    styles:{title:{fontSize:20,bold:true,margin:[0,0,0,3]},sectionTitle:{fontSize:14,bold:true},raceTitle:{fontSize:15,bold:true,margin:[0,0,0,3]},tableTitle:{fontSize:10.5,bold:true},th:{bold:true,fillColor:'#f3f4f6',fontSize:8}},
    content,
    footer:(page,current)=>({text:`${VERSION} · Sayfa ${page}/${current}`,alignment:'center',fontSize:6.5,color:'#888888',margin:[0,8,0,0]})
  };
}

async function downloadPdf(date,pairs,suffix) {
  if (!pairs.length) { alert('PDF için arşivlenmiş kariyer analizi bulunamadı.'); return; }
  busy(true);
  try {
    const pdfMake=await ensurePdfMake();
    const filename=`${safeFile(date)}_${safeFile(suffix)}.pdf`;
    await new Promise((resolve,reject)=>{
      try { pdfMake.createPdf(docDefinition(date,pairs)).download(filename,resolve); }
      catch(e){ reject(e); }
    });
    try { if (typeof showArchiveToastA === 'function') showArchiveToastA('PDF hazırlandı.'); } catch {}
  } finally { busy(false); }
}

async function exportDay(date=currentDate()) {
  const pairs=await buildPairs(date);
  return downloadPdf(date,pairs,'GUNLUK_5_MODEL_KARIYER');
}

async function exportOne(key) {
  const rec=await dbGet(key);
  if (!rec) return;
  const pairs=await buildPairs(rec.date,key);
  return downloadPdf(rec.date,pairs,`${rec.cityName||rec.city}_${rec.raceNo}K_5_MODEL_KARIYER`);
}

/* Window capture: eski V14.6/V14.7 PDF dinleyicilerine ulaşmadan doğrudan PDF üretir. */
window.addEventListener('click',event=>{
  const target=event.target?.closest?.('#careerArchivePdfV146,#careerArchiveDayPdfV146,[data-pdf]');
  if (!target) return;
  if (target.matches('[data-pdf]') && !target.closest?.('#careerArchiveDialogV146')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const job=target.matches('[data-pdf]')?exportOne(target.dataset.pdf):exportDay(currentDate());
  Promise.resolve(job).catch(e=>{console.error('[AT AI] V14.8 PDF:',e);busy(false);alert(e?.message||'PDF hazırlanamadı.');});
},true);

window.ATDailyCareerPdfV148={version:VERSION,exportDay,exportOne};
console.info('[AT AI]',VERSION,'aktif — doğrudan pdfMake PDF; html2canvas/html2pdf kullanılmıyor');
})();