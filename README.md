# Student Performance Prediction & Early Intervention System
A **Client-Side Web Application** designed to predict student academic performance using Machine Learning logic directly in the browser. It helps educators identify at-risk students and suggests proactive interventions.

![Dashboard Preview](dashboard_view.png) 
*(Note: Add a screenshot of your dashboard here if you have one)*

## 🚀 Key Features

*   **Client-Side ML**: Predicts scores and risk levels based on Attendance, Study Hours, and Past Scores without a backend server.
*   **Real-Time Dashboard**: Visualizes class performance, risk distribution, and trends using Chart.js.
*   **Firebase Integration**: Secure Authentication (Email/Password) and Cloud Firestore for saving student data.
*   **Intervention System**: Automatically recommends actions (e.g., "Peer Tutoring", "Counseling") for high-risk students.
*   **Role-Based Access**: Adaptive UI for Admins, Teachers, and Students.
*   **CSV Support**: Import/Export class data easily.

## 🛠️ Technology Stack

*   **Frontend**: HTML5, CSS3 (Glassmorphism Design), JavaScript (ES6+)
*   **Database**: Google Firebase Firestore (NoSQL)
*   **Auth**: Google Firebase Authentication
*   **Visualization**: Chart.js

## 📦 How to Run

Since this is a client-side application, you don't need to install complex dependencies like Node.js or Python environments. You just need a simple HTTP server to serve the files.

### Option 1: Using Python (Recommended)
If you have Python installed:

1.  Clone the repository:
    ```bash
    git clone https://github.com/nagallithirumalesh-stack/student-performance-prediction.git
    cd student-performance-prediction
    ```
2.  Start the server:
    ```bash
    python -m http.server 8000
    ```
3.  Open your browser to: `http://localhost:8000`

### Option 2: VS Code Live Server
1.  Open the folder in VS Code.
2.  Install the "Live Server" extension.
3.  Right-click `login.html` and select "Open with Live Server".

## 🔐 Demo Credentials

You can use these credentials to test the system. **Note: If these accounts don't exist, they will be automatically created for you when you log in!**

*   **Admin**: `admin@school.edu` / `admin123`
*   **Teacher**: `teacher@school.edu` / `teacher123`
*   **Student**: `student@school.edu` / `student123`

## 📂 Project Structure

*   `app.js`: Core application logic (ML prediction, UI rendering, Firebase CRUD).
*   `auth.js`: Authentication handling, Session management, and Real-time syncing.
*   `styles.css`: Custom CSS variable-based design system.
*   `firebase-config.js`: Firebase configuration keys.
*   `dashboard.html`: Main application interface.

## 📝 License

This project is open-source and available for educational purposes.