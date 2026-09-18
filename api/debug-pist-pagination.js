const TJK='https://www.tjk.org';
const PAGE='/TR/YarisSever/Query/Page/PistBilgileri';
const DATA='/TR/YarisSever/Query/DataRows/PistBilgileri';
const HEADERS={'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36','accept-language':'tr-TR,tr;q=.9,en;q=.6',accept:'text/html,*/*;q=.8',referer:`${TJK}${PAGE}`};
async function text(url){const r=await fetch(url,{headers:HEADERS,redirect:'follow'});return await r.text()}
function snippets(s,needle,span=500){const out=[];let p=0,u=String(s||'');while((p=u.toLowerCase().indexOf(needle.toLowerCase(),p))>=0&&out.length<8){out.push(u.slice(Math.max(0,p-span),Math.min(u.length,p+needle.length+span)));p+=needle.length}return out}
function summarize(raw){const s=String(raw||'');const dates=[...s.matchAll(/\b\d{2}[.\/-]\d{2}[.\/-]\d{4}\b/g)].map(x=>x[0]);return{length:s.length,dates:dates.slice(0,8),first:s.slice(0,1800),hasTable:/<table/i.test(s),trCount:(s.match(/<tr\b/gi)||[]).length,tdCount:(s.match(/<td\b/gi)||[]).length}}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  const start=String(req.query.start||'01/01/2026'),end=String(req.query.end||'31/12/2026');
  const qs=new URLSearchParams({QueryParameter_Tarih_Start:start,QueryParameter_Tarih_End:end});
  const pageHtml=await text(`${TJK}${PAGE}?${qs}`);
  const tests={};
  const candidates=[['none',{}],['PageNumber',{PageNumber:'2'}],['CurrentPage',{CurrentPage:'2'}],['page',{page:'2'}],['Page',{Page:'2'}],['Skip',{Skip:'50'}],['start',{start:'50'}],['Start',{Start:'50'}],['RowIndex',{RowIndex:'50'}],['LastRowIndex',{LastRowIndex:'50'}],['Offset',{Offset:'50'}],['takeSkip',{take:'50',skip:'50'}]];
  for(const [name,extra] of candidates){const q=new URLSearchParams(qs);for(const [k,v] of Object.entries(extra))q.set(k,v);try{tests[name]=summarize(await text(`${TJK}${DATA}?${q}`))}catch(e){tests[name]={error:e.message}}}
  return res.status(200).json({ok:true,page:{length:pageHtml.length,dataRows:snippets(pageHtml,'DataRows'),more:snippets(pageHtml,'Daha Fazla'),pist:snippets(pageHtml,'PistBilgileri',250)},tests});
 }catch(e){return res.status(500).json({ok:false,error:e.message})}
}
