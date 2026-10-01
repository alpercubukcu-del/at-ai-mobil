/* Execute with agent-browser eval on dna-preview-server.mjs only. */
(async () => {
 const t = window.__dnaTest, checks = [], by = id => document.getElementById(id);
 if (!t || location.hostname !== '127.0.0.1') throw Error('Requires isolated local fixtures');
 const assert = (condition, label) => {if (!condition) throw Error(label); checks.push(label);};
 const until = async (fn, label) => {const end = Date.now() + 12000; while (Date.now() < end) {if (fn()) return; await new Promise(resolve => setTimeout(resolve, 25));} throw Error('Timeout: ' + label);};
 const api = window.ATFogdScoreCenterF609431;
 assert(api.calculationVersion === 'FOGD-STABLE-INPUTS-V17.4.4', 'production bundle exposes V17.4.4 calculation');
 assert(window.ATDegreeSpeedF6090.calculationVersion === 'DEGREE-STABLE-INPUTS-V17.4.4', 'production degree engine is current');
 window.AT_AI_LOCAL_ARCHIVE.saveFogdAnalysis = async snapshot => {t.saved.push(structuredClone(snapshot)); return true;};
 let releaseTrack, trackCalls = 0;
 const gate = new Promise(resolve => {releaseTrack = resolve;});
 window.ATTrackMaintenanceV1.infer = async () => {trackCalls++; await gate; return {source: 'EXACT_TJK', confidence: 1, weather: {temperatureAnomaly: 0}, maintenance: {signalCount: 5}};};
 by('fogdMenuBtnF609431').click(); by('fogdRaceF609431').value = '1';
 by('fogdRunF609431').click(); by('fogdRunF609431').click();
 await until(() => trackCalls > 0, 'delayed degree started');
 await new Promise(resolve => setTimeout(resolve, 250));
 assert(t.saved.length === 0, 'unfinished degree is never saved as a final prediction');
 assert(by('fogdRunF609431').disabled, 'repeat taps are blocked while inputs are preparing');
 assert(/Derece-Hız/.test(by('fogdStatusF609431').textContent), 'waiting for the degree is visible');
 releaseTrack(); await until(() => t.saved.length === 1 && !by('fogdRunF609431').disabled, 'first completed prediction');
 const extract = snapshot => snapshot.rows.map(h => [h.no, h.F, h.O, h.G, h.D, h.J, h.S, h.A, h.E, h.T, h.predictedSec, h.degreeRank, h.totalRank]);
 const expected = JSON.stringify(extract(t.saved[0]));
 assert(t.saved[0].rows.map(h => h.no).join(',') === '3,2,1', 'completed history replaces provisional degree order');
 for (let i = 0; i < 5; i++) await api.compute(1);
 assert(t.saved.length === 6, 'all six consecutive analyses finished');
 assert(t.saved.every(snapshot => JSON.stringify(extract(snapshot)) === expected), 'all nine scores and prediction ranks are identical in six cold/warm runs');
 assert(window.state.analyses.current.degreeSpeed.surfaceAware === true, 'surface-specific degree completed before DNA');
 const displayed = [...by('fogdResultsF609431').querySelectorAll('tbody tr')].map(tr => tr.querySelector('.fogd-horse b').textContent);
 assert(displayed.join('|') === '3. DENEME AT 3|2. DENEME AT 2|1. DENEME AT 1', 'visible final table uses the completed ranking');
 by('fogdArchiveF609431').click(); await until(() => /Kayıtlı analiz açıldı/.test(by('fogdStatusF609431').textContent), 'saved analysis reopened');
 assert([...by('fogdResultsF609431').querySelectorAll('tbody tr')].map(tr => tr.querySelector('.fogd-horse b').textContent).join('|') === displayed.join('|'), 'reopened saved analysis preserves ranking');
 assert(window.ATFogdNineCouponCoreV1.MODELS.length === 9 && !!window.ATFogdConditionCouponV174, 'nine column methods and the tenth method remain available');
 assert(t.errors.length === 0, 'no browser errors or unhandled rejections');
 window.__dnaBrowserResult = {passed: checks.length, checks, repeatCount: t.saved.length, trackCalls, errors: t.errors};
 return window.__dnaBrowserResult;
})()
