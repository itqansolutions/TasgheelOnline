// Ali Karam POS System - Enhanced Authentication & Security
// Compatible with Windows 7+ browsers and works fully offline
// Includes one-time license activation system

// Auth System linked to Backend API

const API_URL = '/api';

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
    window.location.href = 'index.html';
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
window.getCurrentUser = getCurrentUser;
window.hasPermission = hasPermission;
window.isSessionValid = isSessionValid;

// Redirect if not logged in (except on login/register pages)
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (!path.includes('index.html') && !path.includes('register.html') && !path.includes('subscription.html')) {
        if (!isSessionValid()) {
            window.location.href = 'index.html';
        }
    }
});

