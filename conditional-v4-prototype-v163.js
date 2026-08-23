/* AT AI Mobil — Şartlı V4 Prototype v16.3
 * AMAÇ: Şartlı yarışlarda tek doğrusal skor yerine iki bağımsız kazanma yolu üretmek.
 *  - FORM_YOLU_A: güncel form + yakın dönem sınıf gücü + sınıf düşüşü + yakın hedef uyumu
 *  - KAPASITE_YOLU_B: kanıtlanmış aynı/benzer koşul kapasitesi + üst sınıf kanıtı + HP + tarihsel kazanan profili
 *  - ADAY_TIPI: FORM / KAPASİTE / ÇİFT / TAKİP
 *
 * Tarih sızıntısı kuralı:
 *  - Güncel at kariyeri: raceDate < targetDate
 *  - Referans kazanan kariyeri: raceDate < referenceDate
 * Bu modül hedef yarış sonucu/sonrası hiçbir satırı kabul etmez.
 *
 * Bu dosya PROTOTİPTİR; mevcut 5 Model, Kariyer/Hazırlık ve ana analiz skorlarını değiştirmez.
 */
(()=>{'use strict';
  if (typeof window !== 'undefined' && window.__AT_CONDITIONAL_V4_V163__) return;
  if (typeof window !== 'undefined') window.__AT_CONDITIONAL_V4_V163__ = true;

  const VERSION = 'CONDITIONAL-V4-V16.3-PROTOTYPE';
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):0));
  const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  const txt=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const iso=v=>{const s=txt(v);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return s;m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);return m?`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`:''};
  const dayDiff=(a,b)=>{const A=Date.parse(`${iso(a)}T00:00:00Z`),B=Date.parse(`${iso(b)}T00:00:00Z`);return Number.isFinite(A)&&Number.isFinite(B)?Math.round((B-A)/86400000):null};
  const surface=v=>txt(v).toLocaleUpperCase('tr-TR');
  const dist=v=>{const n=num(v);if(n)return n;const m=txt(v).match(/\d{3,4}/);return m?Number(m[0]):null};
  const finish=r=>num(r?.finish??r?.rank??r?.Bitiriş??r?.bitiris??r?.sira);
  const dateOf=r=>iso(r?.isoDate??r?.date??r?.Tarih_ISO??r?.Tarih);
  const cityOf=r=>txt(r?.city??r?.sehir??r?.Şehir);
  const trackOf=r=>surface(r?.track??r?.pist??r?.Pist);
  const distOf=r=>dist(r?.distance??r?.mesafe??r?.Mesafe);
  const classOf=r=>txt(r?.class??r?.raceClass??r?.Koşu_Sınıfı??r?.Koşu_Sınıfı_Raw??r?.classRaw);
  const hpOf=r=>num(r?.hp??r?.HP);

  function classStrength(v){
    const s=txt(v).toLocaleUpperCase('tr-TR').replace(/İ/g,'I');
    let m=s.match(/G\s*([123])/); if(m) return 115-Number(m[1])*5;
    m=s.match(/KV\s*[- ]?\s*(\d+)/); if(m) return 76+Math.min(18,Number(m[1])*2);
    m=s.match(/SATIS|SATIŞ/); if(m) return 45;
    m=s.match(/HANDIKAP\s*[- ]?\s*(\d+)|H\s*[- ]?\s*(\d+)/); if(m){const n=Number(m[1]||m[2]);return clamp(10+n*4,45,82);}
    m=s.match(/SARTLI\s*[- ]?\s*(\d+)|ŞARTLI\s*[- ]?\s*(\d+)/); if(m){const n=Number(m[1]||m[2]);return 38+n*8;}
    if(/MAIDEN/.test(s)) return 38;
    return 50;
  }

  function cutoffCareer(rows,cutoff){
    const c=iso(cutoff); if(!c) return [];
    return (Array.isArray(rows)?rows:[]).filter(r=>{const d=dateOf(r);return d&&d<c;}).slice().sort((a,b)=>dateOf(a).localeCompare(dateOf(b)));
  }

  function resultScore(f){
    if(f===1)return 100;if(f===2)return 88;if(f===3)return 78;if(f===4)return 68;if(f===5)return 60;
    if(f===6)return 52;if(f===7)return 45;if(f===8)return 38;if(f===9)return 32;if(f>=10)return 24;return 35;
  }
  function recencyWeight(days){
    if(days===null||days<0)return 0;
    if(days<=14)return 1.00;if(days<=30)return .92;if(days<=45)return .84;if(days<=60)return .75;if(days<=90)return .64;
    if(days<=120)return .52;if(days<=180)return .38;if(days<=365)return .22;return .12;
  }
  function distanceScore(d,target){
    if(!d||!target)return 45;const x=Math.abs(d-target);
    if(x===0)return 100;if(x<=100)return 92;if(x<=200)return 80;if(x<=300)return 65;if(x<=400)return 50;return 30;
  }
  function targetFit(r,target){
    const tr=trackOf(r), tt=surface(target.track); const sameTrack=tr&&tt&&tr===tt;
    const ds=distanceScore(distOf(r),dist(target.distance));
    const cs=classStrength(classOf(r)), ts=classStrength(target.class);
    const classFit=clamp(100-Math.abs(cs-ts)*2.2);
    const city=cityOf(r), tc=txt(target.city); const cityBonus=city&&tc&&city===tc?5:0;
    return clamp((sameTrack?20:3)+ds*.55+classFit*.20+cityBonus);
  }

  function weightedAvg(items){
    let n=0,d=0;for(const x of items){if(!Number.isFinite(x?.v)||!Number.isFinite(x?.w)||x.w<=0)continue;n+=x.v*x.w;d+=x.w;}return d?n/d:0;
  }

  function scoreFormPathA(horse,career,target){
    const rows=cutoffCareer(career,target.date);
    const recent=rows.filter(r=>{const d=dayDiff(dateOf(r),target.date);return d!==null&&d>=0&&d<=90;});
    const tClass=classStrength(target.class);
    const events=recent.map(r=>{
      const d=dayDiff(dateOf(r),target.date), perf=resultScore(finish(r)), fit=targetFit(r,target), cs=classStrength(classOf(r));
      const classFactor=clamp(55+(cs-tClass)*3.0);
      const raw=clamp(perf*(.45+.35*fit/100+.20*classFactor/100));
      const rec=.82+.18*recencyWeight(d);
      return {r,score:clamp(raw*rec),days:d,perf,fit,classFactor};
    }).sort((a,b)=>b.score-a.score);
    const best1=events[0]?.score||0,best2=events[1]?.score||0,best3=events[2]?.score||0;
    const signal=clamp(best1*.55+best2*.30+best3*.15);
    const last=recent.slice(-3).reverse();
    const lastPerf=weightedAvg(last.map((r,i)=>({v:resultScore(finish(r)),w:[1,.65,.4][i]||.3})));
    const last2=last.slice(0,2), prevClass=weightedAvg(last2.map((r,i)=>({v:classStrength(classOf(r)),w:i?.7:1})));
    const recentBest=last2.length?Math.max(...last2.map(r=>resultScore(finish(r)))):35;
    const dropBase=clamp(50+(prevClass-tClass)*4.0);
    const drop=clamp(dropBase*(.60+.40*recentBest/100));
    const exactRecent=Math.max(0,...events.filter(x=>x.fit>=82).map(x=>x.score));
    let momentum=50;if(last.length>=2){const a=resultScore(finish(last[0])),b=resultScore(finish(last[1]));momentum=clamp(50+(a-b)*.6);}
    const A=clamp(signal*.45+drop*.20+exactRecent*.20+lastPerf*.10+momentum*.05);
    return {FORM_YOLU_A:+A.toFixed(1),A_GUCLU_SINYAL:+signal.toFixed(1),A_SINIF_DUSUSU:+drop.toFixed(1),A_YAKIN_HEDEF_KANITI:+exactRecent.toFixed(1),A_SON_FORM:+lastPerf.toFixed(1),A_IVME:+momentum.toFixed(1),A_SON90_KOSU:recent.length};
  }

  function bestProof(rows,target,{sameCity=false,higher=false}={}){
    const tClass=classStrength(target.class), tc=txt(target.city), td=dist(target.distance), tt=surface(target.track);
    let best=0;
    for(const r of rows){
      if(tt&&trackOf(r)!==tt)continue;
      if(sameCity&&tc&&cityOf(r)!==tc)continue;
      const ds=distanceScore(distOf(r),td); if(ds<50)continue;
      const cs=classStrength(classOf(r)); if(higher && cs<tClass)continue;
      const perf=resultScore(finish(r));
      const classFactor=clamp(70+(cs-tClass)*2.2);
      const podium=finish(r)===1?10:finish(r)===2?6:finish(r)===3?3:0;
      const days=dayDiff(dateOf(r),target.date), freshness=days===null?0.55:clamp(.40+.60*Math.exp(-days/730),.40,1);
      const raw=clamp(perf*.62+ds*.20+classFactor*.18+podium);
      const v=clamp(raw*(.72+.28*freshness));
      if(v>best)best=v;
    }
    return best;
  }

  function profileFromCareer(rows,cutoff){
    const a=cutoffCareer(rows,cutoff), last=a[a.length-1];
    const n=a.length, hp=hpOf(last), gap=last?dayDiff(dateOf(last),cutoff):null;
    const last6=a.slice(-6);const f6=last6.length?last6.reduce((s,r)=>s+(finish(r)||10),0)/last6.length:null;
    return {careerCount:n,hp,gap,last6Avg:f6};
  }
  function profileSimilarity(horseCareer,targetDate,refs){
    const hp=profileFromCareer(horseCareer,targetDate); const ps=[];
    for(const x of Array.isArray(refs)?refs:[]){
      const p=x?.profile||profileFromCareer(x?.career||[],x?.referenceDate||x?.date); if(!p?.careerCount)continue;
      const parts=[];
      if(hp.careerCount&&p.careerCount)parts.push(clamp(100-Math.abs(hp.careerCount-p.careerCount)*2.5));
      if(hp.hp!==null&&p.hp!==null)parts.push(clamp(100-Math.abs(hp.hp-p.hp)*3.0));
      if(hp.gap!==null&&p.gap!==null)parts.push(clamp(100-Math.abs(hp.gap-p.gap)*1.5));
      if(hp.last6Avg!==null&&p.last6Avg!==null)parts.push(clamp(100-Math.abs(hp.last6Avg-p.last6Avg)*8));
      if(parts.length)ps.push(parts.reduce((a,b)=>a+b,0)/parts.length);
    }
    return ps.length?ps.reduce((a,b)=>a+b,0)/ps.length:50;
  }

  function scoreCapacityPathB(horse,career,target,references,field){
    const rows=cutoffCareer(career,target.date);
    const exactProof=bestProof(rows,target,{sameCity:true,higher:false});
    const nationalProof=bestProof(rows,target,{sameCity:false,higher:false});
    const higherProof=bestProof(rows,target,{sameCity:false,higher:true});
    const proven=clamp(Math.max(exactProof,nationalProof*.96));
    const hp=num(horse?.hp??horse?.HP); const fieldHps=(field||[]).map(h=>num(h?.hp??h?.HP)).filter(Number.isFinite);
    let hpScore=50;if(hp!==null&&fieldHps.length){const lo=Math.min(...fieldHps),hi=Math.max(...fieldHps);hpScore=hi===lo?60:clamp(35+(hp-lo)/(hi-lo)*65);}
    const prof=profileSimilarity(rows,target.date,references);
    let winEvidence=0;for(const r of rows){if(finish(r)!==1||trackOf(r)!==surface(target.track)||distanceScore(distOf(r),dist(target.distance))<80)continue;const days=dayDiff(dateOf(r),target.date),fresh=days===null?.45:clamp(.35+.65*Math.exp(-days/900),.35,1);const cf=clamp(70+(classStrength(classOf(r))-classStrength(target.class))*2.5,45,110)/100;winEvidence+=fresh*cf;}
    const winMemory=clamp(30+Math.min(1.0,winEvidence/1.8)*70);
    const B=clamp(proven*.35+higherProof*.30+hpScore*.10+prof*.10+winMemory*.15);
    return {KAPASITE_YOLU_B:+B.toFixed(1),B_KANITLANMIS_KOSUL:+proven.toFixed(1),B_UST_SINIF_KANITI:+higherProof.toFixed(1),B_HP_KAPASITE:+hpScore.toFixed(1),B_TARIHSEL_PROFIL:+prof.toFixed(1),B_GALIBIYET_HAFIZASI:+winMemory.toFixed(1)};
  }

  function rankDesc(rows,key){return [...rows].sort((a,b)=>(b[key]||0)-(a[key]||0)).map((r,i)=>[r,i+1]);}

  function scoreRace({target,horses,careers={},references=[]}={}){
    const cls=txt(target?.class).toLocaleUpperCase('tr-TR');
    if(!/ŞARTLI|SARTLI/.test(cls)) return {ok:false,version:VERSION,error:'Şartlı V4 yalnız ŞARTLI yarışlar için çalışır.',rows:[]};
    const cleanRefs=(Array.isArray(references)?references:[]).map(r=>({...r,career:cutoffCareer(r?.career||[],r?.referenceDate||r?.date)}));
    const rows=(Array.isArray(horses)?horses:[]).map(h=>{
      const id=txt(h?.id??h?.At_ID??h?.horseId), name=txt(h?.name??h?.At_Adı??h?.horseName);
      const c=cutoffCareer(careers[id]||careers[name]||h?.career||[],target.date);
      const A=scoreFormPathA(h,c,target), B=scoreCapacityPathB(h,c,target,cleanRefs,horses);
      return {Program_No:num(h?.no??h?.Program_No),At_ID:id,At_Adı:name,HP:num(h?.hp??h?.HP),Sıklet:num(h?.weight??h?.Sıklet),Ganyan:num(h?.odds??h?.Ganyan),...A,...B,_careerCount:c.length};
    });
    const aRanks=new Map(rankDesc(rows,'FORM_YOLU_A').map(([r,i])=>[r.At_ID||r.At_Adı,i]));
    const bRanks=new Map(rankDesc(rows,'KAPASITE_YOLU_B').map(([r,i])=>[r.At_ID||r.At_Adı,i]));
    const a2=[...rows].sort((x,y)=>y.FORM_YOLU_A-x.FORM_YOLU_A)[1]?.FORM_YOLU_A??0;
    const b3=[...rows].sort((x,y)=>y.KAPASITE_YOLU_B-x.KAPASITE_YOLU_B)[2]?.KAPASITE_YOLU_B??0;
    for(const r of rows){
      const k=r.At_ID||r.At_Adı;r.A_SIRA=aRanks.get(k);r.B_SIRA=bRanks.get(k);
      const aTop=r.A_SIRA<=2 || r.FORM_YOLU_A>=a2-1.0;
      const bTop=r.B_SIRA<=3 || r.KAPASITE_YOLU_B>=b3-0.75;
      r.ADAY_TIPI=aTop&&bTop?'ÇİFT':aTop?'FORM':bTop?'KAPASİTE':'TAKİP';
      r.ANA_ADAY=!!(aTop||bTop);
      r.V4_GUVEN=+(Math.max(r.FORM_YOLU_A,r.KAPASITE_YOLU_B)*.70+Math.min(r.FORM_YOLU_A,r.KAPASITE_YOLU_B)*.30).toFixed(1);
      delete r._careerCount;
    }
    rows.sort((a,b)=>(Number(b.ANA_ADAY)-Number(a.ANA_ADAY))||(Math.min(a.A_SIRA,a.B_SIRA)-Math.min(b.A_SIRA,b.B_SIRA))||(b.V4_GUVEN-a.V4_GUVEN));
    return {ok:true,version:VERSION,policy:{A:'FORM_YOLU_A ilk 2',B:'KAPASITE_YOLU_B ilk 3',candidate:'A ilk2 (+1.0 puan eşik bandı) ∪ B ilk3 (+0.75 puan eşik bandı)',leakage:'career date < target date; reference career date < reference date'},rows};
  }

  const api={VERSION,classStrength,cutoffCareer,scoreFormPathA,scoreCapacityPathB,scoreRace};
  if(typeof window!=='undefined')window.ATConditionalV4=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
