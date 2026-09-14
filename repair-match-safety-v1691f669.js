/* AT AI Mobil — F60.69/F60.72 Eksik Koşu Onarım eşleşme güvenlik katmanı */
(() => {
'use strict';
if(window.__AT_F6069_REPAIR_MATCH_SAFETY__) return;
window.__AT_F6069_REPAIR_MATCH_SAFETY__=true;
const VERSION='REPAIR-MATCH-SAFETY-V16.9.1F60.69';
const PERF='NO_GLOBAL_MUTATION_OBSERVER_F6072';
const MIN_SAFE_SCORE=90;
const DB='at_ai_race_repair_v1',STORE='repairs';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
let timer=0;
function openDb(){return new Promise(resolve=>{let q;try{q=indexedDB.open(DB,1)}catch{return resolve(null)}q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>resolve(null);});}
async function rejectWeakCandidate(key){const db=await openDb();if(!db||!key)return false;return new Promise(resolve=>{try{const tx=db.transaction(STORE,'readwrite'),os=tx.objectStore(STORE),g=os.get(key);g.onsuccess=()=>{const rec=g.result;if(!rec)return;const score=Number(rec?.candidate?.score||0);if(score&&score<MIN_SAFE_SCORE)os.put({...rec,repairStatus:rec.repairStatus==='MANUAL_MATCH'?'MANUAL_MATCH':'MISSING',candidate:null,matchGuard:'HORSE_ROSTER_REQUIRED',matchGuardAt:new Date().toISOString()});};tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
function cardScore(card){const m=clean(card?.textContent).match(/uyum\s*(\d+)\s*\/\s*100/i);return m?Number(m[1]):0}
function statusNode(card){return [...(card?.querySelectorAll?.('.f62-status')||[])].at(-1)||null}
function markWeak(card,score){const btn=card.querySelector('[data-repair-action="candidate"]');if(btn)btn.style.display='none';const note=card.querySelector('.f6069-guard-note')||document.createElement('div');note.className='f62-status f6069-guard-note';note.textContent=`Koşul benzerliği ${score||80}/100. At kadrosu doğrulanmadan aynı yarış kabul edilmez.`;if(!note.isConnected)card.appendChild(note)}
function markManual(card){card.querySelectorAll('[data-repair-action="auto"],[data-repair-action="candidate"]').forEach(b=>b.style.display='none');const note=card.querySelector('.f6069-manual-note')||document.createElement('div');note.className='f62-status f6069-manual-note';note.textContent='Manuel eşleşme kayıtlı. Otomatik aday bu kaydın üzerine yazamaz.';if(!note.isConnected)card.appendChild(note)}
async function sanitize(root=document){const list=root?.id==='f62RepairList'?root:root?.querySelector?.('#f62RepairList');if(!list)return;for(const card of list.querySelectorAll('.f62-repair')){const text=clean(card.textContent),key=card.querySelector('[data-key]')?.dataset?.key||'',manual=/MANUAL_MATCH/i.test(text),score=cardScore(card),sig=`${key}|${manual?1:0}|${score}`;if(card.dataset.f6069Sig===sig)continue;card.dataset.f6069Sig=sig;if(manual){markManual(card);continue}if(score>0&&score<MIN_SAFE_SCORE){markWeak(card,score);if(key)void rejectWeakCandidate(key)}}}
function schedule(delay=120){clearTimeout(timer);timer=setTimeout(()=>{const list=document.getElementById('f62RepairList');if(list)void sanitize(list)},delay)}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-repair-action="candidate"]');if(b){const card=b.closest('.f62-repair'),score=cardScore(card);if(score>0&&score<MIN_SAFE_SCORE){e.preventDefault();e.stopImmediatePropagation();markWeak(card,score);const s=statusNode(card);if(s)s.textContent=`Eşleştirme engellendi: ${score}/100 yalnız koşul benzerliği. At kadrosu doğrulaması gerekli.`;void rejectWeakCandidate(b.dataset.key);return}}if(e.target.closest?.('#f62rRepair,#f62RepairRefresh')){schedule(120);setTimeout(()=>schedule(0),450)}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(250),{once:true});else schedule(250);
window.ATF6069RepairMatchSafety={version:VERSION,perf:PERF,minSafeScore:MIN_SAFE_SCORE,sanitize,rejectWeakCandidate};
console.info('[AT AI]',VERSION,PERF,'aktif');
})();
