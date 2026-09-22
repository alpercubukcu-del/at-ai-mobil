import * as cheerio from 'cheerio';

const VERSION='TJK-FOG-HORSE-V1.3';
const TJK='https://www.tjk.org';
const TIMEOUT=10000;
const HEADERS={
  'user-agent':'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150 Safari/537.36',
  accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language':'tr-TR,tr;q=0.9,en;q=0.7',
  referer:'https://www.tjk.org/'
};
function clean(v=''){return String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function fold(v=''){return clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'')}
function headerKey(v=''){return fold(v)}
function num(v){const s=clean(v);if(!s)return null;const n=Number(s.replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null}
function pct(v){const n=num(v);return Number.isFinite(n)?n:null}
function clamp(n,a=0,b=100){return Math.max(a,Math.min(b,Number(n)||0))}
function trDateIso(v=''){const m=clean(v).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''}
function daysBetween(a,b){const A=Date.parse(a+'T00:00:00Z'),B=Date.parse(b+'T00:00:00Z');return Number.isFinite(A)&&Number.isFinite(B)?Math.round((B-A)/86400000):null}
function degreeSec(v=''){const s=clean(v).replace(/,/g,'.');if(!s)return null;const p=s.split('.').map(Number);if(p.length>=3&&p.every(Number.isFinite))return p[p.length-3]*60+p[p.length-2]+p[p.length-1]/100;if(p.length===2&&p.every(Number.isFinite))return p[0]*60+p[1];const n=Number(s);return Number.isFinite(n)?n:null}
function parseLast6(v=''){const s=clean(v).replace(/[^0-9-]/g,'');return [...s].filter(c=>/\d/.test(c)).map(Number).slice(-6)}
function finishScore(p){if(p===1)return100;if(p===2)return82;if(p===3)return68;if(p===4)return56;if(p===5)return46;if(p===6)return38;if(p===7)return32;if(p===8)return27;if(p===9)return23;return18}
function last6Score(v){const a=parseLast6(v);if(!a.length)return null;return a.reduce((s,x)=>s+finishScore(x),0)/a.length}
function earningsScore(v){const n=num(v);if(!Number.isFinite(n)||n<=0)return null;return clamp(Math.log10(1+n)*15)}
async function fetchHtml(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT);try{const r=await fetch(url,{headers:HEADERS,redirect:'follow',signal:c.signal});if(!r.ok)throw new Error(`TJK HTTP ${r.status}`);return await r.text()}finally{clearTimeout(t)}}
function tables(html){const $=cheerio.load(html),out=[];$('table').each((_,table)=>{let hs=$(table).find('thead th').map((__,th)=>clean($(th).text())).get();if(!hs.length)hs=$(table).find('tr').first().find('th,td').map((__,x)=>clean($(x).text())).get();if(!hs.length)return;const keys=hs.map(headerKey),rows=[];$(table).find('tbody tr').each((__,tr)=>{const cells=$(tr).find('td').map((___,td)=>clean($(td).text())).get();if(!cells.length)return;const o={};hs.forEach((h,i)=>{o[h]=cells[i]??'';o[`$${keys[i]}`]=cells[i]??''});rows.push(o)});if(rows.length)out.push({headers:hs,keys,rows})});return out}
function findTable(html,need=[]){return tables(html).find(t=>need.every(n=>t.keys.some(k=>k===n||k.includes(n))))||null}
function val(row,aliases=[]){for(const a of aliases){const k=headerKey(a);for(const [rk,rv] of Object.entries(row||{})){if(!rk.startsWith('$'))continue;const h=rk.slice(1);if(h===k||h.includes(k)||k.includes(h))return rv}}return''}
function bestMatch(rows,name,fieldAliases){const target=fold(name);if(!target)return null;let best=null,bestScore=-1;for(const r of rows||[]){const x=fold(val(r,fieldAliases));if(!x)continue;let score=0;if(x===target)score=100;else if(x.startsWith(target)||target.startsWith(x))score=80;else if(x.includes(target)||target.includes(x))score=60;if(score>bestScore){best=r;bestScore=score}}return bestScore>=60?best:null}
function weighted(parts){let s=0,w=0;for(const p of parts){if(Number.isFinite(p.value)&&p.weight>0){s+=p.value*p.weight;w+=p.weight}}return w?Number((s/w).toFixed(2)):null}
function sireStrength(row){if(!row)return null;const runners=num(val(row,['Koşan Tay Adet','Koşan Tay'])),winners=num(val(row,['Kazanan Yavru Adet','Kazanan Yavru'])),p1=pct(val(row,['1.%'])),p2=pct(val(row,['2.%'])),p3=pct(val(row,['3.%']));const winnerRate=Number.isFinite(runners)&&runners>0&&Number.isFinite(winners)?winners/runners*100:null,top3=[p1,p2,p3].filter(Number.isFinite).reduce((a,b)=>a+b,0);const score=weighted([{value:Number.isFinite(p1)?clamp(p1*5):null,weight:.4},{value:Number.isFinite(winnerRate)?clamp(winnerRate*2):null,weight:.35},{value:Number.isFinite(top3)?clamp(top3*2.5):null,weight:.25}]);return{score,runners,winners,winnerRate:Number.isFinite(winnerRate)?Number(winnerRate.toFixed(1)):null,firstPct:p1,top3Pct:Number.isFinite(top3)?top3:null,races:num(val(row,['Koşu'])),earnings:num(val(row,['Kazanç']))}}
function mareStrength(row){if(!row)return null;const runners=num(val(row,['Koşan Tay Adet','Koşan Tay'])),p1=pct(val(row,['1.%'])),p2=pct(val(row,['2.%'])),p3=pct(val(row,['3.%'])),top3=[p1,p2,p3].filter(Number.isFinite).reduce((a,b)=>a+b,0);const score=weighted([{value:Number.isFinite(p1)?clamp(p1*5):null,weight:.55},{value:Number.isFinite(top3)?clamp(top3*2.5):null,weight:.35},{value:Number.isFinite(runners)?clamp(runners*5):null,weight:.10}]);return{score,runners,firstPct:p1,top3Pct:Number.isFinite(top3)?top3:null,races:num(val(row,['Koşu'])),earnings:num(val(row,['Kazanç']))}}
function damSireStrength(row){if(!row)return null;const p1=pct(val(row,['1.%'])),p2=pct(val(row,['2.%'])),p3=pct(val(row,['3.%'])),top3=[p1,p2,p3].filter(Number.isFinite).reduce((a,b)=>a+b,0);const score=weighted([{value:Number.isFinite(p1)?clamp(p1*5):null,weight:.55},{value:Number.isFinite(top3)?clamp(top3*2.5):null,weight:.45}]);return{score,runners:num(val(row,['Koşan Tay'])),firstPct:p1,top3Pct:Number.isFinite(top3)?top3:null,races:num(val(row,['Koşu'])),earnings:num(val(row,['Kazanç']))}}
function damFamilyStrength(rows,horse){const target=fold(horse),scores=[];for(const r of rows||[]){const name=clean(val(r,['At İsmi','At Adı']));if(!name||fold(name)===target)continue;const hp0=num(val(r,['HP'])),hp=Number.isFinite(hp0)&&hp0>0?hp0:null,form=last6Score(val(r,['Son 6 Y.','Son 6'])),earn=earningsScore(val(r,['Kazanç']));const score=weighted([{value:Number.isFinite(hp)?clamp(hp):null,weight:.4},{value:form,weight:.4},{value:earn,weight:.2}]);if(Number.isFinite(score))scores.push({name,score:Number(score.toFixed(1)),hp:Number.isFinite(hp)?hp:null,last6:clean(val(r,['Son 6 Y.','Son 6'])),earnings:num(val(r,['Kazanç']))})}scores.sort((a,b)=>b.score-a.score);const use=scores.slice(0,8);return{score:use.length?Number((use.reduce((s,x)=>s+x.score,0)/use.length).toFixed(2)):null,sampleCount:scores.length,examples:use.slice(0,4)}}
function parseWorkout(html,raceDate){const t=findTable(html,['ATADI','ITARIHI']);if(!t)return{workouts:[],bestByDistance:{},latest:null};const workouts=[];for(const r of t.rows){const iso=trDateIso(val(r,['İ. Tarihi','Idman Tarihi','İdman Tarihi']));if(!iso||raceDate&&iso>=raceDate)continue;const days=daysBetween(iso,raceDate),splits={};for(const d of[1400,1200,1000,800,600,400,200]){const sec=degreeSec(val(r,[`${d}m`,String(d)]));if(Number.isFinite(sec))splits[d]=sec}if(!Object.keys(splits).length)continue;workouts.push({date:iso,daysBeforeRace:days,horse:clean(val(r,['At Adı','At Adi'])),breed:clean(val(r,['Irk'])),type:clean(val(r,['İ. Türü','Idman Türü','Türü'])),status:clean(val(r,['Durum'])),city:clean(val(r,['İ. Hip.','Idman Hip.'])),track:clean(val(r,['Pist'])),trackPos:clean(val(r,['P.Dur'])),jockey:clean(val(r,['İ. Jokeyi','Idman Jokeyi'])),splits})}workouts.sort((a,b)=>b.date.localeCompare(a.date));const recent=workouts.filter(x=>!Number.isFinite(x.daysBeforeRace)||x.daysBeforeRace<=45).slice(0,8),bestByDistance={};for(const d of[1400,1200,1000,800,600,400,200]){const vals=recent.map(x=>x.splits[d]).filter(Number.isFinite);if(vals.length)bestByDistance[d]=Math.min(...vals)}return{workouts:recent,archiveWorkouts:workouts,bestByDistance,latest:recent[0]||null,totalBeforeRace:workouts.length}}
async function safe(url,attempts=2){let last=null;for(let i=0;i<attempts;i++){try{return{ok:true,html:await fetchHtml(url),url,attempt:i+1}}catch(e){last=e}}return{ok:false,html:'',url,error:last?.message||String(last||'TJK veri alınamadı'),attempt:attempts}}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  const atId=String(req.query.atId||'').replace(/\D/g,''),horse=clean(req.query.horse||''),sire=clean(req.query.sire||''),dam=clean(req.query.dam||''),damSire=clean(req.query.damSire||''),raceDate=clean(req.query.raceDate||'');
  if(!horse||!raceDate||!/^\d{4}-\d{2}-\d{2}$/.test(raceDate))return res.status(400).json({ok:false,version:VERSION,error:'horse ve raceDate gerekli.'});
  const sireShort=sire.replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim();
  const urls={
    profile:atId?`${TJK}/TR/yarissever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=${encodeURIComponent(atId)}&Era=today`:'',
    workout:`${TJK}/TR/YarisSever/Query/Page/IdmanIstatistikleri?1=1&QueryParameter_ATADI=${encodeURIComponent(horse)}`,
    sire:sire?`${TJK}/TR/YarisSever/Query/Page/AygirIstatistikleri?QueryParameter_AygirAdi=${encodeURIComponent(sire)}`:'',
    sireAlt:sireShort&&sireShort!==sire?`${TJK}/TR/YarisSever/Query/Page/AygirIstatistikleri?QueryParameter_AygirAdi=${encodeURIComponent(sireShort)}`:'',
    dam:dam?`${TJK}/TR/YarisSever/Query/Page/KisrakIstatistikleri?QueryParameter_KisrakAdi=${encodeURIComponent(dam)}`:'',
    damSire:damSire?`${TJK}/TR/YarisSever/Query/Page/KisrakBabasi?QueryParameter_KisrakBabaAdi=${encodeURIComponent(damSire)}`:''
  };
  let [p,w,s,d,ds]=await Promise.all([urls.profile?safe(urls.profile):Promise.resolve({ok:false,html:''}),urls.workout?safe(urls.workout):Promise.resolve({ok:false,html:''}),urls.sire?safe(urls.sire):Promise.resolve({ok:false,html:''}),urls.dam?safe(urls.dam):Promise.resolve({ok:false,html:''}),urls.damSire?safe(urls.damSire):Promise.resolve({ok:false,html:''})]);
  let st=s.html?findTable(s.html,['AYGIR','KOSANTAY']):null,srow=st?bestMatch(st.rows,sire,['Aygir','Aygır']):null,sireData=sireStrength(srow);
  if(!sireData&&urls.sireAlt){const alt=await safe(urls.sireAlt,1);if(alt.ok){s=alt;st=findTable(s.html,['AYGIR','KOSANTAY']);srow=st?bestMatch(st.rows,sireShort,['Aygir','Aygır']):null;sireData=sireStrength(srow)}}
  let profile={horse:null,sire:null,dam:null,damSire:null};if(p.html){const $p=cheerio.load(p.html),txt=clean($p('body').text()),m=txt.match(/Baba\s+(.+?)\s+Anne\s+(.+?)\s*\/\s*(.+?)\s+Antrenör/i);profile.horse=clean($p('h2').first().text()||$p('h1').first().text()||horse);if(m){profile.sire=clean(m[1]);profile.dam=clean(m[2]);profile.damSire=clean(m[3])}}
  const workout=parseWorkout(w.html,raceDate);
  const dst=ds.html?findTable(ds.html,['KISRAKBABASI','KOSU']):null,dsrow=dst?bestMatch(dst.rows,damSire,['Kısrak Babası','Kisrak Babasi']):null,damSireData=damSireStrength(dsrow);
  const mt=d.html?findTable(d.html,['KISRAK','KOSANTAY']):null,mrow=mt?bestMatch(mt.rows,dam,['Kısrak']):null,damData=mareStrength(mrow);
  const originScore=weighted([{value:sireData?.score,weight:.5},{value:damSireData?.score,weight:.3},{value:damData?.score,weight:.2}]);
  const errors={workout:w.ok?null:w.error||'AtId yok',sire:sireData?null:(s.error||'Baba istatistiği bulunamadı'),dam:damData?null:(d.error||'Kısrak istatistiği bulunamadı'),damSire:ds.ok?null:ds.error||'Kısrak babası yok'};
  const complete=!Object.values(errors).some(Boolean);
  return res.status(200).json({ok:true,version:VERSION,complete,horse,atId:atId||null,raceDate,profile,origin:{score:originScore,sire:sireData,dam:damData,damSire:damSireData,names:{sire,dam,damSire}},workout,sources:{workout:urls.workout||null,sire:urls.sire||null,sireAlt:urls.sireAlt||null,dam:urls.dam||null,damSire:urls.damSire||null},errors});
}
