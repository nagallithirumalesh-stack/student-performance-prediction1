// Firebase MVC Configuration

// IMPORT USER CONFIG HERE
const firebaseConfig = {
    apiKey: "AIzaSyBN6MTZ9k1nqbZwVF5S4I51hjN8uZtSvzU",
    authDomain: "student-predictor-6692b.firebaseapp.com",
    projectId: "student-predictor-6692b",
    storageBucket: "student-predictor-6692b.firebasestorage.app",
    messagingSenderId: "701272466076",
    appId: "1:701272466076:web:9bed3d586d316998604359"
};

// Initialize Firebase
// We use the compat library for easiest integration with existing vanilla JS structure
let app, auth, db;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("🔥 Firebase Initialized Successfully");
} catch (error) {
    console.error("❌ Firebase Initialization Error:", error);
}
