/* ============================================================
   ADMIN — Solo se carga en admin/index.html
============================================================ */
(function () {
  'use strict';
  const P = window.Pizzeria;
  const { esc, uid, now, fmtDate, fmtTime, money } = P;

  const UI = { tab: 'dashboard', orderFilter: 'todos' };
  let failedAttempts = 0;

  /* ---------- Toasts / modales ---------- */
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

  /* ---------- Login ---------- */
  function renderLogin() {
    document.body.style.background = 'linear-gradient(140deg,#1b1410,#3a2318 60%,#5c2a12)';
    document.getElementById('root').innerHTML = `
    <div class="login-wrap"><div class="login">
      <div class="logo">🍕</div>
      <h1>Panel de Administración</h1>
      <p>${esc(P.DB.settings.nombre)} · Acceso restringido</p>
      <form id="login-form" autocomplete="off">
        <div class="field" style="text-align:left">
          <label>Contraseña de acceso</label>
          <input type="password" name="pin" id="pin-input" placeholder="••••••••" autocomplete="off"
            style="text-align:center;font-size:1.3rem;letter-spacing:6px;font-weight:800">
        </div>
        <button class="btn block" type="submit" id="login-btn">Entrar al panel</button>
      </form>
      <div class="hint">🔐 Contraseña por defecto: <b>1234</b>.<br>
        Cámbiala en <b>Ajustes → Seguridad</b> en cuanto entres.</div>
    </div></div>`;
    setTimeout(() => document.getElementById('pin-input')?.focus(), 100);
  }

  async function doLogin(form) {
    const pin = (new FormData(form).get('pin') || '').trim();
    if (!pin) { toast('Escribe la contraseña', 'err'); return; }
    const btn = document.getElementById('login-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }
    const ok = await P.verifyPin(pin);
    if (ok) {
      failedAttempts = 0;
      P.loginAdmin();
      UI.tab = 'dashboard';
      toast('¡Bienvenido! 👋', 'ok');
      renderAdmin();
    } else {
      failedAttempts++;
      const wait = Math.min(failedAttempts * 800, 4000);
      toast(`Contraseña incorrecta (intento ${failedAttempts})`, 'err');
      if (btn) { btn.disabled = true; btn.textContent = `Espera ${Math.ceil(wait/1000)}s…`; }
      setTimeout(() => {
        const b = document.getElementById('login-btn');
        if (b) { b.disabled = false; b.textContent = 'Entrar al panel'; }
      }, wait);
      const i = document.getElementById('pin-input'); if (i) { i.value = ''; i.focus(); }
    }
  }

  /* ---------- Render principal del panel ---------- */
  function renderAdmin() {
    if (!P.isAdmin()) { renderLogin(); return; }
    document.body.style.background = '#f4f5f7';
    const pend = P.DB.orders.filter(o => o.estado === 'pendiente').length;
    document.getElementById('root').innerHTML = `
    <div class="admin">
      <aside class="sidebar">
        <div class="brand">
          <div class="logo" style="width:38px;height:38px;border-radius:12px">🍕</div>
          <div style="font-size:.95rem">${esc(P.DB.settings.nombre)}<small style="color:#8a7a6e">Panel admin</small></div>
        </div>
        <nav class="side-nav">
          <button data-action="admin-tab" data-tab="dashboard" class="${UI.tab==='dashboard'?'active':''}">📊 Dashboard</button>
          <button data-action="admin-tab" data-tab="pedidos" class="${UI.tab==='pedidos'?'active':''}">
            🧾 Pedidos ${pend ? `<span class="badge">${pend}</span>` : ''}</button>
          <button data-action="admin-tab" data-tab="productos" class="${UI.tab==='productos'?'active':''}">🍕 Productos</button>
          <button data-action="admin-tab" data-tab="categorias" class="${UI.tab==='categorias'?'active':''}">🗂️ Categorías</button>
          <button data-action="admin-tab" data-tab="ajustes" class="${UI.tab==='ajustes'?'active':''}">⚙️ Ajustes</button>
        </nav>
        <div class="side-foot">
          <button data-action="admin-view-store">🏪 Ver tienda</button>
          <button data-action="admin-logout">🚪 Cerrar sesión</button>
        </div>
      </aside>
      <main class="admin-main" id="admin-content"></main>
    </div>`;
    const c = document.getElementById('admin-content');
    if (UI.tab === 'dashboard')  c.innerHTML = adminDashboard();
    if (UI.tab === 'pedidos')    c.innerHTML = adminOrders();
    if (UI.tab === 'productos')  c.innerHTML = adminProducts();
    if (UI.tab === 'categorias') c.innerHTML = adminCategories();
    if (UI.tab === 'ajustes')    c.innerHTML = adminSettings();
  }

  /* ---------- Dashboard ---------- */
  function adminDashboard() {
    const hoy = P.DB.orders.filter(o => P.isToday(o.creado));
    const validos = hoy.filter(o => o.estado !== 'cancelado');
    const ventas = validos.reduce((s, o) => s + o.total, 0);
    const ticket = validos.length ? ventas / validos.length : 0;
    const activos = P.DB.orders.filter(o => !['entregado','cancelado'].includes(o.estado));
    const counter = {};
    P.DB.orders.forEach(o => o.items.forEach(i => {
      counter[i.nombre] = counter[i.nombre] || { qty:0, total:0, emoji:i.emoji, c1:i.c1, c2:i.c2 };
      counter[i.nombre].qty += i.qty;
      counter[i.nombre].total += i.subtotal;
    }));
    const top = Object.entries(counter).sort((a,b) => b[1].qty - a[1].qty).slice(0, 5);

    return `
    <div class="admin-top">
      <div><h1>Dashboard</h1><div class="sub">${new Date().toLocaleDateString('es-ES',
        { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div></div>
      <div class="spacer"></div>
      <span class="pill ${P.DB.settings.abierto ? 'open' : 'closed'}">${P.DB.settings.abierto ? '● Tienda abierta' : '● Tienda cerrada'}</span>
      <button class="btn sm ${P.DB.settings.abierto ? 'ghost' : 'green'}" data-action="toggle-open">
        ${P.DB.settings.abierto ? 'Cerrar tienda' : 'Abrir tienda'}</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="ico" style="background:#e0f2fe">🧾</div>
        <div class="val">${hoy.length}</div><div class="lbl">Pedidos hoy</div></div>
      <div class="stat"><div class="ico" style="background:#dcfce7">💰</div>
        <div class="val">${money(ventas)}</div><div class="lbl">Ventas hoy</div></div>
      <div class="stat"><div class="ico" style="background:#fff3e6">📈</div>
        <div class="val">${money(ticket)}</div><div class="lbl">Ticket promedio</div></div>
      <div class="stat"><div class="ico" style="background:#ede9fe">⏳</div>
        <div class="val">${activos.length}</div><div class="lbl">Pedidos activos</div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🕐 Últimos pedidos</h3><div class="spacer"></div>
        <button class="btn ghost sm" data-action="admin-tab" data-tab="pedidos">Ver todos</button></div>
      <div class="panel-body">
        ${P.DB.orders.length
          ? `<div class="olist">${P.DB.orders.slice(0,5).map(ocardHTML).join('')}</div>`
          : `<p style="color:var(--muted);text-align:center;padding:26px">Aún no hay pedidos registrados.</p>`}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🏆 Productos más vendidos</h3></div>
      <div class="panel-body">
        ${top.length ? top.map(([n, d], i) => `
          <div style="display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid #f4f5f8">
            <b style="color:var(--muted);width:20px">${i+1}</b>
            <div class="mini-emoji" style="background:linear-gradient(140deg,${d.c1},${d.c2})">${d.emoji}</div>
            <div style="flex:1"><b style="font-size:.9rem">${esc(n)}</b>
              <div style="font-size:.77rem;color:var(--muted)">${d.qty} unidades vendidas</div></div>
            <b style="color:var(--red)">${money(d.total)}</b>
          </div>`).join('')
          : `<p style="color:var(--muted);text-align:center;padding:26px">Sin datos de ventas todavía.</p>`}
      </div>
    </div>`;
  }

  function ocardHTML(o) {
    return `<div class="ocard" data-action="order-detail" data-id="${o.id}">
      <div class="mini-emoji" style="background:${o.tipo==='delivery'?'#e0f2fe':'#fef3c7'}">${o.tipo==='delivery'?'🛵':'🏪'}</div>
      <div class="oinfo">
        <div class="ocode">${esc(o.codigo)} <span style="font-weight:600;color:var(--muted);font-family:inherit">· ${esc(o.cliente.nombre)}</span></div>
        <small>${fmtDate(o.creado)} · ${o.items.length} ítem(s) · ${esc(o.pago)}</small>
      </div>
      <span class="estado e-${o.estado}">${P.ESTADO_LABEL[o.estado]}</span>
      <div class="ototal">${money(o.total)}</div>
    </div>`;
  }

  /* ---------- Pedidos ---------- */
  function adminOrders() {
    const filtros = ['todos','pendiente','confirmado','preparando','listo','en_camino','entregado','cancelado'];
    const list = UI.orderFilter === 'todos'
      ? P.DB.orders
      : P.DB.orders.filter(o => o.estado === UI.orderFilter);
    return `
    <div class="admin-top">
      <div><h1>Pedidos</h1><div class="sub">${P.DB.orders.length} pedido(s) en total</div></div>
      <div class="spacer"></div>
      <button class="btn ghost sm" data-action="admin-tab" data-tab="dashboard">← Dashboard</button>
    </div>
    <div class="filters">
      ${filtros.map(f => {
        const n = f === 'todos' ? P.DB.orders.length : P.DB.orders.filter(o => o.estado === f).length;
        return `<button data-action="order-filter" data-f="${f}" class="${UI.orderFilter===f?'active':''}">
          ${f==='todos'?'Todos':P.ESTADO_LABEL[f]} (${n})</button>`;
      }).join('')}
    </div>
    ${list.length ? `<div class="olist">${list.map(ocardHTML).join('')}</div>`
      : `<div class="panel"><div class="panel-body" style="text-align:center;padding:50px;color:var(--muted)">
          <div style="font-size:3rem;margin-bottom:10px">📭</div>
          <b>No hay pedidos en esta categoría</b></div></div>`}`;
  }

  function openOrderDetail(id) {
    const o = P.DB.orders.find(x => x.id === id); if (!o) return;
    const flow = P.ESTADOS.filter(e => !(o.tipo === 'pickup' && e.id === 'en_camino'));
    const idx = flow.findIndex(e => e.id === o.estado);
    const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;

    openModal(`
    <div class="modal-body" style="padding-top:24px">
      <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:18px">
        <div style="flex:1">
          <div class="code-badge" style="display:inline-block;margin-bottom:8px">${esc(o.codigo)}</div>
          <h2 style="font-size:1.25rem">${o.tipo==='delivery'?'🛵 Domicilio':'🏪 Recoger en local'}</h2>
          <p style="color:var(--muted);font-size:.83rem;margin-top:3px">${fmtDate(o.creado)}</p>
        </div>
        <span class="estado e-${o.estado}">${P.ESTADO_LABEL[o.estado]}</span>
      </div>
      <div style="background:#f8f9fb;border-radius:14px;padding:15px;font-size:.87rem;line-height:1.85;margin-bottom:18px">
        👤 <b>${esc(o.cliente.nombre)}</b><br>📞 ${esc(o.cliente.telefono)}<br>
        ${o.tipo==='delivery'?`📍 ${esc(o.cliente.direccion)}${o.cliente.referencia?' ('+esc(o.cliente.referencia)+')':''}<br>`:''}
        💳 ${esc(o.pago)}${o.notas?`<br>📝 <i>${esc(o.notas)}</i>`:''}
      </div>
      <h4 style="font-size:.78rem;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:10px">Productos</h4>
      ${o.items.map(i => `<div style="display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)">
        <div class="mini-emoji" style="background:linear-gradient(140deg,${i.c1},${i.c2})">${i.emoji}</div>
        <div style="flex:1"><b style="font-size:.89rem">${i.qty}× ${esc(i.nombre)}</b>
          <div style="font-size:.75rem;color:var(--muted)">
            ${i.sizeName?esc(i.sizeName):''}${i.extras.length?' · '+i.extras.map(esc).join(', '):''}</div>
          ${i.notas?`<div style="font-size:.74rem;color:var(--orange);font-style:italic">📝 ${esc(i.notas)}</div>`:''}</div>
        <b style="font-size:.87rem">${money(i.subtotal)}</b></div>`).join('')}
      <div class="summary" style="margin-top:12px"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
      <div class="summary"><span>Envío</span><span>${o.envio?money(o.envio):'Gratis'}</span></div>
      <div class="summary total"><span>Total</span><span>${money(o.total)}</span></div>

      <h4 style="font-size:.78rem;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin:22px 0 10px">Cambiar estado</h4>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${flow.map(e => `<button class="btn xs ${o.estado===e.id?'':'ghost'}"
          data-action="set-order-state" data-id="${o.id}" data-estado="${e.id}">${e.icon} ${e.label}</button>`).join('')}
        <button class="btn xs ghost" style="color:#b91c1c;border-color:#fecaca"
          data-action="set-order-state" data-id="${o.id}" data-estado="cancelado">❌ Cancelar</button>
      </div>
      ${next?`<button class="btn green block" style="margin-top:14px"
        data-action="advance-order" data-id="${o.id}">➡️ Avanzar a: ${next.label}</button>`:''}

      <h4 style="font-size:.78rem;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin:22px 0 10px">Enviar mensaje al cliente</h4>
      ${o.mensajes && o.mensajes.length ? `<div class="msgs" style="margin-bottom:12px">
        ${o.mensajes.map(m => `<div class="msg">${esc(m.texto)}<small>${fmtDate(m.fecha)}</small></div>`).join('')}</div>` : ''}
      <div style="display:flex;gap:8px">
        <input id="msg-input" placeholder="Ej: Tu pedido va en camino, llega en 10 min"
          style="flex:1;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line);outline:none">
        <button class="btn" data-action="send-msg" data-id="${o.id}">Enviar</button>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn ghost" style="flex:1" data-action="print-order" data-id="${o.id}">🖨️ Imprimir ticket</button>
        <button class="btn dark" style="flex:1" data-action="close-modal">Cerrar</button>
      </div>
    </div>`);
  }

  /* ---------- Productos ---------- */
  function adminProducts() {
    return `
    <div class="admin-top">
      <div><h1>Productos</h1><div class="sub">${P.DB.products.length} producto(s) en el catálogo</div></div>
      <div class="spacer"></div>
      <button class="btn" data-action="product-new">＋ Nuevo producto</button>
    </div>
    <div class="panel"><div style="overflow-x:auto">
      <table class="table">
        <thead><tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th>
          <th>Opciones</th><th>Disponible</th><th style="text-align:right">Acciones</th></tr></thead>
        <tbody>
          ${P.DB.products.map(p => {
            const c = P.DB.categories.find(x => x.id === p.categoria);
            return `<tr>
              <td><div class="mini-emoji" style="background:linear-gradient(140deg,${p.c1},${p.c2})">${p.emoji}</div></td>
              <td><b>${esc(p.nombre)}</b>${p.destacado?' <span class="pill" style="padding:2px 8px;font-size:.65rem">★ Top</span>':''}
                <div style="font-size:.76rem;color:var(--muted);max-width:280px">${esc(p.descripcion)}</div></td>
              <td>${esc(c?c.nombre:'—')}</td>
              <td><b>${money(p.precio)}</b></td>
              <td style="font-size:.78rem;color:var(--muted)">
                ${p.permiteTamano?'📏 Tamaños<br>':''}${p.permiteExtras?'➕ Extras':''}</td>
              <td><label class="switch"><input type="checkbox" data-action="toggle-product" data-id="${p.id}"
                ${p.disponible?'checked':''}><span></span></label></td>
              <td style="text-align:right;white-space:nowrap">
                <button class="btn xs ghost" data-action="product-edit" data-id="${p.id}">✏️</button>
                <button class="btn xs ghost" style="color:#b91c1c;border-color:#fecaca"
                  data-action="product-del" data-id="${p.id}">🗑️</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div></div>`;
  }

  function openProductForm(id) {
    const p = id ? P.DB.products.find(x => x.id === id) : null;
    openModal(`
    <form id="product-form" data-id="${p?p.id:''}">
      <div class="modal-body" style="padding-top:26px">
        <h2 style="font-size:1.3rem;font-weight:900;margin-bottom:18px">${p?'✏️ Editar producto':'＋ Nuevo producto'}</h2>
        <div class="grid2">
          <div class="field"><label>Nombre *</label>
            <input name="nombre" required value="${p?esc(p.nombre):''}" placeholder="Pizza Margarita"></div>
          <div class="field"><label>Categoría *</label>
            <select name="categoria">${P.DB.categories.map(c =>
              `<option value="${c.id}" ${p&&p.categoria===c.id?'selected':''}>${c.emoji} ${esc(c.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Precio base *</label>
            <input name="precio" type="number" step="0.01" min="0" required value="${p?p.precio:''}" placeholder="9.90"></div>
          <div class="field"><label>Emoji</label>
            <input name="emoji" maxlength="4" value="${p?esc(p.emoji):'🍕'}"></div>
        </div>
        <div class="field"><label>Descripción</label>
          <textarea name="descripcion" rows="2">${p?esc(p.descripcion):''}</textarea></div>
        <div class="grid2">
          <div class="field"><label>Color 1</label>
            <input name="c1" type="color" value="${p?p.c1:'#ffd6a5'}" style="height:46px;padding:4px"></div>
          <div class="field"><label>Color 2</label>
            <input name="c2" type="color" value="${p?p.c2:'#ff9f68'}" style="height:46px;padding:4px"></div>
        </div>
        <div class="field"><label>Opciones</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.87rem;font-weight:600">
            <label style="display:flex;gap:9px;align-items:center">
              <input type="checkbox" name="disponible" ${!p||p.disponible?'checked':''}> Disponible</label>
            <label style="display:flex;gap:9px;align-items:center">
              <input type="checkbox" name="destacado" ${p&&p.destacado?'checked':''}> Destacado ★</label>
            <label style="display:flex;gap:9px;align-items:center">
              <input type="checkbox" name="permiteTamano" ${p&&p.permiteTamano?'checked':''}> Permite tamaños</label>
            <label style="display:flex;gap:9px;align-items:center">
              <input type="checkbox" name="permiteExtras" ${!p||p.permiteExtras?'checked':''}> Permite extras</label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-action="close-modal">Cancelar</button>
          <button type="submit" class="btn">Guardar producto</button>
        </div>
      </div>
    </form>`);
  }

  /* ---------- Categorías ---------- */
  function adminCategories() {
    return `
    <div class="admin-top">
      <div><h1>Categorías</h1><div class="sub">Organiza tu menú por secciones</div></div>
      <div class="spacer"></div>
      <button class="btn" data-action="cat-new">＋ Nueva categoría</button>
    </div>
    <div class="panel"><div class="panel-body">
      ${P.DB.categories.map(c => {
        const n = P.DB.products.filter(p => p.categoria === c.id).length;
        return `<div style="display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid #f4f5f8">
          <div class="mini-emoji" style="background:#f1f5f9;font-size:1.3rem">${c.emoji}</div>
          <div style="flex:1"><b>${esc(c.nombre)}</b>
            <div style="font-size:.78rem;color:var(--muted)">${n} producto(s)</div></div>
          <button class="btn xs ghost" data-action="cat-edit" data-id="${c.id}">✏️ Editar</button>
          <button class="btn xs ghost" style="color:#b91c1c;border-color:#fecaca"
            data-action="cat-del" data-id="${c.id}">🗑️</button></div>`;
      }).join('') || '<p style="color:var(--muted);text-align:center;padding:30px">No hay categorías</p>'}
    </div></div>`;
  }
  function openCatForm(id) {
    const c = id ? P.DB.categories.find(x => x.id === id) : null;
    openModal(`
    <form id="cat-form" data-id="${c?c.id:''}">
      <div class="modal-body" style="padding-top:26px">
        <h2 style="font-size:1.3rem;font-weight:900;margin-bottom:18px">${c?'✏️ Editar categoría':'＋ Nueva categoría'}</h2>
        <div class="grid2">
          <div class="field"><label>Nombre *</label>
            <input name="nombre" required value="${c?esc(c.nombre):''}"></div>
          <div class="field"><label>Emoji</label>
            <input name="emoji" maxlength="4" value="${c?esc(c.emoji):'🍕'}"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-action="close-modal">Cancelar</button>
          <button type="submit" class="btn">Guardar</button>
        </div>
      </div>
    </form>`);
  }

  /* ---------- Ajustes ---------- */
  function adminSettings() {
    const s = P.DB.settings;
    return `
    <div class="admin-top"><div><h1>Ajustes</h1><div class="sub">Configuración general del negocio</div></div></div>
    <form id="settings-form">
      <div class="panel">
        <div class="panel-head"><h3>🏪 Información del negocio</h3></div>
        <div class="panel-body"><div class="grid2">
          <div class="field"><label>Nombre</label><input name="nombre" value="${esc(s.nombre)}"></div>
          <div class="field"><label>Eslogan</label><input name="slogan" value="${esc(s.slogan)}"></div>
          <div class="field"><label>Teléfono</label><input name="telefono" value="${esc(s.telefono)}"></div>
          <div class="field"><label>Dirección</label><input name="direccion" value="${esc(s.direccion)}"></div>
          <div class="field"><label>Horario</label><input name="horario" value="${esc(s.horario)}"></div>
          <div class="field"><label>Moneda</label><input name="moneda" maxlength="4" value="${esc(s.moneda)}"></div>
        </div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>🛵 Delivery y pedidos</h3></div>
        <div class="panel-body">
          <div class="grid2">
            <div class="field"><label>Costo de envío</label>
              <input name="deliveryFee" type="number" step="0.01" min="0" value="${s.deliveryFee}"></div>
            <div class="field"><label>Pedido mínimo</label>
              <input name="minOrder" type="number" step="0.01" min="0" value="${s.minOrder}"></div>
            <div class="field"><label>Tiempo estimado</label>
              <input name="tiempoEntrega" value="${esc(s.tiempoEntrega)}"></div>
            <div class="field"><label>Métodos de pago (separados por coma)</label>
              <input name="metodosPago" value="${esc(s.metodosPago.join(', '))}"></div>
          </div>
          <label style="display:flex;align-items:center;gap:11px;font-weight:700;font-size:.9rem;cursor:pointer">
            <span class="switch"><input type="checkbox" name="abierto" ${s.abierto?'checked':''}><span></span></span>
            Tienda abierta y recibiendo pedidos</label>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>📏 Tamaños de pizza</h3><div class="spacer"></div>
          <button type="button" class="btn sm ghost" data-action="add-size">＋ Añadir</button></div>
        <div class="panel-body" id="sizes-box">
          ${s.sizes.map(x => `<div class="row-item">
            <input value="${esc(x.nombre)}" data-size-name placeholder="Nombre (Mediana)">
            <input type="number" step="0.05" min="0.1" value="${x.factor}" data-size-factor style="max-width:120px">
            <button type="button" class="del" data-action="del-size" data-id="${x.id}">✕</button>
          </div>`).join('')}
          <p style="font-size:.77rem;color:var(--muted);margin-top:8px">El segundo campo es el multiplicador del precio base.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>➕ Extras disponibles</h3><div class="spacer"></div>
          <button type="button" class="btn sm ghost" data-action="add-extra">＋ Añadir</button></div>
        <div class="panel-body" id="extras-box">
          ${s.extras.map(x => `<div class="row-item">
            <input value="${esc(x.nombre)}" data-extra-name placeholder="Nombre del extra">
            <input type="number" step="0.01" min="0" value="${x.precio}" data-extra-price style="max-width:120px">
            <button type="button" class="del" data-action="del-extra" data-id="${x.id}">✕</button>
          </div>`).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>🔐 Seguridad</h3></div>
        <div class="panel-body">
          <div class="grid2">
            <div class="field"><label>Nueva contraseña (déjalo vacío para no cambiar)</label>
              <input name="newPin" type="password" placeholder="Mínimo 6 caracteres, letras + números + símbolos"
                style="letter-spacing:1px"></div>
            <div class="field"><label>Confirmar contraseña</label>
              <input name="confirmPin" type="password" placeholder="Repite la contraseña"
                style="letter-spacing:1px"></div>
          </div>
          <div class="hint" style="margin-top:0">
            ⚠️ La contraseña se guarda <b>hasheada (SHA-256)</b>, nunca en texto plano.
            Usa algo fuerte (ej: <code>Pizza$2025!Fuerte</code>) y no lo compartas.
          </div>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:30px">
        <button type="submit" class="btn">💾 Guardar cambios</button>
        <button type="button" class="btn ghost" data-action="reset-data"
          style="color:#b91c1c;border-color:#fecaca">⚠️ Restablecer datos de demo</button>
      </div>
    </form>`;
  }

  /* ---------- Ticket imprimible ---------- */
  function printTicket(id) {
    const o = P.DB.orders.find(x => x.id === id); if (!o) return;
    const s = P.DB.settings;
    const w = window.open('', '_blank', 'width=400,height=640');
    w.document.write(`<html><head><meta charset="utf-8"><title>${o.codigo}</title>
      <style>body{font-family:ui-monospace,monospace;padding:16px;font-size:13px;color:#000}
      h2{text-align:center;margin:0 0 4px;font-size:17px}hr{border:none;border-top:1px dashed #000;margin:9px 0}
      .r{display:flex;justify-content:space-between;gap:10px}.b{font-weight:bold}
      .c{text-align:center}.sm{font-size:11px;color:#444}</style></head><body>
      <h2>${esc(s.nombre)}</h2>
      <div class="c sm">${esc(s.slogan)}<br>${esc(s.telefono)}<br>${esc(s.direccion)}</div>
      <hr>
      <div class="r"><span class="b">${esc(o.codigo)}</span><span>${fmtDate(o.creado)}</span></div>
      <div class="r"><span>${o.tipo==='delivery'?'🛵 DOMICILIO':'🏪 RECOGER'}</span><span>${esc(o.pago)}</span></div>
      <hr>
      <div class="b">CLIENTE</div>
      <div>${esc(o.cliente.nombre)}</div>
      <div>Tel: ${esc(o.cliente.telefono)}</div>
      ${o.tipo==='delivery'?`<div>${esc(o.cliente.direccion)}</div>`:''}
      ${o.cliente.referencia?`<div class="sm">Ref: ${esc(o.cliente.referencia)}</div>`:''}
      <hr>
      ${o.items.map(i => `<div class="r"><span>${i.qty}x ${esc(i.nombre)}${i.sizeName?' ('+esc(i.sizeName)+')':''}</span>
        <span>${money(i.subtotal)}</span></div>
        ${i.extras.length?`<div class="sm" style="padding-left:12px">+ ${i.extras.map(esc).join(', ')}</div>`:''}
        ${i.notas?`<div class="sm" style="padding-left:12px">Nota: ${esc(i.notas)}</div>`:''}`).join('')}
      <hr>
      <div class="r"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
      <div class="r"><span>Envío</span><span>${o.envio?money(o.envio):'Gratis'}</span></div>
      <div class="r b" style="font-size:16px"><span>TOTAL</span><span>${money(o.total)}</span></div>
      ${o.notas?`<hr><div class="sm">Notas: ${esc(o.notas)}</div>`:''}
      <hr><div class="c sm">¡Gracias por tu compra! 🍕</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 350);
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action, id = el.dataset.id;

    switch (a) {
      case 'admin-tab': UI.tab = el.dataset.tab; renderAdmin(); break;
      case 'admin-view-store': window.open('../', '_blank'); break;
      case 'admin-logout':
        P.logoutAdmin(); toast('Sesión cerrada'); renderAdmin(); break;
      case 'order-filter': UI.orderFilter = el.dataset.f; renderAdmin(); break;
      case 'order-detail': openOrderDetail(id); break;
      case 'close-modal': closeModal(); break;
      case 'set-order-state': {
        const o = P.DB.orders.find(x => x.id === id); if (!o) break;
        if (o.estado === el.dataset.estado) { toast('Ya está en ese estado'); break; }
        o.estado = el.dataset.estado;
        o.historial = o.historial || [];
        if (!o.historial.some(h => h.estado === o.estado)) o.historial.push({ estado: o.estado, fecha: now() });
        P.save(); closeModal(); renderAdmin();
        toast(`Pedido ${o.codigo} → ${P.ESTADO_LABEL[o.estado]}`, 'ok'); break;
      }
      case 'advance-order': {
        const o = P.DB.orders.find(x => x.id === id); if (!o) break;
        const flow = P.ESTADOS.filter(x => !(o.tipo === 'pickup' && x.id === 'en_camino'));
        const i = flow.findIndex(x => x.id === o.estado);
        if (i >= 0 && i < flow.length - 1) {
          o.estado = flow[i + 1].id;
          o.historial = o.historial || [];
          o.historial.push({ estado: o.estado, fecha: now() });
          P.save(); closeModal(); renderAdmin();
          toast(`Pedido ${o.codigo} → ${P.ESTADO_LABEL[o.estado]}`, 'ok');
        }
        break;
      }
      case 'send-msg': {
        const o = P.DB.orders.find(x => x.id === id);
        const txt = (document.getElementById('msg-input')?.value || '').trim();
        if (!o || !txt) { toast('Escribe un mensaje', 'err'); break; }
        o.mensajes = o.mensajes || [];
        o.mensajes.push({ texto: txt, fecha: now() });
        P.save(); openOrderDetail(id);
        toast('Mensaje enviado al cliente', 'ok'); break;
      }
      case 'print-order': printTicket(id); break;
      case 'toggle-open':
        P.DB.settings.abierto = !P.DB.settings.abierto;
        P.save(); renderAdmin();
        toast(P.DB.settings.abierto ? 'Tienda abierta ✅' : 'Tienda cerrada 🔒');
        break;
      case 'product-new': openProductForm(null); break;
      case 'product-edit': openProductForm(id); break;
      case 'product-del': {
        const p = P.DB.products.find(x => x.id === id); if (!p) break;
        if (confirm(`¿Eliminar "${p.nombre}" del catálogo?`)) {
          P.DB.products = P.DB.products.filter(x => x.id !== id);
          P.save(); renderAdmin(); toast('Producto eliminado');
        } break;
      }
      case 'cat-new': openCatForm(null); break;
      case 'cat-edit': openCatForm(id); break;
      case 'cat-del': {
        const c = P.DB.categories.find(x => x.id === id); if (!c) break;
        const n = P.DB.products.filter(p => p.categoria === id).length;
        if (n) { toast(`No puedes borrar: tiene ${n} producto(s)`, 'err'); break; }
        if (confirm(`¿Eliminar la categoría "${c.nombre}"?`)) {
          P.DB.categories = P.DB.categories.filter(x => x.id !== id);
          P.save(); renderAdmin(); toast('Categoría eliminada');
        } break;
      }
      case 'add-size': {
        const box = document.getElementById('sizes-box');
        const div = document.createElement('div');
        div.className = 'row-item';
        div.innerHTML = `<input data-size-name placeholder="Nombre (Mediana)">
          <input type="number" step="0.05" min="0.1" value="1" data-size-factor style="max-width:120px">
          <button type="button" class="del" data-action="del-size-row">✕</button>`;
        box.insertBefore(div, box.lastElementChild); break;
      }
      case 'del-size-row': el.parentElement.remove(); break;
      case 'del-size':
        P.DB.settings.sizes = P.DB.settings.sizes.filter(x => x.id !== el.dataset.id);
        P.save(); renderAdmin(); toast('Tamaño eliminado'); break;
      case 'add-extra': {
        const box = document.getElementById('extras-box');
        const div = document.createElement('div');
        div.className = 'row-item';
        div.innerHTML = `<input data-extra-name placeholder="Nombre del extra">
          <input type="number" step="0.01" min="0" value="1" data-extra-price style="max-width:120px">
          <button type="button" class="del" data-action="del-extra-row">✕</button>`;
        box.appendChild(div); break;
      }
      case 'del-extra-row': el.parentElement.remove(); break;
      case 'del-extra':
        P.DB.settings.extras = P.DB.settings.extras.filter(x => x.id !== el.dataset.id);
        P.save(); renderAdmin(); toast('Extra eliminado'); break;
      case 'reset-data':
        if (confirm('⚠️ Esto borrará TODOS los pedidos, productos, ajustes y contraseña.\n¿Continuar?')) {
          Object.values({ db: P.DB_KEY, cart: P.CART_KEY, my: P.MY_KEY, hash: P.HASH_KEY })
            .forEach(k => localStorage.removeItem(k));
          sessionStorage.removeItem(P.SESSION_KEY);
          P.init();
          renderAdmin();
          toast('Datos restablecidos', 'ok');
        } break;
    }
  });

  /* ---------- Cambios de inputs ---------- */
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.action === 'toggle-product') {
      const p = P.DB.products.find(x => x.id === t.dataset.id);
      if (p) {
        p.disponible = t.checked; P.save();
        toast(`${p.nombre} ${p.disponible ? 'disponible ✅' : 'marcado como agotado'}`);
      }
    }
  });

  /* ---------- Submit de formularios ---------- */
  document.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;

    /* Login */
    if (f.id === 'login-form') { await doLogin(f); return; }

    /* Producto */
    if (f.id === 'product-form') {
      const fd = new FormData(f);
      const pid = f.dataset.id;
      const data = {
        nombre: (fd.get('nombre') || '').trim(),
        descripcion: (fd.get('descripcion') || '').trim(),
        categoria: fd.get('categoria'),
        precio: parseFloat(fd.get('precio')) || 0,
        emoji: (fd.get('emoji') || '🍕').trim() || '🍕',
        c1: fd.get('c1'), c2: fd.get('c2'),
        disponible: fd.get('disponible') === 'on',
        destacado: fd.get('destacado') === 'on',
        permiteTamano: fd.get('permiteTamano') === 'on',
        permiteExtras: fd.get('permiteExtras') === 'on'
      };
      if (!data.nombre || data.precio <= 0) { toast('Completa nombre y precio', 'err'); return; }
      if (pid) Object.assign(P.DB.products.find(x => x.id === pid), data);
      else P.DB.products.unshift(Object.assign({ id: uid() }, data));
      P.save(); closeModal(); renderAdmin();
      toast(pid ? 'Producto actualizado ✅' : 'Producto creado ✅', 'ok');
      return;
    }

    /* Categoría */
    if (f.id === 'cat-form') {
      const fd = new FormData(f);
      const cid = f.dataset.id;
      const nombre = (fd.get('nombre') || '').trim();
      const emoji = (fd.get('emoji') || '🍕').trim() || '🍕';
      if (!nombre) { toast('Escribe un nombre', 'err'); return; }
      if (cid) { const c = P.DB.categories.find(x => x.id === cid); c.nombre = nombre; c.emoji = emoji; }
      else P.DB.categories.push({ id: 'c' + uid(), nombre, emoji });
      P.save(); closeModal(); renderAdmin();
      toast('Categoría guardada ✅', 'ok');
      return;
    }

    /* Ajustes */
    if (f.id === 'settings-form') {
      const fd = new FormData(f);
      const s = P.DB.settings;
      s.nombre = (fd.get('nombre') || '').trim() || s.nombre;
      s.slogan = (fd.get('slogan') || '').trim();
      s.telefono = (fd.get('telefono') || '').trim();
      s.direccion = (fd.get('direccion') || '').trim();
      s.horario = (fd.get('horario') || '').trim();
      s.moneda = (fd.get('moneda') || '$').trim() || '$';
      s.deliveryFee = parseFloat(fd.get('deliveryFee')) || 0;
      s.minOrder = parseFloat(fd.get('minOrder')) || 0;
      s.tiempoEntrega = (fd.get('tiempoEntrega') || '').trim();
      s.metodosPago = String(fd.get('metodosPago') || '').split(',').map(x => x.trim()).filter(Boolean);
      if (!s.metodosPago.length) s.metodosPago = ['Efectivo'];
      s.abierto = fd.get('abierto') === 'on';

      /* Cambio de contraseña */
      const np = (fd.get('newPin') || '').trim();
      const cp = (fd.get('confirmPin') || '').trim();
      if (np || cp) {
        if (np.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'err'); return; }
        if (np !== cp)     { toast('Las contraseñas no coinciden', 'err'); return; }
        const hash = await P.sha256(np);
        P.setPinHash(hash);
        toast('🔐 Contraseña actualizada', 'ok');
      }

      /* Tamaños */
      const sizes = [];
      document.querySelectorAll('#sizes-box .row-item').forEach((row, i) => {
        const n = row.querySelector('[data-size-name]')?.value.trim();
        const fct = parseFloat(row.querySelector('[data-size-factor]')?.value) || 1;
        if (n) sizes.push({ id: 's' + (i + 1) + uid().slice(0, 3), nombre: n, factor: fct });
      });
      if (sizes.length) s.sizes = sizes;

      /* Extras */
      const extras = [];
      document.querySelectorAll('#extras-box .row-item').forEach((row, i) => {
        const n = row.querySelector('[data-extra-name]')?.value.trim();
        const pr = parseFloat(row.querySelector('[data-extra-price]')?.value) || 0;
        if (n) extras.push({ id: 'e' + (i + 1) + uid().slice(0, 3), nombre: n, precio: pr });
      });
      s.extras = extras;

      P.save(); renderAdmin();
      toast('Ajustes guardados ✅', 'ok');
      return;
    }
  });

  /* ---------- Escape ---------- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('modal-root').innerHTML) closeModal();
  });

  /* ---------- Sincronización multi-pestaña ---------- */
  window.addEventListener('storage', ev => {
    if (ev.key === P.DB_KEY) {
      try {
        const prevCount = P.DB.orders.length;
        P.DB = JSON.parse(ev.newValue) || P.DB;
        if (P.DB.orders.length > prevCount && P.isAdmin()) {
          toast('🔔 ¡Nuevo pedido recibido!', 'ok');
        }
        if (P.isAdmin()) renderAdmin();
      } catch (err) {}
    }
  });

  /* ---------- Init ---------- */
  P.init();
  renderAdmin();
})();