/* AT AI Mobil — V16.5.7 Güncel Hesapla
   Kaynak mantık: GuncelKKK_ANALIZ_CATISI_TEK_ONCELIK.py
   Menü 1 / Güncel Analiz içine taşınmıştır.
   Canlı program verisi (AGF/Gny dahil) + hedef tarihten önceki kariyer verisi kullanılır.
   Sonuç API'si çağrılmaz. */

const CURRENT_GUNCEL_VERSION_V1657 = 'GUNCEL-HESAPLA-TEK-ONCELIK-V16.5.7';
const CURRENT_GUNCEL_SOURCE_V1657 = 'GuncelKKK_ANALIZ_CATISI_TEK_ONCELIK.py';

function gNumV1657(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let text = String(value).trim().replace(/\s+/g, '');
  if (!text || text === '-') return null;
  if (text.includes(',') && text.includes('.')) text = text.replace(/\./g, '').replace(',', '.');
  else text = text.replace(',', '.');
  text = text.replace(/[^0-9.\-]/g, '');
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function gClampV1657(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function gNormV1657(value) {
  return String(value ?? '')
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/Â/g, 'A').replace(/Î/g, 'I').replace(/Û/g, 'U')
    .replace(/\s+/g, ' ');
}

function gDateIsoV1657(value) {
  const text = String(value ?? '').trim();
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return '';
}

function gFinishV1657(row) {
  const n = gNumV1657(row?.finish ?? row?.rank ?? row?.sira ?? row?.der ?? row?.position);
  return n === null ? null : Math.trunc(n);
}

function gDistanceV1657(row) {
  return gNumV1657(row?.distance ?? row?.mesafe ?? row?.msf ?? row?.Mesafe) ?? null;
}

function gTrackV1657(row) {
  return row?.track ?? row?.pist ?? row?.Pist ?? row?.surface ?? '';
}

function gClassV1657(row) {
  return row?.class ?? row?.raceClass ?? row?.classRaw ?? row?.yaradi1 ?? row?.kcins ?? '';
}

function gClassSimilarV1657(previousClass, todayClass) {
  const a = gNormV1657(previousClass);
  const b = gNormV1657(todayClass);
  if (!a || !b) return false;
  const keys = ['MAIDEN','HANDIKAP','SARTLI','KV','GR','ACIK','SATIS'];
  for (const key of keys) if (a.includes(key) && b.includes(key)) return true;
  return a === b;
}

function gCareerRowsV1657(career) {
  if (!career || typeof career !== 'object' || career.ok === false) return [];
  for (const candidate of [career.history, career.preparationPath, career.top5, career.roadmap, career.races]) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  return [];
}

function gCareerSummaryV1657(career, race, cutoffIso) {
  const raw = gCareerRowsV1657(career);
  const rows = raw
    .map(row => ({ ...row, __date:gDateIsoV1657(row?.isoDate ?? row?.date ?? row?.tarih ?? row?.raceDate) }))
    .filter(row => row.__date && (!cutoffIso || row.__date < cutoffIso))
    .sort((a,b) => String(b.__date).localeCompare(String(a.__date)));

  if (!rows.length) {
    return {
      gecmisFormPuani:0, mesafePistPuani:0, sinifPuani:0, gecmisAnalizPuani:0,
      son10Yaris:0, son10Ilk3:0, son10Kazanma:0,
      benzerPistIlk3:0, benzerMesafeIlk3:0, benzerSinifIlk3:0,
      ortalamaDer:null, enIyiDer:null,
      not:'geçmiş sinyal zayıf', rowCount:0
    };
  }

  const son10 = rows.slice(0, 10);
  const finishes = son10.map(gFinishV1657).filter(Number.isFinite);
  const ilk3 = finishes.filter(x => x <= 3).length;
  const kazanma = finishes.filter(x => x === 1).length;
  const ilk5 = finishes.filter(x => x <= 5).length;
  const ort = finishes.length ? finishes.reduce((a,b)=>a+b,0) / finishes.length : null;
  const best = finishes.length ? Math.min(...finishes) : null;

  let form = Math.min(10, kazanma * 4) + Math.min(10, ilk3 * 2) + Math.min(5, ilk5);
  if (ort !== null) {
    if (ort <= 2.5) form += 5;
    else if (ort <= 4) form += 3;
    else if (ort <= 6) form += 1;
  }
  form = Math.min(25, form);

  const todayTrack = gNormV1657(race?.track ?? race?.pist ?? '');
  const todayDistance = gNumV1657(race?.distance ?? race?.mesafe);
  const todayClass = race?.class ?? race?.yaradi1 ?? '';

  const sameTrack = todayTrack
    ? rows.filter(row => gNormV1657(gTrackV1657(row)) === todayTrack)
    : [];
  const sameTrackTop3 = sameTrack.filter(row => {
    const f = gFinishV1657(row); return Number.isFinite(f) && f <= 3;
  }).length;

  const nearDistance = todayDistance === null ? [] : rows.filter(row => {
    const d = gDistanceV1657(row); return d !== null && Math.abs(d - todayDistance) <= 200;
  });
  const nearDistanceTop3 = nearDistance.filter(row => {
    const f = gFinishV1657(row); return Number.isFinite(f) && f <= 3;
  }).length;

  const sameClass = rows.filter(row => gClassSimilarV1657(gClassV1657(row), todayClass));
  const sameClassTop3 = sameClass.filter(row => {
    const f = gFinishV1657(row); return Number.isFinite(f) && f <= 3;
  }).length;

  const mp = Math.min(20, Math.min(10, sameTrackTop3 * 3) + Math.min(10, nearDistanceTop3 * 3));
  const cls = Math.min(10, sameClassTop3 * 3);
  const notes = [];
  if (kazanma > 0) notes.push(`son10 ${kazanma} galibiyet`);
  if (ilk3 > 0) notes.push(`son10 ${ilk3} ilk3`);
  if (sameTrackTop3 > 0) notes.push(`pistte ${sameTrackTop3} ilk3`);
  if (nearDistanceTop3 > 0) notes.push(`mesafede ${nearDistanceTop3} ilk3`);
  if (sameClassTop3 > 0) notes.push(`sınıfta ${sameClassTop3} ilk3`);
  if (!notes.length) notes.push('geçmiş sinyal zayıf');

  return {
    gecmisFormPuani:Number(form.toFixed(2)),
    mesafePistPuani:Number(mp.toFixed(2)),
    sinifPuani:Number(cls.toFixed(2)),
    gecmisAnalizPuani:Number((form + mp + cls).toFixed(2)),
    son10Yaris:son10.length, son10Ilk3:ilk3, son10Kazanma:kazanma,
    benzerPistIlk3:sameTrackTop3, benzerMesafeIlk3:nearDistanceTop3,
    benzerSinifIlk3:sameClassTop3,
    ortalamaDer:ort === null ? null : Number(ort.toFixed(2)),
    enIyiDer:best,
    not:notes.join('; '), rowCount:rows.length
  };
}

function gAgfShapeV1657(horses) {
  const values = horses.map(h => gNumV1657(h?.agf ?? h?.hpo)).filter(v => v !== null);
  const valid = values.filter(v => v > 0 && v < 100);
  let real = false;
  if (valid.length) {
    const integerRatio = valid.filter(v => Math.abs(v - Math.round(v)) < 1e-9).length / valid.length;
    const max = Math.max(...valid);
    const sum = valid.reduce((a,b)=>a+b,0);
    real = !((integerRatio >= 0.90 && max <= horses.length + 2 && sum < 60) || sum < 30);
  }

  const rankByHorse = new Map();
  if (real) {
    [...horses]
      .map((h,index)=>({h,index,v:gNumV1657(h?.agf ?? h?.hpo)}))
      .filter(x => x.v !== null && x.v > 0 && x.v < 100)
      .sort((a,b)=>b.v-a.v || a.index-b.index)
      .forEach((x,i)=>rankByHorse.set(x.h, i+1));
  } else {
    const ordinal = horses.map(h=>gNumV1657(h?.agf ?? h?.hpo));
    const looksRank = ordinal.some(v => v !== null && v > 0 && v <= horses.length + 2 && Math.abs(v-Math.round(v)) < 1e-9);
    if (looksRank) horses.forEach(h => {
      const v = gNumV1657(h?.agf ?? h?.hpo);
      if (v !== null && v > 0 && v < 999) rankByHorse.set(h, Math.round(v));
    });
  }
  return { real, rankByHorse };
}

function gProgramRankV1657(race, careerMap) {
  const horses = Array.isArray(race?.horses) ? race.horses : [];
  const shape = gAgfShapeV1657(horses);
  const agfVals = horses.map(h => shape.real ? gNumV1657(h?.agf ?? h?.hpo) : null).filter(v => v !== null && v > 0 && v < 100);
  const maxAgf = agfVals.length ? Math.max(...agfVals) : null;
  const oddsVals = horses.map(h=>gNumV1657(h?.odds ?? h?.ganyan)).filter(v=>v !== null && v>0 && v<999);
  const minOdds = oddsVals.length ? Math.min(...oddsVals) : null;
  const hpVals = horses.map(h=>gNumV1657(h?.hp ?? h?.hpu)).filter(v=>v !== null);
  const minHp = hpVals.length ? Math.min(...hpVals) : null;
  const maxHp = hpVals.length ? Math.max(...hpVals) : null;
  const weightVals = horses.map(h=>gNumV1657(h?.weight ?? h?.kilo)).filter(v=>v !== null);
  const minWeight = weightVals.length ? Math.min(...weightVals) : null;
  const maxWeight = weightVals.length ? Math.max(...weightVals) : null;
  const s20Vals = horses.map(h=>gNumV1657(h?.s20r ?? h?.s20)).filter(v=>v !== null);
  const minS20 = s20Vals.length ? Math.min(...s20Vals) : null;
  const maxS20 = s20Vals.length ? Math.max(...s20Vals) : null;

  const rows = horses.map((horse,index) => {
    const career = careerMap.get(String(horse?.id ?? '')) || null;
    const history = gCareerSummaryV1657(career, race, state.date);
    const agf = shape.real ? gNumV1657(horse?.agf ?? horse?.hpo) : null;
    const agfRank = shape.rankByHorse.get(horse) ?? null;
    const odds = gNumV1657(horse?.odds ?? horse?.ganyan);
    let agfSupport = 0;
    if (maxAgf !== null && agf !== null && agf > 0) agfSupport = agf / maxAgf * 15;
    else if (agfRank !== null) agfSupport = gClampV1657(16 - agfRank, 0, 15);
    else if (minOdds !== null && odds !== null && odds > 0 && odds < 999) agfSupport = gClampV1657(minOdds / odds * 10, 0, 10);

    const hp = gNumV1657(horse?.hp ?? horse?.hpu);
    let hpPoint = 0;
    if (hp !== null && minHp !== null && maxHp !== null) hpPoint = maxHp !== minHp ? (hp-minHp)/(maxHp-minHp)*8 : 5;

    const weight = gNumV1657(horse?.weight ?? horse?.kilo);
    let weightPoint = 0;
    if (weight !== null && minWeight !== null && maxWeight !== null) weightPoint = maxWeight !== minWeight ? (maxWeight-weight)/(maxWeight-minWeight)*8 : 4;

    const kgs = gNumV1657(horse?.kgs);
    let kgsPoint = 2;
    if (kgs !== null && kgs >= 14 && kgs <= 35) kgsPoint = 5;
    else if (kgs !== null && kgs >= 7 && kgs <= 60) kgsPoint = 3;
    else if (kgs !== null && kgs > 60) kgsPoint = 1;

    const s20 = gNumV1657(horse?.s20r ?? horse?.s20);
    let s20Point = 0;
    if (s20 !== null && minS20 !== null && maxS20 !== null) s20Point = maxS20 !== minS20 ? (s20-minS20)/(maxS20-minS20)*4 : 2;

    const score = history.gecmisFormPuani + history.mesafePistPuani + history.sinifPuani + hpPoint + weightPoint + kgsPoint + s20Point + agfSupport;
    const shadow = score >= 45 && (agfRank === null || agfRank >= 4);
    const explosion = score >= 50 && (agfRank === null || agfRank >= 5);
    const reasons = [];
    if (history.gecmisFormPuani >= 15) reasons.push('geçmiş form güçlü');
    if (history.mesafePistPuani >= 10) reasons.push('pist/mesafe uyumu');
    if (history.sinifPuani >= 6) reasons.push('sınıf uyumu');
    if (weightPoint >= 5) reasons.push('kilo avantajı');
    if (hpPoint >= 5) reasons.push('HP desteği');
    if (agfSupport >= 10) reasons.push('AGF desteği');
    if (shadow) reasons.push('gölge at');
    if (explosion) reasons.push('patlama adayı');
    if (!reasons.length) reasons.push('puan sınırlı');

    return {
      horse:{ ...horse },
      no:horse?.no ?? null, name:horse?.name ?? '', id:horse?.id ?? null,
      programAnalizSkoru:Number(score.toFixed(2)),
      programAgfDestekPuani:Number(agfSupport.toFixed(2)),
      programHpPuani:Number(hpPoint.toFixed(2)),
      programKiloPuani:Number(weightPoint.toFixed(2)),
      programKgsPuani:Number(kgsPoint.toFixed(2)),
      programS20Puani:Number(s20Point.toFixed(2)),
      agfOran:agf, agfSira:agfRank, ganyan:odds,
      programGolgeAtMi:shadow ? 'EVET' : 'HAYIR',
      programPatlamaAdayiMi:explosion ? 'EVET' : 'HAYIR',
      programNedenYazildi:reasons.join(', '),
      careerOk:Boolean(career?.ok),
      careerError:career?.ok ? null : (career?.error || (!horse?.id ? 'TJK At ID bulunamadı.' : 'Kariyer verisi alınamadı.')),
      history
    };
  });

  rows.sort((a,b) =>
    b.programAnalizSkoru - a.programAnalizSkoru ||
    ((b.agfOran ?? -Infinity) - (a.agfOran ?? -Infinity)) ||
    ((a.agfSira ?? Infinity) - (b.agfSira ?? Infinity)) ||
    ((a.ganyan ?? Infinity) - (b.ganyan ?? Infinity)) ||
    Number(a.no ?? 999) - Number(b.no ?? 999)
  );
  rows.forEach((row,index)=>row.programAnalizSirasi=index+1);
  return { rows, agfReal:shape.real };
}

function gStdSampleV1657(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a,b)=>a+b,0)/values.length;
  return Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/(values.length-1));
}

function gZorlukClassV1657(score) {
  if (score <= 35) return 'KOLAY';
  if (score <= 60) return 'ORTA';
  if (score <= 80) return 'ZOR';
  return 'ÇOK ZOR';
}

function gAtCountPointV1657(n) {
  if (!Number.isFinite(Number(n))) return 5;
  if (n <= 5) return 0;
  if (n <= 8) return 3;
  if (n <= 11) return 6;
  return 10;
}

function gRaceTypePointV1657(race) {
  const text = gNormV1657(`${race?.class ?? race?.yaradi1 ?? ''} ${race?.ageGroup ?? race?.yaradi2 ?? ''} ${race?.condition ?? race?.yaradi3 ?? ''} ${race?.yaradi4 ?? ''}`);
  if (text.includes('MAIDEN')) return 10;
  if (text.includes('HANDIKAP') || text.includes('HND')) return 8;
  if (text.includes('SATIS')) return 8;
  if (text.includes('SARTLI')) return 4;
  if (text.includes('KV')) return 3;
  if (text.includes('GR') || text.includes('G 1') || text.includes('G 2') || text.includes('G 3') || text.includes('ACIK')) return 2;
  return 5;
}

function gDifficultyV1657(race, ranked) {
  const rows = ranked.rows;
  const n = rows.length;
  const agf = rows.map(r=>r.agfOran).filter(v=>v !== null && v>0 && v<100).sort((a,b)=>b-a);
  const odds = rows.map(r=>r.ganyan).filter(v=>v !== null && v>0 && v<999).sort((a,b)=>a-b);
  let pAgf;
  if (agf.length >= 2) {
    const a1=agf[0], a2=agf[1], top3=agf.slice(0,3).reduce((a,b)=>a+b,0), diff=a1-a2;
    if (a1>=45 && diff>=20) pAgf=0;
    else if (a1>=35 && diff>=12) pAgf=6;
    else if (a1>=25 && diff>=7) pAgf=12;
    else if (top3>=60) pAgf=16;
    else pAgf=25;
  } else if (agf.length === 1) pAgf=12;
  else if (odds.length >= 2) {
    const g1=odds[0],g2=odds[1];
    if (g1<=2.5 && g2>=5) pAgf=4;
    else if (g1<=4 && g2>=6) pAgf=10;
    else if (g1<=6) pAgf=16;
    else pAgf=22;
  } else pAgf=15;

  const hp = rows.map(r=>gNumV1657(r.horse?.hp ?? r.horse?.hpu)).filter(v=>v!==null);
  let pHp;
  if (hp.length >= 3) {
    const range=Math.max(...hp)-Math.min(...hp), std=gStdSampleV1657(hp);
    if (range<=5) pHp=15; else if (range<=10) pHp=11; else if (std<=6) pHp=8; else if (range<=20) pHp=5; else pHp=2;
  } else if (hp.length) pHp=7; else pHp=8;

  const weights = rows.map(r=>gNumV1657(r.horse?.weight ?? r.horse?.kilo)).filter(v=>v!==null);
  let pWeight=5;
  if (weights.length>=3) {
    const range=Math.max(...weights)-Math.min(...weights);
    pWeight=range>=8?10:range>=5?7:range>=3?4:2;
  }

  const kgs = rows.map(r=>gNumV1657(r.horse?.kgs)).filter(v=>v!==null);
  let pKgs=5;
  if (kgs.length) {
    const long=kgs.filter(v=>v>60).length, short=kgs.filter(v=>v<7).length;
    pKgs=(long>=2||short>=2)?10:(long===1||short===1)?6:2;
  }

  const s20 = rows.map(r=>gNumV1657(r.horse?.s20r ?? r.horse?.s20)).filter(v=>v!==null);
  let pS20=5;
  if (s20.length>=3) {
    const range=Math.max(...s20)-Math.min(...s20);
    pS20=range<=3?8:range<=6?6:3;
  }

  let pOdds=5;
  if (odds.length>=3) {
    const [g1,g2,g3]=odds;
    if (g1<=2.5 && g2>=5) pOdds=0; else if (g1<=4 && g2>=6) pOdds=3; else if (g3<=6) pOdds=8; else pOdds=5;
  }

  const pCount=gAtCountPointV1657(n), pType=gRaceTypePointV1657(race);
  const score=Math.min(100,pAgf+pCount+pHp+pType+pWeight+pKgs+pS20+pOdds);
  const cls=gZorlukClassV1657(score);
  const proposal=cls==='KOLAY'?'TEK / DAR':cls==='ORTA'?'2-4 AT':cls==='ZOR'?'4-6 AT':'GENİŞ';
  const recommended=proposal==='TEK / DAR'?Math.min(1,n):proposal==='2-4 AT'?Math.min(4,n):proposal==='4-6 AT'?Math.min(6,n):n;
  let favorite=null;
  if (agf.length) favorite=[...rows].filter(r=>r.agfOran!==null).sort((a,b)=>b.agfOran-a.agfOran)[0]||null;
  else {
    const rankedAgf=[...rows].filter(r=>r.agfSira!==null).sort((a,b)=>a.agfSira-b.agfSira);
    if (rankedAgf.length) favorite=rankedAgf[0];
    else favorite=[...rows].filter(r=>r.ganyan!==null).sort((a,b)=>a.ganyan-b.ganyan)[0]||null;
  }
  return {
    atSayisi:n, favoriAt:favorite?.name||'', favoriAgf:favorite?.agfOran??null,
    favoriAgfSira:favorite?.agfSira??null, favoriGanyan:favorite?.ganyan??null,
    puanAgf:pAgf, puanAtSayisi:pCount, puanHp:pHp, puanKosuTipi:pType,
    puanKilo:pWeight, puanKgs:pKgs, puanS20:pS20, puanGanyan:pOdds,
    skor:score, sinif:cls, kuponOnerisi:proposal, onerilenAtSayisi:recommended
  };
}

function gTekGroupV1657(confidence, gap, difficultyClass) {
  const z=gNormV1657(difficultyClass);
  if (confidence>=85 && gap>=12 && (z==='KOLAY'||z==='ORTA')) return 'ÇOK GÜÇLÜ TEK';
  if (confidence>=75 && gap>=8) return 'GÜÇLÜ TEK';
  if (confidence>=65 && gap>=4) return 'RİSKLİ TEK';
  return 'TEK ÖNERİLMEZ / SAĞLAMCI KAPAT';
}

function gTekInfoV1657(raceResult) {
  const rows=raceResult.horses;
  if (!rows.length) return null;
  const first=rows[0], second=rows[1]||null;
  const s1=first.programAnalizSkoru||0, s2=second?.programAnalizSkoru;
  const gap=Number((s2===null||s2===undefined ? s1 : s1-s2).toFixed(2));
  const z=raceResult.difficulty;
  const zNorm=gNormV1657(z.sinif);
  const zBonus=zNorm==='KOLAY'?18:zNorm==='ORTA'?10:zNorm==='ZOR'?0:zNorm==='COK ZOR'?-12:0;
  const proposalBonus=z.kuponOnerisi==='TEK / DAR'?8:z.kuponOnerisi==='2-4 AT'?3:z.kuponOnerisi==='4-6 AT'?-3:-8;
  const confidence=Number((s1+gap*1.75+zBonus+proposalBonus).toFixed(2));
  const group=gTekGroupV1657(confidence,gap,z.sinif);
  const gapNote=gap>=12?'1. at analizde açık ara önde':gap>=7?'1. at önde ama yıkılma ihtimali var':gap>=3?'yakın puanlı yarış, tek riskli':'çok yakın yarış, tek önerilmez';
  return {
    candidateNo:first.no,candidateName:first.name,candidateScore:s1,
    challengerNo:second?.no??null,challengerName:second?.name??'',challengerScore:second?.programAnalizSkoru??null,
    gap,confidence,group,
    note:`${gapNote}; koşu zorluğu: ${z.sinif}; kupon önerisi: ${z.kuponOnerisi}`
  };
}

async function gMapLimitV1657(items, limit, worker) {
  const out=new Array(items.length); let cursor=0;
  async function run(){ while(true){ const i=cursor++; if(i>=items.length)return; out[i]=await worker(items[i],i); } }
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),items.length||1)},()=>run()));
  return out;
}

function gCurrentValidV1657(result) {
  return result?.type==='current' && result?.version===CURRENT_GUNCEL_VERSION_V1657 &&
    String(result?.date||'')===String(state?.date||'') && String(result?.city||'')===String(state?.city||'') && Array.isArray(result?.races);
}

function gRenderCurrentV1657(result, raceFilter='all') {
  const content=$('analysisContent'); if(!content)return;
  content.classList.remove('empty');
  const races=Array.isArray(result?.races)?result.races:[];
  const shown=String(raceFilter)==='all'?races:races.filter(r=>String(r.no)===String(raceFilter));
  if(!shown.length){ content.innerHTML='<div style="padding:12px">Bu koşu için Güncel Hesapla sonucu yok. <b>Analizi Hesapla</b> düğmesine basın.</div>'; return; }
  const pct=v=>v===null||v===undefined?'—':escapeHtml(Number(v).toFixed(2));
  content.innerHTML=`
    <div style="margin-bottom:12px;font-size:12px;line-height:1.55">
      <b>GÜNCEL HESAPLA · TEK ÖNCELİK</b><br>
      <span style="opacity:.75">Kaynak model: ${escapeHtml(CURRENT_GUNCEL_SOURCE_V1657)}. Sıralama; son 10 form, tüm kariyerde pist/±200 m/sınıf ilk-3 kanıtı, HP, kilo, KGS, S20 ve düşük ağırlıklı AGF/Gny desteğini birlikte kullanır. Sonuç verisi çağrılmaz.</span>
    </div>
    ${shown.map(r=>`
      <section style="margin:12px 0;border:1px solid rgba(255,255,255,.14);border-radius:12px;overflow:hidden">
        <div style="padding:10px 11px;background:rgba(126,226,168,.07);display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div><b>${escapeHtml(r.no)}. Koşu</b><div style="font-size:11px;opacity:.7;margin-top:2px">${escapeHtml(r.class||'')} · ${escapeHtml(r.distance||'')} ${escapeHtml(r.track||'')}</div></div>
          <div style="text-align:right;font-size:11px"><b>${escapeHtml(r.difficulty?.sinif||'')}</b> · ${pct(r.difficulty?.skor)}<br><span style="opacity:.72">${escapeHtml(r.difficulty?.kuponOnerisi||'')}</span></div>
        </div>
        ${r.tek?`<div style="padding:8px 11px;border-top:1px solid rgba(255,255,255,.08);font-size:11px"><b>TEK ${escapeHtml(r.tek.priority||'')}</b> · ${escapeHtml(r.tek.group)} · ${escapeHtml(r.tek.candidateNo)}-${escapeHtml(r.tek.candidateName)} · güven ${pct(r.tek.confidence)} · fark ${pct(r.tek.gap)}${r.tek.challengerName?`<br><span style="opacity:.7">Yıkabilecek: ${escapeHtml(r.tek.challengerNo)}-${escapeHtml(r.tek.challengerName)}</span>`:''}</div>`:''}
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;min-width:760px">
          <thead><tr><th style="padding:7px;text-align:left">#</th><th style="padding:7px;text-align:left">At</th><th style="padding:7px">Analiz</th><th style="padding:7px">Form</th><th style="padding:7px">Pist/Mes.</th><th style="padding:7px">Sınıf</th><th style="padding:7px">HP</th><th style="padding:7px">Kilo</th><th style="padding:7px">KGS</th><th style="padding:7px">S20</th><th style="padding:7px">AGF Destek</th></tr></thead>
          <tbody>${r.horses.map((h,i)=>`<tr style="background:${i===0?'rgba(126,226,168,.06)':'transparent'};border-top:1px solid rgba(255,255,255,.07)"><td style="padding:7px"><b>${i+1}</b></td><td style="padding:7px"><b>${escapeHtml(h.no)}. ${escapeHtml(h.name)}</b><div style="opacity:.62;margin-top:2px">${escapeHtml(h.programNedenYazildi||'')}</div>${h.careerError?`<div style="opacity:.65">⚠ ${escapeHtml(h.careerError)}</div>`:''}${h.programGolgeAtMi==='EVET'?'<span style="margin-right:5px">GÖLGE</span>':''}${h.programPatlamaAdayiMi==='EVET'?'<span>PATLAMA</span>':''}</td><td style="padding:7px;text-align:center"><b>${pct(h.programAnalizSkoru)}</b></td><td style="padding:7px;text-align:center">${pct(h.history?.gecmisFormPuani)}</td><td style="padding:7px;text-align:center">${pct(h.history?.mesafePistPuani)}</td><td style="padding:7px;text-align:center">${pct(h.history?.sinifPuani)}</td><td style="padding:7px;text-align:center">${pct(h.programHpPuani)}</td><td style="padding:7px;text-align:center">${pct(h.programKiloPuani)}</td><td style="padding:7px;text-align:center">${pct(h.programKgsPuani)}</td><td style="padding:7px;text-align:center">${pct(h.programS20Puani)}</td><td style="padding:7px;text-align:center">${pct(h.programAgfDestekPuani)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`).join('')}`;
}

async function gRunCurrentV1657() {
  const raceValue=$('analysisRace')?.value||'all';
  const content=$('analysisContent'); if(!content)return;
  if(!Array.isArray(state.races)||!state.races.length){ content.innerHTML='Önce TJK programını yüklemelisiniz.'; return; }
  const selected=raceValue==='all'?state.races:state.races.filter(r=>String(r.no)===String(raceValue));
  if(!selected.length){ content.innerHTML='Seçilen koşu programda bulunamadı.'; return; }
  const jobs=[];
  for(const race of selected) for(const horse of (Array.isArray(race.horses)?race.horses:[])) jobs.push({raceNo:race.no,horse});
  content.innerHTML=`<div style="padding:15px">Güncel Hesapla hazırlanıyor…<br><br><b>${jobs.length}</b> atın yarış öncesi kariyeri kontrol ediliyor.</div>`;
  let completed=0;
  const loaded=await gMapLimitV1657(jobs,4,async job=>{
    let career;
    if(!job.horse?.id) career={ok:false,error:'TJK At ID bulunamadı.'};
    else try { career=await fetchCareer(job.horse.id,state.date); } catch(e){ career={ok:false,error:e?.message||'Kariyer verisi alınamadı.'}; }
    completed++;
    if(content) content.innerHTML=`<div style="padding:15px">Güncel Hesapla hazırlanıyor…<br><br>${completed} / ${jobs.length} at tamamlandı.</div>`;
    return {...job,career};
  });

  const calculated=selected.map(race=>{
    const map=new Map();
    for(const item of loaded.filter(x=>String(x.raceNo)===String(race.no))) if(item.horse?.id) map.set(String(item.horse.id),item.career);
    const ranked=gProgramRankV1657(race,map);
    const difficulty=gDifficultyV1657(race,ranked);
    const result={no:race.no,time:race.time||'',class:race.class||'',ageGroup:race.ageGroup||'',distance:race.distance||'',track:race.track||'',agfReal:ranked.agfReal,difficulty,horses:ranked.rows};
    result.tek=gTekInfoV1657(result);
    return result;
  });

  const previous=state.analyses?.current;
  let merged=calculated;
  if(raceValue!=='all' && gCurrentValidV1657(previous)){
    const m=new Map(previous.races.map(r=>[String(r.no),r])); calculated.forEach(r=>m.set(String(r.no),r)); merged=[...m.values()].sort((a,b)=>Number(a.no)-Number(b.no));
  }
  const tekRows=merged.map(r=>({race:r,tek:r.tek})).filter(x=>x.tek).sort((a,b)=>b.tek.confidence-a.tek.confidence||b.tek.gap-a.tek.gap||b.tek.candidateScore-a.tek.candidateScore);
  tekRows.forEach((x,i)=>{x.tek.priority=`${i+1}. TEK ADAYI`;});
  const result={
    type:'current',version:CURRENT_GUNCEL_VERSION_V1657,sourceModel:CURRENT_GUNCEL_SOURCE_V1657,
    date:state.date,city:state.city,cityName:getCityName(),coverage:raceValue==='all'?'all':(previous?.coverage==='all'?'all':'partial'),calculatedRace:raceValue,
    rule:'LIVE_PROGRAM_PLUS_PRE_RACE_CAREER',agfPolicy:'DESTEK_PUANI_MAX_15; ANA_SIRALAMA_GECMIS_FORM_PIST_MESAFE_SINIF_HP_KILO_KGS_S20',
    resultApiCalled:false,resultDataLoaded:false,races:merged,generatedAt:new Date().toISOString()
  };
  state.analyses.current=result; save(); gRenderCurrentV1657(result,raceValue);
  status(`Güncel Hesapla tamamlandı · ${calculated.length} koşu`);
}

const runAnalysisBeforeV1657 = runAnalysis;
runAnalysis = async function() {
  const view=$('analysisDialog')?.dataset?.view||'current';
  if(view==='current') return gRunCurrentV1657();
  return runAnalysisBeforeV1657();
};

const openAnalysisBeforeV1657 = openAnalysis;
openAnalysis = function(view) {
  const out=openAnalysisBeforeV1657(view);
  if(view==='current'){
    const cached=state.analyses?.current;
    if(gCurrentValidV1657(cached)) gRenderCurrentV1657(cached,$('analysisRace')?.value||'all');
    else if($('analysisContent')) { $('analysisContent').classList.add('empty'); $('analysisContent').innerHTML='Güncel Hesapla modelini çalıştırmak için <b>Analizi Hesapla</b> düğmesine basın.'; }
  }
  return out;
};

const handleAnalysisRaceChangeBeforeV1657 = handleAnalysisRaceChange;
handleAnalysisRaceChange = function() {
  if($('analysisDialog')?.dataset?.view==='current'){
    const cached=state.analyses?.current;
    if(gCurrentValidV1657(cached)) gRenderCurrentV1657(cached,$('analysisRace')?.value||'all');
    return;
  }
  return handleAnalysisRaceChangeBeforeV1657();
};

if ($('runAnalysis')) $('runAnalysis').onclick = runAnalysis;
if ($('analysisRace')) $('analysisRace').onchange = handleAnalysisRaceChange;
window.__AT_CURRENT_GUNCEL_V1657__ = CURRENT_GUNCEL_VERSION_V1657;
console.info('[AT AI]', CURRENT_GUNCEL_VERSION_V1657, 'aktif');
