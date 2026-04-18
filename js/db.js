// ===== DATABASE (localStorage) =====
const DB = {
  get(k){try{return JSON.parse(localStorage.getItem('al_'+k)||'null');}catch{return null;}},
  set(k,v){localStorage.setItem('al_'+k,JSON.stringify(v));},
  users(){return this.get('users')||[];},
  products(){return this.get('products')||[];},
  bids(){return this.get('bids')||[];},
  orders(){return this.get('orders')||[];},
  addUser(u){const a=this.users();a.push(u);this.set('users',a);},
  addProduct(p){const a=this.products();a.push(p);this.set('products',a);},
  addBid(b){const a=this.bids();a.push(b);this.set('bids',a);},
  addOrder(o){const a=this.orders();a.push(o);this.set('orders',a);},
  updateOrder(id,fields){const a=this.orders();const i=a.findIndex(o=>o.id===id);if(i>-1){Object.assign(a[i],fields);this.set('orders',a);}},
  updateProduct(id,fields){const a=this.products();const i=a.findIndex(p=>p.id===id);if(i>-1){Object.assign(a[i],fields);this.set('products',a);}},
  currentUser(){return this.get('current_user');},
  setCurrentUser(u){this.set('current_user',u);},
  clearCurrentUser(){localStorage.removeItem('al_current_user');}
};

// ===== HELPERS =====
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function fmtMoney(n){return '₱'+Number(n).toLocaleString();}
function timeAgo(ts){const d=(Date.now()-ts)/1000;if(d<60)return 'Just now';if(d<3600)return Math.floor(d/60)+'m ago';if(d<86400)return Math.floor(d/3600)+'h ago';return new Date(ts).toLocaleDateString();}
function fmtDate(ts){return new Date(ts).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});}
function getTopBid(pid){return DB.bids().filter(b=>b.product_id===pid).sort((a,b)=>b.amount-a.amount)[0]||null;}
function getBidCount(pid){return DB.bids().filter(b=>b.product_id===pid).length;}

// ===== AUTH GUARD =====
function requireAuth(role){
  const u=DB.currentUser();
  if(!u){window.location.href='auth.html';return null;}
  if(role&&u.role!==role){window.location.href=u.role==='farmer'?'farmer-dashboard.html':'buyer-marketplace.html';return null;}
  return u;
}
function logout(){DB.clearCurrentUser();window.location.href='index.html';}

// ===== TOAST =====
function toast(msg,err=false){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.className='toast'+(err?' toast-err':'');
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>t.classList.remove('show'),3200);
}

// ===== TOPBAR =====
function renderTopbar(activePage){
  const u=DB.currentUser();if(!u)return;
  const isFarmer=u.role==='farmer';
  const home=isFarmer?'farmer-dashboard.html':'buyer-marketplace.html';
  document.body.insertAdjacentHTML('afterbegin',`
    <div class="topbar">
      <a href="${home}" class="logo"><div class="logo-ico">🌾</div>Agri<span>Link</span></a>
      <div class="topbar-right">
        <span class="user-chip">${u.name.split(' ')[0]} · ${isFarmer?'🌾 Farmer':'🛒 Buyer'}</span>
        <button class="btn btn-ghost btn-sm" onclick="logout()">Log out</button>
      </div>
    </div>`);
}

// ===== SIDEBAR =====
function renderSidebar(active){
  const u=DB.currentUser();if(!u)return;
  const isFarmer=u.role==='farmer';
  const links=isFarmer?[
    {href:'farmer-dashboard.html',icon:'🏠',label:'Overview',key:'dashboard'},
    {href:'farmer-listings.html',icon:'📦',label:'My Listings',key:'listings'},
    {href:'farmer-sell.html',icon:'➕',label:'Sell Harvest',key:'sell'},
    {href:'farmer-orders.html',icon:'✅',label:'Orders',key:'orders'},
  ]:[
    {href:'buyer-marketplace.html',icon:'🏪',label:'Marketplace',key:'marketplace'},
    {href:'buyer-bids.html',icon:'⚡',label:'My Bids',key:'bids'},
    {href:'buyer-orders.html',icon:'✅',label:'My Orders',key:'orders'},
  ];
  return `<nav class="sidebar"><ul class="sidebar-nav">
    ${links.map(l=>`<li><a href="${l.href}" class="${active===l.key?'active':''}"><span class="sidebar-icon">${l.icon}</span>${l.label}</a></li>`).join('')}
    <hr class="sidebar-divider">
    <li><a href="#" onclick="logout()"><span class="sidebar-icon">🚪</span>Log out</a></li>
  </ul></nav>`;
}

// ===== MODAL =====
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.classList.contains('overlay'))e.target.classList.remove('open');});

// ===== GCASH MODAL =====
function openGCash(orderId){
  const order=DB.orders().find(o=>o.id===orderId);if(!order)return;
  const prod=DB.products().find(p=>p.id===order.product_id)||{};
  document.getElementById('modal-gcash').innerHTML=`
    <div class="modal-head"><h2>Pay with GCash</h2><button class="modal-close" onclick="closeModal('overlay-gcash')">✕</button></div>
    <div class="modal-body">
      <div class="gcash-box">
        <div class="gcash-logo">G<span style="color:#00d4ff">Cash</span></div>
        <div style="font-size:.8rem;opacity:.7;margin-bottom:.25rem;">Send payment to farmer</div>
        <div class="gcash-num">📱 ${order.farmer_name}</div>
        <div class="gcash-amount">${fmtMoney(order.amount)}</div>
        <div class="gcash-ref">Reference No: <strong>${order.gcash_ref}</strong></div>
        <div class="gcash-qr">[QR Code<br>${order.gcash_ref}]</div>
      </div>
      <div class="card card-sm mb1">
        <div class="flex fac fjb mb1"><span class="text-muted">Product</span><span class="bold">${prod.name||'Harvest'}</span></div>
        <div class="flex fac fjb mb1"><span class="text-muted">Qty</span><span>${prod.quantity} ${prod.unit}</span></div>
        <div class="flex fac fjb"><span class="text-muted">Total</span><span class="bold" style="color:var(--g800)">${fmtMoney(order.amount)}</span></div>
      </div>
      <div style="background:var(--a50);border:1px solid var(--a100);border-radius:12px;padding:.9rem;font-size:.83rem;color:var(--a700);margin-bottom:1rem;">
        🔒 <strong>Escrow:</strong> Funds are held securely and released to the farmer only after you confirm delivery.
      </div>
      ${order.gcash_status==='pending'
        ?`<button class="btn btn-amber btn-block btn-lg" onclick="confirmGCashPayment('${orderId}')">✅ I've Sent the GCash Payment</button>`
        :`<div class="badge badge-green" style="font-size:.9rem;padding:.6rem 1.2rem;">✅ Payment Confirmed</div>`}
    </div>`;
  openModal('overlay-gcash');
}

function confirmGCashPayment(orderId){
  DB.updateOrder(orderId,{gcash_status:'paid',track_status:'in_transit'});
  closeModal('overlay-gcash');
  toast('Payment confirmed! Order is now in transit. 🎉');
  setTimeout(()=>location.reload(),800);
}

// ===== TRACKING MODAL =====
const TRACK_STEPS=[
  {key:'confirmed',label:'Order Confirmed'},
  {key:'preparing',label:'Preparing Harvest'},
  {key:'sorting',label:'Sorting & Packing'},
  {key:'in_transit',label:'In Transit'},
  {key:'delivered',label:'Delivered'},
];
const TRACK_ORDER={confirmed:0,preparing:1,sorting:2,in_transit:3,delivered:4};

function openTracking(orderId){
  const order=DB.orders().find(o=>o.id===orderId);if(!order)return;
  const prod=DB.products().find(p=>p.id===order.product_id)||{};
  const idx=TRACK_ORDER[order.track_status]??0;
  const u=DB.currentUser();
  document.getElementById('modal-track').innerHTML=`
    <div class="modal-head"><h2>Order Tracking</h2><button class="modal-close" onclick="closeModal('overlay-track')">✕</button></div>
    <div class="modal-body">
      <div class="card card-sm mb1 flex fac gap1">
        <div class="thumb-sm">${prod.photo?`<img src="${prod.photo}">`:(prod.emoji||'📦')}</div>
        <div><div class="bold">${prod.name||'Harvest'}</div><div class="text-muted">${fmtMoney(order.amount)} · Ref: ${order.gcash_ref}</div></div>
      </div>
      <div class="track-steps">
        ${TRACK_STEPS.map((s,i)=>`<div class="track-step ${i<idx?'done':i===idx?'current':''}">
          <div class="track-label">${s.label}</div>
          ${i<=idx?`<div class="track-time">${i===0?fmtDate(order.created_at):'Completed'}</div>`:''}
        </div>`).join('')}
      </div>
      ${order.track_status==='in_transit'&&u.role==='buyer'
        ?`<div class="mt2"><button class="btn btn-green btn-block" onclick="confirmDelivery('${orderId}')">✅ Confirm Delivery Received</button></div>`:''}
    </div>`;
  openModal('overlay-track');
}

function confirmDelivery(orderId){
  DB.updateOrder(orderId,{gcash_status:'confirmed',track_status:'delivered'});
  closeModal('overlay-track');
  toast('Delivery confirmed! Funds released to farmer. 🎉');
  setTimeout(()=>location.reload(),800);
}

// ===== DEMO SEED =====
function seedDemo(){
  if(DB.products().length>0)return;
  const fid='demo-farmer-1',bid='demo-buyer-1';
  if(!DB.users().find(u=>u.id===fid))DB.addUser({id:fid,name:'Carlos Reyes',phone:'09171234567',location:'Nueva Ecija',role:'farmer',password:'demo123',gcash:'09171234567',created_at:Date.now()-86400000});
  if(!DB.users().find(u=>u.id===bid))DB.addUser({id:bid,name:'Rachel Cruz',phone:'09281234567',location:'Manila',role:'buyer',password:'demo123',gcash:'09281234567',created_at:Date.now()-86400000});
  [{id:'dp1',name:'Jasmine Rice',category:'rice',quantity:100,unit:'sacks',starting_price:38000,location:'Nueva Ecija',emoji:'🌾'},
   {id:'dp2',name:'Indian Mangoes',category:'fruit',quantity:50,unit:'kg',starting_price:3500,location:'San Miguel, Bulacan',emoji:'🥭'},
   {id:'dp3',name:'Pechay (Bok Choy)',category:'vegetable',quantity:30,unit:'kg',starting_price:1200,location:'Bay, Laguna',emoji:'🥬'},
   {id:'dp4',name:'Carrots',category:'vegetable',quantity:35,unit:'kg',starting_price:1700,location:'La Trinidad, Benguet',emoji:'🥕'},
   {id:'dp5',name:'Saba Banana',category:'fruit',quantity:200,unit:'pcs',starting_price:6000,location:'San Miguel, Bulacan',emoji:'🍌'},
  ].forEach(p=>DB.addProduct({...p,farmer_id:fid,farmer_name:'Carlos Reyes',photo:null,description:'Fresh harvest.',status:'active',created_at:Date.now()-Math.random()*50000}));
  DB.addBid({id:'db1',product_id:'dp1',buyer_id:bid,buyer_name:'Rachel Cruz',amount:40500,created_at:Date.now()-1800000});
  DB.addBid({id:'db2',product_id:'dp1',buyer_id:'b2',buyer_name:'Juan Santos',amount:39000,created_at:Date.now()-3600000});
  DB.addBid({id:'db3',product_id:'dp2',buyer_id:bid,buyer_name:'Rachel Cruz',amount:4100,created_at:Date.now()-900000});
  DB.addBid({id:'db4',product_id:'dp3',buyer_id:'b3',buyer_name:'Mary Lim',amount:1350,created_at:Date.now()-7200000});
}
