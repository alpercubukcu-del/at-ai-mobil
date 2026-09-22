/* AT AI Mobil - Native Mobile Shell V1
   UI/navigation layer only. Existing menu engines remain authoritative.
*/
(()=>{'use strict';if(window.__AT_NATIVE_MOBILE_SHELL_V1__)return;window.__AT_NATIVE_MOBILE_SHELL_V1__=true;
const VERSION='NATIVE-MOBILE-SHELL-V1.1';
const css=document.createElement('style');css.id='atNativeMobileShellV1';css.textContent=`
@media(max-width:820px){
 body{padding-bottom:76px!important;background:#252a2e!important}
 .app-shell{max-width:none!important}
 .topbar{position:sticky!important;top:0!important;z-index:80!important;background:#252a2e!important;border-bottom:1px solid #444!important;padding:14px 18px!important}
 .topbar .eyebrow{color:#cf3935!important}.topbar h1{color:#fff!important}
 main{padding:14px!important}
 main>.panel{background:#fff!important;color:#111315!important;border:1px solid #d8dcdf!important;border-radius:18px!important;box-shadow:none!important}
 main>.panel *:not(button):not(option){color:#111315!important}
 main>.panel .eyebrow{color:#cf3935!important}
 main>.panel input,main>.panel select{background:#fff!important;color:#111!important}
 main>.panel button.primary{background:#cf3935!important;color:#fff!important}
 #atMobileBottomNav{position:fixed;z-index:95;left:0;right:0;bottom:0;height:72px;padding:7px 8px max(7px,env(safe-area-inset-bottom));background:#1e2225;border-top:1px solid #444;display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
 #atMobileBottomNav button{border:0;background:transparent;color:#fff!important;border-radius:12px;font-size:11px;font-weight:750;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0}
 #atMobileBottomNav button span{color:#fff!important;font-size:20px;line-height:1}
 #atMobileBottomNav button.active{background:#cf3935!important;color:#fff!important}
 .drawer{background:#252a2e!important;color:#fff!important}.drawer *{color:#fff!important}.drawer button{background:#30363b!important;color:#fff!important;border-color:#444!important}.drawer button:hover{background:#cf3935!important}
 /* all application dialogs become native full-screen pages on phone */
 dialog:not(#drawer){position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;padding:0!important;background:#f7f6f3!important;color:#111315!important}
 dialog:not(#drawer)[open]{display:flex!important;flex-direction:column!important}
 dialog:not(#drawer)::backdrop{background:#252a2e!important}
 dialog:not(#drawer)>[class*="head"],dialog:not(#drawer)>.dialog-head{flex:0 0 auto!important;background:#252a2e!important;color:#fff!important;position:sticky!important;top:0!important;z-index:30!important}
 dialog:not(#drawer)>[class*="head"] *,dialog:not(#drawer)>.dialog-head *{color:#fff!important}
 dialog:not(#drawer)>[class*="body"],dialog:not(#drawer)>[class*="content"],dialog:not(#drawer)>[class*="scroll"]{flex:1 1 auto!important;max-height:none!important;overflow:auto!important;-webkit-overflow-scrolling:touch;background:#f7f6f3!important;color:#111315!important}
 dialog#analysisDialog,dialog#couponCenterDialog{position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;padding:0!important;background:#f7f6f3!important;color:#111!important}
 dialog#analysisDialog[open],dialog#couponCenterDialog[open]{display:flex!important;flex-direction:column!important}
 #analysisDialog .dialog-head,.coupon-menu-head-v1681{background:#252a2e!important;color:#fff!important;padding:16px!important;position:sticky!important;top:0!important;z-index:10}
 #analysisDialog .dialog-head *, .coupon-menu-head-v1681 *{color:#fff!important}
 #analysisDialog .toolbar,#analysisDialog .analysis-content,.coupon-menu-scroll-v1681{background:#f7f6f3!important;color:#111!important;padding:14px!important;max-height:none!important;overflow:auto!important}
 #analysisDialog .analysis-content *, .coupon-menu-scroll-v1681 *:not(button){color:#111!important}
 /* non-dialog legacy overlays/panels used by menus 3-9 */
 body>.modal,body>[role="dialog"],#tmRealDoorF609416{position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;margin:0!important;border-radius:0!important;z-index:120!important}
 #tmRealDoorF609416 .tmr416-panel{width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;border-radius:0!important}

}
`;document.head.appendChild(css);
function clickSel(sel){const e=document.querySelector(sel);if(e){e.click();return true}return false}
function drawerByText(re){return [...document.querySelectorAll('#drawer button')].find(b=>re.test((b.textContent||'').trim()))}
function nav(action){
 if(action==='home'){try{document.querySelector('dialog[open]')?.close()}catch{};window.scrollTo({top:0,behavior:'smooth'});return}
 if(action==='current'){(drawerByText(/Güncel Analiz/i)||document.querySelector('[data-view="current"]'))?.click();return}
 if(action==='coupon'){document.getElementById('couponMenuBtn')?.click();return}
 if(action==='archive'){(drawerByText(/7\.\s*Tarihsel Sonuç Arşivi/i)||drawerByText(/Tarihsel Sonuç Arşivi/i))?.click();return}
 if(action==='menu'){document.getElementById('menuBtn')?.click();return}
}
function install(){
 if(document.getElementById('atMobileBottomNav'))return;
 const n=document.createElement('nav');n.id='atMobileBottomNav';n.setAttribute('aria-label','Mobil ana gezinme');
 n.innerHTML='<button data-a="home" class="active"><span>⌂</span>Ana Sayfa</button><button data-a="current"><span>▥</span>Güncel</button><button data-a="coupon"><span>◆</span>Kupon</button><button data-a="archive"><span>▤</span>Arşiv</button><button data-a="menu"><span>☰</span>Menü</button>';
 n.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;nav(b.dataset.a);n.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b))});
 document.body.appendChild(n);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ATNativeMobileShellV1={version:VERSION,install,nav};console.info('[AT AI]',VERSION,'active');
})();