/**
 * Klasik V3.2'nin bağımsız yerel web paketini oluşturur.
 * Vercel derlemesi, eski FOGD motorları veya uzak yayın gerektirmez.
 * Çalıştır: node build-klasik-v32.cjs
 * Sunucu: node klasik-v32/server.mjs
 */
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const ROOT=__dirname,SOURCE=path.join(ROOT,"klasik-v32"),TARGET=path.join(ROOT,"dist","klasik-v32");
const FILES=["index.html","styles.css","app.mjs","core.mjs","bulk.mjs"];
for(const file of FILES)if(!fs.existsSync(path.join(SOURCE,file)))throw Error("Klasik dosyası eksik: "+file);
execFileSync(process.execPath,["--test","tests/klasik-v32-core.test.mjs","tests/klasik-v32-bulk.test.mjs"],{cwd:ROOT,stdio:"inherit"});
fs.mkdirSync(TARGET,{recursive:true});
for(const file of FILES)fs.copyFileSync(path.join(SOURCE,file),path.join(TARGET,file));
console.log("Klasik V3.2 bağımsız web dosyaları: "+TARGET);
console.log("TJK veri uçları için proje kökünden 'node klasik-v32/server.mjs' çalıştır.");
console.log("Vercel/IndexedDB kullanılmıyor.");
