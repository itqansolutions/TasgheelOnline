// products-app.js
// API_URL is defined in auth.js

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadCategories();

  document.getElementById("product-form").addEventListener("submit", handleAddProduct);
  document.getElementById("category-form-modal").addEventListener("submit", handleAddCategory);

  // Expose functions globally
  window.openCategoryModal = openCategoryModal;
  window.closeCategoryModal = closeCategoryModal;
  window.deleteCategory = deleteCategory;
  window.openStockAudit = openStockAudit;
  window.closeStockAudit = closeStockAudit;
  window.saveStockAudit = saveStockAudit;
  window.deleteProduct = deleteProduct;
  window.editProduct = editProduct;
  window.toggleStockFields = toggleStockFields;
});

function toggleStockFields() {
  const isUnlimited = document.getElementById("product-unlimited").checked;
  const stockContainer = document.getElementById("stock-container");
  const costContainer = document.getElementById("cost-container"); // User asked to hide cost too? "doesn't have stock / cost" - Yes.

  if (isUnlimited) {
    stockContainer.style.display = 'none';
    costContainer.style.display = 'none';
  } else {
    stockContainer.style.display = 'block';
    costContainer.style.display = 'block';
  }
}

// --- PRODUCTS ---

async function loadProducts() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/products`, {
      headers: { 'x-auth-token': token }
    });
    if (!response.ok) {
      const err = await response.json();
      console.error('Failed to load products:', err);
      // Only alert if it's a specific known error to avoid spamming, or show a toast
      if (response.status === 403 || response.status === 401) {
        alert(`Access Denied: ${err.msg || 'Please login again'}`);
      }
      return;
    }
    const products = await response.json();

    const tbody = document.getElementById("product-table-body");
    tbody.innerHTML = "";

    products.forEach((p) => {
      const row = document.createElement("tr");

      // Low Stock Alert (Only if tracking stock)
      if (p.trackStock !== false) {
        if (p.stock <= (p.minStock || 5)) {
          row.style.backgroundColor = "#fff3cd"; // Warning color
        }
        if (p.stock <= 0) {
          row.style.backgroundColor = "#f8d7da"; // Danger color
        }
      }

      const stockDisplay = (p.trackStock === false) ? '<span style="font-size:1.2em;">∞</span>' : (p.stock || 0);
      const costDisplay = (p.trackStock === false) ? '-' : (p.cost?.toFixed(2) || "0.00");

      row.innerHTML = `
        <td>${p.code || "-"}</td>
        <td>${p.name}</td>
        <td>${p.barcode || "-"}</td>
        <td>${p.category || "-"}</td>
        <td>${p.price?.toFixed(2) || "0.00"}</td>
        <td>${costDisplay}</td>
        <td>${stockDisplay}</td>
        <td>
          <button class="btn btn-secondary btn-action" onclick="editProduct('${p._id}')">✏️</button>
          <button class="btn btn-danger btn-action" onclick="deleteProduct('${p._id}')">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (error) {
    console.error('Error loading products:', error);
  }
}

async function handleAddProduct(e) {
  e.preventDefault();

  const code = document.getElementById("product-code").value.trim();
  const name = document.getElementById("product-name").value.trim();
  const category = document.getElementById("product-category").value;
  const barcode = document.getElementById("product-barcode").value.trim();
  const price = parseFloat(document.getElementById("product-price").value);
  const isUnlimited = document.getElementById("product-unlimited").checked;

  let cost = 0;
  let stock = 0;

  if (!isUnlimited) {
    cost = parseFloat(document.getElementById("product-cost").value) || 0;
    stock = parseInt(document.getElementById("product-stock").value) || 0;
  }

  if (!name || isNaN(price)) return alert("Please fill required fields");

  const product = {
    code,
    name,
    category,
    barcode,
    price,
    cost,
    stock,
    trackStock: !isUnlimited
  };

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(product)
    });

    if (response.ok) {
      alert('Product added successfully');
      e.target.reset();
      // Reset checkbox state visibility
      toggleStockFields();
      loadProducts();
    } else {
      const err = await response.json();
      alert('Failed to add product: ' + err.msg);
    }
  } catch (error) {
    console.error('Error adding product:', error);
    alert('Server error');
  }
}

async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': token }
    });
    if (response.ok) {
      loadProducts();
    } else {
      alert("Failed to delete product");
    }
  } catch (e) {
    console.error(e);
    alert("Error deleting product");
  }
}

function editProduct(id) {
  alert("Edit feature coming soon (Phase 3)");
}

// --- CATEGORIES ---

async function loadCategories() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/categories`, {
      headers: { 'x-auth-token': token }
    });
    if (!response.ok) {
      // Handle error gracefully
      console.warn('Failed to load categories');
      return;
    }
    const categories = await response.json();

    const select = document.getElementById("product-category");
    const listBody = document.getElementById("category-list-body");

    select.innerHTML = '<option value="">-- Select Category --</option>';
    listBody.innerHTML = "";

    categories.forEach(cat => {
      // Populate Dropdown
      const opt = document.createElement("option");
      opt.value = cat.name;
      opt.textContent = cat.name;
      select.appendChild(opt);

      // Populate Modal List
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${cat.name}</td>
                <td style="text-align:right;">
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory('${cat._id}')">🗑️</button>
                </td>
            `;
      listBody.appendChild(row);
    });

  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

function openCategoryModal() {
  document.getElementById("categoryModal").style.display = "flex";
}

function closeCategoryModal() {
  document.getElementById("categoryModal").style.display = "none";
}

async function handleAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById("new-category-modal");
  const name = input.value.trim();
  if (!name) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ name })
    });

    if (response.ok) {
      input.value = "";
      loadCategories();
    } else {
      alert('Failed to add category');
    }
  } catch (error) {
    console.error('Error adding category:', error);
  }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  try {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': token }
    });
    loadCategories();
  } catch (error) {
    console.error('Error deleting category:', error);
  }
}

// --- STOCK AUDIT ---

let auditProducts = [];

async function openStockAudit() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/products`, {
      headers: { 'x-auth-token': token }
    });
    auditProducts = await response.json();

    const tbody = document.getElementById("auditTableBody");
    tbody.innerHTML = "";

    auditProducts.forEach((p, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${p.code || p.barcode || '-'}</td>
                <td>${p.name}</td>
                <td>${p.stock || 0}</td>
                <td><input type="number" id="actual-${index}" value="${p.stock || 0}" min="0" style="width:80px;"></td>
                <td id="diff-${index}">0</td>
            `;
      tbody.appendChild(row);

      // Update difference on input change
      document.getElementById(`actual-${index}`).addEventListener('input', (e) => {
        const actual = parseInt(e.target.value) || 0;
        const recorded = p.stock || 0;
        const diff = actual - recorded;
        const diffEl = document.getElementById(`diff-${index}`);
        diffEl.textContent = diff;
        diffEl.style.color = diff < 0 ? 'red' : (diff > 0 ? 'green' : 'black');
        diffEl.style.fontWeight = diff !== 0 ? 'bold' : 'normal';
      });
    });

    document.getElementById("auditModal").style.display = "flex";
  } catch (error) {
    console.error('Error opening stock audit:', error);
    alert('Failed to load products for audit');
  }
}

function closeStockAudit() {
  document.getElementById("auditModal").style.display = "none";
}

async function saveStockAudit() {
  if (!confirm('Submit stock adjustments? This will update inventory.')) return;

  try {
    const token = localStorage.getItem('token');
    const itemsToAdjust = [];

    auditProducts.forEach((p, index) => {
      const actualInput = document.getElementById(`actual-${index}`);
      const actualStock = parseInt(actualInput.value) || 0;
      const recordedStock = p.stock || 0;

      if (actualStock !== recordedStock) {
        itemsToAdjust.push({
          productId: p._id,
          newStock: actualStock,
          reason: 'Stock Audit'
        });
      }
    });

    if (itemsToAdjust.length === 0) {
      alert('No changes detected.');
      closeStockAudit();
      return;
    }

    const response = await fetch(`${API_URL}/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ items: itemsToAdjust })
    });

    if (response.ok) {
      const result = await response.json();
      alert(`✅ Stock audit saved! ${result.msg}`);
      closeStockAudit();
      loadProducts();
    } else {
      alert('Failed to save stock audit');
    }

  } catch (error) {
    console.error('Error saving stock audit:', error);
    alert('Failed to save stock audit');
  }
}
