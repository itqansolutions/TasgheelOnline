// POS JS with salesman support and fixed receipt printing (final version)
let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentDiscountIndex = null;

// API_URL is already defined in auth.js
// const API_URL = window.API_URL || '/api';

// ===================== INIT =====================
// SHIFT MANAGEMENT

async function checkOpenShift() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/shifts/current`, {
      headers: { 'x-auth-token': token }
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to fetch shift status (${response.status})`);
    }

    const shift = await response.json();

    if (!shift) {
      // No open shift, show modal
      document.getElementById('openShiftModal').style.display = 'flex';
      // Disable POS interactions
      disablePOS();
    } else {
      // Shift open, enable POS
      enablePOS();
    }
  } catch (error) {
    console.error('Error checking shift:', error);
    alert('Failed to check shift status: ' + error.message + '. Please ensure server is running and reload.');
  }
}

function disablePOS() {
  document.querySelectorAll('.btn').forEach(btn => {
    if (!btn.closest('#openShiftModal') && !btn.closest('.sidebar-footer')) {
      btn.disabled = true;
    }
  });
  document.getElementById('productSearch').disabled = true;
}

function enablePOS() {
  document.querySelectorAll('.btn').forEach(btn => btn.disabled = false);
  document.getElementById('productSearch').disabled = false;
  updateCartSummary(); // Re-evaluate cart buttons
}

async function submitOpenShift() {
  const startCash = parseFloat(document.getElementById('startCashInput').value);
  if (isNaN(startCash)) return alert('Please enter valid start cash');

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/shifts/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ startCash })
    });

    if (response.ok) {
      document.getElementById('openShiftModal').style.display = 'none';
      enablePOS();
      alert('Shift opened successfully!');
    } else {
      const data = await response.json();
      alert('Failed to open shift: ' + (data.msg || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error opening shift:', error);
    alert('Server error');
  }
}

function closeShift() {
  document.getElementById('closeShiftModal').style.display = 'flex';
}

async function submitCloseShift() {
  const actualCash = parseFloat(document.getElementById('actualCashInput').value);
  if (isNaN(actualCash)) return alert('Please enter actual cash amount');

  if (!confirm('Are you sure you want to close the shift?')) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/shifts/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ actualCash })
    });

    if (response.ok) {
      alert('Shift closed successfully!');
      location.reload(); // Reload to show Open Shift modal again
    } else {
      alert('Failed to close shift');
    }
  } catch (error) {
    console.error('Error closing shift:', error);
  }
}

async function checkTrialStatus() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/tenant/trial-status`, {
      headers: { 'x-auth-token': token }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.isExpired) {
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#f8f9fa;text-align:center;">
            <div style="background:white;padding:40px;border-radius:10px;box-shadow:0 0 20px rgba(0,0,0,0.1);max-width:500px;">
              <h1 style="color:#e74c3c;margin-bottom:20px;">Trial Expired</h1>
              <p style="font-size:18px;margin-bottom:30px;">Your trial period has ended. Please contact support to activate the full version.</p>
              <div style="font-weight:bold;color:#2c3e50;margin-bottom:20px;">
                <p>üìû +201126522373</p>
                <p>üìß info@itqansolutions.org</p>
              </div>
              <button onclick="window.location.href='index.html'" class="btn btn-primary" style="margin-top:20px;">Back to Login</button>
            </div>
          </div>
        `;
      } else if (data.daysRemaining <= 3) {
        // Show warning banner
        const banner = document.createElement('div');
        banner.style.cssText = `
          background: ${data.daysRemaining <= 1 ? '#e74c3c' : '#f39c12'};
          color: white;
          text-align: center;
          padding: 10px;
          font-weight: bold;
          position: sticky;
          top: 0;
          z-index: 999;
        `;
        banner.innerHTML = `
          ‚ö†Ô∏è Trial Version: ${data.daysRemaining} days remaining. 
          <a href="tel:+201126522373" style="color:white;text-decoration:underline;margin-left:10px;">Contact to Activate</a>
        `;
        document.body.prepend(banner);
      }
    }
  } catch (error) {
    console.error('Failed to check trial status:', error);
  }
}

// Ÿäÿ±ÿ®ÿ∑ ÿßŸÑÿ≥Ÿäÿ±ÿ¥ ŸÖÿ±ÿ© Ÿàÿßÿ≠ÿØÿ© ŸÅŸÇÿ∑
function bindSearchOnce() {
  const el = document.getElementById("productSearch");
  if (el && !el.dataset.bound) {
    el.addEventListener("input", handleSearch);
    el.dataset.bound = "1";
  }
}

// Ÿäÿ™ÿ£ŸÉÿØ ÿ•ŸÜ ÿßŸÑÿ≥Ÿäÿ±ÿ¥ ŸÅŸàŸÇ ÿ£Ÿä ÿ∑ÿ®ŸÇÿ© ŸàŸÖÿ¥ ŸÖÿ≠ÿ¨Ÿàÿ®
function ensureSearchClickable() {
  const el = document.getElementById("productSearch");
  if (el) {
    el.style.pointerEvents = "auto";
    el.style.position = "relative";
    el.style.zIndex = "1000";
    // ÿ•ÿ∑ŸÅÿßÿ° ÿ£Ÿä ŸÖŸàÿØÿßŸÑ ŸÖŸÖŸÉŸÜ ŸäŸÉŸàŸÜ ŸÑÿ≥Ÿá ÿ∏ÿßŸáÿ± ÿ®ÿπÿØ ÿßŸÑÿ±ÿ¨Ÿàÿπ
    ["discountModal", "auditModal"].forEach(id => {
      const m = document.getElementById(id);
      if (m && getComputedStyle(m).display !== "none") {
        m.style.display = "none";
      }
    });
    // ÿ∂ŸÖÿßŸÜ ÿßŸÑÿ™ÿ±ŸÉŸäÿ≤ ÿ£ŸàŸÑ ÿ∂ÿ∫ÿ∑ ŸÅŸä ÿ®ÿπÿ∂ ÿßŸÑÿ®Ÿäÿ¶ÿßÿ™
    el.addEventListener("mousedown", () => el.focus(), { once: true });
  }
}

// ===================== LOAD PRODUCTS =====================
async function loadProducts() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/products`, {
      headers: { 'x-auth-token': token }
    });
    if (!response.ok) throw new Error('Failed to fetch products');

    const products = await response.json();
    allProducts = products;
    filteredProducts = products;
    renderProducts();

    if (products.length === 0) {
      console.warn('No products found in database');
    }
  } catch (error) {
    console.error('Error loading products:', error);
    alert('Failed to load products. Ensure server is running at ' + API_URL);
    // Fallback to empty or show error
    allProducts = [];
    filteredProducts = [];
    renderProducts();
  }
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (filteredProducts.length === 0) {
    grid.innerHTML = '<p style="text-align:center; color:#666;">No products found</p>';
    return;
  }

  filteredProducts.forEach((product) => {
    const div = document.createElement("div");
    div.className = "product-card";
    if (product.stock <= 0) div.classList.add("out-of-stock");
    div.onclick = () => addToCart(product);
    div.innerHTML = `
      <h4>${product.name}</h4>
      <p>${product.price.toFixed(2)} ÿ¨.ŸÖ</p>
      <p>Stock: ${product.stock}</p>
    `;
    grid.appendChild(div);
  });
}

function handleSearch() {
  const query = document.getElementById("productSearch")?.value?.trim().toLowerCase() || "";
  filteredProducts = allProducts.filter(p =>
    (p.name && p.name.toLowerCase().includes(query)) ||
    (p.code && String(p.code).toLowerCase().includes(query)) ||
    (p.barcode && String(p.barcode).toLowerCase().includes(query))
  );
  renderProducts();
}

function searchProductByBarcode(barcode) {
  const found = allProducts.find(p => p.barcode === barcode);
  if (found) {
    addToCart(found);
    return true;
  }
  return false;
}

async function loadSalesmen() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/salesmen`, {
      headers: { 'x-auth-token': token }
    });
    if (response.ok) {
      const salesmen = await response.json();
      const select = document.getElementById("salesmanSelect");
      if (!select) return;
      select.innerHTML = `<option value="">--</option>`;
      salesmen.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.name;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
    }
  } catch (error) {
    console.error('Error loading salesmen:', error);
  }
}

// ===================== CART LOGIC =====================
function addToCart(product) {
  console.log('Adding to cart:', product);
  const existingItem = cart.find(item => item._id === product._id);
  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  console.log('Cart updated:', cart);
  updateCartSummary();
}

function updateCartSummary() {
  const cartItemsContainer = document.getElementById("cartItems");
  const cartCounter = document.getElementById("cartCounter");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartTotal = document.getElementById("cartTotal");
  const cartEmptyText = document.getElementById("cartEmptyText");

  if (!cartItemsContainer) return;

  cartItemsContainer.innerHTML = "";
  let subtotal = 0;

  if (cart.length === 0) {
    cartEmptyText.style.display = "block";
    if (cartCounter) cartCounter.textContent = "0";
    if (cartSubtotal) cartSubtotal.textContent = "0.00 ÿ¨.ŸÖ";
    if (cartTotal) cartTotal.textContent = "Total: 0.00 ÿ¨.ŸÖ";
    disableActionButtons(true);
    return;
  }

  cartEmptyText.style.display = "none";
  disableActionButtons(false);

  cart.forEach((item, index) => {
    subtotal += item.price * item.qty;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div>
        <strong>${item.name}</strong><br>
        <small>${item.price.toFixed(2)} x ${item.qty}</small>
      </div>
      <div>
        <span>${(item.price * item.qty).toFixed(2)}</span>
        <button onclick="removeFromCart(${index})" class="btn-danger" style="padding:2px 6px;margin-left:5px;">x</button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });

  let discountAmount = 0;
  if (window.cartDiscount) {
    if (window.cartDiscount.type === 'percent') {
      discountAmount = subtotal * (window.cartDiscount.value / 100);
    } else if (window.cartDiscount.type === 'value') {
      discountAmount = window.cartDiscount.value;
    }
  }

  let total = subtotal - discountAmount;
  if (total < 0) total = 0;

  if (cartCounter) cartCounter.textContent = cart.length;
  if (cartSubtotal) cartSubtotal.textContent = `${subtotal.toFixed(2)} ÿ¨.ŸÖ`;

  const discountEl = document.getElementById("cartDiscount");
  if (discountEl) discountEl.textContent = `${discountAmount.toFixed(2)} ÿ¨.ŸÖ`;

  if (cartTotal) cartTotal.textContent = `Total: ${total.toFixed(2)} ÿ¨.ŸÖ`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartSummary();
}

function clearCart() {
  cart = [];
  updateCartSummary();
}

function disableActionButtons(disabled) {
  ["cashBtn", "cardBtn", "mobileBtn", "holdBtn", "clearCartBtn"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });
}

// ===================== DISCOUNT LOGIC =====================
function openDiscountModal() {
  const modal = document.getElementById("discountModal");
  if (modal) {
    modal.style.display = "flex";
    // Reset fields
    document.getElementById("discountType").value = "none";
    document.getElementById("discountValue").value = "";
  }
}

function closeDiscountModal() {
  const modal = document.getElementById("discountModal");
  if (modal) modal.style.display = "none";
}

function saveDiscount() {
  const type = document.getElementById("discountType").value;
  const value = parseFloat(document.getElementById("discountValue").value) || 0;

  // Apply discount to the entire cart (simple implementation)
  // In a more complex system, we might apply per item or to subtotal
  // Here we will just store it globally or apply to subtotal for display

  // For this implementation, let's apply it as a global discount on the cart total
  // We need to store this discount state
  window.cartDiscount = { type, value };

  updateCartSummary();
  closeDiscountModal();
}

// ===================== SALE PROCESSING =====================
async function processSale(method) {
  if (cart.length === 0) return;

  const salesmanSelect = document.getElementById("salesmanSelect");
  const salesmanName = salesmanSelect ? salesmanSelect.value : "";

  // Calculate totals with discount
  let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discountAmount = 0;

  if (window.cartDiscount) {
    if (window.cartDiscount.type === 'percent') {
      discountAmount = subtotal * (window.cartDiscount.value / 100);
    } else if (window.cartDiscount.type === 'value') {
      discountAmount = window.cartDiscount.value;
    }
  }

  let total = subtotal - discountAmount;
  if (total < 0) total = 0;

  const saleData = {
    items: cart.map(item => ({
      productId: item._id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      total: item.price * item.qty,
      code: item.barcode // Send barcode as code
    })),
    total: total,
    paymentMethod: method,
    salesman: salesmanName,
    discount: window.cartDiscount, // Send discount info
    date: new Date()
  };

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(saleData)
    });

    if (response.ok) {
      const sale = await response.json();
      printReceipt(sale);
      clearCart();
      window.cartDiscount = null; // Reset discount
      loadProducts(); // Refresh stock
      // alert('Sale completed successfully!'); 
    } else {
      const errData = await response.json();
      alert(`Failed to process sale: ${errData.msg || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error processing sale:', error);
    alert('Error processing sale: ' + error.message);
  }

}

async function printDailySummary() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/sales/daily`, {
      headers: { 'x-auth-token': token }
    });

    if (!response.ok) throw new Error('Failed to fetch daily summary');

    const data = await response.json();
    const lang = localStorage.getItem('pos_language') || 'en';
    const t = (en, ar) => (lang === 'ar' ? ar : en);

    const shopName = localStorage.getItem('shopName') || 'My Shop';
    const dateFormatted = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');

    const html = `
      <html>
      <head>
        <title>${t("Daily Summary", "ŸÖŸÑÿÆÿµ ÿßŸÑŸäŸàŸÖ")}</title>
        <style>
          body { font-family: Arial, sans-serif; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; text-align: center; }
          .container { width: 72mm; margin: 0 auto; }
          h2 { margin: 5px 0; }
          .summary-item { display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; }
          hr { border-top: 1px dashed #000; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${shopName}</h2>
          <h3>${t("Daily Summary", "ŸÖŸÑÿÆÿµ ÿßŸÑŸäŸàŸÖ")}</h3>
          <p>${dateFormatted}</p>
          <hr/>
          <div class="summary-item">
            <span>${t("Total Orders", "ÿπÿØÿØ ÿßŸÑÿ∑ŸÑÿ®ÿßÿ™")}</span>
            <span>${data.totalOrders}</span>
          </div>
          <div class="summary-item">
            <span>${t("Total Sales", "ÿ•ÿ¨ŸÖÿßŸÑŸä ÿßŸÑŸÖÿ®Ÿäÿπÿßÿ™")}</span>
            <span>${data.totalSales.toFixed(2)}</span>
          </div>
          <hr/>
          <p>${t("Printed at", "ÿ∑ÿ®ÿπ ŸÅŸä")}: ${new Date().toLocaleTimeString()}</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();

  } catch (error) {
    console.error('Error printing daily summary:', error);
    alert('Failed to print daily summary');
  }
}

async function loadSettings() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/settings`, {
      headers: { 'x-auth-token': token }
    });
    if (response.ok) {
      const settings = await response.json();
      if (settings.shopName) localStorage.setItem('shopName', settings.shopName);
      if (settings.shopAddress) localStorage.setItem('shopAddress', settings.shopAddress);
      if (settings.shopLogo) localStorage.setItem('shopLogo', settings.shopLogo);
      if (settings.footerMessage) localStorage.setItem('footerMessage', settings.footerMessage);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  checkTrialStatus();
  checkOpenShift();
  loadProducts();
  loadSalesmen();

  // Event Listeners
  document.getElementById('productSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredProducts = allProducts.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.includes(term))
    );
    renderProducts(filteredProducts);
  });

  document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
    const cat = e.target.value;
    if (cat) {
      filteredProducts = allProducts.filter(p => p.category === cat);
    } else {
      filteredProducts = allProducts;
    }
    renderProducts(filteredProducts);
  });

  document.getElementById('payButton')?.addEventListener('click', processSale);
  document.getElementById('holdButton')?.addEventListener('click', () => alert('Hold feature coming soon'));
  document.getElementById('discountButton')?.addEventListener('click', openDiscountModal);

  // Shift Modals
  document.getElementById('confirmOpenShift')?.addEventListener('click', submitOpenShift);
  document.getElementById('confirmCloseShift')?.addEventListener('click', submitCloseShift);
  document.getElementById('closeShiftBtn')?.addEventListener('click', closeShift);

  // Language
  const lang = localStorage.getItem('pos_language') || 'en';
  updatePOSLanguage(lang);
});
 
 a s y n c   f u n c t i o n   p r i n t R e c e i p t ( r e c e i p t )   {  
     t r y   {  
         / /   I f   p a s s e d   a n   I D   i n s t e a d   o f   o b j e c t ,   f e t c h   i t   ( j u s t   i n   c a s e )  
         i f   ( t y p e o f   r e c e i p t   = = =   ' s t r i n g ' )   {  
                 c o n s t   t o k e n   =   l o c a l S t o r a g e . g e t I t e m ( ' t o k e n ' ) ;  
                 c o n s t   r e s p o n s e   =   a w a i t   f e t c h ( ` $ { A P I _ U R L } / s a l e s / $ { r e c e i p t } ` ,   {  
                         h e a d e r s :   {   ' x - a u t h - t o k e n ' :   t o k e n   }  
                 } ) ;  
                 i f   ( ! r e s p o n s e . o k )   {  
                         a l e r t ( ' F a i l e d   t o   l o a d   r e c e i p t   f o r   p r i n t i n g ' ) ;  
                         r e t u r n ;  
                 }  
                 r e c e i p t   =   a w a i t   r e s p o n s e . j s o n ( ) ;  
         }  
  
         c o n s t   s h o p N a m e   =   l o c a l S t o r a g e . g e t I t e m ( ' s h o p N a m e ' )   | |   ' M y   S h o p ' ;  
         c o n s t   s h o p A d d r e s s   =   l o c a l S t o r a g e . g e t I t e m ( ' s h o p A d d r e s s ' )   | |   ' ' ;  
         c o n s t   s h o p L o g o   =   l o c a l S t o r a g e . g e t I t e m ( ' s h o p L o g o ' )   | |   ' ' ;  
         c o n s t   r e c e i p t F o o t e r M e s s a g e   =   l o c a l S t o r a g e . g e t I t e m ( ' f o o t e r M e s s a g e ' )   | |   ' ' ;  
  
         c o n s t   l a n g   =   l o c a l S t o r a g e . g e t I t e m ( ' p o s _ l a n g u a g e ' )   | |   ' e n ' ;  
         c o n s t   t   =   ( e n ,   a r )   = >   ( l a n g   = = =   ' a r '   ?   a r   :   e n ) ;  
         c o n s t   p a y m e n t M a p   =   {  
             c a s h :   t ( " C a s h " ,   " 8  8 7Ø 8y" ) ,  
             c a r d :   t ( " C a r d " ,   " 7® 7∑ 7ß 8 7© " ) ,  
             m o b i l e :   t ( " M o b i l e " ,   " 8& 8∆7® 7ß 8y8 " )  
         } ;  
  
         l e t   t o t a l D i s c o u n t   =   0 ;  
         l e t   s u b t o t a l   =   0 ;  
  
         c o n s t   i t e m s H t m l   =   r e c e i p t . i t e m s . m a p ( i t e m   = >   {  
             c o n s t   o r i g i n a l T o t a l   =   i t e m . p r i c e   *   i t e m . q t y ;  
             l e t   d i s c o u n t S t r   =   " - " ;  
             l e t   d i s c o u n t A m o u n t P e r U n i t   =   0 ;  
  
             i f   ( i t e m . d i s c o u n t ? . t y p e   = = =   " p e r c e n t " )   {  
                 d i s c o u n t A m o u n t P e r U n i t   =   i t e m . p r i c e   *   ( i t e m . d i s c o u n t . v a l u e   /   1 0 0 ) ;  
                 d i s c o u n t S t r   =   ` $ { i t e m . d i s c o u n t . v a l u e } % ` ;  
             }   e l s e   i f   ( i t e m . d i s c o u n t ? . t y p e   = = =   " v a l u e " )   {  
                 d i s c o u n t A m o u n t P e r U n i t   =   i t e m . d i s c o u n t . v a l u e ;  
                 d i s c o u n t S t r   =   ` $ { d i s c o u n t A m o u n t P e r U n i t . t o F i x e d ( 2 ) }   $ { l a n g   = = =   ' a r '   ?   ' 7¨ . 8& '   :   ' E G P ' } ` ;  
             }  
  
             c o n s t   i t e m D i s c o u n t T o t a l   =   d i s c o u n t A m o u n t P e r U n i t   *   i t e m . q t y ;  
             t o t a l D i s c o u n t   + =   i t e m D i s c o u n t T o t a l ;  
             s u b t o t a l   + =   o r i g i n a l T o t a l ;  
  
             r e t u r n   `  
                 < t r >  
                     < t d > $ { i t e m . c o d e   | |   ' - ' } < / t d >  
                     < t d > $ { i t e m . n a m e   | |   ' - ' } < / t d >  
                     < t d > $ { i t e m . q t y } < / t d >  
                     < t d > $ { i t e m . p r i c e . t o F i x e d ( 2 ) } < / t d >  
                     < t d > $ { o r i g i n a l T o t a l . t o F i x e d ( 2 ) } < / t d >  
                     < t d > $ { d i s c o u n t S t r } < / t d >  
                 < / t r >  
             ` ;  
         } ) . j o i n ( ' ' ) ;  
  
         c o n s t   d a t e F o r m a t t e d   =   n e w   D a t e ( r e c e i p t . d a t e ) . t o L o c a l e S t r i n g ( l a n g   = = =   ' a r '   ?   ' a r - E G '   :   ' e n - U S ' ,   {  
             y e a r :   ' n u m e r i c ' ,   m o n t h :   ' 2 - d i g i t ' ,   d a y :   ' 2 - d i g i t ' ,   h o u r :   ' 2 - d i g i t ' ,   m i n u t e :   ' 2 - d i g i t ' ,   h o u r 1 2 :   t r u e  
         } ) ;  
  
         c o n s t   h t m l   =   `  
             < h t m l >  
             < h e a d >  
                 < t i t l e > $ { t ( " R e c e i p t " ,   " 7ß 8 7• 8y7µ 7ß 8 " ) } < / t i t l e >  
                 < s t y l e >  
                     b o d y   {   f o n t - f a m i l y :   A r i a l ,   s a n s - s e r i f ;   f o n t - s i z e :   1 1 . 5 p x ;   f o n t - w e i g h t :   b o l d ;   l i n e - h e i g h t :   1 . 7 ;   d i r e c t i o n :   $ { l a n g   = = =   ' a r '   ?   ' r t l '   :   ' l t r ' } ;   m a r g i n :   0 ;   p a d d i n g :   0 ;   }  
                     . r e c e i p t - c o n t a i n e r   {   w i d t h :   7 2 m m ;   m a r g i n :   0 ;   p a d d i n g :   5 p x   0 ;   b a c k g r o u n d :   # f f f ;   b o x - s i z i n g :   b o r d e r - b o x ;   }  
                     . c e n t e r   {   t e x t - a l i g n :   c e n t e r ;   }  
                     i m g . l o g o   {   m a x - h e i g h t :   7 0 p x ;   d i s p l a y :   b l o c k ;   m a r g i n :   0   a u t o   5 p x ;   }  
                     h 2   {   m a r g i n :   3 p x   0 ;   f o n t - s i z e :   1 5 p x ;   f o n t - w e i g h t :   b o l d ;   w i d t h :   1 0 0 % ;   w o r d - w r a p :   b r e a k - w o r d ;   }  
                     p   {   m a r g i n :   2 p x   8 p x ;   f o n t - w e i g h t :   b o l d ;   }  
                     t a b l e   {   w i d t h :   9 8 % ;   b o r d e r - c o l l a p s e :   c o l l a p s e ;   m a r g i n :   8 p x   a u t o   4 p x ;   t a b l e - l a y o u t :   f i x e d ;   }  
                     t h ,   t d   {   b o r d e r :   1 p x   d a s h e d   # 4 4 4 ;   p a d d i n g :   4 p x   5 p x ;   t e x t - a l i g n :   c e n t e r ;   f o n t - s i z e :   1 1 p x ;   w h i t e - s p a c e :   n o r m a l ;   w o r d - b r e a k :   b r e a k - w o r d ;   f o n t - w e i g h t :   b o l d ;   }  
                     t h : n t h - c h i l d ( 1 ) ,   t d : n t h - c h i l d ( 1 )   {   w i d t h :   1 4 % ;   }  
                     t h : n t h - c h i l d ( 2 ) ,   t d : n t h - c h i l d ( 2 )   {   w i d t h :   2 8 % ;   }  
                     t h : n t h - c h i l d ( 3 ) ,   t d : n t h - c h i l d ( 3 )   {   w i d t h :   1 0 % ;   }  
                     t h : n t h - c h i l d ( 4 ) ,   t d : n t h - c h i l d ( 4 )   {   w i d t h :   1 4 % ;   }  
                     t h : n t h - c h i l d ( 5 ) ,   t d : n t h - c h i l d ( 5 )   {   w i d t h :   1 6 % ;   }  
                     t h : n t h - c h i l d ( 6 ) ,   t d : n t h - c h i l d ( 6 )   {   w i d t h :   1 8 % ;   }  
                     . s u m m a r y   {   m a r g i n :   1 0 p x   8 p x   0 ;   f o n t - s i z e :   1 2 p x ;   f o n t - w e i g h t :   b o l d ;   }  
                     . f o o t e r   {   t e x t - a l i g n :   c e n t e r ;   m a r g i n :   1 2 p x   0   0 ;   f o n t - s i z e :   1 0 . 5 p x ;   b o r d e r - t o p :   1 p x   d a s h e d   # c c c ;   p a d d i n g - t o p :   6 p x ;   f o n t - w e i g h t :   b o l d ;   }  
                     @ m e d i a   p r i n t   {   @ p a g e   {   s i z e :   7 2 m m   a u t o ;   m a r g i n :   0 ;   }   b o d y   {   m a r g i n :   0 ;   p a d d i n g :   0 ;   }   a   {   c o l o r :   b l a c k ;   t e x t - d e c o r a t i o n :   n o n e ;   }   }  
                 < / s t y l e >  
             < / h e a d >  
             < b o d y >  
                 < d i v   c l a s s = " r e c e i p t - c o n t a i n e r " >  
                     $ { s h o p L o g o   ?   ` < i m g   s r c = " $ { s h o p L o g o } "   c l a s s = " l o g o " > `   :   ' ' }  
                     < h 2   c l a s s = " c e n t e r " > $ { s h o p N a m e } < / h 2 >  
                     < p   c l a s s = " c e n t e r " > $ { s h o p A d d r e s s } < / p >  
                     < h r / >  
                     < p > $ { t ( " R e c e i p t   N o " ,   " 7± 8 8&   7ß 8 8~7ß 7æ8∆7± 7© " ) } :   $ { r e c e i p t . r e c e i p t I d } < / p >  
                     < p > $ { t ( " C a s h i e r " ,   " 7ß 8 8í7ß 7¥ 8y7± " ) } :   $ { r e c e i p t . c a s h i e r } < / p >  
                     < p > $ { t ( " S a l e s m a n " ,   " 7ß 8 7® 7ß 7¶ 7π " ) } :   $ { r e c e i p t . s a l e s m a n   | |   ' - ' } < / p >  
                     < p > $ { t ( " D a t e " ,   " 7ß 8 7æ7ß 7± 8y7Æ " ) } :   $ { d a t e F o r m a t t e d } < / p >  
                     < p > $ { t ( " P a y m e n t   M e t h o d " ,   " 7∑ 7± 8y8 7©   7ß 8 7Ø 8~7π " ) } :   $ { p a y m e n t M a p [ r e c e i p t . m e t h o d ]   | |   ' - ' } < / p >  
                     < t a b l e >  
                         < t h e a d >  
                             < t r >  
                                 < t h > $ { t ( " C o d e " ,   " 7ß 8 8í8∆7Ø " ) } < / t h >  
                                 < t h > $ { t ( " N a m e " ,   " 7ß 8 7ß 7≥ 8& " ) } < / t h >  
                                 < t h > $ { t ( " Q t y " ,   " 7ß 8 8í8& 8y7© " ) } < / t h >  
                                 < t h > $ { t ( " U n i t   P r i c e " ,   " 7≥ 7π 7±   7ß 8 8∆7≠ 7Ø 7© " ) } < / t h >  
                                 < t h > $ { t ( " T o t a l " ,   " 7ß 8 7• 7¨ 8& 7ß 8 8y" ) } < / t h >  
                                 < t h > $ { t ( " D i s c o u n t " ,   " 7ß 8 7Æ 7µ 8& " ) } < / t h >  
                             < / t r >  
                         < / t h e a d >  
                         < t b o d y > $ { i t e m s H t m l } < / t b o d y >  
                     < / t a b l e >  
                     < d i v   c l a s s = " s u m m a r y " >  
                         < p > $ { t ( " S u b t o t a l " ,   " 7ß 8 7• 7¨ 8& 7ß 8 8y  7ß 8 8~7± 7π 8y" ) } :   $ { s u b t o t a l . t o F i x e d ( 2 ) }   $ { l a n g   = = =   ' a r '   ?   ' 7¨ . 8& '   :   ' E G P ' } < / p >  
                         < p > $ { t ( " T o t a l   D i s c o u n t " ,   " 7• 7¨ 8& 7ß 8 8y  7ß 8 7Æ 7µ 8& " ) } :   $ { t o t a l D i s c o u n t . t o F i x e d ( 2 ) }   $ { l a n g   = = =   ' a r '   ?   ' 7¨ . 8& '   :   ' E G P ' } < / p >  
                         < p > $ { t ( " T o t a l " ,   " 7ß 8 7• 7¨ 8& 7ß 8 8y  7ß 8 8  8! 7ß 7¶ 8y" ) } :   $ { r e c e i p t . t o t a l . t o F i x e d ( 2 ) }   $ { l a n g   = = =   ' a r '   ?   ' 7¨ . 8& '   :   ' E G P ' } < / p >  
                     < / d i v >  
                     < h r / >  
                     $ { r e c e i p t F o o t e r M e s s a g e   ?   ` < p   c l a s s = " f o o t e r "   s t y l e = " f o n t - s i z e : 1 3 p x ;   f o n t - w e i g h t :   b o l d ; " > $ { r e c e i p t F o o t e r M e s s a g e } < / p > `   :   ' ' }  
                     < p   c l a s s = " f o o t e r " >  
                         < s t r o n g > T a s h g h e e l   P O S   & c o p y ;   2 0 2 5 < / s t r o n g > < b r >  
                         K∫    < a   h r e f = " t e l : + 2 0 1 1 2 6 5 2 2 3 7 3 " > 0 1 1 2 6 5 2 2 3 7 3 < / a >   /   < a   h r e f = " t e l : + 2 0 1 1 5 5 2 5 3 8 8 6 " > 0 1 1 5 5 2 5 3 8 8 6 < / a > < b r >  
                         < s p a n   i d = " f o o t e r T e x t " > $ { t ( " D e s i g n e d   a n d   d e v e l o p e d   b y   I t q a n " ,   " 7æ7µ 8& 8y8&   8∆7æ7∑ 8∆8y7±   I t q a n " ) } < / s p a n >  
                     < / p >  
                 < / d i v >  
                 < s c r i p t > w i n d o w . o n l o a d   =   ( )   = >   w i n d o w . p r i n t ( ) ; < / s c r i p t >  
             < / b o d y >  
             < / h t m l >  
         ` ;  
  
         c o n s t   p r i n t W i n d o w   =   w i n d o w . o p e n ( ' ' ,   ' _ b l a n k ' ) ;  
         p r i n t W i n d o w . d o c u m e n t . w r i t e ( h t m l ) ;  
         p r i n t W i n d o w . d o c u m e n t . c l o s e ( ) ;  
  
     }   c a t c h   ( e r r o r )   {  
         c o n s o l e . e r r o r ( ' E r r o r   p r i n t i n g   r e c e i p t : ' ,   e r r o r ) ;  
         a l e r t ( ' F a i l e d   t o   p r i n t   r e c e i p t ' ) ;  
     }  
 }  
 