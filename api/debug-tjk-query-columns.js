import * as cheerio from 'cheerio';

const DATA_URL = 'https://www.tjk.org/TR/YarisSever/Query/Data/KosuSorgulama';
const PAGE_URL = 'https://www.tjk.org/TR/YarisSever/Query/Page/KosuSorgulama';
const HEADERS = {
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:PAGE_URL
};
function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
export default async function handler(req,res){
  try{
    const body=new URLSearchParams({
      QueryParameter_Tarih_Start:String(req.query.start||'04.07.2025'),
      QueryParameter_Tarih_End:String(req.query.end||'02.10.2025'),
      QueryParameter_SehirId:String(req.query.cityId||'9'),
      QueryParameter_IrkId:'',
      QueryParameter_GrupId:String(req.query.groupId||'8'),
      QueryParameter_KosuCinsiId:String(req.query.classId||'14'),
      QueryParameter_Cinsiyet:'',QueryParameter_APRANTIKODU:'',
      QueryParameter_Mesafe:String(req.query.distance||''),
      QueryParameter_PistId:String(req.query.trackId||''),
      QueryParameter_BabaAdi:'',QueryParameter_AnneAdi:'',Era:'past',
      Sort:'Tarih desc, Sehir asc, KosuSirasi asc'
    });
    const response=await fetch(DATA_URL,{method:'POST',headers:{...HEADERS,'content-type':'application/x-www-form-urlencoded; charset=UTF-8','x-requested-with':'XMLHttpRequest'},body:body.toString(),redirect:'follow'});
    const html=await response.text();
    if(!response.ok) return res.status(response.status).json({ok:false,error:`HTTP ${response.status}`,sample:html.slice(0,500)});
    const $=cheerio.load(html);
    const tables=[];
    $('table').each((ti,table)=>{
      const headers=$(table).find('thead th').map((_,th)=>clean($(th).text())).get();
      const rows=$(table).find('tbody tr').slice(0,12).map((_,tr)=>({
        cells:$(tr).find('td').map((__,td)=>clean($(td).text())).get(),
        html:clean($(tr).html()).slice(0,1000)
      })).get();
      tables.push({tableIndex:ti,headers,rows});
    });
    return res.status(200).json({ok:true,request:Object.fromEntries(body.entries()),tableCount:tables.length,tables});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||String(e)});}
}
