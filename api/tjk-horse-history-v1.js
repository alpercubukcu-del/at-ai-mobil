import * as cheerio from 'cheerio';

const VERSION='TJK-HORSE-HISTORY-V1.2';
const TJK='https://www.tjk.org';
const TIMEOUT=12000;
const HEADERS={'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','accept-language':'tr-TR,tr;q=0.9,en;q=0.7',referer:'https://www.tjk.org/'};
const clean=(v='')=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=(v='')=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const iso=(v='')=>{const m=clean(v).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):''};
async function html(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT);try{const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:c.signal});if(!r.ok)throw Error('TJK HTTP '+r.status);return await r.text()}finally{clearTimeout(t)}}
export function parseHorseHistory(src){
  const $=cheerio.load(src),body=clean($('body').text());
  const horse=clean($('h1,h2,h3,.panel-title,.page-title').first().text()),races=[];
  $('table').each((_,tb)=>{
    let hs=$(tb).find('thead th').map((__,x)=>clean($(x).text())).get();
    if(!hs.length)hs=$(tb).find('tr').first().find('th,td').map((__,x)=>clean($(x).text())).get();
    const keys=hs.map(fold);
    if(!keys.includes('TARIH')||!keys.some(x=>x==='SEHIR'||x==='HIPODROM'))return;
    $(tb).find('tr').each((__,tr)=>{
      const cs=$(tr).children('td').map((___,x)=>clean($(x).text())).get();if(!cs.length)return;
      const raw={};hs.forEach((h,i)=>{if(h)raw[h]=cs[i]??''});
      // Short TJK headers (S, Msf, Gny) require exact matching. Empty headers never match.
      const get=(...names)=>{for(const name of names){const i=keys.indexOf(fold(name));if(i>=0)return cs[i]||''}return''};
      const date=iso(get('Tarih'));if(!date)return;
      races.push({date,city:get('Şehir','Hipodrom'),distance:get('Msf','Mesafe'),track:get('Pist'),
        finish:get('S','Sıra','Derece Sıra'),degree:get('Derece'),weight:get('Sıklet','Kilo'),jockey:get('Jokey'),
        odds:get('Gny','Ganyan'),raceType:get('Kcins','Koşu Türü'),ageGroup:get('Grup'),
        raceNo:get('K. No-K. Adı','Koşu No'),hp:get('HP'),s20:get('S20'),raw});
    });
  });
  return{horse,bodyHint:body.slice(0,250),races};
}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store, max-age=0');const atId=String(req.query.atId||'').replace(/\D/g,'');if(!atId)return res.status(400).json({ok:false,version:VERSION,error:'atId gerekli'});const era=clean(req.query.era||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,24);let url=TJK+'/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId='+encodeURIComponent(atId);if(era)url+='&Era='+encodeURIComponent(era);try{const src=await html(url),p=parseHorseHistory(src);return res.status(200).json({ok:true,version:VERSION,atId,url,horse:p.horse,raceCount:p.races.length,races:p.races})}catch(e){return res.status(502).json({ok:false,version:VERSION,atId,error:e.message||String(e)})}}
