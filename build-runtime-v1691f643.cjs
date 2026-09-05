const fs=require('fs');
const path=require('path');
const ROOT=__dirname,EXTRA=path.join(ROOT,'daily-source-archive-v1691f642.js'),OUT=path.join(ROOT,'public'),APP=path.join(OUT,'at-ai-app-v142.js'),INDEX=path.join(OUT,'index.html');
const LIVE='https://at-ai-mobil.vercel.app';
async function source(pathname){const r=await fetch(`${LIVE}${pathname}?f643=${Date.now()}`);if(!r.ok)throw new Error(`[F60.43] Live base fetch failed: ${pathname} HTTP ${r.status}`);return r.text()}
(async()=>{
  if(!fs.existsSync(EXTRA))throw new Error('[F60.43] Missing daily source archive module.');
  const [liveApp,liveHtml]=await Promise.all([source('/at-ai-app-v142.js'),source('/')]);
  const marker='/* AT AI Mobil — V16.9.1F60.42 Daily Source Archive';
  const cut=liveApp.lastIndexOf(marker);
  if(cut<0||!liveApp.includes('TJK-ANNUAL-ARCHIVE-FIVE-MODEL-V14.1-F60.41-COOPERATIVE-SCORING'))throw new Error('[F60.43] Live F60.42 base verification failed.');
  const app=liveApp.slice(0,cut).trimEnd()+'\n\n'+fs.readFileSync(EXTRA,'utf8').trim()+'\n';
  for(const token of['ANNUAL-DB-COEXISTENCE-V16.9.1F60.43','closeAnnualReader','q.transaction.abort()'])if(!app.includes(token))throw new Error('[F60.43] Verification failed: '+token);
  new Function(app);
  const html=liveHtml.replace(/\/at-ai-app-v142\.js\?v=\d+/,'/at-ai-app-v142.js?v=169243');
  if(!html.includes('/at-ai-app-v142.js?v=169243'))throw new Error('[F60.43] Cache bust failed.');
  fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(APP,app,'utf8');fs.writeFileSync(INDEX,html,'utf8');
  console.log('[AT AI] V16.9.1F60.43 build complete: annual archive DB coexistence and lock recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});
