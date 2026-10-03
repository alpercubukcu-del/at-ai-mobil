import * as cheerio from 'cheerio';

const VERSION='TJK-RACE-QUERY-V17.4.15';
const TJK='https://www.tjk.org';
const PAGE='/TR/YarisSever/Query/Page/KosuSorgulama';
const FILTER='/TR/YarisSever/Query/Data/KosuSorgulama';
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
function cellByClass($,tr,needles){let found='';$(tr).find('td').each((_,td)=>{if(found)return;const fields=String($(td).attr('class')||'').split(/\s+/).map(c=>fold(c.replace(/^sorgu-KosuSorgulama-/i,'')));if(needles.some(n=>fields.includes(fold(n))))found=clean($(td).text())});return found}

export function parseRows(html){
  const $=cheerio.load(html),out=[];
  $('tr').each((_,tr)=>{
    const cells=$(tr).find('td').toArray();if(cells.length<10)return;
    const at=i=>i>=0&&i<cells.length?clean($(cells[i]).text()):'';
    const field=(names,fallback)=>cellByClass($,tr,names)||at(fallback);
    const date=iso(field(['Tarih'],0)),city=field(['SehirAdi','Sehir'],1);
    if(!date||!city)return;
    const raceNo=Number(dec(field(['KosuSirasi','KosuNo','Kosu'],2))||0)||null,group=field(['KosuGrubuAdi','Grup'],3),raceType=field(['KosuCinsiAdi','KosuCinsi'],4),apprenticeType=field(['AprantiKosuTipi','AprKosuCinsi','AprKosCinsi'],5),distance=Number(dec(field(['Mesafe'],6))||0)||null,track=field(['PistAdi','Pist'],7),winnerWeight=dec(field(['Kilo','Siklet'],8)),origin=field(['BabaAnne','Orijin'],9),prize=num(field(['Ikramiye'],10)),winner=field(['BirinciAtAdi','Birinci','Kazanan'],11),age=field(['BirinciAtAdiYas','Yas'],12),winnerDegree=field(['BirinciAtDerece','Derece'],13),hp=Number(dec(field(['HandikapPuani','HPuani','HPuan','HP'],14))||0)||null;
    if(!Number.isInteger(raceNo)||raceNo<=0)return;
    // A race number is only unique inside a meeting. TJK can expose duplicate
    // table rows; keep a stable content signature so callers can distinguish
    // an exact duplicate from genuinely different content without aborting.
    const meetingKey=`query|${date}|${fold(city)}|${raceNo}`;
    const signature=[group,raceType,apprenticeType,distance,track,winner,age,winnerDegree].map(fold).join('|');
    out.push({key:meetingKey,canonicalRaceId:meetingKey,sourceSignature:signature,queryKeyVersion:'F60.94.34',raceNoSource:'TJK_KOSU_COLUMN',date,year:Number(date.slice(0,4)),city,raceNo,group,raceType,apprenticeType,distance,track,winnerWeight,origin,prize,winner,age,winnerDegree,hp});
  });
  const text=clean($.root().text()),tm=text.match(/Toplam\s+([\d.]+)\s+sonuçtan/i),total=tm?Number(String(tm[1]).replace(/\./g,'')):out.length;
  return{rows:out,total:Number.isFinite(total)?total:out.length};
}
function query(start,end,page){const qs=new URLSearchParams();qs.set('QueryParameter_Tarih_Start',display(start));qs.set('QueryParameter_Tarih_End',display(end));qs.set('PageNumber',String(Math.max(0,Number(page)||0)+1));return qs.toString()}
function urls(start,end,page){const q=query(start,end,page);return[`${TJK}${DATA}?${q}`,`${TJK}${FILTER}?${q}`,`${TJK}${PAGE}?${q}`]}
async function fetchList(start,end,page){let last=null,bestTotal=0,bestUrl='';for(const url of urls(start,end,page)){try{const html=await get(url),p=parseRows(html);bestTotal=Math.max(bestTotal,Number(p.total||0));bestUrl=bestUrl||url;if(p.rows.length)return{...p,total:Math.max(Number(p.total||0),bestTotal),sourceUrl:url};}catch(e){last=e}}if(bestUrl)return{rows:[],total:bestTotal,sourceUrl:bestUrl};throw last||new Error('Koşu Sorgulama alınamadı.')}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store, max-age=0');
  try{
    const start=clean(req.query?.start||req.query?.date||''),end=clean(req.query?.end||start),page=Math.max(0,Number(req.query?.page||0));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return res.status(400).json({ok:false,version:VERSION,error:'start/end YYYY-MM-DD biçiminde gerekli.'});
    const d=await fetchList(start,end,page),filtered=d.rows.filter(x=>x.date>=start&&x.date<=end);
    // Collapse only byte-equivalent race identities. If TJK sends conflicting
    // content for the same meeting/race number, retain the richer row and
    // report the conflict instead of taking the archive down.
    const byKey=new Map(),conflicts=[];
    const score=x=>[x.winnerDegree,x.winner,x.origin,x.raceType,x.group,x.track,x.distance,x.age,x.hp].filter(v=>clean(v)!=='').length;
    for(const row of filtered){
      const prev=byKey.get(row.key);
      if(!prev){byKey.set(row.key,row);continue}
      if(prev.sourceSignature!==row.sourceSignature)conflicts.push({key:row.key,kept:score(row)>score(prev)?row.sourceSignature:prev.sourceSignature,dropped:score(row)>score(prev)?prev.sourceSignature:row.sourceSignature});
      if(score(row)>score(prev))byKey.set(row.key,row);
    }
    const rows=[...byKey.values()],duplicateRows=filtered.length-rows.length;
    const invalidRows=rows.filter(x=>!x.key||!x.date||!x.city||!x.winner).length;
    return res.status(200).json({ok:true,version:VERSION,start,end,page,tjkPage:page+1,total:rows.length,reportedTotal:d.total,rows,rawRowCount:d.rows.length,duplicateRows,conflictRows:conflicts.length,conflicts:conflicts.slice(0,10),invalidRows,queryKeyVersion:'F60.94.34',filterMatched:rows.length>0||d.rows.length===0,sourceUrl:d.sourceUrl});
  }catch(e){const status=e?.name==='AbortError'?504:502;return res.status(status).json({ok:false,version:VERSION,error:e?.name==='AbortError'?'TJK Koşu Sorgulama zaman aşımına uğradı.':(e?.message||String(e))})}
}
