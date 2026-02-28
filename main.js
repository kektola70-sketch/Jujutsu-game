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
        btnDomain: document.getElementById('btn-domain'),
        btnExit: document.getElementById('btn-exit-game')
    },
    clash: {
        fill: document.getElementById('clash-fill'),
        btn: document.getElementById('btn-clash-mash')
    },
    dialogue: {
        speaker: document.getElementById('dialogue-speaker'),
        text: document.getElementById('dialogue-text')
    }
};

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let scene, camera, renderer, clock, animId;
let player, enemy;
let cameraAngle = 0;
let moveData = { x: 0, z: 0 };
let isTutorial = false;
let gameState = 'MENU'; 

let battle = {
    hits: 0, 
    lastStrongTime: 0,
    pHP: 1000, pMax: 1000,
    eHP: 10000, eMax: 10000,
    clashScore: 50 
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
    
    // Сброс
    battle.pHP = 1000; battle.eHP = isTutorial ? 10000 : 2000;
    battle.eMax = battle.eHP; battle.hits = 0;
    updateHUD();
    
    init3D();
    gameState = 'PLAY';
}

// --- 3D ДВИЖОК ---
function init3D() {
    if(renderer) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 5, 40);
    
    camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    dom.screens.canvas.appendChild(renderer.domElement);
    
    // Свет
    const dl = new THREE.DirectionalLight(0xffffff, 1.2);
    dl.position.set(5,15,5); dl.castShadow=true; scene.add(dl);
    scene.add(new THREE.AmbientLight(0x505050));

    // Пол
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.MeshStandardMaterial({color:0x222222}));
    floor.rotation.x = -Math.PI/2; floor.receiveShadow=true; scene.add(floor);

    // Персонажи (ROBLOX STYLE)
    player = createRoundCharacter('Gojo');
    enemy = createRoundCharacter(isTutorial ? 'Sukuna' : 'Enemy');
    
    player.obj.position.set(0,0,5);
    enemy.obj.position.set(0,0,-5);
    enemy.obj.lookAt(player.obj.position);

    initControls();
    clock = new THREE.Clock();
    animate();
}

// === НОВЫЙ СОЗДАТЕЛЬ ПЕРСОНАЖЕЙ (ROBLOX R15 STYLE) ===
function createRoundCharacter(type) {
    const group = new THREE.Group();
    
    // Цвета
    const skinColor = 0xffdbac;
    const gojoOutfit = 0x111111; // Черный
    const gojoHair = 0xffffff;   // Белый
    const sukunaOutfit = 0xffffff; // Белый
    const sukunaHair = 0xff66cc;   // Розовый
    const sukunaSash = 0x222222;   // Темный пояс

    const skinMat = new THREE.MeshStandardMaterial({color: skinColor});
    const outfitMat = new THREE.MeshStandardMaterial({color: type === 'Gojo' ? gojoOutfit : sukunaOutfit});
    const hairMat = new THREE.MeshStandardMaterial({color: type === 'Gojo' ? gojoHair : sukunaHair});
    
    // 1. ТЕЛО (Capsule)
    // Radius: 0.35, Length: 0.6
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.6, 4, 8);
    const body = new THREE.Mesh(bodyGeo, outfitMat);
    body.position.y = 0.85; // Поднимаем центр
    body.castShadow = true;
    group.add(body);

    // 2. ГОЛОВА (Sphere)
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.55; 
    group.add(head);

    // 3. ВОЛОСЫ (Sphere, чуть больше головы)
    const hairGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.6;
    hair.position.z = -0.05; // Сдвигаем чуть назад
    group.add(hair);

    // 4. КОНЕЧНОСТИ (Capsules)
    const limbGeo = new THREE.CapsuleGeometry(0.12, 0.6, 4, 8);
    
    // Ноги
    const lLeg = new THREE.Mesh(limbGeo, outfitMat);
    lLeg.position.set(-0.2, 0.3, 0);
    group.add(lLeg);
    
    const rLeg = new THREE.Mesh(limbGeo, outfitMat);
    rLeg.position.set(0.2, 0.3, 0);
    group.add(rLeg);

    // Руки
    const lArm = new THREE.Mesh(limbGeo, outfitMat);
    lArm.position.set(-0.55, 1.0, 0);
    group.add(lArm);
    
    const rArm = new THREE.Mesh(limbGeo, outfitMat);
    rArm.position.set(0.55, 1.0, 0);
    group.add(rArm);

    // === ДЕТАЛИ ===
    if (type === 'Gojo') {
        // Повязка на глаза (Черное кольцо/Цилиндр)
        const blindGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const blindMat = new THREE.MeshStandardMaterial({color: 0x000000});
        const blind = new THREE.Mesh(blindGeo, blindMat);
        blind.position.y = 1.55;
        group.add(blind);
    } 
    else if (type === 'Sukuna') {
        // Пояс (Черное кольцо на теле)
        const sashGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.15, 16);
        const sashMat = new THREE.MeshStandardMaterial({color: sukunaSash});
        const sash = new THREE.Mesh(sashGeo, sashMat);
        sash.position.y = 0.8;
        group.add(sash);
    }

    scene.add(group);
    return { obj: group, type: type };
}

// --- ИГРОВОЙ ЦИКЛ ---
function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (gameState === 'PLAY') {
        // Движение (Поворот вектора джойстика)
        if (moveData.x !== 0 || moveData.z !== 0) {
            const sin = Math.sin(cameraAngle);
            const cos = Math.cos(cameraAngle);
            const worldX = moveData.x * cos - moveData.z * sin;
            const worldZ = moveData.x * sin + moveData.z * cos;

            player.obj.position.x -= worldX * 0.15;
            player.obj.position.z -= worldZ * 0.15;
            player.obj.rotation.y = Math.atan2(-worldX, -worldZ);
            
            // Анимация "покачивания" при ходьбе (простая)
            player.obj.position.y = Math.sin(Date.now() * 0.01) * 0.05; 
        }

        // Камера
        const dist = 6;
        const camX = player.obj.position.x + Math.sin(cameraAngle) * dist;
        const camZ = player.obj.position.z + Math.cos(cameraAngle) * dist;
        camera.position.set(camX, player.obj.position.y + 4, camZ);
        camera.lookAt(player.obj.position);

        // AI Врага
        const distToP = player.obj.position.distanceTo(enemy.obj.position);
        if (distToP > 2) {
            enemy.obj.lookAt(player.obj.position);
            enemy.obj.translateZ(0.06);
            enemy.obj.position.y = Math.sin(Date.now() * 0.01 + 1) * 0.05; // Покачивание врага
        } else {
            if (Math.random() < 0.02) takeDamage('player', 10);
        }

        checkTutorialEvents();
    }
    renderer.render(scene, camera);
}

// --- БОЕВАЯ ЛОГИКА ---
function checkTutorialEvents() {
    if (!isTutorial) return;
    if (battle.eHP <= 5000 && gameState === 'PLAY') {
        gameState = 'PAUSE';
        dom.hud.btnDomain.style.display = 'block';
        showDialogue("Gojo", "Его проклятая энергия растет... Время для Muryo Kusho!");
    }
}

dom.hud.btnAtk.addEventListener('click', () => attack('light'));
dom.hud.btnStrong.addEventListener('click', () => attack('strong'));

function attack(type) {
    if (gameState !== 'PLAY') return;
    const dist = player.obj.position.distanceTo(enemy.obj.position);
    
    // Анимация рывка вперед
    player.obj.translateZ(0.5);
    setTimeout(() => player.obj.translateZ(-0.5), 100);

    if (dist < 3) {
        battle.hits++;
        let dmg = 50;
        let color = 0x0000ff;

        // BLACK FLASH LOGIC
        if (type === 'strong') {
            const now = Date.now();
            if (battle.hits >= 30 && (now - battle.lastStrongTime < 500)) {
                dmg = 2000;
                color = 0x000000; // Черная молния
                showDialogue("Gojo", "BLACK FLASH!!!");
                battle.hits = 0;
            } else {
                dmg = 150;
                color = 0xff0000; // Красный (просто сильный удар)
            }
            battle.lastStrongTime = now;
        }

        takeDamage('enemy', dmg);
        spawnEffect(enemy.obj.position, color);
    }
}

function takeDamage(target, amount) {
    if (target === 'enemy') battle.eHP = Math.max(0, battle.eHP - amount);
    else battle.pHP = Math.max(0, battle.pHP - amount);
    updateHUD();
}

function updateHUD() {
    dom.hud.hpP.style.width = (battle.pHP / battle.pMax * 100) + '%';
    dom.hud.txtP.textContent = `${battle.pHP}/${battle.pMax}`;
    dom.hud.hpE.style.width = (battle.eHP / battle.eMax * 100) + '%';
    dom.hud.txtE.textContent = `${battle.eHP}/${battle.eMax}`;
}

// --- CLASH SYSTEM ---
dom.hud.btnDomain.addEventListener('click', () => { if(gameState==='PAUSE') startClash(); });

function startClash() {
    gameState = 'CLASH';
    dom.screens.clash.style.display = 'block';
    dom.hud.btnDomain.style.display = 'none';
    dom.screens.cutscene.style.display = 'none';
    battle.clashScore = 50;
    
    const clashInterval = setInterval(() => {
        if (gameState !== 'CLASH') { clearInterval(clashInterval); return; }
        battle.clashScore -= 1.5; // Сложность
        dom.clash.fill.style.left = (100 - battle.clashScore) + '%';
        if (battle.clashScore <= 0) { clearInterval(clashInterval); alert("ПОРАЖЕНИЕ"); location.reload(); }
    }, 100);
}

dom.clash.btn.addEventListener('click', () => {
    if (gameState !== 'CLASH') return;
    battle.clashScore += 5;
    dom.clash.fill.style.left = (100 - battle.clashScore) + '%';
    if (battle.clashScore >= 100) winClash();
});

function winClash() {
    gameState = 'CUTSCENE';
    dom.screens.clash.style.display = 'none';
    scene.background = new THREE.Color(0xffffff); // Infinite Void Effect
    
    showDialogue("Gojo", "DOMAIN EXPANSION: UNLIMITED VOID!");
    setTimeout(() => {
        scene.background = new THREE.Color(0x050510);
        showDialogue("Sukuna", "Malevolent Shrine...");
        setTimeout(() => {
            showDialogue("Gojo", "Черт... Мой барьер ломается снаружи! БЕГИ!");
            setTimeout(() => { alert("Обучение пройдено!"); location.reload(); }, 3000);
        }, 3000);
    }, 2500);
}

// --- УПРАВЛЕНИЕ ---
function initControls() {
    const joyZone = document.getElementById('joystick-zone');
    const joyKnob = document.getElementById('joystick-knob');
    let joyTouchId = null, joyCenter = {x:0, y:0};

    joyZone.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0]; joyTouchId = t.identifier;
        const r = joyZone.getBoundingClientRect();
        joyCenter = { x: r.left+r.width/2, y: r.top+r.height/2 };
    }, {passive:false});

    joyZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === joyTouchId) {
                const t = e.changedTouches[i];
                let dx = t.clientX - joyCenter.x, dy = t.clientY - joyCenter.y;
                const d = Math.sqrt(dx*dx+dy*dy);
                if(d>35) { const a = Math.atan2(dy,dx); dx=Math.cos(a)*35; dy=Math.sin(a)*35; }
                joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                moveData.x = dx/35; moveData.z = dy/35;
            }
        }
    }, {passive:false});
    
    joyZone.addEventListener('touchend', () => { moveData = {x:0, z:0}; joyKnob.style.transform = `translate(-50%, -50%)`; });

    const camZone = document.getElementById('camera-touch-zone');
    let lastX = 0;
    camZone.addEventListener('touchstart', e => lastX = e.changedTouches[0].clientX);
    camZone.addEventListener('touchmove', e => {
        e.preventDefault();
        const x = e.changedTouches[0].clientX;
        cameraAngle -= (x - lastX) * 0.01;
        lastX = x;
    });
}

function spawnEffect(pos, color) {
    const geo = new THREE.SphereGeometry(0.8);
    const mat = new THREE.MeshBasicMaterial({color: color, wireframe:true, transparent:true, opacity:0.8});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    setTimeout(() => scene.remove(mesh), 300);
}

function showDialogue(name, text) {
    dom.screens.cutscene.style.display = 'block';
    dom.dialogue.speaker.textContent = name;
    dom.dialogue.text.textContent = text;
}

dom.hud.btnExit.addEventListener('click', () => location.reload());