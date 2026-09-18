;(() => {
'use strict';
if(window.__AT_CAREER_RESPONSIVE_SCORING_F60943__)return;
window.__AT_CAREER_RESPONSIVE_SCORING_F60943__=true;

const VERSION='CAREER-RESPONSIVE-SCORING-V16.9.1F60.94.3';
const CAREER_CONCURRENCY=4;
const ROADMAP_CONCURRENCY=3;
const SCORE_YIELD_EVERY=1;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const now=()=>{try{return performance.now()}catch{return Date.now()}};
const nextFrame=()=>new Promise(resolve=>{
  try{
    if(typeof document!=='undefined'&&document.visibilityState!=='visible')return setTimeout(resolve,0);
    if(typeof requestAnimationFrame==='function'){
      let done=false;
      const fallback=setTimeout(()=>{if(done)return;done=true;resolve()},100);
      requestAnimationFrame(()=>{if(done)return;done=true;clearTimeout(fallback);resolve()});
      return;
    }
  }catch{}
  setTimeout(resolve,0);
});

async function localMapLimit(items,limit,worker){
  const list=Array.isArray(items)?items:[];
  if(!list.length)return[];
  const out=new Array(list.length);let cursor=0;
  async function run(){
    while(true){
      const i=cursor++;if(i>=list.length)return;
      out[i]=await worker(list[i],i);
    }
  }
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),list.length)},()=>run()));
  return out;
}

function contentEl(){try{return document.getElementById('analysisContent')}catch{return null}}
function esc(v){try{return typeof escapeHtml==='function'?escapeHtml(v):String(v??'')}catch{return String(v??'')}}
function setProgress(title,detail,sub=''){
  const content=contentEl();if(!content)return;
  content.classList.remove('empty');
  content.innerHTML=`<div style="padding:15px;line-height:1.55"><div style="font-size:18px;font-weight:800;margin-bottom:12px">${esc(title)}</div><div style="font-size:15px">${detail}</div>${sub?`<div style="margin-top:10px;font-size:11px;opacity:.68">${esc(sub)}</div>`:''}</div>`;
}
function contextSnapshot(){
  let cityName='';try{cityName=typeof getCityName==='function'?getCityName():''}catch{}
  return{date:String(state?.date||''),city:String(state?.city||''),cityName:String(cityName||'')};
}
function sameContext(start){return String(state?.date||'')===start.date&&String(state?.city||'')===start.city}
function contextError(){return new Error('Analiz sırasında tarih/şehir değişti. Eski hesap yeni güne yazılmadı.')}

function mergeWithPrevious(calculatedRaces,raceValue,previous){
  if(raceValue==='all')return calculatedRaces;
  try{
    if(typeof isValidCareerCache==='function'&&isValidCareerCache(previous)){
      const map=new Map((previous.races||[]).map(r=>[String(r.no),r]));
      for(const race of calculatedRaces)map.set(String(race.no),race);
      return Array.from(map.values()).sort((a,b)=>Number(a.no)-Number(b.no));
    }
  }catch{}
  return calculatedRaces;
}

if(typeof runCareerAnalysis==='function'){
  runCareerAnalysis=async function(selectedRaces,raceValue){
    const content=contentEl();if(!content)return null;
    const racesToRun=Array.isArray(selectedRaces)?selectedRaces:[];
    const start=contextSnapshot();
    const runStarted=now();
    const timings=[];
    const horsesToLoad=[];
    for(const race of racesToRun){
      for(const horse of(Array.isArray(race?.horses)?race.horses:[]))horsesToLoad.push({raceNo:race.no,horse});
    }
    if(!horsesToLoad.length){content.innerHTML='Seçilen koşularda at bulunamadı.';return null}

    setProgress('Kariyer yol haritaları alınıyor…',`<b>${horsesToLoad.length}</b> at · ${CAREER_CONCURRENCY} paralel istek`,'F60.94.3: hesap formülü değişmedi; uzun işlemlerde telefon arayüzüne düzenli işlem sırası bırakılır.');
    let careerDone=0;
    const loaded=await localMapLimit(horsesToLoad,CAREER_CONCURRENCY,async item=>{
      if(!sameContext(start))throw contextError();
      const t0=now();
      const career=await fetchCareer(item.horse.id,start.date);
      timings.push({stage:'career',raceNo:item.raceNo,horseId:item.horse.id,ms:Math.round(now()-t0)});
      careerDone++;
      if(careerDone===horsesToLoad.length||careerDone%2===0)setProgress('Kariyer yol haritaları alınıyor…',`${careerDone} / ${horsesToLoad.length} at tamamlandı`);
      return{...item,career};
    });
    if(!sameContext(start))throw contextError();

    setProgress('Tarihsel koşular hazırlanıyor…',`${racesToRun.length} koşu · ${ROADMAP_CONCURRENCY} güvenli paralel istek`);
    let roadmapDone=0;
    const roadmapRows=await localMapLimit(racesToRun,ROADMAP_CONCURRENCY,async race=>{
      if(!sameContext(start))throw contextError();
      const meta=typeof programRaceMeta==='function'?programRaceMeta(race):{ok:true,class:race?.class||'',ageGroup:race?.ageGroup||'',distance:race?.distance||'',track:race?.track||''};
      const t0=now();
      const roadmap=meta?.ok?await fetchHistoricalRoadmap(meta):{ok:false,error:meta?.error||'Günlük programda bu koşunun şartları eksik.'};
      timings.push({stage:'roadmap',raceNo:race.no,ms:Math.round(now()-t0),historicalRaceCount:Array.isArray(roadmap?.historicalRaces)?roadmap.historicalRaces.length:0,ok:!!roadmap?.ok});
      roadmapDone++;
      setProgress('Tarihsel koşular hazırlanıyor…',`${roadmapDone} / ${racesToRun.length} koşu tamamlandı`);
      return{race,meta,roadmap};
    });
    if(!sameContext(start))throw contextError();

    const calculatedRaces=[];
    const totalScoreHorses=loaded.length;
    let scoredHorses=0,raceDone=0;
    for(const row of roadmapRows){
      if(!sameContext(start))throw contextError();
      const race=row.race,meta=row.meta,roadmap=row.roadmap;
      const currentRaceLoaded=loaded.filter(x=>x&&Number(x.raceNo)===Number(race.no));
      const raceHorses=[];
      setProgress('Tarihsel veriler puanlanıyor…',`${raceDone+1} / ${racesToRun.length} koşu · ${scoredHorses} / ${totalScoreHorses} at`,'Bu aşama telefonda yapılan benzerlik hesabıdır; her at sonrası arayüze işlem sırası bırakılır.');
      await nextFrame();

      for(const x of currentRaceLoaded){
        if(!sameContext(start))throw contextError();
        const career=normalizeCareerResponse(x.career||{});
        const t0=now();
        const similarity=roadmap?.ok?calculateGalibiyetBenzerligi(career.roadmap,roadmap):{score:null,matchedHistoricalHorse:null,matchedHistoricalRace:null,referenceCount:0};
        const scoreMs=Math.round(now()-t0);
        timings.push({stage:'score',raceNo:race.no,horseId:x.horse.id,horseName:x.horse.name,ms:scoreMs,referenceCount:Number(similarity?.referenceCount||0)});
        raceHorses.push({horse:x.horse,career,galibiyetBenzerligi:similarity});
        scoredHorses++;
        if(scoredHorses%SCORE_YIELD_EVERY===0){
          const slow=scoreMs>=1000?` · son at ${scoreMs} ms`:'';
          setProgress('Tarihsel veriler puanlanıyor…',`${raceDone+1} / ${racesToRun.length} koşu · ${scoredHorses} / ${totalScoreHorses} at${slow}`,'Hesap devam ediyor; ağ isteği bittikten sonra da puanlama ilerlemesi burada görünür.');
          await nextFrame();
        }
      }

      calculatedRaces.push({
        no:race.no,
        class:race.class||meta?.class||'',
        ageGroup:race.ageGroup||meta?.ageGroup||'',
        distance:race.distance||meta?.distance||'',
        track:race.track||meta?.track||'',
        meta:meta?.ok?meta:null,
        roadmapVersion:roadmap?.version||null,
        historicalRaceCount:Array.isArray(roadmap?.historicalRaces)?roadmap.historicalRaces.length:0,
        roadmapError:roadmap?.ok?null:(roadmap?.error||'Tarihsel referans bulunamadı.'),
        horses:raceHorses
      });
      raceDone++;
      await sleep(0);
    }

    if(!sameContext(start))throw contextError();
    const previous=state.analyses?.career;
    const mergedRaces=mergeWithPrevious(calculatedRaces,raceValue,previous);
    const result={
      type:'career',
      version:typeof CAREER_UI_VERSION!=='undefined'?CAREER_UI_VERSION:'CAREER-UI-V5.1',
      careerApiVersion:'CAREER-ROADMAP-V8',
      roadmapApiVersion:'TJK-ROADMAP-V3',
      raceMetaApiVersion:'PROGRAM-DIRECT-V5.1-NO-RACE-META',
      date:start.date,
      city:start.city,
      cityName:start.cityName,
      coverage:raceValue==='all'?'all':(previous?.coverage==='all'?'all':'partial'),
      calculatedRace:raceValue,
      rule:'SADECE_ILK_5_VE_YARIS_TARIHINDEN_ONCE',
      similarityMethod:'ORDERED_CAREER_PATH_MATCH_V1',
      similarityNote:'Galibiyet Benzerliği tarihsel ilk 3 kariyer yoluna benzerlik yüzdesidir; kalibre edilmiş kazanma olasılığı değildir.',
      races:mergedRaces,
      generatedAt:new Date().toISOString(),
      responsiveRuntimeVersion:VERSION,
      responsiveDiagnostics:{totalMs:Math.round(now()-runStarted),careerConcurrency:CAREER_CONCURRENCY,roadmapConcurrency:ROADMAP_CONCURRENCY,timings}
    };

    state.analyses.career=result;
    try{save()}catch{}
    if(typeof renderCareerAnalysis==='function')renderCareerAnalysis(result,raceValue);

    try{
      const archiveApi=window.ATCareerArchiveScoreGuardV1691F33;
      if(archiveApi?.archive)await archiveApi.archive(result,racesToRun,raceValue,'f60-94-3-responsive-runtime');
      if(archiveApi?.prepare)await archiveApi.prepare('f60-94-3-responsive-runtime-complete');
    }catch(error){console.warn('[AT AI]',VERSION,'archive completion failed',error)}

    console.info('[AT AI]',VERSION,'completed',{date:start.date,city:start.city,races:racesToRun.length,horses:totalScoreHorses,totalMs:result.responsiveDiagnostics.totalMs,slowest:timings.filter(x=>x.stage==='score').sort((a,b)=>b.ms-a.ms).slice(0,5)});
    return result;
  };
}

window.ATCareerResponsiveScoringF60943={version:VERSION,careerConcurrency:CAREER_CONCURRENCY,roadmapConcurrency:ROADMAP_CONCURRENCY,scoreYieldEvery:SCORE_YIELD_EVERY};
console.info('[AT AI]',VERSION,'aktif — F60.54 hesap formülü korunur; F31 benzeri UI yield ve güvenli roadmap paralelliği geri yüklendi.');
})();
