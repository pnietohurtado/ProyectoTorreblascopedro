import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmS7u3iX8cJuTZzQu8XHQXu4yqHkchH-s",
  authDomain: "qntrol-9865c.firebaseapp.com",
  projectId: "qntrol-9865c",
  storageBucket: "qntrol-9865c.firebasestorage.app",
  messagingSenderId: "354215271588",
  appId: "1:354215271588:web:e0b5db12a90a5508655a31",
  measurementId: "G-W3T01MJWC9"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app); 

export { app, auth, analytics };