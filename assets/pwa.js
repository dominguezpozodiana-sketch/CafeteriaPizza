/* PWA: registro del service worker + botón "Instalar app" */
(function () {
  'use strict';
  if ('serviceWorker' in navigator) {
    // Registrar de inmediato (sin esperar 'load', que se retrasa si un CDN está bloqueado)
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('[PWA] SW:', err));
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone || sessionStorage.getItem('pwa_dismissed') === '1') return;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  let deferred = null;

  const st = document.createElement('style');
  st.textContent = `
  #pwa-install{position:fixed;left:14px;bottom:14px;z-index:150;display:none;align-items:center;gap:6px;
    background:#1b1410;color:#fff;border-radius:999px;padding:6px 6px 6px 16px;font-weight:700;font-size:.85rem;
    box-shadow:0 8px 24px rgba(0,0,0,.28)}
  #pwa-install button{color:inherit}
  #pwa-install .x{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.15);line-height:26px;font-size:.8rem}
  #pwa-help{position:fixed;left:14px;right:14px;bottom:70px;z-index:151;background:#fff;color:#241c17;border-radius:16px;
    padding:16px 18px;box-shadow:0 12px 34px rgba(0,0,0,.28);font-size:.9rem;line-height:1.5}`;
  document.head.appendChild(st);

  const box = document.createElement('div');
  box.id = 'pwa-install';
  box.innerHTML = '<button type="button" class="go">📲 Instalar app</button><button type="button" class="x" aria-label="Cerrar">✕</button>';
  document.body.appendChild(box);
  const show = () => { box.style.display = 'flex'; };
  const hide = () => { box.style.display = 'none'; const h = document.getElementById('pwa-help'); if (h) h.remove(); };

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; show(); });
  window.addEventListener('appinstalled', () => { deferred = null; hide(); });
  if (isIos) show();

  box.querySelector('.x').addEventListener('click', () => { sessionStorage.setItem('pwa_dismissed', '1'); hide(); });
  box.querySelector('.go').addEventListener('click', async () => {
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch (e) {}
      deferred = null; hide();
    } else if (isIos && !document.getElementById('pwa-help')) {
      const h = document.createElement('div');
      h.id = 'pwa-help';
      h.innerHTML = 'Para instalar: toca <b>Compartir</b> ⬆️ y luego <b>«Añadir a pantalla de inicio»</b>.';
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 9000);
    }
  });
})();
