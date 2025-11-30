// POS JS with salesman support and fixed receipt printing (final version)
let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentDiscountIndex = null;

const API_URL = '/api';

// ===================== INIT =====================
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadSalesmen();

  // يضمن ربط السيرش مرة واحدة حتى لو العنصر اتبدّل/اتأخر
  bindSearchOnce();
  // يضمن أن حقل السيرش قابل للكلك ومفيش طبقة مغطيّاه
  ensureSearchClickable();

  // يضمن الربط والتحديث عند الرجوع Back/Forward من صفحة تانية
  window.addEventListener("pageshow", () => {
    bindSearchOnce();
    ensureSearchClickable();
    loadProducts();
    const q = document.getElementById("productSearch")?.value?.trim();
    if (q) handleSearch();
  });

  // احتفاظ بالـ delegation كشبكة أمان
  document.getElementById("productSearch")?.addEventListener("input", handleSearch);
  document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "productSearch") handleSearch();
  });

  document.getElementById("closeDayBtn")?.addEventListener("click", printDailySummary);
  updateCartSummary();
});

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
  } catch (error) {
    console.error('Error loading products:', error);
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
  const existingItem = cart.find(item => item._id === product._id);
  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
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

  if (cartCounter) cartCounter.textContent = cart.length;
  if (cartSubtotal) cartSubtotal.textContent = `${subtotal.toFixed(2)} ج.م`;
  if (cartTotal) cartTotal.textContent = `Total: ${subtotal.toFixed(2)} ج.م`;
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

// ===================== SALE PROCESSING =====================
async function processSale(method) {
  if (cart.length === 0) return;

  const salesmanSelect = document.getElementById("salesmanSelect");
  const salesmanName = salesmanSelect ? salesmanSelect.value : "";

  const saleData = {
    items: cart.map(item => ({
      productId: item._id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      total: item.price * item.qty
    })),
    total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
    paymentMethod: method,
    salesman: salesmanName,
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
      loadProducts(); // Refresh stock
      alert('Sale completed successfully!');
    } else {
      alert('Failed to process sale');
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
