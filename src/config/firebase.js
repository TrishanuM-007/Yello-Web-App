import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCz-S39YxpPzUOI9OVMnNXd0zWhpPB9aa4",
  authDomain: "yello-9355c.firebaseapp.com",
  projectId: "yello-9355c",
  storageBucket: "yello-9355c.firebasestorage.app",
  messagingSenderId: "654814927507",
  appId: "1:654814927507:web:fc7a2d8b9f8c4c0d5a4b66",
  measurementId: "G-7G4MY8VHZ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Disable app verification for testing (skips ReCaptcha for test numbers)
auth.settings.appVerificationDisabledForTesting = true;

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
