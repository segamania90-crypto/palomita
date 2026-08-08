// Импортируем нужные части Firebase SDK через CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Конфигурация твоего проекта Palomita
const firebaseConfig = {
    apiKey: "AIzaSyC43ZJC910hO-7j1Z8DsUH1YvnV9uYwAtI",
    authDomain: "palomita-46146.firebaseapp.com",
    projectId: "palomita-46146",
    storageBucket: "palomita-46146.firebasestorage.app",
    messagingSenderId: "766002691195",
    appId: "1:766002691195:web:7f193e9d5229f9d4a3b6de"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Экспортируем auth и db, чтобы использовать в других файлах
export const auth = getAuth(app);
export const db = getFirestore(app);