/* Klasik V3.2 route eklentisi — mevcut legacy derlemeyi ve menüleri korur. */
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const root=__dirname;
const source=path.join(root,"klasik-v32"),target=path.join(root,"public","klasik-v32");
for(const file of ["index.html","styles.css","app.mjs","core.mjs"]){
  if(!fs.existsSync(path.join(source,file)))throw new Error("[KLASIK V3.2] Eksik kaynak: "+file);
}
execFileSync(process.execPath,["--test","tests/klasik-v32-core.test.mjs"],{cwd:root,stdio:"inherit"});
execFileSync(process.execPath,["build-runtime-v17-clean.cjs"],{cwd:root,stdio:"inherit"});
fs.mkdirSync(target,{recursive:true});
for(const file of ["index.html","styles.css","app.mjs","core.mjs"]){
  fs.copyFileSync(path.join(source,file),path.join(target,file));
}
const html=fs.readFileSync(path.join(target,"index.html"),"utf8");
if(!html.includes("Klasik Analiz V3.2")||!html.includes("./app.mjs")){
  throw new Error("[KLASIK V3.2] Yeni sayfa kurulum denetimi başarısız");
}
console.log("[KLASIK V3.2] /klasik-v32/ rotası yayına hazır kaynak klasörüne kopyalandı; mevcut / menüsü değişmedi.");
