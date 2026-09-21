import baseHandler from './tjk-day-results-v1.js';

const VERSION='TJK-DAY-RESULTS-V1.7-FOUR-ERA-CITYID';
const CITY_IDS={
  ADANA:1,
  IZMIR:2,
  ISTANBUL:3,
  BURSA:4,
  ANKARA:5,
  SANLIURFA:6,
  ELAZIG:7,
  DIYARBAKIR:8,
  KOCAELI:9,
  ANTALYA:10
};

function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function fold(v=''){
  return clean(v)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/İ/g,'I')
    .replace(/[^A-Z0-9]+/g,'');
}
function istanbulTodayIso(){
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function dayDiff(dateIso){
  const m=clean(dateIso).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return 9999;
  const t=istanbulTodayIso().match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!t)return 9999;
  const target=Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));
  const today=Date.UTC(Number(t[1]),Number(t[2])-1,Number(t[3]));
  return Math.max(0,Math.round((today-target)/86400000));
}
function eraForDate(dateIso){
  const d=dayDiff(dateIso);
  if(d<=1)return'yesterday';
  if(d<=8)return'lastWeek';
  if(d<=31)return'lastMonth';
  return'past';
}

export default async function handler(req,res){
  req.query=req.query||{};
  const date=clean(req.query.date||'');
  const city=clean(req.query.city||'');
  const inferredCityId=CITY_IDS[fold(city)]||null;
  if(!clean(req.query.cityId||'')&&inferredCityId)req.query.cityId=String(inferredCityId);
  if(!clean(req.query.era||'')&&date)req.query.era=eraForDate(date);

  const chosenEra=clean(req.query.era||'');
  const chosenCityId=clean(req.query.cityId||'');
  res.setHeader('X-AT-Result-Engine',VERSION);
  res.setHeader('X-AT-Era',chosenEra||'auto');

  const originalJson=res.json.bind(res);
  res.json=(body)=>{
    if(body&&typeof body==='object'){
      body.resultEngineVersion=VERSION;
      body.requestedEra=chosenEra||null;
      body.resolvedCityId=chosenCityId||null;
      body.eraStrategy='yesterday > lastWeek > lastMonth > past (tarihe göre doğru Era önce)';
    }
    return originalJson(body);
  };

  return baseHandler(req,res);
}
