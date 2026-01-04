// admin-app.js
// API_URL is defined in auth.js

document.addEventListener('DOMContentLoaded', () => {
  // === Shop Settings ===
  const shopNameInput = document.getElementById('shop-name');
  const shopAddressInput = document.getElementById('shop-address');
  const shopLogoInput = document.getElementById('shop-logo');
  const logoPreview = document.getElementById('logo-preview');
  const shopForm = document.getElementById('shop-settings-form');
  const footerMessageInput = document.getElementById('footer-message');
  const taxRateInput = document.getElementById('tax-rate');
  const taxNameInput = document.getElementById('tax-name');

  let uploadedLogoBase64 = '';

  // Load Settings
  async function loadSettings() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        const settings = await response.json();
        if (settings.shopName) shopNameInput.value = settings.shopName;
        if (settings.shopAddress) shopAddressInput.value = settings.shopAddress;
        if (settings.footerMessage) footerMessageInput.value = settings.footerMessage;
        if (settings.taxRate !== undefined) taxRateInput.value = settings.taxRate;
        if (settings.taxName) taxNameInput.value = settings.taxName;
        if (settings.shopLogo) {
          logoPreview.src = settings.shopLogo;
          logoPreview.style.display = 'block';
          uploadedLogoBase64 = settings.shopLogo;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  shopLogoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        uploadedLogoBase64 = reader.result;
        logoPreview.src = uploadedLogoBase64;
        logoPreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  shopForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = {
      shopName: shopNameInput.value.trim(),
      shopAddress: shopAddressInput.value.trim(),
      footerMessage: footerMessageInput.value.trim(),
      taxRate: parseFloat(taxRateInput.value) || 0,
      taxName: taxNameInput.value.trim(),
      shopLogo: uploadedLogoBase64
    };
    console.log('Sending Settings:', settings); // Debug Log

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const savedSettings = await response.json();
        console.log('Settings Saved Successfully:', savedSettings);
        const version = savedSettings._backendVersion || 'OLD';
        alert(getTranslation('settings_saved') + `\nDB Status: Rate=${savedSettings.taxRate}, Name="${savedSettings.taxName}"\nBackend Ver: ${version}`);
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  });

  // === User Management ===
  const userForm = document.getElementById('user-form');
  const usernameInput = document.getElementById('new-username');
  const passwordInput = document.getElementById('new-password');
  const roleSelect = document.getElementById('user-role');
  const userTableBody = document.getElementById('user-table-body');

  async function loadUsers() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        const users = await response.json();
        userTableBody.innerHTML = '';
        users.forEach((user) => {
          const row = document.createElement('tr');
          row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td><button onclick="handleDeleteUser('${user._id}')" class="btn btn-danger">🗑️</button></td>
              `;
          userTableBody.appendChild(row);
        });
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  window.handleDeleteUser = async function (id) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        loadUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleSelect.value;

    if (!username || !password) return alert('Fill all fields');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ username, password, role })
      });

      if (response.ok) {
        alert('User created successfully');
        userForm.reset();
        loadUsers();
      } else {
        const data = await response.json();
        alert(data.msg || 'Failed to create user');
      }
    } catch (e) {
      alert(e.message);
    }
  });

  // === Customer Management ===
  const customerForm = document.getElementById('customer-form');
  const customerNameInput = document.getElementById('customer-name');
  const customerPhoneInput = document.getElementById('customer-phone');
  const customerEmailInput = document.getElementById('customer-email');
  const customerAddressInput = document.getElementById('customer-address');
  const customerTableBody = document.getElementById('customer-table-body');

  async function loadCustomers() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/customers`, {
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        const customers = await response.json();
        customerTableBody.innerHTML = '';
        customers.forEach((customer) => {
          const row = document.createElement('tr');
          row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.email || '-'}</td>
                <td>
                  <button onclick="handleDeleteCustomer('${customer._id}')" class="btn btn-danger">🗑️</button>
                </td>
              `;
          customerTableBody.appendChild(row);
        });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  window.handleDeleteCustomer = async function (id) {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/customers/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        loadCustomers();
      } else {
        alert('Failed to delete customer');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = customerNameInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const email = customerEmailInput.value.trim();
    const address = customerAddressInput.value.trim();

    if (!name || !phone) return alert('Name and Phone are required');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ name, phone, email, address })
      });

      if (response.ok) {
        alert('Customer saved successfully');
        customerForm.reset();
        loadCustomers();
      } else {
        const data = await response.json();
        alert(data.msg || 'Failed to save customer');
      }
    } catch (e) {
      alert(e.message);
    }
  });

  loadSettings();
  loadUsers();
  loadCustomers();
  // applyTranslations() is called by translations.js on DOMContentLoaded
});

// applyTranslations() is handled by translations.js