// POS JS with salesman support and fixed receipt printing (final version)
console.log("POS Script Starting...");
let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentDiscountIndex = null;
let isReadOnly = false;
window.cart = cart; // Debug access
// Ensure API_URL is available
// Ensure API_URL is available
if (typeof API_URL === 'undefined') {
  window.API_URL = '/api';
}

// ===================== INIT =====================
// SHIFT MANAGEMENT

async function checkOpenShift() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/shifts/current`, {
      headers: { 'x-auth-token': token }
    });

    const shift = await response.json();

    // Get current user safely from storage, fallback to DOM if needed, but storage is source of truth
    let currentUser = 'User';
    try {
      const userObj = JSON.parse(localStorage.getItem('currentUser'));
      if (userObj && userObj.username) currentUser = userObj.username;
    } catch (e) {
      console.error("Error parsing user", e);
    }

    console.log(`Shift Check: Shift Cashier='${shift?.cashier}', Current User='${currentUser}'`);

    if (!shift) {
      // No open shift, show modal
      document.getElementById('openShiftModal').style.display = 'flex';
      disablePOS();
    } else {
      // Shift exists. Check ownership.
      if (shift.cashier === currentUser) {
        // Same user.
        // Check if we already resumed this session
        if (sessionStorage.getItem('shiftResumed') === 'true') {
          console.log("Shift already resumed this session.");
          enablePOS();
          return;
        }

        // Offer to Resume.
        document.getElementById('resumeShiftTime').textContent = new Date(shift.startTime).toLocaleString();
        document.getElementById('resumeShiftModal').style.display = 'flex';
        disablePOS();
      } else {
        // Different user. Read Only Mode.
        console.log("Read Only Mode Activated");
        isReadOnly = true;
        enableReadOnlyMode(shift.cashier);
      }
    }
  } catch (error) {
    console.error('Error checking shift:', error);
    alert('Failed to check shift status: ' + error.message);
  }
}

function enableReadOnlyMode(ownerName) {
  const banner = document.getElementById('readOnlyBanner');
  const userSpan = document.getElementById('readOnlyUser');
  if (banner && userSpan) {
    userSpan.textContent = ownerName;
    banner.style.display = 'block';
  }

  // Enable search and navigation, but disable actions
  enablePOS(); // First enable everything

  // Disable transaction buttons
  const buttonsToDisable = ['cashBtn', 'cardBtn', 'mobileBtn', 'holdBtn', 'clearCartBtn', 'closeShiftBtn', 'scanBtn'];
  buttonsToDisable.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = true;
    // Also disable parent button if it's the span inside
    if (id === 'closeShiftBtn') {
      const closeBtn = btn.closest('button');
      if (closeBtn) closeBtn.disabled = true;
    }
  });

  // Disable adding to cart?
  // Maybe allow adding to see total but prevent checkout.
  // The requirement says "deny making any transaction". 
  // I will allow adding to cart to calculator totals, but checkout is blocked by disabled buttons + check in processSale.
}

function resumeShift() {
  document.getElementById('resumeShiftModal').style.display = 'none';
  sessionStorage.setItem('shiftResumed', 'true');
  enablePOS();
}

function closeShiftFromResume() {
  document.getElementById('resumeShiftModal').style.display = 'none';
  closeShift(); // Opens the close modal logic
}

function disablePOS() {
  document.querySelectorAll('.btn').forEach(btn => {
    if (!btn.closest('#openShiftModal') && !btn.closest('#resumeShiftModal') && !btn.closest('.sidebar-footer')) {
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
      sessionStorage.setItem('shiftResumed', 'true');
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

window.closeShift = async function () {
  try {
    const token = localStorage.getItem('token');
    if (!token) { console.error("No token"); return; }

    // Check if API_URL is defined
    if (typeof API_URL === 'undefined') {
      alert('System Error: API_URL not defined. Reload page.');
      return;
    }

    const response = await fetch(`${API_URL}/shifts/summary`, {
      headers: { 'x-auth-token': token }
    });

    if (response.ok) {
      const data = await response.json();

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val.toFixed(2);
      };

      setVal('summaryStartCash', data.startCash);
      setVal('summaryCashSales', data.cashSales);
      setVal('summaryCardSales', data.cardSales);
      setVal('summaryMobileSales', data.mobileSales);
      setVal('summaryReturns', data.totalRefunds);
      setVal('summaryExpenses', data.expensesTotal);
      setVal('summaryExpectedCash', data.expectedCash);

      const modal = document.getElementById('closeShiftModal');
      if (modal) modal.style.display = 'flex';
    } else {
      alert('Failed to load shift summary');
    }
  } catch (err) {
    console.error(err);
    alert('Error loading summary');
  }
};

window.submitCloseShift = async function () {
  const actualCashInput = document.getElementById('actualCashInput');
  const actualCash = parseFloat(actualCashInput ? actualCashInput.value : 0);
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
      sessionStorage.removeItem('shiftResumed');
      location.reload(); // Reload to show Open Shift modal again
    } else {
      alert('Failed to close shift');
    }
  } catch (error) {
    console.error('Error closing shift:', error);
  }
};

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
                <p>📞 +201126522373</p>
                <p>📧 info@itqansolutions.org</p>
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

// يتأكد ان السيرش شغال أي وقت ومش متغطي
function ensureSearchClickable() {
  const el = document.getElementById("productSearch");
  if (el) {
    el.style.pointerEvents = "auto";
    el.style.position = "relative";
    el.style.zIndex = "1000";
    // يقفل أي مودال ممكن لسه مفتوح بالغلط
    ["discountModal", "auditModal"].forEach(id => {
      const m = document.getElementById(id);
      if (m && getComputedStyle(m).display !== "none") {
        m.style.display = "none";
      }
    });
    // ضمان الفوكس أول ما يفتح في كل البيئات
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
    if (product.trackStock !== false && product.stock <= 0) div.classList.add("out-of-stock");
    div.onclick = () => addToCart(product);
    const stockDisplay = (product.trackStock === false) ? '<span style="font-size:1.5em; color:#2ecc71;">∞</span>' : `Stock: ${product.stock}`;

    div.innerHTML = `
      <h4>${product.name}</h4>
      <p>${product.price.toFixed(2)}</p>
      <p>${stockDisplay}</p>
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

  // Check stock (if tracked)
  if (product.trackStock !== false && product.stock <= 0) {
    alert("Out of stock!");
    return;
  }

  const existingItem = cart.find(item => item._id === product._id);
  if (existingItem) {
    // Check stock for existing item (if tracked)
    if (product.trackStock !== false && existingItem.qty >= product.stock) {
      alert("Not enough stock!");
      return;
    }
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
  if (isReadOnly) {
    alert("Read-Only Mode: Transactions are disabled.");
    return;
  }
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
          <h3>${t("Daily Summary", "ملخص اليومية")}</h3>
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
  loadCategories();

  // Event Listeners
  document.getElementById('productSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredProducts = allProducts.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.includes(term))
    );
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

async function printReceipt(receipt) {
  try {
    // If passed an ID instead of object, fetch it (just in case)  
    if (typeof receipt === 'string') {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/sales/${receipt}`, {
        headers: { 'x-auth-token': token }
      });
      if (!response.ok) {
        alert('Failed to load receipt for printing');
        return;
      }
      receipt = await response.json();
    }

    const shopName = localStorage.getItem('shopName') || 'My Shop';
    const shopAddress = localStorage.getItem('shopAddress') || '';
    const shopLogo = localStorage.getItem('shopLogo') || '';
    const receiptFooterMessage = localStorage.getItem('footerMessage') || '';

    const lang = localStorage.getItem('pos_language') || 'en';
    const t = (en, ar) => (lang === 'ar' ? ar : en);
    const paymentMap = {
      cash: t("Cash", "كاش"),
      card: t("Card", "بطاقة"),
      mobile: t("Mobile", "محفظة")
    };

    let totalDiscount = 0;
    let subtotal = 0;

    const itemsHtml = receipt.items.map(item => {
      const originalTotal = item.price * item.qty;
      let discountStr = "-";
      let discountAmountPerUnit = 0;

      if (item.discount?.type === "percent") {
        discountAmountPerUnit = item.price * (item.discount.value / 100);
        discountStr = `${item.discount.value}%`;
      } else if (item.discount?.type === "value") {
        discountAmountPerUnit = item.discount.value;
        discountStr = `${discountAmountPerUnit.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}`;
      }

      const itemDiscountTotal = discountAmountPerUnit * item.qty;
      totalDiscount += itemDiscountTotal;
      subtotal += originalTotal;

      return `  
                 <tr>  
                     <td>${item.code || '-'}</td>  
                     <td>${item.name || '-'}</td>  
                     <td>${item.qty}</td>  
                     <td>${item.price.toFixed(2)}</td>  
                     <td>${originalTotal.toFixed(2)}</td>  
                     <td>${discountStr}</td>  
                 </tr>  
             `;
    }).join('');

    const dateFormatted = new Date(receipt.date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
    });

    const html = `  
             <html>  
             <head>  
                 <title>${t("Receipt", "فاتورة")}</title>  
                 <style>  
                     body { font-family: Arial, sans-serif; font-size: 11.5px; font-weight: bold; line-height: 1.7; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; margin: 0; padding: 0; }  
                     .receipt-container { width: 72mm; margin: 0; padding: 5px 0; background: #fff; box-sizing: border-box; }  
                     .center { text-align: center; }  
                     img.logo { max-height: 70px; display: block; margin: 0 auto 5px; }  
                     h2 { margin: 3px 0; font-size: 15px; font-weight: bold; width: 100%; word-wrap: break-word; }  
                     p { margin: 2px 8px; font-weight: bold; }  
                     table { width: 98%; border-collapse: collapse; margin: 8px auto 4px; table-layout: fixed; }  
                     th, td { border: 1px dashed #444; padding: 4px 5px; text-align: center; font-size: 11px; white-space: normal; word-break: break-word; font-weight: bold; }  
                     th:nth-child(1), td:nth-child(1) { width: 14%; }  
                     th:nth-child(2), td:nth-child(2) { width: 28%; }  
                     th:nth-child(3), td:nth-child(3) { width: 10%; }  
                     th:nth-child(4), td:nth-child(4) { width: 14%; }  
                     th:nth-child(5), td:nth-child(5) { width: 16%; }  
                     th:nth-child(6), td:nth-child(6) { width: 18%; }  
                     .summary { margin: 10px 8px 0; font-size: 12px; font-weight: bold; }  
                     .footer { text-align: center; margin: 12px 0 0; font-size: 10.5px; border-top: 1px dashed #ccc; padding-top: 6px; font-weight: bold; }  
                     @media print { @page { size: 72mm auto; margin: 0; } body { margin: 0; padding: 0; } a { color: black; text-decoration: none; } }  
                 </style>  
             </head>  
             <body>  
                 <div class="receipt-container">  
                     ${shopLogo ? `<img src="${shopLogo}" class="logo">` : ''}  
                     <h2 class="center">${shopName}</h2>  
                     <p class="center">${shopAddress}</p>  
                     <hr/>  
                     <p>${t("Receipt No", "رقم الفاتورة")}: ${receipt.receiptId}</p>  
                     <p>${t("Cashier", "الكاشير")}: ${receipt.cashier}</p>  
                     <p>${t("Salesman", "البائع")}: ${receipt.salesman || '-'}</p>  
                     <p>${t("Date", "التاريخ")}: ${dateFormatted}</p>  
                     <p>${t("Payment Method", "طريقة الدفع")}: ${paymentMap[receipt.method] || '-'}</p>  
                     <table>  
                         <thead>  
                             <tr>  
                                 <th>${t("Code", "كود")}</th>  
                                 <th>${t("Name", "الاسم")}</th>  
                                 <th>${t("Qty", "كمية")}</th>  
                                 <th>${t("Unit Price", "سعر الوحدة")}</th>  
                                 <th>${t("Total", "الإجمالي")}</th>  
                                 <th>${t("Discount", "الخصم")}</th>  
                             </tr>  
                         </thead>  
                         <tbody>${itemsHtml}</tbody>  
                     </table>  
                     <div class="summary">  
                         <p>${t("Subtotal", "المجموع الفرعي")}: ${subtotal.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>  
                         <p>${t("Total Discount", "إجمالي الخصم")}: ${totalDiscount.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>  
                         <p>${t("Total", "الإجمالي النهائي")}: ${receipt.total.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>  
                     </div>  
                     <hr/>  
                     ${receiptFooterMessage ? `<p class="footer" style="font-size:13px; font-weight: bold;">${receiptFooterMessage}</p>` : ''}  
                     <p class="footer">  
                         <strong>Tashgheel POS &copy; 2025</strong><br>  
                         K    
   <a href="tel:+201126522373">01126522373</a> / <a href="tel:+201155253886">01155253886</a><br>  
                         <span id="footerText">${t("Designed and developed by Itqan", "تم التطوير بواسطة Itqan")}</span>  
                     </p>  
                 </div>  
                 <script>window.onload = () => window.print();</script>  
             </body>  
             </html>  
         `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();

  } catch (error) {
    console.error('Error printing receipt:', error);
    alert('Failed to print receipt');
  }
}

// Categories  
async function loadCategories() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/categories`, {
      headers: { 'x-auth-token': token }
    });
    if (!response.ok) throw new Error('Failed to fetch categories');
    const categories = await response.json();
    renderCategories(categories);
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function renderCategories(categories) {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  const existingButtons = container.querySelectorAll('button:not([data-id="all"])');
  existingButtons.forEach(btn => btn.remove());

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary category-btn';
    const lang = localStorage.getItem('pos_language') || 'en';
    btn.textContent = lang === 'ar' ? cat.name : (cat.nameEn || cat.name);

    btn.onclick = () => filterProducts(cat.name, btn);
    btn.dataset.id = cat.name;
    container.appendChild(btn);
  });
}

function filterProducts(categoryName, btnClicked) {
  const buttons = document.querySelectorAll('.category-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });

  if (btnClicked) {
    btnClicked.classList.add('active');
    btnClicked.classList.remove('btn-secondary');
    btnClicked.classList.add('btn-primary');
  } else {
    // Try to find button by name if passed manually
    const targetBtn = document.querySelector(`.category-btn[data-id="${categoryName}"]`);
    if (targetBtn) {
      targetBtn.classList.add('active');
      targetBtn.classList.remove('btn-secondary');
      targetBtn.classList.add('btn-primary');
    } else {
      // Fallback for 'all'
      const allBtn = document.querySelector('.category-btn[data-id="all"]');
      if (allBtn && categoryName === 'all') {
        allBtn.classList.add('active');
        allBtn.classList.remove('btn-secondary');
        allBtn.classList.add('btn-primary');
      }
    }
  }

  const searchInput = document.getElementById('productSearch');
  if (searchInput) searchInput.value = '';

  if (categoryName === 'all') {
    filteredProducts = allProducts;
  } else {
    filteredProducts = allProducts.filter(p => p.category === categoryName);
  }

  renderProducts();
}

window.filterProducts = filterProducts;
window.processSale = processSale;
window.closeShift = closeShift;
window.submitOpenShift = submitOpenShift;
window.submitCloseShift = submitCloseShift;
window.scanBarcode = scanBarcode;
window.clearCart = clearCart;
window.holdTransaction = holdTransaction;
window.openDiscountModal = openDiscountModal;
window.saveDiscount = saveDiscount;
window.closeDiscountModal = closeDiscountModal;
