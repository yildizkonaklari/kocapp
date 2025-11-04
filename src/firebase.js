import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBXI9gLyicwONzaw-5pJJ6ulYPcZHS85zs",
    authDomain: "kocapp-7a367.firebaseapp.com",
    projectId: "kocapp-7a367",
    storageBucket: "kocapp-7a367.firebasestorage.app",
    messagingSenderId: "390699451797",
    appId: "1:390699451797:web:bd477513ce468c7261a29c"
  };
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
