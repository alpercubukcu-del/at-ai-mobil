const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v16911.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PATCH = path.join(ROOT, 'five-model-main-thread-yield-v16912.js');

for (const file of [BASE, PATCH]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.12] Eksik dosya: ${path.basename(file)}`);
}
execFileSync(process.execPath, [BASE], { cwd:ROOT, stdio:'inherit' });
for (const file of [APP, INDEX]) {
  if (!fs.existsSync(file)) throw new Error(`[V16.9.12] Build sonrası eksik dosya: ${path.relative(ROOT,file)}`);
}

let app = fs.readFileSync(APP, 'utf8');
const patch = fs.readFileSync(PATCH, 'utf8');
function mustReplacePattern(label, pattern, replacement) {
  if (!pattern.test(app)) throw new Error(`[V16.9.12] Fonksiyon yaması uygulanamadı: ${label}`);
  app = app.replace(pattern, replacement);
}

/* Eski koşu-bazlı sessionStorage sonucu küçük olsa bile JSON.parse senkrondur.
   5 Model'in kalıcı kaynağı artık V16.9.11 kompakt IndexedDB arşividir. */
mustReplacePattern(
  'senkron model sessionStorage okumasını kapatma',
  /function persisted\(k\)\{[\s\S]*?\n\}\nfunction trimIndex/,
  `function persisted(k){return null;}
function trimIndex`
);
mustReplacePattern(
  'model sessionStorage yazmasını kapatma',
  /function schedulePersist\(k,d\)\{[\s\S]*?\n\}\nfunction manualFor/,
  `function schedulePersist(k,d){return false;}
function manualFor`
);

/* Orijinal motor, bütün atların 1/2/3 derece ve beş kanal puanlarını tek map
   içinde bitiriyordu. Aynı formül fonksiyonları korunur; her kanal sonrasında
   setTimeout(0) ile dokunma/kaydırma kuyruğuna sıra verilir. */
mustReplacePattern(
  '5 Model puanlamasını parçalara ayırma',
  /async function prepareRaceModelsV11\(race,progress\)\{[\s\S]*?\}function scoreObjectForModelV11/,
  `function notifyFiveModelChunkV16912(detail){
  try{document.dispatchEvent(new CustomEvent('at-five-model-chunk-v16912',{detail:detail||{}}));}catch{}
}
function yieldFiveModelV16912(detail){
  notifyFiveModelChunkV16912(detail);
  return new Promise(resolve=>setTimeout(resolve,0));
}
async function prepareRaceModelsV11(race,progress){
  if(progress)progress('Koşu '+race.no+': bağımsız tarihsel modeller hazırlanıyor…');
  notifyFiveModelChunkV16912({phase:'network',done:0,total:1,label:'Tarihsel veriler bekleniyor; arayüz kullanılabilir'});
  const roadmapPromise=fetchModelRoadmapV11(race);
  const horseList=Array.isArray(race.horses)?race.horses:[];
  const careersPromise=mapLimitV11(horseList,3,horse=>loadCareerForHorseV11(race.no,horse));
  const results=await Promise.all([roadmapPromise,careersPromise]);
  const roadmap=results[0],careers=results[1];
  const horses=[];
  const stepsPerHorse=16;
  const total=Math.max(1,horseList.length*stepsPerHorse);
  let done=0;
  const allHistorical=roadmap?.ok?uniqueHistoricalRacesV11(roadmap?.models||{}):[];
  async function step(label,work){
    const value=work();
    done++;
    await yieldFiveModelV16912({phase:'scoring',done,total,label});
    return value;
  }
  for(let index=0;index<horseList.length;index++){
    const horse=horseList[index];
    const career=careers[index]||{ok:false,roadmap:[],analysisMode:'DEBUT'};
    let scores;
    if(roadmap?.ok){
      const prefix=(index+1)+'/'+horseList.length+' at';
      const exact=await step(prefix+' · Tam model',()=>scoreRowsV11(career,roadmap?.models?.EXACT||[],true));
      const twin=await step(prefix+' · İkiz model',()=>scoreRowsV11(career,roadmap?.models?.CONDITION_TWIN||[],true));
      const family=await step(prefix+' · Aile model',()=>scoreRowsV11(career,roadmap?.models?.RACE_FAMILY||[],true));
      const careerPath=await step(prefix+' · Kariyer model',()=>scoreRowsV11(career,allHistorical,false));
      const composite=compositeScoreV11({exact,twin,family,career:careerPath});
      const byFinish={};
      for(const finish of [1,2,3]){
        const finishExact=await step(prefix+' · '+finish+'. sıra Tam',()=>scoreFinishRowsPodiumV115(career,roadmap?.models?.EXACT||[],finish,true));
        const finishTwin=await step(prefix+' · '+finish+'. sıra İkiz',()=>scoreFinishRowsPodiumV115(career,roadmap?.models?.CONDITION_TWIN||[],finish,true));
        const finishFamily=await step(prefix+' · '+finish+'. sıra Aile',()=>scoreFinishRowsPodiumV115(career,roadmap?.models?.RACE_FAMILY||[],finish,true));
        const finishCareer=await step(prefix+' · '+finish+'. sıra Kariyer',()=>scoreFinishRowsPodiumV115(career,allHistorical,finish,false));
        const finishComposite=weightedCompositePodiumV115({exact:finishExact,twin:finishTwin,family:finishFamily,career:finishCareer},true);
        byFinish[finish]={
          targetFinish:Number(finish),analysisMode:modePodiumV115(career),
          exact:finishExact,twin:finishTwin,family:finishFamily,career:finishCareer,
          composite:{...finishComposite,rawScore:finishComposite.score}
        };
      }
      scores={exact,twin,family,career:careerPath,composite,analysisMode:analysisModeV11(career),podiumSimilarityVersion:PODIUM_SIMILARITY_V115,byFinish};
    }else{
      scores={exact:{score:null},twin:{score:null},family:{score:null},career:{score:null},composite:{score:null,present:[],missing:['exact','twin','family','career']},analysisMode:analysisModeV11(career)};
      done+=stepsPerHorse;
      await yieldFiveModelV16912({phase:'scoring',done,total,label:(index+1)+'/'+horseList.length+' at · tarihsel veri yok'});
    }
    horses.push({horse,careerOk:Boolean(career?.ok),careerError:career?.error||null,scores});
  }
  return{no:race.no,roadmapOk:Boolean(roadmap?.ok),roadmapError:roadmap?.error||null,modelCounts:roadmap?.counts||{},horses};
}
function scoreObjectForModelV11`
);

app += `\n${patch}\n`;
for (const token of [
  'FIVE-MODEL-MAIN-THREAD-YIELD-V16.9.12',
  'yieldFiveModelV16912',
  "new Promise(resolve=>setTimeout(resolve,0))",
  "scoreFinishRowsPodiumV115(career",
  "function persisted(k){return null;}",
  "function schedulePersist(k,d){return false;}",
  'data-fmr-background-v1697',
  'FIVE-MODEL-ARCHIVE-COMPACT-V16.9.11'
]) {
  if (!app.includes(token)) throw new Error(`[V16.9.12] Runtime doğrulaması başarısız: ${token}`);
}
if (app.includes("JSON.parse(sessionStorage.getItem(storageKey(k))")) {
  throw new Error('[V16.9.12] Senkron koşu-bazlı model sessionStorage okuması bundle içinde kaldı.');
}
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169120');
fs.writeFileSync(INDEX, html, 'utf8');
if (!html.includes('/at-ai-app-v142.js?v=169120')) throw new Error('[V16.9.12] cache-bust güncellenemedi.');

console.log('[AT AI] V16.9.12 build tamamlandı: 5 Model puanlama kanalları arasında mobil arayüze sıra verilir.');
