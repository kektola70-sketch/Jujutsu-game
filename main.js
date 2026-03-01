import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// Добавляем импорт Firestore для получения данных о ранге при входе
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { initMenu, updateProfileUI } from "./menu.js";
import { initDB } from "./gameData.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpNFC0W1PRJ2Q3L0i7D7iSBWfKwhhNezs",
  authDomain: "jujutsu-game.firebaseapp.com",
  projectId: "jujutsu-game",
  storageBucket: "jujutsu-game.firebasestorage.app",
  messagingSenderId: "894199979228",
  appId: "1:894199979228:web:9fc7c12291b8dffd862819",
  measurementId: "G-2F9RFQV09Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Инициализация здесь для main

// Инициализируем нашу базу данных в gameData
initDB(app);
initMenu(auth, signOut);

const authContainer = document.getElementById('auth-container');
const menuContainer = document.getElementById('menu-container');
const gameContainer = document.getElementById('gameplay-container');
const storyContainer = document.getElementById('story-container'); // Добавили
const errorMsg = document.getElementById('error-message');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');

// --- ЛОГИКА АВТОРИЗАЦИИ ---

document.getElementById('btn-register').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passInput.value;
    createUserWithEmailAndPassword(auth, email, password).catch((e) => showError(e.message));
});

document.getElementById('btn-login').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passInput.value;
    signInWithEmailAndPassword(auth, email, password).catch((e) => showError(e.message));
});

document.getElementById('btn-google').addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((e) => showError(e.message));
});

document.getElementById('btn-anon').addEventListener('click', () => {
    signInAnonymously(auth).catch((e) => showError(e.message));
});

// --- СЛУШАТЕЛЬ ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Пользователь вошел
        authContainer.classList.add('hidden');
        menuContainer.classList.remove('hidden');
        gameContainer.classList.add('hidden');
        storyContainer.classList.add('hidden');
        
        // 1. Получаем данные из базы (Ранг и т.д.)
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let userData = {
            email: user.email,
            rank: "Не маг" // Дефолт
        };

        if (userSnap.exists()) {
            userData = { ...userData, ...userSnap.data() };
        } else {
            // Если пользователя нет в БД, создаем запись "Не маг"
            await setDoc(userRef, {
                email: user.email,
                rank: "Не маг",
                createdAt: new Date()
            });
        }

        // 2. Обновляем UI Меню
        updateProfileUI(userData);

    } else {
        // Выход
        authContainer.classList.remove('hidden');
        menuContainer.classList.add('hidden');
        gameContainer.classList.add('hidden');
        storyContainer.classList.add('hidden');
        if(emailInput) emailInput.value = '';
        if(passInput) passInput.value = '';
    }
});

function showError(message) {
    if(message.includes("auth/invalid-email")) message = "Неверный формат Email";
    if(message.includes("auth/weak-password")) message = "Пароль слишком слабый";
    if(message.includes("auth/wrong-password") || message.includes("auth/invalid-credential")) message = "Ошибка входа";
    if(message.includes("auth/email-already-in-use")) message = "Email занят";
    errorMsg.textContent = message;
}