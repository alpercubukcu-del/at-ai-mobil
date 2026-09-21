const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname,BASE=path.join(ROOT,'build-runtime-v1691f737.cjs'),APP=path.join(ROOT,'public','at-ai-app-v142.js'),INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.18] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const HIST='/* AT AI Mobil - V16.9.1F60.94.31.11 FOGD historical calibration center */',HIST_END='window.ATFogdHistoryCalibrationF60943111=';

function replaceScoped(startToken,nextToken,replacement,label){
  const a=app.indexOf(HIST),b=app.indexOf(HIST_END,a),s=app.indexOf(startToken,a),e=app.indexOf(nextToken,s+startToken.length);
  if(a<0||b<0||s<0||e<0||s>=b||e>b)throw new Error('[F60.94.31.18] '+label+' target missing');
  app=app.slice(0,s)+replacement+'\n'+app.slice(e);
}

function fogdCityIdF738(city){
  const ids={ADANA:1,IZMIR:2,ISTANBUL:3,BURSA:4,ANKARA:5,SANLIURFA:6,ELAZIG:7,DIYARBAKIR:8,KOCAELI:9,ANTALYA:10};
  return ids[fold(city)]||null;
}
async function fogdLocalOneF738(name,store,key){
  const db=await openExisting(name);
  if(!db||!db.objectStoreNames.contains(store)){try{db?.close()}catch{}return null}
  return new Promise(resolve=>{
    let settled=false;
    const done=v=>{if(settled)return;settled=true;clearTimeout(timer);try{db.close()}catch{}resolve(v||null)};
    const timer=setTimeout(()=>done(null),4500);
    try{const tx=db.transaction(store,'readonly'),q=tx.objectStore(store).get(key);q.onsuccess=()=>done(q.result||null);q.onerror=()=>done(null);tx.onabort=()=>done(null)}catch{done(null)}
  });
}
async function fogdLocalByIndexF738(name,store,indexName,value){
  const db=await openExisting(name);
  if(!db||!db.objectStoreNames.contains(store)){try{db?.close()}catch{}return[]}
  return new Promise(resolve=>{
    const out=[];let settled=false;
    const done=()=>{if(settled)return;settled=true;clearTimeout(timer);try{db.close()}catch{}resolve(out)};
    const timer=setTimeout(done,6500);
    try{
      const os=db.transaction(store,'readonly').objectStore(store),idx=os.indexNames.contains(indexName)?os.index(indexName):null,req=idx?idx.openCursor(IDBKeyRange.only(value)):os.openCursor();
      req.onsuccess=()=>{const c=req.result;if(!c)return done();const row=c.value;if(idx||String(row?.[indexName])===String(value)||String(row?.value?.[indexName])===String(value))out.push(row);c.continue()};
      req.onerror=done;req.transaction.oncomplete=done;req.transaction.onabort=done;
    }catch{done()}
  });
}
async function fogdLocalArchiveDatesF738(city,start,end){
  const year=Number(start.slice(0,4)),ck=fold(city),found=new Set();let indexed=false;
  const sources=[
    ['at_ai_tjk_annual_archive_v13','races',true],
    [RESULT_DB,RESULT_DAYS,false],
    ['at_ai_tjk_real_day_index_v2','days',false]
  ];
  for(const [db,store,wrapped] of sources){
    try{
      const rows=await fogdLocalByIndexF738(db,store,'year',year);
      for(const raw of rows){
        const r=wrapped?(raw?.value??raw):raw,date=clean(r?.date),c=clean(r?.city);
        if(fold(c)!==ck)continue;
        indexed=true;
        if(date>=start&&date<=end&&(store!=='days'||db!==RESULT_DB||Number(r?.raceCount)>0))found.add(date);
      }
    }catch(e){console.warn('[AT AI] F60.94.31.18 yerel tarih taraması',db,e?.message||e)}
  }
  return{dates:[...found].sort(),indexed};
}
async function discoverDays(city,start,end){
  setStatus(`Yerel arşiv taranıyor · ${city} · ${start} → ${end}`,2);
  const local=await fogdLocalArchiveDatesF738(city,start,end);
  if(local.indexed){
    setStatus(`Yerel arşiv hazır · ${local.dates.length} yarış günü · internet taraması yapılmayacak`,10);
    return local.dates;
  }
  const ck=fold(city),found=new Set();let cursor=end,loops=0,last='';
  setStatus('Yerel arşivde tarih indeksi yok · yalnız eksik gün listesi için internet taranıyor…',2);
  while(cursor>=start&&loops<420&&!stopRequested){
    loops++;
    const u=new URL(QUERY_API,location.origin);u.searchParams.set('start',start);u.searchParams.set('end',cursor);u.searchParams.set('page','0');
    const d=await fetchJson(u.pathname+u.search,35000,1),rows=Array.isArray(d?.rows)?d.rows:[];
    if(!rows.length)break;
    let oldest='9999-99-99';
    for(const r of rows){const date=clean(r?.date),c=clean(r?.city);if(!date)continue;if(date<oldest)oldest=date;if(date>=start&&date<=end&&fold(c)===ck)found.add(date)}
    if(oldest==='9999-99-99'||oldest<=start)break;
    const next=previousDay(oldest);if(next===cursor||cursor===last)break;last=cursor;cursor=next;
  }
  return[...found].sort();
}
async function loadHistoricalProgram(date,city){
  const ck=fold(city),dayKey=`day|${date}|${ck}`;
  let localDay=null,localRows=[];
  try{localDay=await fogdLocalOneF738(RESULT_DB,RESULT_DAYS,dayKey)}catch{}
  try{localRows=await fogdLocalByIndexF738(RESULT_DB,'races','date',date)}catch{}
  const localRecords=localRows.filter(x=>fold(x?.city)===ck&&x?.race&&Array.isArray(x.race?.horses)&&x.race.horses.length).sort((a,b)=>Number(a?.raceNo||a?.race?.no)-Number(b?.raceNo||b?.race?.no));
  if(localRecords.length){
    const races=localRecords.map(x=>x.race),cid=localDay?.cityId||localRecords.find(x=>x?.cityId)?.cityId||fogdCityIdF738(city)||ck,cities=[{id:String(cid),name:city}];
    try{state.date=date;state.cities=cities;state.city=String(cid);state.races=races;state.selectedRace='all';state.tickets=[];state.analyses.current={};state.analyses.career={};if($('analysisRace'))$('analysisRace').value='all'}catch(e){throw new Error('Yerel geçmiş program durumu hazırlanamadı: '+(e?.message||e))}
    setStatus(`${date} ${city} · program yerel arşivden · ${races.length} koşu`);
    return{cityId:cid,races,source:'local',localDay};
  }
  setStatus(`${date} ${city} · yerel arşivde program/sonuç eksik · internetten tamamlanıyor…`);
  const d=await fetchJson(`${PROGRAM_API}?date=${encodeURIComponent(date)}&t=${Date.now()}`,35000,1),cities=Array.isArray(d?.cities)?d.cities:[],target=cities.find(c=>fold(c?.name)===ck);
  if(!target)throw new Error(`${date} tarihinde ${city} programı yok.`);
  let races=[];try{races=typeof getCurrentRaceList==='function'?getCurrentRaceList(d,target.id):((d?.racesByCity?.[String(target.id)]||d?.racesByCity?.[Number(target.id)]||[]))}catch{races=[]}
  if(typeof enrichProgramRaceMeta==='function')races=await enrichProgramRaceMeta(races);
  if(!Array.isArray(races)||!races.length)throw new Error(`${date} ${city}: koşu bulunamadı.`);
  try{state.date=date;state.cities=cities;state.city=String(target.id);state.races=races;state.selectedRace='all';state.tickets=[];state.analyses.current={};state.analyses.career={};if($('analysisRace'))$('analysisRace').value='all'}catch(e){throw new Error('Geçmiş program durumu hazırlanamadı: '+(e?.message||e))}
  return{cityId:target.id,races,source:'network',localDay:null};
}
async function computeDay(date,city,{force=false}={}){
  const isolated=snapshotState();window.__AT_FOGD_HISTORY_ISOLATED__=true;
  try{
    setStatus(`${date} ${city} · yerel arşiv kontrol ediliyor…`);
    const loaded=await loadHistoricalProgram(date,city),archive=window.ATArchiveActualAutoCalF6094317;
    if(loaded.source!=='local'&&archive?.fetchAndSaveDay){setStatus(`${date} ${city} · eksik gerçek sonuç internetten tamamlanıyor…`);await archive.fetchAndSaveDay(date,city,loaded.cityId,{markDay:true})}
    if(typeof gRunCurrentV1657==='function'){setStatus(`${date} ${city} · Güncel Analiz / D hazırlanıyor · ${loaded.source==='local'?'yerel program':'internet yedeği'}…`);await gRunCurrentV1657()}
    const fogd=window.ATFogdScoreCenterF609431;if(!fogd?.compute)throw new Error('FOGD motoru hazır değil.');
    let done=0;
    for(const r of loaded.races){
      if(stopRequested)break;
      const no=Number(r?.no||r?.raceNo||0);if(!no)continue;
      if(!force&&await scoreExists(date,city,no)){done++;continue}
      setStatus(`${date} ${city} · ${no}. Koşu FOGD ${done+1}/${loaded.races.length} · ${loaded.source==='local'?'yerel arşiv':'internet yedeği'}`);
      await fogd.compute(no);
      if(!(await scoreExists(date,city,no)))throw new Error(`${date} ${city} ${no}. Koşu FOGD kaydı oluşmadı.`);
      done++;await sleep(0);
    }
    if(stopRequested)return{complete:false,races:done,source:loaded.source};
    return{complete:await dayFullyScored(date,city,loaded.races),races:done,source:loaded.source};
  }finally{window.__AT_FOGD_HISTORY_ISOLATED__=false;restoreState(isolated)}
}

const helpers="const FOGD_LOCAL_FIRST_F738=true;\n"+fogdCityIdF738.toString()+"\n"+fogdLocalOneF738.toString()+"\n"+fogdLocalByIndexF738.toString()+"\n"+fogdLocalArchiveDatesF738.toString()+"\n"+discoverDays.toString();
replaceScoped('async function discoverDays(city,start,end){','function cityOptionList(){',helpers,'discoverDays');
replaceScoped('async function loadHistoricalProgram(date,city){','async function dayFullyScored(date,city,races){',loadHistoricalProgram.toString(),'loadHistoricalProgram');
replaceScoped('async function computeDay(date,city,{force=false}={}){','async function calibrateNow(){',computeDay.toString(),'computeDay');

app=app.replaceAll('F60.94.31.17','F60.94.31.18');
app=app.replace('<small>F60.94.31.11</small><h2 style="margin:2px 0 0">FOGD Geçmiş Kalibrasyon Merkezi</h2>','<small>F60.94.31.18 · LOCAL-FIRST</small><h2 style="margin:2px 0 0">FOGD Geçmiş Kalibrasyon Merkezi</h2>');
app=app.replace('İl + yıl + tarih aralığı seçin. Her yarış günü tamamlandıkça ilerleme kalıcı olarak kaydedilir.','İl + yıl + tarih aralığı seçin. Önce telefon arşivi kullanılır; yalnız arşivde eksik gün varsa internet yedeğine geçilir. Her yarış günü tamamlandıkça ilerleme kalıcı olarak kaydedilir.');
for(const token of['FOGD_LOCAL_FIRST_F738','program yerel arşivden','internet taraması yapılmayacak',"loaded.source!=='local'",'FOGD-HISTORY-CALIBRATION-V16.9.1F60.94.31.11'])if(!app.includes(token))throw new Error('[F60.94.31.18] invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692988').replaceAll('F60.94.31.17','F60.94.31.18');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692988'))throw new Error('[F60.94.31.18] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.18 build complete: FOGD local-first; network only for archive gaps.');
