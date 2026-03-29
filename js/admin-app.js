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
        localStorage.setItem('shopName', settings.shopName || '');
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
                <td>${user.fullName || "-"}</td>
                <td>${user.role}</td>
                <td>
                  <button onclick="editUser('${user._id}')" class="btn btn-secondary btn-sm">✏️</button>
                  <button onclick="handleDeleteUser('${user._id}')" class="btn btn-danger btn-sm">🗑️</button>
                </td>
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
    const fullName = document.getElementById('new-fullname').value.trim();

    // Collect permissions
    const permissions = {};
    document.querySelectorAll('#user-form .perm-check').forEach(cb => {
      permissions[cb.value] = cb.checked;
    });

    if (!username || !password) return alert('Fill all fields');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ username, password, role, fullName, permissions })
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

  async function loadLicenseInfo() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tenant/trial-status`, {
        headers: { 'x-auth-token': token }
      });
      if (response.ok) {
        const data = await response.json();
        document.getElementById('license-loading').style.display = 'none';
        document.getElementById('license-details').style.display = 'block';
        document.getElementById('license-status').textContent = data.isExpired ? 'Expired' : 'Active';
        document.getElementById('license-date').textContent = new Date(data.trialEndsAt).toLocaleDateString();
        document.getElementById('license-days').textContent = data.daysRemaining;
      }
    } catch (error) {
      console.error('Error loading license:', error);
    }
  }

  // Initial loads
  loadSettings();
  loadUsers();
  loadLicenseInfo();

  // === Edit User Logic ===
  const editUserModal = document.getElementById('editUserModal');
  const editUserForm = document.getElementById('edit-user-form');
  const editIdInput = document.getElementById('edit-user-id');
  const editUsernameInput = document.getElementById('edit-username');
  const editFullnameInput = document.getElementById('edit-fullname');
  const editPasswordInput = document.getElementById('edit-password');
  const editRoleSelect = document.getElementById('edit-user-role');
  const editPermsContainer = document.getElementById('edit-perms-container');

  const permKeys = {
    canCancelSales: "perm_cancel",
    nav_pos: "nav_pos",
    nav_products: "nav_products",
    nav_receipts: "nav_receipts",
    nav_reports: "nav_reports",
    nav_salesmen: "nav_salesmen",
    nav_expenses: "nav_expenses",
    nav_admin: "nav_admin",
    nav_backup: "nav_backup"
  };

  window.editUser = async function(id) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, { headers: { 'x-auth-token': token } });
      const users = await response.json();
      const user = users.find(u => u._id === id);
      if (!user) return alert("User not found");

      editIdInput.value = user._id;
      editUsernameInput.value = user.username;
      editFullnameInput.value = user.fullName || "";
      editRoleSelect.value = user.role;
      editPasswordInput.value = ""; // Clear password field

      // Render perms checkboxes
      editPermsContainer.innerHTML = '';
      for (const [key, labelKey] of Object.entries(permKeys)) {
        const isChecked = user.permissions && user.permissions[key] !== false;
        const div = document.createElement('div');
        div.innerHTML = `<label><input type="checkbox" class="edit-perm-check" value="${key}" ${isChecked ? 'checked' : ''}> <span data-i18n="${labelKey}">${getTranslation(labelKey)}</span></label>`;
        editPermsContainer.appendChild(div);
      }

      editUserModal.style.display = 'flex';
      if (typeof applyTranslations === 'function') applyTranslations();
    } catch (e) {
      console.error(e);
    }
  };

  window.closeEditUserModal = function() {
    editUserModal.style.display = 'none';
  };

  editUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editIdInput.value;
    const fullName = editFullnameInput.value.trim();
    const password = editPasswordInput.value.trim();
    const role = editRoleSelect.value;
    
    const permissions = {};
    document.querySelectorAll('.edit-perm-check').forEach(cb => {
      permissions[cb.value] = cb.checked;
    });

    const updates = { fullName, role, permissions };
    if (password) updates.password = password;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        alert("User updated successfully");

        // Sync localStorage if updating self
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser._id === id && data.user) {
            currentUser.permissions = data.user.permissions;
            currentUser.role = data.user.role;
            currentUser.fullName = data.user.fullName;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            // Re-render sidebar if function available
            if (typeof renderSidebar === 'function') renderSidebar();
        }

        closeEditUserModal();
        loadUsers();
      } else {
        alert("Failed to update user");
      }
    } catch (e) {
      alert(e.message);
    }
  });

  // Remove Customer Loading
  // loadCustomers(); 
});

// applyTranslations() is handled by translations.js