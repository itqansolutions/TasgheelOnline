// Shared translations for all pages
const translations = {
    en: {
        nav_pos: "Point of Sale",
        nav_products: "Products",
        nav_receipts: "Receipts",
        nav_reports: "Reports",
        nav_salesmen: "Salesmen",
        nav_expenses: "Expenses",
        nav_admin: "Admin Panel",
        nav_backup: "Backup"
    },
    ar: {
        nav_pos: "نقطة البيع",
        nav_products: "المنتجات",
        nav_receipts: "الفواتير",
        nav_reports: "التقارير",
        nav_salesmen: "البائعون",
        nav_expenses: "المصاريف",
        nav_admin: "لوحة التحكم",
        nav_backup: "النسخ الاحتياطي"
    }
};

function applyNavTranslations() {
    const lang = localStorage.getItem('pos_language') || 'en';
    const t = translations[lang];

    document.querySelectorAll('[data-i18n^="nav_"]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });
}

// Apply on load
document.addEventListener('DOMContentLoaded', applyNavTranslations);
