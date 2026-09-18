import * as cheerio from 'cheerio';

const VERSION='TJK-RACE-QUERY-V1.0-F60.93';
const TJK='https://www.tjk.org';
const PAGE='/TR/YarisSever/Query/Page/KosuSorgulama';
const DATA='/TR/YarisSever/Query/DataRows/KosuSorgulama';
const TIMEOUT=30000;
const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  'accept-language':'tr-TR,tr;q=.9,en;q=.6',
  accept:'text/html,*/*;q=.8',
  referer:`${TJK}${PAGE}`
};
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
function iso(v=''){const m=clean(v).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''}
function display(v=''){const m=clean(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:clean(v)}
function num(v){const m=clean(v).replace(/\./g,'').replace(',','.').match(/-?\d+(?:\.\d+)?/);const n=m?Number(m[0]):NaN;return Number.isFinite(n)?n:null}
function dec(v){const m=clean(v).replace(',','.').match(/-?\d+(?:\.\d+)?/);const n=m?Number(m[0]):NaN;return Number.isFinite(n)?n:null}
async function get(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT);try{const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:c.signal});if(!r.ok)throw new Error(`TJK HTTP ${r.status}`);return await r.text()}finally{clearTimeout(t)}}
function cellByClass($,tr,needles){let found='';$(tr).find('td').each((_,td)=>{if(found)return;const cls=fold($(td).attr('class')||'');if(needles.some(n=>cls.includes(fold(n))))found=clean($(td).text())});return found}
function parseRows(html){
  const $=cheerio.load(html),out=[];
  $('tr').each((_,tr)=>{
    const cells=$(tr).find('td').toArray();if(cells.length<10)return;
    const at=i=>i>=0&&i<cells.length?clean($(cells[i]).text()):'';
    const field=(names,fallback)=>cellByClass($,tr,names)||at(fallback);
    const date=iso(field(['Tarih'],0));
    const city=field(['SehirAdi','Sehir'],1);
    const raceNo=Number(dec(field(['KosuNo','KNo','Kosu'],2))||0);
    if(!date||!city||!raceNo)return;
    const group=field(['Grup'],3);
    const raceType=field(['KosuCinsi'],4);
    const apprenticeType=field(['AprKosuCinsi','AprKosCinsi'],5);
    const distance=Number(dec(field(['Mesafe'],6))||0)||null;
    const track=field(['Pist'],7);
    const winnerWeight=dec(field(['Siklet'],8));
    const origin=field(['Orijin'],9);
    const prize=num(field(['Ikramiye'],10));
    const winner=field(['Birinci','Kazanan'],11);
    const age=field(['Yas'],12);
    const winnerDegree=field(['Derece'],13);
    const hp=Number(dec(field(['HPuani','HPuan','HP'],14))||0)||null;
    out.push({
      key:`${date}|${fold(city)}|${raceNo}`,
      canonicalRaceId:`${date}|${fold(city)}|${raceNo}`,
      date,year:Number(date.slice(0,4)),city,raceNo,group,raceType,apprenticeType,
      distance,track,winnerWeight,origin,prize,winner,age,winnerDegree,hp
    });
  });
  const text=clean($.root().text());
  const tm=text.match(/Toplam\s+([\d.]+)\s+sonuçtan/i);
  const total=tm?Number(String(tm[1]).replace(/\./g,'')):out.length;
  return{rows:out,total:Number.isFinite(total)?total:out.length};
}
function urls(start,end,page){
  const qs=new URLSearchParams();
  qs.set('QueryParameter_Tarih_Start',display(start));
  qs.set('QueryParameter_Tarih_End',display(end));
  if(Number(page)>0)qs.set('PageNumber',String(page));
  const q=qs.toString();
  return Number(page)>0
    ? [`${TJK}${DATA}?${q}`,`${TJK}${PAGE}?${q}`]
    : [`${TJK}${DATA}?${q}`,`${TJK}${PAGE}?${q}`];
}
async function fetchList(start,end,page){let last=null,bestTotal=0,bestUrl='';for(const url of urls(start,end,page)){try{const html=await get(url),p=parseRows(html);bestTotal=Math.max(bestTotal,Number(p.total||0));bestUrl=bestUrl||url;if(p.rows.length)return{...p,total:Math.max(Number(p.total||0),bestTotal),sourceUrl:url};}catch(e){last=e}}if(bestUrl)return{rows:[],total:bestTotal,sourceUrl:bestUrl};throw last||new Error('Koşu Sorgulama alınamadı.')}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
  try{
    const start=clean(req.query?.start||req.query?.date||''),end=clean(req.query?.end||start),page=Math.max(0,Number(req.query?.page||0));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return res.status(400).json({ok:false,version:VERSION,error:'start/end YYYY-MM-DD biçiminde gerekli.'});
    const d=await fetchList(start,end,page),rows=d.rows.filter(x=>x.date>=start&&x.date<=end);
    return res.status(200).json({ok:true,version:VERSION,start,end,page,total:d.total,rows,sourceUrl:d.sourceUrl});
  }catch(e){const status=e?.name==='AbortError'?504:502;return res.status(status).json({ok:false,version:VERSION,error:e?.name==='AbortError'?'TJK Koşu Sorgulama zaman aşımına uğradı.':(e?.message||String(e))})}
}
