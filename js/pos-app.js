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
      alert('Failed to open shift');
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
    alert('Server error');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadSalesmen();
  bindSearchOnce();
  ensureSearchClickable();
  checkTrialStatus();
  checkOpenShift(); // Check shift status
});

async function checkTrialStatus() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`${API_URL}/tenant/trial-status`, {
      headers: { 'x-auth-token': token }
    });

    if (response.ok) {
      const data = await response.json();

      if (data.isExpired) {
        document.getElementById('licenseCheckOverlay').style.display = 'flex';
        document.getElementById('licenseCheckOverlay').innerHTML = `
          <div style="background:white;padding:40px;border-radius:10px;color:black;max-width:500px;">
            <h2 style="color:#e74c3c;margin-bottom:20px;">🔒 Trial Expired</h2>
            <p style="font-size:1.2rem;margin-bottom:20px;">Your 7-day trial period has ended.</p>
            <p>Please contact ITQAN Solutions to activate your license.</p>
            <div style="margin-top:30px;padding:20px;background:#f8f9fa;border-radius:5px;">
              <p><strong>Contact Us:</strong></p>
              <p>📞 +201126522373</p>
              <p>📧 info@itqansolutions.org</p>
            </div>
            <button onclick="window.location.href='index.html'" class="btn btn-primary" style="margin-top:20px;">Back to Login</button>
          </div>
        `;
      } else {
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
          ⚠️ Trial Version: ${data.daysRemaining} days remaining. 
          <a href="tel:+201126522373" style="color:white;text-decoration:underline;margin-left:10px;">Contact to Activate</a>
        `;
        document.body.prepend(banner);
      }
    }
  } catch (error) {
    console.error('Failed to check trial status:', error);
  }
}

// يربط السيرش مرة واحدة فقط
function bindSearchOnce() {
  const el = document.getElementById("productSearch");
  if (el && !el.dataset.bound) {
    el.addEventListener("input", handleSearch);
    el.dataset.bound = "1";
  }
}

// يتأكد إن السيرش فوق أي طبقة ومش محجوب
function ensureSearchClickable() {
  const el = document.getElementById("productSearch");
  if (el) {
    el.style.pointerEvents = "auto";
    el.style.position = "relative";
    el.style.zIndex = "1000";
    // إطفاء أي مودال ممكن يكون لسه ظاهر بعد الرجوع
    ["discountModal", "auditModal"].forEach(id => {
      const m = document.getElementById(id);
      if (m && getComputedStyle(m).display !== "none") {
        m.style.display = "none";
      }
    });
    // ضمان التركيز أول ضغط في بعض البيئات
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
      <p>${product.price.toFixed(2)} ج.م</p>
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
    if (cartSubtotal) cartSubtotal.textContent = "0.00 ج.م";
    if (cartTotal) cartTotal.textContent = "Total: 0.00 ج.م";
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
  if (cartSubtotal) cartSubtotal.textContent = `${subtotal.toFixed(2)} ج.م`;

  const discountEl = document.getElementById("cartDiscount");
  if (discountEl) discountEl.textContent = `${discountAmount.toFixed(2)} ج.م`;

  if (cartTotal) cartTotal.textContent = `Total: ${total.toFixed(2)} ج.م`;
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
    alert('Error processing sale');
  }
}

function printReceipt(sale) {
  const lang = localStorage.getItem('pos_language') || 'en';
  const t = (en, ar) => (lang === 'ar' ? ar : en);
  const shopName = localStorage.getItem('shopName') || 'My Shop';

  const html = `
    <html>
    <head>
      <title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; text-align: center; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; }
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 40px;
          color: rgba(0, 0, 0, 0.1);
          z-index: -1;
          white-space: nowrap;
          border: 5px solid rgba(0, 0, 0, 0.1);
          padding: 20px;
        }
        .trial-notice {
          border: 2px dashed #000;
          padding: 10px;
          margin: 10px 0;
          font-weight: bold;
        }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border-bottom: 1px dashed #000; padding: 5px; text-align: inherit; }
      </style>
    </head>
    <body>
      <div class="watermark">
        TASHGHEEL POS<br>
        FREE TRIAL VERSION<br>
        NOT A REAL RECEIPT
      </div>
      
      <h2>${shopName}</h2>
      <p>${new Date(sale.date).toLocaleString()}</p>
      <p>Order #${sale._id.slice(-6)}</p>
      
      <div class="trial-notice">
        ${t("FREE TRIAL VERSION", "نسخة تجريبية مجانية")}<br>
        ${t("NOT A VALID RECEIPT", "إيصال غير صالح")}
      </div>

      <table>
        <thead>
          <tr>
            <th>${t("Item", "الصنف")}</th>
            <th>${t("Qty", "الكمية")}</th>
            <th>${t("Price", "السعر")}</th>
            <th>${t("Total", "الإجمالي")}</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.qty}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>${(item.price * item.qty).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h3>${t("Total", "الإجمالي")}: ${sale.total.toFixed(2)}</h3>
      <p>${t("Salesman", "البائع")}: ${sale.salesman || '-'}</p>
      
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
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
        <title>${t("Daily Summary", "ملخص اليوم")}</title>
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
          <h3>${t("Daily Summary", "ملخص اليوم")}</h3>
          <p>${dateFormatted}</p>
          <hr/>
          <div class="summary-item">
            <span>${t("Total Orders", "عدد الطلبات")}</span>
            <span>${data.totalOrders}</span>
          </div>
          <div class="summary-item">
            <span>${t("Total Sales", "إجمالي المبيعات")}</span>
            <span>${data.totalSales.toFixed(2)}</span>
          </div>
          <hr/>
          <p>${t("Printed at", "طبع في")}: ${new Date().toLocaleTimeString()}</p>
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
