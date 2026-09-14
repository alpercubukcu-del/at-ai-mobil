import * as cheerio from 'cheerio';

const TJK='https://www.tjk.org';
const VERSION='TJK-RACE-ANCHOR-RESOLVE-V1.0';
const TIMEOUT_MS=18000;
const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:'https://www.tjk.org/',
  'cache-control':'no-cache'
};
function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function upper(v=''){return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I')}
function isoToDisplay(iso=''){const m=clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:''}
function addDays(iso,n){const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function normalizeTrack(v=''){const t=upper(v);if(t.includes('CIM'))return'Çim';if(t.includes('KUM'))return'Kum';if(t.includes('SENTETIK'))return'Sentetik';return''}
async function fetchHtml(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(`TJK HTTP ${r.status}`);const html=await r.text();if(!html||html.length<200)throw new Error('TJK sayfası boş döndü.');return html}finally{clearTimeout(t)}}
async function cityUrlFor(dateIso,city){
  const d=isoToDisplay(dateIso);if(!d)return'';
  const html=await fetchHtml(`${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari?QueryParameter_Tarih=${encodeURIComponent(d)}`),$=cheerio.load(html),target=upper(city);let found='';
  $('ul.gunluk-tabs a,a[href*="GunlukYarisSonuclari"]').each((_,a)=>{if(found)return;const text=upper($(a).text()),href=String($(a).attr('href')||'');if(!href.includes('GunlukYarisSonuclari'))return;if(text.startsWith(target))found=new URL(href,TJK).toString()});
  return found;
}
function parseRace(div,$){
  const id=clean($(div).attr('id')),sehir=clean($(div).attr('sehir'));
  const raceText=clean($(div).find('h3.race-no a,h3.race-no').first().text()),m=raceText.match(/^(\d+)\s*\.\s*Koşu/i),raceNo=m?Number(m[1]):0;
  const cfg=clean($(div).find('h3.race-config').first().text()),dm=cfg.match(/\b(\d{3,4})\s+(Kum|Çim|Sentetik)\b/i);
  const horses=[];$(div).find('table tbody tr').each((_,tr)=>{const a=$(tr).find('.gunluk-GunlukYarisSonuclari-AtAdi3 a,td a[href*="QueryParameter_AtId"]').first(),name=clean(a.text()).replace(/\(\d+\).*$/,'').trim();if(name&&!horses.includes(name))horses.push(name)});
  return{id,city:sehir,raceNo,config:cfg,distance:dm?Number(dm[1]):null,track:dm?normalizeTrack(dm[2]):'',horses};
}
async function findOnDate(anchor,date,city){
  const url=await cityUrlFor(date,city);if(!url)return null;
  const html=await fetchHtml(url),$=cheerio.load(html);let div=$(`div.races-panes > div[id="${anchor}"]`).first();if(!div.length)div=$(`div[id="${anchor}"][sehir]`).first();if(!div.length)return null;
  const race=parseRace(div.get(0),$);if(!race.raceNo)return null;return{...race,date,city:race.city||city,resultUrl:`${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari#${anchor}`,cityResultUrl:url};
}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store, max-age=0');
  try{
    const anchor=clean(req.query?.anchor||'').replace(/^#/,'').trim(),date=clean(req.query?.date||''),city=clean(req.query?.city||'');
    if(!/^\d+$/.test(anchor))return res.status(400).json({ok:false,version:VERSION,error:'Sayısal TJK yarış kimliği gerekli.'});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({ok:false,version:VERSION,error:'scheduled date YYYY-MM-DD gerekli.'});
    if(!city)return res.status(400).json({ok:false,version:VERSION,error:'city gerekli.'});
    const offsets=[0,-1,1,-2,2,-3,3,-4,4,-5,5,-6,6,-7,7],checked=[];
    for(const off of offsets){const d=addDays(date,off);checked.push(d);try{const hit=await findOnDate(anchor,d,city);if(hit)return res.status(200).json({ok:true,version:VERSION,anchor,scheduledDate:date,scheduledCity:city,offsetDays:off,checked,match:hit});}catch(e){if(e?.name==='AbortError')continue;}}
    return res.status(404).json({ok:false,version:VERSION,anchor,scheduledDate:date,scheduledCity:city,checked,error:`#${anchor} TJK yarış kimliği ${city} için ${date} çevresindeki ±7 günde bulunamadı.`});
  }catch(e){console.error('tjk-race-anchor-resolve-v1:',e);return res.status(e?.name==='AbortError'?504:502).json({ok:false,version:VERSION,error:e?.name==='AbortError'?'TJK zaman aşımına uğradı.':(e?.message||'TJK yarış kimliği çözülemedi.')});}
}
