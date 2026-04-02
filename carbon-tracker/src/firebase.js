// ============================================================
// CONFIGURATION FIREBASE
// ============================================================
// 1. Allez sur https://console.firebase.google.com
// 2. Créez un projet "carbon-tracker"
// 3. Activez Authentication (Email/Password)
// 4. Créez une base Firestore
// 5. Remplacez les valeurs ci-dessous par celles de votre projet
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyC8S_oT7nDNPqrutH2uO6B-5b-FiBVZGyE",
    authDomain: "carbon-tracker-ace54.firebaseapp.com",
    projectId: "carbon-tracker-ace54",
    storageBucket: "carbon-tracker-ace54.firebasestorage.app",
    messagingSenderId: "6777817056",
    appId: "1:6777817056:web:1e03d0ab5e044fc43d0d85",
    measurementId: "G-RW6CR3H29Y"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;



