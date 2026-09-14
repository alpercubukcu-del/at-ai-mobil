import * as cheerio from 'cheerio';

const TJK='https://www.tjk.org';
const VERSION='TJK-RESULT-LINK-RESOLVE-V1.0';
const TIMEOUT_MS=22000;
const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:'https://www.tjk.org/',
  'cache-control':'no-cache'
};
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
const isoToDisplay=iso=>{const m=clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:''};

async function fetchHtml(url){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);
  try{const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(`TJK HTTP ${r.status}`);return await r.text();}
  finally{clearTimeout(t)}
}
async function findCityResultUrl(dateIso,cityName){
  const d=isoToDisplay(dateIso);if(!d)throw new Error('Geçersiz tarih.');
  const html=await fetchHtml(`${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari?QueryParameter_Tarih=${encodeURIComponent(d)}`),$=cheerio.load(html),target=upper(cityName);let found='';
  $('a').each((_,a)=>{if(found)return;const text=upper($(a).text()),href=String($(a).attr('href')||'');if(href.includes('GunlukYarisSonuclari')&&text.startsWith(target))found=new URL(href,TJK).toString();});
  if(!found)throw new Error(`${cityName} için ${dateIso} tarihli TJK sonuç sayfası bulunamadı.`);
  return found;
}
function raceNoFromText(v){const m=clean(v).match(/\b(\d{1,2})\.\s*Koşu\b/i);return m?Number(m[1]):0;}
function nearestRaceNo($,node){
  if(!node)return 0;
  let cur=$(node);
  for(let i=0;i<7&&cur.length;i++,cur=cur.parent()){
    const own=raceNoFromText(cur.clone().children().remove().end().text())||raceNoFromText(cur.text());if(own)return own;
    const prev=cur.prevAll('h1,h2,h3,h4,h5,h6').first();const p=raceNoFromText(prev.text());if(p)return p;
  }
  const prev=$(node).prevAll('h1,h2,h3,h4,h5,h6').first();return raceNoFromText(prev.text());
}
function resolveHash(html,hash){
  if(!hash)return{raceNo:0,evidence:'NO_HASH'};
  const $=cheerio.load(html),selectors=[`[id="${hash}"]`,`[name="${hash}"]`,`[href="#${hash}"]`,`[data-target="#${hash}"]`,`[data-id="${hash}"]`];
  for(const sel of selectors){
    const nodes=$(sel).toArray();
    for(const node of nodes){const n=raceNoFromText($(node).text())||nearestRaceNo($,node);if(n)return{raceNo:n,evidence:`DOM:${sel}`};}
  }
  const idx=html.indexOf(hash);
  if(idx>=0){
    const before=html.slice(Math.max(0,idx-9000),idx+1500).replace(/<[^>]+>/g,' '),matches=[...before.matchAll(/\b(\d{1,2})\.\s*Koşu\b/gi)];
    if(matches.length){const n=Number(matches.at(-1)[1]);if(n)return{raceNo:n,evidence:'RAW_NEAREST_HEADING'};}
  }
  return{raceNo:0,evidence:'HASH_NOT_MAPPED'};
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store, max-age=0');
  try{
    const raw=clean(req.query?.url||''),date=clean(req.query?.date||''),city=clean(req.query?.city||'');
    if(!raw)return res.status(400).json({ok:false,version:VERSION,error:'url gerekli.'});
    let u;try{u=new URL(raw)}catch{return res.status(400).json({ok:false,version:VERSION,error:'Geçersiz URL.'})}
    if(!/(^|\.)tjk\.org$/i.test(u.hostname))return res.status(400).json({ok:false,version:VERSION,error:'Yalnız TJK sonuç linki kabul edilir.'});
    const direct=Number(u.searchParams.get('KosuNo')||u.searchParams.get('raceNo')||0)||0;
    if(direct)return res.status(200).json({ok:true,version:VERSION,resolved:true,raceNo:direct,evidence:'QUERY_RACE_NO',hash:u.hash.replace(/^#/,'')});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!city)return res.status(400).json({ok:false,version:VERSION,error:'Hash bağlantısını çözmek için gerçek tarih ve şehir gerekli.'});
    const hash=decodeURIComponent(u.hash.replace(/^#/,''));if(!hash)return res.status(422).json({ok:false,version:VERSION,resolved:false,error:'Bu TJK linkinde koşu kimliği/hash yok.'});
    const resultUrl=await findCityResultUrl(date,city),html=await fetchHtml(resultUrl),r=resolveHash(html,hash);
    if(!r.raceNo)return res.status(422).json({ok:false,version:VERSION,resolved:false,hash,evidence:r.evidence,error:'TJK hash değeri gerçek koşu numarasına güvenle çözülemedi.'});
    return res.status(200).json({ok:true,version:VERSION,resolved:true,date,city,hash,raceNo:r.raceNo,evidence:r.evidence,resultUrl});
  }catch(e){return res.status(e?.name==='AbortError'?504:502).json({ok:false,version:VERSION,error:e?.name==='AbortError'?'TJK bağlantısı zaman aşımına uğradı.':(e?.message||'TJK sonuç linki çözülemedi.')});}
}
