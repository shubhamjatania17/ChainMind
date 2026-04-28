# ChainMind - AI-Powered Supply Chain Digital Twin

## Overview

ChainMind is a prototype web application simulating a supply chain digital twin. It uses React (Vite), Node.js (Express), Firebase (Auth & RTDB), and the Google Gemini API.

## Features

- **Authentication**: Email/Password and Google Sign-In.
- **Real-Time Dashboard**: Monitor 3 warehouse stock levels live using Firebase RTDB.
- **Simulation Engine**: Triggers a 30% demand surge and dynamically calculates risk (< 80 stock).
- **AI Insights**: Generates actionable recommendations via the Gemini API.

## Setup Instructions

### 1. External Services Needed

- **Firebase Project**:  
  - Enable Authentication (Email/Password & Google).
  - Enable Realtime Database and set rules to allow read/write (e.g., `".read": "auth != null", ".write": "auth != null"` for testing).
  - Get the Web App Configuration.

- **Google Gemini API Key**:
  - Get a key from Google AI Studio.

### 2. Configuration

**Client (`/client/.env`)**

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
VITE_FIREBASE_DATABASE_URL="your-database-url"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

**Server (`/server/.env`)**

```env
PORT=5000
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Running the App

1. Open two terminal windows.
2. **Start the backend server:**

   ```bash
   cd server
   npm install
   npm run start
   # or node index.js
   ```

3. **Start the frontend client:**

   ```bash
   cd client
   npm install
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`.
