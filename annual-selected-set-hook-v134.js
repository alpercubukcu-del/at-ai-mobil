/* AT AI Mobil — Annual Archive Selection Hook V13.4
   Loaded immediately before the standalone annual archive module.
   Captures only the module's first Set (selectedIds), then restores native Set.
*/
(() => {
  'use strict';
  if (window.__AT_AA_SET_HOOK_V134__) return;
  window.__AT_AA_SET_HOOK_V134__ = true;

  const NativeSet = window.Set;
  let captured = false;

  function CaptureSet(iterable) {
    const instance = new NativeSet(iterable);
    if (!captured) {
      captured = true;
      window.__AT_AA_SELECTED_IDS_V134__ = instance;
    }
    return instance;
  }

  CaptureSet.prototype = NativeSet.prototype;
  try { Object.setPrototypeOf(CaptureSet, NativeSet); } catch {}
  window.Set = CaptureSet;

  setTimeout(() => {
    if (window.Set === CaptureSet) window.Set = NativeSet;
  }, 0);
})();
