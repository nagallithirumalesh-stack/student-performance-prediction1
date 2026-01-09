// ===================================
// Integration Script for Authentication
// Add this to index.html before closing body tag
// ===================================

// Protect page - require login
// protectPage(); // Handled by auth.js

// Display user info
const loggedInUser = sessionManager.getCurrentUser();
if (loggedInUser) {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userRoleEl = document.getElementById('userRole');

    if (userNameEl) userNameEl.textContent = loggedInUser.name.split(' ')[0];
    if (userEmailEl) userEmailEl.textContent = loggedInUser.email;
    if (userRoleEl) userRoleEl.textContent = (loggedInUser.role || 'student').toUpperCase() + ' • ' + (loggedInUser.institution || '');
}

// Toggle user menu
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    const btn = document.getElementById('userMenuBtn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = 'none';
    }
});
