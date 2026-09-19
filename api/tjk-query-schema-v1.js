import * as cheerio from 'cheerio';

const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:'https://www.tjk.org/'
};
const PAGES={
  origin:'https://www.tjk.org/TR/YarisSever/Query/Page/Orijin',
  workout:'https://www.tjk.org/TR/YarisSever/Query/Page/IdmanIstatistikleri'
};
function clean(v=''){return String(v??'').replace(/\s+/g,' ').trim()}
async function inspect(url){
  const r=await fetch(url,{headers:HEADERS,redirect:'follow'});
  const html=await r.text();
  const $=cheerio.load(html);
  const forms=$('form').map((_,f)=>({
    action:clean($(f).attr('action')||''),
    method:clean($(f).attr('method')||''),
    id:clean($(f).attr('id')||''),
    inputs:$(f).find('input,select,textarea').map((__,el)=>({
      tag:String(el.tagName||el.name||''),
      type:clean($(el).attr('type')||''),
      name:clean($(el).attr('name')||''),
      id:clean($(el).attr('id')||''),
      value:clean($(el).attr('value')||''),
      placeholder:clean($(el).attr('placeholder')||'')
    })).get().filter(x=>x.name||x.id)
  })).get();
  const scripts=$('script').map((_,s)=>clean($(s).attr('src')||$(s).html()||'')).get().filter(Boolean);
  const hints=scripts.filter(s=>/Orijin|Idman|Query\/Data|DataRows|QueryParameter_/i.test(s)).slice(0,20);
  return{status:r.status,url:r.url,forms,hints,htmlLength:html.length};
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const target=String(req.query.target||'all').toLowerCase();
    const out={ok:true};
    if(target==='all'||target==='origin')out.origin=await inspect(PAGES.origin);
    if(target==='all'||target==='workout')out.workout=await inspect(PAGES.workout);
    return res.status(200).json(out);
  }catch(e){return res.status(500).json({ok:false,error:e?.message||String(e)});}
}
