// Node Mobile starts a CommonJS entry point; load the ESM service explicitly.
const fs=require('fs'),path=require('path');
const root=__dirname,errorFile=path.join(root,'startup-error.txt');
process.chdir(root);
try{fs.unlinkSync(errorFile)}catch{}
const report=error=>{const message=String(error&&error.stack||error).split(process.argv[3]||'__no_token__').join('[oturum]');fs.writeFileSync(errorFile,message.slice(0,6000));console.error(message)};
process.on('uncaughtException',report);
process.on('unhandledRejection',report);
import(require('url').pathToFileURL(path.join(root,'server.mjs')).href)
 .then(({startLocalServer})=>startLocalServer(Number(process.argv[2]),process.argv[3]))
 .catch(report);
