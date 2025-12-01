// Updated products-app.js

const API_URL = '/api';

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadCategories();

  document.getElementById("product-form").addEventListener("submit", handleAddProduct);
  document.getElementById("category-form").addEventListener("submit", handleAddCategory);
});

async function loadProducts() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/products`, {
      headers: { 'x-auth-token': token }
    });
    const products = await response.json();

    const tbody = document.getElementById("product-table-body");
    tbody.innerHTML = "";

    products.forEach((p, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.barcode || "-"}</td>
        <td>${p.name}</td>
        <td>${p.barcode || "-"}</td>
        <td>${p.category || "-"}</td>
        <td>${p.price?.toFixed(2) || "0.00"}</td>
        <td>${p.cost?.toFixed(2) || "0.00"}</td>
        <td>${p.stock || 0}</td>
        <td>
          <button class="btn btn-secondary btn-action" onclick="editProduct('${p._id}')">✏️</button>
          <button class="btn btn-danger btn-action" onclick="deleteProduct('${p._id}')">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    window.deleteProduct = async function (id) {
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
    };

    window.editProduct = function (id) {
      // Placeholder for edit
      alert("Edit feature requires a modal or form population logic. Please delete and re-add for now.");
    };
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

async function handleAddProduct(e) {
  e.preventDefault();

  const name = document.getElementById("product-name").value.trim();
  const category = document.getElementById("product-category").value;
  const barcode = document.getElementById("product-barcode").value.trim();
  const price = parseFloat(document.getElementById("product-price").value);
  const cost = parseFloat(document.getElementById("product-cost").value) || 0;
  const stock = parseInt(document.getElementById("product-stock").value) || 0;

  if (!name || isNaN(price)) return alert("Please fill required fields");

  const product = { name, category, barcode, price, cost, stock };

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
      loadProducts();
    } else {
      alert('Failed to add product');
    }
  } catch (error) {
    console.error('Error adding product:', error);
    alert('Server error');
  }
}

function loadCategories() {
  const categories = JSON.parse(localStorage.getItem("categories") || "[]");
  const select = document.getElementById("product-category");
  const list = document.getElementById("category-list");

  select.innerHTML = '<option value="">--</option>';
  list.innerHTML = "";

  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);

    const li = document.createElement("li");
    li.textContent = cat;
    list.appendChild(li);
  });
}

function handleAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById("new-category");
  const cat = input.value.trim();
  if (!cat) return;

  const categories = JSON.parse(localStorage.getItem("categories") || "[]");
  if (!categories.includes(cat)) {
    categories.push(cat);
    localStorage.setItem("categories", JSON.stringify(categories));
    loadCategories();
  }
  input.value = "";
}

// Stock Audit Functions
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
        document.getElementById(`diff-${index}`).textContent = diff;
        document.getElementById(`diff-${index}`).style.color = diff < 0 ? 'red' : (diff > 0 ? 'green' : 'black');
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
  if (!confirm('Save stock audit changes?')) return;

  try {
    const token = localStorage.getItem('token');
    const updates = [];

    auditProducts.forEach((p, index) => {
      const actualInput = document.getElementById(`actual-${index}`);
      const actualStock = parseInt(actualInput.value) || 0;

      if (actualStock !== (p.stock || 0)) {
        updates.push({
          id: p._id,
          stock: actualStock
        });
      }
    });

    if (updates.length === 0) {
      alert('No changes to save');
      closeStockAudit();
      return;
    }

    // Update each product
    for (const update of updates) {
      await fetch(`${API_URL}/products/${update.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ stock: update.stock })
      });
    }

    alert(`✅ Stock audit saved! Updated ${updates.length} products.`);
    closeStockAudit();
    loadProducts();
  } catch (error) {
    console.error('Error saving stock audit:', error);
    alert('Failed to save stock audit');
  }
}

// Make functions global
window.openStockAudit = openStockAudit;
window.closeStockAudit = closeStockAudit;
window.saveStockAudit = saveStockAudit;
