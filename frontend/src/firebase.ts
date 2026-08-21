import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider } from "firebase/auth";

// Replace these with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
console.log("MY API KEY IS:", import.meta.env.VITE_FIREBASE_API_KEY);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const githubProvider = new GithubAuthProvider();
// CRITICAL: This scope grants permission to list the user's GitHub repositories
githubProvider.addScope("repo");