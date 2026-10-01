/* Carga NO bloqueante del SDK de Supabase + scripts de la app.
   Si el CDN está bloqueado por el ISP (sin VPN), no cuelga la página:
   prueba local → varios CDN con timeout → y arranca la app igualmente. */
(function () {
  'use strict';
  function load(src, ms) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'), done = false;
      var t = setTimeout(function () { if (done) return; done = true; s.onload = s.onerror = null; reject(new Error('timeout ' + src)); }, ms);
      s.async = false;
      s.onload = function () { if (done) return; done = true; clearTimeout(t); resolve(); };
      s.onerror = function () { if (done) return; done = true; clearTimeout(t); reject(new Error('error ' + src)); };
      s.src = src;
      document.head.appendChild(s);
    });
  }
  var hasSdk = function () { return window.supabase && window.supabase.createClient; };
  var SDK_SOURCES = [
    ['assets/vendor/supabase.js', 4000],
    ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 4000],
    ['https://unpkg.com/@supabase/supabase-js@2', 4000]
  ];
  function loadSdk() {
    return SDK_SOURCES.reduce(function (p, item) {
      return p.then(function () {
        if (hasSdk()) return;
        return load(item[0], item[1]).catch(function (e) { console.warn('[SDK]', e.message); });
      });
    }, Promise.resolve());
  }
  loadSdk()
    .then(function () { return load('assets/data.js', 15000); })
    .then(function () { return load('assets/shop.js', 15000); })
    .catch(function (e) { console.error('[Loader]', e); });
})();
