/* AT AI Mobil — V12.8 Automatic Resume After Reconnect
   - V12.7 checkpoint katmanindan sonra yuklenir.
   - Baglanti geri geldiginde 2.5 sn bekler ve yarim kalan Kariyer analizini otomatik devam ettirir.
   - Manuel Devam et butonu korunur.
   - Ayni yeniden-baslatmayi birden fazla kez tetiklememek icin cooldown uygular.
*/
(() => {
'use strict';
if (window.__AT_AUTO_RESUME_V128__) return;
window.__AT_AUTO_RESUME_V128__ = true;

const VERSION = 'AUTO-RESUME-NETWORK-V12.8';
const AUTO_DELAY_MS = 2500;
const BOOT_DELAY_MS = 3500;
const CLICK_COOLDOWN_MS = 15000;
let timer = null;
let lastAutoClickAt = 0;

function resumeUi() {
  const box = document.getElementById('atAiResumeV127');
  if (!box || !box.classList.contains('show')) return null;
  const button = box.querySelector('button');
  if (!button) return null;
  const visible = getComputedStyle(button).display !== 'none' && !button.disabled;
  return visible ? { box, button } : null;
}

function markAutoStarting(box) {
  const title = box?.querySelector('.at-resume-text b');
  const detail = box?.querySelector('.at-resume-text span');
  if (title) title.textContent = 'Bağlantı geri geldi';
  if (detail) detail.textContent = 'Eksik kalan analiz otomatik devam ettiriliyor… Tamamlanan veriler yeniden indirilmeyecek.';
}

function tryAutoResume(reason = 'online') {
  if (!navigator.onLine) return false;
  const now = Date.now();
  if (now - lastAutoClickAt < CLICK_COOLDOWN_MS) return false;
  const ui = resumeUi();
  if (!ui) return false;

  lastAutoClickAt = now;
  markAutoStarting(ui.box);
  console.info('[AT AI]', VERSION, 'otomatik devam:', reason);
  ui.button.click();
  return true;
}

function scheduleAutoResume(delay = AUTO_DELAY_MS, reason = 'online') {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    tryAutoResume(reason);
  }, delay);
}

window.addEventListener('offline', () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
});

window.addEventListener('online', () => {
  scheduleAutoResume(AUTO_DELAY_MS, 'reconnect');
});

// Sayfa yenilenip internet geri gelmis durumdaysa V12.7 yarim oturumu yukledikten sonra otomatik devam et.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scheduleAutoResume(BOOT_DELAY_MS, 'page-reload'), { once:true });
} else {
  scheduleAutoResume(BOOT_DELAY_MS, 'page-reload');
}

console.info('[AT AI]', VERSION, 'aktif — baglanti gelince otomatik eksikten devam');
})();
