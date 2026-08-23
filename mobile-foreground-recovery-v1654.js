/* AT AI Mobil — MOBILE-FOREGROUND-RECOVERY-V16.5.4
 * Android/Chrome/Samsung Internet sekme degistirme veya bfcache donuslerinde bos/donmus ekran riskini azaltir.
 * - Arka plana geciste mevcut state'i kaydetmeye calisir.
 * - Geri donuste compositor repaint zorlar.
 * - BFCache donusunde veya gercekten bos DOM tespitinde kontrollu tek seferlik reload yapar.
 * - Reload dongusunu sessionStorage cooldown ile engeller.
 * - Kaydirma konumunu korur.
 */
(() => {
  'use strict';
  if (window.__AT_MOBILE_FOREGROUND_RECOVERY_V1654__) return;
  window.__AT_MOBILE_FOREGROUND_RECOVERY_V1654__ = true;

  const VERSION = 'MOBILE-FOREGROUND-RECOVERY-V16.5.4';
  const KEY_HIDDEN_AT = 'atAiV1654HiddenAt';
  const KEY_RELOAD_AT = 'atAiV1654ReloadAt';
  const KEY_SCROLL_Y = 'atAiV1654ScrollY';
  const RELOAD_COOLDOWN_MS = 15000;
  let recovering = false;
  let lastPaintAt = Date.now();

  function safeSessionGet(key) {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }

  function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, String(value)); } catch {}
  }

  function saveAppState() {
    try {
      if (typeof window.save === 'function') window.save();
      else if (typeof save === 'function') save();
    } catch {}
    safeSessionSet(KEY_SCROLL_Y, Math.max(0, Math.round(window.scrollY || 0)));
  }

  function shellHealthy() {
    const shell = document.querySelector('.app-shell');
    if (!shell || !document.body) return false;
    const cs = getComputedStyle(shell);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || 1) === 0) return false;
    const rect = shell.getBoundingClientRect();
    const bodyHeight = Math.max(document.body.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
    return rect.width > 20 && rect.height > 120 && bodyHeight > 160;
  }

  function forceRepaint() {
    if (!document.body || !document.documentElement) return;
    const body = document.body;
    const html = document.documentElement;
    const oldBodyTransform = body.style.transform;
    const oldHtmlTransform = html.style.transform;
    const oldBackface = body.style.backfaceVisibility;
    body.style.transform = 'translateZ(0)';
    body.style.backfaceVisibility = 'hidden';
    html.style.transform = 'translateZ(0)';
    void body.offsetHeight;
    requestAnimationFrame(() => {
      body.style.transform = oldBodyTransform;
      body.style.backfaceVisibility = oldBackface;
      html.style.transform = oldHtmlTransform;
      void body.offsetHeight;
      lastPaintAt = Date.now();
    });
  }

  function hardReload(reason) {
    if (recovering) return false;
    const now = Date.now();
    const lastReloadAt = Number(safeSessionGet(KEY_RELOAD_AT) || 0);
    if (now - lastReloadAt < RELOAD_COOLDOWN_MS) return false;
    recovering = true;
    saveAppState();
    safeSessionSet(KEY_RELOAD_AT, now);
    console.warn('[AT AI]', VERSION, 'kontrollu yenileme:', reason);
    location.reload();
    return true;
  }

  function inspectAndRecover(reason, allowReload = true) {
    if (document.visibilityState === 'hidden') return;
    forceRepaint();
    setTimeout(() => {
      if (document.visibilityState === 'hidden') return;
      if (!shellHealthy() && allowReload) hardReload(`${reason}-blank-shell`);
    }, 450);
  }

  function onHidden() {
    safeSessionSet(KEY_HIDDEN_AT, Date.now());
    saveAppState();
  }

  function onVisible(reason = 'visibility') {
    const hiddenAt = Number(safeSessionGet(KEY_HIDDEN_AT) || 0);
    const hiddenMs = hiddenAt ? Math.max(0, Date.now() - hiddenAt) : 0;
    inspectAndRecover(`${reason}-${hiddenMs}ms`, true);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHidden();
    else onVisible('visibility-return');
  }, { passive: true });

  window.addEventListener('pagehide', onHidden, { passive: true });

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      // BFCache kaynakli siyah/bos donuslerde en guvenilir cozum temiz bir boot.
      setTimeout(() => {
        if (!hardReload('bfcache-return')) inspectAndRecover('bfcache-cooldown', false);
      }, 80);
      return;
    }
    inspectAndRecover('pageshow', true);
  }, { passive: true });

  window.addEventListener('focus', () => inspectAndRecover('window-focus', true), { passive: true });
  window.addEventListener('online', () => inspectAndRecover('online', true), { passive: true });

  window.addEventListener('load', () => {
    const y = Number(safeSessionGet(KEY_SCROLL_Y) || 0);
    if (Number.isFinite(y) && y > 0) setTimeout(() => window.scrollTo(0, y), 250);
    inspectAndRecover('load', true);
  }, { once: true });

  // Android WebView/Chrome compositor katmaninin uzun sure paint almamasina karsi hafif heartbeat.
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      if (Date.now() - lastPaintAt > 30000) forceRepaint();
    }
  }, 10000);

  console.info('[AT AI]', VERSION, 'aktif — mobil geri donus/self-heal korumasi');
})();
