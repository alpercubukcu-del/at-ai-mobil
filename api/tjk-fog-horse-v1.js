import * as cheerio from 'cheerio';

const VERSION='TJK-FOG-HORSE-V1.4';
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

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  try{
    const horse=clean(req.query.horse);
    const atId=String(req.query.atId||'').replace(/\D/g,'');
    const raceDate=clean(req.query.raceDate);
    const sire=clean(req.query.sire);
    const dam=clean(req.query.dam);
    const damSire=clean(req.query.damSire);
    if(!horse||!raceDate)return res.status(400).json({ok:false,version:VERSION,error:'horse ve raceDate gerekli'});

    const urls={
      workout:horse?`${TJK}/TR/YarisSever/Query/Page/IdmanIstatistikleri?1=1&QueryParameter_ATADI=${encodeURIComponent(horse)}`:null,
      sire:sire?`${TJK}/TR/YarisSever/Query/Page/AygirIstatistikleri?1=1&QueryParameter_AygirAdi=${encodeURIComponent(sire)}`:null,
      dam:dam?`${TJK}/TR/YarisSever/Query/Page/KisrakIstatistikleri?1=1&QueryParameter_KisrakAdi=${encodeURIComponent(dam)}`:null,
      damSire:damSire?`${TJK}/TR/YarisSever/Query/Page/KisrakBabasi?1=1&QueryParameter_KisrakBabaAdi=${encodeURIComponent(damSire)}`:null
    };

    const [w,s,d,ds]=await Promise.all([safe(urls.workout),safe(urls.sire),safe(urls.dam),safe(urls.damSire)]);
    const workout=workoutRows(w.html,raceDate);
    const origin={
      names:{sire,dam,damSire},
      sireRows:tableRows(s.html),
      damRows:tableRows(d.html),
      damSireRows:tableRows(ds.html)
    };
    const errors={
      workout:w.ok?null:w.error,
      sire:s.ok?null:s.error,
      dam:d.ok?null:d.error,
      damSire:ds.ok?null:ds.error
    };
    return res.status(200).json({
      ok:true,version:VERSION,horse,atId:atId||null,raceDate,
      complete:!Object.values(errors).some(Boolean),
      origin,
      workout:{workouts:workout,totalBeforeRace:workout.length,latest:workout[0]||null},
      sources:urls,
      errors
    });
  }catch(e){
    console.error('[TJK-FOG-HORSE-V1.4]',e);
    return res.status(500).json({ok:false,version:VERSION,error:e?.message||String(e)});
  }
}
