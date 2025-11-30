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

// ... (rest of the file)

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
