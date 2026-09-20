const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f731.cjs');
const MOD=path.join(ROOT,'archive-exact-date-range-v1691f732.js');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.12] missing '+path.basename(BASE));
if(!fs.existsSync(MOD))throw new Error('[F60.94.31.12] missing '+path.basename(MOD));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');
const anchor="window.ATRealRaceArchiveF6093={version:VERSION,syncYear,syncYears,syncRecent,refresh:refreshUi,cityId};";
if(!app.includes(anchor))throw new Error('[F60.94.31.12] real-race export anchor missing');
const inject=`
async function syncRangeExactF60943112(start0,end0,{mode='download',label='Seçili tarih aralığı'}={}){
  if(busy)return{busy:true,races:0,groups:0,errors:0,skipped:0};
  let start=clean(start0),end=clean(end0);
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(start)||!/^\\d{4}-\\d{2}-\\d{2}$/.test(end))throw new Error('Geçerli başlangıç ve bitiş tarihi seçin.');
  if(start>end)[start,end]=[end,start];
  const today=todayIso();if(start>today)throw new Error('Gelecek tarih indirilemez.');if(end>today)end=today;
  busy=true;toggleButtons(true);
  try{
    setStatus(\`${'${start}'} → ${'${end}'} Koşu Sorgulama exact-date taraması başlıyor…\`,0);
    await indexRange(start,end,{label,resumeKey:\`range:${'${start}'}:${'${end}'}\`});
    const ya=Number(start.slice(0,4)),yb=Number(end.slice(0,4)),all=[];
    for(let y=ya;y<=yb;y++)all.push(...await byYear(y));
    const rows=[...new Map(all.filter(r=>r?.date>=start&&r?.date<=end).map(r=>[r.key||\`${'${r.date}'}|${'${r.cityKey||fold(r.city)}'}|${'${Number(r.raceNo)||0}'}\`,r])).values()];
    const groups=groupsFromRows(rows);
    if(!groups.length){
      await dbPut(openIndexDb,INDEX_META,{key:\`range:${'${start}'}:${'${end}'}:summary\`,start,end,status:'empty',raceCount:0,dayCityCount:0,errorCount:0,mode,updatedAt:new Date().toISOString(),version:'V16.9.1F60.94.31.12'});
      setStatus(\`${'${start}'} → ${'${end}'} aralığında gerçekleşmiş yarış bulunmadı.\`,100);
      return{start,end,races:0,groups:0,errors:0,skipped:0};
    }
    const result=await downloadGroups(groups,{label:\`${'${label}'} · ${'${start}'} → ${'${end}'}\`});
    const status=result.errors?'partial':'complete';
    const summary={key:\`range:${'${start}'}:${'${end}'}:summary\`,start,end,status,raceCount:rows.length,dayCityCount:groups.length,errorCount:result.errors,skipped:result.skipped,mode,updatedAt:new Date().toISOString(),version:'V16.9.1F60.94.31.12'};
    await dbPut(openIndexDb,INDEX_META,summary);
    await dbPut(openResultDb,RESULT_META,{...summary,key:\`range:${'${start}'}:${'${end}'}\`,source:'KOSU_SORGULAMA_REAL_ARCHIVE'});
    await dbPut(openIndexDb,INDEX_META,{key:'auto:enabled',enabled:true,updatedAt:new Date().toISOString()});
    try{await window.ATAnnualResultsArchiveV661?.refresh?.()}catch{}await refreshUi();
    const skippedText=result.skipped?\` · ${'${result.skipped}'} mevcut gün atlandı\`:'';
    const errorText=result.errors?\` · ${'${result.errors}'} hata\`:'';
    setStatus(\`${'${start}'} → ${'${end}'} tamamlandı · ${'${rows.length}'} yarış · ${'${groups.length}'} gün/şehir${'${skippedText}'}${'${errorText}'}\`,100);
    return{start,end,races:rows.length,groups:groups.length,errors:result.errors,skipped:result.skipped,done:result.done,status};
  }finally{busy=false;toggleButtons(false)}
}
window.ATRealRaceArchiveF6093={version:VERSION,syncYear,syncYears,syncRange:syncRangeExactF60943112,syncRecent,refresh:refreshUi,cityId};`;
app=app.replace(anchor,inject);
const mod=fs.readFileSync(MOD,'utf8');
if(app.includes('__AT_ARCHIVE_EXACT_DATE_F60943112__'))throw new Error('[F60.94.31.12] exact-date patch already present');
app+='\n\n'+mod.trim()+'\n';
for(const token of[
 'FOGD-HISTORY-CALIBRATION-V16.9.1F60.94.31.11',
 'syncRange:syncRangeExactF60943112',
 'ARCHIVE-EXACT-DATE-V16.9.1F60.94.31.12',
 'Seçili Tarih Aralığını İndir / Kaldığı Yerden Devam Et',
 'Seçili Tarih Aralığındaki Eksikleri Güncelle',
 'Seçili Tarih Aralığını Bir Kez İndir',
 'Koşu Sorgulama taraması',
 'yıl başına dönülmeyecek'
])if(!app.includes(token))throw new Error('[F60.94.31.12] bundle invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692982');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692982'))throw new Error('[F60.94.31.12] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.12 build complete: menu 8 uses exact inclusive date ranges for real results and track/maintenance/weather.');
