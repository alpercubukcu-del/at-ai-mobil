/* Local browser fixtures only; fictional horse IDs are never forwarded. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const horses = [1, 2, 3].map(no => ({id: String(900200 + no), no, name: `DENEME AT ${no}`, last6: '333333', origin: ''}));
const race = {no: 1, distance: 1400, track: 'Sentetik', class: 'ŞARTLI 4', name: 'ŞARTLI 4', horses};
const current = {date: '2026-09-30', city: '3', cityName: 'İstanbul', races: [{no: 1, horses: horses.map((h, i) => ({...h, history: {degreeSamples: [{sec: 93 - i, distance: 1400}]}, degreeModel: {predictedSec: 91 + i}}))}]};
const state = {date: current.date, city: '3', cities: [{id: '3', name: 'İstanbul'}], races: [race], selectedRace: 'all', analyses: {current}};
const init = `<script>
localStorage.setItem('at_ai_mobil_state_v2', ${JSON.stringify(JSON.stringify(state))});
window.__dnaTest = {saved: [], requests: [], errors: []};
window.addEventListener('error', e => window.__dnaTest.errors.push(e.message));
window.addEventListener('unhandledrejection', e => window.__dnaTest.errors.push(String(e.reason)));
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, options) => {
 const u = new URL(typeof input === 'string' ? input : input.url, location.href);
 if (!u.pathname.startsWith('/api/')) return originalFetch(input, options);
 window.__dnaTest.requests.push(u.pathname + u.search);
 let value = {ok: true, races: [], rows: [], cities: [], total: 0};
 if (u.pathname === '/api/tjk-program') value = {ok: true, date: ${JSON.stringify(state.date)}, scope: 'all', cities: ${JSON.stringify(state.cities)}, racesByCity: {'3': [${JSON.stringify(race)}]}};
 if (u.pathname.includes('fog-horse')) value = {ok: true, connections: {attempted: true}, origin: null, workout: null};
 if (u.pathname.includes('horse-history')) value = {...value, atId: u.searchParams.get('atId')};
 return new Response(JSON.stringify(value), {status: 200, headers: {'Content-Type': 'application/json'}});
};
</script>`;
http.createServer((req, res) => {
 const url = new URL(req.url, 'http://localhost');
 if (url.pathname.startsWith('/api/')) {res.writeHead(500); return res.end('Unmocked fixture request');}
 const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1), file = path.resolve(root, 'public', relative);
 if (!file.startsWith(path.join(root, 'public') + path.sep) || !fs.existsSync(file)) {res.writeHead(404); return res.end('Not found');}
 const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
 res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
 let content = fs.readFileSync(file); if (relative === 'index.html') content = content.toString().replace('</head>', init + '</head>');
 res.end(content);
}).listen(4176, '127.0.0.1', () => console.log('DNA fixtures: http://127.0.0.1:4176'));
