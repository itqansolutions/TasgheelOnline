// Shared translations for all pages
const translations = {
    en: {
        // Navigation
        nav_pos: "🛒 Point of Sale",
        nav_products: "📦 Products",
        nav_receipts: "🧾 Receipts",
        nav_reports: "📈 Reports",
        nav_salesmen: "🧑‍💼 Salesmen",
        nav_expenses: "📋 Expenses",
        nav_admin: "⚙️ Admin Panel",
        nav_backup: "💾 Backup",

        // Common
        app_title: "Tasgheel POS System",
        enhanced_edition: "Enhanced Edition",
        logout: "Logout",
        welcome: "Welcome,",
        licensed: "Licensed",
        access_denied: "Access Denied",
        license_required: "This system requires a valid license to operate.",
        go_activation: "Go to Activation",
        save: "Save",
        cancel: "Cancel",
        close: "Close",
        print: "Print",
        shift_detected: "Open Shift Detected",
        shift_started_at: "Shift started at:",
        resume_shift: "Resume Shift",
        close_shift_now: "Close Shift Now",
        shift_open_by_other: "Another user has an open shift.",
        ask_close: "Please ask them to close their shift first.",
        delete: "Delete",
        edit: "Edit",
        actions: "Actions",
        search_placeholder: "Search by name, code, or barcode...",

        // POS Page
        pos_title: "Point of Sale",
        products_title: "Products",
        scan_btn: "Scan",
        loading_products: "Loading products...",
        cart_title: "Cart",
        cart_empty: "Cart is empty",
        subtotal: "Subtotal:",
        discount: "Discount:",
        tax: "Tax (0%):",
        total: "Total:",
        salesman: "Salesman:",
        pay_cash: "Cash",
        pay_card: "Card",
        pay_mobile: "Mobile",
        hold_btn: "Hold",
        clear_btn: "Clear",
        close_day_btn: "Close Day",
        day_summary_title: "Day Summary",
        all_categories: "All",
        open_shift: "Open Shift",
        close_shift: "Close Shift",
        enter_start_cash: "Please enter start cash",
        start_shift: "Start Shift",
        confirm_close_shift: "Are you sure you want to close shift?",
        actual_cash: "Actual Cash",
        start_cash: "Start Cash",
        cash_sales: "Cash Sales",
        card_sales: "Card Sales",
        mobile_sales: "Mobile Sales",
        returns: "Returns",
        expenses: "Expenses",
        expected_cash: "Expected Cash",

        // Discount Modal
        discount_modal_title: "Discount",
        discount_type: "Discount Type:",
        discount_none: "None",
        discount_percent: "Percentage (%)",
        discount_value: "Fixed Value",
        discount_value_label: "Value:",
        discount_save: "Save",
        discount_cancel: "Cancel",

        // Products Page
        products: "Products",
        product: "Product",
        add: "Add",
        add_product: "Add Product",
        unlimited_stock: "Unlimited Stock / Service",
        product_code: "Product Code",
        product_name: "Product Name",
        category: "Category",
        barcode: "Barcode",
        price: "Price",
        cost: "Cost",
        stock: "Stock",
        product_list: "Product List",
        stock_audit_btn: "Stock Audit",
        manage_categories: "Manage Categories",
        new_category: "New Category",
        add_category: "Add Category",
        stock_audit: "Stock Audit",
        recorded_stock: "Recorded",
        actual_stock: "Actual",
        difference: "Difference",

        // Receipts
        receipts_title: "Receipts",
        receipt_id: "Receipt ID",
        date: "Date",
        items: "Items",
        view_details: "View Details",

        // Reports
        reports_title: "Reports",
        daily_sales: "Daily Sales",
        monthly_sales: "Monthly Sales",

        // Salesmen
        salesmen_title: "Salesmen",
        add_salesman: "Add Salesman",
        salesman_name: "Name",
        salesman_phone: "Phone",
        salesmen_list: "Salesmen List",
        name: "Name",
        add_target: "Set Monthly Target",
        month: "Month",
        year: "Year",
        target: "Target",
        monthly_targets: "Monthly Targets",
        performance: "Monthly Performance",
        achieved: "Achieved",
        percentage: "%",

        // Expenses
        expenses_title: "Expenses",
        add_expense: "Add Expense",
        expense_amount: "Amount",
        expense_reason: "Reason",

        // Admin
        admin_title: "Admin Panel",
        users_settings: "Users & Settings",
        settings_saved: "Settings saved successfully!",
        shop_settings: "Shop Settings",
        shop_name: "Shop Name:",
        shop_address: "Shop Address:",
        shop_logo: "Shop Logo:",
        footer_message: "Receipt Footer Message:",
        user_management: "User Management",
        username: "Username:",
        password: "Password:",
        role: "Role:",
        cashier: "Cashier",
        manager: "Manager",
        admin: "Admin",
        create_user: "Create User",
        actions: "Actions",
        customer_management: "Customer Management",
        customer_name: "Name:",
        customer_phone: "Phone:",
        customer_email: "Email:",
        customer_address: "Address:",
        save_customer: "Save Customer",
        audit_logs: "Audit Logs",
        timestamp: "Time",
        user: "User",
        action: "Action",
        details: "Details",
        refresh_logs: "Refresh Logs",

        // Auth
        login_title: "Login",
        login_btn: "Login",
        username: "Username",
        password: "Password"
    },
    ar: {
        // Navigation
        nav_pos: "🛒 نقطة البيع",
        nav_products: "📦 المنتجات",
        nav_receipts: "🧾 الفواتير",
        nav_reports: "📈 التقارير",
        nav_salesmen: "🧑‍💼 البائعين",
        nav_expenses: "📋 المصاريف",
        nav_admin: "⚙️ الإدارة",
        nav_backup: "💾 النسخ الاحتياطي",

        // Common
        app_title: "نظام تشغيل",
        enhanced_edition: "النسخة المطورة",
        logout: "خروج",
        welcome: "مرحباً،",
        licensed: "مرخص",
        access_denied: "ممنوع الدخول",
        license_required: "هذا النظام يتطلب رخصة.",
        go_activation: "تفعيل",
        save: "حفظ",
        cancel: "إلغاء",
        close: "إغلاق",
        print: "طباعة",
        shift_detected: "تم اكتشاف وردية مفتوحة",
        shift_started_at: "بدأت الوردية في:",
        resume_shift: "استكمال الوردية",
        close_shift_now: "إغلاق الوردية الآن",
        shift_open_by_other: "يوجد مستخدم آخر لديه وردية مفتوحة.",
        ask_close: "برجاء الطلب منه إغلاق ورديته أولاً.",
        delete: "حذف",
        edit: "تعديل",
        actions: "إجراءات",
        search_placeholder: "بحث بالاسم أو الكود...",

        // POS Page
        pos_title: "نقطة البيع",
        products_title: "المنتجات",
        scan_btn: "مسح",
        loading_products: "جاري تحميل المنتجات...",
        cart_title: "السلة",
        cart_empty: "السلة فارغة",
        subtotal: "المجموع الفرعي:",
        discount: "الخصم:",
        tax: "الضريبة (0%):",
        total: "الإجمالي:",
        salesman: "البائع:",
        pay_cash: "كاش",
        pay_card: "بطاقة",
        pay_mobile: "موبايل",
        hold_btn: "تعليق",
        clear_btn: "مسح",
        close_day_btn: "إغلاق اليومية",
        day_summary_title: "ملخص اليومية",
        all_categories: "الكل",
        open_shift: "فتح وردية",
        close_shift: "إغلاق الوردية",
        enter_start_cash: "برجاء إدخال مبلغ البداية",
        start_shift: "بدء الوردية",
        confirm_close_shift: "هل أنت متأكد من إغلاق الوردية؟",
        actual_cash: "النقد الفعلي",
        start_cash: "بداية الدرج",
        cash_sales: "مبيعات الكاش",
        card_sales: "مبيعات البطاقة",
        mobile_sales: "مبيعات المحافظ",
        returns: "المرتجعات",
        expenses: "المصاريف",
        expected_cash: "النقد المتوقع",

        // Discount Modal
        discount_modal_title: "خصم",
        discount_type: "نوع الخصم:",
        discount_none: "لا يوجد",
        discount_percent: "نسبة مئوية (%)",
        discount_value: "قيمة ثابتة",
        discount_value_label: "القيمة:",
        discount_save: "حفظ",
        discount_cancel: "إلغاء",

        // Products Page
        products: "المنتجات",
        product: "المنتج",
        add: "إضافة",
        add_product: "إضافة صنف",
        unlimited_stock: "بدون مخزون / خدمة",
        product_code: "كود المنتج",
        product_name: "اسم المنتج",
        category: "القسم",
        barcode: "الباركود",
        price: "السعر",
        cost: "التكلفة",
        stock: "المخزون",
        product_list: "قائمة المنتجات",
        stock_audit_btn: "جرد المخزون",
        manage_categories: "إدارة الأقسام",
        new_category: "قسم جديد",
        add_category: "إضافة قسم",
        stock_audit: "جرد المخزون",
        recorded_stock: "المسجل",
        actual_stock: "الفعلي",
        difference: "الفرق",

        // Receipts
        receipts_title: "الفواتير",
        receipt_id: "رقم الفاتورة",
        date: "التاريخ",
        items: "الأصناف",
        view_details: "عرض التفاصيل",

        // Reports
        reports_title: "التقارير",
        daily_sales: "المبيعات اليومية",
        monthly_sales: "المبيعات الشهرية",

        // Salesmen
        salesmen_title: "البائعون",
        add_salesman: "إضافة بائع",
        salesman_name: "الاسم",
        salesman_phone: "الهاتف",
        salesmen_list: "قائمة البائعين",
        name: "الاسم",
        add_target: "تحديد هدف شهري",
        month: "الشهر",
        year: "السنة",
        target: "الهدف",
        monthly_targets: "الأهداف الشهرية",
        performance: "الأداء الشهري",
        achieved: "المحقق",
        percentage: "النسبة",

        // Expenses
        expenses_title: "المصاريف",
        add_expense: "إضافة مصروف",
        expense_amount: "المبلغ",
        expense_reason: "السبب",

        // Admin
        admin_title: "لوحة التحكم",
        users_settings: "المستخدمين والإعدادات",
        settings_saved: "تم حفظ الإعدادات بنجاح",
        shop_settings: "إعدادات المتجر",
        shop_name: "اسم المتجر:",
        shop_address: "عنوان المتجر:",
        shop_logo: "شعار المتجر:",
        footer_message: "رسالة تذييل الفاتورة:",
        user_management: "إدارة المستخدمين",
        username: "اسم المستخدم:",
        password: "كلمة المرور:",
        role: "الدور:",
        cashier: "الكاشير",
        manager: "مدير",
        admin: "مشرف",
        create_user: "إنشاء مستخدم",
        actions: "الإجراءات",
        customer_management: "إدارة العملاء",
        customer_name: "الاسم:",
        customer_phone: "الهاتف:",
        customer_email: "البريد:",
        customer_address: "العنوان:",
        save_customer: "حفظ العميل",
        audit_logs: "سجلات النظام",
        timestamp: "الوقت",
        user: "المستخدم",
        action: "الإجراء",
        details: "التفاصيل",
        refresh_logs: "تحديث السجلات",

        // Auth
        login_title: "تسجيل الدخول",
        username: "اسم المستخدم",
        password: "كلمة المرور",
        login_btn: "دخول"
    }
};

function setLanguage(lang) {
    localStorage.setItem('pos_language', lang);
    location.reload();
}

function applyTranslations() {
    const lang = localStorage.getItem('pos_language') || 'en';
    const t = translations[lang];

    // Set direction
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    if (lang === 'ar') {
        document.body.classList.add('rtl');
    } else {
        document.body.classList.remove('rtl');
    }

    console.log('Applying translations for lang:', lang);

    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            // Handle inputs with placeholders
            if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        } else {
            console.warn('Missing translation for key:', key);
        }
    });

    // Explicitly handle options in selects if they weren't caught
    document.querySelectorAll('option[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });

    // Backward compatibility: Handle old data-i18n-key system
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-key');
        if (t[key]) {
            // Handle inputs with placeholders
            if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        } else {
            console.warn('Missing translation for key (old system):', key);
        }
    });
}

function getTranslation(key) {
    const lang = localStorage.getItem('pos_language') || 'en';
    return translations[lang]?.[key] || key;
}

// Make globally available
window.setLanguage = setLanguage;
window.applyTranslations = applyTranslations;
window.getTranslation = getTranslation;

// Apply on load
document.addEventListener('DOMContentLoaded', applyTranslations);
