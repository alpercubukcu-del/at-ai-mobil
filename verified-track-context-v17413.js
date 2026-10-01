/* Verified local conditions: similarity selects references; it never invents seconds or tempo. */
(()=>{'use strict';
const version='VERIFIED-TRACK-CONTEXT-V17.4.13';
const fold=v=>String(v??'').toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
const finite=v=>v===null||v===undefined||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null;
const minute=v=>{const m=String(v??'').match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);return m&&+m[1]<24&&+m[2]<60?+m[1]*60+(+m[2]):null};
const surface=v=>{const s=fold(v);return s.includes('SENTETIK')?'synthetic':s.includes('CIM')?'grass':s.includes('KUM')?'sand':''};
function index(rows,asOf=new Date()){const map=new Map();map.asOf=asOf;for(const r of rows||[])if(/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.city)map.set(`${r.date}|${fold(r.city)}`,r);return map}
function context(map,date,city,race={},mode='target',cutoff=date,cutoffTime=''){
 const record=map?.get(`${date}|${fold(city)}`),out={version,date,city,surface:surface(race.track||race.pist),source:'VERIFIED_CONDITIONS_MISSING',weather:{},maintenance:null,missing:[],observationTime:null,confidence:0};
 const archived=mode==='reference'&&date<cutoff,rt=minute(race.time||race.saat||race.raceTime),ot=minute(record?.time);
 const now=map?.asOf instanceof Date?map.asOf:new Date(),observedAt=ot!==null?Date.parse(`${date}T${String(Math.floor(ot/60)).padStart(2,'0')}:${String(ot%60).padStart(2,'0')}:00+03:00`):null;
 const verified=!!record&&(archived||(rt!==null&&ot!==null&&ot<rt&&observedAt<=now.getTime()));
 if(verified){out.source=archived?'ARCHIVED_DAILY_OBSERVATION':'VERIFIED_PRE_RACE';out.observationTime=record.time||null;for(const [k,min,max]of[['temperature',-40,60],['humidity',0,100],['pressure',850,1100],['windSpeedKmh',0,150]]){const n=finite(record[k]);if(n!==null&&n>=min&&n<=max)out.weather[k]=n}out.confidence=Object.keys(out.weather).length/4;}
 else out.missing.push(record?'Rapor saati yarış öncesi olarak doğrulanamadı':'Tarihli pist/hava kaydı yok');
 // Download/parse timestamps do not establish when the maintenance report was available.
 const stamp=record?.maintenanceAvailableAt,limit=archived?`${cutoff}T${minute(cutoffTime)!==null?String(cutoffTime).replace('.',':'):'00:00'}:00+03:00`:rt!==null?`${date}T${String(Math.floor(rt/60)).padStart(2,'0')}:${String(rt%60).padStart(2,'0')}:00+03:00`:null;
 if(stamp&&limit&&Number.isFinite(Date.parse(stamp))&&Date.parse(stamp)<Date.parse(limit)&&Date.parse(stamp)<=now.getTime())out.maintenance=record?.maintenance?.bySurface?.[out.surface]||null;
 if(out.maintenance){
 if(out.maintenance.observationKind!=='DOCUMENTED_SCHEDULE'||!Array.isArray(out.maintenance.events))out.maintenance=null;
 else{const events=out.maintenance.events.filter(e=>e.date<date||(e.date===date&&(archived||rt!==null&&minute(e.time)!==null&&minute(e.time)<rt)));const safe={events,observationKind:'DOCUMENTED_SCHEDULE'};for(const k of ['watering','mowing','roller','harrow','rotavator','synchrogerm','gallopMaster','powerHarrow','vertiDrain','reglaj','stoneBurier'])safe[k]=events.some(e=>e.operation===k)?true:null;safe.signalCount=events.length;out.maintenance=events.length?safe:null}
}
if(!out.maintenance)out.missing.push('Yüzeye özel bakımın yayın zamanı doğrulanamadı');
 if(!Object.keys(out.weather).length)out.missing.push('Doğrulanmış hava ölçümü yok');
 return out;
}
function similarity(a,b){let weight=1,fields=0;for(const [k,scale]of[['temperature',14],['humidity',45],['pressure',35],['windSpeedKmh',35]]){const x=finite(a?.weather?.[k]),y=finite(b?.weather?.[k]);if(x!==null&&y!==null){weight*=Math.exp(-Math.abs(x-y)/scale);fields++}}
 const maintenanceComparable=!!(a?.maintenance&&b?.maintenance&&a.surface===b.surface);
 // A bounded similarity preference is not a fitted effect on race seconds.
 if(maintenanceComparable){const ops=['watering','mowing','roller','harrow','rotavator','synchrogerm','gallopMaster','powerHarrow','vertiDrain','reglaj','stoneBurier'],union=ops.filter(k=>a.maintenance[k]===true||b.maintenance[k]===true);if(union.length){weight*=.8+.2*union.filter(k=>a.maintenance[k]===true&&b.maintenance[k]===true).length/union.length;fields++}}
 return{weight:fields?Math.max(.2,weight):1,fields,maintenanceComparable};
}
window.ATVerifiedTrackV17413={version,index,context,similarity,minute,surface};
})();
