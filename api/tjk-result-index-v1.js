import * as cheerio from 'cheerio';

const VERSION='TJK-RESULT-INDEX-V1-F60.76';
const TJK='https://www.tjk.org';
const DATA_URL=`${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;
const ROWS_URL=`${TJK}/TR/YarisSever/Query/DataRows/KosuSorgulama`;
const PAGE_URL=`${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;
const SORT='Tarih asc, Sehir asc, KosuSirasi asc';
const DOMESTIC=new Set(['ADANA','ANKARA','ANTALYA','BURSA','DIYARBAKIR','ELAZIG','ISTANBUL','IZMIR','KOCAELI','SANLIURFA']);
const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:PAGE_URL,
  'cache-control':'no-cache'
};
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
function iso(v=''){
  const s=clean(v);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:'';
}
function trDate(v=''){const d=iso(v);return d?d.split('-').reverse().join('/'):''}
async function postForm(url,form){
  const body=new URLSearchParams();for(const[k,v]of Object.entries(form))body.set(k,String(v??''));
  const c=new AbortController(),t=setTimeout(()=>c.abort(),25000);
  try{
    const r=await fetch(url,{method:'POST',headers:{...HEADERS,'content-type':'application/x-www-form-urlencoded; charset=UTF-8','x-requested-with':'XMLHttpRequest'},body:body.toString(),redirect:'follow',signal:c.signal});
    if(r.status===404)return null;if(!r.ok)throw new Error(`TJK HTTP ${r.status}`);return await r.text();
  }finally{clearTimeout(t)}
}
function parse(html=''){
  const $=cheerio.load(html),out=[];let sourceRowCount=0;
  $('table').each((_,table)=>{
    const heads=$(table).find('thead th').map((__,th)=>clean($(th).text())).get();
    const ix=re=>heads.findIndex(x=>re.test(clean(x)));
    const dateIx=ix(/^Tarih$/i),cityIx=ix(/^Şehir$|^Sehir$/i),raceIx=ix(/^Koşu$|^Kosu$/i),ageIx=ix(/^Grup$/i),classIx=ix(/Koşu Cinsi|Kosu Cinsi/i),distanceIx=ix(/^Mesafe$/i),trackIx=ix(/^Pist$/i);
    if([dateIx,cityIx,raceIx].some(x=>x<0))return;
    $(table).find('tbody tr').each((__,tr)=>{
      const cells=$(tr).find('td').map((___,td)=>clean($(td).text())).get();if(!cells.length)return;sourceRowCount++;
      const date=iso(cells[dateIx]),city=clean(cells[cityIx]);
      if(!date||!city||!DOMESTIC.has(fold(city)))return;
      const raceNo=Number(String(cells[raceIx]||'').match(/\d+/)?.[0]||0);if(!raceNo)return;
      out.push({date,year:Number(date.slice(0,4)),city,raceNo,ageGroup:ageIx>=0?clean(cells[ageIx]):'',class:classIx>=0?clean(cells[classIx]):'',distance:distanceIx>=0?Number(String(cells[distanceIx]||'').match(/\d{3,4}/)?.[0]||0):0,track:trackIx>=0?clean(cells[trackIx]):''});
    });
  });
  return{rows:out,sourceRowCount};
}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
  const start=iso(req.query?.start),end=iso(req.query?.end),page=Math.max(1,Number(req.query?.page)||1);
  if(!start||!end)return res.status(400).json({ok:false,error:'start ve end tarihleri YYYY-MM-DD olmalı'});
  const form={QueryParameter_BaslangicTarihi:trDate(start),QueryParameter_BitisTarihi:trDate(end),QueryParameter_SehirId:-1,QueryParameter_KosuCinsiId:-1,QueryParameter_GrupId:-1,QueryParameter_PistId:-1,QueryParameter_Mesafe:'',Sort:SORT,Page:page,PageNumber:page};
  try{
    const html=await postForm(page===1?DATA_URL:ROWS_URL,form);if(!html)return res.status(200).json({ok:true,version:VERSION,start,end,page,rows:[],sourceRowCount:0,hasMore:false});
    const parsed=parse(html);
    // Koşu Sorgulama DataRows cevabı çoğu zaman pagination işaretini taşımaz.
    // Bu yüzden istemci boş kaynak sayfası gelene kadar sonraki sayfayı denemelidir.
    const hasMore=parsed.sourceRowCount>0;
    const first=parsed.rows[0],last=parsed.rows.at(-1);
    const signature=parsed.sourceRowCount?`${page}|${parsed.sourceRowCount}|${first?.date||''}|${first?.city||''}|${first?.raceNo||''}|${last?.date||''}|${last?.city||''}|${last?.raceNo||''}`:`${page}|0`;
    return res.status(200).json({ok:true,version:VERSION,start,end,page,rows:parsed.rows,sourceRowCount:parsed.sourceRowCount,hasMore,rowCount:parsed.rows.length,signature});
  }catch(e){return res.status(502).json({ok:false,version:VERSION,error:e?.name==='AbortError'?'TJK sorgusu zaman aşımına uğradı':(e?.message||String(e))});}
}
