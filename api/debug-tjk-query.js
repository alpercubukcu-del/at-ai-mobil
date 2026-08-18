import * as cheerio from 'cheerio';

const TJK='https://www.tjk.org';
const PAGE=`${TJK}/TR/YarisSever/Query/Page/KosuSorgulama`;
const DATA=`${TJK}/TR/YarisSever/Query/Data/KosuSorgulama`;
const ROWS=`${TJK}/TR/YarisSever/Query/DataRows/KosuSorgulama`;
const SORT='Tarih desc, Sehir asc, KosuSirasi asc';
const H={'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','accept-language':'tr-TR,tr;q=0.9,en;q=0.7',referer:PAGE};
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toLocaleUpperCase('tr-TR');
async function get(){const r=await fetch(PAGE,{headers:H});return {status:r.status,text:await r.text()};}
async function post(url,obj){const b=new URLSearchParams();Object.entries(obj).forEach(([k,v])=>b.set(k,String(v??'')));const r=await fetch(url,{method:'POST',headers:{...H,'content-type':'application/x-www-form-urlencoded; charset=UTF-8','x-requested-with':'XMLHttpRequest'},body:b.toString(),redirect:'follow'});return {status:r.status,url:r.url,text:await r.text()};}
function options(html,selector){const $=cheerio.load(html);return $(selector).find('option').map((_,o)=>({value:clean($(o).attr('value')),text:clean($(o).text())})).get();}
function tableInfo(html){const $=cheerio.load(html);const out=[];$('table').each((_,t)=>{const heads=$(t).find('thead th').map((__,th)=>clean($(th).text())).get();const rows=$(t).find('tbody tr').length;if(heads.length||rows)out.push({heads,rows,firstCells:$(t).find('tbody tr').first().find('td').map((__,td)=>clean($(td).text())).get()});});return out;}
function rowFragmentInfo(html){const $=cheerio.load(`<table><tbody>${html}</tbody></table>`);const trs=$('tr');return {trCount:trs.length,firstCells:trs.first().find('td').map((_,td)=>clean($(td).text())).get(),secondCells:trs.eq(1).find('td').map((_,td)=>clean($(td).text())).get(),snippet:clean(html).slice(0,1500)};}
export default async function handler(req,res){try{
 const page=await get(); if(page.status!==200)throw new Error(`page ${page.status}`);
 const cls=options(page.text,'#QueryParameter_KosuCinsiId').find(x=>upper(x.text)==='ŞARTLI 5')||null;
 const trk=options(page.text,'#QueryParameter_PistId').find(x=>upper(x.text).includes('KUM'))||null;
 const city=options(page.text,'#QueryParameter_SehirId').find(x=>upper(x.text)==='ELAZIĞ')||null;
 const groups=options(page.text,'#QueryParameter_GrupId');
 const group=groups.find(x=>upper(x.text).includes('3')&&upper(x.text).includes('İ'))||groups.find(x=>upper(x.text).includes('3'))||null;
 const base={QueryParameter_Tarih_Start:'',QueryParameter_Tarih_End:'12.08.2026',QueryParameter_SehirId:'',QueryParameter_IrkId:'',QueryParameter_GrupId:'',QueryParameter_KosuCinsiId:cls?.value||'',QueryParameter_Cinsiyet:'',QueryParameter_APRANTIKODU:'',QueryParameter_Mesafe:'',QueryParameter_PistId:trk?.value||'',QueryParameter_BabaAdi:'',QueryParameter_AnneAdi:'',Era:'past',Sort:SORT};
 const variants={base,withStart:{...base,QueryParameter_Tarih_Start:'01.01.2020'},withCity:{...base,QueryParameter_SehirId:city?.value||''},withDistance:{...base,QueryParameter_Mesafe:'1900'},withGroup:{...base,QueryParameter_GrupId:group?.value||''},all:{...base,QueryParameter_Tarih_Start:'01.01.2020',QueryParameter_SehirId:city?.value||'',QueryParameter_GrupId:group?.value||'',QueryParameter_Mesafe:'1900'}};
 const tests={}; for(const [name,form] of Object.entries(variants)){const r=await post(DATA,form);tests[name]={status:r.status,url:r.url,length:r.text.length,tables:tableInfo(r.text).slice(0,2),snippet:clean(r.text).slice(0,250)};}
 const first=await post(DATA,base); const p2=await post(ROWS,{...base,PageNumber:2,Sort:SORT}); const p6=await post(ROWS,{...base,PageNumber:6,Sort:SORT});
 res.setHeader('Cache-Control','no-store'); return res.status(200).json({ok:true,version:'TJK-QUERY-DIAG-1',resolved:{cls,trk,city,group,groupSample:groups.slice(0,10)},tests,page1:{status:first.status,tables:tableInfo(first.text).slice(0,2)},page2:{status:p2.status,url:p2.url,fragment:rowFragmentInfo(p2.text)},page6:{status:p6.status,url:p6.url,fragment:rowFragmentInfo(p6.text)}});
}catch(e){return res.status(500).json({ok:false,error:e?.message||String(e)});}}
