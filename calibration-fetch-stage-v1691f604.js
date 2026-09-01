/* AT AI Mobil — V16.9.1F60.4 KALIBRASYON FETCH ASAMA ETIKETI
   - Tarayicinin genel "Failed to fetch" hatasini PROGRAM / 5 MODEL / HISTORY asamasi ve endpoint ile etiketler.
   - Fetch davranisini, siralamayi, cache'i veya hesaplama formulunu degistirmez; yalniz reddedilen ag hatasinin mesajini zenginlestirir.
   - Yeni timeout/watchdog/retry yoktur. Gunluk/Yillik Arsiv ve kalibrasyon IndexedDB kayitlarini silmez veya degistirmez.
*/
(() => {
'use strict';
if (window.__AT_CALIBRATION_FETCH_STAGE_V1691F604__) return;
window.__AT_CALIBRATION_FETCH_STAGE_V1691F604__ = true;

const VERSION='CALIBRATION-FETCH-STAGE-V16.9.1F60.4';
const originalFetch=window.fetch;
if (typeof originalFetch!=='function') return;

function requestPath(input){
  try {
    const raw=typeof input==='string' ? input : (input?.url || String(input||''));
    return new URL(raw, location.href).pathname;
  } catch { return ''; }
}
function stageFor(path){
  if (path==='/api/tjk-program') return 'PROGRAM';
  if (path==='/api/tjk-history' || path==='/api/tjk-margin-enrich-v122') return 'HISTORY';
  if (
    path==='/api/tjk-model-roadmap-v11' ||
    path==='/api/tjk-adaptive-roadmap-v102' ||
    path==='/api/tjk-career-v10' ||
    path==='/api/tjk-career' ||
    path==='/api/tjk-career-fallback-v1113' ||
    path==='/api/tjk-career-foreign-v1' ||
    path==='/api/tjk-race-meta' ||
    path==='/api/tjk-bet-starts-v11'
  ) return '5 MODEL';
  return '';
}

window.fetch=async function atAiFetchStageF604(input, init){
  const path=requestPath(input);
  const stage=stageFor(path);
  try {
    return await originalFetch.call(this,input,init);
  } catch (err) {
    if (!stage) throw err;
    const raw=String(err?.message||err||'Ag istegi basarisiz').trim();
    const message=`${stage} · ${path} · ${raw}`;
    const tagged=new Error(message);
    tagged.name=err?.name||'Error';
    try { tagged.cause=err; } catch {}
    window.ATCalibrationFetchStageV1691F604.lastFailure={stage,path,message,at:Date.now()};
    throw tagged;
  }
};

window.ATCalibrationFetchStageV1691F604={
  version:VERSION,
  get lastFailure(){return window.ATCalibrationFetchStageV1691F604?._lastFailure||null},
  set lastFailure(v){window.ATCalibrationFetchStageV1691F604._lastFailure=v},
  stageFor
};
console.info('[AT AI]',VERSION,'aktif — reddedilen kalibrasyon ag cagrilari PROGRAM / 5 MODEL / HISTORY olarak etiketlenir; timeout/retry/arsiv temizleme yok.');
})();
