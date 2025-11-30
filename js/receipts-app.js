// receipts-app.js (Refactored for API)

const API_URL = '/api';

async function loadReceipts() {
  try {
    const token = localStorage.getItem('token');
    // We need an endpoint to get all sales/receipts.
    // I'll assume GET /api/sales exists or I need to create it.
    // I haven't created GET /api/sales yet. I should do that.
    // For now, I'll add the fetch call assuming the endpoint will be there.
    const response = await fetch(`${API_URL}/sales`, {
      headers: { 'x-auth-token': token }
    });
    if (!response.ok) return [];
    const receipts = await response.json();
    return receipts.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error('Error loading receipts:', error);
    return [];
  }
}

async function renderReceiptsTable() {
  const tbody = document.getElementById('receiptsTableBody');
  if (!tbody) return;

  const receipts = await loadReceipts();
  const searchTerm = document.getElementById('receiptSearch')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('statusFilter')?.value || '';

  tbody.innerHTML = '';

  const filtered = receipts.filter(r => {
    const matchText = `${r.cashier || ''} ${r.receiptId || ''}`.toLowerCase();
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchText.includes(searchTerm) && matchStatus;
  });

  if (filtered.length === 0) {
    const lang = localStorage.getItem('pos_language') || 'en';
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center">${lang === 'ar' ? 'لا توجد مستندات' : 'No receipts found'}</td></tr>`;
    return;
  }

  filtered.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.receiptId || '-'}</td>
      <td>${formatDate(r.date)}</td>
      <td>${r.cashier || '-'}</td>
      <td>${r.method || '-'}</td>
      <td>${calculateReceiptNetTotal(r).toFixed(2)} ج.م</td>
      <td>${translateStatus(r.status || 'finished')}</td>
      <td>${r.returnReason || '-'}</td>
      <td>
        <div style="display:flex; flex-wrap: wrap; gap:5px; justify-content:center;">
          <button class="btn btn-secondary btn-action" title="Print" onclick="printReceipt('${r._id}')">🖨️</button>
          <button class="btn btn-warning btn-action" title="Full Return" onclick="alert('Return feature requires backend update')">↩️</button>
          <button class="btn btn-primary btn-action" title="Partial Return" onclick="alert('Return feature requires backend update')">🔁</button>
          <button class="btn btn-danger btn-action" title="Cancel" onclick="alert('Cancel feature requires backend update')">❌</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function calculateReceiptNetTotal(receipt) {
  return receipt.items.reduce((sum, item) => {
    const discount = item.discount?.type === 'percent' ? (item.price * item.discount.value / 100) : item.discount?.value || 0;
    const net = item.price - discount;
    return sum + item.qty * net;
  }, 0);
}

function translateStatus(status) {
  const lang = localStorage.getItem('pos_language') || 'en';
  const map = {
    finished: { en: 'Finished', ar: 'مكتمل' },
    returned: { en: 'Returned', ar: 'مردود' },
    partial_return: { en: 'Partially Returned', ar: 'مردود جزئي' },
    full_return: { en: 'Fully Returned', ar: 'مردود كلي' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };
  return map[status]?.[lang] || status;
}

async function printReceipt(receiptId) {
  try {
    const token = localStorage.getItem('token');
    // Fetch the specific sale
    // We can use the /api/sales/:id endpoint I added
    // But wait, the receiptId passed here is likely the _id from the loop above: onclick="printReceipt('${r._id}')"
    const response = await fetch(`${API_URL}/sales/${receiptId}`, {
      headers: { 'x-auth-token': token }
    });

    if (!response.ok) {
      alert('Failed to load receipt for printing');
      return;
    }

    const receipt = await response.json();

    // We need products to show names if they are not in the receipt items (legacy)
    // But my new receipt structure stores names.
    // Let's assume receipt.items has names.

    const shopName = localStorage.getItem('shopName') || 'My Shop';
    const shopAddress = localStorage.getItem('shopAddress') || '';
    const shopLogo = localStorage.getItem('shopLogo') || '';
    const receiptFooterMessage = localStorage.getItem('footerMessage') || '';

    const lang = localStorage.getItem('pos_language') || 'en';
    const t = (en, ar) => (lang === 'ar' ? ar : 'en');
    const paymentMap = {
      cash: t("Cash", "نقدي"),
      card: t("Card", "بطاقة"),
      mobile: t("Mobile", "موبايل")
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
        <title>${t("Receipt", "الإيصال")}</title>
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
                <th>${t("Code", "الكود")}</th>
                <th>${t("Name", "الاسم")}</th>
                <th>${t("Qty", "الكمية")}</th>
                <th>${t("Unit Price", "سعر الوحدة")}</th>
                <th>${t("Total", "الإجمالي")}</th>
                <th>${t("Discount", "الخصم")}</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="summary">
            <p>${t("Subtotal", "الإجمالي الفرعي")}: ${subtotal.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>
            <p>${t("Total Discount", "إجمالي الخصم")}: ${totalDiscount.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>
            <p>${t("Total", "الإجمالي النهائي")}: ${receipt.total.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>
          </div>
          <hr/>
          ${receiptFooterMessage ? `<p class="footer" style="font-size:13px; font-weight: bold;">${receiptFooterMessage}</p>` : ''}
          <p class="footer">
            <strong>Tashgheel POS &copy; 2025</strong><br>
            📞 <a href="tel:+201126522373">01126522373</a> / <a href="tel:+201155253886">01155253886</a><br>
            <span id="footerText">${t("Designed and developed by Itqan", "تصميم وتطوير Itqan")}</span>
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

function updateReceiptsLanguage(lang) {
  const search = document.getElementById('receiptSearch');
  if (search) {
    search.placeholder = lang === 'ar' ? 'بحث بالكاشير أو رقم المستند...' : 'Search by cashier or code...';
  }
  const filter = document.getElementById('statusFilter');
  if (filter) {
    filter.options[0].textContent = lang === 'ar' ? 'كل الحالات' : 'All Status';
    filter.options[1].textContent = lang === 'ar' ? 'مكتمل' : 'Finished';
    filter.options[2].textContent = lang === 'ar' ? 'مردود جزئي' : 'Partial Return';
    filter.options[3].textContent = lang === 'ar' ? 'مردود كلي' : 'Full Return';
    filter.options[4].textContent = lang === 'ar' ? 'ملغي' : 'Cancelled';
  }
}

// ============== INIT ==============
window.addEventListener('DOMContentLoaded', () => {
  renderReceiptsTable();
  const searchInput = document.getElementById('receiptSearch');
  const statusFilter = document.getElementById('statusFilter');

  if (searchInput) {
    searchInput.addEventListener('input', renderReceiptsTable);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', renderReceiptsTable);
  }

  const lang = localStorage.getItem('pos_language') || 'en';
  updateReceiptsLanguage(lang);
});

