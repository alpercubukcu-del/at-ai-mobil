import * as cheerio from 'cheerio';

const VERSION = 'TJK-MARGIN-ENRICH-V12.2';
const TJK = 'https://www.tjk.org';
const TIMEOUT_MS = 18000;
const CONCURRENCY = 3;
const DEFAULT_MAX_ROWS = 6;
const HARD_MAX_ROWS = 30;

const HEADERS = {
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:'https://www.tjk.org/',
  'cache-control':'no-cache'
};

function clean(v='') { return String(v ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim(); }
function upper(v='') { return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,''); }
function isoToDisplay(iso='') {
  const m=clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function normalizeName(v='') { return upper(v).replace(/[^A-Z0-9]+/g,''); }
function parseRaceNo(row={}) {
  const raw=clean(row.raceNo ?? row.race_no ?? row.raceNoName ?? row.kosu_no_adi ?? row.kosuNo ?? '');
  const m=raw.match(/\d+/);
  return m ? Number(m[0]) : 0;
}
function parseFinish(row={}) {
  const n=Number(row.finish ?? row.rank ?? row.sira);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
function marginLengths(raw='') {
  const t=upper(raw).replace(/,/g,'.').replace(/\s+/g,' ').trim();
  if (!t) return null;
  if (t.includes('ATBASI') || t.includes('AT BASI')) return 0;
  if (t.includes('BURUN')) return 0.05;
  if (/\bBAS\b/.test(t)) return 0.10;
  if (t.includes('BOYUN')) return 0.25;
  if (t.includes('YARIM')) return 0.50;
  if (/\b1\s*\/\s*2\s*BOY\b/.test(t)) return 0.50;
  if (/\b3\s*\/\s*4\s*BOY\b/.test(t)) return 0.75;
  const mixed=t.match(/(\d+)\s+(1\s*\/\s*2)\s*BOY/);
  if (mixed) return Number(mixed[1]) + 0.5;
  const m=t.match(/(\d+(?:\.\d+)?)\s*BOY/);
  if (m) {
    const n=Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function closeLabel(gap) {
  if (!Number.isFinite(gap)) return null;
  if (gap <= 0.10) return 'ÇOK YAKIN';
  if (gap <= 0.50) return 'YAKIN';
  if (gap <= 1.00) return 'YAKIN MÜCADELE';
  if (gap <= 2.00) return 'TEMASLI';
  return 'AÇIK FARK';
}
async function fetchHtml(url) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try {
    const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:controller.signal});
    if(!r.ok) throw new Error(`TJK HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(timer); }
}
function getHeaders($,table) {
  let h=$(table).find('thead th').map((_,x)=>clean($(x).text())).get();
  if(!h.length) h=$(table).find('tr').first().find('th,td').map((_,x)=>clean($(x).text())).get();
  return h;
}
function findHeader(headers,re) { return headers.findIndex(x=>re.test(clean(x))); }
function horseCell($,cell) {
  const link=$(cell).find('a').first();
  const text=clean(link.text() || $(cell).text());
  const name=text.replace(/\(\d+\).*$/,'').replace(/\s+(KG|K|DB|SK|SKG|YP|ÖG|GKR|BB).*$/i,'').trim();
  let id='';
  $(cell).find('a').each((_,a)=>{
    if(id) return;
    const m=String($(a).attr('href')||'').match(/QueryParameter_AtId=(-?\d+)/i);
    if(m) id=String(m[1]).replace(/\D/g,'');
  });
  return {id,name};
}
async function findCityResultUrl(dateIso,cityName) {
  const display=isoToDisplay(dateIso);
  if(!display) throw new Error('Geçersiz yarış tarihi.');
  const html=await fetchHtml(`${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari?QueryParameter_Tarih=${encodeURIComponent(display)}`);
  const $=cheerio.load(html), target=upper(cityName);
  let found='';
  $('a').each((_,a)=>{
    if(found) return;
    const text=upper($(a).text()), href=String($(a).attr('href')||'');
    if(href.includes('GunlukYarisSonuclari') && text.startsWith(target)) found=new URL(href,TJK).toString();
  });
  if(!found) throw new Error(`${dateIso} ${cityName} sonuç bağlantısı bulunamadı.`);
  return found;
}
function parseRace(html,requestedRaceNo) {
  const $=cheerio.load(html);
  let activeRaceNo=null, result=null;
  $('h3,table').each((_,el)=>{
    if(result) return;
    const tag=String(el.tagName||el.name||'').toLowerCase();
    if(tag==='h3') {
      const m=clean($(el).text()).match(/^(\d+)\.\s*Koşu\b/i);
      if(m) activeRaceNo=Number(m[1]);
      return;
    }
    if(tag!=='table' || Number(activeRaceNo)!==Number(requestedRaceNo)) return;
    const headers=getHeaders($,el);
    const finishIx=findHeader(headers,/^S$/i), horseIx=findHeader(headers,/At İsmi|At Ismi/i), marginIx=findHeader(headers,/^Fark$/i);
    if(finishIx<0 || horseIx<0 || marginIx<0) return;
    const rows=[];
    $(el).find('tbody tr').each((_,tr)=>{
      const cells=$(tr).find('td').toArray();
      if(cells.length<=Math.max(finishIx,horseIx,marginIx)) return;
      const fm=clean($(cells[finishIx]).text()).match(/\d+/);
      if(!fm) return;
      const finish=Number(fm[0]);
      if(finish<1 || finish>5) return;
      const horse=horseCell($,cells[horseIx]);
      const marginRaw=clean($(cells[marginIx]).text()) || null;
      rows.push({finish,horseId:horse.id,horseName:horse.name,marginRaw,marginToNextApprox:marginLengths(marginRaw)});
    });
    rows.sort((a,b)=>a.finish-b.finish);
    if(!rows.length) return;
    for(const row of rows) {
      if(row.finish===1) {
        row.winnerGapApprox=0;
        row.winnerGapChain='0';
      } else {
        const chain=rows.filter(x=>x.finish<row.finish).map(x=>x.marginRaw).filter(Boolean);
        const nums=rows.filter(x=>x.finish<row.finish).map(x=>x.marginToNextApprox);
        row.winnerGapApprox=nums.length===row.finish-1 && nums.every(Number.isFinite) ? nums.reduce((a,b)=>a+b,0) : null;
        row.winnerGapChain=chain.join(' + ') || null;
      }
      row.closeFinish=Number.isFinite(row.winnerGapApprox) ? row.winnerGapApprox<=1 : null;
      row.closeFinishLabel=closeLabel(row.winnerGapApprox);
    }
    result=rows;
  });
  return result || [];
}
async function mapLimit(items,limit,worker) {
  const list=Array.isArray(items)?items:[], out=new Array(list.length); let cursor=0;
  async function run(){ while(true){ const i=cursor++; if(i>=list.length) return; out[i]=await worker(list[i],i); } }
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length||1)},()=>run()));
  return out;
}
async function resolveRow(row) {
  const date=clean(row.isoDate || row.date), city=clean(row.city || row.sehir), raceNo=parseRaceNo(row), finish=parseFinish(row);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !city || !raceNo || finish<1 || finish>5) return null;
  const resultUrl=await findCityResultUrl(date,city);
  const raceRows=parseRace(await fetchHtml(resultUrl),raceNo);
  const horseId=clean(row.horseId || row.atId || row.id), horseName=normalizeName(row.horseName || row.atAdi || row.name);
  let hit=horseId ? raceRows.find(x=>clean(x.horseId)===horseId) : null;
  if(!hit && horseName) hit=raceRows.find(x=>normalizeName(x.horseName)===horseName);
  if(!hit) hit=raceRows.find(x=>x.finish===finish) || null;
  if(!hit) throw new Error('At sonuç satırında eşleştirilemedi.');
  return {
    uniqueKey:clean(row.uniqueKey), isoDate:date, city, raceNo,
    marginRawToNext:hit.marginRaw,
    marginToNextApprox:hit.marginToNextApprox,
    winnerGapApprox:hit.winnerGapApprox,
    winnerGapChain:hit.winnerGapChain,
    closeFinish:hit.closeFinish,
    closeFinishLabel:hit.closeFinishLabel,
    marginSource:'TJK_GUNLUK_YARIS_SONUCLARI',
    resultUrl
  };
}

export default async function handler(req,res) {
  if(req.method!=='POST') return res.status(405).json({ok:false,version:VERSION,error:'POST gerekli.'});
  try {
    let body=req.body;
    if(typeof body==='string') body=JSON.parse(body||'{}');
    const history=Array.isArray(body?.history)?body.history:[];
    const requested=Number(body?.maxRows);
    const maxRows=Math.max(1,Math.min(HARD_MAX_ROWS,Number.isFinite(requested)?Math.trunc(requested):DEFAULT_MAX_ROWS));
    const candidates=history
      .filter(r=>{const f=parseFinish(r);return f>=1&&f<=5&&parseRaceNo(r)>0&&/^\d{4}-\d{2}-\d{2}$/.test(clean(r.isoDate||r.date))&&clean(r.city||r.sehir);})
      .sort((a,b)=>clean(b.isoDate||b.date).localeCompare(clean(a.isoDate||a.date)))
      .slice(0,maxRows);
    const resolved=await mapLimit(candidates,CONCURRENCY,async row=>{
      try { return {ok:true,data:await resolveRow(row)}; }
      catch(e) { return {ok:false,uniqueKey:clean(row.uniqueKey),isoDate:clean(row.isoDate||row.date),error:e?.message||String(e)}; }
    });
    const margins=resolved.filter(x=>x?.ok&&x.data).map(x=>x.data);
    const errors=resolved.filter(x=>x&&!x.ok).map(x=>({uniqueKey:x.uniqueKey,isoDate:x.isoDate,error:x.error}));
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({
      ok:true,version:VERSION,requestedRows:history.length,eligibleRows:candidates.length,maxRows,
      enrichedRows:margins.length,errorRows:errors.length,margins,errors,
      rule:'İlk 5 için TJK Fark zinciri kümülatif toplanarak kazanana yaklaşık boy farkı hesaplanır.',
      closeRule:'Kazanana yaklaşık fark <= 1 boy ise yakın mücadele.'
    });
  } catch(e) {
    return res.status(500).json({ok:false,version:VERSION,error:e?.message||'Bitiriş farkları alınamadı.'});
  }
}
