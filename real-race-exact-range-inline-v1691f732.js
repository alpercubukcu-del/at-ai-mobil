async function syncRangeExactF60943112(start0,end0,{mode='download',label='Seçili tarih aralığı'}={}){
  if(busy)return{busy:true,races:0,groups:0,errors:0,skipped:0};
  let start=clean(start0),end=clean(end0);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))throw new Error('Geçerli başlangıç ve bitiş tarihi seçin.');
  if(start>end)[start,end]=[end,start];
  const today=todayIso();
  if(start>today)throw new Error('Gelecek tarih indirilemez.');
  if(end>today)end=today;
  busy=true;toggleButtons(true);
  try{
    setStatus(`${start} → ${end} Koşu Sorgulama tarih taraması başlıyor…`,0);
    await indexRange(start,end,{label,resumeKey:`range:${start}:${end}`});
    const ya=Number(start.slice(0,4)),yb=Number(end.slice(0,4)),all=[];
    for(let y=ya;y<=yb;y++)all.push(...await byYear(y));
    const rows=[...new Map(all.filter(r=>r?.date>=start&&r?.date<=end).map(r=>[r.key||`${r.date}|${r.cityKey||fold(r.city)}|${Number(r.raceNo)||0}`,r])).values()];
    const groups=groupsFromRows(rows);
    if(!groups.length){
      await dbPut(openIndexDb,INDEX_META,{key:`range:${start}:${end}:summary`,start,end,status:'empty',raceCount:0,dayCityCount:0,errorCount:0,mode,updatedAt:new Date().toISOString(),version:'V16.9.1F60.94.31.12'});
      setStatus(`${start} → ${end} aralığında gerçekleşmiş yarış bulunmadı.`,100);
      return{start,end,races:0,groups:0,errors:0,skipped:0};
    }
    const result=await downloadGroups(groups,{label:`${label} · ${start} → ${end}`});
    const status=result.errors?'partial':'complete';
    const summary={key:`range:${start}:${end}:summary`,start,end,status,raceCount:rows.length,dayCityCount:groups.length,errorCount:result.errors,skipped:result.skipped,mode,updatedAt:new Date().toISOString(),version:'V16.9.1F60.94.31.12'};
    await dbPut(openIndexDb,INDEX_META,summary);
    await dbPut(openResultDb,RESULT_META,{...summary,key:`range:${start}:${end}`,source:'KOSU_SORGULAMA_REAL_ARCHIVE'});
    await dbPut(openIndexDb,INDEX_META,{key:'auto:enabled',enabled:true,updatedAt:new Date().toISOString()});
    try{await window.ATAnnualResultsArchiveV661?.refresh?.()}catch{}
    await refreshUi();
    const skippedText=result.skipped?` · ${result.skipped} mevcut gün atlandı`:'';
    const errorText=result.errors?` · ${result.errors} hata`:'';
    setStatus(`${start} → ${end} tamamlandı · ${rows.length} yarış · ${groups.length} gün/şehir${skippedText}${errorText}`,100);
    return{start,end,races:rows.length,groups:groups.length,errors:result.errors,skipped:result.skipped,done:result.done,status};
  }finally{
    busy=false;toggleButtons(false);
  }
}
