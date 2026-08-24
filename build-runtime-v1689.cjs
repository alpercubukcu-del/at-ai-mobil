const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');

const ROOT=__dirname;
const BASE=path.join(ROOT,'build-runtime-v1678.cjs');
const APP=path.join(ROOT,'public','at-ai-app-v142.js');
const INDEX=path.join(ROOT,'public','index.html');
const MENU_PATCH=path.join(ROOT,'menu-cleanup-v1689.js');
const SOURCE_MODE='Güncel Analiz + Kariyer Yol Haritası 5 Model';

for(const f of [BASE,MENU_PATCH]) if(!fs.existsSync(f)) throw new Error(`[V16.8.9] Eksik dosya: ${path.basename(f)}`);
execFileSync(process.execPath,[BASE],{cwd:ROOT,stdio:'inherit'});
if(!fs.existsSync(APP)||!fs.existsSync(INDEX)) throw new Error('[V16.8.9] V16.8.8 build çıktısı bulunamadı.');

let app=fs.readFileSync(APP,'utf8');
const menuPatch=fs.readFileSync(MENU_PATCH,'utf8');

function mustString(label,from,to){
  if(!app.includes(from)) throw new Error(`[V16.8.9] ${label} kaynak kalıbı bulunamadı.`);
  app=app.replace(from,to);
}
function mustRegex(label,re,to){
  const before=app;
  app=app.replace(re,to);
  if(app===before) throw new Error(`[V16.8.9] ${label} regex kalıbı bulunamadı.`);
}

// Menü 2 kaldırılınca eski numaralandırma katmanlarının yeni sıra ile çakışmasını engelle.
app=app.split('6. Kupon Oluştur').join('5. Kupon Oluştur');
app=app.split('7. Kariyer Excel Dışa Aktarım').join('6. Kariyer Excel Dışa Aktarım');
app=app.split('8. TJK Yıllık Yarış Arşivi').join('7. TJK Yıllık Yarış Arşivi');

// Kupon karar motorunun kaynaklarını yalnız Güncel + Kariyer Yolu/5 Model ile sınırla.
mustString('kanal ağırlıkları',
  "const CHANNEL_BASE_WEIGHTS={composite:.22,exact:.12,twin:.08,family:.07,career5:.10,current:.16,careerRoad:.12,winner:.13};",
  "const CHANNEL_BASE_WEIGHTS={current:.40,careerRoad:.18,composite:.14,exact:.09,twin:.05,family:.05,career5:.09};");
mustString('kanal etiketleri',
  "const CHANNEL_LABELS={composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career5:'5M Kariyer',current:'Güncel',careerRoad:'Kariyer Yolu',winner:'Kazanan Yolu'};",
  "const CHANNEL_LABELS={current:'Güncel',careerRoad:'Kariyer Yolu',composite:'Bileşik',exact:'Tam',twin:'İkiz',family:'Aile',career5:'5M Kariyer'};");

mustRegex('zorunlu veri denetimi',/  const career=state\?\.analyses\?\.career;[\s\S]*?lastAudit=result;return result;\n\}/,
`  const career=state?.analyses?.career;
  const careerMissing=raceNos.filter(no=>!sameDate(career)||!hasRaceHorses(career,no));
  if(careerMissing.length)issues.push({id:'career',label:'3. Kariyer Yol Haritası',detail:\`Eksik ayak: \${careerMissing.map(x=>\`\${x}.K\`).join(', ')}\`,action:'career'});
  const modelMissing=raceNos.filter(no=>!modelReady(no));
  if(modelMissing.length)issues.push({id:'models',label:'Kariyer Yol Haritası · 5 Model',detail:\`Eksik ayak: \${modelMissing.map(x=>\`\${x}.K\`).join(', ')}\`,action:'models'});
  const result={raceNos,issues,warnings,ready:issues.length===0,calibration:null,types,sourceMode:'${SOURCE_MODE}',checkedAt:new Date().toISOString()};lastAudit=result;return result;
}`);

mustRegex('hazır kaynak satırları',/function readyRows\(a\)\{[\s\S]*?\n\}\nfunction renderAudit/,
`function readyRows(a){
  const ids=new Set(a.issues.map(x=>x.id));const out=[];
  if(!ids.has('program'))out.push({label:'TJK Programı',detail:\`\${a.raceNos.length} kupon ayağı programdan doğrulandı.\`});
  if(!ids.has('current'))out.push({label:'Kaynak 1 · Güncel Analiz',detail:'Program + yarış öncesi güncel sinyaller ve yarış zorluğu hazır.'});
  if(!ids.has('career'))out.push({label:'Kaynak 2 · Kariyer Yol Haritası',detail:'Koşacak atların hedef tarih öncesi kariyer yolları hazır.'});
  if(!ids.has('models'))out.push({label:'Kaynak 2 · Kariyer Yolu 5 Model',detail:'Bileşik + Tam + İkiz + Aile + Kariyer kanalları hazır.'});
  return out;
}
function renderAudit`);

mustRegex('kanal skorlama motoru',/function channelWeights\(\)\{[\s\S]*?\n\}\nfunction costOf/,
`function channelWeights(){
  const w={...CHANNEL_BASE_WEIGHTS};const sum=Object.values(w).reduce((a,b)=>a+b,0)||1;for(const k of Object.keys(w))w[k]/=sum;return w;
}
function legDecision(no){
  const race=raceByNo(no),model=modelMem.get(contextKey(no));if(!race||!model)return null;
  const channels={current:currentChannel(no),careerRoad:careerChannel(no),composite:modelChannel(model,'composite'),exact:modelChannel(model,'exact'),twin:modelChannel(model,'twin'),family:modelChannel(model,'family'),career5:modelChannel(model,'career')};
  const weights=channelWeights();const horses=(race.horses||[]).map(h=>({horse:h,key:horseKey(h),sum:0,used:0,topVotes:0,top3Votes:0,parts:{}}));
  const available=Object.entries(channels).filter(([,c])=>c&&c.count);const availableTop=available.length;
  for(const item of horses){for(const [id,c] of available){const hit=c.map.get(item.key);if(!hit)continue;const w=weights[id]||0;item.sum+=hit.score*w;item.used+=w;item.parts[id]=hit;if(c.topKey===item.key)item.topVotes++;if(hit.rank<=3)item.top3Votes++;}item.consensus=item.used>0?item.sum/item.used:null;item.coverage=item.used;}
  const ranked=horses.filter(x=>x.consensus!==null).sort((a,b)=>b.consensus-a.consensus||b.topVotes-a.topVotes||(num(a.horse?.no)||999)-(num(b.horse?.no)||999));if(!ranked.length)return null;
  const top=ranked[0],second=ranked[1];const margin=top.consensus-(second?.consensus??0),agreement=availableTop?top.topVotes/availableTop*100:0;
  const cr=raceItem(state?.analyses?.current,no);const difficulty=clamp(cr?.difficulty?.skor??50);
  const coverage=Object.keys(top.parts).reduce((s,id)=>s+(weights[id]||0),0);const marginStrength=clamp(margin*7);const leaderStrength=clamp(top.consensus);const ease=100-difficulty;
  let confidence=.28*leaderStrength+.30*marginStrength+.25*agreement+.17*ease;confidence*=.70+.30*clamp(coverage*100)/100;confidence=clamp(confidence);
  const bankoEligible=confidence>=72&&agreement>=55&&margin>=6&&coverage>=.72;
  let width=confidence>=72?2:confidence>=60?3:confidence>=48?4:confidence>=38?5:6;if(difficulty>=70)width++;if(difficulty>=85)width++;if(margin<4)width++;if(agreement<40)width++;width=Math.min(Math.max(2,width),ranked.length);
  const reason=[];reason.push(\`güven %\${Math.round(confidence)}\`);reason.push(\`lider farkı \${margin.toFixed(1)}\`);reason.push(\`fikir birliği %\${Math.round(agreement)}\`);reason.push(\`zorluk \${cr?.difficulty?.sinif||Math.round(difficulty)}\`);reason.push('Güncel + Kariyer Yolu 5 Model');
  return {raceNo:no,race,ranked,channels,availableChannels:available.map(([id])=>id),confidence,margin,agreement,difficulty,coverage,bankoEligible,baseWidth:width,reason};
}
function costOf`);

mustString('Kazanan Yolu banko uyarısı',
  "  for(const x of outLegs)if(x.refCount<5)warnings.push(`${x.raceNo}.K Kazanan Yolu yalnız ${x.refCount} referans: banko kapalı.`);\n",
  '');
mustString('karar kaynak metadatası',
  "return{version:VERSION,date:state.date,city:cityName(),createdAt:new Date().toISOString(),budget,unitPrice:unit,requestedSingles:singles,plans:out,calibrationUsed:calibrationResult()?.title||null};",
  `return{version:VERSION,date:state.date,city:cityName(),createdAt:new Date().toISOString(),budget,unitPrice:unit,requestedSingles:singles,plans:out,sourceMode:'${SOURCE_MODE}'};`);

app=app.replace(',refCount:x.refCount,refQuality:x.refQuality','');
app=app.replace("t.modelLabel='Karar Motoru · Tüm Veriler';","t.modelLabel='Karar Motoru · Güncel + Kariyer 5 Model';");
app=app.replace('bütün veri kaynakları denetlendi.','Güncel Analiz + Kariyer Yol Haritası 5 Model kullanıldı.');
app=app.replace('Bir ayak ancak model fikir birliği, lider farkı, yarış zorluğu, Kazanan Yolu referansı ve kalibrasyon birlikte yeterliyse tek yapılır.','Bir ayak ancak Güncel Analiz ile Kariyer Yol Haritası 5 Model fikir birliği, lider farkı, yarış zorluğu ve kapsama birlikte yeterliyse tek yapılır.');
app=app.replace('Karar Motoru seçimleri 5 Model kupon altyapısına uygulanıyor…','Güncel Analiz + Kariyer Yol Haritası 5 Model seçimleri kupona uygulanıyor…');
app=app.replace('Tüm veri kaynakları kontrol edildi; ana kupon ve destek modelleri oluşturuldu.','Güncel Analiz + Kariyer Yol Haritası 5 Model ile kupon oluşturuldu.');

if(!app.includes('MENU-2-REMOVED-V16.8.9')) app+=`\n${menuPatch}\n`;
app+=`\n;window.__AT_COUPON_SOURCE_MODE_V1689__='COUPON-CURRENT-CAREER5-V16.8.9';\n`;
fs.writeFileSync(APP,app,'utf8');

let html=fs.readFileSync(INDEX,'utf8');
html=html.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=16890');
fs.writeFileSync(INDEX,html,'utf8');

const checks=[
  ['kupon kaynak modu','COUPON-CURRENT-CAREER5-V16.8.9'],
  ['menü 2 kaldırma','MENU-2-REMOVED-V16.8.9'],
  ['kaynak 1','Kaynak 1 · Güncel Analiz'],
  ['kaynak 2','Kaynak 2 · Kariyer Yolu 5 Model'],
  ['yeni kupon menüsü','5. Kupon Oluştur'],
  ['yeni dışa aktarım menüsü','6. Kariyer Excel Dışa Aktarım'],
  ['yeni arşiv menüsü','7. TJK Yıllık Yarış Arşivi']
];
for(const [label,token] of checks) if(!app.includes(token)) throw new Error(`[V16.8.9] Doğrulama başarısız: ${label}`);
if(app.includes("careerRoad:careerChannel(no),winner:winnerChannel(no)")) throw new Error('[V16.8.9] Kazanan Yolu kupon kanalından çıkarılamadı.');
if(!html.includes('/at-ai-app-v142.js?v=16890')) throw new Error('[V16.8.9] Cache-bust güncellenemedi.');

console.log('[AT AI] V16.8.9 build tamamlandı: Menü 2 kaldırıldı; kupon yalnız Güncel Analiz + Kariyer Yol Haritası 5 Model kullanıyor.');
