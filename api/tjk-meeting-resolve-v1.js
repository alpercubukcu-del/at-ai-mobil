import * as cheerio from 'cheerio';

const TJK='https://www.tjk.org';
const PROGRAM_ROOT=`${TJK}/TR/YarisSever/Info/Page/GunlukYarisProgrami`;
const RESULTS_ROOT=`${TJK}/TR/YarisSever/Info/Page/GunlukYarisSonuclari`;
const VERSION='TJK-MEETING-RESOLVE-V1.0-F60.79';
const TIMEOUT_MS=18000;
const DEFAULT_FORWARD_DAYS=14;
const MAX_FORWARD_DAYS=45;
const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:'https://www.tjk.org/',
  'cache-control':'no-cache'
};

function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function upper(v=''){return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I')}
function cityKey(v=''){return upper(v).replace(/[^A-Z0-9]+/g,'')}
function display(iso=''){const m=clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:''}
function meetingNo(label=''){const m=clean(label).match(/\(\s*(\d+)\s*\.\s*Y\.?\s*G\.?\s*\)/i);return m?Number(m[1]):null}
function stripMeeting(label=''){return clean(label).replace(/\s*\(\s*\d+\s*\.\s*Y\.?\s*G\.?\s*\)\s*$/i,'').trim()}
function addDays(iso,n){const m=clean(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return'';const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));d.setUTCDate(d.getUTCDate()+Number(n||0));return d.toISOString().slice(0,10)}

async function fetchHtml(url){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),TIMEOUT_MS);
  try{
    const r=await fetch(url,{headers:HEADERS,redirect:'follow',cache:'no-store',signal:c.signal});
    if(!r.ok)throw new Error(`TJK HTTP ${r.status}`);
    const text=await r.text();
    if(!text||text.length<200)throw new Error('TJK sayfası boş döndü.');
    return text;
  }finally{clearTimeout(timer)}
}

function findCityEntry(html,city,kind){
  const $=cheerio.load(html),target=cityKey(city);let best=null;
  const needle=kind==='program'?'GunlukYarisProgrami':'GunlukYarisSonuclari';
  $(`a[href*="${needle}"]`).each((_,a)=>{
    const label=clean($(a).text()),href=String($(a).attr('href')||'');
    if(!label||!href)return;
    const base=stripMeeting(label),same=cityKey(base)===target||cityKey(label).startsWith(target);
    if(!same)return;
    const yg=meetingNo(label);
    const entry={city:base||city,label,meetingNo:yg,url:new URL(href,TJK).toString()};
    if(!best||(entry.meetingNo&&!best.meetingNo))best=entry;
  });
  return best;
}

async function rootEntry(root,date,city,kind){
  const d=display(date);if(!d)throw new Error('Geçersiz tarih.');
  const html=await fetchHtml(`${root}?QueryParameter_Tarih=${encodeURIComponent(d)}`);
  return findCityEntry(html,city,kind);
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
  try{
    const scheduledDate=clean(req.query?.date||req.query?.scheduledDate||''),city=clean(req.query?.city||'');
    const rawDays=Number(req.query?.forwardDays||DEFAULT_FORWARD_DAYS);
    const forwardDays=Math.max(1,Math.min(MAX_FORWARD_DAYS,Number.isFinite(rawDays)?Math.trunc(rawDays):DEFAULT_FORWARD_DAYS));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate))return res.status(400).json({ok:false,version:VERSION,error:'date YYYY-MM-DD biçiminde gerekli.'});
    if(!city)return res.status(400).json({ok:false,version:VERSION,error:'city gerekli.'});

    const program=await rootEntry(PROGRAM_ROOT,scheduledDate,city,'program');
    if(!program)return res.status(404).json({ok:false,version:VERSION,scheduledDate,city,error:`${scheduledDate} ${city} yıllık program günü TJK günlük programında bulunamadı.`});
    if(!program.meetingNo)return res.status(422).json({ok:false,version:VERSION,scheduledDate,city,programLabel:program.label,error:`${city} için sezon yarış günü (Y.G.) numarası çözülemedi.`});

    const target=program.meetingNo,resultDates=[];let seenTarget=false,lastTargetOffset=-1,closed=false,scanned=0;
    for(let offset=0;offset<=forwardDays;offset++){
      const date=addDays(scheduledDate,offset);if(!date)break;
      scanned++;
      let entry=null;
      try{entry=await rootEntry(RESULTS_ROOT,date,city,'results')}catch(e){
        if(e?.name==='AbortError')throw e;
        continue;
      }
      if(entry?.meetingNo===target){
        seenTarget=true;lastTargetOffset=offset;
        resultDates.push({date,label:entry.label,meetingNo:entry.meetingNo,resultUrl:entry.url,postponed:date!==scheduledDate});
        continue;
      }
      if(seenTarget&&entry?.meetingNo&&entry.meetingNo!==target){closed=true;break}
      if(seenTarget&&lastTargetOffset>=0&&offset-lastTargetOffset>=7){closed=true;break}
    }

    return res.status(200).json({
      ok:true,version:VERSION,scheduledDate,city,
      meetingNo:target,meetingLabel:program.label,programUrl:program.url,
      resultDates,foundOnScheduledDate:resultDates.some(x=>x.date===scheduledDate),
      continuationDates:resultDates.filter(x=>x.date!==scheduledDate).map(x=>x.date),
      scannedDays:scanned,forwardDays,closed,
      source:'TJK_PROGRAM_YG_TO_RESULTS_YG'
    });
  }catch(e){
    console.error('tjk-meeting-resolve-v1:',e);
    return res.status(e?.name==='AbortError'?504:502).json({ok:false,version:VERSION,error:e?.name==='AbortError'?'TJK Y.G. eşleştirmesi zaman aşımına uğradı.':(e?.message||'Y.G. eşleştirmesi yapılamadı.')});
  }
}
