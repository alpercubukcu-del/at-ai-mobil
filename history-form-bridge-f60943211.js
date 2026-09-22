/* AT AI Mobil - F60.94.32.11 AtId Form bridge */
(()=>{'use strict';
function finishScoreLocal(n){n=Number(n);if(!Number.isFinite(n)||n<1)return null;return Math.max(0,Math.min(100,110-n*10))}
function degreeSecLocal(v){const s=String(v??'').trim();if(!s)return null;const p=s.replace(/,/g,'.').split('.').map(Number);if(p.some(x=>!Number.isFinite(x)))return null;if(p.length===3)return p[0]*60+p[1]+p[2]/100;if(p.length===2)return p[0]+p[1]/100;const n=Number(s.replace(',','.'));return Number.isFinite(n)?n:null}
async function apply(rows){
  const L=window.AT_AI_LOCAL_ARCHIVE;
  if(!L||typeof L.horseHistory!=='function'||!Array.isArray(rows))return rows;
  for(const r of rows){
    const id=r&&r.program&&r.program.id;if(!id)continue;
    try{
      const x=await L.horseHistory(id),d=x&&x.record&&(x.record.data||x.record),a=d&&Array.isArray(d.races)?d.races.slice(0,8):[],v=[];
      for(const h of a){const n=parseInt(h&&h.finish,10),s=finishScoreLocal(n);if(Number.isFinite(s))v.push(s)}
      if(v.length)r.F=Number((v.reduce((s,n)=>s+n,0)/v.length).toFixed(1));
      const times=a.map(h=>degreeSecLocal(h&&h.degree)).filter(Number.isFinite);
      if(times.length)r.historyDegreeSec=Math.min(...times);
    }catch(e){}
  }
  const usable=rows.filter(r=>Number.isFinite(r.historyDegreeSec));
  if(usable.length>=2){
    const vals=usable.map(r=>r.historyDegreeSec),lo=Math.min(...vals),hi=Math.max(...vals);
    for(const r of usable)r.D=hi===lo?100:Number((100*(hi-r.historyDegreeSec)/(hi-lo)).toFixed(1));
    [...usable].sort((a,b)=>a.historyDegreeSec-b.historyDegreeSec).forEach((r,i)=>r.historyDegreeRank=i+1);
  }
  return rows;
}
window.ATHistoryFormBridge={version:'F60.94.32.13',apply};
})();