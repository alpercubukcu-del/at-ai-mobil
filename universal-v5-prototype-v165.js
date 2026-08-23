/* AT AI Mobil — Universal V5 Prototype v16.5
 * Pre-race only. Hedef yarış sonucu/sonrası hiçbir satır skorlamaya alınmaz.
 * V16.5 düzeltmeleri:
 *  - eski kariyer zirvelerinin bugünü aşırı taşıması azaltıldı,
 *  - hedef pist/mesafe kanıtı peak + güncel kanıt olarak birlikte okunuyor,
 *  - derece kanıtında tüm-zaman en iyi ile son 540 gün birlikte kullanılıyor,
 *  - tarihsel kazanan profilleri referans tipine göre ağırlıklandırılıyor.
 */
(()=>{'use strict';
  const VERSION='UNIVERSAL-V5-V16.5-PROTOTYPE';
  const txt=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):0));
  const iso=v=>{const s=txt(v);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return s;m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''};
  const dayDiff=(a,b)=>{const A=Date.parse(`${iso(a)}T00:00:00Z`),B=Date.parse(`${iso(b)}T00:00:00Z`);return Number.isFinite(A)&&Number.isFinite(B)?Math.round((B-A)/86400000):null};
  const norm=v=>txt(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I');
  const finish=r=>num(r?.finish??r?.rank??r?.sira??r?.Bitiriş??r?.bitiris);
  const dateOf=r=>iso(r?.isoDate??r?.date??r?.Tarih_ISO??r?.Tarih);
  const cityOf=r=>txt(r?.city??r?.sehir??r?.Şehir);
  const trackOf=r=>norm(r?.track??r?.pist??r?.Pist);
  const distOf=r=>{const v=num(r?.distance??r?.mesafe??r?.Mesafe);if(v)return v;const m=txt(r?.distance??r?.mesafe??r?.Mesafe).match(/\d{3,4}/);return m?Number(m[0]):null};
  const classOf=r=>txt(r?.class??r?.raceClass??r?.classRaw??r?.Koşu_Sınıfı??r?.Koşu_Sınıfı_Raw);
  const hpOf=r=>num(r?.hp??r?.HP);

  function classStrength(v){
    const s=norm(v);let m=s.match(/G\s*([123])/);if(m)return 116-Number(m[1])*5;
    m=s.match(/KV\s*[- ]?\s*(\d+)/);if(m)return 76+Math.min(20,Number(m[1])*2);
    m=s.match(/HANDIKAP\s*[- ]?\s*(\d+)|H\s*[- ]?\s*(\d+)/);if(m){const n=Number(m[1]||m[2]);return clamp(14+n*4,45,86);}
    m=s.match(/SARTLI\s*[- ]?\s*(\d+)/);if(m)return 38+Number(m[1])*8;
    if(/SATIS/.test(s))return 45;if(/MAIDEN/.test(s))return 38;return 50;
  }
  function raceType(v){const s=norm(v);if(/MAIDEN/.test(s))return'MAIDEN';if(/HANDIKAP|\bH\s*[- ]?\d+/.test(s))return'HANDICAP';if(/\bG\s*[123]|KV/.test(s))return'CLASSIC';if(/SARTLI/.test(s))return'CONDITIONAL';if(/SATIS/.test(s))return'SALES';return'OTHER';}
  function cutoff(rows,cut){const c=iso(cut);return (Array.isArray(rows)?rows:[]).filter(r=>{const d=dateOf(r);return d&&d<c;}).slice().sort((a,b)=>dateOf(a).localeCompare(dateOf(b)));}
  function resultScore(f){if(f===1)return 100;if(f===2)return 88;if(f===3)return 78;if(f===4)return 67;if(f===5)return 58;if(f===6)return 50;if(f===7)return 43;if(f===8)return 36;if(f===9)return 30;if(f>=10)return 22;return 35;}
  function recency(days){if(days===null||days<0)return 0;if(days<=14)return 1;if(days<=30)return .94;if(days<=45)return .86;if(days<=60)return .78;if(days<=90)return .67;if(days<=120)return .56;if(days<=180)return .43;if(days<=365)return .26;return .12;}
  function distScore(d,t){if(!d||!t)return 40;const x=Math.abs(d-t);if(x===0)return 100;if(x<=100)return 92;if(x<=200)return 80;if(x<=300)return 65;if(x<=400)return 50;return 28;}
  function timeSec(v){const s=txt(v).replace(',', '.');if(!s)return null;let m=s.match(/^(\d+)\.(\d{1,2})\.(\d{1,2})(?:\.(\d+))?$/);if(m)return Number(m[1])*60+Number(m[2])+Number(`0.${m[3]}${m[4]||''}`);m=s.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/);if(m)return Number(m[1])*60+Number(m[2])+Number(`0.${m[3]||0}`);m=s.match(/^(\d+)\.(\d{2})$/);if(m){const a=Number(m[1]),b=Number(m[2]);return a>=10?a+b/100:null;}return null;}
  function weighted(items){let n=0,d=0;for(const x of items){if(!Number.isFinite(x?.v)||!Number.isFinite(x?.w)||x.w<=0)continue;n+=x.v*x.w;d+=x.w;}return d?n/d:0;}
  function readiness(gap){if(gap===null)return 50;if(gap<5)return 68;if(gap<=14)return 95;if(gap<=35)return 100;if(gap<=55)return 92;if(gap<=80)return 80;if(gap<=120)return 65;if(gap<=180)return 52;return 38;}
  function avgFinish(rows){const a=rows.map(finish).filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;}

  function features(horse,career,target,field){
    const rows=cutoff(career,target.date),td=num(target.distance),tt=norm(target.track),tc=txt(target.city),ts=classStrength(target.class);
    const last=rows.at(-1)||null,gap=last?dayDiff(dateOf(last),target.date):null;
    const recent=rows.filter(r=>{const d=dayDiff(dateOf(r),target.date);return d!==null&&d>=0&&d<=120;});
    const last3=recent.slice(-3).reverse();
    const form=last3.length?weighted(last3.map((r,i)=>({v:resultScore(finish(r)),w:[1,.70,.45][i]}))):35;
    let progression=50;if(last3.length>=2)progression=clamp(50+(resultScore(finish(last3[0]))-resultScore(finish(last3[1])))*.75);
    const evidence=[],exact=[],upper=[];let winsNear=0;
    for(const r of rows){
      const d=dayDiff(dateOf(r),target.date),sameTrack=trackOf(r)===tt,ds=distScore(distOf(r),td),cs=classStrength(classOf(r));
      const classFit=clamp(100-Math.abs(cs-ts)*1.8),city=cityOf(r)===tc?1.04:1;
      const base=clamp(resultScore(finish(r))*.58+ds*.22+classFit*.20);
      const surf=sameTrack?1:.68,fresh=.48+.52*recency(d);
      const value=clamp(base*surf*city*fresh);
      evidence.push({v:value,d,r});
      if(sameTrack&&ds>=92&&cityOf(r)===tc)exact.push({v:value,d,r});
      if(cs>=ts&&sameTrack&&ds>=65)upper.push({v:value,d,r});
      if(finish(r)===1&&sameTrack&&ds>=80)winsNear++;
    }
    const peakExact=exact.slice().sort((a,b)=>b.v-a.v).slice(0,3);
    const recentExact=exact.slice().sort((a,b)=>a.d-b.d).slice(0,3);
    const peakExactScore=peakExact.length?weighted(peakExact.map((x,i)=>({v:x.v,w:[1,.72,.50][i]}))):0;
    const recentExactScore=recentExact.length?weighted(recentExact.map((x,i)=>({v:x.v,w:[1,.72,.50][i]}))):0;
    const exactEvidence=exact.length?clamp((peakExactScore*.65+recentExactScore*.35)*(.72+.28*Math.min(1,exact.length/3))):0;
    const broadEvidence=evidence.length?weighted(evidence.slice().sort((a,b)=>b.v-a.v).slice(0,4).map((x,i)=>({v:x.v,w:[1,.75,.55,.4][i]}))):0;
    let upperProof=0;if(upper.length){const peak=Math.max(...upper.map(x=>x.v));const recentUpper=upper.slice().sort((a,b)=>a.d-b.d).slice(0,3);const recentScore=weighted(recentUpper.map((x,i)=>({v:x.v,w:[1,.70,.45][i]})));upperProof=clamp(peak*.65+recentScore*.35);}
    const hp=num(horse?.hp??horse?.HP),fieldHps=(field||[]).map(x=>num(x?.hp??x?.HP)).filter(Number.isFinite);
    let hpScore=50;if(hp!==null&&fieldHps.length){const lo=Math.min(...fieldHps),hi=Math.max(...fieldHps);hpScore=hi===lo?60:clamp(35+(hp-lo)/(hi-lo)*65);}
    const wt=num(horse?.weight??horse?.Sıklet),wts=(field||[]).map(x=>num(x?.weight??x?.Sıklet)).filter(Number.isFinite);
    let weightScore=50;if(wt!==null&&wts.length){const lo=Math.min(...wts),hi=Math.max(...wts);weightScore=hi===lo?55:clamp(35+(hi-wt)/(hi-lo)*65);}
    const handicapEff=clamp(hpScore*.68+weightScore*.32);

    const ownTimes=[];for(const r of rows){if(trackOf(r)!==tt||distOf(r)!==td)continue;const t=timeSec(r?.degree??r?.derece??r?.Derece),d=dayDiff(dateOf(r),target.date);if(Number.isFinite(t))ownTimes.push({t,d});}
    const fieldTimes=[];for(const fh of field||[]){const cid=txt(fh?.id??fh?.horseId??fh?.At_ID),c=(fh.__careerMap&&fh.__careerMap[cid])||fh?.career||[];for(const r of cutoff(c,target.date)){if(trackOf(r)!==tt||distOf(r)!==td)continue;const t=timeSec(r?.degree??r?.derece??r?.Derece),d=dayDiff(dateOf(r),target.date);if(Number.isFinite(t))fieldTimes.push({t,d});}}
    let timeScore=50;
    if(ownTimes.length&&fieldTimes.length){
      const ownCareer=Math.min(...ownTimes.map(x=>x.t)),fieldCareer=Math.min(...fieldTimes.map(x=>x.t));
      const careerScore=clamp(100-(ownCareer-fieldCareer)*11,35,100);
      const ownRecent=ownTimes.filter(x=>x.d!==null&&x.d>=0&&x.d<=540),fieldRecent=fieldTimes.filter(x=>x.d!==null&&x.d>=0&&x.d<=540);
      if(ownRecent.length&&fieldRecent.length){const recentScore=clamp(100-(Math.min(...ownRecent.map(x=>x.t))-Math.min(...fieldRecent.map(x=>x.t)))*11,35,100);timeScore=clamp(careerScore*.40+recentScore*.60);}
      else timeScore=clamp(careerScore*.70);
    }
    return {rows,form,progression,exactEvidence,recentExactScore,broadEvidence,upperProof,hpScore,weightScore,handicapEff,timeScore,readiness:readiness(gap),gap,winsNear,careerCount:rows.length,exactCount:exact.length,avgFinish:avgFinish(rows)};
  }

  function profile(rows,cutDate){const a=cutoff(rows,cutDate),last=a.at(-1);return {n:a.length,hp:hpOf(last),gap:last?dayDiff(dateOf(last),cutDate):null,avg:avgFinish(a.slice(-6)),wins:a.filter(r=>finish(r)===1).length};}
  function referenceWeight(r){const x=num(r?.referenceWeight);return x===null?1:clamp(x,.10,1);}
  function historySimilarity(career,targetDate,refs){const p=profile(career,targetDate),vals=[];for(const r of Array.isArray(refs)?refs:[]){const q=profile(r?.career||[],r?.referenceDate||r?.date);if(!q.n)continue;const x=[];if(p.n&&q.n)x.push(clamp(100-Math.abs(p.n-q.n)*4));if(p.hp!==null&&q.hp!==null)x.push(clamp(100-Math.abs(p.hp-q.hp)*3));if(p.gap!==null&&q.gap!==null)x.push(clamp(100-Math.abs(p.gap-q.gap)*1.5));if(p.avg!==null&&q.avg!==null)x.push(clamp(100-Math.abs(p.avg-q.avg)*9));x.push(clamp(100-Math.abs(p.wins-q.wins)*14));if(x.length)vals.push({v:x.reduce((a,b)=>a+b,0)/x.length,w:referenceWeight(r)});}return vals.length?weighted(vals):50;}

  function classWeights(type){
    if(type==='MAIDEN')return {form:.23,exact:.23,broad:.12,upper:.04,hp:.07,weight:.03,time:.13,ready:.08,prog:.05,hist:.02};
    if(type==='HANDICAP')return {form:.19,exact:.19,broad:.10,upper:.07,hp:.10,weight:.12,time:.08,ready:.08,prog:.03,hist:.04};
    if(type==='CLASSIC')return {form:.15,exact:.18,broad:.08,upper:.20,hp:.15,weight:.04,time:.08,ready:.06,prog:.02,hist:.04};
    if(type==='CONDITIONAL')return {form:.20,exact:.22,broad:.10,upper:.10,hp:.09,weight:.05,time:.08,ready:.07,prog:.04,hist:.05};
    return {form:.20,exact:.20,broad:.12,upper:.08,hp:.10,weight:.07,time:.08,ready:.07,prog:.04,hist:.04};
  }
  function rank(rows,key){return [...rows].sort((a,b)=>(b[key]||0)-(a[key]||0)||(a.Program_No||99)-(b.Program_No||99));}

  function scoreRace({target,horses,careers={},references=[]}={}){
    const hs=Array.isArray(horses)?horses:[],type=raceType(target?.class),cleanRefs=(Array.isArray(references)?references:[]).map(r=>({...r,career:cutoff(r?.career||[],r?.referenceDate||r?.date)}));
    const carrier=hs.map(h=>({...h,__careerMap:careers}));
    const rows=carrier.map(h=>{const id=txt(h?.id??h?.horseId??h?.At_ID),name=txt(h?.name??h?.horseName??h?.At_Adı),c=cutoff(careers[id]||careers[name]||h?.career||[],target.date),f=features(h,c,target,carrier),hist=historySimilarity(c,target.date,cleanRefs),w=classWeights(type);
      let score=f.form*w.form+f.exactEvidence*w.exact+f.broadEvidence*w.broad+f.upperProof*w.upper+f.hpScore*w.hp+f.weightScore*w.weight+f.timeScore*w.time+f.readiness*w.ready+f.progression*w.prog+hist*w.hist;
      const refQuality=cleanRefs.length?weighted(cleanRefs.map(r=>({v:100,w:referenceWeight(r)}))):0;
      const evidenceCoverage=clamp((Math.min(f.careerCount,6)/6)*55+(Math.min(f.exactCount,2)/2)*30+(cleanRefs.length?15:0));
      let mode='HISTORY';if(f.careerCount===0){mode='DEBUT';const agf=num(h?.agf??h?.AGF);score=35+f.weightScore*.10+f.hpScore*.10+(agf!==null?clamp(agf,0,50)*.20:0);}
      const routeA=clamp(f.form*.30+f.exactEvidence*.30+f.broadEvidence*.15+f.timeScore*.10+f.progression*.10+f.readiness*.05);
      const routeB=clamp(f.upperProof*.25+f.hpScore*.20+f.handicapEff*.15+hist*.15+Math.min(100,30+f.winsNear*25)*.15+f.readiness*.10);
      return {Program_No:num(h?.no??h?.Program_No),At_ID:id,At_Adı:name,Koşu_Tipi:type,Mod:mode,HP:num(h?.hp??h?.HP),Sıklet:num(h?.weight??h?.Sıklet),AGF:num(h?.agf??h?.AGF),V5_SKOR:+clamp(score).toFixed(1),YOL_A:+routeA.toFixed(1),YOL_B:+routeB.toFixed(1),FORM:+f.form.toFixed(1),HEDEF_KANITI:+f.exactEvidence.toFixed(1),GUNCEL_HEDEF_KANITI:+f.recentExactScore.toFixed(1),BENZER_KANIT:+f.broadEvidence.toFixed(1),UST_SINIF:+f.upperProof.toFixed(1),HP_PUAN:+f.hpScore.toFixed(1),KILO_AVANTAJ:+f.weightScore.toFixed(1),DERECE_KANITI:+f.timeScore.toFixed(1),HAZIRLIK:+f.readiness.toFixed(1),IVME:+f.progression.toFixed(1),TARIHSEL_PROFIL:+hist.toFixed(1),REFERANS_KALITE:+refQuality.toFixed(1),KARIYER:f.careerCount,HEDEF_ORNEK:f.exactCount,VERI_GUVEN:+evidenceCoverage.toFixed(0)};});
    const byScore=rank(rows,'V5_SKOR'),byA=rank(rows,'YOL_A'),byB=rank(rows,'YOL_B'),aMap=new Map(byA.map((r,i)=>[r.At_ID||r.At_Adı,i+1])),bMap=new Map(byB.map((r,i)=>[r.At_ID||r.At_Adı,i+1]));
    const mainN=rows.length<=6?3:rows.length<=9?4:5;for(const r of rows){const k=r.At_ID||r.At_Adı;r.A_SIRA=aMap.get(k);r.B_SIRA=bMap.get(k);r.ANA_ADAY=byScore.slice(0,mainN).some(x=>(x.At_ID||x.At_Adı)===k);r.ADAY_TIPI=r.A_SIRA<=2&&r.B_SIRA<=3?'ÇİFT':r.A_SIRA<=2?'FORM':r.B_SIRA<=3?'KAPASİTE':r.ANA_ADAY?'SKOR':'TAKİP';}
    const debutCount=rows.filter(r=>r.Mod==='DEBUT').length;return {ok:true,version:VERSION,type,policy:{cutoff:'career date < target date; reference career date < reference date',market:'AGF yalnız kariyersiz/debut durumda düşük ağırlıklı tie-break',history:'EXACT 1.00 / CONDITION_TWIN 0.65 / RACE_FAMILY 0.35 referans ağırlığı',degree:'tüm-zaman en iyi %40 + son 540 gün en iyi %60',mainCandidates:mainN},confidence:debutCount===rows.length?'ÇOK DÜŞÜK':rows.reduce((s,r)=>s+r.VERI_GUVEN,0)/Math.max(1,rows.length)>=65?'YÜKSEK':'ORTA',rows:rank(rows,'V5_SKOR')};
  }
  const api={VERSION,scoreRace,classStrength,raceType};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;if(typeof window!=='undefined')window.ATUniversalV5=api;
})();
