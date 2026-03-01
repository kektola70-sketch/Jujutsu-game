// Импорт функций из CDN (работает прямо в браузере)
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

// Твоя конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyDpNFC0W1PRJ2Q3L0i7D7iSBWfKwhhNezs",
  authDomain: "jujutsu-game.firebaseapp.com",
  projectId: "jujutsu-game",
  storageBucket: "jujutsu-game.firebasestorage.app",
  messagingSenderId: "894199979228",
  appId: "1:894199979228:web:9fc7c12291b8dffd862819",
  measurementId: "G-2F9RFQV09Y"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Элементы DOM
const authContainer = document.getElementById('auth-container');
const gameContainer = document.getElementById('game-container');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const errorMsg = document.getElementById('error-message');
const userDisplay = document.getElementById('user-display');
const userUid = document.getElementById('user-uid');

// --- ЛОГИКА АВТОРИЗАЦИИ ---

// 1. Регистрация (Email/Pass)
document.getElementById('btn-register').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passInput.value;
    
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Регистрация успешна:", userCredential.user);
        })
        .catch((error) => {
            showError(error.message);
        });
});

// 2. Вход (Email/Pass)
document.getElementById('btn-login').addEventListener('click', () => {
    const email = emailInput.value;
    const password = passInput.value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Вход успешен:", userCredential.user);
        })
        .catch((error) => {
            showError(error.message);
        });
});

// 3. Google Вход
document.getElementById('btn-google').addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Google вход:", result.user);
        })
        .catch((error) => {
            showError(error.message);
        });
});

// 4. Анонимный вход
document.getElementById('btn-anon').addEventListener('click', () => {
    signInAnonymously(auth)
        .then(() => {
            console.log("Анонимный вход выполнен");
        })
        .catch((error) => {
            showError(error.message);
        });
});

// 5. Выход
document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("Выход выполнен");
        // Очистка полей
        emailInput.value = '';
        passInput.value = '';
    });
});

// --- СЛУШАТЕЛЬ СОСТОЯНИЯ ---
// Эта функция срабатывает автоматически при входе или выходе
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Пользователь вошел -> Показываем игру, скрываем вход
        authContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        
        userDisplay.textContent = user.email || "Неизвестный маг (Аноним)";
        userUid.textContent = user.uid;
        errorMsg.textContent = "";
    } else {
        // Пользователь вышел -> Показываем вход, скрываем игру
        authContainer.classList.remove('hidden');
        gameContainer.classList.add('hidden');
    }
});

function showError(message) {
    // Упрощаем сообщения об ошибках от Firebase
    if(message.includes("auth/invalid-email")) message = "Неверный формат Email";
    if(message.includes("auth/weak-password")) message = "Пароль слишком слабый (нужно 6+ символов)";
    if(message.includes("auth/wrong-password")) message = "Неверный пароль";
    if(message.includes("auth/email-already-in-use")) message = "Такой маг уже зарегистрирован";
    
    errorMsg.textContent = message;
}