// returns-app.js

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('return-form');
  const itemsForm = document.getElementById('return-items-form');
  const itemsContainer = document.getElementById('receipt-items');
  const itemsBody = document.getElementById('return-items-body');

  let currentReceipt = null;

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const receiptId = document.getElementById('receipt-id').value.trim();

    try {
      const token = localStorage.getItem('token');
      // Use the new endpoint to fetch single sale
      const response = await fetch(`${API_URL}/sales/${receiptId}`, {
        headers: { 'x-auth-token': token }
      });

      if (response.ok) {
        currentReceipt = await response.json();

        // Display items for selection
        itemsBody.innerHTML = '';
        currentReceipt.items.forEach((item, idx) => {
          const row = document.createElement('tr');
          row.innerHTML = `
                <td><input type="checkbox" name="return-item" value="${idx}" /></td>
                <td>${item.name}</td>
                <td>${item.qty}</td>
              `;
          itemsBody.appendChild(row);
        });

        itemsContainer.style.display = 'block';
      } else {
        alert('Receipt not found.');
        currentReceipt = null;
        itemsContainer.style.display = 'none';
      }
    } catch (error) {
      console.error('Error searching receipt:', error);
      alert('Error searching receipt');
    }
  });

  itemsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentReceipt) return;

    const selectedIndexes = Array.from(document.querySelectorAll('input[name="return-item"]:checked'))
      .map(input => parseInt(input.value));

    if (!selectedIndexes.length) {
      alert('Please select items to return.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Fetch products to get their IDs and current stock
      // Optimization: We could fetch only needed products if we had an endpoint for that, 
      // but fetching all is okay for small catalogs.
      const prodResponse = await fetch(`${API_URL}/products`, {
        headers: { 'x-auth-token': token }
      });
      const products = await prodResponse.json();

      for (const index of selectedIndexes) {
        const item = currentReceipt.items[index];
        // Find product by barcode (code) or _id
        const product = products.find(p => p.barcode === item.code || p._id === item.code);

        if (product) {
          // Update product stock (increase for return)
          const newStock = product.stock + item.qty;

          await fetch(`${API_URL}/products/${product._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            body: JSON.stringify({ stock: newStock })
          });
        }
      }

      alert('Items returned and stock updated successfully.');
      itemsContainer.style.display = 'none';
      itemsForm.reset();
      searchForm.reset();
      currentReceipt = null;

    } catch (error) {
      console.error('Error processing return:', error);
      alert('Failed to process return');
    }
  });
});

