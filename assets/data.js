/* ============================================================
   CAPA DE DATOS Y UTILIDADES COMPARTIDAS
   Este archivo lo cargan TANTO index.html COMO admin/index.html
   Los datos viven en localStorage (mismo origen → se comparten).
============================================================ */
(function () {
  'use strict';

  const DB_KEY      = 'pizzeria_db_v2';
  const CART_KEY    = 'pizzeria_cart_v2';
  const MY_KEY      = 'pizzeria_mis_pedidos_v2';
  const SESSION_KEY = 'pizzeria_admin_session';
  const HASH_KEY    = 'pizzeria_admin_hash';

  /* ---------- Hash del PIN por defecto: sha256("1234") ---------- */
  const DEFAULT_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

  /* ---------- Datos semilla ---------- */
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

  function loadDB() {
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

  /* ---------- Utilidades ---------- */
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const uid    = () => Math.random().toString(36).slice(2, 10);
  const now    = () => Date.now();
  const fmtDate = t => new Date(t).toLocaleString('es-ES',
    { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  const fmtTime = t => new Date(t).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
  const isToday = t => { const d = new Date(t), n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); };

  function money(n) {
    const v = Math.round((Number(n) || 0) * 100) / 100;
    return (Pizzeria.DB && Pizzeria.DB.settings.moneda || '$') + v.toFixed(2);
  }

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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

  /* ---------- API pública ---------- */
  const Pizzeria = {
    DB: null,
    DB_KEY, CART_KEY, MY_KEY, SESSION_KEY, HASH_KEY, DEFAULT_HASH,
    ESTADOS, ESTADO_LABEL,

    init() {
      this.DB = loadDB();
      this.save();
      if (!localStorage.getItem(HASH_KEY)) {
        localStorage.setItem(HASH_KEY, DEFAULT_HASH);
      }
    },
    save() { localStorage.setItem(DB_KEY, JSON.stringify(this.DB)); },

    /* — PIN — */
    getPinHash() { return localStorage.getItem(HASH_KEY) || DEFAULT_HASH; },
    setPinHash(h) { localStorage.setItem(HASH_KEY, h); },
    async verifyPin(pin) { return (await sha256(pin)) === this.getPinHash(); },

    /* — Sesión admin — */
    isAdmin()      { return sessionStorage.getItem(SESSION_KEY) === '1'; },
    loginAdmin()   { sessionStorage.setItem(SESSION_KEY, '1'); },
    logoutAdmin()  { sessionStorage.removeItem(SESSION_KEY); },

    /* — Carrito — */
    getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { return []; } },
    setCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); },

    /* — Mis pedidos (cliente) — */
    getMyOrders() { try { return JSON.parse(localStorage.getItem(MY_KEY) || '[]'); } catch (e) { return []; } },
    addMyOrder(code) {
      const m = this.getMyOrders(); m.unshift(code);
      localStorage.setItem(MY_KEY, JSON.stringify(m.slice(0, 25)));
    },

    /* — Utilidades — */
    esc, uid, now, fmtDate, fmtTime, isToday, money, sha256
  };

  window.Pizzeria = Pizzeria;
})();