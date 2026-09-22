/* AT AI Mobil - F60.94.32.11 AtId Form bridge */
(()=>{'use strict';
function finishScoreLocal(n){n=Number(n);if(!Number.isFinite(n)||n<1)return null;return Math.max(0,Math.min(100,110-n*10))}
async function apply(rows){
  const L=window.AT_AI_LOCAL_ARCHIVE;
  if(!L||typeof L.horseHistory!=='function'||!Array.isArray(rows))return rows;
  for(const r of rows){
    const id=r&&r.program&&r.program.id;if(!id)continue;
    try{
      const x=await L.horseHistory(id),d=x&&x.record&&(x.record.data||x.record),a=d&&Array.isArray(d.races)?d.races.slice(0,8):[],v=[];
      for(const h of a){const n=parseInt(h&&h.finish,10),s=finishScoreLocal(n);if(Number.isFinite(s))v.push(s)}
      if(v.length)r.F=Number((v.reduce((s,n)=>s+n,0)/v.length).toFixed(1));
    }catch(e){}
  }
  return rows;
}
window.ATHistoryFormBridge={version:'F60.94.32.11',apply};
})();