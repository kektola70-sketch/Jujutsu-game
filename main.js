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

// 2. DOM ELEMENTY
const dom = {
    screens: {
        auth: document.getElementById('auth-container'),
        menu: document.getElementById('menu-container'),
        settings: document.getElementById('settings-container'),
        about: document.getElementById('about-container'),
        game: document.getElementById('game-ui'),
        canvas: document.getElementById('game-canvas')
    },
    auth: {
        email: document.getElementById('email'),
        pass: document.getElementById('password'),
        msg: document.getElementById('msg'),
        btnLogin: document.getElementById('btn-login'),
        btnReg: document.getElementById('btn-register')
    },
    menu: {
        username: document.getElementById('menu-username'),
        btnPlay: document.getElementById('btn-play'),
        btnSettings: document.getElementById('btn-settings'),
        btnAbout: document.getElementById('btn-about'),
        btnLogout: document.getElementById('btn-logout')
    },
    settings: {
        slider: document.getElementById('sens-slider'),
        shadows: document.getElementById('shadows-check'),
        btnSave: document.getElementById('btn-save-settings')
    },
    about: {
        btnBack: document.getElementById('btn-back-about')
    },
    game: {
        btnExit: document.getElementById('btn-exit-game')
    }
};

// Переменные настроек
let gameSettings = {
    sensitivity: 0.15,
    shadows: true
};

// Загрузка настроек при старте
loadSettings();

// 3. СИСТЕМА ЭКРАНОВ
function showScreen(name) {
    // Скрываем всё
    Object.values(dom.screens).forEach(el => {
        if(el) el.style.display = 'none';
    });

    // Показываем нужное
    if (name === 'game') {
        dom.screens.game.style.display = 'block';
        dom.screens.canvas.style.display = 'block';
    } else {
        dom.screens[name].style.display = 'flex';
    }
}

// 4. ЛОГИКА АВТОРИЗАЦИИ (Автосохранение)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Если вошли - сразу в меню
        dom.menu.username.textContent = (user.email ? user.email.split('@')[0] : "Маг").toUpperCase();
        showScreen('menu');
    } else {
        // Если вышли - на экран входа
        showScreen('auth');
        stop3DWorld();
    }
});

dom.auth.btnReg.addEventListener('click', async () => {
    try { await createUserWithEmailAndPassword(auth, dom.auth.email.value, dom.auth.pass.value); } 
    catch (e) { dom.auth.msg.textContent = e.message; dom.auth.msg.style.color = 'red'; }
});

dom.auth.btnLogin.addEventListener('click', async () => {
    try { await signInWithEmailAndPassword(auth, dom.auth.email.value, dom.auth.pass.value); } 
    catch (e) { dom.auth.msg.textContent = "Ошибка входа"; dom.auth.msg.style.color = 'red'; }
});

dom.menu.btnLogout.addEventListener('click', () => signOut(auth));

// 5. НАВИГАЦИЯ МЕНЮ
dom.menu.btnPlay.addEventListener('click', () => {
    showScreen('game');
    init3DWorld();
});

dom.menu.btnSettings.addEventListener('click', () => {
    showScreen('settings');
    // Устанавливаем текущие значения
    dom.settings.slider.value = gameSettings.sensitivity * 20; // масштабируем для ползунка
    dom.settings.shadows.checked = gameSettings.shadows;
});

dom.menu.btnAbout.addEventListener('click', () => showScreen('about'));

dom.settings.btnSave.addEventListener('click', () => {
    // Сохраняем настройки
    gameSettings.sensitivity = dom.settings.slider.value / 20;
    gameSettings.shadows = dom.settings.shadows.checked;
    localStorage.setItem('jjk_settings', JSON.stringify(gameSettings));
    showScreen('menu');
});

dom.about.btnBack.addEventListener('click', () => showScreen('menu'));

dom.game.btnExit.addEventListener('click', () => {
    stop3DWorld();
    showScreen('menu');
});

function loadSettings() {
    const saved = localStorage.getItem('jjk_settings');
    if (saved) {
        gameSettings = JSON.parse(saved);
    }
}

// 6. 3D ДВИЖОК
let scene, camera, renderer, animationId, player;
let moveData = { x: 0, z: 0 };
const joystick = {
    zone: document.getElementById('joystick-zone'),
    knob: document.getElementById('joystick-knob'),
    active: false, center: {x:0, y:0}, touchId: null
};

function init3DWorld() {
    if (renderer) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 5, 30);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Применяем настройки графики
    if (gameSettings.shadows) {
        renderer.shadowMap.enabled = true;
    }

    dom.screens.canvas.appendChild(renderer.domElement);

    // Свет
    scene.add(new THREE.AmbientLight(0x404040));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    if (gameSettings.shadows) dirLight.castShadow = true;
    scene.add(dirLight);

    // Пол
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    if (gameSettings.shadows) floor.receiveShadow = true;
    scene.add(floor);

    // Игрок
    player = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.8, 1),
        new THREE.MeshStandardMaterial({ color: 0x9d00ff })
    );
    player.position.y = 0.9;
    if (gameSettings.shadows) player.castShadow = true;
    scene.add(player);

    initJoystickEvents();
    animate();
}

function stop3DWorld() {
    if (renderer) {
        cancelAnimationFrame(animationId);
        dom.screens.canvas.innerHTML = '';
        renderer = null;
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (player) {
        if (moveData.x !== 0 || moveData.z !== 0) {
            // Используем чувствительность из настроек
            const speed = gameSettings.sensitivity; 
            player.position.x += moveData.x * speed;
            player.position.z += moveData.z * speed;
            player.rotation.y = Math.atan2(moveData.x, moveData.z);
        }
        camera.position.x += (player.position.x - camera.position.x) * 0.1;
        camera.position.z += ((player.position.z + 8) - camera.position.z) * 0.1;
        camera.lookAt(player.position);
    }
    renderer.render(scene, camera);
}

// Джойстик
function initJoystickEvents() {
    const zone = joystick.zone;
    const knob = joystick.knob;

    const handler = (e, type) => {
        e.preventDefault();
        let touch = e.changedTouches ? e.changedTouches[0] : e;
        
        if (type === 'start') {
            joystick.active = true;
            if(e.changedTouches) joystick.touchId = touch.identifier;
            const r = zone.getBoundingClientRect();
            joystick.center = { x: r.left + r.width/2, y: r.top + r.height/2 };
        }
        
        if (type === 'move' && joystick.active) {
            if(e.changedTouches) {
                for(let i=0; i<e.changedTouches.length; i++) 
                    if(e.changedTouches[i].identifier === joystick.touchId) touch = e.changedTouches[i];
            }
            let dx = touch.clientX - joystick.center.x;
            let dy = touch.clientY - joystick.center.y;
            const dist = Math.sqrt(dx*dx+dy*dy);
            const max = 35;
            if (dist > max) {
                const a = Math.atan2(dy, dx);
                dx = Math.cos(a)*max; dy = Math.sin(a)*max;
            }
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            moveData.x = dx/max; moveData.z = dy/max;
        }

        if (type === 'end') {
            joystick.active = false;
            moveData = {x:0, z:0};
            knob.style.transform = `translate(-50%, -50%)`;
        }
    };

    zone.addEventListener('touchstart', e => handler(e, 'start'), {passive: false});
    zone.addEventListener('touchmove', e => handler(e, 'move'), {passive: false});
    zone.addEventListener('touchend', e => handler(e, 'end'));
}

window.addEventListener('resize', () => {
    if(renderer) {
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});