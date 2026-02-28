import * as THREE from 'three';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

// --- КОНФИГУРАЦИЯ ---
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

// --- DOM ЭЛЕМЕНТЫ ---
const dom = {
    screens: {
        auth: document.getElementById('auth-container'),
        menu: document.getElementById('menu-container'),
        game: document.getElementById('game-ui'),
        canvas: document.getElementById('game-canvas'),
        tutModal: document.getElementById('tutorial-modal'),
        clash: document.getElementById('clash-ui'),
        cutscene: document.getElementById('cutscene-ui')
    },
    menu: {
        btnPlay: document.getElementById('btn-play'),
        btnTutYes: document.getElementById('btn-tut-yes'),
        btnTutNo: document.getElementById('btn-tut-no')
    },
    hud: {
        hpP: document.getElementById('hp-player'),
        hpE: document.getElementById('hp-enemy'),
        txtP: document.getElementById('hp-text-p'),
        txtE: document.getElementById('hp-text-e'),
        btnAtk: document.getElementById('btn-attack'),
        btnStrong: document.getElementById('btn-strong'),
        btnBlock: document.getElementById('btn-block'),
        btnDomain: document.getElementById('btn-domain'),
        btnExit: document.getElementById('btn-exit-game')
    },
    clash: {
        fill: document.getElementById('clash-fill'),
        btn: document.getElementById('btn-clash-mash')
    },
    dialogue: {
        box: document.querySelector('.dialogue-box'),
        speaker: document.getElementById('dialogue-speaker'),
        text: document.getElementById('dialogue-text')
    }
};

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let scene, camera, renderer, clock, animId;
let player, enemy; // Объекты 3D
let cameraAngle = 0; // Угол вращения камеры
let moveData = { x: 0, z: 0 };
let isTutorial = false;
let gameState = 'MENU'; // MENU, PLAY, PAUSE, CLASH, CUTSCENE

// Статы боя
let battle = {
    hits: 0, // Счетчик для комбо
    lastStrongTime: 0,
    pHP: 1000, pMax: 1000,
    eHP: 10000, eMax: 10000,
    clashScore: 50 // 0 = Сукуна вин, 100 = Годжо вин
};

// --- АВТОРИЗАЦИЯ ---
document.getElementById('btn-login').addEventListener('click', () => {
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value)
    .catch(e => alert(e.message));
});
onAuthStateChanged(auth, u => {
    if(u) { dom.screens.auth.style.display='none'; dom.screens.menu.style.display='flex'; }
});

// --- МЕНЮ ---
dom.menu.btnPlay.addEventListener('click', () => {
    dom.screens.menu.style.display='none';
    dom.screens.tutModal.style.display='flex';
});

dom.menu.btnTutYes.addEventListener('click', () => startGame(true));
dom.menu.btnTutNo.addEventListener('click', () => startGame(false));

function startGame(tutorialMode) {
    isTutorial = tutorialMode;
    dom.screens.tutModal.style.display='none';
    dom.screens.game.style.display='block';
    
    // Сброс статов
    battle.pHP = 1000; battle.eHP = isTutorial ? 10000 : 2000;
    battle.eMax = battle.eHP; battle.hits = 0;
    updateHUD();
    
    init3D();
    gameState = 'PLAY';
}

// --- 3D ДВИЖОК ---
function init3D() {
    if(renderer) return; // Уже инициализирован
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100010);
    scene.fog = new THREE.Fog(0x100010, 5, 40);
    
    camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    dom.screens.canvas.appendChild(renderer.domElement);
    
    // Свет
    const dl = new THREE.DirectionalLight(0xffffff, 1.2);
    dl.position.set(5,10,5); dl.castShadow=true; scene.add(dl);
    scene.add(new THREE.AmbientLight(0x404040));

    // Пол
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.MeshStandardMaterial({color:0x222222}));
    floor.rotation.x = -Math.PI/2; floor.receiveShadow=true; scene.add(floor);

    // СОЗДАНИЕ ПЕРСОНАЖЕЙ
    player = createCharacter('Gojo');
    enemy = createCharacter(isTutorial ? 'Sukuna' : 'Enemy');
    
    player.obj.position.set(0,0,5);
    enemy.obj.position.set(0,0,-5);
    enemy.obj.lookAt(player.obj.position);

    initControls();
    clock = new THREE.Clock();
    animate();
}

// Конструктор персонажей (Low Poly)
function createCharacter(type) {
    const group = new THREE.Group();
    
    // Материалы
    const skinMat = new THREE.MeshStandardMaterial({color: 0xffdbac});
    const blackMat = new THREE.MeshStandardMaterial({color: 0x111111}); // Годжо одежда
    const whiteMat = new THREE.MeshStandardMaterial({color: 0xffffff}); // Волосы Годжо
    const pinkMat = new THREE.MeshStandardMaterial({color: 0xff66cc}); // Волосы Сукуны
    const kimonoMat = new THREE.MeshStandardMaterial({color: 0xffffff}); // Кимоно Сукуны
    
    // Тело
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
    const body = new THREE.Mesh(bodyGeo, type === 'Gojo' ? blackMat : kimonoMat);
    body.position.y = 0.6; body.castShadow=true; group.add(body);
    
    // Голова
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.45; group.add(head);
    
    // Детали
    if (type === 'Gojo') {
        // Повязка на глаза
        const blind = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.15, 0.52), blackMat);
        blind.position.y = 1.5; group.add(blind);
        // Волосы
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.55), whiteMat);
        hair.position.y = 1.75; group.add(hair);
    } else if (type === 'Sukuna') {
        // Волосы
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), pinkMat);
        hair.position.y = 1.7; group.add(hair);
        // Тату (упрощенно - черные полоски)
        const tattoo = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.1, 0.51), blackMat);
        tattoo.position.y = 1.5; group.add(tattoo);
    }

    scene.add(group);
    return { obj: group, hp: 1000, type: type };
}

// --- ЛОГИКА ИГРЫ ---
function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (gameState === 'PLAY') {
        // 1. Движение Игрока
        if (moveData.x !== 0 || moveData.z !== 0) {
            // Движение относительно камеры
            const sin = Math.sin(cameraAngle);
            const cos = Math.cos(cameraAngle);
            
            // Поворачиваем вектор джойстика
            const worldX = moveData.x * cos - moveData.z * sin;
            const worldZ = moveData.x * sin + moveData.z * cos;

            player.obj.position.x -= worldX * 0.15;
            player.obj.position.z -= worldZ * 0.15;
            
            // Поворот модельки
            player.obj.rotation.y = Math.atan2(-worldX, -worldZ);
        }

        // 2. Камера (Орбитальная)
        const dist = 6;
        const camX = player.obj.position.x + Math.sin(cameraAngle) * dist;
        const camZ = player.obj.position.z + Math.cos(cameraAngle) * dist;
        camera.position.set(camX, player.obj.position.y + 4, camZ);
        camera.lookAt(player.obj.position);

        // 3. AI Сукуны (Простой)
        const distToP = player.obj.position.distanceTo(enemy.obj.position);
        if (distToP > 1.5) {
            enemy.obj.lookAt(player.obj.position);
            enemy.obj.translateZ(0.08); // Идет к игроку
        } else {
            // Атакует редко
            if (Math.random() < 0.02) takeDamage('player', 10);
        }

        // 4. Сценарий Обучения
        checkTutorialEvents();
    }
    
    renderer.render(scene, camera);
}

// СЦЕНАРИЙ
function checkTutorialEvents() {
    if (!isTutorial) return;

    // Триггер на 50% ХП Сукуны
    if (battle.eHP <= 5000 && gameState === 'PLAY') {
        gameState = 'PAUSE'; // Заморозка
        dom.hud.btnDomain.style.display = 'block';
        showDialogue("Gojo", "У него слишком много энергии... Нужно использовать ЭТО!");
    }
}

// --- БОЕВАЯ СИСТЕМА ---
dom.hud.btnAtk.addEventListener('click', () => attack('light'));
dom.hud.btnStrong.addEventListener('click', () => attack('strong'));

function attack(type) {
    if (gameState !== 'PLAY') return;
    
    const dist = player.obj.position.distanceTo(enemy.obj.position);
    if (dist < 2.5) {
        // Удар попал
        battle.hits++;
        let dmg = 50;
        let effectColor = 0x0000ff; // Синий (Годжо)

        // Черная Молния (30 хитов + сильный удар)
        if (type === 'strong') {
            const now = Date.now();
            if (battle.hits >= 30 && (now - battle.lastStrongTime < 500)) {
                dmg = 1000; // Крит
                effectColor = 0x000000; // Черный
                showDialogue("Gojo", "BLACK FLASH!!!");
                battle.hits = 0; // Сброс
            } else {
                dmg = 150;
                effectColor = 0xff0000; // Красный
            }
            battle.lastStrongTime = now;
        }

        takeDamage('enemy', dmg);
        spawnEffect(enemy.obj.position, effectColor);
    }
}

function takeDamage(target, amount) {
    if (target === 'enemy') {
        battle.eHP -= amount;
        if (battle.eHP < 0) battle.eHP = 0;
    } else {
        battle.pHP -= amount;
        if (battle.pHP < 0) battle.pHP = 0;
    }
    updateHUD();
}

function updateHUD() {
    dom.hud.hpP.style.width = (battle.pHP / battle.pMax * 100) + '%';
    dom.hud.txtP.textContent = `${battle.pHP}/${battle.pMax}`;
    dom.hud.hpE.style.width = (battle.eHP / battle.eMax * 100) + '%';
    dom.hud.txtE.textContent = `${battle.eHP}/${battle.eMax}`;
}

// --- DOMAIN EXPANSION & CLASH ---
dom.hud.btnDomain.addEventListener('click', () => {
    if (gameState === 'PAUSE') {
        startClash();
    }
});

function startClash() {
    gameState = 'CLASH';
    dom.screens.clash.style.display = 'block';
    dom.hud.btnDomain.style.display = 'none';
    dom.screens.cutscene.style.display = 'none';
    
    battle.clashScore = 50;
    
    // Таймер перетягивания (враг давит)
    const clashInterval = setInterval(() => {
        if (gameState !== 'CLASH') { clearInterval(clashInterval); return; }
        
        battle.clashScore -= 1; // Враг давит
        updateClashUI();
        
        // Проигрыш
        if (battle.clashScore <= 0) {
            clearInterval(clashInterval);
            alert("Сукуна пересилил твою территорию. Ты погиб.");
            location.reload();
        }
    }, 100);
}

dom.clash.btn.addEventListener('click', () => {
    if (gameState !== 'CLASH') return;
    battle.clashScore += 5; // Игрок давит
    updateClashUI();
    
    // Победа
    if (battle.clashScore >= 100) {
        winClash();
    }
});

function updateClashUI() {
    // Двигаем градиент. 50% = центр
    dom.clash.fill.style.left = (100 - battle.clashScore) + '%'; 
}

function winClash() {
    gameState = 'CUTSCENE';
    dom.screens.clash.style.display = 'none';
    
    // Катсцена
    scene.background = new THREE.Color(0xffffff); // Вспышка Infinite Void
    showDialogue("Gojo", "UNLIMITED VOID! (Бесконечная пустота)");
    
    setTimeout(() => {
        scene.background = new THREE.Color(0x100010);
        showDialogue("Narrator", "Барьер Годжо трескается от разрезов Сукуны снаружи!");
        
        setTimeout(() => {
            showDialogue("Gojo", "Мой барьер не выдержит его ударов снаружи... БЕГИ!");
            setTimeout(() => {
                alert("Обучение пройдено! (Конец демо)");
                location.reload();
            }, 3000);
        }, 3000);
    }, 2000);
}

// --- УПРАВЛЕНИЕ (Touch) ---
function initControls() {
    // Джойстик (Левая часть)
    const joyZone = document.getElementById('joystick-zone');
    const joyKnob = document.getElementById('joystick-knob');
    let joyTouchId = null;
    let joyCenter = {x:0, y:0};

    joyZone.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0];
        joyTouchId = t.identifier;
        const rect = joyZone.getBoundingClientRect();
        joyCenter = { x: rect.left+rect.width/2, y: rect.top+rect.height/2 };
    }, {passive:false});

    joyZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === joyTouchId) {
                const t = e.changedTouches[i];
                let dx = t.clientX - joyCenter.x;
                let dy = t.clientY - joyCenter.y;
                const dist = Math.sqrt(dx*dx+dy*dy);
                if(dist>35) { const a = Math.atan2(dy,dx); dx=Math.cos(a)*35; dy=Math.sin(a)*35; }
                joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                moveData.x = dx/35; moveData.z = dy/35;
            }
        }
    }, {passive:false});

    joyZone.addEventListener('touchend', e => {
        moveData = {x:0, z:0};
        joyKnob.style.transform = `translate(-50%, -50%)`;
    });

    // Камера (Правая часть)
    const camZone = document.getElementById('camera-touch-zone');
    let lastX = 0;
    
    camZone.addEventListener('touchstart', e => {
        lastX = e.changedTouches[0].clientX;
    });
    
    camZone.addEventListener('touchmove', e => {
        e.preventDefault(); // Чтобы не скроллило
        const x = e.changedTouches[0].clientX;
        const delta = x - lastX;
        cameraAngle -= delta * 0.01; // Вращаем
        lastX = x;
    });
}

function spawnEffect(pos, color) {
    const geo = new THREE.SphereGeometry(0.5);
    const mat = new THREE.MeshBasicMaterial({color: color, wireframe:true});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    
    // Исчезает через 0.5 сек
    setTimeout(() => { scene.remove(mesh); }, 500);
}

function showDialogue(name, text) {
    dom.screens.cutscene.style.display = 'block';
    dom.dialogue.speaker.textContent = name;
    dom.dialogue.text.textContent = text;
}

dom.hud.btnExit.addEventListener('click', () => location.reload());