/* Isolated Menu 8 browser fixtures. No fictional IDs are forwarded to TJK. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const horses=[1,2].map(n=>({id:String(900100+n),no:n,name:'DENEME AT '+n,origin:'AYGIR '+n+' - KISRAK '+n+' / KISRAK BABASI '+n}));
const race={no:1,distance:1400,track:'Sentetik',name:'ŞARTLI 4',horses};
const state={date:'2026-09-30',city:'3',cities:[{id:'3',name:'İstanbul'}],races:[race],selectedRace:'all',analyses:{}};
const init=`<script>
if(!sessionStorage.getItem('menu8-fixture')){localStorage.setItem('at_ai_mobil_state_v2',${JSON.stringify(JSON.stringify(state))});sessionStorage.setItem('menu8-fixture','1')}
window.__archiveTest={pickerCalls:0,programGate:null,pickerGate:null,requests:[],failHistory:false};
window.__archiveTest.folderReady=(async()=>{const base=await navigator.storage.getDirectory();return base.getDirectoryHandle('AT-AI-menu8-verification',{create:true})})();
window.showDirectoryPicker=()=>{const t=window.__archiveTest;t.pickerCalls++;return t.pickerGate||t.folderReady};
const fixtureProgram=${JSON.stringify({ok:true,cities:state.cities,racesByCity:{'3':[race]}})};
const realFetch=window.fetch.bind(window);
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.pathname.startsWith('/api/'))return realFetch(input,options);
 const t=window.__archiveTest;t.requests.push(url.pathname+url.search);let value={ok:true,races:[],rows:[],cities:[],total:0};
 if(url.pathname==='/api/tjk-program'){if(t.programGate)await t.programGate;value=fixtureProgram}
 if(url.pathname==='/api/tjk-horse-history-v1'){const id=url.searchParams.get('atId');value={ok:true,atId:id,races:[{date:'2026-09-06',city:'İstanbul',distance:'1400',track:'S:Normal',finish:'2',degree:'1.35.00'}]};if(t.failHistory&&id==='900102')value={ok:false,error:'Test TJK HTTP 502'}}
 if(url.pathname==='/api/tjk-fog-horse-v1'){const id=url.searchParams.get('atId'),rows=[{'At Adı':'YAVRU '+id}];value={ok:true,errors:{},sources:{},origin:{ids:{sireId:id+'1',damId:id+'2',damSireCode:id+'3'},sireRows:rows,damRows:rows,damSireRows:rows},workout:{rows:[{date:'2026-09-27',distance:800,degree:'0.54.00'}]}}}
 if(url.pathname==='/api/tjk-track-info-v1')value={ok:true,total:1,rows:[{date:'2026-09-30',city:'İstanbul',track:'Sentetik',temperature:20,humidity:40,reportUrl:''}]};
 return new Response(JSON.stringify(value),{status:value.ok?200:502,headers:{'Content-Type':'application/json'}})
};
</script>`;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){res.writeHead(500);return res.end('Unmocked test request; never forwarded')}
 const relative=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.resolve(root,'public',relative);
 if(!file.startsWith(path.join(root,'public')+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end('Not found')}
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
 let content=fs.readFileSync(file);if(relative==='index.html')content=content.toString().replace('</head>',init+'</head>');res.end(content)
}).listen(4175,'127.0.0.1',()=>console.log('Menu 8 fixtures: http://127.0.0.1:4175'));
