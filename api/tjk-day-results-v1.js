import * as cheerio from 'cheerio';

const TJK='https://www.tjk.org';
const VERSION='TJK-DAY-RESULTS-V1.5-DIRECT-CITY-URL';
const TIMEOUT_MS=22000;
const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:'https://www.tjk.org/',
  'cache-control':'no-cache'
};
function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function upper(v=''){return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')}
function key(v=''){return upper(v).replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'')}
function isoToDisplay(iso=''){const m=clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:''}
function decimal(v=''){const m=clean(v).replace(',','.').match(/-?\d+(?:\.\d+)?/);if(!m)return null;const n=Number(m[0]);return Number.isFinite(n)?n:null}
function integer(v=''){const n=decimal(v);return Number.isFinite(n)?Math.trunc(n):null}
function weightInfo(raw=''){
  const text=clean(raw),base=decimal(text);let extra=0;
  const plus=text.replace(/,/g,'.').match(/\+\s*(\d+(?:\.\d+)?)/);
  const named=text.replace(/,/g,'.').match(/FAZLA\s*K[Iİ]LO[^\d+]*(?:\+\s*)?(\d+(?:\.\d+)?)/i);
  if(plus)extra=Number(plus[1]);else if(named)extra=Number(named[1]);
  if(!Number.isFinite(extra)||extra<0||extra>15)extra=0;
  return{weightText:text,baseWeight:Number.isFinite(base)?base:null,extraWeight:extra,actualWeight:Number.isFinite(base)?Number((base+extra).toFixed(2)):null};
}
function normalizeTrack(v=''){const t=upper(v);if(t.includes('CIM'))return'Çim';if(t.includes('KUM'))return'Kum';if(t.includes('SENTETIK'))return'Sentetik';return''}
function normalizeTrackStatus(v=''){const t=upper(v);for(const [needle,label] of [['COK ISLAK','Çok Islak'],['ISLAK','Islak'],['NEMLI','Nemli'],['AGIR','Ağır'],['YUMUSAK','Yumuşak'],['SULU','Sulu'],['KURU','Kuru'],['HIZLI','Hızlı'],['NORMAL','Normal']])if(t.includes(needle))return label;return clean(v)}
function marginLengths(raw=''){const t=upper(raw).replace(/,/g,'.').replace(/\s+/g,' ').trim();if(!t)return null;if(t.includes('ATBASI')||t.includes('AT BASI'))return 0;if(t.includes('BURUN'))return.05;if(/\bBAS\b/.test(t))return.10;if(t.includes('BOYUN'))return.25;if(t.includes('YARIM'))return.50;if(/\b1\s*\/\s*2\s*BOY\b/.test(t))return.50;if(/\b3\s*\/\s*4\s*BOY\b/.test(t))return.75;const mixed=t.match(/(\d+)\s+(1\s*\/\s*2)\s*BOY/);if(mixed)return Number(mixed[1])+.5;const m=t.match(/(\d+(?:\.\d+)?)\s*BOY/);if(!m)return null;const n=Number(m[1]);return Number.isFinite(n)?n:null}
function closeLabel(gap){if(!Number.isFinite(gap))return null;if(gap<=.10)return'ÇOK YAKIN';if(gap<=.50)return'YAKIN';if(gap<=1)return'YAKIN MÜCADELE';if(gap<=2)return'TEMASLI';return'AÇIK FARK'}
function resultNotFound(message){const e=new Error(message);e.code='TJK_RESULT_NOT_FOUND';return e}
function exactResultUrl(raw=''){const s=clean(raw);if(!s)return'';let u;try{u=new URL(s,TJK)}catch{throw new Error('Geçersiz TJK sonuç linki.')}const host=u.hostname.toLowerCase();if(u.protocol!=='https:'||!(host==='tjk.org'||host==='www.tjk.org')||!/GunlukYarisSonuclari/i.test(u.pathname))throw new Error('Yalnız TJK günlük yarış sonuç linki kullanılabilir.');return u.toString()}
function dayDiff(dateIso){const m=clean(dateIso).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return 9999;const target=Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));const now=new Date(),today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());return Math.max(0,Math.round((today-target)/86400000))}
function preferredEra(dateIso){const d=dayDiff(dateIso);return d<=1?'today':d<=8?'lastWeek':'past'}
function directResultUrl(dateIso,cityId,cityName,era){const d=isoToDisplay(dateIso);if(!d)throw new Error('Geçersiz tarih.');const id=clean(cityId);if(!/^\d+$/.test(id))throw new Error('Geçersiz şehir ID.');const u=new URL('/TR/YarisSever/Info/Sehir/GunlukYarisSonuclari',TJK);u.searchParams.set('SehirId',id);u.searchParams.set('QueryParameter_Tarih',d);u.searchParams.set('SehirAdi',clean(cityName));u.searchParams.set('Era',clean(era)||preferredEra(dateIso));return u.toString()}
async function fetchHtml(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:c.signal});if(!r.ok)throw new Error(`TJK HTTP ${r.status}`);const text=await r.text();if(!text||text.length<200)throw new Error('TJK sonuç sayfası boş döndü.');return text}finally{clearTimeout(t)}}
async function findCityResultUrl(dateIso,cityName){const d=isoToDisplay(dateIso);if(!d)throw new Error('Geçersiz tarih.');const html=await fetchHtml(`${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari?QueryParameter_Tarih=${encodeURIComponent(d)}`),$=cheerio.load(html),target=upper(cityName);let found='';$('a').each((_,a)=>{if(found)return;const text=upper($(a).text()),href=String($(a).attr('href')||'');if(href.includes('GunlukYarisSonuclari')&&text.startsWith(target))found=new URL(href,TJK).toString()});if(!found)throw resultNotFound(`${cityName} için ${dateIso} tarihli TJK yarış sonucu bulunamadı.`);return found}
function headers($,table){let h=$(table).find('thead th').map((_,x)=>clean($(x).text())).get();if(!h.length)h=$(table).find('tr').first().find('th,td').map((_,x)=>clean($(x).text())).get();return h}
function headerIndex(h,aliases){const hs=h.map(key);for(const alias of aliases){const a=key(alias);let i=hs.findIndex(x=>x===a);if(i>=0)return i;i=hs.findIndex(x=>x.includes(a)||a.includes(x));if(i>=0)return i}return-1}
function parseCondition(value=''){const text=clean(value),parts=text.split(',').map(clean).filter(Boolean),dm=text.match(/\b(\d{3,4})\s+(?:Çim|Kum|Sentetik)\b/i);return{class:parts[0]||'',ageGroup:parts[1]||'',distance:dm?Number(dm[1]):null,track:normalizeTrack(text),raw:text}}
function parseDayContext(html){
  const $=cheerio.load(html),text=clean($('body').text()),tracks={};
  for(const surface of ['Çim','Kum','Sentetik']){
    const re=new RegExp(`${surface}\\s*:\\s*([^:]{0,55}?)(?=\\s+(?:Çim|Kum|Sentetik|Hava)\\s*:|\\s+(?:PDF|Özet PDF|CSV|Komiser|Kronometrik)\\b|$)`,'i');
    const m=text.match(re);if(!m)continue;const raw=clean(m[1]),status=normalizeTrackStatus(raw),measureMatch=raw.replace(',','.').match(/(?:NORMAL|ISLAK|NEMLI|AĞIR|AGIR|YUMUŞAK|YUMUSAK|SULU|KURU|HIZLI|ÇOK ISLAK|COK ISLAK)\s*(\d+(?:\.\d+)?)/i);tracks[surface]={status,measure:measureMatch?Number(measureMatch[1]):null,raw};
  }
  const hm=text.match(/Hava\s*:\s*([^|]{0,120}?)(?=\s+(?:PDF|Özet PDF|CSV|Komiser|Kronometrik)\b|$)/i),weatherRaw=clean(hm?.[1]||'');
  const tempMatch=weatherRaw.match(/(-?\d+(?:[.,]\d+)?)\s*°?\s*C\b/i),humMatch=weatherRaw.match(/NEM\s*%?\s*(\d+(?:[.,]\d+)?)/i);
  return{tracks,weather:{raw:weatherRaw,temperature:tempMatch?Number(tempMatch[1].replace(',','.')):null,humidity:humMatch?Number(humMatch[1].replace(',','.')):null}};
}
function parseHorseCell($,cell){const first=$(cell).find('a').first(),linkText=clean(first.text()),text=clean($(cell).text()),horseText=linkText||text,pm=horseText.match(/\((\d+)\)/);let name=horseText.replace(/\(\d+\).*$/,'').trim();if(!linkText)name=name.replace(/\s+(KG|K|DB|SK|SKG|YP|ÖG|GKR|BB).*$/i,'').trim();let horseId='';$(cell).find('a').each((_,a)=>{if(horseId)return;const m=String($(a).attr('href')||'').match(/QueryParameter_AtId=(-?\d+)/i);if(m)horseId=String(m[1]).replace(/\D/g,'')});return{id:horseId,name,programNo:pm?Number(pm[1]):null}}
function addWinnerGaps(rows){const ordered=[...rows].sort((a,b)=>a.finish-b.finish);for(const row of ordered){if(row.finish===1){row.winnerGapApprox=0;row.winnerGapChain='0'}else{const prev=ordered.filter(x=>x.finish<row.finish),nums=prev.map(x=>x.marginToNextApprox),chain=prev.map(x=>x.marginRaw).filter(Boolean);row.winnerGapApprox=nums.length===row.finish-1&&nums.every(Number.isFinite)?nums.reduce((a,b)=>a+b,0):null;row.winnerGapChain=chain.join(' + ')||null}row.closeFinish=Number.isFinite(row.winnerGapApprox)?row.winnerGapApprox<=1:null;row.closeFinishLabel=closeLabel(row.winnerGapApprox)}return ordered}
function parseDay(html){
  const $=cheerio.load(html),dayContext=parseDayContext(html);let activeRaceNo=null,activeCondition='',activeTime='',out=[];
  $('h3, table').each((_,el)=>{
    const tag=String(el.tagName||el.name||'').toLowerCase();
    if(tag==='h3'){
      const text=clean($(el).text()),rm=text.match(/^(\d+)\.\s*Koşu\b\s*:?\s*(\d{1,2}[.:]\d{2})?/i);
      if(rm){activeRaceNo=Number(rm[1]);activeTime=rm[2]?rm[2].replace('.',':'):'';activeCondition='';return}
      if(activeRaceNo&&!activeCondition&&/(?:Kum|Çim|Sentetik)/i.test(text))activeCondition=text;
      return;
    }
    if(tag!=='table'||!activeRaceNo)return;
    const h=headers($,el),ixFinish=headerIndex(h,['S','Sıra','Derece Sırası']),ixHorse=headerIndex(h,['At İsmi','At Ismi','At Adı','At']),ixMargin=headerIndex(h,['Fark']),ixAge=headerIndex(h,['Yaş','Yas']),ixWeight=headerIndex(h,['Sıklet','Siklet','Kilo']),ixJockey=headerIndex(h,['Jokey','Jockey']),ixOwner=headerIndex(h,['Sahip','Owner']),ixTrainer=headerIndex(h,['Antrenör','Antrenor','Trainer']),ixDegree=headerIndex(h,['Derece','Müddet','Muddet']),ixGny=headerIndex(h,['Gny','Ganyan']),ixAgf=headerIndex(h,['AGF']),ixHp=headerIndex(h,['HP','H']),ixSt=headerIndex(h,['St','Start','Kulvar']),ixKgs=headerIndex(h,['KGS']),ixS20=headerIndex(h,['s20','S20']),ixOrigin=headerIndex(h,['Orijin(Baba - Anne)','Orijin']);
    if(ixFinish<0||ixHorse<0)return;
    const rows=[];
    $(el).find('tbody tr').each((_,tr)=>{
      const cells=$(tr).find('td').toArray();if(!cells.length||cells.length<=Math.max(ixFinish,ixHorse))return;
      const get=ix=>ix>=0&&ix<cells.length?clean($(cells[ix]).text()):'';
      const finish=integer(get(ixFinish));if(!finish||finish<1||finish>60)return;
      const horse=parseHorseCell($,cells[ixHorse]);if(!horse.name)return;
      const marginRaw=ixMargin>=0?get(ixMargin)||null:null,wi=weightInfo(get(ixWeight));
      rows.push({finish,horseId:horse.id,horseName:horse.name,programNo:horse.programNo,age:get(ixAge),origin:get(ixOrigin),weight:wi.actualWeight,baseWeight:wi.baseWeight,extraWeight:wi.extraWeight,actualWeight:wi.actualWeight,weightText:wi.weightText,jockey:get(ixJockey),owner:get(ixOwner),trainer:get(ixTrainer),degree:get(ixDegree),gny:decimal(get(ixGny)),odds:decimal(get(ixGny)),agf:decimal(get(ixAgf)),hp:integer(get(ixHp)),st:integer(get(ixSt)),kgs:integer(get(ixKgs)),s20:decimal(get(ixS20)),margin:marginRaw,marginRaw,marginToNextApprox:marginLengths(marginRaw)});
    });
    if(!rows.length)return;
    const condition=parseCondition(activeCondition),trackCtx=dayContext.tracks[condition.track]||null,full=addWinnerGaps(rows),winner=full.find(x=>x.finish===1)||null;
    const race={no:activeRaceNo,time:activeTime,class:condition.class,yaradi1:condition.class,ageGroup:condition.ageGroup,yaradi2:condition.ageGroup,distance:condition.distance,mesafe:condition.distance,track:condition.track,pist:condition.track,trackCondition:trackCtx?.status||'',trackMeasure:trackCtx?.measure??null,trackConditionRaw:trackCtx?.raw||'',weather:dayContext.weather,conditionRaw:condition.raw,rows:full,top3:full.filter(x=>x.finish<=3),top5:full.filter(x=>x.finish<=5),winner,horses:full.map(x=>({no:x.programNo,id:x.horseId?Number(x.horseId):null,name:x.horseName,age:x.age,origin:x.origin,weight:x.actualWeight,baseWeight:x.baseWeight,extraWeight:x.extraWeight,actualWeight:x.actualWeight,weightText:x.weightText,jockey:x.jockey,owner:x.owner,trainer:x.trainer,st:x.st,hp:x.hp,kgs:x.kgs,s20:x.s20,best:'',odds:x.odds,gny:x.gny,agf:x.agf,finish:x.finish,degree:x.degree,marginRaw:x.marginRaw,winnerGapApprox:x.winnerGapApprox}))};
    const existing=out.findIndex(r=>r.no===race.no);if(existing<0||race.rows.length>out[existing].rows.length){if(existing>=0)out[existing]=race;else out.push(race)}
  });
  return{races:out.sort((a,b)=>a.no-b.no),dayContext};
}
async function fetchDirectWithEraFallback(date,cityId,city,explicitEra=''){
  const preferred=clean(explicitEra)||preferredEra(date),eras=[preferred,...['today','lastWeek','past'].filter(x=>x!==preferred)];let lastError=null;
  for(const era of eras){try{const url=directResultUrl(date,cityId,city,era),html=await fetchHtml(url),parsed=parseDay(html);if(parsed.races.length)return{url,html,parsed,era};lastError=resultNotFound(`${city} için ${date} sonuç tablosu bulunamadı (${era}).`)}catch(e){lastError=e}}
  throw lastError||resultNotFound(`${city} için ${date} tarihli TJK yarış sonucu bulunamadı.`);
}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  try{
    const date=clean(req.query?.date||''),city=clean(req.query?.city||''),cityId=clean(req.query?.cityId||''),provided=clean(req.query?.resultUrl||''),explicitEra=clean(req.query?.era||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({ok:false,version:VERSION,error:'date YYYY-MM-DD biçiminde gerekli.'});
    if(!city)return res.status(400).json({ok:false,version:VERSION,error:'city gerekli.'});
    let resultUrl='',html='',parsed=null,era='';
    if(provided){resultUrl=exactResultUrl(provided);html=await fetchHtml(resultUrl);parsed=parseDay(html);era=new URL(resultUrl).searchParams.get('Era')||'';}
    else if(cityId){const direct=await fetchDirectWithEraFallback(date,cityId,city,explicitEra);resultUrl=direct.url;html=direct.html;parsed=direct.parsed;era=direct.era;}
    else{resultUrl=await findCityResultUrl(date,city);html=await fetchHtml(resultUrl);parsed=parseDay(html);era=new URL(resultUrl).searchParams.get('Era')||'';}
    const races=parsed?.races||[],dayContext=parsed?.dayContext||{};
    if(!races.length)return res.status(404).json({ok:false,version:VERSION,date,city,cityId:cityId||null,notFound:true,error:'TJK sonuç sayfasında yarış ayrıştırılamadı.',resultUrl});
    const horseCount=races.reduce((sum,r)=>sum+(r.rows?.length||0),0);
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({ok:true,version:VERSION,date,city,cityId:cityId||null,era,raceCount:races.length,horseCount,races,dayContext,source:provided?'TJK_EXACT_GUNLUK_YARIS_SONUCLARI':cityId?'TJK_DIRECT_CITY_RESULT_URL':'TJK_GUNLUK_YARIS_SONUCLARI_DAY_ARCHIVE',resultUrl});
  }catch(e){
    const notFound=e?.code==='TJK_RESULT_NOT_FOUND';if(!notFound)console.error('tjk-day-results-v1:',e);
    const status=e?.name==='AbortError'?504:notFound?404:502,error=e?.name==='AbortError'?'TJK sonuç sayfası zaman aşımına uğradı.':(e?.message||'Günlük sonuçlar alınamadı.');
    return res.status(status).json({ok:false,version:VERSION,notFound,error});
  }
}
