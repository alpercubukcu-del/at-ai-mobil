/* Verified historical winners share the permanent Atlar archive. */
;(()=>{'use strict';
const VERSION='WINNER-CAREER-ARCHIVE-V18.0.6',INDEX='_winner-career-index-v1.json',states=new WeakMap();
const clean=v=>String(v??'').replace(/\s+/g,' ').trim(),fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const iso=r=>{const value=clean(r?.isoDate||r?.date);if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const m=value.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);return m?m[3]+'-'+m[2]+'-'+m[1]:''};
const number=v=>{const m=clean(v).replace(',','.').match(/\d+(?:\.\d+)?/);return m?Number(m[0]):null};
const classKey=v=>{const parts=clean(v).split('/').map(fold).filter(Boolean);return (parts.shift()||'')+'|'+[...new Set(parts)].sort().join('/')};
const refKey=r=>[r.date,fold(r.city),r.raceNo,fold(r.winner)].join('|');
function linkId(value){try{const u=new URL(value);if(u.protocol!=='https:'||!['www.tjk.org','tjk.org'].includes(u.hostname))return'';const id=u.searchParams.get('QueryParameter_AtId');return /^\d+$/.test(id||'')?id:''}catch{return''}}
function validateCareer(ref,data,id){
 if(data?.ok!==true||String(data.horseId)!==String(id)||(clean(data.horseName)&&fold(data.horseName)!==fold(ref.winner)))throw Error('Kazananın at kimliği veya kariyer adı doğrulanamadı: '+ref.winner+' / '+clean(data?.horseName));
 if(data.before||!Array.isArray(data.history)||data.validation?.valid!==true||data.audit?.coverageStatus!=='TAM'||Number(data.audit.collectedTotal??data.history.length)!==data.history.length)throw Error(ref.winner+': tam kariyer kapsamı doğrulanamadı; eksik geçmiş tamamlandı sayılmadı.');
 const h=ref.heading||ref.programCardAudit?.targetPair?.historical||{};
 if(!h.class||!h.group||!h.track||!(number(h.distance)>0))throw Error('Tarihsel kazananın yarış başlığı eksik.');
 const wins=data.history.filter(r=>iso(r)===ref.date&&fold(r.city)===fold(ref.city)&&Number(r.finish??r.rank)===1&&classKey(r.class||r.raceClass||r.classRaw)===classKey(h.class)&&fold(r.ageGroup||r.group||r.groupRaw)===fold(h.group)&&number(r.distance??r.mesafe)===number(h.distance)&&fold(r.track||r.pist)===fold(h.track));
 const win=wins.find(r=>{const no=number(r.raceNo??r.raceNoName);return no===null?wins.length===1:no===Number(ref.raceNo)});
 if(!win)throw Error(ref.date+' '+ref.city+' '+ref.raceNo+'. koşu: '+ref.winner+' kariyerinde bu başlıkta birincilik doğrulanamadı.');
 return win;
}
const child=(d,p,n,create=false)=>d.child?d.child(p,n,{create}):p.getDirectoryHandle(n,{create});
async function read(dir,name){try{const f=await dir.getFileHandle(name);return JSON.parse(await(await f.getFile()).text())}catch(e){if(e?.name==='NotFoundError'||e?.code==='ENOENT')return null;throw e}}
async function write(d,dir,name,value){const file=await dir.getFileHandle(name,{create:true}),w=d.writer?await d.writer(file):await file.createWritable();try{await w.write(JSON.stringify(value));await w.close()}catch(e){try{await w.abort()}catch{}throw e}}
async function context(){const d=window.ATArchiveDirectoryV1741;if(!d)throw Error('At arşivi klasör yönetimi yüklenmedi.');let root=d.getHandle?.();if(!root)root=await d.restore?.();if(!root||!d.ready?.())throw Error('Tarihsel kazananları kaydetmek için Gerçek Yarış Arşivi bölümünde AT AI MOBIL klasörünü seçin.');let s=states.get(root);if(!s){s={root,d,index:null,loading:null,refs:new Map(),horses:new Map(),writeQueue:Promise.resolve()};states.set(root,s)}return s}
async function folder(s){const base=fold(s.root.name)==='GERCEKYARISARSIVI'?s.root:await child(s.d,s.root,'Gerçek Yarış Arşivi',true);return child(s.d,base,'Atlar',true)}
async function index(s,dir){if(s.index)return s.index;if(!s.loading)s.loading=read(dir,INDEX).then(doc=>s.index=doc||{version:VERSION,entries:{}}).finally(()=>s.loading=null);return s.loading}
function serial(s,fn){const task=s.writeQueue.then(fn);s.writeQueue=task.catch(()=>{});return task}
async function persist(s,dir,id,ref,data,win){await serial(s,async()=>{
 const old=await read(dir,id+'.json'),by=new Map(),key=r=>[iso(r),fold(r.city),number(r.distance??r.mesafe),fold(r.track||r.pist),number(r.finish??r.rank),clean(r.degree)].join('|');
 for(const row of old?.races||[])by.set(key(row),row);
 for(const row of data.history){const normalized={...row,date:iso(row),isoDate:iso(row),raceType:row.class||row.raceClass||row.classRaw||'',raceNo:row.raceNo??number(row.raceNoName)};by.set(key(normalized),normalized)}
 const now=new Date().toISOString(),doc={...old,version:'AT-HORSE-ARCHIVE-V3',horseId:id,name:ref.winner,lastUpdated:now,lastChecked:now,lastRaceDate:[...by.values()].map(iso).sort().at(-1)||'',races:[...by.values()].sort((a,b)=>iso(b).localeCompare(iso(a))),verifiedCareer:{version:VERSION,fetchedAt:now,data}};
 await write(s.d,dir,id+'.json',doc);
 const idx=await index(s,dir),entries={...idx.entries,[refKey(ref)]:{horseId:id,winner:ref.winner,date:ref.date,city:ref.city,raceNo:ref.raceNo,verifiedAt:now}};
 await write(s.d,dir,INDEX,{version:VERSION,entries});s.index={version:VERSION,entries};
 });return win}
async function load(s,ref,{resolveWinner,fetchCareer}){
 const dir=await folder(s),idx=await index(s,dir);let id=linkId(ref.winnerUrl)||clean(ref.horseId)||clean(idx.entries?.[refKey(ref)]?.horseId);
 if(!/^\d+$/.test(id)){const winner=await resolveWinner(ref);if(fold(winner?.horseName)!==fold(ref.winner)||!/^\d+$/.test(clean(winner?.horseId)))throw Error('Tarihsel kazanan kimliği doğrulanamadı.');id=String(winner.horseId)}
 let data,source='phone';const existing=await read(dir,id+'.json'),snapshot=existing?.verifiedCareer;
 if(snapshot?.version===VERSION&&snapshot.fetchedAt?.slice(0,10)>=ref.date){data=snapshot.data;validateCareer(ref,data,id)}
 else{source='tjk';let task=s.horses.get(id);if(!task){task=Promise.resolve().then(()=>fetchCareer(id)).then(value=>{validateCareer(ref,value,id);return value});s.horses.set(id,task);task.catch(()=>s.horses.delete(id))}data=await task;const win=validateCareer(ref,data,id);await persist(s,dir,id,ref,data,win)}
 if(!s.index?.entries?.[refKey(ref)])await serial(s,async()=>{const current=await index(s,dir),next={version:VERSION,entries:{...current.entries,[refKey(ref)]:{horseId:id,winner:ref.winner,date:ref.date,city:ref.city,raceNo:ref.raceNo,verifiedAt:new Date().toISOString()}}};await write(s.d,dir,INDEX,next);s.index=next});
 const win=validateCareer(ref,data,id),history=data.history.filter(r=>iso(r)&&iso(r)<ref.date);
 return{horseId:id,horseName:ref.winner,winner:{...win,finish:1,horseId:id,horseName:ref.winner},source,permanent:true,career:{...data,before:ref.date,history,fullPathBefore:history,wins:history.filter(r=>Number(r.finish)===1),top5:history.filter(r=>Number(r.finish)>=1&&Number(r.finish)<=5),preparationPath:history.filter(r=>Number(r.finish)>=1&&Number(r.finish)<=5),recentForm:history.slice(0,5),counts:{...data.counts,frozenCareerTotal:history.length},validation:{...data.validation,futureLeakCount:0}}};
}
async function get(ref,dependencies){const s=await context(),key=refKey(ref);if(s.refs.has(key))return s.refs.get(key);const task=load(s,ref,dependencies);s.refs.set(key,task);try{return await task}finally{s.refs.delete(key)}}
window.ATWinnerCareerArchiveV18={version:VERSION,get,validateCareer,linkId,refKey};
})();
