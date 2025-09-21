import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";

// This is a public configuration. It is safe to expose this.
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZk1hmjkQjELV6dd6LEkcHYyX1n0SpM6Q",
  authDomain: "legalintel-d7c24.firebaseapp.com",
  databaseURL: "https://legalintel-d7c24-default-rtdb.firebaseio.com",
  projectId: "legalintel-d7c24",
  storageBucket: "legalintel-d7c24.appspot.com",
  messagingSenderId: "1031375191696",
  appId: "1:1031375191696:web:5e8c0f7e504c179ec0a215",
  measurementId: "G-K29FJE0FGZ"
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

if (typeof window !== 'undefined') {
    getAnalytics(app);
}
