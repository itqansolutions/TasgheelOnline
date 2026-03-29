// Ali Karam POS System - Enhanced Authentication & Security
// Compatible with Windows 7+ browsers and works fully offline
// Includes one-time license activation system

// Auth System linked to Backend API

// Determine API URL based on environment
let defaultApiUrl = '/api';
if (window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && window.location.port !== '5000')) {
    defaultApiUrl = 'http://localhost:5000/api';
}

const API_URL = window.API_URL || defaultApiUrl;
window.API_URL = API_URL;

// Login function
async function login(username, password, businessEmail) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, businessEmail })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            return { success: true };
        } else {
            console.error('Login failed:', data.msg);
            return { success: false, msg: data.msg };
        }
    } catch (error) {
        console.error('Error:', error);
        return { success: false, msg: 'Server connection error' };
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('shiftResumed');
    window.location.href = 'index.html';
}

// Confirm logout with user
function confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
}

// Get current logged in user
function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// Check if session is valid
function isSessionValid() {
    const token = localStorage.getItem('token');
    // Ideally we should verify token with backend, but for now check existence
    if (!token) return false;

    // Check if token is expired (simple check)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            logout();
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

// Check permissions
function hasPermission(requiredRole) {
    const user = getCurrentUser();
    if (!user) return false;

    const roleHierarchy = {
        'admin': 3,
        'manager': 2,
        'cashier': 1
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
}

// Export functions
window.login = login;
window.logout = logout;
window.confirmLogout = confirmLogout;
window.getCurrentUser = getCurrentUser;
window.hasPermission = hasPermission;
window.isSessionValid = isSessionValid;

// Handle Sidebar & Permissions UI
function renderSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const user = getCurrentUser();
    if (!user) return;

    const perms = user.permissions || {
        nav_pos: true,
        nav_products: true,
        nav_receipts: true,
        nav_reports: true,
        nav_salesmen: true,
        nav_expenses: true,
        nav_admin: user.role === 'admin'
    };

    const currentPath = window.location.pathname.split('/').pop() || 'pos.html';

    const navItems = [
        { id: 'nav_pos', href: 'pos.html', icon: '🛒', label: 'Point of Sale' },
        { id: 'nav_products', href: 'products.html', icon: '📦', label: 'Products' },
        { id: 'nav_receipts', href: 'receipts.html', icon: '🧾', label: 'Receipts' },
        { id: 'nav_reports', href: 'reports.html', icon: '📈', label: 'Reports' },
        { id: 'nav_salesmen', href: 'salesmen.html', icon: '🧑‍💼', label: 'Salesmen' },
        { id: 'nav_expenses', href: 'expenses.html', icon: '📋', label: 'Expenses' },
        { id: 'nav_admin', href: 'admin.html', icon: '⚙️', label: 'Admin Panel' }
    ];

    let navHtml = '';
    navItems.forEach(item => {
        if (perms[item.id] !== false) {
            const activeClass = (currentPath === item.href) ? 'active' : '';
            navHtml += `<a href="${item.href}" class="nav-item ${activeClass}" data-i18n="${item.id}">${item.icon} ${item.label}</a>`;
        }
    });

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <h2 id="posSystemTitle" data-i18n="app_title">🏪Tasgheel POS</h2>
        <p id="licensedVersion" data-i18n="enhanced_edition">Enhanced Edition</p>
      </div>
      <nav>
        ${navHtml}
      </nav>
      <div class="sidebar-footer">
        <div style="font-size: 0.8rem; margin-bottom: 10px; opacity: 0.8;" id="footerBranding">Ali Karam POS</div>
        <button class="btn btn-danger btn-block" onclick="confirmLogout()" id="logoutBtn" data-i18n="logout">Logout</button>
      </div>
    `;

    // Re-apply translations if the function exists
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }
}

// Redirect if not logged in (except on login/register pages)
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (!path.includes('index.html') && !path.includes('register.html') && !path.includes('subscription.html')) {
        if (!isSessionValid()) {
            window.location.href = 'index.html';
            return;
        }
        renderSidebar();
    }
});

