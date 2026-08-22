import * as cheerio from 'cheerio';

const VERSION = 'TJK-EXACT-Y-ANNUAL-V15.3';
const TJK = 'https://www.tjk.org';
const FILTER_PAGE = `${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;
const ANNUAL_ROWS = `${TJK}/TR/YarisSever/Query/DataRows/YillikYarisProgramiCoklu`;
const DAY_WINDOW = 45;
const PAGE_SIZE = 50;
const DEFAULT_MIN_YEAR = 2000;
const HEADERS = {
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  'cache-control':'no-cache'
};

const clean = v => String(v ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper = v => clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
const normCity = v => upper(v).replace(/[^A-Z0-9]/g,'');
function normTrack(v='') { const t=upper(v); if(t.includes('SENTETIK'))return 'SENTETIK'; if(t.includes('CIM'))return 'CIM'; if(t.includes('KUM'))return 'KUM'; return t; }
function parseAge(v='') {
  const t=upper(v).replace(/\s+/g,' '); let breed='';
  if(t.includes('INGILIZ'))breed='I'; else if(t.includes('ARAP'))breed='A';
  let m=t.match(/(\d+)\s*VE\s*YUKARI/); if(m)return `${breed}:${Number(m[1])}:99`;
  m=t.match(/(\d+)\s*YASLI/); if(m)return `${breed}:${Number(m[1])}:${Number(m[1])}`;
  m=t.replace(/\s+/g,'').match(/^(\d+)(\+)?([IA])$/); if(m)return `${m[3]}:${Number(m[1])}:${m[2]?99:Number(m[1])}`;
  return t.replace(/\s+/g,'');
}
function normalizeClass(v='') { return upper(v).replace(/\s*\/\s*/g,'/').replace(/\/{2,}/g,'/').replace(/\/+$/g,'').replace(/\s*-\s*/g,'-').replace(/\s+/g,' ').trim(); }
function classFamily(v='') {
  const t=normalizeClass(v); let m;
  if((m=t.match(/\bKISA\s+VADE(?:LI)?\s+HANDIKAP\s*(\d+)\b/))||(m=t.match(/\bKV\s+HANDIKAP\s*(\d+)\b/)))return `KISA_VADE_HANDIKAP:${Number(m[1])}`;
  if((m=t.match(/\bHANDIKAP\s*(\d+)\b/)))return `HANDIKAP:${Number(m[1])}`;
  if((m=t.match(/\bSARTLI\s*(\d+)\b/)))return `SARTLI:${Number(m[1])}`;
  if((m=t.match(/\bKV[- ]*(\d+)\b/)))return `KV:${Number(m[1])}`;
  if((m=t.match(/\b(?:G|GRUP)\s*-?\s*([123])\b/)))return `GROUP:${Number(m[1])}`;
  if((m=t.match(/^SATIS\s*-?\s*(\d+)\b/)))return `SATIS:${Number(m[1])}`;
  if(/^MAIDEN\b/.test(t))return 'MAIDEN:0';
  return `${t.split('/')[0]}:`;
}
function token(v='') {
  const t=upper(v).replace(/\s+/g,'');
  if(t==='D'||t==='DISI')return 'DISI';
  let m=t.match(/^Y-?(\d+)$/); if(m)return `Y${Number(m[1])}`;
  m=t.match(/^H-?(\d+)$/); if(m)return `H${Number(m[1])}`;
  return t;
}
function classKey(v='') {
  const parts=normalizeClass(v).split('/');
  const toks=parts.slice(1).map(token).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).sort();
  return `${classFamily(v)}|${toks.join('/')}`;
}
function parseIso(v='') { const m=clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?{y:+m[1],m:+m[2],d:+m[3]}:null; }
function displayToIso(v='') { const m=clean(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/); return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''; }
function isoToDisplay(v='') { const p=parseIso(v); return p?`${String(p.d).padStart(2,'0')}/${String(p.m).padStart(2,'0')}/${p.y}`:''; }
function daysInMonth(y,m){return new Date(Date.UTC(y,m,0)).getUTCDate();}
function anchorIso(targetIso,year){const p=parseIso(targetIso); if(!p)return''; return `${year}-${String(p.m).padStart(2,'0')}-${String(Math.min(p.d,daysInMonth(year,p.m))).padStart(2,'0')}`;}
function addDays(iso,n){return new Date(Date.parse(`${iso}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);}
function dayDiff(a,b){return Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`)-Date.parse(`${b}T00:00:00Z`))/86400000);}
async function fetchText(url, timeout=25000){
  const c=new AbortController(), timer=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(url,{headers:HEADERS,cache:'no-store',redirect:'follow',signal:c.signal}); if(!r.ok)throw new Error(`TJK HTTP ${r.status}`); return await r.text();} finally{clearTimeout(timer);}
}
function opts($,sel){return $(sel).find('option').map((_,o)=>({value:clean($(o).attr('value')),text:clean($(o).text())})).get();}
async function resolveIds(city,track){
  const $=cheerio.load(await fetchText(FILTER_PAGE));
  const cityOpt=opts($,'#QueryParameter_SehirId').find(x=>normCity(x.text)===normCity(city));
  const trackOpt=opts($,'#QueryParameter_PistId').find(x=>normTrack(x.text)===normTrack(track));
  if(!cityOpt)throw new Error(`TJK şehir filtresi bulunamadı: ${city}`);
  if(!trackOpt)throw new Error(`TJK pist filtresi bulunamadı: ${track}`);
  return {city:cityOpt,track:trackOpt};
}
function parseAnnual(html=''){
  const $=cheerio.load(html); const rows=[];
  $('tr').each((_,tr)=>{
    if($(tr).hasClass('hidable'))return;
    const td=$(tr).find('td').toArray(); if(td.length<7)return;
    const vals=td.map(x=>clean($(x).text())); const date=displayToIso(vals[0]);
    if(!date)return;
    rows.push({date,city:vals[1],ageGroup:vals[2],class:vals[3],distance:Number(vals[4].match(/\d{3,4}/)?.[0]||0),track:vals[5]});
  });
  const text=clean($.root().text()); const m=text.match(/Toplam\s+([\d.]+)\s+sonuçtan/i);
  return {rows,total:m?Number(m[1].replace(/\./g,'')):rows.length};
}
async function annualWindow(year,target,ids,maxPages=0){
  const anchor=anchorIso(target.date,year), begin=addDays(anchor,-DAY_WINDOW), end=addDays(anchor,DAY_WINDOW);
  const makeUrl=page=>{const u=new URL(ANNUAL_ROWS); u.searchParams.set('QueryParameter_Tarih_Start',isoToDisplay(begin)); u.searchParams.set('QueryParameter_Tarih_End',isoToDisplay(end)); u.searchParams.set('QueryParameter_SehirId',ids.city.value); u.searchParams.set('QueryParameter_PistId',ids.track.value); if(page>0)u.searchParams.set('PageNumber',String(page)); u.searchParams.set('_at',String(Date.now())); return u.toString();};
  const first=parseAnnual(await fetchText(makeUrl(0))); let rows=[...first.rows];
  const pages=Math.max(1,Math.ceil(Number(first.total||rows.length)/PAGE_SIZE));
  const limit=maxPages?Math.min(pages,maxPages):pages;
  for(let p=1;p<limit;p++) rows.push(...parseAnnual(await fetchText(makeUrl(p))).rows);
  rows=rows.filter(r=>normCity(r.city)===normCity(target.city)&&parseAge(r.ageGroup)===parseAge(target.ageGroup)&&classKey(r.class)===classKey(target.class)&&normTrack(r.track)===normTrack(target.track)&&Number(r.distance)===Number(target.distance));
  return {anchor,begin,end,pagesScanned:limit,rows};
}
function baseUrl(req){const host=clean(req.headers?.['x-forwarded-host']||req.headers?.host||'at-ai-mobil.vercel.app'); const proto=clean(req.headers?.['x-forwarded-proto']||'https'); return `${proto}://${host}`;}
async function fetchJson(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),30000); try{const r=await fetch(url,{cache:'no-store',signal:c.signal}); const d=await r.json(); if(!r.ok||d?.ok===false)throw new Error(d?.error||`HTTP ${r.status}`); return d;}finally{clearTimeout(timer);}}
async function resolveRaceNos(rows,ids,target,req){
  const grouped=new Map();
  for(const r of rows){if(!grouped.has(r.date))grouped.set(r.date,[]); grouped.get(r.date).push(r);}
  const out=[];
  for(const [date,dateRows] of grouped){
    const u=new URL('/api/tjk-race-meta',baseUrl(req)); u.searchParams.set('date',date); u.searchParams.set('cityId',ids.city.value); u.searchParams.set('cityName',target.city);
    const day=await fetchJson(u.toString());
    const candidates=(Array.isArray(day.races)?day.races:[]).filter(r=>classKey(r.class||r.yaradi1)===classKey(target.class)&&parseAge(r.ageGroup||r.yaradi2)===parseAge(target.ageGroup)&&Number(r.distance||r.mesafe)===Number(target.distance)&&normTrack(r.track||r.pist)===normTrack(target.track)).sort((a,b)=>Number(a.no)-Number(b.no));
    dateRows.forEach((row,i)=>{const race=candidates[Math.min(i,candidates.length-1)]; if(!race)return; out.push({...row,raceNo:Number(race.no),sourceYear:Number(date.slice(0,4)),anchorDate:anchorIso(target.date,Number(date.slice(0,4))),calendarDayDifference:dayDiff(date,anchorIso(target.date,Number(date.slice(0,4)))),exactCondition:true,classText:race.class||row.class,verification:{classMatch:true,ageMatch:true,distanceMatch:true,trackMatch:true,source:'TJK-ANNUAL+DAILY-PROGRAM',url:u.toString()}});});
  }
  return out;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  try{
    const q=req.query||{}; const target={date:clean(q.date),city:clean(q.city),class:clean(q.class),ageGroup:clean(q.ageGroup),track:clean(q.track),distance:Number(q.distance||0),minYear:Math.max(1950,Number(q.minYear||DEFAULT_MIN_YEAR)),maxPages:Number(q.maxPages||0)};
    const missing=['date','city','class','ageGroup','track','distance'].filter(k=>!target[k]); if(missing.length)return res.status(400).json({ok:false,version:VERSION,error:`Eksik hedef koşu alanı: ${missing.join(', ')}`});
    const td=parseIso(target.date); if(!td)return res.status(400).json({ok:false,version:VERSION,error:'Hedef tarih YYYY-MM-DD olmalı.'});
    const ids=await resolveIds(target.city,target.track); const all=[]; let pagesScanned=0;
    for(let year=td.y-1;year>=target.minYear;year--){
      const y=await annualWindow(year,target,ids,target.maxPages?Math.max(1,target.maxPages-pagesScanned):0); pagesScanned+=y.pagesScanned;
      if(y.rows.length) all.push(...await resolveRaceNos(y.rows,ids,target,req));
      if(target.maxPages&&pagesScanned>=target.maxPages)break;
    }
    const unique=[...new Map(all.map(x=>[`${x.date}|${x.city}|${x.raceNo}`,x])).values()].sort((a,b)=>b.date.localeCompare(a.date)||a.raceNo-b.raceNo);
    return res.status(200).json({ok:true,version:VERSION,source:'TJK-YillikYarisProgramiCoklu+GunlukYarisProgrami',target,filters:{city:ids.city,track:ids.track},matches:unique,matchCount:unique.length,diagnostics:{yearsScanned:Math.max(0,td.y-target.minYear),pagesScanned,verifiedRows:unique.length,calendarWindowDays:DAY_WINDOW}});
  }catch(e){return res.status(500).json({ok:false,version:VERSION,error:e?.message||String(e)});}
}
