import * as cheerio from 'cheerio';
const TJK='https://www.tjk.org';
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const cities={Adana:1,Bursa:4,Ankara:5,Istanbul:3,'İstanbul':3,Izmir:2,'İzmir':2,Kocaeli:9,'Şanlıurfa':6,Sanliurfa:6,Elazig:7,'Elazığ':7,Diyarbakir:8,'Diyarbakır':8,Antalya:10};
function trDate(iso){const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:''}
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');
 try{
  const date=clean(req.query?.date),city=clean(req.query?.city),cityId=Number(req.query?.cityId||cities[city]||0);
  if(!date||!city||!cityId)return res.status(400).json({ok:false,error:'date, city ve cityId gerekli'});
  const q=new URLSearchParams({SehirId:String(cityId),QueryParameter_Tarih:trDate(date),SehirAdi:city,Era:'past'});
  const url=`${TJK}/TR/YarisSever/Info/Sehir/GunlukYarisSonuclari?${q}`;
  const c=new AbortController(),tm=setTimeout(()=>c.abort(),30000);
  let html;try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36','accept-language':'tr-TR,tr;q=.9',accept:'text/html,*/*'},signal:c.signal});if(!r.ok)throw new Error('TJK HTTP '+r.status);html=await r.text()}finally{clearTimeout(tm)}
  const $=cheerio.load(html);const races=[];
  $('table').each((i,t)=>{const rows=[];$(t).find('tr').each((_,tr)=>{const cells=$(tr).find('th,td').map((__,x)=>clean($(x).text())).get();if(cells.length)rows.push(cells)});if(rows.length>1)races.push({table:i+1,rows})});
  res.status(200).json({ok:true,date,city,cityId,sourceUrl:url,downloadedAt:new Date().toISOString(),tables:races,rawHtml:html});
 }catch(e){res.status(e?.name==='AbortError'?504:502).json({ok:false,error:e?.message||String(e)})}
}