const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1691f734.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
if(!fs.existsSync(BASE))throw new Error('[F60.94.31.15] missing '+path.basename(BASE));
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
let app=fs.readFileSync(APP,'utf8');

/* F60.94.31.14 correctly added the Veri header and coverage fields, but an older row template
   can still render one cell short. Repair the rendered table structurally instead of depending
   on brittle source-string matching. */
app+=`\n;(()=>{\n'use strict';\nconst MARK='FOGD-COLUMN-ALIGN-V16.9.1F60.94.31.15';\nfunction numCell(td){const t=String(td?.childNodes?.[0]?.textContent??td?.textContent??'').trim().replace(',','.');const n=parseFloat(t);return Number.isFinite(n)?n:null}\nfunction fix(){const host=document.getElementById('fogdResultsF609431'),table=host?.querySelector('.fogd-table');if(!table)return;const heads=[...table.querySelectorAll('thead th')],vi=heads.findIndex(x=>String(x.textContent||'').trim()==='Veri');if(vi<0)return;for(const tr of table.querySelectorAll('tbody tr')){const cells=[...tr.children];if(cells.length===heads.length)continue;if(cells.length!==heads.length-1)continue;const weights=[.30,.20,.20,.30],idx=[2,3,4,5];let count=0,coverage=0;for(let i=0;i<idx.length;i++){if(numCell(cells[idx[i]])!==null){count++;coverage+=weights[i]}}const td=document.createElement('td');td.className='fogd-coverage';td.innerHTML='<b>'+count+'/4</b><div style="font-size:9px;opacity:.62;white-space:nowrap;margin-top:3px">%'+Math.round(coverage*100)+' ağırlık</div>';tr.insertBefore(td,tr.children[vi]||null)}}\nconst obs=new MutationObserver(()=>fix());function boot(){fix();const h=document.getElementById('fogdResultsF609431');if(h)obs.observe(h,{childList:true,subtree:true});else setTimeout(boot,150)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.ATFogdColumnAlignF60943115={version:MARK,fix};console.info('[AT AI]',MARK,'active');\n})();\n`;

if((app.split('<th>Veri</th>').length-1)!==1)throw new Error('[F60.94.31.15] Veri header count mismatch');
if(!app.includes('componentCount:r.componentCount')||!app.includes('componentCoverage:r.componentCoverage'))throw new Error('[F60.94.31.15] coverage fields missing');
for(const token of['FOGD-COLUMN-ALIGN-V16.9.1F60.94.31.15','fogd-coverage','ARCHIVE-EXACT-DATE-V16.9.1F60.94.31.12','FOGD-HISTORY-CALIBRATION-V16.9.1F60.94.31.11'])if(!app.includes(token))throw new Error('[F60.94.31.15] bundle invariant missing '+token);
new Function(app);
fs.writeFileSync(APP,app,'utf8');
let html=fs.readFileSync(INDEX,'utf8').replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=1692985');
fs.writeFileSync(INDEX,html,'utf8');
if(!html.includes('/at-ai-app-v142.js?v=1692985'))throw new Error('[F60.94.31.15] cache bust failed');
console.log('[AT AI] V16.9.1F60.94.31.15 build complete: FOGD Veri cell repaired structurally; columns aligned.');
