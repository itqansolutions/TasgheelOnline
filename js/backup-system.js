// Backup System for API-based POS

const API_URL = '/api';

async function createBackup() {
  try {
    const token = localStorage.getItem('token');

    // Fetch all data from API
    const [products, salesmen, expenses, sales] = await Promise.all([
      fetch(`${API_URL}/products`, { headers: { 'x-auth-token': token } }).then(r => r.json()),
      fetch(`${API_URL}/salesmen`, { headers: { 'x-auth-token': token } }).then(r => r.json()),
      fetch(`${API_URL}/expenses`, { headers: { 'x-auth-token': token } }).then(r => r.json()),
      fetch(`${API_URL}/sales`, { headers: { 'x-auth-token': token } }).then(r => r.json())
    ]);

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        products,
        salesmen,
        expenses,
        sales,
        categories: JSON.parse(localStorage.getItem('categories') || '[]')
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tashgheel_pos_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert('✅ Backup created successfully!');
  } catch (error) {
    console.error('Error creating backup:', error);
    alert('❌ Failed to create backup. Please try again.');
  }
}

async function restoreBackup() {
  if (!confirm('⚠️ This will overwrite ALL your current data. Continue?')) return;

  const fileInput = document.getElementById('backupFileInput');
  const file = fileInput.files[0];
  if (!file) return alert('Please select a backup file.');

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const backupData = JSON.parse(e.target.result);

      if (!backupData.version || !backupData.data) {
        throw new Error('Invalid backup file format');
      }

      if (!confirm(`Restore backup from ${new Date(backupData.timestamp).toLocaleString()}? All current data will be lost.`)) {
        return;
      }

      const token = localStorage.getItem('token');
      const { products, salesmen, expenses, categories } = backupData.data;

      // Note: We can't restore sales as they're immutable
      // We can only restore products, salesmen, expenses, and categories

      // Restore products
      if (products && products.length > 0) {
        for (const product of products) {
          await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            body: JSON.stringify(product)
          });
        }
      }

      // Restore salesmen
      if (salesmen && salesmen.length > 0) {
        for (const salesman of salesmen) {
          await fetch(`${API_URL}/salesmen`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            body: JSON.stringify(salesman)
          });
        }
      }

      // Restore expenses
      if (expenses && expenses.length > 0) {
        for (const expense of expenses) {
          await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            body: JSON.stringify(expense)
          });
        }
      }

      // Restore categories (localStorage)
      if (categories) {
        localStorage.setItem('categories', JSON.stringify(categories));
      }

      alert('✅ Backup restored successfully! The app will now reload.');
      location.reload();
    } catch (err) {
      console.error('Restore error:', err);
      alert('❌ Failed to restore backup. Invalid file or server error.');
    }
  };
  reader.readAsText(file);
}

// Make functions global
window.createBackup = createBackup;
window.restoreBackup = restoreBackup;
