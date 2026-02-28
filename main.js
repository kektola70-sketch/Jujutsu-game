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

// 2. DOM ЭЛЕМЕНТЫ
const dom = {
    // Экраны
    authScreen: document.getElementById('auth-container'),
    menuScreen: document.getElementById('menu-container'),
    gameUi: document.getElementById('game-ui'),
    gameCanvas: document.getElementById('game-canvas'),
    
    // Auth поля
    email: document.getElementById('email'),
    pass: document.getElementById('password'),
    msg: document.getElementById('msg'),
    
    // Меню элементы
    menuUsername: document.getElementById('menu-username'),
    
    // Кнопки
    btnLogin: document.getElementById('btn-login'),
    btnReg: document.getElementById('btn-register'),
    btnPlay: document.getElementById('btn-play'),
    btnLogout: document.getElementById('btn-logout'),
    btnExitGame: document.getElementById('btn-exit-game')
};

// 3. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ
function showScreen(screenName) {
    dom.authScreen.style.display = 'none';
    dom.menuScreen.style.display = 'none';
    dom.gameUi.style.display = 'none';
    dom.gameCanvas.style.display = 'none';

    if (screenName === 'auth') dom.authScreen.style.display = 'flex';
    if (screenName === 'menu') dom.menuScreen.style.display = 'flex';
    if (screenName === 'game') {
        dom.gameUi.style.display = 'block';
        dom.gameCanvas.style.display = 'block';
    }
}

// 4. FIREBASE АВТОРИЗАЦИЯ
dom.btnReg.addEventListener('click', async () => {
    try { await createUserWithEmailAndPassword(auth, dom.email.value, dom.pass.value); } 
    catch (e) { dom.msg.textContent = e.message; dom.msg.style.color = 'red'; }
});

dom.btnLogin.addEventListener('click', async () => {
    try { await signInWithEmailAndPassword(auth, dom.email.value, dom.pass.value); } 
    catch (e) { dom.msg.textContent = "Ошибка входа"; dom.msg.style.color = 'red'; }
});

dom.btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Успешный вход -> Идем в МЕНЮ
        dom.menuUsername.textContent = "Маг: " + (user.email ? user.email.split('@')[0] : "Аноним");
        showScreen('menu');
    } else {
        // Выход -> Идем на ВХОД
        showScreen('auth');
        stop3DWorld();
    }
});

// 5. УПРАВЛЕНИЕ МЕНЮ И ИГРОЙ
dom.btnPlay.addEventListener('click', () => {
    showScreen('game');
    init3DWorld(); // Запускаем движок только здесь
});

dom.btnExitGame.addEventListener('click', () => {
    stop3DWorld(); // Останавливаем движок
    showScreen('menu'); // Возвращаемся в меню
});


// 6. 3D ДВИЖОК
let scene, camera, renderer, animationId;
let player;
let moveData = { x: 0, z: 0 };

const joystick = {
    zone: document.getElementById('joystick-zone'),
    knob: document.getElementById('joystick-knob'),
    active: false,
    center: { x: 0, y: 0 },
    touchId: null
};

function init3DWorld() {
    if (renderer) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 5, 30);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    dom.gameCanvas.appendChild(renderer.domElement);

    // Освещение
    scene.add(new THREE.AmbientLight(0x404040));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Пол
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Персонаж
    player = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.8, 1),
        new THREE.MeshStandardMaterial({ color: 0x9d00ff })
    );
    player.position.y = 0.9;
    player.castShadow = true;
    scene.add(player);

    initJoystickEvents();
    animate();
}

function stop3DWorld() {
    if (renderer) {
        cancelAnimationFrame(animationId);
        if(dom.gameCanvas.contains(renderer.domElement)) {
            dom.gameCanvas.removeChild(renderer.domElement);
        }
        renderer = null;
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);

    if (player) {
        if (moveData.x !== 0 || moveData.z !== 0) {
            const speed = 0.15;
            player.position.x += moveData.x * speed;
            player.position.z += moveData.z * speed;
            player.rotation.y = Math.atan2(moveData.x, moveData.z);
        }
        
        // Камера плавно следует
        camera.position.x += (player.position.x - camera.position.x) * 0.1;
        camera.position.z += ((player.position.z + 8) - camera.position.z) * 0.1;
        camera.lookAt(player.position);
    }

    renderer.render(scene, camera);
}

// 7. СОБЫТИЯ ДЖОЙСТИКА
function initJoystickEvents() {
    const zone = joystick.zone;
    const knob = joystick.knob;

    const start = (e) => {
        e.preventDefault();
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        joystick.active = true;
        if(e.changedTouches) joystick.touchId = touch.identifier;
        
        const rect = zone.getBoundingClientRect();
        joystick.center.x = rect.left + rect.width / 2;
        joystick.center.y = rect.top + rect.height / 2;
        move(e);
    };

    const move = (e) => {
        if (!joystick.active) return;
        e.preventDefault();
        let touch = e;
        if(e.changedTouches) {
            for(let i=0; i<e.changedTouches.length; i++) {
                if(e.changedTouches[i].identifier === joystick.touchId) {
                    touch = e.changedTouches[i]; break;
                }
            }
        }

        const maxDist = 35;
        let dx = touch.clientX - joystick.center.x;
        let dy = touch.clientY - joystick.center.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxDist;
            dy = Math.sin(angle) * maxDist;
        }

        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        moveData.x = dx / maxDist;
        moveData.z = dy / maxDist;
    };

    const end = (e) => {
        e.preventDefault();
        joystick.active = false;
        moveData.x = 0; moveData.z = 0;
        knob.style.transform = `translate(-50%, -50%)`;
    };

    zone.addEventListener('touchstart', start, {passive: false});
    zone.addEventListener('touchmove', move, {passive: false});
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);
    
    // Для мышки (тесты на ПК)
    zone.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});