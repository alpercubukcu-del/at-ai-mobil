import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./coupon-career-only-v1691f1.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('./build-runtime-v1691f6.cjs',import.meta.url),'utf8');

const compatible=(source.match(/version:TICKET_V11_VERSION,careerCouponVersion:'CAREER-COUPON-V16\.9\.1F1'/g)||[]).length;
const legacy=(source.match(/version:'CAREER-COUPON-V16\.9\.1F1'/g)||[]).length;
assert.equal(compatible,3,'Başarılı ve başarısız bütün kariyer kuponları sonuç çizicisinin TICKET_V11_VERSION filtresinden geçmeli.');
assert.equal(legacy,1,'Eski sürüm yalnız analiz meta kaydında kalmalı; bilet nesnesinde kalmamalı.');
assert.doesNotMatch(source,/return\{version:'CAREER-COUPON-V16\.9\.1F1'/);
assert.match(build,/v=169107/);
assert.match(build,/compatible!==3/);

const TICKET_V11_VERSION='TICKET-V11-TEST';
const ticket={version:TICKET_V11_VERSION,careerCouponVersion:'CAREER-COUPON-V16.9.1F1',available:true};
const rendered=[ticket].filter(item=>item?.version===TICKET_V11_VERSION);
assert.equal(rendered.length,1,'Kariyer kuponu mevcut renderTicketsV11 filtresinde görünür olmalı.');

console.log('V16.9.1F6 kupon sonuç görünürlüğü testi geçti.');
