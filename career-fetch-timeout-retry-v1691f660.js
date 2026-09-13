;(() => {
'use strict';
if (window.__AT_CAREER_FETCH_TIMEOUT_RETRY_V1691F660__) return;
window.__AT_CAREER_FETCH_TIMEOUT_RETRY_V1691F660__ = true;

const VERSION = 'CAREER-FETCH-TIMEOUT-RETRY-V16.9.1F60.60';
const TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 2;
const RETRY_WAIT_MS = 250;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, horseId, attempt) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Kariyer istegi ${Math.round(ms / 1000)} saniyede tamamlanmadi.`);
      error.name = 'CareerFetchTimeoutError';
      error.horseId = horseId;
      error.attempt = attempt;
      reject(error);
    }, ms);
  });
  return Promise.race([Promise.resolve(promise), timeout])
    .finally(() => { if (timer) clearTimeout(timer); });
}

function retryableResult(result) {
  if (!result || result.ok !== false) return false;
  const text = String(result.error || '').toLocaleLowerCase('tr-TR');
  return /timeout|zaman|fetch|network|abort|503|502|504|429|tempor|erisim|erişim|baglan|bağlan/.test(text);
}

function emptyCareer(error, horseId, before) {
  return {
    ok:false,
    error:String(error?.message || error || 'Kariyer istegi tamamlanamadi.'),
    roadmap:[],
    top5:[],
    races:[],
    summary:{ totalTop5:0, first:0, second:0, third:0, fourth:0, fifth:0 },
    fetchGuardVersion:VERSION,
    fetchGuardTimedOut:true,
    horseId,
    before
  };
}

try {
  if (typeof fetchCareer !== 'function') {
    console.warn('[AT AI]', VERSION, 'fetchCareer bulunamadi; guard kurulamadı.');
    return;
  }

  const baseFetchCareerF660 = fetchCareer;
  fetchCareer = async function(horseId, before, ...rest) {
    let lastError = null;
    let lastResult = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await withTimeout(
          baseFetchCareerF660.call(this, horseId, before, ...rest),
          TIMEOUT_MS,
          horseId,
          attempt
        );
        lastResult = result;

        if (!retryableResult(result) || attempt >= MAX_ATTEMPTS) {
          if (result && typeof result === 'object') {
            result.fetchGuardVersion = VERSION;
            result.fetchGuardAttempt = attempt;
          }
          return result;
        }
      } catch (error) {
        lastError = error;
        if (attempt >= MAX_ATTEMPTS) {
          console.warn('[AT AI]', VERSION, 'kariyer istegi atlanarak analiz devam ediyor', {
            horseId,
            before,
            attempt,
            error:String(error?.message || error)
          });
          return emptyCareer(error, horseId, before);
        }
      }

      console.info('[AT AI]', VERSION, 'kariyer istegi yeniden deneniyor', { horseId, attempt:attempt + 1 });
      await wait(RETRY_WAIT_MS);
    }

    return lastResult || emptyCareer(lastError, horseId, before);
  };

  window.ATCareerFetchTimeoutRetryV1691F660 = {
    version:VERSION,
    timeoutMs:TIMEOUT_MS,
    maxAttempts:MAX_ATTEMPTS,
    concurrency:4
  };
  console.info('[AT AI]', VERSION, 'aktif — 4 paralel Kariyer istegi korunur; tek istek 15 sn sonra bir kez yeniden denenir ve sonsuz bekleme yapmaz.');
} catch (error) {
  console.warn('[AT AI]', VERSION, 'guard kurulamadı', error);
}
})();
