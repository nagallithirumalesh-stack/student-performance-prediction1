// ===================================
// Chatbot Logic
// Smart Assistant for Student Performance
// ===================================

class ChatbotManager {
    constructor() {
        this.isOpen = false;
        this.suggestions = [
            "My Attendance",
            "Am I at risk?",
            "How to improve?",
            "My Grades",
            "Contact Teacher"
        ];

        this.init();
    }

    init() {
        // Render initial suggestions
        this.renderSuggestions();

        // Show widget after a delay if user is logged in
        if (sessionManager.isLoggedIn()) {
            setTimeout(() => {
                document.getElementById('chatbot-widget').style.display = 'block';
            }, 1000);
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const window = document.getElementById('chatbot-window');
        const toggleBtn = document.getElementById('chatbot-toggle');

        if (this.isOpen) {
            window.classList.add('active');
            toggleBtn.style.transform = 'rotate(90deg)';
            toggleBtn.innerHTML = '✕';

            // Focus input
            setTimeout(() => document.getElementById('chatbot-input').focus(), 300);
        } else {
            window.classList.remove('active');
            toggleBtn.style.transform = 'rotate(0deg)';
            toggleBtn.innerHTML = '💬';
        }
    }

    renderSuggestions() {
        const container = document.getElementById('chatbot-suggestions');
        if (!container) return;

        container.innerHTML = this.suggestions.map(text => `
            <div class="suggestion-chip" onclick="chatbotManager.sendSuggestion('${text}')">
                ${text}
            </div>
        `).join('');
    }

    sendSuggestion(text) {
        document.getElementById('chatbot-input').value = text;
        this.handleInput(new Event('submit'));
    }

    handleInput(event) {
        event.preventDefault();
        const input = document.getElementById('chatbot-input');
        const text = input.value.trim();

        if (!text) return;

        // Add user message
        this.addMessage(text, 'user');
        input.value = '';

        // Remove suggestions temporarily
        // document.getElementById('chatbot-suggestions').style.display = 'none';

        // Show typing indicator
        this.showTyping();

        // Process response
        setTimeout(() => {
            this.hideTyping();
            const response = this.generateResponse(text);
            this.addMessage(response, 'bot');
        }, 600 + Math.random() * 500); // Natural delay
    }

    addMessage(text, type) {
        const container = document.getElementById('chatbot-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}-message`;
        msgDiv.textContent = text;

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    showTyping() {
        const container = document.getElementById('chatbot-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message bot-message';
        typingDiv.innerHTML = '<span class="typing-dots">...</span>';
        typingDiv.style.opacity = '0.7';
        container.appendChild(typingDiv);
        container.scrollTop = container.scrollHeight;
    }

    hideTyping() {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) typingDiv.remove();
    }

    generateResponse(input) {
        const lowerInput = input.toLowerCase();

        // Get generic user data (mock)
        // In real app, we would use roleManager.currentUser or fetch from API
        // For now, let's look at the "sampleStudents" or localStorage
        let userData = null;
        if (sessionManager.getCurrentUser() && sessionManager.getCurrentUser().role === 'student') {
            // Try to find a student profile matching the logged in user
            // For demo, we'll just pick index 0 or try to match name
            const currentUser = sessionManager.getCurrentUser();
            const savedStudents = JSON.parse(localStorage.getItem('students') || '[]');
            // Simple match by name or email logic? 
            // Demo hack: Just use the first student in the list for data if name matches roughly, or default
            userData = savedStudents.find(s => s.name === currentUser.name) || savedStudents[0];
        }

        if (!userData && sessionManager.getCurrentUser()?.role !== 'student') {
            return "As a teacher/admin, you can view student details in the dashboard lists directly.";
        }

        if (!userData) {
            return "I couldn't access your student records. Please ensure you are logged in correctly.";
        }

        // === Intents ===

        // 1. Attendance
        if (lowerInput.includes('attendance') || lowerInput.includes('present')) {
            if (userData.attendance < 75) {
                return `Your attendance is ${userData.attendance}%, which is below the recommended 75%. ⚠️ Try to attend more classes to improve your risk score.`;
            }
            return `Your attendance is currently ${userData.attendance}%. Great job keeping it high! ✅`;
        }

        // 2. Grades / Score
        if (lowerInput.includes('grade') || lowerInput.includes('score') || lowerInput.includes('mark')) {
            return `Your predicted score based on current performance is ${userData.predictedScore}%. (Past Score: ${userData.pastScore}%)`;
        }

        // 3. Risk
        if (lowerInput.includes('risk') || lowerInput.includes('safe') || lowerInput.includes('danger')) {
            if (userData.riskLevel === 'high') {
                return "You are currently flagged as High Risk. 🚨 We recommend scheduling a meeting with your mentor immediately.";
            } else if (userData.riskLevel === 'medium') {
                return "You are at Medium Risk. Increasing your study hours slightly could push you to the safe zone.";
            }
            return "You are Low Risk (Safe Zone). Keep up the excellent work! ⭐";
        }

        // 4. Improvement
        if (lowerInput.includes('improve') || lowerInput.includes('better') || lowerInput.includes('help')) {
            if (userData.studyHours < 3) {
                return "Analysis suggests increasing your study hours to at least 3-4 hours/day would have the biggest impact.";
            }
            if (userData.attendance < 80) {
                return "Focus on attending every single class for the next 2 weeks. Attendance is a key factor in your score.";
            }
            return "Keep participating in class and maintaining your assignment streaks. Consider peer tutoring if you want to push for 90%+.";
        }

        // 5. Greeting
        if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
            return `Hi ${userData.name.split(' ')[0]}! How can I help you succeed today?`;
        }

        // 6. Contact
        if (lowerInput.includes('contact') || lowerInput.includes('teacher')) {
            return "You can email your class coordinator at teacher@school.edu or visit the Staff Room during break hours.";
        }

        // Default
        return "I'm not sure about that. Try asking about your 'attendance', 'risk level', or 'predicted score'.";
    }
}

const chatbotManager = new ChatbotManager();
