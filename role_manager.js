// ===================================
// Role-Based UI Manager
// Handles layout changes based on user role
// ===================================

class RoleManager {
    constructor() {
        this.currentUser = sessionManager.getCurrentUser();
        this.roles = {
            ADMIN: 'admin',
            TEACHER: 'teacher',
            STUDENT: 'student'
        };
    }

    // Initialize layout based on role
    init() {
        if (!this.currentUser) return;

        console.log(`Initializing layout for role: ${this.currentUser.role}`);

        switch (this.currentUser.role) {
            case this.roles.ADMIN:
                this.setupAdminLayout();
                break;
            case this.roles.TEACHER:
                this.setupTeacherLayout();
                break;
            case this.roles.STUDENT:
                this.setupStudentLayout();
                break;
            default:
                console.warn('Unknown role:', this.currentUser.role);
        }
    }

    // === ADMIN LAYOUT ===
    // Full access to everything
    setupAdminLayout() {
        // Admin sees everything, no changes needed
        this.updateWelcomeMessage('Admin Dashboard');
        this.showElement('interventions');
        this.showElement('predict');
        this.showElement('students');
        this.showElement('analytics');
    }

    // === TEACHER LAYOUT ===
    // Can view students, predict, but maybe restricted from some admin settings (if any)
    setupTeacherLayout() {
        this.updateWelcomeMessage('Teacher Dashboard');
        // Teacher specific adjustments
        // Only show students from their class (mock logic)
        // Hide global admin settings
    }

    // === STUDENT LAYOUT ===
    // Restricted view: personal stats, personal interventions
    setupStudentLayout() {
        this.updateWelcomeMessage(`Welcome, ${this.currentUser.name.split(' ')[0]}!`);

        // Hide detailed analytics and student management list
        this.hideElement('students'); // Students shouldn't see other students list
        // this.hideElement('analytics'); // Maybe keep analytics but personalized?

        // Customize Dashboard
        this.customizeStudentDashboard();

        // Customize Prediction
        // Students can predict their own score but interface might be simpler
        const predictSection = document.getElementById('predict');
        if (predictSection) {
            const title = predictSection.querySelector('h2');
            if (title) title.textContent = '🔮 My Performance Predictor';

            const subtitle = predictSection.querySelector('.section-subtitle');
            if (subtitle) subtitle.textContent = 'See how your study habits affect your score';

            // Auto-fill student name
            const nameInput = document.getElementById('studentName');
            if (nameInput) {
                nameInput.value = this.currentUser.name;
                nameInput.readOnly = true;
            }
        }

        // Customize Interventions
        const interventionSection = document.getElementById('interventions');
        if (interventionSection) {
            const title = interventionSection.querySelector('h2');
            if (title) title.textContent = '🎯 My Recommended Actions';

            const subtitle = interventionSection.querySelector('.section-subtitle');
            if (subtitle) subtitle.textContent = 'Personalized steps to improve your performance';
        }
    }

    // === Helper Functions ===

    updateWelcomeMessage(message) {
        const title = document.querySelector('#dashboard .section-title h1');
        if (title) title.textContent = `📊 ${message}`;
    }

    hideElement(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.style.display = 'none';

        // Also hide nav link
        const navLink = document.querySelector(`a[href="#${elementId}"]`);
        if (navLink && navLink.parentElement) navLink.parentElement.style.display = 'none';
    }

    showElement(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.style.display = 'block';

        // Show nav link
        const navLink = document.querySelector(`a[href="#${elementId}"]`);
        if (navLink && navLink.parentElement) navLink.parentElement.style.display = 'block';
    }

    customizeStudentDashboard() {
        // Example: Hide "Total Students" card and show "My Rank" or similar
        const cards = document.querySelectorAll('.stat-card');
        if (cards.length >= 4) {
            // Modify first card (Total Students -> Attendance)
            cards[0].querySelector('.stat-label').textContent = 'My Attendance';
            cards[0].querySelector('.stat-value').textContent = '92%';

            // Modify third card (High Risk -> My Risk Level)
            cards[2].querySelector('.stat-label').textContent = 'Risk Level';
            cards[2].querySelector('.stat-value').textContent = 'Low';
            cards[2].querySelector('.stat-value').style.color = 'var(--success)';
            cards[2].querySelector('.stat-change').innerHTML = '<span>Safe Zone</span>';
            cards[2].querySelector('.stat-change').className = 'stat-change positive';
        }

        // Hide generic charts
        const riskChartCard = document.getElementById('riskChart').closest('.card');
        if (riskChartCard) riskChartCard.style.display = 'none';
    }
}

// Initialize on load
const roleManager = new RoleManager();

// Hook into page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other scripts
    setTimeout(() => {
        roleManager.init();
    }, 100);
});
