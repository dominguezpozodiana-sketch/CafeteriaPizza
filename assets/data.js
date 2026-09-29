/* ============================================================
   CAPA DE DATOS (CLIENTE) — solo lectura de catálogo + crear/seguir pedidos
============================================================ */
(function () {
  'use strict';

  /* ============================================================
     👇 CONFIGURACIÓN (misma URL y anon key que en admin/) 👇
  ============================================================ */
  const SUPABASE_URL      = 'https://bmerhduoeeddypaebaik.supabase.co';        // ej: https://xxxxx.supabase.co (SIN /rest/v1/ al final)
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZXJoZHVvZWVkZHlwYWViYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5Mjc1NTEsImV4cCI6MjEwNTUwMzU1MX0.Ybh9vZ4B9xnpdX93a3WCyf-D7NP0FQMWSN8huYHIv_8';               // la clave larga que empieza con eyJ...
  /* ============================================================ */

  const SUPABASE_ENABLED = !SUPABASE_URL.includes('TU_URL_') && !SUPABASE_ANON_KEY.includes('TU_ANON_');
  let supabase = null;
  let realtimeChannel = null;
  const CATALOG_KEY = 'pizzeria_catalog_v1';

  /* ---------- CONSTANTES ---------- */
  const DB_KEY      = 'pizzeria_db_v2';
  const CART_KEY    = 'pizzeria_cart_v2';
  const MY_KEY      = 'pizzeria_mis_pedidos_v2';

  /* ---------- DATOS SEMILLA ---------- */
  function seedData() {
    const P = (id, nombre, descripcion, categoria, precio, emoji, c1, c2, opts) => Object.assign({
      id, nombre, descripcion, categoria, precio, emoji, c1, c2,
      disponible: true, destacado: false,
      permiteTamano: categoria === 'pizzas', permiteExtras: true
    }, opts || {});

    return {
      settings: {
        nombre: 'Bella Napoli',
        slogan: 'Pizza artesanal al horno de leña',
        telefono: '+1 555 123 4567',
        direccion: 'Av. Principal 123, Ciudad',
        abierto: true,
        horario: 'Lun a Dom · 11:00 – 23:00',
        deliveryFee: 2.5,
        minOrder: 10,
        tiempoEntrega: '30-45 min',
        moneda: '$',
        metodosPago: ['Efectivo', 'Tarjeta al recibir', 'Transferencia bancaria'],
        sizes: [
          { id: 's1', nombre: 'Personal', factor: 0.75 },
          { id: 's2', nombre: 'Mediana',  factor: 1 },
          { id: 's3', nombre: 'Familiar', factor: 1.35 }
        ],
        extras: [
          { id: 'e1', nombre: 'Extra queso',            precio: 1.5 },
          { id: 'e2', nombre: 'Pepperoni extra',        precio: 2.0 },
          { id: 'e3', nombre: 'Champiñones',            precio: 1.2 },
          { id: 'e4', nombre: 'Borde relleno de queso', precio: 2.5 },
          { id: 'e5', nombre: 'Jalapeños',              precio: 0.8 }
        ]
      },
      categories: [
        { id: 'pizzas',   nombre: 'Pizzas',   emoji: '🍕' },
        { id: 'entradas', nombre: 'Entradas', emoji: '🍟' },
        { id: 'bebidas',  nombre: 'Bebidas',  emoji: '🥤' },
        { id: 'postres',  nombre: 'Postres',  emoji: '🍰' }
      ],
      products: [
        P('p1','Margarita','Salsa de tomate, mozzarella fresca y albahaca','pizzas',8.5,'🍕','#ffd6a5','#ff9f68',{destacado:true}),
        P('p2','Pepperoni','Doble pepperoni y mozzarella fundido','pizzas',10,'🍕','#ffb4a2','#e63946',{destacado:true}),
        P('p3','Cuatro Quesos','Mozzarella, parmesano, azul y cheddar','pizzas',11.5,'🧀','#ffe8a3','#f4a261'),
        P('p4','Hawaiana','Jamón, piña y mozzarella','pizzas',10.5,'🍍','#fff3b0','#f9c74f'),
        P('p5','Vegetariana','Pimiento, cebolla, champiñón, aceituna y tomate','pizzas',9.9,'🥬','#d8f3dc','#52b788'),
        P('p6','BBQ Pollo','Pollo a la BBQ, cebolla morada y maíz','pizzas',11.9,'🍗','#ffd6a5','#bc6c25',{destacado:true}),
        P('p7','Suprema','Pepperoni, salchicha, pimiento, cebolla y champiñón','pizzas',12.5,'🔥','#ffc9c9','#d62828'),
        P('e1','Pan de Ajo','Pan horneado con mantequilla de ajo y queso','entradas',4,'🥖','#fff3b0','#e9c46a',{permiteTamano:false}),
        P('e2','Alitas BBQ (8 uds)','Alitas glaseadas con salsa BBQ','entradas',7.5,'🍗','#ffd6a5','#e76f51',{permiteTamano:false}),
        P('e3','Papas Fritas','Porción grande con salsa de la casa','entradas',3.5,'🍟','#fff3b0','#f4a261',{permiteTamano:false}),
        P('e4','Ensalada César','Lechuga, crutones, parmesano y aderezo césar','entradas',5.5,'🥗','#d8f3dc','#2a9d8f',{permiteTamano:false}),
        P('b1','Coca-Cola 1.5L','Bien fría, para compartir','bebidas',3,'🥤','#ffc9c9','#e63946',{permiteTamano:false,permiteExtras:false}),
        P('b2','Agua Mineral 600ml','Con o sin gas','bebidas',1.5,'💧','#dbeafe','#60a5fa',{permiteTamano:false,permiteExtras:false}),
        P('b3','Jugo Natural','Naranja, piña o fresa','bebidas',3.5,'🧃','#ffe8a3','#f9c74f',{permiteTamano:false,permiteExtras:false}),
        P('d1','Tiramisú','Clásico italiano con café y mascarpone','postres',4.5,'🍰','#e7d4c0','#a47148',{permiteTamano:false,permiteExtras:false}),
        P('d2','Brownie con Helado','Brownie tibio con helado de vainilla','postres',5,'🍫','#e0c3a0','#7f5539',{permiteTamano:false,permiteExtras:false})
      ],
      orders: [],
      counter: 1000
    };
  }

  function loadLocalDB() {
    const base = seedData();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) {}
    const db = saved || base;
    db.settings   = Object.assign({}, base.settings, db.settings || {});
    db.categories = db.categories || base.categories;
    db.products   = db.products   || base.products;
    db.orders     = db.orders     || [];
    db.counter    = db.counter    || 1000;
    return db;
  }

  /* ---------- HELPERS ---------- */
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const now = () => Date.now();
  const fmtDate = t => new Date(t).toLocaleString('es-ES',
    { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  const fmtTime = t => new Date(t).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
  const isToday = t => { const d = new Date(t), n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); };

  function money(n) {
    const v = Math.round((Number(n) || 0) * 100) / 100;
    const sym = (window.Pizzeria && window.Pizzeria.DB && window.Pizzeria.DB.settings.moneda) || '$';
    return sym + v.toFixed(2);
  }

  const ESTADOS = [
    { id: 'pendiente', label: 'Pedido recibido',  desc: 'Recibimos tu pedido correctamente',     icon: '📝' },
    { id: 'confirmado', label: 'Confirmado',       desc: 'El restaurante confirmó tu pedido',     icon: '✅' },
    { id: 'preparando', label: 'En preparación',   desc: 'Estamos cocinando tu pedido',           icon: '👨‍🍳' },
    { id: 'listo',      label: 'Listo',            desc: 'Tu pedido está listo',                  icon: '🍕' },
    { id: 'en_camino',  label: 'En camino',        desc: 'El repartidor va hacia ti',             icon: '🛵' },
    { id: 'entregado',  label: 'Entregado',        desc: '¡Buen provecho! Gracias por tu compra', icon: '🎉' }
  ];
  const ESTADO_LABEL = {
    pendiente: 'Pendiente', confirmado: 'Confirmado', preparando: 'Preparando',
    listo: 'Listo', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado'
  };

  /* ---------- MAPEADORES ---------- */
  function rowToSettings(r, defaults) {
    if (!r) return defaults;
    return {
      nombre: r.nombre || defaults.nombre,
      slogan: r.slogan || '',
      telefono: r.telefono || '',
      direccion: r.direccion || '',
      abierto: r.abierto !== false,
      horario: r.horario || '',
      deliveryFee: Number(r.delivery_fee) || 0,
      minOrder: Number(r.min_order) || 0,
      tiempoEntrega: r.tiempo_entrega || '',
      moneda: r.moneda || '$',
      metodosPago: r.metodos_pago || ['Efectivo'],
      sizes: r.sizes || [],
      extras: r.extras || []
    };
  }
  function rowToProduct(r) {
    return {
      id: r.id, nombre: r.nombre, descripcion: r.descripcion || '',
      categoria: r.categoria, precio: Number(r.precio) || 0,
      emoji: r.emoji || '🍕', c1: r.c1 || '#ffd6a5', c2: r.c2 || '#ff9f68',
      disponible: r.disponible !== false,
      destacado: r.destacado === true,
      permiteTamano: r.permite_tamano !== false,
      permiteExtras: r.permite_extras !== false
    };
  }
  function orderToRow(o) {
    return {
      id: o.id, codigo: o.codigo,
      creado: new Date(o.creado).toISOString(),
      cliente: o.cliente, tipo: o.tipo, pago: o.pago || '',
      notas: o.notas || '', items: o.items,
      subtotal: Number(o.subtotal) || 0,
      envio: Number(o.envio) || 0,
      total: Number(o.total) || 0,
      estado: o.estado,
      historial: o.historial || [],
      mensajes: o.mensajes || []
    };
  }
  function rowToOrder(r) {
    return {
      id: r.id, codigo: r.codigo,
      creado: new Date(r.creado).getTime(),
      cliente: r.cliente || {}, tipo: r.tipo, pago: r.pago || '',
      notas: r.notas || '', items: r.items || [],
      subtotal: Number(r.subtotal) || 0,
      envio: Number(r.envio) || 0,
      total: Number(r.total) || 0,
      estado: r.estado || 'pendiente',
      historial: r.historial || [],
      mensajes: r.mensajes || []
    };
  }

  /* ---------- SUPABASE: INICIALIZACIÓN ---------- */
  function initSupabase() {
    if (!SUPABASE_ENABLED) return false;
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.warn('[Pizzeria] SDK de Supabase no cargado. Modo local.');
      return false;
    }
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      });
      return true;
    } catch (err) {
      console.error('[Pizzeria] Error inicializando Supabase:', err);
      return false;
    }
  }

  /* ---------- LECTURA DEL CATÁLOGO (público) ---------- */
  async function loadCatalog() {
    const [setRes, catRes, prodRes] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('categories').select('*').order('nombre'),
      supabase.from('products').select('*')
    ]);
    const err = setRes.error || catRes.error || prodRes.error;
    if (err) throw err;
    const defaults = seedData().settings;
    return {
      settings:   rowToSettings(setRes.data, defaults),
      categories: (catRes.data || []).map(c => ({ id: c.id, nombre: c.nombre, emoji: c.emoji || '🍕' })),
      products:   (prodRes.data || []).map(rowToProduct),
      counter:    setRes.data?.counter || 1000
    };
  }
  function cacheCatalog(db) {
    try { localStorage.setItem(CATALOG_KEY, JSON.stringify({
      settings: db.settings, categories: db.categories, products: db.products, counter: db.counter })); } catch (e) {}
  }
  function readCatalogCache() {
    try { return JSON.parse(localStorage.getItem(CATALOG_KEY) || 'null'); } catch (e) { return null; }
  }

  /* ---------- API PÚBLICA ---------- */
  const subscribers = [];

  const Pizzeria = {
    DB: null,
    SUPABASE_ENABLED: false,
    DB_KEY, CART_KEY, MY_KEY,
    ESTADOS, ESTADO_LABEL,

    async init() {
      this.DB = loadLocalDB();
      this.SUPABASE_ENABLED = initSupabase();

      if (!this.SUPABASE_ENABLED) {
        console.info('[Pizzeria] ⚠️ Modo LOCAL (sin sincronización entre dispositivos).');
        this._notify();
        return;
      }

      // En modo Supabase, DB.orders solo guarda los pedidos de ESTE cliente (se piden por código).
      this.DB.orders = [];
      try {
        Object.assign(this.DB, await loadCatalog());
        cacheCatalog(this.DB);
      } catch (err) {
        console.error('[Pizzeria] Error cargando catálogo:', err);
        const cached = readCatalogCache();   // sin conexión: último catálogo conocido
        if (cached) Object.assign(this.DB, cached);
      }

      try {
        realtimeChannel = supabase
          .channel('pizzeria-catalog')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },   () => this._refresh())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => this._refresh())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' },   () => this._refresh())
          .subscribe();
      } catch (err) {
        console.error('[Pizzeria] Error en realtime:', err);
      }
      this._notify();
    },

    async _refresh() {
      if (!this.SUPABASE_ENABLED) return;
      try {
        Object.assign(this.DB, await loadCatalog());
        cacheCatalog(this.DB);
        this._notify();
      } catch (err) { console.error('[Pizzeria] _refresh:', err); }
    },

    subscribe(cb) {
      subscribers.push(cb);
      return () => { const i = subscribers.indexOf(cb); if (i >= 0) subscribers.splice(i, 1); };
    },
    _notify() { subscribers.forEach(cb => { try { cb(); } catch (e) { console.error(e); } }); },

    /* Próximo número de pedido (función SQL next_order_counter(); si no existe, conteo local) */
    async _nextCounter() {
      if (this.SUPABASE_ENABLED && supabase) {
        try {
          const { data, error } = await supabase.rpc('next_order_counter');
          if (error) throw error;
          if (typeof data === 'number') { this.DB.counter = data; return { n: data, viaRpc: true }; }
        } catch (err) {
          console.warn('[Pizzeria] next_order_counter() no disponible, usando conteo local:', err.message || err);
        }
      }
      this.DB.counter = (this.DB.counter || 1000) + 1;
      return { n: this.DB.counter, viaRpc: false };
    },

    /* Crear pedido */
    async placeOrder(order) {
      const { n, viaRpc } = await this._nextCounter();
      order.codigo = 'PED-' + n;
      if (this.SUPABASE_ENABLED && supabase) {
        const { error } = await supabase.from('orders').insert(orderToRow(order));
        if (error) { console.error('[Pizzeria] placeOrder remoto:', error); throw error; }
        if (!viaRpc) { try { await supabase.from('settings').update({ counter: n }).eq('id', 1); } catch (e) {} }
        this.DB.orders.unshift(order);
      } else {
        this.DB.orders.unshift(order);
        localStorage.setItem(DB_KEY, JSON.stringify(this.DB));
      }
      this._notify();
      return order;
    },

    /* Consultar el estado de UN pedido por su código (no se descargan pedidos de otros clientes) */
    async trackOrder(codigo) {
      if (!this.SUPABASE_ENABLED || !supabase || !codigo) return;
      const code = String(codigo).toUpperCase();
      try {
        const { data, error } = await supabase.from('orders').select('*').eq('codigo', code).maybeSingle();
        if (error || !data) return;
        const o = rowToOrder(data);
        const i = this.DB.orders.findIndex(x => String(x.codigo).toUpperCase() === code);
        if (i >= 0) {
          if (JSON.stringify(this.DB.orders[i]) === JSON.stringify(o)) return;
          this.DB.orders[i] = o;
        } else this.DB.orders.unshift(o);
        this._notify();
      } catch (err) { console.error('[Pizzeria] trackOrder:', err); }
    },

    /* Carrito (local) */
    getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { return []; } },
    setCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); },

    /* Mis pedidos (local) */
    getMyOrders() { try { return JSON.parse(localStorage.getItem(MY_KEY) || '[]'); } catch (e) { return []; } },
    addMyOrder(code) {
      const m = this.getMyOrders(); m.unshift(code);
      localStorage.setItem(MY_KEY, JSON.stringify(m.slice(0, 25)));
    },

    esc, uid, now, fmtDate, fmtTime, isToday, money
  };

  window.Pizzeria = Pizzeria;
})();
