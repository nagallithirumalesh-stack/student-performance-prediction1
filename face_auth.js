// ===================================
// Face Authentication Logic
// Handles Webcam & API Communication
// ===================================

const faceAuthManager = {
    stream: null,
    isModelLoaded: false,
    MODEL_URL: 'https://justadudewhohacks.github.io/face-api.js/models', // Public CDN for demo models

    // Initialize Models
    async loadModels() {
        if (this.isModelLoaded) return;

        try {
            console.log("Loading Face API models...");
            await faceapi.nets.ssdMobilenetv1.loadFromUri(this.MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL);
            this.isModelLoaded = true;
            console.log("Face API models loaded.");
        } catch (error) {
            console.error("Error loading Face API models:", error);
            this.showStatus('error', 'Failed to load AI models. Refresh page.');
        }
    },

    // Initialize Webcam
    async startCamera() {
        const video = document.getElementById('face-video');
        if (!video) return;

        // Load models if not ready
        if (!this.isModelLoaded) {
            this.showStatus('loading', 'Loading AI Models...');
            await this.loadModels();
            this.showStatus('neutral', 'Models Ready. requesting camera...');
        }

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

    // 1. Register Face
    async registerFace() {
        const video = document.getElementById('face-video');
        const user = sessionManager.getCurrentUser();

        if (!user) return alert("Please log in first.");

        const btn = document.getElementById('register-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Scan in progress...';
        btn.disabled = true;

        try {
            // Detect face
            const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

            if (!detection) {
                this.showStatus('error', 'No face detected! Look at camera.');
                return;
            }

            // Convert Float32Array to standard array for Firestore
            const descriptor = Array.from(detection.descriptor);

            // Save to Firestore Users Collection
            // We assume a 'users' collection exists where documents are keyed by email or contain it
            // For this quick demo, we'll try to update the user profile found by email
            const userQuery = await db.collection('users').where('email', '==', user.email).get();

            if (!userQuery.empty) {
                // Update existing
                const docId = userQuery.docs[0].id;
                await db.collection('users').doc(docId).update({
                    faceDescriptor: descriptor,
                    faceRegisteredAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Should not happen if auth flux works, but fallback creation 
                await db.collection('users').add({
                    ...user,
                    faceDescriptor: descriptor,
                    faceRegisteredAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            this.showStatus('success', 'Face ID Registered Successfully!');
            setTimeout(() => this.closeModal(), 2000);

        } catch (error) {
            console.error("Registration failed:", error);
            this.showStatus('error', 'Registration Error: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    // 2. Verify Attendance
    async captureAndVerify() {
        const video = document.getElementById('face-video');
        const user = sessionManager.getCurrentUser();

        if (!user) return alert("Please log in first.");

        const btn = document.getElementById('capture-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Verifying...';
        btn.disabled = true;

        try {
            // 1. Fetch User's Face Data
            const userQuery = await db.collection('users').where('email', '==', user.email).get();
            if (userQuery.empty) {
                this.showStatus('error', 'No Face ID found. Please Register first.');
                return;
            }
            const userData = userQuery.docs[0].data();
            if (!userData.faceDescriptor) {
                this.showStatus('error', 'No Face ID registered for this account.');
                return;
            }

            // 2. Detect Live Face
            const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
            if (!detection) {
                this.showStatus('error', 'No face detected in camera.');
                return;
            }

            // 3. Compare
            const distance = faceapi.euclideanDistance(userData.faceDescriptor, detection.descriptor);
            console.log("Face Distance:", distance);

            // Threshold: < 0.6 is usually a match
            if (distance < 0.6) {
                this.showStatus('success', `Verified! Match Score: ${((1 - distance) * 100).toFixed(0)}%`);
                await this.markAttendanceSuccess(user, userData);
            } else {
                this.showStatus('error', 'Face does not match records.');
            }

        } catch (error) {
            console.error("Verification error:", error);
            this.showStatus('error', 'System error during verification.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    async markAttendanceSuccess(user, userData) {
        // Find the "student" record if it exists to update attendance stats
        // Also log an "attendance_logs" entry
        try {
            await db.collection('attendance_logs').add({
                email: user.email,
                name: user.name,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                method: 'face_auth',
                status: 'present'
            });

            // Update student record attendance % (Mock update for demo joy)
            const studentQuery = await db.collection('students').where('email', '==', user.email).get();
            if (!studentQuery.empty) {
                const studentDoc = studentQuery.docs[0];
                const currentAtt = studentDoc.data().attendance || 0;
                if (currentAtt < 100) {
                    // Add 1% for fun
                    await studentDoc.ref.update({ attendance: Math.min(100, currentAtt + 1) });
                    showNotification('Attendance boosted! +1%', 'success');
                }
            }

            setTimeout(() => {
                this.closeModal();
                showNotification(`✅ Attendance Marked for ${user.name}`, 'success');
            }, 1000);

        } catch (err) {
            console.error("DB Error", err);
        }
    },

    // UI Helpers
    showModal(mode = 'verify') {
        const modal = document.getElementById('face-auth-modal');
        modal.classList.add('active');
        this.startCamera();

        // Toggle buttons based on mode
        const captureBtn = document.getElementById('capture-btn');
        const registerBtn = document.getElementById('register-btn');

        if (mode === 'register') {
            captureBtn.style.display = 'none';
            registerBtn.style.display = 'inline-flex';
            document.getElementById('face-modal-title').textContent = 'Register Face ID';
        } else {
            captureBtn.style.display = 'inline-flex';
            registerBtn.style.display = 'none';
            document.getElementById('face-modal-title').textContent = 'Mark Face Attendance';
        }

        this.showStatus('neutral', 'Align face in camera');
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

        // Dynamic colors handled by CSS classes or inline here for speed
        if (type === 'success') statusEl.style.color = '#10B981';
        else if (type === 'error') statusEl.style.color = '#EF4444';
        else statusEl.style.color = '#b8b8d1';
    }
};

// Add CSS for status dynamically if needed, or rely on styles.css
