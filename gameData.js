import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db; 
export function initDB(app) { db = getFirestore(app); }

let loadedUserData = null; 
const MAX_LEVEL = 500;
const MAX_MASTERY = 500;

// --- ТЕХНИКИ ---
const TECHNIQUES = [
    { name: "Манипуляция П.Э.", rarity: "Common", class: "r-common" },
    { name: "Соломенная Кукла", rarity: "Rare", class: "r-rare" },
    { name: "Десять Теней", rarity: "Mythic", class: "r-mythic" },
    { name: "Копирование (Юта)", rarity: "Legendary", class: "r-legendary" },
    { name: "LIMITLESS + SIX EYES", rarity: "MASTERS", class: "r-masters" },
    { name: "MALEVOLENT SHRINE", rarity: "MASTERS", class: "r-masters" }
];

const SKILL_TREE = {
    "common": [
        { id: "punch", name: "Удар П.Э.", reqLvl: 0, reqMas: 0 },
        { id: "dash", name: "Рывок", reqLvl: 5, reqMas: 20 }
    ],
    "yuta": [
        { id: "rika_call", name: "Зов Рики", reqLvl: 10, reqMas: 50 },
        { id: "speech", name: "Копия: Речь", reqLvl: 30, reqMas: 100 },
        { id: "love_beam", name: "Луч Любви", reqLvl: 100, reqMas: 300 }
    ],
    "sukuna": [
        { id: "dismantle", name: "Дисмантл", reqLvl: 10, reqMas: 50 },
        { id: "cleave", name: "Клив", reqLvl: 50, reqMas: 150 },
        { id: "domain", name: "Гробница Зла", reqLvl: 200, reqMas: 500 }
    ]
};

const YUTA_STORY = [
    "Больница. Сестра умерла, но стала проклятием.",
    "Встреча с Годжо: «Ты опасен. Идем в техникум».",
    "Техникум: Нападение Маки.",
    "Рика защищает: «НЕ ТРОНЬТЕ ЮТУ!!!».",
    "Годжо: «Пора на тренировку!»"
];

// --- ПРОВЕРКА ПРОГРЕССА ---
export async function checkUserProgress(uid, menuScreen, gameScreen) {
    const userRef = doc(db, "users", uid);
    try {
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().class) {
            loadedUserData = userSnap.data();
            
            if(!loadedUserData.lvl) loadedUserData.lvl = 1;
            if(!loadedUserData.mastery) loadedUserData.mastery = 0;
            if(!loadedUserData.xp) loadedUserData.xp = 0;
            if(loadedUserData.tutorialStep === undefined) loadedUserData.tutorialStep = 0; 

            updateStatusUI();
            setupTrainingButton();

            menuScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');

            if (loadedUserData.tutorialStep === 0) {
                setTimeout(() => startTutorialSequence(1), 1000);
            }

        } else {
            loadedUserData = null;
            menuScreen.classList.add('hidden');
            startStory(["Рождение..."], "Пролог", true);
        }
    } catch (e) { console.error(e); }
}

function updateStatusUI() {
    document.getElementById('player-class-display').textContent = loadedUserData.class;
    document.getElementById('player-lvl-display').textContent = loadedUserData.lvl;
    document.getElementById('player-mastery-display').textContent = loadedUserData.mastery;
    
    const rEl = document.getElementById('player-rarity-display');
    rEl.textContent = loadedUserData.rarity || "Common";
    rEl.className = getRarityClass(loadedUserData.rarity);
}

// --- СИСТЕМА ОБУЧЕНИЯ (СУПЕР-ФИКС) ---
function startTutorialSequence(step) {
    const overlay = document.getElementById('tutorial-overlay');
    const msg = document.getElementById('tutorial-msg');
    
    // Включаем слой текста
    overlay.classList.remove('hidden');

    // Сбрасываем старое
    document.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));
    
    // Сбрасываем zIndex контейнеров
    document.getElementById('gameplay-container').style.zIndex = "";
    document.getElementById('training-hub-container').style.zIndex = "";

    if (step === 1) {
        // ШАГ 1: Кнопка Тренировки
        msg.textContent = "Годжо: «Нажми кнопку ТРЕНИРОВКА!»";
        const btn = document.getElementById('btn-training');
        
        // ВАЖНО: Поднимаем контейнер выше всего, чтобы кнопку можно было нажать
        document.getElementById('gameplay-container').style.zIndex = "20000";
        btn.classList.add('highlight-element');

        const originalClick = btn.onclick;
        btn.onclick = (e) => {
            e.stopPropagation();
            btn.classList.remove('highlight-element');
            document.getElementById('gameplay-container').style.zIndex = ""; // Возвращаем контейнер
            overlay.classList.add('hidden');
            
            open3DTraining(true); // Открываем 3D
        };
    } 
    else if (step === 2) {
        // ШАГ 2: Удар
        overlay.classList.remove('hidden');
        msg.textContent = "Годжо: «Атакуй! Нажми УДАР.»";
        
        // Поднимаем контейнер 3D сцены
        document.getElementById('training-hub-container').style.zIndex = "20000";

        const btnHit = document.getElementById('btn-hit-dummy');
        btnHit.classList.add('highlight-element');

        btnHit.onclick = () => {
             performHitAnim();
             addRewards(10, 1);
             btnHit.classList.remove('highlight-element');
             startTutorialSequence(3);
        };
    }
    else if (step === 3) {
        // ШАГ 3: Выход
        msg.textContent = "Годжо: «Молодец. Нажми ВЫХОД.»";
        
        document.getElementById('training-hub-container').style.zIndex = "20000";
        document.getElementById('btn-hit-dummy').onclick = null; // Блок удара
        
        const btnExit = document.getElementById('btn-exit-training');
        btnExit.classList.add('highlight-element');

        btnExit.onclick = async () => {
            overlay.classList.add('hidden');
            btnExit.classList.remove('highlight-element');
            document.getElementById('training-hub-container').style.zIndex = "";
            
            document.getElementById('training-hub-container').classList.add('hidden');
            document.getElementById('gameplay-container').classList.remove('hidden');
            
            loadedUserData.tutorialStep = 99;
            await saveProgress();
            
            alert("Обучение завершено!");
            setupTrainingButton(); // Возвращаем нормальную логику
        };
    }
}

// --- ФУНКЦИИ ИГРЫ ---
function setupTrainingButton() {
    const btnTrain = document.getElementById('btn-training');
    const newBtn = btnTrain.cloneNode(true);
    btnTrain.parentNode.replaceChild(newBtn, btnTrain);
    
    newBtn.addEventListener('click', () => {
        if ((loadedUserData.class.includes("Юта") || loadedUserData.class.includes("Копирование")) && !loadedUserData.storySeen) {
            startStory(YUTA_STORY, "История: Юта", false, () => {
                loadedUserData.storySeen = true;
                saveProgress();
                open3DTraining(false); 
            });
        } else {
            open3DTraining(false);
        }
    });
}

function open3DTraining(isTutorial) {
    document.getElementById('gameplay-container').classList.add('hidden');
    document.getElementById('story-container').classList.add('hidden');
    document.getElementById('training-hub-container').classList.remove('hidden');

    updateTrainingHUD();
    renderSkills(isTutorial);

    const btnHit = document.getElementById('btn-hit-dummy');
    const btnExit = document.getElementById('btn-exit-training');

    if (isTutorial) {
        setTimeout(() => startTutorialSequence(2), 500);
    } else {
        btnHit.onclick = () => {
            performHitAnim();
            addRewards(5, 1);
            renderSkills(false);
        };

        btnExit.onclick = async () => {
            document.getElementById('training-hub-container').classList.add('hidden');
            document.getElementById('gameplay-container').classList.remove('hidden');
            await saveProgress();
            updateStatusUI();
        };
    }
}

function performHitAnim() {
    const cube = document.getElementById('dummy-cube');
    cube.classList.remove('hit-anim');
    void cube.offsetWidth;
    cube.classList.add('hit-anim');
    cube.style.transform = `rotateX(${Math.random()*360}deg) rotateY(${Math.random()*360}deg)`;
}

function addRewards(xp, mas) {
    if (loadedUserData.lvl < MAX_LEVEL) {
        loadedUserData.xp += xp;
        if (loadedUserData.xp >= loadedUserData.lvl * 100) {
            loadedUserData.lvl++;
            loadedUserData.xp = 0;
        }
    }
    if (loadedUserData.mastery < MAX_MASTERY) {
        loadedUserData.mastery += mas;
    }
    updateTrainingHUD();
}

function updateTrainingHUD() {
    document.getElementById('train-lvl').textContent = loadedUserData.lvl;
    document.getElementById('train-mastery').textContent = loadedUserData.mastery;
}

function renderSkills(unlockAll) {
    const list = document.getElementById('skills-panel');
    list.innerHTML = "";

    let mySkills = [...SKILL_TREE.common];
    if (loadedUserData.class.includes("Юта") || loadedUserData.class.includes("Копирование")) {
        mySkills = [...mySkills, ...SKILL_TREE.yuta];
    } else if (loadedUserData.class.includes("Сукуна")) {
        mySkills = [...mySkills, ...SKILL_TREE.sukuna];
    }

    mySkills.forEach(skill => {
        const hasReq = (loadedUserData.lvl >= skill.reqLvl && loadedUserData.mastery >= skill.reqMas);
        const isUnlocked = hasReq || unlockAll;

        const card = document.createElement('div');
        card.className = `skill-card ${isUnlocked ? '' : 'locked'}`;
        card.innerHTML = `<strong>${skill.name}</strong><br>${isUnlocked ? "Готово" : "Lvl " + skill.reqLvl}`;
        
        card.onclick = () => {
            if(isUnlocked) {
                performHitAnim();
                addRewards(20, 2);
            } else {
                alert(`Нужен Lvl ${skill.reqLvl} и Mastery ${skill.reqMas}`);
            }
        };
        list.appendChild(card);
    });
}

async function saveProgress() {
    if (!loadedUserData) return;
    const userRef = doc(db, "users", loadedUserData.uid || currentUserUid);
    await setDoc(userRef, {
        lvl: loadedUserData.lvl,
        mastery: loadedUserData.mastery,
        xp: loadedUserData.xp,
        tutorialStep: loadedUserData.tutorialStep || 99,
        storySeen: loadedUserData.storySeen || false
    }, { merge: true });
}

export function startStory(storyArray, titleText, showChoicesAtEnd, callback = null) {
    const storyContainer = document.getElementById('story-container');
    const btnNext = document.getElementById('btn-next-story');
    const title = document.getElementById('story-title');
    const text = document.getElementById('story-text');
    let currentStoryIndex = 0;
    
    storyContainer.classList.remove('hidden');
    document.getElementById('choice-container').classList.add('hidden');
    btnNext.classList.remove('hidden');
    
    title.textContent = titleText;
    text.textContent = storyArray[0];

    btnNext.onclick = () => {
        currentStoryIndex++;
        if(currentStoryIndex < storyArray.length) {
            text.textContent = storyArray[currentStoryIndex];
        } else {
            if (showChoicesAtEnd) {
                btnNext.classList.add('hidden');
                showChoices(document.getElementById('choice-container'));
            } else {
                storyContainer.classList.add('hidden');
                if (callback) callback();
                else document.getElementById('gameplay-container').classList.remove('hidden');
            }
        }
    };
}

function showChoices(container) {
    container.innerHTML = "";
    container.classList.remove('hidden');
    const options = [
        { id: 1, title: "Палец Сукуны", class: "Сосуд Сукуны", rarity: "Legendary" },
        { id: 4, title: "ПРОБУДИТЬ (10 спинов)", type: "gacha" }
    ];
    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = "choice-card";
        if(opt.type === "gacha") card.style.borderColor = "gold";
        card.innerHTML = `<strong>${opt.title}</strong>`;
        card.onclick = () => {
            if(opt.type === "gacha") startGachaMode();
            else saveGameData(opt.class, opt.rarity);
        };
        container.appendChild(card);
    });
}

let spinsLeft = 10;
let currentSpunTechnique = null;
let currentUserUid = null;

function startGachaMode() {
    document.getElementById('story-container').classList.add('hidden');
    document.getElementById('spin-container').classList.remove('hidden');
    spinsLeft = 10;
    updateSpinUI();
    document.getElementById('btn-spin').onclick = spinRoulette;
    document.getElementById('btn-accept-spin').onclick = () => {
        if(currentSpunTechnique) saveGameData(currentSpunTechnique.name, currentSpunTechnique.rarity);
    };
}

function spinRoulette() {
    if(spinsLeft <= 0) return;
    const resultEl = document.getElementById('spin-result');
    const rarityEl = document.getElementById('spin-rarity');
    resultEl.textContent = "...";
    
    const rand = Math.random() * 100;
    let rarityPool = "Common";
    if (rand < 50) rarityPool = "Common";
    else if (rand < 80) rarityPool = "Rare";
    else if (rand < 95) rarityPool = "Legendary";
    else rarityPool = "MASTERS";

    const poolItems = TECHNIQUES.filter(t => t.rarity === rarityPool) || TECHNIQUES;
    const won = poolItems[Math.floor(Math.random() * poolItems.length)];
    
    currentSpunTechnique = won;
    spinsLeft--;
    resultEl.textContent = won.name;
    rarityEl.textContent = won.rarity;
    rarityEl.className = `spin-rarity ${getRarityClass(won.rarity)}`;
    updateSpinUI();
}

function updateSpinUI() {
    document.getElementById('spins-left').textContent = spinsLeft;
    if(currentSpunTechnique) document.getElementById('btn-accept-spin').classList.remove('hidden');
    if(spinsLeft <= 0) document.getElementById('btn-spin').classList.add('hidden');
}

function getRarityClass(rarity) {
    if(!rarity) return "";
    return `r-${rarity.toLowerCase()}`;
}

async function saveGameData(className, rarity) {
    const newData = {
        class: className,
        rarity: rarity || "Common",
        rank: "Студент 1 курса",
        lvl: 1,
        mastery: 0,
        xp: 0,
        tutorialStep: 0, // ТУТОРИАЛ АКТИВЕН
        storySeen: false,
        createdAt: new Date()
    };
    await setDoc(doc(db, "users", loadedUserData?.uid || currentUserUid), newData, { merge: true });
    loadedUserData = newData;

    document.getElementById('spin-container').classList.add('hidden');
    document.getElementById('story-container').classList.add('hidden');
    
    checkUserProgress(loadedUserData.uid || currentUserUid, 
                      document.getElementById('menu-container'), 
                      document.getElementById('gameplay-container'));
}

export async function resetUserData(uid) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        class: deleteField(),
        rarity: deleteField(),
        lvl: deleteField(),
        mastery: deleteField(),
        xp: deleteField(),
        tutorialStep: deleteField(),
        storySeen: deleteField(),
        rank: "Не маг"
    });
    return true;
}

export function setGlobalUid(uid) { currentUserUid = uid; }