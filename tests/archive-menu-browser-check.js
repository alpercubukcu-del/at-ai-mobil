/* Run via agent-browser eval on archive-menu-preview-server.mjs only. */
(async()=>{
 const checks=[],by=id=>document.getElementById(id),t=window.__archiveTest;
 if(!t||location.hostname!=='127.0.0.1')throw Error('Requires isolated local fixtures');
 const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label)};
 async function until(fn,label){const end=Date.now()+12000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,25))}throw Error('Timeout: '+label)}
 const folder=await t.folderReady;
 for(const name of ['Gerçek Yarış Arşivi','Orijin Arşivi','Galop Arşivi'])try{await folder.removeEntry(name,{recursive:true})}catch(e){if(e.name!=='NotFoundError')throw e}
 // Recreate the menu with automatic program discovery still pending.
 let releaseGreeting;t.programGate=new Promise(resolve=>{releaseGreeting=resolve});
 by('m8dlg').close();by('m8dlg').remove();window.ATM8F48.open();
 let releasePicker;t.pickerGate=new Promise(resolve=>{releasePicker=resolve});
 by('m8HorseFolder').click();by('m8HorseFolder').click();
 assert(t.pickerCalls===1,'two folder taps open one picker');
 assert(by('m8HorseFolder').disabled&&by('m8tabTrack').disabled,'folder choice locks all tabs and actions');
 const sameSelection=window.ATArchiveDirectoryV1741.select();assert(t.pickerCalls===1,'shared API also reuses the pending picker');
 releaseGreeting();t.programGate=null;await new Promise(r=>setTimeout(r,50));
 assert(by('m8HorseSummary').textContent==='Klasör seçimi başlatılıyor…','late automatic greeting cannot overwrite a user operation');
 releasePicker(folder);await sameSelection;t.pickerGate=null;
 await until(()=>!by('m8HorseFolder').disabled,'folder settled');
 assert(window.ATTrackLongterm48.ready()&&window.AT_AI_LOCAL_ARCHIVE.ready(),'horse and track archives share the selected folder');
 by('m8HorseLoadCities').click();await until(()=>!window.ATM8F48.isBusy(),'load program cities');by('m8HorseCity').value='3';by('m8HorseCity').dispatchEvent(new Event('change'));
 const previous=t.requests.filter(x=>x.startsWith('/api/tjk-program')).length;let releaseProgram;
 t.programGate=new Promise(resolve=>{releaseProgram=resolve});by('m8UpdateHorses').click();by('m8UpdateHorses').click();
 assert(by('m8UpdateHorses').disabled,'repeated update is blocked');
 await until(()=>t.requests.filter(x=>x.startsWith('/api/tjk-program')).length>previous,'update request');
 assert(by('m8HorseSummary').textContent.includes('güncellemesi başlıyor'),'start is visible while program request is pending');
 assert(t.requests.filter(x=>x.startsWith('/api/tjk-program')).length===previous+1,'one program request per update');
 releaseProgram();t.programGate=null;
 await until(()=>!window.ATM8F48.isBusy(),'horse update');
 assert(by('m8StatNew').textContent==='2'&&by('m8StatError').textContent==='0','two horse histories finish without errors');
 const raceDir=await folder.getDirectoryHandle('Gerçek Yarış Arşivi'),horseDir=await raceDir.getDirectoryHandle('Atlar');
 const record=JSON.parse(await(await(await horseDir.getFileHandle('900101.json')).getFile()).text());
 assert(record.horseId==='900101'&&record.races.length===1,'horse JSON is actually written with its ID and history');
 const requestCount=t.requests.length,local=await window.AT_AI_LOCAL_ARCHIVE.horseHistory('900101');
 assert(local.source==='phone'&&t.requests.length===requestCount,'saved Menu 8 horse history is reused without a network request');
 by('m8tabTrack').click();assert(by('m8FolderStatus').textContent.includes(folder.name),'track tab shows the same folder');
 by('m8TrackToday').click();await until(()=>!window.ATM8F48.isBusy(),'track update');
 assert(by('m8TrackStatus').textContent.includes('✓ Güncel'),'track tab reports completion');
 const trackDir=await(await raceDir.getDirectoryHandle('Pist-Bakım-Hava')).getDirectoryHandle('2026');
 const track=JSON.parse(await(await(await trackDir.getFileHandle('2026-09-30_İstanbul.json')).getFile()).text());
 assert(track.temperature===20&&track.humidity===40,'track weather JSON is actually written');
 // A failed history must be visible and its retry must remain usable.
 by('m8tabArchive').click();await horseDir.removeEntry('900102.json');t.failHistory=true;
 by('m8UpdateHorses').click();await until(()=>!window.ATM8F48.isBusy(),'failed history');
 assert(by('m8StatError').textContent==='1'&&!!by('m8RetryErrors48'),'one failed history exposes retry');
 t.failHistory=false;by('m8RetryErrors48').click();await until(()=>!window.ATM8F48.isBusy(),'retry');
 assert(by('m8StatError').textContent==='0','retry clears the history error');
 by('m8tabOrigin').click();await until(()=>by('m8FogCity').value==='3','origin city');
 for(const [button,counter] of [['m8FogSire','m8SireStat'],['m8FogDam','m8DamStat'],['m8FogDS','m8DSStat']]){
  by(button).click();await until(()=>!window.ATM8F48.isBusy(),button);assert(by(counter).textContent==='2 / 0 / 0',button+' writes both lineage files');
 }
 const origin=await(await folder.getDirectoryHandle('Orijin Arşivi')).getDirectoryHandle('Soy Hatları');
 const index=JSON.parse(await(await(await origin.getFileHandle('_origin-index-v1.json')).getFile()).text());
 assert(Object.keys(index.entries).length===12,'parallel lineage writes preserve all six IDs and six name aliases');
 by('m8tabGallop').click();await until(()=>by('m8FogCity').value==='3','gallop city');
 by('m8FogRun').click();await until(()=>!window.ATM8F48.isBusy(),'gallop update');
 assert(by('m8GStat').textContent==='2 / 0 / 0','gallop tab finishes both downloads');
 const gallops=await(await folder.getDirectoryHandle('Galop Arşivi')).getDirectoryHandle('2026');
 const gallop=JSON.parse(await(await(await gallops.getFileHandle('900101.json')).getFile()).text());
 assert(gallop.year==='2026'&&!!gallop.data.workout,'gallop JSON uses the program year');
 assert(t.pickerCalls===1,'all four tabs run after one folder selection');
 assert(document.documentElement.scrollWidth===390,'mobile page stays within the viewport');
 assert(window.ATFogdNineCouponCoreV1.MODELS.length===9&&!!window.ATFogdConditionCouponV174,'nine coupon methods and the tenth method remain present');
 by('m8tabArchive').click();
 window.__menu8BrowserResult={passed:checks.length,checks,pickerCalls:t.pickerCalls,requests:t.requests.length};
 return window.__menu8BrowserResult
})()
