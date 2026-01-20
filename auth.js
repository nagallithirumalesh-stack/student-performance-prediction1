// ===================================
// Authentication & Session Management
// Real-time Data Synchronization
// Firebase V9 Compat
// ===================================

// === Session Management Class ===
class SessionManager {
    constructor() {
        this.unsubscribeAuth = null;
    }

    // Initialize Auth State Listener
    init() {
        this.unsubscribeAuth = firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in
                console.log("🔥 User authenticated:", user.email);

                // Get additional user data from Firestore
                try {
                    const userDoc = await db.collection("users").doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        this.updateUIProfile(userData);


                        // Sync started below globally
                    }
                } catch (error) {
                    console.error("⚠️ Error fetching user profile:", error);
                    // Continue with redirect anyway
                }

                // Start sync if on dashboard (Always start sync if authenticated)
                if (typeof dataSync !== 'undefined') {
                    dataSync.startAutoSync();
                }

                // Redirect logic
                const currentPage = window.location.pathname.split('/').pop();
                if (currentPage === 'login.html' || currentPage === 'register.html') {
                    window.location.href = 'dashboard.html';
                }

            } else {
                // User is signed out
                console.log("⚪ User signed out");
                const currentPage = window.location.pathname.split('/').pop();
                const publicPages = ['login.html', 'register.html', 'index.html', ''];

                if (!publicPages.includes(currentPage)) {
                    window.location.href = 'login.html';
                }
            }
        });
    }

    updateUIProfile(userData) {
        // Safe check for elements before trying to update them
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const roleEl = document.getElementById('userRole');

        if (nameEl) nameEl.textContent = userData.name || 'User';
        if (emailEl) emailEl.textContent = userData.email || '';
        if (roleEl) roleEl.textContent = (userData.role || 'student').toUpperCase();

        // Fix Race Condition: Manually trigger Role Manager now that we have data
        if (typeof roleManager !== 'undefined') {
            // Mock the user into roleManager since it expects sessionManager.getCurrentUser() 
            // but that might depend on auth state. 
            // Simpler: Just force init, sessionManager.getCurrentUser() should work now.
            roleManager.init();
        }
    }

    // Logout
    async logout() {
        try {
            await firebase.auth().signOut();
            showNotification('👋 Logged out successfully', 'success');
            // Redirect happens in onAuthStateChanged
        } catch (error) {
            console.error("Logout Error:", error);
            showNotification('❌ Logout failed', 'error');
        }
    }

    // Check login status synchronously (for immediate UI checks, though Auth is async)
    isLoggedIn() {
        return !!firebase.auth().currentUser;
    }

    // Get Current User (Helper for other scripts)
    getCurrentUser() {
        const user = firebase.auth().currentUser;
        // Construct a partial user object that role_manager expects if Firestore data isn't loaded yet
        if (user) {
            return {
                id: user.uid,
                email: user.email,
                name: user.displayName || 'User',
                // Defaulting role to student if not yet synced - dataSync/roleManager might need to listen to changes
                role: 'student',
                ...this.userDataCache // Ideally we cache the firestore data here
            };
        }
        return null;
    }
}

// Global shim for init.js compatibility
window.protectPage = function () {
    // No-op: Protection is now handled by SessionManager.init() onAuthStateChanged
    console.log("🔒 Page protection checked via SessionManager");
};

// Initialize Session Manager
const sessionManager = new SessionManager();
sessionManager.init();


// === Authentication Functions ===

// Handle Login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        // Set persistence based on "Remember Me"
        const persistence = rememberMe
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        await firebase.auth().setPersistence(persistence);

        // Sign In
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update Last Login Logic
        try {
            await db.collection("users").doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (dbError) {
            console.warn("Could not update last login:", dbError);
            // Non-critical, continue
        }

        showNotification('✅ Login successful! Redirecting...', 'success');
        // Redirect handled by onAuthStateChanged

    } catch (error) {
        console.error('Login Error:', error);

        // CHECK FOR DEMO ACCOUNTS
        // If the error is "user-not-found" or "invalid-credentails" AND it matches our demo emails
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
            const demoAccounts = {
                'admin@school.edu': { password: 'admin123', role: 'admin', name: 'Admin User' },
                'teacher@school.edu': { password: 'teacher123', role: 'teacher', name: 'Teacher User' },
                'student@school.edu': { password: 'student123', role: 'student', name: 'Student User' },
                // Allow fallback for these specific passwords even if error is just wrong password (rare edge case in some providers)
            };

            if (demoAccounts[email] && demoAccounts[email].password === password) {
                // It is a demo account attempt that failed. Let's auto-create it!
                await autoCreateDemoUser(email, demoAccounts[email]);
                return; // Exit, autoCreate handles the rest
            }
        }

        let msg = error.message;
        if (error.code === 'auth/user-not-found') msg = 'No user found with this email.';
        if (error.code === 'auth/wrong-password') msg = 'Incorrect password.';
        if (error.code === 'auth/invalid-login-credentials') msg = 'Invalid email or password.';
        showNotification(`❌ ${msg}`, 'error');
    }
}

// Helper: Auto-Create Demo User on first login attempt
async function autoCreateDemoUser(email, userData) {
    showNotification('⚙️ Setting up demo account for the first time...', 'info');

    try {
        // 1. Create Auth User
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, userData.password);
        const user = userCredential.user;

        // 2. Create Firestore Profile
        await db.collection("users").doc(user.uid).set({
            name: userData.name,
            email: email,
            role: userData.role,
            institution: 'Demo University',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Update Profile
        await user.updateProfile({ displayName: userData.name });

        showNotification(`✅ Demo ${userData.role} account created! Logging in...`, 'success');
        // Auth state listener will handle redirect

    } catch (err) {
        console.error("Failed to auto-create demo user:", err);
        showNotification('❌ Failed to set up demo account. Please register manually.', 'error');
    }
}

// Handle Registration
async function handleRegister(event) {
    event.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('role').value;
    const institution = document.getElementById('institution').value;

    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('❌ Passwords do not match', 'error');
        return;
    }

    try {
        // 1. Create Auth User
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 2. Create User Profile in Firestore
        await db.collection("users").doc(user.uid).set({
            name: fullName,
            email: email,
            role: role,
            institution: institution,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Update Auth Profile Display Name
        await user.updateProfile({
            displayName: fullName
        });

        showNotification('✅ Registration successful! Redirecting...', 'success');
        // Redirect handled by onAuthStateChanged

    } catch (error) {
        console.error('Registration Error:', error);
        let msg = error.message;
        if (error.code === 'auth/email-already-in-use') msg = 'Email is already registered.';
        showNotification(`❌ ${msg}`, 'error');
    }
}

// Quick Login (for demo) - Note: This won't work without actual accounts in Firebase
// We'll modify it to fill the form for easier testing if the user has created these accounts
function quickLogin(userType) {
    const credentials = {
        admin: { email: 'admin@school.edu', password: 'admin123' },
        teacher: { email: 'teacher@school.edu', password: 'teacher123' },
        student: { email: 'student@school.edu', password: 'student123' }
    };

    const creds = credentials[userType];
    if (creds) {
        document.getElementById('email').value = creds.email;
        document.getElementById('password').value = creds.password;
        document.getElementById('rememberMe').checked = true;

        showNotification('ℹ️ Credentials filled. Click Sign In if account exists.', 'info');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    // Check if notification container exists
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'}`;
    notification.style.cssText = `
        min-width: 300px;
        margin-bottom: 10px;
        padding: 15px;
        border-radius: 4px;
        color: white;
        background-color: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#F59E0B'};
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    notification.innerHTML = `<span>${message}</span>`;

    container.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        notification.addEventListener('animationend', () => notification.remove());
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Toggle Password Visibility
window.togglePassword = function (fieldId, iconElement) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    // If iconElement is not passed (e.g. strict mode or old calls), try to find it
    // But for inline onclick="togglePassword('id', this)" it works best
    const icon = iconElement || input.parentElement.querySelector('.password-toggle');

    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

// === Real-time Data Synchronization Shim ===
// Porting the existing class to work with Firestore listeners instead of polling
class DataSync {
    constructor() {
        this.unsubscribe = null;
    }

    startAutoSync() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        console.log("🔄 Starting real-time sync...");
        const syncIndicator = document.getElementById('syncIndicator');

        // Listen to User's Students Collection (Example structure)
        // In a real app, you'd listen to specific collections based on role
        this.unsubscribe = db.collection("students").onSnapshot((snapshot) => {
            if (syncIndicator) {
                syncIndicator.innerHTML = '<i class="fa-solid fa-check"></i> Live Synced';
                syncIndicator.style.color = 'var(--success)';
            }

            // Dispatch event for app.js to handle UI updates
            const students = [];
            snapshot.forEach(doc => {
                students.push({ id: doc.id, ...doc.data() });
            });

            // Store in global state or local storage for generic access
            localStorage.setItem('students_cache', JSON.stringify(students));

            // Trigger UI update if app.js functions exist
            if (window.renderStudentsTable) {
                window.renderStudentsTable(students);
            }
            if (window.updateDashboardStats) {
                window.updateDashboardStats(students);
            }
        });
    }

    stopAutoSync() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// Initialize data sync
const dataSync = new DataSync();
