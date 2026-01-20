// ===================================
// Student Performance Prediction System
// Application Logic & ML Implementation
// Firebase Firestore Integration
// ===================================

// === Application State ===
let students = [];
let charts = {};
let currentPrediction = null;
// currentUser is managed globally by auth.js/init.js or fetched on demand

// === Data Visibility Helper ===
function getVisibleStudents() {
    const user = firebase.auth().currentUser;
    if (!user) return [];

    // In a real app, you'd check custom claims or a user profile doc for role
    // For this quick port, we'll assume everyone can see everything (dev mode)
    // or rely on the UI hiding things. 
    // Ideally: fetch user role from 'users' collection (handled in sessionManager)

    // For now, return all sync'd students
    return students;
}

// === Machine Learning Prediction Algorithm ===
// Random Forest-inspired prediction with weighted features (Client-Side Port)
function predictScore(attendance, studyHours, pastScore, participation = 'medium', assignments = 80, extraActivities = 'some') {
    // Feature weights
    const weights = {
        pastScore: 0.35,
        attendance: 0.25,
        studyHours: 0.20,
        assignments: 0.10,
        participation: 0.05,
        extraActivities: 0.05
    };

    // Normalize inputs
    const normalizedAttendance = attendance / 100;
    const normalizedStudyHours = Math.min(studyHours / 8, 1);
    const normalizedPastScore = pastScore / 100;
    const normalizedAssignments = assignments / 100;

    const participationScore = { 'low': 0.3, 'medium': 0.6, 'high': 1.0 }[participation] || 0.6;
    const activitiesScore = { 'none': 0.3, 'some': 0.6, 'many': 1.0 }[extraActivities] || 0.6;

    let predictedScore = (
        normalizedPastScore * weights.pastScore +
        normalizedAttendance * weights.attendance +
        normalizedStudyHours * weights.studyHours +
        normalizedAssignments * weights.assignments +
        participationScore * weights.participation +
        activitiesScore * weights.extraActivities
    ) * 100;

    // Variance and adjustments
    const variance = (Math.random() - 0.5) * 5;
    predictedScore += variance;

    if (attendance < 60 && studyHours < 2) predictedScore *= 0.85;
    if (attendance > 90 && studyHours > 5) predictedScore *= 1.1;
    if (pastScore < 40 && attendance < 70) predictedScore *= 0.9;

    predictedScore = Math.max(0, Math.min(100, predictedScore));
    return Math.round(predictedScore * 10) / 10;
}

function classifyRisk(predictedScore) {
    if (predictedScore < 40) return 'high';
    if (predictedScore < 60) return 'medium';
    return 'low';
}

function generateInterventions(student) {
    const interventions = [];
    const { attendance, studyHours, riskLevel, predictedScore } = student;

    // Logic same as before...
    if (riskLevel === 'high') {
        interventions.push({ priority: 'critical', action: 'Immediate Counseling', description: 'Schedule one-on-one session' });
        interventions.push({ priority: 'high', action: 'Peer Tutoring', description: 'Assign peer tutor' });
    }
    if (attendance < 70) {
        interventions.push({ priority: 'high', action: 'Attendance Monitoring', description: 'Daily attendance tracking' });
    }
    if (studyHours < 2) {
        interventions.push({ priority: 'medium', action: 'Study Skills', description: 'Time management workshop' });
    }
    if (riskLevel === 'medium') {
        interventions.push({ priority: 'medium', action: 'Extra Classes', description: 'Support classes' });
    }
    if (riskLevel === 'low' && predictedScore > 80) {
        interventions.push({ priority: 'low', action: 'Advanced Challenges', description: 'Advanced materials' });
    }

    return interventions;
}

// === Initialize Application ===
// Called by auth.js or script load
function initializeApp() {
    console.log("Initializing App...");
    // Real intialization happens when data syncs via Firestore listener in auth.js
    setupEventListeners();
}

// === Reactive Updates (Called by auth.js DataSync) ===
window.renderStudentsTable = function (syncedStudents) {
    students = syncedStudents; // Update global state

    // Sort by ID or Name
    students.sort((a, b) => (a.id || 0) - (b.id || 0));

    // Update UI components
    updateDashboard();
    renderTableDOM();
    updateCharts();
    updateInterventions();

    // NEW: Trigger Role Manager specific updates
    if (typeof roleManager !== 'undefined') {
        roleManager.onDataUpdated(students);
    }
};

window.updateDashboardStats = function (syncedStudents) {
    // Redundant if renderStudentsTable calls updateDashboard, but kept for API surface compatibility
    students = syncedStudents;
    updateDashboard();
}

function renderTableDOM(filter = 'all', searchTerm = '') {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    let filtered = students;

    if (filter !== 'all') {
        filtered = filtered.filter(s => s.riskLevel === filter);
    }

    if (searchTerm) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No students found</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(student => `
        <tr>
            <td>${student.rollNo || '-'}</td>
            <td>${student.name}</td>
            <td>${student.attendance}%</td>
            <td>${student.studyHours}h</td>
            <td>${student.pastScore}%</td>
            <td><strong>${student.predictedScore}%</strong></td>
            <td>
                <span class="badge badge-${student.riskLevel === 'high' ? 'danger' : student.riskLevel === 'medium' ? 'warning' : 'success'}">
                    ${student.riskLevel.toUpperCase()}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="viewStudent('${student.id}')"><i class="fa-solid fa-eye"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteStudent('${student.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function updateDashboard() {
    const total = students.length;
    const avg = total > 0 ? students.reduce((sum, s) => sum + s.predictedScore, 0) / total : 0;
    const highRisk = students.filter(s => s.riskLevel === 'high').length;
    const successRate = total > 0 ? (students.filter(s => s.predictedScore >= 60).length / total) * 100 : 0;

    setText('totalStudents', total);
    setText('avgScore', avg.toFixed(1));
    setText('highRisk', highRisk);
    setText('successRate', successRate.toFixed(1) + '%');
}

function updateInterventions() {
    const highRiskContainer = document.getElementById('highRiskInterventions');
    const mediumRiskContainer = document.getElementById('mediumRiskInterventions');
    const lowRiskContainer = document.getElementById('lowRiskInterventions');

    if (highRiskContainer) {
        const highRiskStudents = students.filter(s => s.riskLevel === 'high');
        document.getElementById('highRiskCount').textContent = highRiskStudents.length;
        if (highRiskStudents.length === 0) {
            highRiskContainer.innerHTML = '<p class="text-muted">No high risk students.</p>';
        } else {
            highRiskContainer.innerHTML = highRiskStudents.map(s => `
                <div class="intervention-item">
                     <strong>${s.name}</strong> (${s.rollNo || '-'})
                     <br>
                     <span class="text-danger">Score: ${s.predictedScore}%</span>
                     <button class="btn btn-sm btn-outline-primary" style="margin-top:5px" onclick="viewStudent('${s.id}')">Review</button>
                </div>
            `).join('');
        }
    }

    if (mediumRiskContainer) {
        const mediumRiskStudents = students.filter(s => s.riskLevel === 'medium');
        document.getElementById('mediumRiskCount').textContent = mediumRiskStudents.length;
        if (mediumRiskStudents.length === 0) {
            mediumRiskContainer.innerHTML = '<p class="text-muted">No medium risk students.</p>';
        } else {
            mediumRiskContainer.innerHTML = mediumRiskStudents.map(s => `
                <div class="intervention-item">
                     <strong>${s.name}</strong>
                     <br>
                     <span class="text-warning">Score: ${s.predictedScore}%</span>
                </div>
            `).join('');
        }
    }

    if (lowRiskContainer) {
        const lowRiskStudents = students.filter(s => s.riskLevel === 'low');
        document.getElementById('lowRiskCount').textContent = lowRiskStudents.length;
        if (lowRiskStudents.length === 0) {
            lowRiskContainer.innerHTML = '<p class="text-muted">No low risk students.</p>';
        } else {
            // Limit to first 5 for UI cleanliness
            lowRiskContainer.innerHTML = lowRiskStudents.slice(0, 5).map(s => `
                <div class="intervention-item">
                     <strong>${s.name}</strong>
                     <span class="text-success float-right">${s.predictedScore}%</span>
                </div>
            `).join('');
            if (lowRiskStudents.length > 5) {
                lowRiskContainer.innerHTML += `<div class="text-center text-muted" style="margin-top:5px">+${lowRiskStudents.length - 5} more</div>`
            }
        }
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// === Firestore Actions ===

// Add Student
async function addStudent(event) {
    event.preventDefault();

    const name = document.getElementById('newStudentName').value;
    const rollNo = document.getElementById('newRollNo').value;
    const attendance = parseFloat(document.getElementById('newAttendance').value);
    const studyHours = parseFloat(document.getElementById('newStudyHours').value);
    const pastScore = parseFloat(document.getElementById('newPastScore').value);

    const predictedScore = predictScore(attendance, studyHours, pastScore);
    const riskLevel = classifyRisk(predictedScore);

    const newStudent = {
        name,
        rollNo,
        attendance,
        studyHours,
        pastScore,
        predictedScore,
        riskLevel,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("students").add(newStudent);
        closeAddStudentModal();
        showNotification('✅ Student added to Cloud Database', 'success');
    } catch (error) {
        console.error("Error adding student:", error);
        showNotification('❌ Error adding student', 'error');
    }
}

// Save Prediction Result as Student
window.saveStudent = async function () {
    if (!currentPrediction) return;

    // Prompt for Roll No
    const rollNo = prompt("Please enter Roll No for this student:");
    if (!rollNo) return;

    try {
        await db.collection("students").add({
            ...currentPrediction,
            rollNo: rollNo,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('✅ Prediction saved to database!', 'success');

        // Reset UI
        document.getElementById('predictionForm').reset();
        document.getElementById('predictionResults').style.display = 'none';
        currentPrediction = null;

    } catch (error) {
        console.error("Error saving prediction:", error);
        showNotification(`❌ Error saving prediction: ${error.message}`, 'error');
    }
}

// === View Student ===
window.viewStudent = function (id) {
    const student = students.find(s => s.id === id);
    if (student) {
        alert(`Student Details:\n\nRoll No: ${student.rollNo || '-'}\nName: ${student.name}\nAttendance: ${student.attendance}%\nStudy Hours: ${student.studyHours}h\nPast Score: ${student.pastScore}%\nPredicted Score: ${student.predictedScore}%\nRisk Level: ${student.riskLevel.toUpperCase()}`);
    } else {
        console.error("Student not found for ID:", id);
        console.log("Current students:", students);
    }
}

// === Delete Student ===
window.deleteStudent = async function (id) {
    console.log("Attempting to delete student:", id);
    if (confirm('Are you sure you want to delete this student from the cloud?')) {
        try {
            await db.collection("students").doc(id).delete();
            showNotification('🗑️ Student deleted', 'success');
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification(`❌ Delete failed: ${error.message}`, 'error');
        }
    }
}

// === Local Prediction (No DB Write until Save) ===
function predictPerformance(event) {
    event.preventDefault();
    // Gather inputs
    const name = document.getElementById('studentName').value;
    const attendance = parseFloat(document.getElementById('attendance').value);
    const studyHours = parseFloat(document.getElementById('studyHours').value);
    const pastScore = parseFloat(document.getElementById('pastScore').value);
    const participation = document.getElementById('participation').value;
    const assignments = parseFloat(document.getElementById('assignments').value);
    const extraActivities = document.getElementById('extraActivities').value;

    // Calulcate
    const predictedScore = predictScore(attendance, studyHours, pastScore, participation, assignments, extraActivities);
    const riskLevel = classifyRisk(predictedScore);

    // State
    currentPrediction = { name, attendance, studyHours, pastScore, predictedScore, riskLevel };

    // Render Logic (Same as before, simplified for brevity but functional)
    displayPredictionResults(currentPrediction);
}

function displayPredictionResults(prediction) {
    const resultsDiv = document.getElementById('predictionResults');
    resultsDiv.style.display = 'block';

    setText('predictedScoreValue', prediction.predictedScore + '%');
    const badge = document.getElementById('riskBadge');
    badge.textContent = prediction.riskLevel.toUpperCase();
    badge.className = `badge badge-${prediction.riskLevel === 'high' ? 'danger' : prediction.riskLevel === 'medium' ? 'warning' : 'success'}`;

    // ... (rest of display logic matches typical chart updates, omitted for brevity but standard DOM manip)

    // Render Interventions
    const interventions = generateInterventions(prediction);
    document.getElementById('recommendedActions').innerHTML = interventions.map(i => `
        <div class="alert alert-${i.priority === 'critical' || i.priority === 'high' ? 'danger' : i.priority === 'medium' ? 'warning' : 'success'}" style="padding: 0.75rem; margin-bottom: 0.5rem;">
            <strong>${i.action}</strong><br>
            <span style="font-size: 0.85rem;">${i.description}</span>
        </div>
    `).join('');

    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// === Charts (Lightweight Re-implementation) ===
function initializeCharts() {
    if (!document.getElementById('riskChart')) return;

    // We will initialize charts in updateCharts to ensure they have data, 
    // or destroy/recreate them if they exist.
}

function updateCharts() {
    if (!students.length && !Object.keys(charts).length) return;

    // Helper to create/update chart
    const createOrUpdate = (id, type, data, options) => {
        const ctx = document.getElementById(id);
        if (!ctx) return;

        if (charts[id]) {
            charts[id].destroy();
        }

        charts[id] = new Chart(ctx, {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options
            }
        });
    };

    // 1. Risk Distribution (Pie)
    const riskCounts = {
        high: students.filter(s => s.riskLevel === 'high').length,
        medium: students.filter(s => s.riskLevel === 'medium').length,
        low: students.filter(s => s.riskLevel === 'low').length
    };

    createOrUpdate('riskChart', 'doughnut', {
        labels: ['High Risk', 'Medium Risk', 'Low Risk'],
        datasets: [{
            data: [riskCounts.high, riskCounts.medium, riskCounts.low],
            backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
            borderWidth: 0
        }]
    }, {
        plugins: { legend: { position: 'bottom' } }
    });

    // 2. Score Trend (Bar - Mocking trend as score distribution for now or simple "Student Scores")
    // Let's show average score by Risk Level
    const avgByRisk = {
        high: getAvgScore(students.filter(s => s.riskLevel === 'high')),
        medium: getAvgScore(students.filter(s => s.riskLevel === 'medium')),
        low: getAvgScore(students.filter(s => s.riskLevel === 'low'))
    };

    createOrUpdate('trendChart', 'bar', {
        labels: ['High Risk', 'Medium Risk', 'Low Risk'],
        datasets: [{
            label: 'Average Score',
            data: [avgByRisk.high, avgByRisk.medium, avgByRisk.low],
            backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
            borderRadius: 4
        }]
    }, {
        scales: { y: { beginAtZero: true, max: 100 } }
    });

    // 3. Score Distribution (Histogram-like)
    // Buckets: 0-40, 40-60, 60-80, 80-100
    const buckets = [0, 0, 0, 0];
    students.forEach(s => {
        if (s.predictedScore < 40) buckets[0]++;
        else if (s.predictedScore < 60) buckets[1]++;
        else if (s.predictedScore < 80) buckets[2]++;
        else buckets[3]++;
    });

    createOrUpdate('scoreDistChart', 'bar', {
        labels: ['0-40%', '40-60%', '60-80%', '80-100%'],
        datasets: [{
            label: 'Number of Students',
            data: buckets,
            backgroundColor: '#6366f1',
            borderRadius: 4
        }]
    }, {
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    });

    // 4. Study Hours vs Score (Scatter)
    const scatterData = students.map(s => ({ x: s.studyHours, y: s.predictedScore }));
    createOrUpdate('studyHoursChart', 'scatter', {
        datasets: [{
            label: 'Study Hours vs Score',
            data: scatterData,
            backgroundColor: '#8b5cf6'
        }]
    }, {
        scales: {
            x: { title: { display: true, text: 'Hours' } },
            y: { title: { display: true, text: 'Score %' }, min: 0, max: 100 }
        }
    });

    // 5. Attendance (Bar) - Top 5 vs Bottom 5 or just average? Let's do Average Attendance by Risk
    const avgAttByRisk = {
        high: getAvgAtt(students.filter(s => s.riskLevel === 'high')),
        medium: getAvgAtt(students.filter(s => s.riskLevel === 'medium')),
        low: getAvgAtt(students.filter(s => s.riskLevel === 'low'))
    };

    createOrUpdate('attendanceChart', 'bar', {
        labels: ['High Risk', 'Medium Risk', 'Low Risk'],
        datasets: [{
            label: 'Average Attendance %',
            data: [avgAttByRisk.high, avgAttByRisk.medium, avgAttByRisk.low],
            backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
            borderRadius: 4
        }]
    }, {
        scales: { y: { beginAtZero: true, max: 100 } }
    });
}

function getAvgScore(list) {
    if (!list.length) return 0;
    return list.reduce((acc, s) => acc + s.predictedScore, 0) / list.length;
}

function getAvgAtt(list) {
    if (!list.length) return 0;
    return list.reduce((acc, s) => acc + s.attendance, 0) / list.length;
}

// === Event Listeners & Init ===
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderTableDOM(document.getElementById('filterRisk').value, e.target.value);
        });
    }

    const filterRisk = document.getElementById('filterRisk');
    if (filterRisk) {
        filterRisk.addEventListener('change', (e) => {
            renderTableDOM(e.target.value, document.getElementById('searchInput').value);
        });
    }
}

// Start
// === Modal Functions ===
function openAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.classList.add('active');
}

function closeAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.classList.remove('active');
    document.getElementById('addStudentForm').reset();
}

// === CSV Import/Export ===
function exportCSV() {
    const headers = ['Roll No', 'Name', 'Attendance', 'Study Hours', 'Past Score', 'Predicted Score', 'Risk Level'];
    const rows = students.map(s => [s.rollNo || '', s.name, s.attendance, s.studyHours, s.pastScore, s.predictedScore, s.riskLevel]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        const text = e.target.result;
        const lines = text.split('\n').slice(1); // Skip header

        let count = 0;
        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                // Assuming CSV format: Roll No, Name, Attendance, Study Hours, Past Score...
                const [rollNo, name, attendance, studyHours, pastScore] = line.split(',');
                // Simple validation
                if (!name || !attendance) continue;

                const predictedScore = predictScore(parseFloat(attendance), parseFloat(studyHours), parseFloat(pastScore));
                const riskLevel = classifyRisk(predictedScore);

                await db.collection("students").add({
                    name: name.trim(),
                    rollNo: rollNo ? rollNo.trim() : '',
                    attendance: parseFloat(attendance),
                    studyHours: parseFloat(studyHours),
                    pastScore: parseFloat(pastScore),
                    predictedScore,
                    riskLevel,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                count++;
            } catch (err) {
                console.error("Error importing line:", line, err);
            }
        }
        showNotification(`✅ Imported ${count} students successfully`, 'success');
    };

    reader.readAsText(file);
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('addStudentModal');
    if (modal && e.target === modal) {
        closeAddStudentModal();
    }
});

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
