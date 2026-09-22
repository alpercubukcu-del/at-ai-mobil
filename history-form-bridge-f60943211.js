/* AT AI Mobil - F60.94.32.11 AtId Form bridge */
(()=>{'use strict';
function finishScoreLocal(n){n=Number(n);if(!Number.isFinite(n)||n<1)return null;return Math.max(0,Math.min(100,110-n*10))}
function degreeSecLocal(v){const s=String(v??'').trim();if(!s)return null;const p=s.replace(/,/g,'.').split('.').map(Number);if(p.some(x=>!Number.isFinite(x)))return null;if(p.length===3)return p[0]*60+p[1]+p[2]/100;if(p.length===2)return p[0]+p[1]/100;const n=Number(s.replace(',','.'));return Number.isFinite(n)?n:null}
async function apply(rows,ctx={}){
  const L=window.AT_AI_LOCAL_ARCHIVE;
  if(!L||typeof L.horseHistory!=='function'||!Array.isArray(rows))return rows;
  for(const r of rows){
    const id=r&&r.program&&r.program.id;if(!id)continue;
    const targetDistance=Number(ctx.distance||r?.program?.distance||0),targetTrack=String(ctx.track||r?.program?.track||'').toLocaleUpperCase('tr-TR'),targetCity=String(ctx.city||ctx.sehir||r?.program?.city||r?.program?.sehir||''),raceDate=String(ctx.date||''); const PM=window.ATPistAnaReferansi,TM=window.ATTrackMaintenanceV1,targetSurface=PM&&PM.surface?PM.surface(targetCity,targetTrack):null;
    try{
      const x=await L.horseHistory(id),d=x&&x.record&&(x.record.data||x.record),all=d&&Array.isArray(d.races)?d.races:[],past=all.filter(h=>!raceDate||!h.date||h.date<raceDate),a=past.slice(0,8),v=[];
      for(const h of a){const n=parseInt(h&&h.finish,10),s=finishScoreLocal(n);if(Number.isFinite(s))v.push(s)}
      if(v.length)r.F=Number((v.reduce((s,n)=>s+n,0)/v.length).toFixed(1));
      const comparable=[]; for(const h of a){const sec=degreeSecLocal(h&&h.degree),dist=Number(String(h&&h.distance||'').replace(/\D/g,'')),track=String(h&&h.track||'').toLocaleUpperCase('tr-TR'),city=String(h&&h.city||''),surface=PM&&PM.surface?PM.surface(city,track):null;if(!Number.isFinite(sec)||dist<=0||(targetDistance&&Math.abs(dist-targetDistance)>200))continue;if(targetSurface&&surface&&targetSurface!==surface)continue;if(targetSurface&&!surface)continue;let report=null;if(TM&&typeof TM.get==='function'&&h&&h.date&&city){try{report=await TM.get(h.date,city)}catch(_){}}comparable.push({h,sec,dist,track,city,surface,report})}
      if(comparable.length){
        const norm=comparable.map(x=>({x,sec:targetDistance?x.sec*(targetDistance/x.dist):x.sec}));
        norm.sort((a,b)=>a.sec-b.sec);
        r.historyDegreeNormSec=norm[0].sec;
        r.historyDegreeMeta={sourceDistance:norm[0].x.dist,targetDistance:targetDistance||null,track:norm[0].x.track||null,city:norm[0].x.city||null,surface:norm[0].x.surface||null,targetSurface:targetSurface||null,samples:norm.length,trackContext:norm[0].x.report||null,trackContextSource:norm[0].x.report?'TJK_TARIHLI_RAPOR':'PIST_ANA_REFERANSI'};
      }
    }catch(e){}
  }
  const usable=rows.filter(r=>Number.isFinite(r.historyDegreeNormSec));
  if(usable.length>=2){
    const vals=usable.map(r=>r.historyDegreeNormSec),lo=Math.min(...vals),hi=Math.max(...vals);
    for(const r of usable)r.D=hi===lo?100:Number((100*(hi-r.historyDegreeNormSec)/(hi-lo)).toFixed(1));
    [...usable].sort((a,b)=>a.historyDegreeNormSec-b.historyDegreeNormSec).forEach((r,i)=>r.historyDegreeRank=i+1);
  }
  return rows;
}
window.ATHistoryFormBridge={version:'F60.94.32.22',apply};
})();