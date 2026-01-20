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
        this.lastData = []; // Store references to student data
    }

    // Initialize layout based on role
    init() {
        if (!this.currentUser) return;

        console.log(`Initializing layout for role: ${this.currentUser.role}`);

        // Set global body class for role-specific CSS if needed
        document.body.setAttribute('data-role', this.currentUser.role);

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
                this.setupStudentLayout(); // Default to safest view
        }
    }

    // Called whenever Firestore data changes
    onDataUpdated(students) {
        this.lastData = students;
        if (!this.currentUser) return;

        switch (this.currentUser.role) {
            case this.roles.ADMIN:
                this.updateAdminDashboard(students);
                break;
            case this.roles.TEACHER:
                this.updateTeacherDashboard(students);
                break;
            case this.roles.STUDENT:
                this.updateStudentDashboard(students);
                break;
        }
    }

    // === ADMIN LAYOUT ===
    setupAdminLayout() {
        this.updateWelcomeMessage('Admin Dashboard');
        this.showElement('dashboard');
        this.showElement('students');
        this.showElement('predict');
        this.showElement('analytics');
        this.showElement('interventions');

        // Admin sees Add Student buttons
        const addBtn = document.querySelector('button[onclick="openAddStudentModal()"]');
        if (addBtn) addBtn.style.display = 'inline-flex';
    }

    updateAdminDashboard(students) {
        // Standard high-level stats (handled by app.js mostly, but we can refine here)
        // Ensure all charts are visible
        document.getElementById('riskChart').closest('.card').style.display = 'block';
        document.getElementById('trendChart').closest('.card').style.display = 'block';
    }

    // === TEACHER LAYOUT ===
    setupTeacherLayout() {
        this.updateWelcomeMessage('Teacher Dashboard');
        this.showElement('dashboard');
        this.showElement('students');
        this.showElement('predict');
        this.showElement('interventions');

        // Teachers might not need deeper analytics or settings
        this.showElement('analytics');

        // Customize Dashboard Title
        const subtitle = document.querySelector('#dashboard .section-subtitle');
        if (subtitle) subtitle.textContent = 'Monitor class performance and interventions';
    }

    updateTeacherDashboard(students) {
        // Teacher specific highlights
        // e.g. Count of High Risk students should be very prominent
        const highRiskCount = students.filter(s => s.riskLevel === 'high').length;
        if (highRiskCount > 0) {
            this.showNotification(`⚠️ Attention: ${highRiskCount} students are at high risk!`, 'warning');
        }
    }

    // === STUDENT LAYOUT ===
    setupStudentLayout() {
        const firstName = this.currentUser.name.split(' ')[0];
        this.updateWelcomeMessage(`Welcome, ${firstName}!`);

        // Hide features irrelevant to students
        this.hideElement('students'); // Cannot see other students
        this.hideElement('analytics'); // Advanced analytics might be too much, or replace with personal

        // Hide "Add Student" or management buttons
        const addBtn = document.querySelector('button[onclick="openAddStudentModal()"]');
        if (addBtn) addBtn.style.display = 'none';
        const exportBtn = document.querySelector('button[onclick="exportCSV()"]');
        if (exportBtn) exportBtn.style.display = 'none';
        const importBtn = document.querySelector('button[onclick="document.getElementById(\'csvInput\').click()"]');
        if (importBtn) exportBtn.style.display = 'none';

        // Custom Sections
        this.customizePredictionSection();
        this.customizeInterventionSection();

        // === FACE AUTH BUTTONS ===
        // Inject these into the dashboard header or a relevant spot
        this.injectFaceAuthControls();
    }

    injectFaceAuthControls() {
        const header = document.querySelector('.section-header');
        if (header && !document.getElementById('btn-face-group')) {
            const btnGroup = document.createElement('div');
            btnGroup.id = 'btn-face-group';
            btnGroup.className = 'flex gap-2 mt-2';
            btnGroup.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="faceAuthManager.showModal('verify')">
                    <i class="fa-solid fa-camera"></i> Mark Attendance
                </button>
                <button class="btn btn-secondary btn-sm" onclick="faceAuthManager.showModal('register')">
                    <i class="fa-solid fa-id-badge"></i> Register Face ID
                </button>
            `;
            // Append after subtitle
            header.appendChild(btnGroup);
        }
    }

    updateStudentDashboard(allStudents) {
        // Find MY record
        // Try matching by email (if we stored it) or name
        // Since the current 'students' collection might not have emails, we try Name match as fallback
        const myRecord = allStudents.find(s =>
            (s.email && s.email === this.currentUser.email) ||
            (s.name && s.name.toLowerCase() === this.currentUser.name.toLowerCase())
        );

        if (myRecord) {
            this.renderStudentPersonalStats(myRecord, allStudents);
        } else {
            // No data found for this student
            this.renderEmptyStudentState();
        }
    }

    renderStudentPersonalStats(me, allStudents) {
        // 1. Update Cards
        const cards = document.querySelectorAll('.stat-card');
        if (cards.length >= 4) {
            // Card 1: Attendance
            this.updateCard(cards[0], 'My Attendance', `${me.attendance}%`, 'vs Class Avg', this.compare(me.attendance, this.getAvg(allStudents, 'attendance')));

            // Card 2: Predicted Score
            this.updateCard(cards[1], 'Predicted Score', `${me.predictedScore}%`, 'Your Goal: 90%', me.predictedScore > 90 ? 'positive' : 'warning');

            // Card 3: Risk Level
            const riskColor = me.riskLevel === 'high' ? 'negative' : (me.riskLevel === 'medium' ? 'warning' : 'positive');
            this.updateCard(cards[2], 'My Risk Level', me.riskLevel.toUpperCase(), 'Status', riskColor);

            // Card 4: Study Hours
            this.updateCard(cards[3], 'Study Hours', `${me.studyHours}h/day`, 'Recommended: 4h', me.studyHours >= 4 ? 'positive' : 'warning');
        }

        // 2. Personal Chart (Radar: Me vs Avg)
        this.renderStudentComparisonChart(me, allStudents);

        // 3. Hide Generic Charts
        const riskChartCard = document.getElementById('riskChart').closest('.card');
        if (riskChartCard) riskChartCard.style.display = 'none';
    }

    renderEmptyStudentState() {
        const cards = document.querySelectorAll('.stat-card');
        if (cards.length > 0) {
            this.updateCard(cards[0], 'My Attendance', '-', 'No Data', 'neutral');
            this.updateCard(cards[1], 'Predicted Score', '-', 'No Data', 'neutral');
            this.updateCard(cards[2], 'Risk Level', '-', 'Unknown', 'neutral');
            this.updateCard(cards[3], 'Study Hours', '-', 'No Data', 'neutral');
        }
    }

    renderStudentComparisonChart(me, allStudents) {
        const trendCanvas = document.getElementById('trendChart');
        if (!trendCanvas) return;

        // Change Title
        const cardHeader = trendCanvas.closest('.card').querySelector('.card-title');
        if (cardHeader) cardHeader.textContent = 'Me vs Class Average';

        // Calculate Avgs
        const avgAtt = this.getAvg(allStudents, 'attendance');
        const avgScore = this.getAvg(allStudents, 'predictedScore');
        const avgHours = this.getAvg(allStudents, 'studyHours'); // Need to normalize for chart

        // Create Chart
        // Destroy old if exists handled by app.js updateCharts usually, 
        // but here we are overriding specific canvas. 
        // We'll rely on Chart.js existing on the window

        const existingChart = Chart.getChart("trendChart");
        if (existingChart) existingChart.destroy();

        new Chart(trendCanvas, {
            type: 'bar', // Radar is better but Bar is safer for mixed scales
            data: {
                labels: ['Attendance (%)', 'Predicted Score (%)', 'Study Hours (x10)'],
                datasets: [
                    {
                        label: 'Me',
                        data: [me.attendance, me.predictedScore, me.studyHours * 10], // Scaling hours to match 0-100 scale roughly
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                        borderRadius: 4
                    },
                    {
                        label: 'Class Average',
                        data: [avgAtt, avgScore, avgHours * 10],
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    }

    // === Shared Helpers ===
    updateWelcomeMessage(message) {
        const title = document.querySelector('#dashboard .section-title h1');
        if (title) title.innerHTML = `<i class="fa-solid fa-chart-simple"></i> ${message}`;
    }

    hideElement(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.style.display = 'none';
        const navLink = document.querySelector(`a[href="#${elementId}"]`);
        if (navLink && navLink.parentElement) navLink.parentElement.style.display = 'none';
    }

    showElement(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.style.display = 'block';
        const navLink = document.querySelector(`a[href="#${elementId}"]`);
        if (navLink && navLink.parentElement) navLink.parentElement.style.display = 'block';
    }

    customizePredictionSection() {
        const predictSection = document.getElementById('predict');
        if (predictSection) {
            const title = predictSection.querySelector('h2');
            if (title) title.textContent = '🔮 My Performance Predictor';

            const nameInput = document.getElementById('studentName');
            if (nameInput) {
                nameInput.value = this.currentUser.name;
                nameInput.readOnly = true;
            }
        }
    }

    customizeInterventionSection() {
        const interventionSection = document.getElementById('interventions');
        if (interventionSection) {
            const title = interventionSection.querySelector('h2');
            if (title) title.textContent = '🎯 My Recommended Actions';

            // We need to hide the generic grid and show only MY interventions
            // This requires data, will be handled in updateStudentDashboard implicitly 
            // by app.js calling updateInterventions, BUT app.js renders EVERYONE.
            // We need to intercept that. 
            // Solution: We'll modify DOM styles here to hint app.js or override CSS
            // Actually, simpler: RoleManager runs AFTER app.js renders, so we can hide non-relevant ones.
        }
    }

    updateCard(card, label, value, subtext, status) {
        card.querySelector('.stat-label').textContent = label;
        card.querySelector('.stat-value').textContent = value;

        let icon = 'minus';
        let colorClass = 'neutral';

        if (status === 'positive') { icon = 'arrow-up'; colorClass = 'positive'; }
        if (status === 'negative') { icon = 'arrow-down'; colorClass = 'negative'; }
        if (status === 'warning') { icon = 'exclamation-circle'; colorClass = 'text-warning'; }

        const changeEl = card.querySelector('.stat-change');
        changeEl.className = `stat-change ${colorClass}`;
        changeEl.innerHTML = `<span><i class="fa-solid fa-${icon}"></i></span> <span>${subtext}</span>`;
    }

    compare(a, b) {
        if (a > b) return 'positive';
        if (a < b) return 'negative';
        return 'neutral';
    }

    getAvg(list, field) {
        if (!list.length) return 0;
        return (list.reduce((acc, s) => acc + s[field], 0) / list.length).toFixed(1);
    }

    showNotification(msg, type) {
        if (window.showNotification) window.showNotification(msg, type);
    }
}

// Initialize on load
const roleManager = new RoleManager();

// Hook into page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to settle
    setTimeout(() => {
        roleManager.init();
    }, 500);
});
