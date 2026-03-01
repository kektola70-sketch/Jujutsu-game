// Import the functions you need from the SDKs you need
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

// Импортируем нашу новую логику меню
import { initMenu, updateProfileUI } from "./menu.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpNFC0W1PRJ2Q3L0i7D7iSBWfKwhhNezs",
  authDomain: "jujutsu-game.firebaseapp.com",
  projectId: "jujutsu-game",
  storageBucket: "jujutsu-game.firebasestorage.app",
  messagingSenderId: "894199979228",
  appId: "1:894199979228:web:9fc7c12291b8dffd862819",
  measurementId: "G-2F9RFQV09Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Инициализируем логику меню (передаем auth и функцию выхода)
initMenu(auth, signOut);

// Элементы DOM для Авторизации
const authContainer = document.getElementById('auth-container');
const menuContainer = document.getElementById('menu-container');
const gameContainer = document.getElementById('gameplay-container'); // На всякий случай

const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const errorMsg = document.getElementById('error-message');

// --- ЛОГИКА АВТОРИЗАЦИИ (Вход) ---

// 1. Регистрация
document.getElementById('btn-register').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passInput.value;
    createUserWithEmailAndPassword(auth, email, password)
        .catch((error) => showError(error.message));
});

// 2. Вход
document.getElementById('btn-login').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passInput.value;
    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => showError(error.message));
});

// 3. Google
document.getElementById('btn-google').addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => showError(error.message));
});

// 4. Аноним
document.getElementById('btn-anon').addEventListener('click', () => {
    signInAnonymously(auth).catch((error) => showError(error.message));
});


// --- ГЛАВНЫЙ СЛУШАТЕЛЬ СОСТОЯНИЯ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ПОЛЬЗОВАТЕЛЬ ВОШЕЛ
        console.log("User in:", user.uid);
        
        // 1. Скрываем вход
        authContainer.classList.add('hidden');
        
        // 2. Обновляем имя в меню
        updateProfileUI(user);

        // 3. Показываем меню (убеждаемся, что игра скрыта)
        menuContainer.classList.remove('hidden');
        gameContainer.classList.add('hidden');

        errorMsg.textContent = "";
    } else {
        // ПОЛЬЗОВАТЕЛЬ ВЫШЕЛ
        console.log("User out");
        
        // Показываем вход, скрываем остальное
        authContainer.classList.remove('hidden');
        menuContainer.classList.add('hidden');
        gameContainer.classList.add('hidden');
        
        // Чистим поля
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