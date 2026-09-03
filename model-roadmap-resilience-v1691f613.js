/* AT AI Mobil — V16.9.1F60.13 Model Roadmap Resilience
   - Removes per-request timestamp cache busting from 5 Model roadmap calls.
   - Shares in-flight/ready roadmap responses by structural race key.
   - Retries a real transport failure once.
   - If the remote roadmap still fails for the currently selected race, uses the loaded Annual Archive engine as a local fallback.
   - Missing model data remains null/unavailable; it is never converted to 0.
*/
(() => {
'use strict';
if (window.__AT_MODEL_ROADMAP_RESILIENCE_V613__) return;
window.__AT_MODEL_ROADMAP_RESILIENCE_V613__ = true;
const VERSION='MODEL-ROADMAP-RESILIENCE-V16.9.1F60.13';
const inFlight=new Map(), ready=new Map();
const READY_MS=10*60*1000;
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const fold=v=>clean(v).toLocaleUpperCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,'');
const st=()=>{try{if(typeof state==='object'&&state)return state}catch{}return window.state||null};
function cityNameF613(){try{if(typeof getCityName==='function')return clean(getCityName())}catch{}const s=st(),id=clean(s?.city);return clean((Array.isArray(s?.cities)?s.cities:[]).find(c=>clean(c?.id)===id)?.name)||clean(document.getElementById('citySelect')?.selectedOptions?.[0]?.textContent)||id}
function metaF613(race){let m=null;try{if(typeof programRaceMeta==='function')m=programRaceMeta(race)}catch{}return m||{ok:true,class:race?.class||race?.yaradi1||'',ageGroup:race?.ageGroup||race?.yaradi2||'',track:race?.track||race?.pist||'',distance:race?.distance||race?.mesafe||''}}
function roadmapUrlF613(race){const s=st()||{},m=metaF613(race);if(!m?.ok)return{ok:false,error:m?.error||'Koşu şartları eksik.'};const url='/api/tjk-model-roadmap-v11'+`?date=${encodeURIComponent(s.date||'')}`+`&city=${encodeURIComponent(cityNameF613())}`+`&class=${encodeURIComponent(m.class||race?.class||'')}`+`&ageGroup=${encodeURIComponent(m.ageGroup||race?.ageGroup||'')}`+`&track=${encodeURIComponent(m.track||race?.track||'')}`+`&distance=${encodeURIComponent(m.distance||race?.distance||'')}`+'&minYear=2000';return{ok:true,url}}
async function remoteF613(race){const u=roadmapUrlF613(race);if(!u.ok)return{ok:false,error:u.error};const cached=ready.get(u.url);if(cached&&Date.now()-cached.at<READY_MS)return{...cached.data,roadmapTransport:'MEMORY_READY_F613'};if(inFlight.has(u.url))return inFlight.get(u.url);const p=(async()=>{let last='Failed to fetch';for(let attempt=1;attempt<=2;attempt++){try{const res=await fetch(u.url,{cache:'default'});let data=null;try{data=await res.json()}catch{data=null}if(res.ok&&data?.ok){const out={...data,roadmapTransport:attempt===1?'REMOTE_STABLE_F613':'REMOTE_RETRY_F613',roadmapStableUrl:true};ready.set(u.url,{at:Date.now(),data:out});return out}last=data?.error||`API ${res.status}`;if(res.status<500&&res.status!==408&&res.status!==429)break}catch(e){last=e?.message||'Failed to fetch'}if(attempt<2)await new Promise(r=>setTimeout(r,320))}return{ok:false,error:last,transportFailure:true,roadmapStableUrl:true}})();inFlight.set(u.url,p);try{return await p}finally{inFlight.delete(u.url)}}
try{fetchModelRoadmapV11=remoteF613}catch(e){console.warn('[AT AI]',VERSION,'fetch patch kurulamadı',e)}
const basePrepare=typeof prepareRaceModelsV11==='function'?prepareRaceModelsV11:null;
function currentTargetMatchesF613(race){const s=st();if(!s||!race)return false;const selected=clean(s.selectedRace||document.getElementById('analysisRace')?.value);if(selected&&selected!=='all'&&selected!==String(race.no??race.raceNo))return false;const target=clean(window.__AT_CAREER_MANUAL_REFERENCE_TARGET_V610__);if(!target)return true;const expected=`${clean(s.date)}|${fold(cityNameF613())}|${Number(race.no??race.raceNo)||0}`;return target===expected}
if(basePrepare){prepareRaceModelsV11=async function(race,progress){const remote=await basePrepare(race,progress);if(remote?.roadmapOk)return remote;if(!currentTargetMatchesF613(race))return{...remote,roadmapError:remote?.roadmapError||'5 Model verisi alınamadı; bu %0 değildir.'};const annual=window.ATAnnualCareerFiveModelV138;if(typeof annual?.run!=='function')return{...remote,roadmapError:remote?.roadmapError||'5 Model verisi alınamadı; bu %0 değildir.'};try{progress?.(`Koşu ${race?.no}: uzak 5 Model alınamadı; Yüklü Yıllık Arşiv yerel hesabı deneniyor…`);const local=await annual.run();if(local?.roadmapOk&&Array.isArray(local?.horses)&&local.horses.length){return{...local,remoteRoadmapError:remote?.roadmapError||'Failed to fetch',roadmapFallback:'ANNUAL_ARCHIVE_LOCAL_F613',roadmapError:null}}}catch(e){console.warn('[AT AI]',VERSION,'annual fallback',e?.message||e)}return{...remote,roadmapError:remote?.roadmapError||'5 Model verisi alınamadı; bu %0 değildir.',roadmapUnavailableNotZero:true}}}
window.ATModelRoadmapResilienceV613={version:VERSION,fetch:remoteF613,clear:()=>{inFlight.clear();ready.clear()}};
console.info('[AT AI]',VERSION,'aktif — sabit 5 Model URL + tek retry + Yıllık Arşiv yerel fallback; eksik veri %0 değildir.');
})();
