(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.ATF6062Core=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const VERSION='CALENDAR-MULTIFILTER-CORE-V16.9.1F60.62';
  const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
  const trackKey=v=>{const x=fold(v);if(x.includes('CIM'))return'CIM';if(x.includes('KUM'))return'KUM';if(x.includes('SENTETIK'))return'SENTETIK';return x};
  const isoDate=v=>{const s=clean(v);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);if(m)return`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;return''};
  const displayDate=v=>{const s=isoDate(v);if(!s)return clean(v);const [y,m,d]=s.split('-');return`${d}/${m}/${y}`};
  function normalizeRange(a,b,upper=''){
    let start=isoDate(a),end=isoDate(b),cap=isoDate(upper);
    if(!start&&end)start=end;if(!end&&start)end=start;
    if(start&&end&&start>end)[start,end]=[end,start];
    if(cap&&end&&end>cap)end=cap;
    if(cap&&start&&start>cap)start=cap;
    if(start&&end&&start>end)start=end;
    return{start,end};
  }
  function asSet(v,normalizer=x=>clean(x)){
    if(v instanceof Set)return new Set([...v].map(normalizer).filter(Boolean));
    return new Set((Array.isArray(v)?v:[]).map(normalizer).filter(Boolean));
  }
  function any(set,value,normalizer=x=>clean(x)){return!set.size||set.has(normalizer(value))}
  function classValue(r){return clean(r?.classKey)||fold(r?.classRaw??r?.class??r?.raceClass??r?.yaradi1)}
  function groupValue(r){return fold(r?.groupRaw??r?.ageGroup??r?.group??r?.yaradi2)}
  function distanceValue(r){return Number(r?.distance??r?.mesafe??0)||0}
  function cityValue(r){return fold(r?.city??r?.cityName??r?.il)}
  function trackValue(r){return trackKey(r?.track??r?.pist)}
  function rowPasses(row,filters={}){
    const range=normalizeRange(filters.startDate,filters.endDate);
    const d=isoDate(row?.date);
    if(range.start&&d<range.start)return false;if(range.end&&d>range.end)return false;
    const cities=asSet(filters.cities,fold),groups=asSet(filters.groups,fold),classes=asSet(filters.classes,x=>clean(x)||fold(x)),distances=asSet(filters.distances,x=>String(Number(x)||0)),tracks=asSet(filters.tracks,trackKey),tokens=asSet(filters.tokens,fold);
    if(!any(cities,cityValue(row),x=>x))return false;
    if(!any(groups,groupValue(row),x=>x))return false;
    if(classes.size&&!classes.has(classValue(row))&&!classes.has(fold(row?.classRaw)))return false;
    if(!any(distances,String(distanceValue(row)),x=>x))return false;
    if(!any(tracks,trackValue(row),x=>x))return false;
    if(tokens.size){const have=new Set((row?.extraTokens||[]).map(fold));for(const t of tokens)if(!have.has(t))return false}
    return true;
  }
  function classify(target,row){
    const sameClass=classValue(target)===classValue(row),sameGroup=groupValue(target)===groupValue(row);
    if(!sameClass||!sameGroup)return'SPECIAL';
    const city=cityValue(target)===cityValue(row),dist=distanceValue(target)===distanceValue(row),track=trackValue(target)===trackValue(row);
    if(city&&dist&&track)return'EXACT';
    if(dist&&track)return'CONDITION_TWIN';
    if(city)return'RACE_FAMILY';
    return'SPECIAL';
  }
  function selfTest(){
    const rows=[
      {date:'2025-01-01',city:'İstanbul',groupRaw:'3 Yaşlı İngilizler',classRaw:'ŞARTLI 4',classKey:'SARTLI4',distance:1400,track:'Çim'},
      {date:'2025-02-01',city:'Ankara',groupRaw:'3 Yaşlı İngilizler',classRaw:'ŞARTLI 4',classKey:'SARTLI4',distance:1600,track:'Sentetik'},
      {date:'2025-03-01',city:'Bursa',groupRaw:'3 Yaşlı İngilizler',classRaw:'ŞARTLI 4',classKey:'SARTLI4',distance:1800,track:'Kum'}
    ];
    const f={startDate:'2025-01-01',endDate:'2025-02-28',cities:['İstanbul','Ankara'],distances:[1400,1600],tracks:['Çim','Sentetik']};
    const got=rows.filter(r=>rowPasses(r,f));
    if(got.length!==2)throw new Error('OR/AND filter test failed');
    const target={...rows[1],city:'Ankara',distance:1600,track:'Sentetik'};
    if(classify(target,target)!=='EXACT')throw new Error('EXACT test failed');
    if(classify(target,{...target,distance:1400})==='EXACT')throw new Error('Expanded distance mislabeled EXACT');
    const range=normalizeRange('2025-12-31','2025-01-01');if(range.start!=='2025-01-01'||range.end!=='2025-12-31')throw new Error('Date swap failed');
    return{ok:true,version:VERSION,tests:4};
  }
  return{VERSION,clean,fold,trackKey,isoDate,displayDate,normalizeRange,rowPasses,classify,classValue,groupValue,distanceValue,cityValue,trackValue,selfTest};
});
