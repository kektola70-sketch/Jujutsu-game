import * as THREE from 'three';
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "firebase/auth";

// 1. FIREBASE CONFIG
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

// 2. UI ЭЛЕМЕНТЫ
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

// 3. АВТОРИЗАЦИЯ
dom.btnReg.addEventListener('click', async () => {
    try {
        await createUserWithEmailAndPassword(auth, dom.email.value, dom.pass.value);
    } catch (e) {
        dom.msg.style.color = 'red';
        dom.msg.textContent = e.message;
    }
});

dom.btnLogin.addEventListener('click', async () => {
    try {
        await signInWithEmailAndPassword(auth, dom.email.value, dom.pass.value);
    } catch (e) {
        dom.msg.style.color = 'red';
        dom.msg.textContent = "Ошибка входа";
    }
});

dom.btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        dom.authScreen.style.display = 'none';
        dom.gameUi.style.display = 'block';
        dom.userDisplay.textContent = user.email ? user.email.split('@')[0] : "Маг";
        init3DWorld(); 
    } else {
        dom.authScreen.style.display = 'flex';
        dom.gameUi.style.display = 'none';
        stop3DWorld();
    }
});

// 4. 3D МИР И УПРАВЛЕНИЕ
let scene, camera, renderer, animationId;
let player; // Наш персонаж
let moveData = { x: 0, z: 0 }; // Данные движения

// Настройки джойстика
const joystick = {
    zone: document.getElementById('joystick-zone'),
    knob: document.getElementById('joystick-knob'),
    active: false,
    center: { x: 0, y: 0 },
    touchId: null
};

function init3DWorld() {
    if (renderer) return;

    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 5, 25);

    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 8); // Позиция камеры

    // Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    dom.gameCanvas.appendChild(renderer.domElement);

    // Свет
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Пол
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Игрок (Куб)
    const pGeo = new THREE.BoxGeometry(1, 1.8, 1);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x9d00ff });
    player = new THREE.Mesh(pGeo, pMat);
    player.position.y = 0.9;
    player.castShadow = true;
    scene.add(player);

    initJoystickEvents();
    animate();
}

function stop3DWorld() {
    if (renderer) {
        cancelAnimationFrame(animationId);
        dom.gameCanvas.innerHTML = '';
        renderer = null;
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);

    if (player) {
        // ДВИЖЕНИЕ
        if (moveData.x !== 0 || moveData.z !== 0) {
            const speed = 0.15;
            player.position.x += moveData.x * speed;
            player.position.z += moveData.z * speed;
            
            // Поворот игрока
            player.rotation.y = Math.atan2(moveData.x, moveData.z);
        }

        // КАМЕРА (слежение)
        camera.position.x += (player.position.x - camera.position.x) * 0.1;
        camera.position.z += ((player.position.z + 8) - camera.position.z) * 0.1;
        camera.lookAt(player.position);
    }

    renderer.render(scene, camera);
}

// 5. ЛОГИКА ДЖОЙСТИКА
function initJoystickEvents() {
    const zone = joystick.zone;
    const knob = joystick.knob;

    // Начало касания
    zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystick.touchId = touch.identifier;
        joystick.active = true;

        const rect = zone.getBoundingClientRect();
        joystick.center.x = rect.left + rect.width / 2;
        joystick.center.y = rect.top + rect.height / 2;
        
        updateJoystick(touch);
    }, { passive: false });

    // Движение пальца
    zone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystick.active) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystick.touchId) {
                updateJoystick(e.changedTouches[i]);
                break;
            }
        }
    }, { passive: false });

    // Конец касания
    const endTouch = (e) => {
        e.preventDefault();
        joystick.active = false;
        moveData.x = 0;
        moveData.z = 0;
        knob.style.transform = `translate(-50%, -50%)`;
        knob.style.transition = "0.2s";
    };

    zone.addEventListener('touchend', endTouch);
    zone.addEventListener('touchcancel', endTouch);

    function updateJoystick(touch) {
        const maxDist = 35; // Радиус
        let dx = touch.clientX - joystick.center.x;
        let dy = touch.clientY - joystick.center.y;
        
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxDist;
            dy = Math.sin(angle) * maxDist;
        }

        knob.style.transition = "0s";
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Нормализация (от -1 до 1)
        moveData.x = dx / maxDist;
        moveData.z = dy / maxDist;
    }
}

// Ресайз
window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});