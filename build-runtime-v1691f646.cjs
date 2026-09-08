const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BASE = path.join(ROOT, 'build-runtime-v1691f644.cjs');
const APP = path.join(ROOT, 'public', 'at-ai-app-v142.js');
const INDEX = path.join(ROOT, 'public', 'index.html');

if (!fs.existsSync(BASE)) throw new Error('[F60.47] Missing F60.46 base build.');
execFileSync(process.execPath, [BASE], { cwd: ROOT, stdio: 'inherit' });
if (!fs.existsSync(APP) || !fs.existsSync(INDEX)) throw new Error('[F60.47] Base build output missing.');

let html = fs.readFileSync(INDEX, 'utf8');
const runtimeScript = /<script src="\/at-ai-app-v142\.js\?v=\d+"><\/script>/;
const deferredLoader = `<script>
  (() => {
    const loadRuntime = () => {
      const script = document.createElement('script');
      script.src = '/at-ai-app-v142.js?v=169247';
      script.async = true;
      document.body.appendChild(script);
    };
    requestAnimationFrame(() => requestAnimationFrame(loadRuntime));
  })();
</script>`;

if (!runtimeScript.test(html)) throw new Error('[F60.47] Application runtime tag missing.');
html = html.replace(runtimeScript, deferredLoader);
if (!html.includes("requestAnimationFrame(() => requestAnimationFrame(loadRuntime))")) {
  throw new Error('[F60.47] Deferred runtime loader verification failed.');
}
fs.writeFileSync(INDEX, html, 'utf8');

new Function(fs.readFileSync(APP, 'utf8'));
console.log('[AT AI] F60.47 build complete: home shell paints before the heavyweight runtime is loaded.');
