/* Local fixture server only. Never forwards fictional test IDs to TJK. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHorseHistory} from '../api/tjk-horse-history-v1.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/emsidi-v174.json'),'utf8'));
const rows=fixture.rows.map(row=>({...row,program:{id:String(900000+row.no),no:row.no,name:row.name},connectionMeta:{verified:3}}));
const race={...fixture.race,horses:rows.map(row=>row.program)};
const state={date:fixture.date,city:'1',cities:[{id:'1',name:fixture.city}],races:[race],selectedRace:'all',analyses:{}};
const snapshot={key:`${fixture.date}|ADANA|6`,date:fixture.date,city:fixture.city,raceNo:6,rows};
const seed=`<script>
if(!sessionStorage.getItem('v174-fixture')){localStorage.setItem('at_ai_mobil_state_v2',${JSON.stringify(JSON.stringify(state))});sessionStorage.setItem('v174-fixture','1')}
window.fixtureReady=new Promise((resolve,reject)=>{
  const q=indexedDB.open('at_ai_fogd_scores_v1',1);
  q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains('races')){const s=db.createObjectStore('races',{keyPath:'key'});s.createIndex('date','date');s.createIndex('year','year')}};
  q.onerror=()=>reject(q.error);q.onsuccess=()=>{const tx=q.result.transaction('races','readwrite');tx.objectStore('races').put(${JSON.stringify(snapshot)});tx.oncomplete=()=>resolve(true)};
});
</script>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function historyHtml(records){
  const headers=['Tarih','Şehir','Msf','Pist','S','Derece','Sıklet','Kcins'];
  return`<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${records.map(row=>{
    const date=row.date.split('-').reverse().join('.');
    return`<tr>${[date,row.city,row.distance,row.track,row.finish,row.degree,row.weight,'ŞARTLI 4'].map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table>`;
}
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/tjk-horse-history-v1'){
    const id=url.searchParams.get('atId'),history=id==='900003'?fixture.history:[];
    const data=parseHorseHistory(historyHtml(history));
    console.log('fixture history',id,data.races.length);
    res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,atId:id,version:'TJK-HORSE-HISTORY-V1.2',races:data.races}));
  }
  if(url.pathname.startsWith('/api/')){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,races:[],cities:[],records:[]}))}
  const relative=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.resolve(root,'public',relative);
  if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);return res.end()}
  if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found')}
  const ext=path.extname(file),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
  res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});
  let content=fs.readFileSync(file);if(relative==='index.html')content=content.toString().replace('</head>',seed+'</head>');
  res.end(content);
}).listen(4174,'127.0.0.1',()=>console.log('V17.4 fixture preview http://127.0.0.1:4174'));
