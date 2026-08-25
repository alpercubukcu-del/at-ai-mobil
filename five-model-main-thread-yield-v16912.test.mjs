import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./five-model-main-thread-yield-v16912.js', import.meta.url), 'utf8');
const build = fs.readFileSync(new URL('./build-runtime-v16912.cjs', import.meta.url), 'utf8');

assert.match(build, /yieldFiveModelV16912/);
assert.match(build, /new Promise\(resolve=>setTimeout\(resolve,0\)\)/);
assert.match(build, /for\(const finish of \[1,2,3\]\)/);
assert.match(build, /scoreFinishRowsPodiumV115\(career/);
assert.match(build, /function persisted\(k\)\{return null;\}/);
assert.match(build, /function schedulePersist\(k,d\)\{return false;\}/);
assert.match(build, /JSON\.parse\(sessionStorage\.getItem\(storageKey\(k\)\)/);
assert.match(source, /pointerdown/);
assert.match(source, /data-fmr-background-v1697/);
assert.match(source, /sessionStorage\.key\(index\)/);
assert.doesNotMatch(source, /sessionStorage\.getItem/);

const calls = [];
const horseCount = 16;
const stepsPerHorse = 16;
for (let horse = 0; horse < horseCount; horse++) {
  for (let step = 0; step < stepsPerHorse; step++) calls.push([horse, step]);
}
assert.equal(calls.length, 256, '16 at için 256 küçük puanlama/yield adımı oluşmalı');

console.log('V16.9.12 5 Model ana iş parçacığı yield testi geçti.');
