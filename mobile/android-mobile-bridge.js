(function () {
  'use strict';

  var VERSION = 'AT-AI-ANDROID-BRIDGE-V0.1';
  if (window.__AT_AI_ANDROID_BRIDGE__) return;
  window.__AT_AI_ANDROID_BRIDGE__ = VERSION;

  var originalFetch = window.fetch ? window.fetch.bind(window) : null;

  function rawUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function isApiUrl(url) {
    return /^\/api\//.test(String(url || ''));
  }

  function toInit(input, init) {
    var out = {};
    if (input && typeof input !== 'string') {
      out.method = input.method || 'GET';
    }
    if (init && typeof init === 'object') {
      for (var key in init) out[key] = init[key];
    }
    if (!out.method) out.method = 'GET';
    return out;
  }

  function headersFrom(result) {
    var headers = new Headers();
    var source = result && result.headers ? result.headers : {};
    Object.keys(source).forEach(function (key) {
      try { headers.set(key, source[key]); } catch (_) {}
    });
    return headers;
  }

  function nativeApiFetch(input, init) {
    var url = rawUrl(input);
    if (!isApiUrl(url) || !window.ATAndroidBridge || !window.ATAndroidBridge.fetch) {
      return null;
    }

    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          var payload = window.ATAndroidBridge.fetch(url, JSON.stringify(toInit(input, init)));
          var result = JSON.parse(payload || '{}');
          var status = Number(result.status || 0);
          var body = result.body == null ? '' : String(result.body);
          resolve(new Response(body, {
            status: status > 0 ? status : 599,
            statusText: result.statusText || '',
            headers: headersFrom(result)
          }));
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  }

  if (originalFetch) {
    window.fetch = function (input, init) {
      var viaNative = nativeApiFetch(input, init);
      return viaNative || originalFetch(input, init);
    };
  }

  function installApiChip() {
    if (!window.ATAndroidBridge || document.getElementById('atAiAndroidApiChip')) return;

    var chip = document.createElement('button');
    chip.id = 'atAiAndroidApiChip';
    chip.type = 'button';
    chip.textContent = 'API';
    chip.title = 'Mobil API adresi';
    chip.style.cssText = [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'z-index:2147483647',
      'border:1px solid rgba(132,202,255,.55)',
      'background:#123251',
      'color:#eaf6ff',
      'border-radius:999px',
      'padding:9px 12px',
      'font:700 12px system-ui,-apple-system,Segoe UI,sans-serif',
      'box-shadow:0 8px 22px rgba(0,0,0,.35)'
    ].join(';');

    chip.addEventListener('click', function () {
      var current = '';
      try { current = window.ATAndroidBridge.getApiBaseUrl() || ''; } catch (_) {}
      var next = prompt('API adresi', current || 'https://at-ai-mobil.vercel.app');
      if (!next) return;
      try {
        window.ATAndroidBridge.setApiBaseUrl(next);
        alert('API adresi kaydedildi. Uygulamayi yenileyin.');
      } catch (error) {
        alert('API adresi kaydedilemedi: ' + (error && error.message ? error.message : error));
      }
    });

    document.body.appendChild(chip);
  }

  document.addEventListener('DOMContentLoaded', installApiChip);
  setTimeout(installApiChip, 1000);
  window.AT_AI_ANDROID_BRIDGE_VERSION = VERSION;
})();
