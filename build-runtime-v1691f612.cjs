const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f611.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[V16.9.1F60.12] Missing F60.11 base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });

let app = fs.readFileSync(APP, 'utf8');

function replaceOnce(oldText, newText, label) {
  const count = app.split(oldText).length - 1;
  if (count !== 1) throw new Error(`[V16.9.1F60.12] ${label} target count=${count}`);
  app = app.replace(oldText, newText);
}

replaceOnce(
  "${[['ALL','Tümü'],['EXACT','Tam'],['CONDITION_TWIN','İkiz'],['RACE_FAMILY','Aile'],['SELECTED','Seçililer']].map(([v,t],i)=>`<button class=\"${i?'':'active'}\" data-filter=\"${v}\">${t}</button>`).join('')}",
  "${[['ALL','Tümü'],['EXACT','Tam'],['CONDITION_TWIN','İkiz'],['RACE_FAMILY','Aile']].map(([v,t])=>`<button data-filter=\"${v}\">${t}</button>`).join('')}",
  'top bulk buttons'
);

replaceOnce(
  "<div class=\"actions\"><button id=\"cmsClear\">Seçimi Temizle</button><button id=\"cmsExact\">Tamları İşaretle</button><button id=\"cmsApply\" class=\"apply\">Seçimi Uygula ve Hesapla</button></div>",
  "<div class=\"actions\"><button id=\"cmsClear\">Seçimi Temizle</button><button id=\"cmsApply\" class=\"apply\">Seçimi Uygula ve Hesapla</button></div>",
  'footer actions'
);

replaceOnce(
  "d.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;shown=PAGE;d.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render()})",
  "d.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;draft=new Set(items.filter(x=>filter==='ALL'||x.type===filter).map(x=>x.row.id));shown=PAGE;d.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render();const s=$('cmsStatus');if(s)s.textContent=`${b.textContent} seçildi · ${draft.size} yarış işaretlendi.`})",
  'bulk selection handler'
);

replaceOnce(
  "$('cmsExact').onclick=()=>{items.filter(x=>x.type==='EXACT').forEach(x=>draft.add(x.row.id));render()};",
  "",
  'remove exact footer handler'
);

replaceOnce(
  "function visible(){return items.filter(x=>filter==='ALL'||(filter==='SELECTED'?draft.has(x.row.id):x.type===filter))}",
  "function visible(){return items}",
  'keep all matches visible'
);

replaceOnce(
  "filter='ALL';shown=PAGE;d.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter==='ALL'));",
  "filter='ALL';shown=PAGE;d.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));",
  'open selection state'
);

replaceOnce(
  "#${DIALOG} .tabs,#${DIALOG} .actions{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}",
  "#${DIALOG} .tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}#${DIALOG} .actions{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}",
  'desktop button grids'
);

app = app.split('İstediğin yarışları işaretle; yalnız uyguladığın seçim kullanılacak.').join('Üstten Tümü / Tam / İkiz / Aile seçebilir veya yarışları tek tek işaretleyebilirsin.');
app = app.split("window.ATCareerMatchSelectorV610={version:'CAREER-MATCH-SELECTOR-V16.9.1F60.11-LAZY',open,ensure,refresh:meta}").join("window.ATCareerMatchSelectorV610={version:'CAREER-MATCH-SELECTOR-V16.9.1F60.12-BULK',open,ensure,refresh:meta}");

for (const token of [
  'CAREER-MATCH-SELECTOR-V16.9.1F60.12-BULK',
  "['ALL','Tümü'],['EXACT','Tam'],['CONDITION_TWIN','İkiz'],['RACE_FAMILY','Aile']",
  "draft=new Set(items.filter(x=>filter==='ALL'||x.type===filter).map(x=>x.row.id))",
  'Seçimi Temizle',
  'Seçimi Uygula ve Hesapla',
  'Üstten Tümü / Tam / İkiz / Aile seçebilir'
]) {
  if (!app.includes(token)) throw new Error('[V16.9.1F60.12] Verification failed: ' + token);
}
if (app.includes("['SELECTED','Seçililer']")) throw new Error('[V16.9.1F60.12] Seçililer tab still present.');
if (app.includes('id="cmsExact"')) throw new Error('[V16.9.1F60.12] Tamları İşaretle footer button still present.');
new Function(app);
fs.writeFileSync(APP, app, 'utf8');

let html = fs.readFileSync(INDEX, 'utf8');
html = html.replace(/\/at-ai-app-v142\.js\?v=\d+/, '/at-ai-app-v142.js?v=169212');
fs.writeFileSync(INDEX, html, 'utf8');

console.log('[AT AI] V16.9.1F60.12 build complete: top Tümü/Tam/İkiz/Aile buttons bulk-select matches; footer reduced to Clear + Apply; all rows remain visible.');
