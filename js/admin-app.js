// admin-app.js

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
  // === Shop Settings ===
  const shopNameInput = document.getElementById('shop-name');
  const shopAddressInput = document.getElementById('shop-address');
  const shopLogoInput = document.getElementById('shop-logo');
  const logoPreview = document.getElementById('logo-preview');
  const shopForm = document.getElementById('shop-settings-form');
  const footerMessageInput = document.getElementById('footer-message');

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
      shopLogo: uploadedLogoBase64
    };

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
        alert(getTranslation('settings_saved'));
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

  loadSettings();
  loadUsers();
  applyTranslations();
});

// === Translations ===
function getTranslation(key) {
  const translations = {
    settings_saved: {
      en: 'Settings saved successfully!',
      ar: 'تم حفظ الإعدادات بنجاح'
    }
  };
  const lang = localStorage.getItem('pos_language') || 'en';
  return translations[key]?.[lang] || key;
}

function applyTranslations() {
  const lang = localStorage.getItem('pos_language') || 'en';
  const translations = {
    en: {
      admin_panel: 'Admin Panel',
      shop_settings: 'Shop Settings',
      shop_name: 'Shop Name:',
      shop_address: 'Shop Address:',
      shop_logo: 'Shop Logo:',
      save: 'Save',
      user_management: 'User Management',
      username: 'Username:',
      password: 'Password:',
      role: 'Role:',
      cashier: 'Cashier',
      admin: 'Admin',
      create_user: 'Create User',
      actions: 'Actions'
    },
    ar: {
      admin_panel: 'لوحة التحكم',
      shop_settings: 'إعدادات المتجر',
      shop_name: 'اسم المتجر:',
      shop_address: 'عنوان المتجر:',
      shop_logo: 'شعار المتجر:',
      save: 'حفظ',
      user_management: 'إدارة المستخدمين',
      username: 'اسم المستخدم:',
      password: 'كلمة المرور:',
      role: 'الدور:',
      cashier: 'الكاشير',
      admin: 'مشرف',
      create_user: 'إنشاء مستخدم',
      actions: 'الإجراءات'
    }
  };

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = translations[lang]?.[key];
    if (translated) el.innerText = translated;
  });
}