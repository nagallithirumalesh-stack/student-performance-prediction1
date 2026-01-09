// ===================================
// Face Authentication Logic
// Handles Webcam & API Communication
// ===================================

const faceAuthManager = {
    stream: null,

    // Initialize Webcam
    async startCamera() {
        const video = document.getElementById('face-video');
        if (!video) return;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = this.stream;
            document.getElementById('face-error').style.display = 'none';
        } catch (err) {
            console.error("Camera Error:", err);
            document.getElementById('face-error').style.display = 'block';
            document.getElementById('face-error').textContent = "Camera access denied. Please enable camera permissions.";
        }
    },

    // Stop Webcam
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    // Capture Image and Send to Backend
    async captureAndVerify() {
        const video = document.getElementById('face-video');
        const canvas = document.createElement('canvas');

        if (!video || !this.stream) return;

        // Draw video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        // Convert to Blob
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'capture.jpg');

            // Show loading state
            const btn = document.getElementById('capture-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '🔍 Verifying...';
            btn.disabled = true;

            try {
                // Send to backend
                const response = await fetch('http://127.0.0.1:8000/api/face/recognize', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Success Animation
                    this.showStatus('success', `Verified: ${result.student_id}`);

                    // Mark attendance visually
                    setTimeout(() => {
                        this.closeModal();
                        showNotification(`Attendance Marked for ${result.student_id}`, 'success');
                    }, 1500);

                } else {
                    this.showStatus('error', 'Face not recognized. Try again.');
                }

            } catch (error) {
                console.error("API Error:", error);
                this.showStatus('error', 'Server error. Is backend running?');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }, 'image/jpeg');
    },

    // Register Face (For Setup/Demo)
    async registerFace() {
        const video = document.getElementById('face-video');
        const canvas = document.createElement('canvas');

        if (!video || !this.stream) return;

        // Current User
        const user = sessionManager.getCurrentUser();
        if (!user || user.role !== 'student') {
            alert("Only logged-in students can register a face.");
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'register.jpg');
            formData.append('student_id', user.name); // Using name as ID for demo

            try {
                const response = await fetch('http://127.0.0.1:8000/api/face/register', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    showNotification('Face Registered Successfully!', 'success');
                    this.closeModal();
                } else {
                    alert('Registration failed.');
                }
            } catch (err) {
                alert('Server error during registration.');
            }
        });
    },

    // UI Helpers
    showModal(mode = 'verify') {
        const modal = document.getElementById('face-auth-modal');
        modal.classList.add('active');
        this.startCamera();

        // Toggle buttons based on mode
        document.getElementById('capture-btn').style.display = mode === 'verify' ? 'block' : 'none';
        document.getElementById('register-btn').style.display = mode === 'register' ? 'block' : 'none';
        document.getElementById('face-modal-title').textContent = mode === 'verify' ? 'Face Attendance' : 'Register Face ID';
    },

    closeModal() {
        const modal = document.getElementById('face-auth-modal');
        modal.classList.remove('active');
        this.stopCamera();
    },

    showStatus(type, msg) {
        const statusEl = document.getElementById('face-status');
        statusEl.textContent = msg;
        statusEl.className = `face-status status-${type}`;
        statusEl.style.display = 'block';
    }
};

// Add CSS for status dynamically if needed, or rely on styles.css
