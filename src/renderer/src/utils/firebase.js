import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDMg-lOONWGSv_3ENhTVM9hL54AEL8l_7E",
    authDomain: "pocketwall.firebaseapp.com",
    projectId: "pocketwall",
    storageBucket: "pocketwall.firebasestorage.app",
    messagingSenderId: "613774863542",
    appId: "1:613774863542:web:103be60cb0f8082e31ca17",
    measurementId: "G-C08X5CWFRF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
