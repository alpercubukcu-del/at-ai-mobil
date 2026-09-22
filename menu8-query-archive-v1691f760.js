/* F60.94.31.43 - Menu 8 TJK Koşu Sorgulama / kontrollü arşiv */
(()=>{'use strict';if(window.__AT_MENU8_QUERY_ARCHIVE_43__)return;window.__AT_MENU8_QUERY_ARCHIVE_43__=1;
const CITIES={'Adana':1,'İzmir':2,'İstanbul':3,'Bursa':4,'Ankara':5,'Şanlıurfa':6,'Elazığ':7,'Diyarbakır':8,'Kocaeli':9,'Antalya':10};
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let days=[],dirHandle=null,running=false,stop=false;
function db(){return new Promise((ok,no)=>{const q=indexedDB.open('at_ai_mobile_download_index_v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('days',{keyPath:'key'});q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})}
async function put(v){const d=await db();return new Promise(r=>{const q=d.transaction('days','readwrite').objectStore('days').put(v);q.onsuccess=q.onerror=()=>{d.close();r()}})}
async function has(k){const d=await db();return new Promise(r=>{const q=d.transaction('days').objectStore('days').get(k);q.onsuccess=q.onerror=()=>{const v=q.result;d.close();r(!!v)}})}
function ymd(d){return d.toISOString().slice(0,10)}
async function queryRange(a,b){
 const map=new Map();let page=0;
 while(page<400){const r=await fetch('/api/tjk-race-query-v1?start='+a+'&end='+b+'&page='+page,{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error||'Koşu Sorgulama alınamadı');
  for(const x of j.rows||[]){const key=x.date+'|'+x.city;const z=map.get(key)||{key,date:x.date,city:x.city,count:0};z.count++;map.set(key,z)}
  if(!(j.rows||[]).length||((page+1)*50>=Number(j.total||0)))break;page++; await new Promise(r=>setTimeout(r,20));
 }
 days=[...map.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.city.localeCompare(b.city,'tr'));await render();
}
async function saveFile(day,payload){
 const name=day.date+'_'+day.city.replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü_-]+/g,'_')+'.json', text=JSON.stringify(payload);
 if(dirHandle){const y=await dirHandle.getDirectoryHandle(day.date.slice(0,4),{create:true});const f=await y.getFileHandle(name,{create:true});const w=await f.createWritable();await w.write(text);await w.close();return 'AT AI MOBIL/'+day.date.slice(0,4)+'/'+name}
 const blob=new Blob([text],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);return 'download:'+name;
}
async function download(day){
 const cityId=CITIES[day.city];if(!cityId)throw Error(day.city+' şehir ID tanımlı değil');
 status(day.key,'İndiriliyor…');const r=await fetch('/api/tjk-daily-archive-v1?date='+day.date+'&city='+encodeURIComponent(day.city)+'&cityId='+cityId,{cache:'no-store'});const j=await r.json();if(!j.ok)throw Error(j.error||'İndirme hatası');
 const path=await saveFile(day,j);await put({key:day.key,date:day.date,city:day.city,count:day.count,path,at:Date.now()});status(day.key,'✓ İndirildi');
}
function status(k,t){const e=document.querySelector('[data-status="'+CSS.escape(k)+'"]');if(e)e.textContent=t}
async function render(){
 const y=$('#m8year')?.value||'',c=$('#m8city')?.value||'';const list=days.filter(x=>(!y||x.date.startsWith(y))&&(!c||x.city===c));const host=$('#m8list');if(!host)return;
 host.innerHTML='';for(const d of list){const done=await has(d.key);const row=document.createElement('div');row.className='panel compact';row.style.margin='8px 0';row.innerHTML=`<div><b>${esc(d.date.split('-').reverse().join('.'))} · ${esc(d.city)}</b><br><small>${d.count} koşu</small></div><div data-status="${esc(d.key)}">${done?'✓ İndirildi':'İndirilmedi'}</div><button class="secondary small" data-dl="${esc(d.key)}">İndir</button>`;host.appendChild(row)}
 host.querySelectorAll('[data-dl]').forEach(b=>b.onclick=async()=>{const d=days.find(x=>x.key===b.dataset.dl);try{await download(d)}catch(e){status(d.key,'⚠ '+e.message)}});$('#m8summary').textContent=list.length+' benzersiz Tarih + Şehir kaydı';
}
async function chooseFolder(){if(!window.showDirectoryPicker){alert('Bu tarayıcı doğrudan klasör erişimini desteklemiyor. Dosyalar indirme yöntemiyle kaydedilecek.');return}dirHandle=await showDirectoryPicker({mode:'readwrite'});$('#m8folder').textContent='Klasör: '+dirHandle.name}
async function bulk(){if(running)return;running=true;stop=false;const y=$('#m8year').value,c=$('#m8city').value;const list=days.filter(x=>(!y||x.date.startsWith(y))&&(!c||x.city===c));for(const d of list){if(stop)break;if(await has(d.key))continue;try{await download(d)}catch(e){status(d.key,'⚠ '+e.message)}await new Promise(r=>setTimeout(r,250))}running=false}
function open(){let d=$('#m8dialog');if(!d){d=document.createElement('dialog');d.id='m8dialog';d.innerHTML=`<div class="dialog-head"><div><div class="eyebrow">8. ARŞİV</div><h2>TJK Koşu Sorgulama</h2></div><button id="m8close" class="icon-btn">✕</button></div><div class="panel compact"><div class="grid2"><label>Başlangıç<input id="m8start" type="date"></label><label>Bitiş<input id="m8end" type="date"></label><label>Yıl<select id="m8year"><option value="">Tümü</option></select></label><label>İl<select id="m8city"><option value="">Tümü</option></select></label></div><button id="m8query" class="primary">İndirme Listesini Oluştur</button><button id="m8folder" class="secondary">AT AI MOBIL Klasörünü Seç</button><button id="m8bulk" class="primary">Eksikleri Toplu İndir</button><button id="m8stop" class="secondary">Durdur</button><div id="m8summary" class="status">Liste oluşturulmadı.</div></div><div id="m8list"></div>`;document.body.appendChild(d);
 const now=new Date(),start=new Date(now.getFullYear(),0,1);$('#m8start').value=ymd(start);$('#m8end').value=ymd(now);for(let y=now.getFullYear();y>=2000;y--)$('#m8year').insertAdjacentHTML('beforeend','<option>'+y+'</option>');Object.keys(CITIES).sort((a,b)=>a.localeCompare(b,'tr')).forEach(c=>$('#m8city').insertAdjacentHTML('beforeend','<option>'+c+'</option>'));
 $('#m8close').onclick=()=>d.close();$('#m8query').onclick=async()=>{try{$('#m8summary').textContent='Liste hazırlanıyor…';await queryRange($('#m8start').value,$('#m8end').value)}catch(e){$('#m8summary').textContent='⚠ '+e.message}};$('#m8folder').onclick=chooseFolder;$('#m8bulk').onclick=bulk;$('#m8stop').onclick=()=>stop=true;$('#m8year').onchange=$('#m8city').onchange=render}
 d.showModal();
}
function install(){const drawer=$('#drawer');if(!drawer)return;let b=$('#tjkQueryArchiveMenu8');if(!b){b=document.createElement('button');b.id='tjkQueryArchiveMenu8';b.textContent='8. TJK Koşu Sorgulama / Arşiv';drawer.appendChild(b)}b.onclick=e=>{e.preventDefault();try{window.closeDrawer?.()}catch{};open()}}
document.addEventListener('click',e=>{if(e.target?.id==='menuBtn')setTimeout(install,0)},{passive:true});window.ATMenu8QueryArchive={open,install};console.info('[AT AI] F60.94.31.43 Menu 8 lazy archive active');
})();