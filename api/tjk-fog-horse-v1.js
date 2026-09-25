import * as cheerio from 'cheerio';

const VERSION='TJK-FOG-HORSE-V1.7';
const TJK='https://www.tjk.org';
const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  accept:'text/html,application/xhtml+xml'
};

function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}

async function fetchHtml(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:controller.signal});
    if(!r.ok)throw new Error('TJK HTTP '+r.status);
    return await r.text();
  }finally{clearTimeout(timer)}
}

async function safe(url){
  if(!url)return {ok:false,url:null,error:'URL yok',html:''};
  try{return {ok:true,url,html:await fetchHtml(url),error:null}}
  catch(e){return {ok:false,url,error:e?.message||String(e),html:''}}
}

function tableRows(html){
  if(!html)return [];
  const $=cheerio.load(html),out=[];
  $('table').each((_,table)=>{
    let headers=$(table).find('thead th').map((__,x)=>clean($(x).text())).get();
    if(!headers.length)headers=$(table).find('tr').first().find('th,td').map((__,x)=>clean($(x).text())).get();
    $(table).find('tbody tr').each((__,tr)=>{
      const cells=$(tr).find('td').map((___,x)=>clean($(x).text())).get();
      if(!cells.length)return;
      const row={};
      cells.forEach((v,i)=>{row[headers[i]||('col'+(i+1))]=v});
      out.push(row);
    });
  });
  return out;
}

function workoutRows(html,raceDate){
  return tableRows(html).filter(row=>{
    const text=Object.values(row).join(' ');
    if(!raceDate)return true;
    const m=text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if(!m)return true;
    const iso=m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
    return iso<raceDate;
  }).slice(0,60);
}

function tjkUrl(raw){if(!raw)return null;try{const u=new URL(raw,TJK);if(!/(^|\\.)tjk\\.org$/i.test(u.hostname))return null;return u}catch{return null}}
function idFrom(u,names){if(!u)return'';for(const n of names){const v=u.searchParams.get(n);if(v&&/^\\d+$/.test(v))return v}return''}
function originRefs(src){
 const $=cheerio.load(src||''),out={sire:{name:'',id:''},dam:{name:'',id:''},damSire:{name:'',code:''}};
 $('a[href]').each((_,a)=>{const href=$(a).attr('href')||'',u=tjkUrl(href),name=clean($(a).text());if(!u)return;
  const bid=idFrom(u,['QueryParameter_BabaId','BabaId']);if(bid&&!out.sire.id){out.sire={name:name||clean(u.searchParams.get('QueryParameter_BabaAdi')),id:bid}}
  const aid=idFrom(u,['QueryParameter_AnneId','AnneId']);if(aid&&!out.dam.id){out.dam={name:name||clean(u.searchParams.get('QueryParameter_AnneAdi')),id:aid}}
  const code=idFrom(u,['QueryParameter_KisrakBabaKodu','KisrakBabaKodu']);if(code&&!out.damSire.code){out.damSire={name:name||clean(u.searchParams.get('QueryParameter_KisrakBabaAdi')),code}}
 });return out
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 try{
  const horse=clean(req.query.horse),atId=String(req.query.atId||'').replace(/\\D/g,''),raceDate=clean(req.query.raceDate);
  let sire=clean(req.query.sire),dam=clean(req.query.dam),damSire=clean(req.query.damSire);
  if(!horse||!raceDate)return res.status(400).json({ok:false,version:VERSION,error:'horse ve raceDate gerekli'});
  let refs={sire:{name:sire,id:''},dam:{name:dam,id:''},damSire:{name:damSire,code:''}},resolveError=null;
  if(atId){try{const atUrl=`${TJK}/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=${encodeURIComponent(atId)}`,src=await fetchHtml(atUrl),r=originRefs(src);refs={sire:{name:r.sire.name||sire,id:r.sire.id},dam:{name:r.dam.name||dam,id:r.dam.id},damSire:{name:r.damSire.name||damSire,code:r.damSire.code}};sire=refs.sire.name||sire;dam=refs.dam.name||dam;damSire=refs.damSire.name||damSire}catch(e){resolveError=e?.message||String(e)}}
  const override={workout:tjkUrl(req.query.workoutUrl),sire:tjkUrl(req.query.sireUrl),dam:tjkUrl(req.query.damUrl),damSire:tjkUrl(req.query.damSireUrl)};
  const urls={
   workout:override.workout?.toString()||(horse?`${TJK}/TR/YarisSever/Query/Page/IdmanIstatistikleri?1=1&QueryParameter_ATADI=${encodeURIComponent(horse)}`:null),
   sire:override.sire?.toString()||(sire?`${TJK}/TR/YarisSever/Query/Page/Orijin?1=1${refs.sire.id?'&QueryParameter_BabaId='+encodeURIComponent(refs.sire.id):''}&QueryParameter_BabaAdi=${encodeURIComponent(sire)}`:null),
   dam:override.dam?.toString()||(dam?`${TJK}/TR/YarisSever/Query/Page/Orijin?1=1${refs.dam.id?'&QueryParameter_AnneId='+encodeURIComponent(refs.dam.id):''}&QueryParameter_AnneAdi=${encodeURIComponent(dam)}`:null),
   damSire:override.damSire?.toString()||(damSire?`${TJK}/TR/YarisSever/Query/Grouped/KisrakBabasi?1=1${refs.damSire.code?'&QueryParameter_KisrakBabaKodu='+encodeURIComponent(refs.damSire.code):''}&QueryParameter_KisrakBabaAdi=${encodeURIComponent(damSire)}`:null)
  };
  const [w,s,d,ds]=await Promise.all([safe(urls.workout),safe(urls.sire),safe(urls.dam),safe(urls.damSire)]);
  const sireRows=tableRows(s.html),damRows=tableRows(d.html),damSireRows=tableRows(ds.html),workout=workoutRows(w.html,raceDate),origin={archiveOnly:true,names:{sire,dam,damSire},refs,sireRows,damRows,damSireRows};
  const errors={
   workout:w.ok?null:w.error,
   sire:!s.ok?s.error:(!sireRows.length?'Aygır Orijin tablosu boş':null),
   dam:!d.ok?d.error:(!damRows.length?'Kısrak Orijin tablosu boş':null),
   damSire:!ds.ok?ds.error:(!damSireRows.length?'Kısrak Babası Orijin tablosu boş':null)
  };
  return res.status(200).json({ok:true,version:VERSION,horse,atId:atId||null,raceDate,complete:!Object.values(errors).some(Boolean),origin,workout:{workouts:workout,totalBeforeRace:workout.length,latest:workout[0]||null},sources:urls,resolveError,errors});
 }catch(e){console.error('[TJK-FOG-HORSE-V1.7]',e);return res.status(500).json({ok:false,version:VERSION,error:e?.message||String(e)})}
}
