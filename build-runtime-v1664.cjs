const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1663.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const ADAPTIVE=path.join(ROOT,'api','tjk-adaptive-roadmap-v102.js');
const MODEL=path.join(ROOT,'api','tjk-model-roadmap-v11.js');

for(const f of [BASE]) if(!fs.existsSync(f)) throw new Error(`[V16.6.4] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
for(const f of [APP,INDEX,ADAPTIVE,MODEL]) if(!fs.existsSync(f)) throw new Error(`[V16.6.4] Build sonrası eksik dosya: ${path.relative(ROOT,f)}`);

/*
  1) Tarayıcıdaki yıllık arşiv hızlı yolunda Y kodu artık sınıf kimliğinden ATILMAZ.
     V15.7 normalizeClass zaten Y-0..Y-3 -> Y0..Y3 yapıyor.
     Burada Y2 ile Y-2 aynı kalırken Y1 ile Y2'nin yanlışlıkla aynı sayılması engellenir.
*/
let app=fs.readFileSync(APP,'utf8');
const classCoreOld=`function classCoreKey(v = '') {
  const normalized = normalizeClass(v);
  const family = parseRaceFamily(normalized);
  const suffix = normalized.split('/').slice(1)
    .map(x => clean(x).replace(/\\s+/g, ''))
    .filter(Boolean)
    .filter(x => !/^Y-?\\d+$/.test(x));
  return \`${'${family.family}'}:${'${family.level ?? \'\'}'}|${'${suffix.join(\'/\')}'}\`;
}`;
const classCoreNew=`function classCoreKey(v = '') {
  const normalized = normalizeClass(v);
  const family = parseRaceFamily(normalized);
  const suffix = normalized.split('/').slice(1)
    .map(x => clean(x).replace(/\\s+/g, ''))
    .filter(Boolean);
  return \`${'${family.family}'}:${'${family.level ?? \'\'}'}|${'${suffix.join(\'/\')}'}\`;
}`;
if(!app.includes(classCoreOld)) throw new Error('[V16.6.4] annual-roadmap classCoreKey bloğu bulunamadı.');
app=app.replace(classCoreOld,classCoreNew);
app=app.replace("classCoreNote:'Y-1/Y-2 gibi jokey alt şartları yarış ailesi çekirdeğinden çıkarılır'","classCoreNote:'Y0=Y-0, Y1=Y-1, Y2=Y-2, Y3=Y-3; Y kodu sınıf kimliğinde korunur'");
app += `\n;window.__AT_YAMAK_DATA_PIPELINE_V1664__={version:'V16.6.4',aliases:{Y0:'Y-0',Y1:'Y-1',Y2:'Y-2',Y3:'Y-3'},strict:true};\n`;
new Function(app);
fs.writeFileSync(APP,app,'utf8');

/*
  2) Sunucu tarihsel taraması: Yamaklı sınıflarda 2000->bugün tek dev sorgu yapılmıyor.
     Her tarihsel yıl hedef günün ±45 günü ayrı taranıyor. Böylece ŞARTLI 5/Y2 gibi
     bir yarış ŞARTLI 5'in onlarca yıllık bütün kayıtlarını tek istekte taşıyıp timeout olmaz.
*/
let adaptive=fs.readFileSync(ADAPTIVE,'utf8');
const start=adaptive.indexOf('async function collectCandidateBuckets({target,filters,minYear,years})');
const end=adaptive.indexOf('\n\nfunction buildYearStates',start);
if(start<0||end<0) throw new Error('[V16.6.4] collectCandidateBuckets bloğu bulunamadı.');
const replacement=`function hasYamakDecoratorV1664(v=''){return/(?:^|\\/)Y[0-3](?:\\/|$)/.test(fullClassKey(v))}\nasync function collectCandidateBuckets({target,filters,minYear,years}){const buckets=new Map(years.map(y=>[y,new Map()])),diagnostics=[],modes=['SAME_CITY','CONDITION_TWIN'],isYamak=hasYamakDecoratorV1664(target.class);if(filters.raceClass&&!isYamak){const startIso=addDays(anchorIso(target.date,minYear),-DAY_WINDOW),endIso=addDays(target.date,-1),scans=await Promise.all(modes.map(mode=>fetchRange(target,filters,mode,startIso,endIso)));scans.forEach((scan,i)=>{diagnostics.push(...scan.diagnostics.map(d=>({queryMode:modes[i],scope:'FULL_RANGE',...d})));addRowsToBuckets({rows:scan.rows,target,minYear,buckets})});return{buckets,diagnostics,strategy:'FULL_RANGE_QUERY_VISIBLE_CLASS',broadQueries:2}}const yearConcurrency=isYamak?5:2;const perYear=await mapLimit(years,yearConcurrency,async year=>{const anchorDate=anchorIso(target.date,year),startIso=addDays(anchorDate,-DAY_WINDOW),endIso=addDays(anchorDate,DAY_WINDOW),scans=await Promise.all(modes.map(mode=>fetchRange(target,filters,mode,startIso,endIso)));return{year,scans}});for(const item of perYear)item.scans.forEach((scan,i)=>{diagnostics.push(...scan.diagnostics.map(d=>({year:item.year,queryMode:modes[i],scope:isYamak?'YEAR_YAMAK_ALIAS':'YEAR_FALLBACK',...d})));addRowsToBuckets({rows:scan.rows,target,minYear,buckets})});return{buckets,diagnostics,strategy:isYamak?'YEAR_WINDOW_YAMAK_ALIAS':'YEAR_WINDOW_FALLBACK',broadQueries:years.length*2}}`;
adaptive=adaptive.slice(0,start)+replacement+adaptive.slice(end);
adaptive=adaptive.replace("TJK-ADAPTIVE-ROADMAP-V10.3.1-YAMAK-ALIAS","TJK-ADAPTIVE-ROADMAP-V10.3.2-YAMAK-YEAR-WINDOW");
fs.writeFileSync(ADAPTIVE,adaptive,'utf8');

/* 3) V11 iç çağrısı yeni yıl-pencereli taramaya yeterli süre tanısın; istemci 130 sn hard limitin altında kalır. */
let model=fs.readFileSync(MODEL,'utf8');
if(!model.includes('fetchJson(sourceUrl.toString(),90000,1)')) throw new Error('[V16.6.4] V11 source timeout satırı bulunamadı.');
model=model.replace('fetchJson(sourceUrl.toString(),90000,1)','fetchJson(sourceUrl.toString(),112000,1)');
model=model.replace("TJK-MODEL-ROADMAP-V11.13-YAMAK-ALIAS","TJK-MODEL-ROADMAP-V11.14-YAMAK-YEAR-WINDOW");
fs.writeFileSync(MODEL,model,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16640');
fs.writeFileSync(INDEX,html,'utf8');

console.log('[AT AI] V16.6.4 build tamamlandı: Y0=Y-0, Y1=Y-1, Y2=Y-2, Y3=Y-3; Y kodu korunur; yamaklı tarihsel tarama yıl bazlı ±45 gün çalışır.');
