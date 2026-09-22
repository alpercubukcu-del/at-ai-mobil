(()=>{'use strict';
const V='PIST-ANA-REFERANSI-V1';
const H={
 ADANA:{ad:'Adana Yeşiloba',yaris:{CIM:'Çim',KUM:'Yarı Sentetik'},idman:['Doğal Dere Kumu']},
 ANKARA:{ad:'Ankara 75. Yıl',yaris:{CIM:'Çim',KUM:'Yarı Sentetik'},idman:['Doğal Dere Kumu']},
 BURSA:{ad:'Bursa Osmangazi',yaris:{CIM:'Çim',KUM:'Yarı Sentetik'},idman:['Doğal Dere Kumu']},
 DIYARBAKIR:{ad:'Diyarbakır',yaris:{KUM:'Doğal Dere Kumu'},idman:[]},
 ELAZIG:{ad:'Elazığ',yaris:{KUM:'Doğal Dere Kumu'},idman:[]},
 ISTANBUL:{ad:'İstanbul Veliefendi',yaris:{CIM:'Çim',KUM:'Sentetik',SENTETIK:'Sentetik'},idman:['Yarı Sentetik']},
 IZMIR:{ad:'İzmir Şirinyer',yaris:{CIM:'Çim',KUM:'Yarı Sentetik'},idman:['Sentetik']},
 SANLIURFA:{ad:'Şanlıurfa',yaris:{KUM:'Doğal Dere Kumu'},idman:['Doğal Dere Kumu']},
 KOCAELI:{ad:'Kocaeli',yaris:{KUM:'Yarı Sentetik'},idman:[]}
};
const R={
 'Çim':{yapi:'30-40 cm drenaj; 20-30 cm vejetasyon; pH 6.5-7.5',bakim:['gübre','ilaçlama','havalandırma','sulama','iz doldurma','biçim','ara ekim','bariyer değişimi','silindir','günlük ölçüm'],penetrometre:[[2.5,2.9,'Sert'],[3,3.3,'Normal'],[3.4,3.4,'Biraz Yumuşak'],[3.5,3.7,'Yumuşak'],[3.8,4.3,'Çok Yumuşak'],[4.4,4.4,'Biraz Ağır'],[4.5,4.9,'Ağır'],[5,99,'Çok Ağır']]},
 'Sentetik':{yapi:'15 cm ortalama; 6 cm asfalt; 10 cm alt drenaj',bakim:['Gallop Master','Power Harrow','Stone Burier','kum derinliği','reglaj','Clegg Hammer']},
 'Yarı Sentetik':{yapi:'30-40 cm drenaj; 20 cm kum; 8 cm sert + 12 cm yumuşak tabaka',bakim:['Synchrogerm','Mini Synchrogerm','Rotavatör','silindir','sulama','kum derinliği','reglaj','Clegg Hammer']},
 'Doğal Dere Kumu':{yapi:'30-40 cm drenaj; 12 cm doğal dere kumu',bakim:['normal tırmık','Rotavatör','silindir','sulama','kum derinliği','reglaj','Clegg Hammer'],durum:['Normal','Nemli','Islak','Sulu']}
};
function n(s){return String(s||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'')}
function key(city){const x=n(city);for(const k in H)if(x===k||x.indexOf(k)>=0||k.indexOf(x)>=0)return k;return null}
function surface(city,track){const k=key(city),t=n(track);if(!k)return null;if(t.indexOf('CIM')>=0)return H[k].yaris.CIM||null;if(t.indexOf('SENTETIK')>=0)return H[k].yaris.SENTETIK||H[k].yaris.KUM||null;if(t.indexOf('KUM')>=0)return H[k].yaris.KUM||null;return null}
function context(city,track){const k=key(city),s=surface(city,track);return k?{hipodrom:H[k].ad,sehir:k,pist:s,kurallar:R[s]||null,kaynak:'AT_AI_PIST_ANA_REFERANSI',not:'Bakım periyotları belirli tarihte bakım yapıldığının kanıtı değildir; tarihli TJK raporu önceliklidir.'}:null}
window.ATPistAnaReferansi={version:V,hipodromlar:H,kurallar:R,key:key,surface:surface,context:context};
})();