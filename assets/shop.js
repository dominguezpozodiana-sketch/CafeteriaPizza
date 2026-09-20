/* ============================================================
   TIENDA — Solo se carga en index.html
============================================================ */
(function () {
  'use strict';
  const P = window.Pizzeria;
  const { esc, uid, now, fmtDate, fmtTime, money } = P;

  /* ---------- Estado UI ---------- */
  const UI = { q: '', cat: 'todas', drawer: null, modal: null };
  let CART = [];

  /* ---------- Toasts y modales ---------- */
  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3300);
  }
  function openModal(html) {
    document.getElementById('modal-root').innerHTML =
      `<div class="modal-backdrop" data-action="close-modal"></div><div class="modal">${html}</div>`;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
    document.body.style.overflow = '';
  }
  function renderDrawer() {
    if (!UI.drawer) { document.getElementById('drawer-root').innerHTML = ''; document.body.style.overflow = ''; return; }
    const html = UI.drawer === 'cart' ? drawerCartHTML() : drawerCheckoutHTML();
    document.getElementById('drawer-root').innerHTML =
      `<div class="drawer-backdrop" data-action="close-drawer"></div><aside class="drawer">${html}</aside>`;
    document.body.style.overflow = 'hidden';
  }
  const closeDrawer = () => { UI.drawer = null; renderDrawer(); };

  /* ---------- Carrito ---------- */
  const cartCount = () => CART.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = () => CART.reduce((s, i) => s + i.unit * i.qty, 0);
  const lineKey = l => l.productId + '|' + (l.sizeId || '') + '|' +
    (l.extras || []).map(e => e.id).sort().join(',') + '|' + (l.notas || '');

  function unitPrice(p, sizeId, extras) {
    let base = Number(p.precio) || 0;
    if (p.permiteTamano && sizeId) {
      const s = P.DB.settings.sizes.find(x => x.id === sizeId);
      if (s) base *= s.factor;
    }
    (extras || []).forEach(id => {
      const e = P.DB.settings.extras.find(x => x.id === id);
      if (e) base += Number(e.precio) || 0;
    });
    return Math.round(base * 100) / 100;
  }
  function addToCart(line) {
    const k = lineKey(line);
    const found = CART.find(i => lineKey(i) === k);
    if (found) found.qty += line.qty;
    else CART.push(Object.assign({ lineId: uid() }, line));
    P.setCart(CART); renderDrawer(); updateBadge();
  }
  function updateBadge() {
    const el = document.getElementById('cart-count');
    if (el) { const c = cartCount(); el.textContent = c; el.style.display = c ? 'grid' : 'none'; }
  }

  /* ---------- Render tienda ---------- */
  function renderShop() {
    document.body.style.background = 'var(--cream)';
    const s = P.DB.settings;
    document.getElementById('root').innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <a href="#/" class="brand">
          <div class="logo">🍕</div>
          <div>${esc(s.nombre)}<small>${esc(s.slogan)}</small></div>
        </a>
        <nav class="nav">
          <a href="#/" class="hide-sm">Menú</a>
          <a href="#/seguir" class="hide-sm">Seguir pedido</a>
          <button class="btn-icon cart-btn" data-action="open-drawer">🛒
            <span class="cart-count" id="cart-count" style="display:none">0</span></button>
        </nav>
      </div>
    </header>

    <section class="hero">
      <div class="hero-card">
        <div>
          <span class="pill ${s.abierto ? 'open' : 'closed'}">
            ${s.abierto ? '● Abierto ahora' : '● Cerrado'} · ${esc(s.horario)}</span>
          <h1>La mejor pizza de la ciudad, <em>recién horneada</em></h1>
          <p>Masa artesanal fermentada 48 horas, ingredientes frescos y horno de leña.
             Pide a domicilio o recoge en el local.</p>
          <div class="hero-actions">
            <a href="#menu" class="btn" data-action="scroll-menu">Ver el menú 🍕</a>
            <a href="#/seguir" class="btn ghost">Seguir mi pedido</a>
          </div>
          <div class="hero-info">
            <div class="chip">🛵 <span>Delivery</span> ${money(s.deliveryFee)}</div>
            <div class="chip">⏱️ <span>Entrega</span> ${esc(s.tiempoEntrega)}</div>
            <div class="chip">🧾 <span>Mínimo</span> ${money(s.minOrder)}</div>
            <div class="chip">📞 ${esc(s.telefono)}</div>
          </div>
        </div>
        <div class="hero-art">🍕</div>
      </div>
    </section>

    <main class="menu" id="menu">
      <div class="menu-head">
        <h2>Nuestro Menú</h2>
        <div class="search"><input id="search-input" placeholder="Buscar pizza, bebida, postre..." value="${esc(UI.q)}"></div>
      </div>
      <div class="cats" id="cats">${catsHTML()}</div>
      <div class="grid" id="menu-grid"></div>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div><h4>🍕 ${esc(s.nombre)}</h4><p>${esc(s.slogan)}</p><p>${esc(s.horario)}</p></div>
        <div><h4>Contacto</h4><p>📞 ${esc(s.telefono)}</p><p>📍 ${esc(s.direccion)}</p></div>
        <div><h4>Servicios</h4><p>🛵 Delivery a domicilio</p><p>🏪 Recoger en el local</p>
          <p>💳 ${s.metodosPago.map(esc).join(' · ')}</p></div>
        <div><h4>Accesos</h4><a href="#/">Ver menú</a><a href="#/seguir">Seguir mi pedido</a></div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ${esc(s.nombre)}. Todos los derechos reservados.</span>
        <span>Hecho con 🧡 y mucha mozzarella</span>
      </div>
    </footer>`;
    renderGrid(); updateBadge();
  }

  function catsHTML() {
    const all = [{ id: 'todas', nombre: 'Todo', emoji: '✨' }, ...P.DB.categories];
    return all.map(c => `<button class="cat-chip ${UI.cat === c.id ? 'active' : ''}"
      data-action="set-cat" data-cat="${c.id}"><span>${c.emoji}</span>${esc(c.nombre)}</button>`).join('');
  }

  function renderGrid() {
    const wrap = document.getElementById('menu-grid');
    if (!wrap) return;
    const q = UI.q.trim().toLowerCase();
    let list = P.DB.products.filter(p => UI.cat === 'todas' || p.categoria === UI.cat);
    if (q) list = list.filter(p => (p.nombre + ' ' + p.descripcion).toLowerCase().includes(q));
    if (!list.length) {
      wrap.innerHTML = `<div class="empty">😕 No encontramos productos con ese criterio</div>`; return;
    }
    wrap.innerHTML = list.map(p => {
      const cat = P.DB.categories.find(c => c.id === p.categoria);
      return `<article class="pcard ${p.disponible ? '' : 'off'}" data-action="open-product" data-id="${p.id}">
        <div class="pcard-img" style="background:linear-gradient(140deg,${p.c1},${p.c2})">
          <span>${p.emoji}</span>
          ${p.destacado ? '<b class="tag">★ Top</b>' : ''}
          ${p.disponible ? '' : '<b class="tag off">Agotado</b>'}
        </div>
        <div class="pcard-body">
          <span class="cat">${esc(cat ? cat.nombre : '')}</span>
          <h3>${esc(p.nombre)}</h3>
          <p>${esc(p.descripcion)}</p>
          <div class="pcard-foot">
            <div class="price">${p.permiteTamano ? '<small>desde</small>' : ''}${money(p.precio)}</div>
            <button class="btn sm" data-action="quick-add" data-id="${p.id}" ${p.disponible ? '' : 'disabled'}>
              ${p.permiteTamano || p.permiteExtras ? 'Personalizar' : '+ Agregar'}</button>
          </div>
        </div></article>`;
    }).join('');
  }

  /* ---------- Modal de producto ---------- */
  function openProduct(id) {
    const p = P.DB.products.find(x => x.id === id);
    if (!p || !p.disponible) { if (p) toast('Ese producto no está disponible', 'err'); return; }
    UI.modal = {
      id,
      sizeId: p.permiteTamano ? (P.DB.settings.sizes[1] || P.DB.settings.sizes[0]).id : null,
      extras: [], qty: 1, notas: ''
    };
    drawProductModal();
  }
  function drawProductModal() {
    const st = UI.modal;
    const p = P.DB.products.find(x => x.id === st.id);
    if (!p) return;
    const total = unitPrice(p, st.sizeId, st.extras) * st.qty;
    openModal(`
      <div class="modal-img" style="background:linear-gradient(140deg,${p.c1},${p.c2})">${p.emoji}</div>
      <div class="modal-body">
        <h2>${esc(p.nombre)}</h2>
        <p>${esc(p.descripcion)}</p>
        ${p.permiteTamano ? `
          <div class="opt-title">Elige el tamaño</div>
          <div class="opts">
            ${P.DB.settings.sizes.map(s => `
              <label class="opt">
                <input type="radio" name="size" value="${s.id}" ${st.sizeId === s.id ? 'checked' : ''} data-role="size">
                ${esc(s.nombre)}
                <span style="color:var(--muted);font-weight:600;font-size:.8rem">(${s.factor}×)</span>
                <span class="op-price">${money(p.precio * s.factor)}</span>
              </label>`).join('')}
          </div>` : ''}
        ${p.permiteExtras && P.DB.settings.extras.length ? `
          <div class="opt-title">Extras (opcional)</div>
          <div class="opts">
            ${P.DB.settings.extras.map(e => `
              <label class="opt">
                <input type="checkbox" value="${e.id}" ${st.extras.includes(e.id) ? 'checked' : ''} data-role="extra">
                ${esc(e.nombre)}
                <span class="op-price">+${money(e.precio)}</span>
              </label>`).join('')}
          </div>` : ''}
        <div class="opt-title">Nota para la cocina (opcional)</div>
        <input id="prod-notas" placeholder="Ej: sin cebolla, bien cocida..." value="${esc(st.notas)}"
               style="padding:12px 14px;border-radius:12px;border:1.5px solid var(--line);width:100%;outline:none">
        <div class="qty-big">
          <button type="button" data-action="prod-dec">−</button>
          <b id="prod-qty">${st.qty}</b>
          <button type="button" data-action="prod-inc">+</button>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" data-action="close-modal">Cancelar</button>
          <button class="btn" data-action="prod-add">Agregar · <span id="prod-total">${money(total)}</span></button>
        </div>
      </div>`);
  }
  function refreshProdPrice() {
    const st = UI.modal; if (!st) return;
    const p = P.DB.products.find(x => x.id === st.id); if (!p) return;
    const t = unitPrice(p, st.sizeId, st.extras) * st.qty;
    const qt = document.getElementById('prod-qty');
    const tt = document.getElementById('prod-total');
    if (qt) qt.textContent = st.qty;
    if (tt) tt.textContent = money(t);
  }

  /* ---------- Drawer: carrito ---------- */
  function drawerCartHTML() {
    const s = P.DB.settings;
    if (!CART.length) {
      return `<div class="drawer-head"><h3>Tu carrito</h3>
        <button class="btn-icon" style="margin-left:auto" data-action="close-drawer">✕</button></div>
        <div class="drawer-body" style="display:grid;place-items:center;text-align:center;color:var(--muted)">
          <div><div style="font-size:3.6rem;margin-bottom:12px">🛒</div>
          <b style="color:var(--ink)">Tu carrito está vacío</b>
          <p style="font-size:.87rem;margin-top:6px">Agrega algo delicioso del menú</p></div></div>`;
    }
    const sub = cartSubtotal();
    return `<div class="drawer-head"><h3>Tu carrito</h3>
      <span class="pill" style="margin-left:auto">${cartCount()} ítem(s)</span>
      <button class="btn-icon" data-action="close-drawer">✕</button></div>
      <div class="drawer-body">
        ${CART.map(i => `<div class="line">
          <div class="line-emoji" style="background:linear-gradient(140deg,${i.c1},${i.c2})">${i.emoji}</div>
          <div class="line-info">
            <h4>${esc(i.nombre)}</h4>
            <div class="mods">
              ${i.sizeName ? '📏 ' + esc(i.sizeName) : ''}
              ${i.extras && i.extras.length ? (i.sizeName ? '<br>' : '') + '➕ ' + i.extras.map(e => esc(e.nombre)).join(', ') : ''}
            </div>
            ${i.notas ? `<div class="note">📝 ${esc(i.notas)}</div>` : ''}
            <div class="qty">
              <button data-action="cart-dec" data-line="${i.lineId}">−</button>
              <b>${i.qty}</b>
              <button data-action="cart-inc" data-line="${i.lineId}">+</button>
            </div>
          </div>
          <div class="line-right">
            <div class="line-price">${money(i.unit * i.qty)}</div>
            <button class="link-x" data-action="cart-remove" data-line="${i.lineId}">Eliminar</button>
          </div></div>`).join('')}
      </div>
      <div class="drawer-foot">
        <div class="summary"><span>Subtotal</span><span>${money(sub)}</span></div>
        <div class="summary"><span>Envío (estimado)</span><span>${money(s.deliveryFee)}</span></div>
        <div class="summary total"><span>Total aprox.</span><span>${money(sub + s.deliveryFee)}</span></div>
        <button class="btn block" style="margin-top:14px" data-action="go-checkout">Continuar con el pedido →</button>
        <button class="btn ghost block" style="margin-top:8px" data-action="close-drawer">Seguir comprando</button>
      </div>`;
  }

  /* ---------- Drawer: checkout ---------- */
  function drawerCheckoutHTML() {
    const s = P.DB.settings;
    const sub = cartSubtotal();
    return `<div class="drawer-head">
      <button class="btn-icon" data-action="back-cart">←</button>
      <h3>Finalizar pedido</h3>
      <button class="btn-icon" style="margin-left:auto" data-action="close-drawer">✕</button>
    </div>
    <div class="drawer-body">
      ${!s.abierto ? `<div class="msgs" style="background:#fee2e2;border-color:#fecaca">
        <h4 style="color:#b91c1c">🔒 Estamos cerrados</h4>
        <p style="font-size:.86rem;color:#b91c1c">Nuestro horario es ${esc(s.horario)}. Vuelve pronto 🙏</p>
      </div>` : ''}
      <form id="checkout-form" autocomplete="off">
        <div class="field"><label>Tipo de entrega</label>
          <div class="tipo-toggle">
            <input type="radio" name="tipo" id="t-delivery" value="delivery" checked>
            <label for="t-delivery"><b>🛵</b>Domicilio</label>
            <input type="radio" name="tipo" id="t-pickup" value="pickup">
            <label for="t-pickup"><b>🏪</b>Recoger</label>
          </div>
        </div>
        <div class="field"><label>Nombre completo *</label>
          <input name="nombre" required placeholder="Ej: María González"></div>
        <div class="field"><label>Teléfono *</label>
          <input name="telefono" required placeholder="Ej: +1 555 000 0000"></div>
        <div id="addr-fields">
          <div class="field"><label>Dirección de entrega *</label>
            <input name="direccion" placeholder="Calle, número, colonia"></div>
          <div class="field"><label>Referencia / Apartamento</label>
            <input name="referencia" placeholder="Ej: Portón azul, piso 3"></div>
        </div>
        <div class="field"><label>Método de pago</label>
          <select name="pago">${s.metodosPago.map(m => `<option>${esc(m)}</option>`).join('')}</select></div>
        <div class="field"><label>Notas del pedido</label>
          <textarea name="notas" rows="2" placeholder="Ej: tocar el timbre dos veces"></textarea></div>
        <div class="summary"><span>Subtotal</span><span>${money(sub)}</span></div>
        <div class="summary"><span>Envío</span><span id="co-envio">${money(s.deliveryFee)}</span></div>
        <div class="summary total"><span>Total</span><span id="co-total">${money(sub + s.deliveryFee)}</span></div>
        <p style="font-size:.76rem;color:var(--muted);margin-top:8px">
          Mínimo de pedido: ${money(s.minOrder)} · Tiempo estimado: ${esc(s.tiempoEntrega)}</p>
      </form>
    </div>
    <div class="drawer-foot">
      <button class="btn block" data-action="place-order" ${!s.abierto ? 'disabled' : ''}>
        ✅ Confirmar pedido · <span id="co-btn-total">${money(sub + s.deliveryFee)}</span></button>
    </div>`;
  }

  /* ---------- Crear pedido ---------- */
  function placeOrder() {
    const s = P.DB.settings;
    if (!s.abierto) { toast('La tienda está cerrada', 'err'); return; }
    if (!CART.length) { toast('Tu carrito está vacío', 'err'); return; }
    const form = document.getElementById('checkout-form');
    if (!form || !form.reportValidity()) return;
    const fd = new FormData(form);
    const tipo = fd.get('tipo') || 'delivery';
    const nombre = (fd.get('nombre') || '').trim();
    const telefono = (fd.get('telefono') || '').trim();
    const direccion = (fd.get('direccion') || '').trim();
    const referencia = (fd.get('referencia') || '').trim();
    if (nombre.length < 2)      { toast('Escribe tu nombre', 'err'); return; }
    if (telefono.length < 6)    { toast('Escribe un teléfono válido', 'err'); return; }
    if (tipo === 'delivery' && direccion.length < 5) { toast('Escribe tu dirección', 'err'); return; }
    const sub = cartSubtotal();
    if (tipo === 'delivery' && sub < Number(s.minOrder)) {
      toast(`El pedido mínimo para delivery es ${money(s.minOrder)}`, 'err'); return;
    }
    const envio = tipo === 'delivery' ? Number(s.deliveryFee) : 0;
    P.DB.counter = (P.DB.counter || 1000) + 1;
    const codigo = 'PED-' + P.DB.counter;
    const order = {
      id: uid(), codigo, creado: now(),
      cliente: { nombre, telefono, direccion, referencia },
      tipo, pago: fd.get('pago') || s.metodosPago[0],
      notas: (fd.get('notas') || '').trim(),
      items: CART.map(i => ({
        productId: i.productId, nombre: i.nombre, emoji: i.emoji, c1: i.c1, c2: i.c2,
        sizeName: i.sizeName || null,
        extras: (i.extras || []).map(e => e.nombre),
        notas: i.notas || '',
        qty: i.qty, unit: i.unit,
        subtotal: Math.round(i.unit * i.qty * 100) / 100
      })),
      subtotal: Math.round(sub * 100) / 100,
      envio,
      total: Math.round((sub + envio) * 100) / 100,
      estado: 'pendiente',
      historial: [{ estado: 'pendiente', fecha: now() }],
      mensajes: []
    };
    P.DB.orders.unshift(order); P.save();
    P.addMyOrder(codigo);
    CART = []; P.setCart(CART);
    closeDrawer();
    toast('¡Pedido enviado con éxito! 🎉', 'ok');
    location.hash = '#/pedido/' + codigo;
  }

  /* ---------- Seguimiento ---------- */
  function renderTracking(codigo) {
    document.body.style.background = 'var(--cream)';
    const mine = P.getMyOrders();
    let order = null;
    if (codigo) order = P.DB.orders.find(o => o.codigo.toUpperCase() === String(codigo).toUpperCase());

    document.getElementById('root').innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <a href="#/" class="brand"><div class="logo">🍕</div>
          <div>${esc(P.DB.settings.nombre)}<small>${esc(P.DB.settings.slogan)}</small></div></a>
        <nav class="nav">
          <a href="#/">← Volver al menú</a>
          <button class="btn-icon cart-btn" data-action="open-drawer">🛒
            <span class="cart-count" id="cart-count" style="display:none">0</span></button>
        </nav>
      </div>
    </header>

    <div class="track">
      <div class="track-box" style="margin-bottom:20px">
        <h2 style="font-size:1.15rem;font-weight:900;margin-bottom:6px">🔎 Seguir mi pedido</h2>
        <p style="color:var(--muted);font-size:.86rem;margin-bottom:16px">
          Ingresa el código que te dimos al confirmar tu pedido (ej: PED-1001)</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <input id="track-input" placeholder="PED-1001" value="${esc(codigo || '')}"
            style="flex:1;min-width:180px;padding:12px 15px;border-radius:12px;border:1.5px solid var(--line);outline:none">
          <button class="btn" data-action="track">Buscar</button>
        </div>
        ${mine.length ? `<div class="my-orders">
          <span style="font-size:.78rem;font-weight:800;color:var(--muted);text-transform:uppercase;
            letter-spacing:.5px;align-self:center;margin-right:4px">Mis pedidos:</span>
          ${mine.slice(0, 6).map(c => `<button data-action="track-code" data-code="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>` : ''}
      </div>
      ${codigo && !order ? `<div class="track-box" style="text-align:center;padding:44px">
        <div style="font-size:3rem">🔍</div>
        <h3 style="margin:10px 0 6px">Pedido no encontrado</h3>
        <p style="color:var(--muted);font-size:.88rem">Verifica el código e inténtalo de nuevo.</p>
      </div>` : ''}
      ${order ? trackOrderHTML(order) : ''}
    </div>`;
    updateBadge();
  }

  function trackOrderHTML(o) {
    const cancelado = o.estado === 'cancelado';
    const flow = P.ESTADOS.filter(e => !(o.tipo === 'pickup' && e.id === 'en_camino'));
    const idx = flow.findIndex(e => e.id === o.estado);
    return `<div class="track-box">
      <div class="track-head">
        <div><h2>${o.tipo === 'delivery' ? '🛵 Entrega a domicilio' : '🏪 Recoger en el local'}</h2>
          <p style="color:var(--muted);font-size:.85rem;margin-top:5px">
            Realizado el ${fmtDate(o.creado)} · ${o.items.length} producto(s)</p></div>
        <div style="text-align:right">
          <div class="code-badge">${esc(o.codigo)}</div>
          <div style="margin-top:9px">
            <span class="estado e-${o.estado}">${P.ESTADO_LABEL[o.estado]}</span></div>
        </div>
      </div>
      ${cancelado ? `<div class="msgs" style="background:#fee2e2;border-color:#fecaca">
        <h4 style="color:#b91c1c">❌ Pedido cancelado</h4>
        <p style="font-size:.87rem;color:#b91c1c">Contáctanos al ${esc(P.DB.settings.telefono)}.</p></div>`
      : `<div class="timeline">
        ${flow.map((e, i) => {
          const done = i <= idx, current = i === idx && o.estado !== 'entregado';
          const h = (o.historial || []).find(x => x.estado === e.id);
          return `<div class="tl-item ${done ? 'done' : ''} ${current ? 'current' : ''}">
            <span class="tl-icon">${e.icon}</span><h4>${e.label}</h4><p>${e.desc}</p>
            ${h ? `<div class="tl-time">${fmtTime(h.fecha)} · ${fmtDate(h.fecha)}</div>` : ''}
          </div>`; }).join('')}
      </div>`}
      ${o.mensajes && o.mensajes.length ? `<div class="msgs">
        <h4>💬 Mensajes del restaurante</h4>
        ${o.mensajes.map(m => `<div class="msg">${esc(m.texto)}<small>${fmtDate(m.fecha)}</small></div>`).join('')}
      </div>` : ''}
      <div style="margin-top:22px;padding-top:18px;border-top:1px dashed var(--line)">
        <h4 style="font-size:.8rem;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:12px">
          Detalle del pedido</h4>
        ${o.items.map(i => `<div style="display:flex;gap:12px;align-items:center;padding:9px 0">
          <div class="mini-emoji" style="background:linear-gradient(140deg,${i.c1},${i.c2})">${i.emoji}</div>
          <div style="flex:1;min-width:0">
            <b style="font-size:.9rem">${i.qty}× ${esc(i.nombre)}</b>
            <div style="font-size:.76rem;color:var(--muted)">
              ${i.sizeName ? esc(i.sizeName) : ''}${i.extras.length ? ' · ' + i.extras.map(esc).join(', ') : ''}</div>
            ${i.notas ? `<div style="font-size:.74rem;color:var(--orange);font-style:italic">📝 ${esc(i.notas)}</div>` : ''}
          </div>
          <b style="font-size:.88rem">${money(i.subtotal)}</b></div>`).join('')}
        <div class="summary" style="margin-top:14px"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
        <div class="summary"><span>Envío</span><span>${o.envio ? money(o.envio) : 'Gratis'}</span></div>
        <div class="summary total"><span>Total</span><span>${money(o.total)}</span></div>
      </div>
      <div style="margin-top:20px;background:#f8f9fb;border-radius:14px;padding:15px;font-size:.85rem;line-height:1.7">
        <b>Datos de contacto</b><br>
        👤 ${esc(o.cliente.nombre)}<br>📞 ${esc(o.cliente.telefono)}
        ${o.tipo === 'delivery' ? `<br>📍 ${esc(o.cliente.direccion)}${o.cliente.referencia ? ' (' + esc(o.cliente.referencia) + ')' : ''}` : ''}
        <br>💳 ${esc(o.pago)}${o.notas ? `<br>📝 ${esc(o.notas)}` : ''}
      </div>
      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
        <a href="#/" class="btn ghost">← Volver al menú</a>
        <a href="tel:${esc(P.DB.settings.telefono)}" class="btn dark">📞 Llamar al local</a>
      </div>
    </div>`;
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action, id = el.dataset.id;

    switch (a) {
      case 'set-cat': UI.cat = el.dataset.cat;
        document.querySelectorAll('.cat-chip').forEach(c =>
          c.classList.toggle('active', c.dataset.cat === UI.cat));
        renderGrid(); break;
      case 'scroll-menu': e.preventDefault();
        document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'open-product': openProduct(id); break;
      case 'quick-add': {
        const p = P.DB.products.find(x => x.id === id); if (!p) break;
        if (p.permiteTamano || (p.permiteExtras && P.DB.settings.extras.length)) { openProduct(id); break; }
        addToCart({ productId: p.id, nombre: p.nombre, emoji: p.emoji, c1: p.c1, c2: p.c2,
          sizeId: null, sizeName: null, extras: [], qty: 1,
          unit: unitPrice(p, null, []), notas: '' });
        toast(`${p.emoji} ${esc(p.nombre)} agregado`, 'ok'); break;
      }
      case 'prod-inc': UI.modal.qty++; refreshProdPrice(); break;
      case 'prod-dec': if (UI.modal.qty > 1) UI.modal.qty--; refreshProdPrice(); break;
      case 'prod-add': {
        const st = UI.modal;
        const p = P.DB.products.find(x => x.id === st.id);
        const notas = (document.getElementById('prod-notas')?.value || '').trim();
        const size = p.permiteTamano ? P.DB.settings.sizes.find(s => s.id === st.sizeId) : null;
        const extras = (p.permiteExtras ? st.extras : [])
          .map(eid => P.DB.settings.extras.find(x => x.id === eid)).filter(Boolean);
        addToCart({
          productId: p.id, nombre: p.nombre, emoji: p.emoji, c1: p.c1, c2: p.c2,
          sizeId: size ? size.id : null, sizeName: size ? size.nombre : null,
          extras: extras.map(x => ({ id: x.id, nombre: x.nombre, precio: x.precio })),
          qty: st.qty, unit: unitPrice(p, size ? size.id : null, extras.map(x => x.id)),
          notas
        });
        closeModal();
        toast(`${p.emoji} ${esc(p.nombre)} agregado al carrito`, 'ok'); break;
      }
      case 'close-modal': closeModal(); break;
      case 'open-drawer': UI.drawer = 'cart'; renderDrawer(); break;
      case 'close-drawer': closeDrawer(); break;
      case 'go-checkout':
        if (!CART.length) { toast('Tu carrito está vacío', 'err'); break; }
        UI.drawer = 'checkout'; renderDrawer(); break;
      case 'back-cart': UI.drawer = 'cart'; renderDrawer(); break;
      case 'cart-inc': { const l = CART.find(x => x.lineId === el.dataset.line); if (l) l.qty++;
        P.setCart(CART); renderDrawer(); updateBadge(); break; }
      case 'cart-dec': { const l = CART.find(x => x.lineId === el.dataset.line);
        if (l) { l.qty--; if (l.qty <= 0) CART = CART.filter(x => x.lineId !== l.lineId); }
        P.setCart(CART); renderDrawer(); updateBadge(); break; }
      case 'cart-remove': CART = CART.filter(x => x.lineId !== el.dataset.line);
        P.setCart(CART); renderDrawer(); updateBadge(); break;
      case 'place-order': placeOrder(); break;
      case 'track': {
        const v = (document.getElementById('track-input')?.value || '').trim();
        if (!v) { toast('Escribe un código de pedido', 'err'); break; }
        location.hash = '#/pedido/' + v.toUpperCase(); break;
      }
      case 'track-code': location.hash = '#/pedido/' + el.dataset.code; break;
    }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.role === 'size') { UI.modal.sizeId = t.value; refreshProdPrice(); return; }
    if (t.dataset.role === 'extra') {
      const v = t.value;
      if (t.checked) { if (!UI.modal.extras.includes(v)) UI.modal.extras.push(v); }
      else UI.modal.extras = UI.modal.extras.filter(x => x !== v);
      refreshProdPrice(); return;
    }
    if (t.name === 'tipo' && t.type === 'radio') {
      const delivery = t.value === 'delivery';
      const addr = document.getElementById('addr-fields');
      if (addr) addr.style.display = delivery ? '' : 'none';
      const sub = cartSubtotal();
      const fee = delivery ? Number(P.DB.settings.deliveryFee) : 0;
      const e1 = document.getElementById('co-envio');
      const e2 = document.getElementById('co-total');
      const e3 = document.getElementById('co-btn-total');
      if (e1) e1.textContent = money(fee);
      if (e2) e2.textContent = money(sub + fee);
      if (e3) e3.textContent = money(sub + fee);
    }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'search-input') { UI.q = t.value; renderGrid(); return; }
    if (t.id === 'prod-notas' && UI.modal) UI.modal.notas = t.value;
  });

  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'checkout-form') placeOrder();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('modal-root').innerHTML) closeModal();
      else if (UI.drawer) closeDrawer();
    }
    if (e.key === 'Enter' && e.target.id === 'track-input') {
      e.preventDefault();
      const v = e.target.value.trim();
      if (v) location.hash = '#/pedido/' + v.toUpperCase();
    }
  });

  /* ---------- Sincronización entre pestañas ---------- */
  window.addEventListener('storage', ev => {
    if (ev.key === P.DB_KEY) { P.DB = JSON.parse(ev.newValue || 'null') || P.DB; render(); }
    if (ev.key === P.CART_KEY) { CART = P.getCart(); renderDrawer(); updateBadge(); }
  });

  /* ---------- Router ---------- */
  function render() {
    const h = location.hash || '#/';
    const parts = h.split('/');
    const route = parts[1] || '';
    if (route === 'pedido')      renderTracking(parts[2] ? decodeURIComponent(parts[2]) : '');
    else if (route === 'seguir') renderTracking('');
    else                         renderShop();
  }

  /* ---------- Init ---------- */
  P.init();
  CART = P.getCart();
  window.addEventListener('hashchange', render);
  render();
})();