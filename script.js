// ============================================================
// RAZORPAY CONFIG
// ============================================================
const RAZORPAY_KEY_ID = 'rzp_live_TenawUFv0gJTDZ';
const SUPABASE_FUNCTIONS_URL = 'https://mrqvzmtdsohvzsnryogp.supabase.co/functions/v1';

// ============================================================
// SPARKCIRCUIT — MAIN SCRIPT
// ============================================================
const SUPABASE_URL = 'https://mrqvzmtdsohvzsnryogp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YLYkDHgLQvNzCL1UvqvxkQ_EX3oLE9z';

// ============================================================
// 🔴 TELEGRAM CONFIG
// ============================================================

const _t = 'ODYwMzkxMzA1NjpBQUZHMGp2a0dhVnlVbi1ha0haX3Y5Vi1GUXNjdVFMSjRmVQ==';
const _c = 'NTMyODE3Njk0MQ==';

const TELEGRAM_BOT_TOKEN = atob(_t);
const TELEGRAM_CHAT_ID = atob(_c);

// ============================================================
// 🚚 SHIPPING CONFIG
// ============================================================
const SHIPPING_CHARGE = 50;
const FREE_SHIPPING_MIN = 499;

let _supabase = null;
if (typeof supabase !== 'undefined') {
  _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('sc_cart')) || [];
let currentUserSession = null;

// ============================================================
// MOBILE MENU
// ============================================================
function toggleMenu() {
  const nav = document.getElementById('navMenu');
  if (nav) nav.classList.toggle('active');
}

document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', () => {
    const nav = document.getElementById('navMenu');
    if (nav) nav.classList.remove('active');
  });
});

// ============================================================
// SMOOTH SCROLL
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const id = this.getAttribute('href');
    if (id === '#') return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      const headerH = document.querySelector('.header')?.offsetHeight || 0;
      const top = el.getBoundingClientRect().top + window.pageYOffset - headerH - 20;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ============================================================
// SHOP PAGE — INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('dbProductGrid')) {
    fetchProducts();
    if (_supabase) {
      const { data: { session } } = await _supabase.auth.getSession();
      currentUserSession = session;
      updateAuthUI(session?.user || null);

      _supabase.auth.onAuthStateChange((event, session) => {
        currentUserSession = session;
        updateAuthUI(session?.user || null);
        if (session?.user?.email) {
          loadWishlist().then(() => updateHeartIcons());
        } else {
          updateWishlistBadge(0);
        }
      });
    }

    const pending = localStorage.getItem('sc_pending_cart');
    if (pending) {
      try {
        const p = JSON.parse(pending);
        if (p.action === 'add') addToCart(p.id, false);
        if (p.action === 'buy') {
          addToCart(p.id, false);
          setTimeout(() => { toggleCart(); showCheckout(); }, 400);
        }
      } catch(e) {}
      localStorage.removeItem('sc_pending_cart');
    }
  }
});

// ============================================================
// AUTH UI
// ============================================================
function updateAuthUI(user) {
  const navUserText = document.getElementById('navUserText');
  const loggedIn = document.getElementById('loggedInOptions');
  const loggedOut = document.getElementById('loggedOutOptions');
  if (!navUserText) return;

  if (user) {
    navUserText.innerText = user.email ? user.email.split('@')[0] : 'Profile';
    if (loggedIn) loggedIn.style.display = 'block';
    if (loggedOut) loggedOut.style.display = 'none';
  } else {
    navUserText.innerText = 'Account';
    if (loggedIn) loggedIn.style.display = 'none';
    if (loggedOut) loggedOut.style.display = 'block';
  }
}

function toggleProfileMenu() {
  const d = document.getElementById('profileDropdown');
  if (d) d.style.display = (d.style.display === 'none' || d.style.display === '') ? 'block' : 'none';
}
function closeProfileMenu() {
  const d = document.getElementById('profileDropdown');
  if (d) d.style.display = 'none';
}
document.addEventListener('click', e => {
  const btn = document.getElementById('userNavContainer');
  const d = document.getElementById('profileDropdown');
  if (d && btn && !btn.contains(e.target) && !d.contains(e.target)) d.style.display = 'none';
});

async function handleLogout() {
  if (!confirm('Logout?')) return;
  const { error } = await _supabase.auth.signOut();
  if (error) alert('Error: ' + error.message);
  else { alert('Logged out!'); location.reload(); }
}

// ============================================================
// PRODUCTS
// ============================================================
async function fetchProducts() {
  const grid = document.getElementById('dbProductGrid');
  try {
    const { data, error } = await _supabase.from('products').select('*').order('id', { ascending: false });
    if (error) throw error;
    allProducts = data || [];
    renderProducts(allProducts);
    setTimeout(loadProductRatings, 500);
    updateCartBadge();
  } catch (err) {
    if (grid) grid.innerHTML = '<p style="color:#ef4444;text-align:center;grid-column:1/-1;">Failed to load products.</p>';
  }
}

function renderProducts(products) {
  const grid = document.getElementById('dbProductGrid');
  if (!grid) return;
  if (products.length === 0) {
    grid.innerHTML = '<p style="color:#64748b;text-align:center;grid-column:1/-1;">No products found.</p>';
    return;
  }
  grid.innerHTML = products.map(p => {
    const defaultImg = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&q=80';
    const img = p.image && p.image.trim() !== '' ? p.image : defaultImg;
    return `
      <div class="product-card">
        <div onclick="goToProductPage(${p.id})" style="cursor:pointer; position:relative;">
          <button class="wishlist-heart" data-product-id="${p.id}" onclick="toggleWishlist(${p.id}, event)" title="Add to Wishlist">
            <i class="far fa-heart"></i>
          </button>
          <img src="${img}" alt="${p.name}" onerror="this.src='${defaultImg}'">
          <span class="p-cat">${p.category || 'ELECTRONICS'}</span>
          <h3>${p.name}</h3>
          <div class="p-rating" data-product-id="${p.id}">
            <i class="fas fa-star" style="color:#fbbf24;"></i>
            <span style="color:#64748b;font-size:0.8rem;">Loading...</span>
          </div>
          <div class="p-price">
            <span class="now">₹${p.price}</span>
            ${p.original_price ? `<span class="old">₹${p.original_price}</span>` : ''}
          </div>
        </div>
        ${p.in_stock
          ? `<div class="card-btns">
               <button onclick="addToCart(${p.id})" class="btn-cart"><i class="fas fa-cart-plus"></i> Add</button>
               <button onclick="buyNow(${p.id})" class="btn-buy">⚡ Buy Now</button>
             </div>
             ${p.stock_quantity && p.stock_quantity <= 5 && p.stock_quantity > 0 
               ? `<div class="low-stock-badge">🔥 Only ${p.stock_quantity} left!</div>` 
               : ''}`
          : `<button disabled class="btn-oos">Out of Stock</button>`
        }
      </div>
    `;
  }).join('');
}

// ============================================================
// LOAD PRODUCT RATINGS
// ============================================================
async function loadProductRatings() {
  const ratingElements = document.querySelectorAll('.p-rating');
  if (ratingElements.length === 0) return;

  try {
    const { data: allReviews } = await _supabase
      .from('reviews')
      .select('product_id, rating');
    
    if (!allReviews) return;

    ratingElements.forEach(el => {
      const pid = parseInt(el.getAttribute('data-product-id'));
      const productReviews = allReviews.filter(r => r.product_id === pid);
      
      if (productReviews.length === 0) {
        el.innerHTML = '<span style="color:#94a3b8;font-size:0.75rem;">No reviews yet</span>';
      } else {
        const avg = productReviews.reduce((a, r) => a + r.rating, 0) / productReviews.length;
        el.innerHTML = `
          <i class="fas fa-star" style="color:#fbbf24;"></i>
          <strong style="color:#0f172a;font-size:0.85rem;">${avg.toFixed(1)}</strong>
          <span style="color:#64748b;font-size:0.75rem;">(${productReviews.length})</span>
        `;
      }
    });
  } catch (e) {
    console.error('Ratings load failed:', e);
  }
}

// ============================================================
// CART
// ============================================================
function addToCart(id, showNotice = true) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(x => x.id === id);
  if (ex) {
    ex.qty += 1;
    ex.price = p.price;
    ex.name = p.name;
  } else {
    cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
  }
  saveCart();
  if (showNotice) alert(`✅ Added "${p.name}" to cart!`);
}

function buyNow(id) {
  addToCart(id, false);
  toggleCart();
  showCheckout();
}

function saveCart() {
  localStorage.setItem('sc_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const c = cart.reduce((a, i) => a + i.qty, 0);
  const b = document.getElementById('cartCount');
  if (b) {
    b.innerText = c;
    b.style.display = c > 0 ? 'inline-block' : 'none';
  }
}

// ============================================================
// WISHLIST
// ============================================================
async function loadWishlist() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session?.user?.email) {
    updateWishlistBadge(0);
    return [];
  }

  try {
    const { data, error } = await _supabase
      .from('wishlist')
      .select('product_id')
      .eq('user_email', session.user.email);

    if (error) throw error;
    const ids = (data || []).map(w => w.product_id);
    updateWishlistBadge(ids.length);
    return ids;
  } catch (e) {
    console.error('Wishlist load failed:', e);
    return [];
  }
}

function updateWishlistBadge(count) {
  const b = document.getElementById('wishlistCount');
  if (b) {
    b.innerText = count;
    b.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

async function toggleWishlist(productId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const { data: { session } } = await _supabase.auth.getSession();
  if (!session?.user?.email) {
    alert('❤️ Please login to add items to wishlist!');
    openLoginModal();
    return;
  }

  const userEmail = session.user.email;

  try {
    const { data: existing } = await _supabase
      .from('wishlist')
      .select('id')
      .eq('user_email', userEmail)
      .eq('product_id', productId)
      .single();

    if (existing) {
      await _supabase
        .from('wishlist')
        .delete()
        .eq('user_email', userEmail)
        .eq('product_id', productId);
      console.log('💔 Removed from wishlist');
    } else {
      await _supabase
        .from('wishlist')
        .insert([{ user_email: userEmail, product_id: productId }]);
      console.log('❤️ Added to wishlist');
    }

    await loadWishlist();
    updateHeartIcons();

  } catch (e) {
    console.error('Wishlist toggle failed:', e);
  }
}

async function updateHeartIcons() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session?.user?.email) return;

  const { data } = await _supabase
    .from('wishlist')
    .select('product_id')
    .eq('user_email', session.user.email);

  const wishlistIds = new Set((data || []).map(w => w.product_id));

  document.querySelectorAll('.wishlist-heart').forEach(el => {
    const pid = parseInt(el.getAttribute('data-product-id'));
    if (wishlistIds.has(pid)) {
      el.classList.add('active');
      el.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
      el.classList.remove('active');
      el.innerHTML = '<i class="far fa-heart"></i>';
    }
  });
}

function toggleCart() {
  const m = document.getElementById('cartModal');
  if (!m) return;
  m.classList.toggle('active');
  if (m.classList.contains('active')) {
    resetCartUI();
    renderCartUI();
  }
}

function resetCartUI() {
  const ci = document.getElementById('cartItemsContainer');
  const cf = document.getElementById('checkoutForm');
  const os = document.getElementById('orderSuccessBox');
  const ct = document.getElementById('cartFooter');
  const ps = document.getElementById('priceSummaryBox');
  const mt = document.getElementById('modalTitle');
  if (ci) ci.style.display = 'block';
  if (cf) cf.style.display = 'none';
  if (os) os.style.display = 'none';
  if (ct) ct.style.display = 'block';
  if (ps) ps.style.display = 'none';
  if (mt) mt.innerText = '🛒 Shopping Cart';
}

function renderCartUI() {
  const c = document.getElementById('cartItemsContainer');
  const box = document.getElementById('priceSummaryBox');
  const st = document.getElementById('subTotalAmt');
  const sh = document.getElementById('shippingAmt');
  const gt = document.getElementById('grandTotalAmt');
  if (!c) return;

  if (cart.length === 0) {
    c.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;">Your cart is empty.</p>';
    if (box) box.style.display = 'none';
    const pb = document.getElementById('proceedBtn');
    if (pb) pb.style.display = 'none';
    return;
  }
  const pb = document.getElementById('proceedBtn');
  if (pb) pb.style.display = 'block';
  if (box) box.style.display = 'block';

  let sub = 0;
  c.innerHTML = cart.map(i => {
    const tot = i.price * i.qty;
    sub += tot;
    return `
      <div class="cart-item">
        <div>
          <strong>${i.name}</strong>
          <div class="muted small">₹${i.price} x ${i.qty}</div>
        </div>
        <div class="qty-ctrl">
          <button onclick="changeQty(${i.id}, -1)">−</button>
          <span>${i.qty}</span>
          <button onclick="changeQty(${i.id}, 1)">+</button>
          <strong>₹${tot}</strong>
        </div>
      </div>
    `;
  }).join('');

  const MIN_ORDER_VALUE = 99;
  const minOrderWarning = document.getElementById('minOrderWarning');
  const minOrderText = document.getElementById('minOrderText');
  const proceedBtnEl = document.getElementById('proceedBtn');
  
  if (minOrderWarning && minOrderText && proceedBtnEl) {
    if (sub < MIN_ORDER_VALUE && cart.length > 0) {
      const remaining = MIN_ORDER_VALUE - sub;
      minOrderWarning.style.display = 'block';
      minOrderText.innerText = `Add ₹${remaining} more (current cart: ₹${sub}). Free shipping above ₹499!`;
      proceedBtnEl.style.opacity = '0.5';
      proceedBtnEl.style.pointerEvents = 'none';
      proceedBtnEl.innerText = `Minimum order ₹99 required`;
    } else {
      minOrderWarning.style.display = 'none';
      proceedBtnEl.style.opacity = '1';
      proceedBtnEl.style.pointerEvents = 'auto';
      proceedBtnEl.innerText = 'Proceed to Shipping →';
    }
  }

  const ship = sub >= FREE_SHIPPING_MIN ? 0 : SHIPPING_CHARGE;
  const grand = sub + ship;
  if (st) st.innerText = sub;
  if (sh) sh.innerText = ship === 0 ? 'FREE' : `₹${ship}`;
  if (gt) gt.innerText = grand;

  let deliveryNote = document.getElementById('cartDeliveryNote');
  if (!deliveryNote) {
    deliveryNote = document.createElement('div');
    deliveryNote.id = 'cartDeliveryNote';
    deliveryNote.style.cssText = 'background:#dcfce7; border-radius:8px; padding:10px; margin-top:12px; text-align:center; font-size:0.82rem; color:#166534; font-weight:600;';
    const parent = document.getElementById('priceSummaryBox');
    if (parent) parent.appendChild(deliveryNote);
  }
  const delivery = calculateDeliveryDate();
  deliveryNote.innerHTML = `🚚 Expected Delivery: <strong>${delivery.range}</strong> (${delivery.days})`;
}

function changeQty(id, ch) {
  const i = cart.find(x => x.id === id);
  if (!i) return;
  i.qty += ch;
  if (i.qty <= 0) {
    cart = cart.filter(x => x.id !== id);
  }
  saveCart();
  renderCartUI();
  if (cart.length === 0) {
    resetCartUI();
  }
}

function showCheckout() {
  if (!currentUserSession) {
    // Check if custom modal function exists
    if (typeof showLoginRequiredModal === 'function') {
      showLoginRequiredModal('to place your order');
    } else {
      openLoginModal();
    }
    return;
  }
  const ci = document.getElementById('cartItemsContainer');
  const cf = document.getElementById('checkoutForm');
  const ct = document.getElementById('cartFooter');
  const mt = document.getElementById('modalTitle');
  if (ci) ci.style.display = 'none';
  if (cf) cf.style.display = 'block';
  if (ct) ct.style.display = 'none';
  if (mt) mt.innerText = '🚚 Delivery Address';
}

function togglePayOption(type) {
  const b = document.getElementById('upiBoxContainer');
  if (b) b.style.display = (type === 'UPI') ? 'block' : 'none';
}

// ============================================================
// PINCODE VALIDATION
// ============================================================
async function validatePincode(pin) {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return { valid: false, error: 'Pincode 6 digit ka hona chahiye' };
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();

    if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
      const po = data[0].PostOffice[0];
      return {
        valid: true,
        city: po.District,
        state: po.State,
        area: po.Name,
        country: po.Country
      };
    }
    return { valid: false, error: 'Ye pincode exist nahi karta India me' };
  } catch (err) {
    return { valid: false, error: 'Pincode verify nahi ho paya. Internet check karo.' };
  }
}

let pincodeTimer = null;
document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('custPincode');
  if (pinInput) {
    pinInput.addEventListener('input', () => {
      clearTimeout(pincodeTimer);
      const pin = pinInput.value.trim();
      const status = document.getElementById('pincodeStatus');
      if (pin.length === 6) {
        if (status) status.innerHTML = '<span style="color:#f97316;">⏳ Verifying pincode...</span>';
        pincodeTimer = setTimeout(async () => {
          const result = await validatePincode(pin);
          if (status) {
            if (result.valid) {
              status.innerHTML = `<span style="color:#22c55e;">✅ ${result.area}, ${result.city}, ${result.state}</span>`;
            } else {
              status.innerHTML = `<span style="color:#ef4444;">❌ ${result.error}</span>`;
            }
          }
        }, 500);
      } else {
        if (status) status.innerHTML = '';
      }
    });
  }
});

// ============================================================
// 🎯 CUSTOM LOGIN REQUIRED MODAL (Front Layer)
// ============================================================
function showLoginRequiredModal(actionMessage = 'to continue') {
  const existing = document.getElementById('customLoginRequiredModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'customLoginRequiredModal';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeInModal 0.3s ease;
  `;
  
  modal.innerHTML = `
    <style>
      @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUpModal { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
    <div style="
      background: #fff;
      border-radius: 20px;
      padding: 32px 26px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.4);
      animation: slideUpModal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
    ">
      <button onclick="document.getElementById('customLoginRequiredModal').remove()" 
        style="position: absolute; top: 14px; right: 14px; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.1rem; color: #64748b; display: flex; align-items: center; justify-content: center;">
        ✕
      </button>
      
      <div style="
        width: 70px;
        height: 70px;
        margin: 0 auto 18px;
        background: linear-gradient(135deg, #fff7ed, #ffedd5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
      ">🔐</div>
      
      <h3 style="
        font-family: 'Poppins', sans-serif;
        font-size: 1.3rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 8px;
      ">Login Required</h3>
      
      <p style="
        color: #64748b;
        font-size: 0.92rem;
        line-height: 1.6;
        margin-bottom: 24px;
      ">Please login ${actionMessage}. It only takes 10 seconds with email OTP.</p>
      
      <button onclick="
        document.getElementById('customLoginRequiredModal').remove();
        openLoginModal();
      " style="
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        box-shadow: 0 8px 25px rgba(249,115,22,0.4);
      ">
        🔓 Login Now
      </button>
      
      <button onclick="document.getElementById('customLoginRequiredModal').remove()" 
        style="
          width: 100%;
          padding: 12px;
          background: transparent;
          color: #64748b;
          border: none;
          margin-top: 10px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
        ">
        Maybe Later
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// ============================================================
// AUTH MODALS
// ============================================================
function openLoginModal() {
  const m = document.getElementById('loginModal');
  if (m) { m.style.display = 'flex'; resetOtpStep(); }
}
function closeLoginModal() {
  const m = document.getElementById('loginModal');
  if (m) m.style.display = 'none';
}
function resetOtpStep() {
  const s1 = document.getElementById('otpStep1');
  const s2 = document.getElementById('otpStep2');
  const em = document.getElementById('authEmail');
  const oc = document.getElementById('otpCode');
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
  if (em) em.value = '';
  if (oc) oc.value = '';
}

async function sendEmailOTP() {
  const email = document.getElementById('authEmail').value.trim();
  if (!email || !email.includes('@')) { alert('Enter valid Email!'); return; }
  const btn = document.getElementById('btnSendOtp');
  btn.innerText = 'Sending...'; btn.disabled = true;
  try {
    const { error } = await _supabase.auth.signInWithOtp({ email });
    if (error) throw error;
    alert('✅ OTP sent to ' + email);
    document.getElementById('otpStep1').style.display = 'none';
    document.getElementById('otpStep2').style.display = 'block';
  } catch (err) { alert('Failed: ' + err.message); }
  finally { btn.innerText = 'Send OTP →'; btn.disabled = false; }
}

async function verifyEmailOTP() {
  const email = document.getElementById('authEmail').value.trim();
  const token = document.getElementById('otpCode').value.trim();
  if (token.length !== 6) { alert('Enter 6-digit OTP!'); return; }
  const btn = document.getElementById('btnVerifyOtp');
  btn.innerText = 'Verifying...'; btn.disabled = true;
  try {
    const { data, error } = await _supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    currentUserSession = data.session;
    updateAuthUI(currentUserSession?.user);
    alert('✅ Verified! Logged in.');
    closeLoginModal();
    if (cart.length > 0) {
      toggleCart();
      showCheckout();
    }
  } catch (err) { alert('Invalid OTP: ' + err.message); }
  finally { btn.innerText = 'Verify OTP & Login →'; btn.disabled = false; }
}

// ============================================================
// TELEGRAM ALERT
// ============================================================
async function sendTelegramAlert(orderData) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const itemsList = Array.isArray(orderData.order_items)
    ? orderData.order_items.map(i => `• ${i.name} (x${i.qty || 1}) — ₹${i.price * (i.qty || 1)}`).join('\n')
    : 'No items';

  const message = `
🛒 <b>NEW ORDER — SparkCircuit</b>

<b>Order ID:</b> #${orderData.order_code || 'SPC-' + orderData.id}
<b>Expected Delivery:</b> ${calculateDeliveryDate().fullDate}
<b>Time:</b> ${new Date().toLocaleString('en-IN')}

👤 <b>CUSTOMER:</b>
Name: ${orderData.customer_name}
Phone: ${orderData.customer_phone}
Email: ${orderData.user_email}
Address: ${orderData.delivery_address}
Pincode: ${orderData.pincode}

📦 <b>ITEMS:</b>
${itemsList}

💰 <b>TOTAL:</b> ₹${orderData.grand_total}
💳 <b>Payment:</b> ${orderData.payment_status}

📱 <a href="https://wa.me/91${orderData.customer_phone}">WhatsApp Customer</a>
  `.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const result = await res.json();
    if (result.ok) console.log('✅ Telegram alert sent!');
    else console.error('Telegram failed:', result);
  } catch (err) {
    console.error('Telegram error:', err);
  }
}

// ============================================================
// ADMIN EMAIL ALERT (via EmailJS)
// ============================================================
// ============================================================
// 📧 EMAIL SENDER (via Supabase Edge Function → Resend)
// ============================================================
async function sendEmailViaResend(to, subject, html, replyTo) {
  try {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-order-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        to: to,
        subject: subject,
        html: html,
        replyTo: replyTo || 'sparkcircuit.in@gmail.com'
      })
    });
    const result = await res.json();
    if (result.success) {
      console.log('✅ Email sent via Resend:', result.id);
      return true;
    } else {
      console.error('❌ Email failed:', result.error);
      return false;
    }
  } catch (err) {
    console.error('❌ Email error:', err);
    return false;
  }
}

// ============================================================
// ADMIN EMAIL ALERT
// ============================================================
function sendAdminEmailAlert(orderCode, name, phone, address, pincode, items, amount) {
  const itemsList = Array.isArray(items) 
    ? items.map(i => `${i.name} (Qty: ${i.qty || 1}) - ₹${i.price * (i.qty || 1)}`).join('<br>')
    : 'N/A';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">🛒 New Order Received</h1>
      </div>
      <div style="background: #f8fafc; padding: 25px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
          <h2 style="color: #0f172a; margin-top: 0;">Order #${orderCode}</h2>
          <p style="color: #64748b; font-size: 14px;">📅 ${new Date().toLocaleString('en-IN')}</p>
        </div>
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
          <h3 style="color: #0f172a; margin-top: 0;">👤 Customer</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Address:</strong> ${address}, ${pincode}</p>
        </div>
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
          <h3 style="color: #0f172a; margin-top: 0;">📦 Items</h3>
          <p style="color: #475569; line-height: 1.8;">${itemsList}</p>
        </div>
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 10px; text-align: center;">
          <p style="color: white; font-size: 14px; margin: 0;">Total Amount</p>
          <h2 style="color: white; margin: 5px 0; font-size: 28px;">₹${amount}</h2>
        </div>
      </div>
    </div>
  `;
  
  sendEmailViaResend('sparkcircuit.in@gmail.com', `New Order #${orderCode} - ₹${amount}`, html);
}

// ============================================================
// CUSTOMER CONFIRMATION EMAIL (via EmailJS)
// ============================================================
// ============================================================
// CUSTOMER CONFIRMATION EMAIL
// ============================================================
function sendCustomerConfirmationEmail(orderData) {
  if (!orderData.email) {
    console.log('⚠️ No email — skipping customer email');
    return;
  }
  
  const itemsList = Array.isArray(orderData.items)
    ? orderData.items.map(i => `<tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${i.name}</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${i.qty || 1}</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${i.price * (i.qty || 1)}</td></tr>`).join('')
    : '';
  
  const trackUrl = `https://sparkcircuit.in/track.html?order=${orderData.order_code}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 10px;">⚡</div>
        <h1 style="color: white; margin: 0; font-size: 26px;">SparkCircuit</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 13px;">TECH / R&D STUDIO</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; line-height: 60px; font-size: 30px;">✅</div>
          <h2 style="color: #15803d; margin: 15px 0 5px; font-size: 22px;">Order Confirmed!</h2>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Thank you for your order, ${orderData.name}!</p>
        </div>
        
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 15px; text-align: center; margin-bottom: 20px;">
          <p style="color: #92400e; font-size: 12px; margin: 0 0 5px; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
          <h3 style="color: #ea580c; margin: 0; font-size: 20px;">#${orderData.order_code}</h3>
        </div>
        
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">📅 Order Date:</td>
            <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right;"><strong>${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">💳 Payment:</td>
            <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-align: right;"><strong>${orderData.paymentStatus}</strong></td>
          </tr>
        </table>
        
        <div style="background: #f8fafc; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #0f172a; margin: 0 0 10px; font-size: 15px;">📦 Order Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e2e8f0;">
                <th style="padding: 10px; text-align: left; font-size: 13px; color: #475569;">Item</th>
                <th style="padding: 10px; text-align: center; font-size: 13px; color: #475569;">Qty</th>
                <th style="padding: 10px; text-align: right; font-size: 13px; color: #475569;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsList}</tbody>
          </table>
        </div>
        
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <p style="color: rgba(255,255,255,0.9); margin: 0 0 5px; font-size: 13px;">TOTAL AMOUNT</p>
          <h2 style="color: white; margin: 0; font-size: 28px;">₹${orderData.grand}</h2>
        </div>
        
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #075985; margin: 0 0 8px; font-size: 14px;">📍 Delivery Address</h3>
          <p style="color: #0369a1; margin: 0; font-size: 13px; line-height: 1.6;">
            ${orderData.name}<br>
            ${orderData.address}<br>
            ${orderData.city || ''}, ${orderData.state || ''} - ${orderData.pincode}
          </p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${trackUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 30px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;">🚚 Track Your Order</a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 5px;">Need help? Contact us:</p>
          <p style="color: #ea580c; font-size: 13px; margin: 0;">
            📧 sparkcircuit.in@gmail.com &nbsp;|&nbsp; 📱 +91 6374017186
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 SparkCircuit | All Rights Reserved</p>
      </div>
    </div>
  `;
  
  sendEmailViaResend(orderData.email, `Order Confirmed - #${orderData.order_code} | SparkCircuit`, html, 'sparkcircuit.in@gmail.com');
}

// ============================================================
// ORDER PROCESSING — WITH RAZORPAY
// ============================================================
async function processOrderToPayment() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const pincode = document.getElementById('custPincode').value.trim();
  const payType = document.querySelector('input[name="payType"]:checked')?.value || 'UPI';

  if (!name || !phone || !address || !pincode) { alert('Please fill all shipping details!'); return; }
  if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
    alert('❌ Please enter a valid 10-digit Indian mobile number (starting with 6-9)');
    return;
  }
  if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    alert('❌ Please enter a valid Pincode');
    return;
  }
  if (cart.length === 0) {
    alert('❌ Cart is empty!');
    return;
  }

  const MIN_ORDER_VALUE = 99;
  const currentSubtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  if (currentSubtotal < MIN_ORDER_VALUE) {
    const remaining = MIN_ORDER_VALUE - currentSubtotal;
    alert(`❌ Minimum order value is ₹${MIN_ORDER_VALUE}.\n\n🛒 Your cart: ₹${currentSubtotal}\n💰 Add ₹${remaining} more items.\n\n💡 Tip: Free shipping above ₹499!`);
    return;
  }

  const btn = document.querySelector('#checkoutForm button');
  if (!btn) return;
  btn.innerText = 'Verifying Pincode...'; btn.disabled = true;

  const pinResult = await validatePincode(pincode);
  if (!pinResult.valid) {
    alert('❌ ' + pinResult.error);
    btn.innerText = 'Place Order →'; btn.disabled = false;
    return;
  }

  const { data: { session } } = await _supabase.auth.getSession();
  const userEmail = session?.user?.email || "Guest";

  const sub = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const ship = sub >= FREE_SHIPPING_MIN ? 0 : SHIPPING_CHARGE;
  const grand = sub + ship;

  if (payType === 'COD') {
    await saveOrderToSupabase({
      name, phone, address, pincode, payType: 'COD',
      userEmail, sub, ship, grand, pinResult,
      paymentStatus: 'Cash on Delivery', paymentId: null
    });
    return;
  }

  btn.innerText = 'Opening Payment...';

  try {
    const createRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-razorpay-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        amount: grand * 100,
        receipt: `rcpt_${Date.now()}`
      })
    });

    const razorpayOrder = await createRes.json();

    if (!createRes.ok || !razorpayOrder.order_id) {
      throw new Error(razorpayOrder.error || 'Order creation failed');
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'SparkCircuit',
      description: 'Order Payment',
      image: 'https://mrqvzmtdsohvzsnryogp.supabase.co/storage/v1/object/public/product-images/sparkcircuit-logo.jpeg',
      order_id: razorpayOrder.order_id,
      handler: async function(response) {
        btn.innerText = 'Verifying Payment...';

        let verifyResult = { success: false, error: 'Network error' };
        try {
          const verifyRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-razorpay-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          verifyResult = await verifyRes.json();
        } catch (e) {
          console.error('Verify failed:', e);
        }

        if (verifyResult && verifyResult.success) {
          await saveOrderToSupabase({
            name, phone, address, pincode, payType: 'Razorpay',
            userEmail, sub, ship, grand, pinResult,
            paymentStatus: 'Paid via Razorpay',
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id
          });
        } else {
          alert('❌ Payment verification failed: ' + (verifyResult?.error || 'Unknown error'));
          btn.innerText = 'Place Order →'; btn.disabled = false;
        }
      },
      prefill: {
        name: name,
        email: userEmail !== 'Guest' ? userEmail : '',
        contact: phone
      },
      notes: {
        address: `${address}, ${pincode}`,
        city: pinResult.city,
        state: pinResult.state
      },
      theme: { color: '#f97316' },
      modal: {
        ondismiss: function() {
          btn.innerText = 'Place Order →'; btn.disabled = false;
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      alert('❌ Payment failed: ' + response.error.description);
      btn.innerText = 'Place Order →'; btn.disabled = false;
    });
    rzp.open();

  } catch (err) {
    alert('❌ ' + err.message);
    btn.innerText = 'Place Order →'; btn.disabled = false;
  }
}

// ============================================================
// GENERATE ORDER CODE
// ============================================================
function generateOrderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SPC-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================
// 🚚 DELIVERY DATE CALCULATOR
// ============================================================
function calculateDeliveryDate() {
  const today = new Date();
  const minDays = 3;
  const maxDays = 5;
  
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + minDays);
  
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + maxDays);
  
  const options = { day: 'numeric', month: 'short' };
  const minStr = minDate.toLocaleDateString('en-IN', options);
  const maxStr = maxDate.toLocaleDateString('en-IN', options);
  
  const fullDate = maxDate.toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  
  return {
    minDate: minStr,
    maxDate: maxStr,
    range: `${minStr} - ${maxStr}`,
    fullDate: fullDate,
    days: `${minDays}-${maxDays} days`
  };
}

// ============================================================
// SAVE ORDER TO SUPABASE
// ============================================================
async function saveOrderToSupabase(orderData) {
  const { name, phone, address, pincode, payType, userEmail, sub, ship, grand, pinResult, paymentStatus, paymentId, razorpayOrderId } = orderData;
  const btn = document.querySelector('#checkoutForm button');

  try {
    const itemsCopy = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));
    const orderCode = generateOrderCode();

    const { data, error } = await _supabase.from('orders').insert([{
      order_code: orderCode,
      user_email: userEmail,
      customer_name: name,
      customer_phone: phone,
      delivery_address: address,
      pincode: pincode,
      order_items: itemsCopy,
      subtotal: sub,
      delivery_charge: ship,
      grand_total: grand,
      payment_status: paymentStatus,
      payment_id: paymentId || null,
      razorpay_order_id: razorpayOrderId || null,
      order_status: 'Confirmed',
      city: pinResult.city,
      state: pinResult.state
    }]).select();

    if (error) throw error;
    const rawId = data[0].id;
    const orderId = data[0].order_code || orderCode;

    // Decrease stock
    for (const item of itemsCopy) {
      try {
        const { data: prod } = await _supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();

        if (prod && prod.stock_quantity !== null && prod.stock_quantity !== undefined) {
          const newQty = Math.max(0, prod.stock_quantity - item.qty);
          await _supabase
            .from('products')
            .update({ 
              stock_quantity: newQty,
              in_stock: newQty > 0
            })
            .eq('id', item.id);
          console.log(`📦 Stock updated: ${item.name} → ${newQty} left`);
        }
      } catch (e) {
        console.error(`Stock update failed for ${item.name}:`, e);
      }
    }

    currentOrderData = {
      id: rawId,
      order_code: orderCode,
      customer_name: name,
      customer_phone: phone,
      delivery_address: address,
      pincode: pincode,
      city: pinResult.city,
      state: pinResult.state,
      order_items: itemsCopy,
      subtotal: sub,
      delivery_charge: ship,
      grand_total: grand,
      payment_status: paymentStatus,
      payType: payType,
      created_at: new Date().toISOString()
    };

    // Send notifications
    sendTelegramAlert({
      id: rawId,
      order_code: orderCode,
      customer_name: name,
      customer_phone: phone,
      user_email: userEmail,
      delivery_address: address,
      pincode: pincode,
      order_items: itemsCopy,
      grand_total: grand,
      payment_status: paymentStatus
    });

    sendAdminEmailAlert(orderCode, name, phone, address, pincode, itemsCopy, grand);
    
    sendCustomerConfirmationEmail({
      email: userEmail !== 'Guest' ? userEmail : null,
      order_code: orderCode,
      name: name,
      address: address,
      pincode: pincode,
      city: pinResult.city,
      state: pinResult.state,
      items: itemsCopy,
      grand: grand,
      paymentStatus: paymentStatus
    });
     
    // Show success UI
    document.getElementById('checkoutForm').style.display = 'none';
    document.getElementById('priceSummaryBox').style.display = 'none';
    document.getElementById('cartItemsContainer').style.display = 'none';
    document.getElementById('cartFooter').style.display = 'none';
    document.getElementById('modalTitle').innerText = '✅ Order Confirmed';

    document.getElementById('orderSuccessBox').style.display = 'block';
    document.getElementById('placedOrderId').innerText = '#' + orderId;
    document.getElementById('finalPayAmt').innerText = '₹' + grand;
    document.getElementById('upiBoxContainer').style.display = 'none';

    const delivery = calculateDeliveryDate();
    const deliveryEl = document.getElementById('deliveryEstimate');
    if (deliveryEl) {
      deliveryEl.innerHTML = `
        <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0); border:2px solid #22c55e; border-radius:10px; padding:14px; margin:15px 0; text-align:center;">
          <div style="color:#15803d; font-weight:700; font-size:0.9rem; margin-bottom:5px;">🚚 Expected Delivery</div>
          <div style="color:#166534; font-weight:800; font-size:1.1rem;">${delivery.fullDate}</div>
          <div style="color:#15803d; font-size:0.78rem; margin-top:4px;">(${delivery.days})</div>
        </div>
      `;
    }
    cart = [];
    localStorage.removeItem('sc_cart');
    updateCartBadge();

  } catch (err) {
    alert('Order save failed: ' + err.message);
    if (btn) { btn.innerText = 'Place Order →'; btn.disabled = false; }
  }
}

// ============================================================
// 📄 INVOICE PDF
// ============================================================
let currentOrderData = null;

function downloadInvoice() {
  if (!currentOrderData) {
    alert('❌ Order data not found!');
    return;
  }
  
  if (typeof window.jspdf === 'undefined') {
    alert('❌ PDF library not loaded. Refresh the page.');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const order = currentOrderData;
  const orange = [249, 115, 22];
  const dark = [15, 23, 42];
  const gray = [100, 116, 139];
  const lightGray = [241, 245, 249];
  const green = [34, 197, 94];

  // HEADER
  doc.setFillColor(...orange);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('SparkCircuit', 15, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('TECH / R&D STUDIO', 15, 26);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 15, 18, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('www.sparkcircuit.in', pageWidth - 15, 26, { align: 'right' });

  // COMPANY DETAILS
  let y = 48;
  doc.setTextColor(...dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);
  doc.text('SparkCircuit Electronics', 15, y + 6);
  doc.text('Chennai, Tamil Nadu, India', 15, y + 12);
  doc.text('sparkcircuit.in@gmail.com', 15, y + 18);
  doc.text('+91 6374017186', 15, y + 24);
  
  // CUSTOMER DETAILS
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', pageWidth / 2 + 10, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);
  doc.text(order.customer_name || 'Customer', pageWidth / 2 + 10, y + 6);
  doc.text(order.customer_phone || '', pageWidth / 2 + 10, y + 12);
  const addressText = order.delivery_address || '';
  const splitAddress = doc.splitTextToSize(addressText + ', ' + (order.pincode || ''), 75);
  doc.text(splitAddress, pageWidth / 2 + 10, y + 18);
  
  // ORDER INFO BOX
  y = 90;
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'F');
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Order ID:', 20, y + 8);
  doc.text('Date:', 20, y + 16);
  doc.text('Payment Status:', pageWidth / 2, y + 8);
  doc.text('Payment Method:', pageWidth / 2, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...orange);
  doc.text(order.order_code || 'N/A', 45, y + 8);
  doc.setTextColor(...gray);
  doc.text(new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  }), 45, y + 16);
  doc.setTextColor(...green);
  doc.setFont('helvetica', 'bold');
  doc.text(order.payment_status || 'Pending', pageWidth / 2 + 30, y + 8);
  doc.setTextColor(...gray);
  doc.setFont('helvetica', 'normal');
  doc.text(order.payType || 'Online', pageWidth / 2 + 30, y + 16);
  
  // ITEMS TABLE
  y = 125;
  doc.setFillColor(...dark);
  doc.rect(15, y, pageWidth - 30, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('#', 20, y + 7);
  doc.text('ITEM DESCRIPTION', 30, y + 7);
  doc.text('QTY', 120, y + 7, { align: 'center' });
  doc.text('PRICE', 150, y + 7, { align: 'right' });
  doc.text('TOTAL', pageWidth - 20, y + 7, { align: 'right' });
  y += 10;
  
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...dark);
  items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(15, y, pageWidth - 30, 10, 'F');
    }
    const qty = item.qty || 1;
    const price = item.price || 0;
    const total = qty * price;
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(String(index + 1), 20, y + 7);
    const itemName = (item.name || 'Item').substring(0, 40);
    doc.text(itemName, 30, y + 7);
    doc.setTextColor(...gray);
    doc.text(String(qty), 120, y + 7, { align: 'center' });
    doc.text('Rs. ' + price.toFixed(2), 150, y + 7, { align: 'right' });
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Rs. ' + total.toFixed(2), pageWidth - 20, y + 7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 10;
  });
  
  doc.setDrawColor(...gray);
  doc.setLineWidth(0.2);
  doc.line(15, y, pageWidth - 15, y);
  
  // TOTALS
  y += 8;
  const totalsX = pageWidth - 80;
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, y);
  doc.setTextColor(...dark);
  doc.text('Rs. ' + (order.subtotal || 0).toFixed(2), pageWidth - 20, y, { align: 'right' });
  y += 6;
  doc.setTextColor(...gray);
  doc.text('Delivery Charge:', totalsX, y);
  doc.setTextColor(...dark);
  doc.text('Rs. ' + (order.delivery_charge || 0).toFixed(2), pageWidth - 20, y, { align: 'right' });
  y += 3;
  doc.setDrawColor(...dark);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y, pageWidth - 15, y);
  y += 8;
  doc.setFillColor(...orange);
  doc.roundedRect(totalsX - 3, y - 5, pageWidth - totalsX - 8, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('GRAND TOTAL:', totalsX, y + 3);
  doc.setFontSize(12);
  doc.text('Rs. ' + (order.grand_total || 0).toFixed(2), pageWidth - 20, y + 3, { align: 'right' });
  
  // FOOTER
  const footerY = pageHeight - 50;
  doc.setDrawColor(...orange);
  doc.setLineWidth(0.8);
  doc.line(15, footerY, pageWidth - 15, footerY);
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Thank you for your order!', pageWidth / 2, footerY + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text('For any queries, contact us at:', pageWidth / 2, footerY + 18, { align: 'center' });
  doc.setTextColor(...orange);
  doc.text('sparkcircuit.in@gmail.com  |  +91 6374017186', pageWidth / 2, footerY + 24, { align: 'center' });
  doc.setFillColor(...dark);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('SparkCircuit — Architecture Engineered for Next-Gen Solutions', pageWidth / 2, pageHeight - 5, { align: 'center' });
  
  const fileName = `SparkCircuit-Invoice-${order.order_code || 'Order'}.pdf`;
  doc.save(fileName);
  console.log('✅ Invoice downloaded:', fileName);
}

// ============================================================
// SEARCH AUTOCOMPLETE
// ============================================================
let searchTimeout = null;
let currentSuggestionIndex = -1;

function handleSearchInput() {
  clearTimeout(searchTimeout);
  const query = document.getElementById('searchInput').value.trim();

  if (query.length < 1) {
    hideSuggestions();
    renderProducts(allProducts);
    return;
  }

  searchTimeout = setTimeout(() => showSuggestions(query), 150);
}

function handleSearchFocus() {
  const query = document.getElementById('searchInput').value.trim();
  if (query.length >= 1) {
    showSuggestions(query);
  }
}

function handleSearchBlur() {
  setTimeout(hideSuggestions, 200);
}

function showSuggestions(query) {
  const container = document.getElementById('searchSuggestions');
  if (!container) return;

  const q = query.toLowerCase();
  const matches = allProducts
    .filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)))
    .slice(0, 6);

  if (matches.length === 0) {
    container.innerHTML = '<div class="suggestion-empty">🔍 No products found for "' + query + '"</div>';
    container.classList.add('active');
    currentSuggestionIndex = -1;
    return;
  }

  const defaultImg = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&q=80';

  container.innerHTML = matches.map((p, idx) => {
    const img = p.image && p.image.trim() !== '' ? p.image : defaultImg;
    return `
      <a href="product.html?id=${p.id}" class="suggestion-item" data-index="${idx}">
        <img src="${img}" alt="${p.name}" class="suggestion-img" onerror="this.src='${defaultImg}'">
        <div class="suggestion-info">
          <div class="suggestion-name">${highlightMatch(p.name, query)}</div>
          <div class="suggestion-cat">${p.category || 'Electronics'}</div>
        </div>
        <div class="suggestion-price">₹${p.price}</div>
      </a>
    `;
  }).join('');

  container.classList.add('active');
  currentSuggestionIndex = -1;

  renderProducts(allProducts.filter(p => 
    p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
  ));
}

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark style="background:#fef3c7;color:#92400e;padding:0 2px;border-radius:2px;">$1</mark>');
}

function hideSuggestions() {
  const container = document.getElementById('searchSuggestions');
  if (container) container.classList.remove('active');
  currentSuggestionIndex = -1;
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    const container = document.getElementById('searchSuggestions');
    if (!container || !container.classList.contains('active')) {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query) {
          renderProducts(allProducts.filter(p => p.name.toLowerCase().includes(query.toLowerCase())));
        }
      }
      return;
    }

    const items = container.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, items.length - 1);
      updateActiveSuggestion(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
      updateActiveSuggestion(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentSuggestionIndex >= 0 && items[currentSuggestionIndex]) {
        items[currentSuggestionIndex].click();
      } else if (items[0]) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });
});

function updateActiveSuggestion(items) {
  items.forEach((item, idx) => {
    if (idx === currentSuggestionIndex) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

// ============================================================
// SEARCH + FILTER
// ============================================================
function searchProducts() {
  const t = document.getElementById('searchInput').value.toLowerCase();
  renderProducts(allProducts.filter(p => p.name.toLowerCase().includes(t)));
}

function filterCategory(cat) {
  if (cat === 'All') renderProducts(allProducts);
  else renderProducts(allProducts.filter(p => p.category === cat));
}

function goToProductPage(id) { 
  console.log('🔵 goToProductPage called with id:', id);
  window.location.href = 'product.html?id=' + id; 
}

// ============================================================
// MY ORDERS MODAL
// ============================================================
async function openMyOrdersModal() {
  const m = document.getElementById('myOrdersModal');
  const c = document.getElementById('userOrdersList');
  if (m) m.style.display = 'flex';
  
  document.body.style.overflow = 'hidden';

  const { data: { session } } = await _supabase.auth.getSession();
  if (!session?.user?.email) {
    c.innerHTML = '<p style="color:#ef4444;text-align:center;">Please login first.</p>';
    return;
  }

  const { data, error } = await _supabase.from('orders').select('*').eq('user_email', session.user.email).order('id', { ascending: false });
  if (error) { c.innerHTML = `<p style="color:#ef4444;text-align:center;">Error: ${error.message}</p>`; return; }
  if (!data || data.length === 0) { c.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No orders yet.</p>'; return; }

  c.innerHTML = data.map(o => {
    const status = o.order_status || 'Pending';
    
    const statusColors = {
      'Pending': '#f97316',
      'Processing': '#3b82f6',
      'Shipped': '#8b5cf6',
      'Delivered': '#22c55e',
      'Confirmed': '#10b981',
      'Cancelled': '#ef4444'
    };
    const statusColor = statusColors[status] || '#f97316';
    
    const canCancel = (status === 'Pending' || status === 'Processing' || status === 'Confirmed');
    
    const trackUrl = `track.html?order=${o.order_code || 'SPC-' + o.id}&phone=${o.customer_phone}`;
    
    return `
    <div class="order-mini">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;align-items:center;flex-wrap:wrap;gap:8px;">
        <strong style="color:#ea580c;font-size:1rem;">Order #${o.order_code || 'SPC-' + o.id}</strong>
        <span style="background:${statusColor}20; color:${statusColor}; padding:4px 10px; border-radius:6px; font-size:0.72rem; font-weight:700; letter-spacing:0.5px;">${status.toUpperCase()}</span>
      </div>
      
      <p class="muted small" style="margin-bottom:6px;">📅 ${o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : 'N/A'}</p>
      <p class="muted small" style="margin-bottom:6px;">📍 ${o.delivery_address} (${o.pincode})</p>
      <p class="muted small" style="color:#22c55e;font-weight:600;margin-bottom:10px;">🚚 Expected: ${calculateDeliveryDate().fullDate}</p>
      
      <div class="order-items-mini">
        ${Array.isArray(o.order_items) ? o.order_items.map(i => `• ${i.name} (x${i.qty||1}) - ₹${i.price}`).join('<br>') : 'N/A'}
      </div>
      
      <div style="text-align:right;font-weight:800;color:#22c55e;margin-top:10px;font-size:1.05rem;">Total: ₹${o.grand_total}</div>
      
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:8px; margin-top:14px; padding-top:14px; border-top:1px solid #334155;">
        
        <a href="${trackUrl}" style="display:flex; align-items:center; justify-content:center; gap:6px; background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; border:none; padding:10px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700; text-decoration:none; transition:0.25s;">
          <i class="fas fa-truck"></i> Track
        </a>
        
        <button onclick='downloadInvoiceFromOrders(${JSON.stringify(o).replace(/'/g, "&apos;")})' style="display:flex; align-items:center; justify-content:center; gap:6px; background:#0f172a; color:#fff; border:1px solid #334155; padding:10px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700; transition:0.25s;">
          <i class="fas fa-file-pdf"></i> Invoice
        </button>
        
        ${canCancel ? `
          <button onclick="cancelOrder(${o.id})" style="display:flex; align-items:center; justify-content:center; gap:6px; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; border:none; padding:10px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700; transition:0.25s;">
            <i class="fas fa-times-circle"></i> Cancel
          </button>
        ` : `
          <button disabled title="Cannot cancel — order is already ${status}" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#334155; color:#64748b; border:none; padding:10px 12px; border-radius:8px; cursor:not-allowed; font-size:0.8rem; font-weight:700;">
            <i class="fas fa-lock"></i> Locked
          </button>
        `}
        
      </div>
    </div>
  `;
  }).join('');
}

// ============================================================
// DOWNLOAD INVOICE FROM MY ORDERS
// ============================================================
function downloadInvoiceFromOrders(orderData) {
  currentOrderData = {
    id: orderData.id,
    order_code: orderData.order_code,
    customer_name: orderData.customer_name,
    customer_phone: orderData.customer_phone,
    delivery_address: orderData.delivery_address,
    pincode: orderData.pincode,
    city: orderData.city,
    state: orderData.state,
    order_items: orderData.order_items,
    subtotal: orderData.subtotal,
    delivery_charge: orderData.delivery_charge,
    grand_total: orderData.grand_total,
    payment_status: orderData.payment_status,
    payType: orderData.payment_status === 'Cash on Delivery' ? 'COD' : 'Online',
    created_at: orderData.created_at
  };
  downloadInvoice();
}

// ============================================================
// CANCEL ORDER
// ============================================================
async function cancelOrder(orderId) {
  if (!confirm('⚠️ Are you sure you want to cancel this order?\n\nThis action cannot be undone.')) {
    return;
  }
  
  const reason = prompt('Optional: Why are you cancelling this order?\n\n(e.g. Ordered by mistake, Found cheaper elsewhere, Changed my mind)');
  const cancelReason = reason && reason.trim() !== '' ? reason.trim() : 'Customer cancelled';
  
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session?.user?.email) {
    alert('❌ Please login first');
    return;
  }
  
  try {
    const { data: order, error: fetchErr } = await _supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_email', session.user.email)
      .single();
    
    if (fetchErr || !order) {
      alert('❌ Order not found');
      return;
    }
    
    const status = order.order_status || 'Pending';
    if (status === 'Shipped' || status === 'Delivered' || status === 'Cancelled') {
      alert(`❌ Cannot cancel order.\n\nCurrent status: "${status}"\n\nOnly "Pending" or "Processing" orders can be cancelled.`);
      return;
    }
    
    const { error: updateErr } = await _supabase
      .from('orders')
      .update({
        order_status: 'Cancelled',
        cancel_reason: cancelReason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateErr) throw updateErr;
    
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    for (const item of items) {
      try {
        const { data: prod } = await _supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', item.id)
          .single();
        
        if (prod && prod.stock_quantity !== null && prod.stock_quantity !== undefined) {
          const newQty = prod.stock_quantity + (item.qty || 1);
          await _supabase
            .from('products')
            .update({
              stock_quantity: newQty,
              in_stock: true
            })
            .eq('id', item.id);
          console.log(`📦 Stock restored: ${prod.name} → ${newQty}`);
        }
      } catch (e) {
        console.error('Stock restore failed:', e);
      }
    }
    
    sendTelegramCancelAlert({
      order_code: order.order_code || 'SPC-' + order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      order_items: items,
      grand_total: order.grand_total,
      cancel_reason: cancelReason,
      payment_status: order.payment_status
    });
    
    let successMsg = `✅ Order #${order.order_code || 'SPC-' + order.id} cancelled successfully!\n\n`;
    if (order.payment_status === 'Paid via Razorpay') {
      successMsg += `💰 Refund will be processed within 5-7 business days to your original payment method.\n\n`;
    }
    successMsg += `📞 For any queries, contact us on WhatsApp: +91 6374017186`;
    
    alert(successMsg);
    openMyOrdersModal();
    
  } catch (err) {
    console.error('Cancel order error:', err);
    alert('❌ Failed to cancel order: ' + err.message);
  }
}

// ============================================================
// TELEGRAM CANCEL ALERT
// ============================================================
async function sendTelegramCancelAlert(orderData) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  
  const itemsList = Array.isArray(orderData.order_items)
    ? orderData.order_items.map(i => `• ${i.name} (x${i.qty || 1})`).join('\n')
    : 'No items';
  
  const message = `
❌ <b>ORDER CANCELLED — SparkCircuit</b>

<b>Order ID:</b> #${orderData.order_code}
<b>Time:</b> ${new Date().toLocaleString('en-IN')}

👤 <b>CUSTOMER:</b>
Name: ${orderData.customer_name}
Phone: ${orderData.customer_phone}

📦 <b>ITEMS:</b>
${itemsList}

💰 <b>TOTAL:</b> ₹${orderData.grand_total}
💳 <b>Payment:</b> ${orderData.payment_status}

⚠️ <b>REASON:</b>
${orderData.cancel_reason}

📱 <a href="https://wa.me/91${orderData.customer_phone}">WhatsApp Customer</a>
  `.trim();
  
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    console.log('✅ Cancel alert sent!');
  } catch (err) {
    console.error('Telegram cancel alert failed:', err);
  }
}

function closeMyOrdersModal() {
  const m = document.getElementById('myOrdersModal');
  if (m) m.style.display = 'none';
  document.body.style.overflow = '';
}

// ============================================================
// SCROLL REVEAL ANIMATION
// ============================================================
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ============================================================
// COUNTER ANIMATION
// ============================================================
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-target'));
      let count = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        count += step;
        if (count >= target) { count = target; clearInterval(timer); }
        el.innerText = count + '+';
      }, 25);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

// ============================================================
// FAQ TOGGLE
// ============================================================
function toggleFaq(el) {
  const wasActive = el.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
  if (!wasActive) el.classList.add('active');
}

// ============================================================
// CONFIRM ON WHATSAPP
// ============================================================
function confirmOnWhatsApp() {
  const order = currentOrderData;
  if (!order) {
    alert('❌ Order data not found!');
    return;
  }

  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const list = items.map((i, idx) => `${idx+1}. ${i.name} (Qty:${i.qty}) - ₹${i.price*i.qty}`).join('\n');

  const msg = `🎉 *ORDER CONFIRMED*\nOrder: #${order.order_code}\n\n👤 ${order.customer_name}\n📞 ${order.customer_phone}\n📍 ${order.delivery_address}, ${order.pincode}\n🏙️ ${order.city}, ${order.state}\n\n📦 Items:\n${list}\n\n🚚 Delivery: ₹${order.delivery_charge}\n💰 Total: ₹${order.grand_total}\n✅ Payment: ${order.payment_status}`;

  const url = `https://wa.me/916374017186?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ============================================================
// BACK TO TOP
// ============================================================
window.addEventListener('scroll', () => {
  const btn = document.getElementById('backToTop');
  if (btn) btn.classList.toggle('show', window.scrollY > 500);
});
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// 📧 NEWSLETTER SUBSCRIBE
// ============================================================
async function subscribeNewsletter() {
  if (!_supabase && typeof supabase !== 'undefined') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  
  if (!_supabase) {
    alert('❌ Connection error. Please refresh the page.');
    return;
  }
  
  const emailInput = document.getElementById('newsletterEmail');
  const email = emailInput.value.trim();
  
  if (!email || !email.includes('@') || !email.includes('.')) {
    alert('❌ Please enter a valid email address!');
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('❌ Please enter a valid email address!');
    return;
  }
  
  const btn = document.querySelector('.newsletter-box button');
  const originalHTML = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
  }
  
  try {
    const { data: existing } = await _supabase
      .from('newsletter')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existing) {
      alert('✅ You are already subscribed!\n\nWe\'ll keep you updated with new products and offers.');
      emailInput.value = '';
      if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
      return;
    }
    
    const { error } = await _supabase
      .from('newsletter')
      .insert([{ 
        email: email.toLowerCase(),
        source: 'website_footer'
      }]);
    
    if (error) throw error;
    
    alert('🎉 Thank you for subscribing!\n\nYou\'ll receive updates about new products and exclusive offers.');
    emailInput.value = '';
    
  } catch (err) {
    console.error('Newsletter error:', err);
    
    if (err.message && err.message.includes('duplicate')) {
      alert('✅ You are already subscribed!');
    } else {
      alert('❌ Subscription failed. Please try again.');
    }
  } finally {
    if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; }
  }
}
