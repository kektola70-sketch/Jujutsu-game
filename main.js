import * as THREE from 'three';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "firebase/auth";

// --- 1. FIREBASE CONFIG (ТВОЙ КОД) ---
const firebaseConfig = {
  apiKey: "AIzaSyDpNFC0W1PRJ2Q3L0i7D7iSBWfKwhhNezs",
  authDomain: "jujutsu-game.firebaseapp.com",
  projectId: "jujutsu-game",
  storageBucket: "jujutsu-game.firebasestorage.app",
  messagingSenderId: "894199979228",
  appId: "1:894199979228:web:9fc7c12291b8dffd862819",
  measurementId: "G-2F9RFQV09Y"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Подключили аналитику, как в конфиге
const auth = getAuth(app);

// --- 2. УПРАВЛЕНИЕ UI ---
const dom = {
    authScreen: document.getElementById('auth-container'),
    gameUi: document.getElementById('game-ui'),
    gameCanvas: document.getElementById('game-canvas'),
    email: document.getElementById('email'),
    pass: document.getElementById('password'),
    msg: document.getElementById('msg'),
    userDisplay: document.getElementById('user-display'),
    btnLogin: document.getElementById('btn-login'),
    btnReg: document.getElementById('btn-register'),
    btnLogout: document.getElementById('btn-logout')
};

// --- 3. ЛОГИКА АВТОРИЗАЦИИ ---

// Регистрация
dom.btnReg.addEventListener('click', async () => {
    try {
        dom.msg.style.color = 'yellow';
        dom.msg.textContent = "Концентрация проклятой энергии...";
        await createUserWithEmailAndPassword(auth, dom.email.value, dom.pass.value);
        // Успех обработает onAuthStateChanged
    } catch (e) {
        dom.msg.style.color = 'red';
        dom.msg.textContent = "Ошибка: " + e.message;
    }
});

// Вход
dom.btnLogin.addEventListener('click', async () => {
    try {
        await signInWithEmailAndPassword(auth, dom.email.value, dom.pass.value);
    } catch (e) {
        dom.msg.style.color = 'red';
        dom.msg.textContent = "Неверная печать (ошибка входа).";
    }
});

// Выход
dom.btnLogout.addEventListener('click', () => signOut(auth));

// Слушатель состояния (ГЛАВНЫЙ ПЕРЕКЛЮЧАТЕЛЬ)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Игрок вошел
        console.log("User logged in:", user.email);
        dom.authScreen.style.display = 'none';
        dom.gameUi.style.display = 'block';
        dom.userDisplay.textContent = user.email.split('@')[0]; // Показываем имя до @
        
        // Запускаем 3D мир
        init3DWorld(); 
    } else {
        // Игрок вышел
        console.log("User logged out");
        dom.authScreen.style.display = 'flex';
        dom.gameUi.style.display = 'none';
        
        // Очищаем 3D сцену (чтобы не жрала батарею в меню)
        stop3DWorld();
    }
});


// --- 4. 3D ДВИЖОК (THREE.JS) ---
let scene, camera, renderer, animationId;
let curseCube;

function init3DWorld() {
    if (renderer) return; // Если уже запущено, не дублируем

    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 2, 15);

    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 5);

    // Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Для четкости на телефоне
    dom.gameCanvas.appendChild(renderer.domElement);

    // Свет
    const ambientLight = new THREE.AmbientLight(0x404040); // Мягкий свет
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Пол (Земля)
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Персонаж (Пока что Проклятый Куб)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    // Материал, который светится (Emissive)
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x4b0082, 
        emissive: 0x220044,
        roughness: 0.5
    });
    curseCube = new THREE.Mesh(geometry, material);
    curseCube.position.y = 0.5;
    scene.add(curseCube);

    animate();
}

function stop3DWorld() {
    if (renderer) {
        cancelAnimationFrame(animationId);
        dom.gameCanvas.innerHTML = ''; // Удаляем canvas
        renderer = null;
        scene = null;
        camera = null;
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);

    // Анимация вращения (эффект ожидания)
    if (curseCube) {
        curseCube.rotation.y += 0.02;
        curseCube.rotation.z += 0.01;
    }

    renderer.render(scene, camera);
}

// Адаптив при повороте экрана
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});