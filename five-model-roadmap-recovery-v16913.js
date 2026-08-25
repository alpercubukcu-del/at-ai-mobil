/* AT AI Mobil — V16.9.13 5 Model Tarihsel Veri Kurtarma
   - Yamaklı Y0/Y1/Y2/Y3 sınıflarında TJK'nin 26 yıllık ağır taraması yerine
     son 10 tamamlanmış yıl kullanılır.
   - Ana pencere hata verirse son 5 tamamlanmış yıl ile bir kez güvenli geri dönüş yapılır.
   - Başarısız roadmap sonuçları cache katmanlarınca geçerli sayılmaz.
   - Puanlama ve sıralama formüllerine dokunmaz.
*/
(() => {
'use strict';
if (window.__AT_FIVE_MODEL_ROADMAP_RECOVERY_V16913__) return;
window.__AT_FIVE_MODEL_ROADMAP_RECOVERY_V16913__ = true;

const VERSION = 'FIVE-MODEL-ROADMAP-RECOVERY-V16.9.13';
const PRIMARY_TIMEOUT_MS = 170000;
const FALLBACK_TIMEOUT_MS = 170000;

const clean = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
function isYamakClass(value) {
  return /(?:^|\/)\s*Y-?[0-3](?:\s*\/|$)/i.test(clean(value));
}
function targetYear() {
  const year = Number(clean(window.state?.date).slice(0, 4));
  return Number.isFinite(year) && year >= 2001 ? year : new Date().getFullYear();
}
function primaryMinYear(raceClass) {
  return isYamakClass(raceClass) ? Math.max(2000, targetYear() - 10) : 2000;
}
function fallbackMinYear() {
  return Math.max(2000, targetYear() - 5);
}
function requestUrl(race, meta, minYear) {
  const raceClass = clean(meta?.class || race?.class || race?.yaradi1);
  return '/api/tjk-model-roadmap-v11'+
    '?date='+encodeURIComponent(window.state?.date || '')+
    '&city='+encodeURIComponent(typeof getCityName === 'function' ? getCityName() : '')+
    '&class='+encodeURIComponent(raceClass)+
    '&ageGroup='+encodeURIComponent(meta?.ageGroup || race?.ageGroup || race?.yaradi2 || '')+
    '&track='+encodeURIComponent(meta?.track || race?.track || race?.pist || '')+
    '&distance='+encodeURIComponent(meta?.distance || race?.distance || race?.mesafe || '')+
    '&minYear='+encodeURIComponent(minYear);
}
async function fetchRoadmap(url, timeoutMs, label) {
  if (typeof atAiFetchJsonV1111 === 'function') {
    return atAiFetchJsonV1111(url, timeoutMs, label);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache:'default',
      headers:{accept:'application/json'},
      signal:controller.signal
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw new Error(label+': JSON olmayan cevap (API '+response.status+').'); }
    if (!response.ok || data?.ok === false) throw new Error(data?.error || label+': API '+response.status);
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(label+': istek zaman aşımına uğradı.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

fetchModelRoadmapV11 = async function(race) {
  const meta = typeof programRaceMeta === 'function'
    ? programRaceMeta(race)
    : {ok:true,class:race?.class,ageGroup:race?.ageGroup,track:race?.track,distance:race?.distance};
  if (!meta?.ok) return {ok:false,error:meta?.error || 'Koşu şartları eksik.'};

  const raceClass = clean(meta.class || race?.class || race?.yaradi1);
  const primary = primaryMinYear(raceClass);
  const fast = fallbackMinYear();
  try {
    const data = await fetchRoadmap(
      requestUrl(race, meta, primary),
      PRIMARY_TIMEOUT_MS,
      'Koşu '+race?.no+' tarihsel model ('+primary+'-'+(targetYear()-1)+')'
    );
    data.requestWindowV16913 = {
      minYear:primary,
      maxYear:targetYear()-1,
      yamak:isYamakClass(raceClass),
      fallback:false
    };
    return data;
  } catch (primaryError) {
    if (fast <= primary) {
      return {ok:false,error:primaryError?.message || '5 Model tarihsel veri alınamadı.'};
    }
    try {
      const data = await fetchRoadmap(
        requestUrl(race, meta, fast),
        FALLBACK_TIMEOUT_MS,
        'Koşu '+race?.no+' hızlı tarihsel model ('+fast+'-'+(targetYear()-1)+')'
      );
      data.requestWindowV16913 = {
        minYear:fast,
        maxYear:targetYear()-1,
        yamak:isYamakClass(raceClass),
        fallback:true,
        primaryError:clean(primaryError?.message)
      };
      return data;
    } catch (fallbackError) {
      return {
        ok:false,
        error:clean(primaryError?.message || 'Tarihsel tarama başarısız.')+
          ' Hızlı geri dönüş: '+clean(fallbackError?.message || 'başarısız.')
      };
    }
  }
};

window.ATFiveModelRoadmapRecoveryV16913 = {
  VERSION,
  isYamakClass,
  primaryMinYear,
  fallbackMinYear,
  timeoutMs:PRIMARY_TIMEOUT_MS
};
console.info('[AT AI]', VERSION, 'aktif — yamaklı sınıf 10 yıl; hata halinde 5 yıllık güvenli geri dönüş; başarısız sonuç cache dışı.');
})();
