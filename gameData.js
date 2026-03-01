import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db; 
export function initDB(app) { db = getFirestore(app); }

let loadedUserData = null; 
const MAX_LEVEL = 500;
const MAX_MASTERY = 500;

// --- СКИЛЛЫ (Требования) ---
const SKILL_TREE = {
    "common": [
        { id: "punch", name: "Удар П.Э.", reqLvl: 0, reqMas: 0 },
        { id: "dash", name: "Рывок", reqLvl: 5, reqMas: 20 }
    ],
    "yuta": [
        { id: "rika_1", name: "Зов Рики", reqLvl: 10, reqMas: 50 },
        { id: "copy_speech", name: "Речь: Стой", reqLvl: 30, reqMas: 100 },
        { id: "rika_love", name: "Чистая Любовь", reqLvl: 100, reqMas: 300 }
    ],
    "sukuna": [
        { id: "dismantle", name: "Дисмантл", reqLvl: 10, reqMas: 50 },
        { id: "cleave", name: "Клив", reqLvl: 40, reqMas: 150 },
        { id: "domain", name: "Гробница Зла", reqLvl: 200, reqMas: 500 }
    ]
};

// --- ИСТОРИИ ---
const YUTA_STORY = [
    "Воспоминание: Больница. Твоя сестра умерла, но проклятие осталось.",
    "Встреча с Годжо: «Ты опасен. Идем в техникум».",
    "Техникум: Маки нападает на тебя.",
    "Рика защищает: «НЕ ТРОНЬ ЮТУ!»",
    "Годжо: «Отлично. Теперь покажи, на что ты способен в бою. (ОБУЧЕНИЕ)»"
];

// --- ПРОВЕРКА ПРОГРЕССА ---
export async function checkUserProgress(uid, menuScreen, gameScreen) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().class) {
        loadedUserData = userSnap.data();
        
        // Инициализация новых полей, если их нет
        if(!loadedUserData.lvl) loadedUserData.lvl = 1;
        if(!loadedUserData.mastery) loadedUserData.mastery = 0;
        if(!loadedUserData.xp) loadedUserData.xp = 0;

        updateStatusUI();
        setupTrainingButton();
        menuScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    } else {
        loadedUserData = null;
        menuScreen.classList.add('hidden');
        startStory(["Рождение в мире проклятий..."], "Пролог", true);
    }
}

function updateStatusUI() {
    document.getElementById('player-class-display').textContent = loadedUserData.class;
    document.getElementById('player-lvl-display').textContent = loadedUserData.lvl;
    document.getElementById('player-mastery-display').textContent = loadedUserData.mastery;
    document.getElementById('player-xp-display').textContent = Math.floor(loadedUserData.xp);
}

// --- КНОПКА ТРЕНИРОВКИ ---
function setupTrainingButton() {
    const btnTrain = document.getElementById('btn-training');
    const newBtn = btnTrain.cloneNode(true);
    btnTrain.parentNode.replaceChild(newBtn, btnTrain);
    
    newBtn.addEventListener('click', () => {
        // Если это Юта и он еще не видел историю
        if ((loadedUserData.class.includes("Юта") || loadedUserData.class.includes("Копирование")) && !loadedUserData.storySeen) {
            // Запуск истории, в конце которой начнется ТУТОРИАЛ (Все скиллы открыты)
            startStory(YUTA_STORY, "История Юты", false, () => open3DTraining(true)); 
        } else {
            // Обычная тренировка (Скиллы по уровню)
            open3DTraining(false);
        }
    });
}

// --- 3D ТРЕНИРОВКА ---
function open3DTraining(isTutorialMode) {
    document.getElementById('gameplay-container').classList.add('hidden');
    document.getElementById('story-container').classList.add('hidden');
    document.getElementById('training-hub-container').classList.remove('hidden');

    const cube = document.getElementById('dummy-cube');
    const btnHit = document.getElementById('btn-hit-dummy');
    
    // Обновляем HUD
    updateTrainingHUD();
    renderSkills(isTutorialMode);

    if(isTutorialMode) {
        alert("РЕЖИМ ОБУЧЕНИЯ: Все навыки временно разблокированы! Попробуй их.");
    }

    // УДАР
    btnHit.onclick = () => {
        // Анимация 3D куба
        cube.classList.remove('hit-anim');
        void cube.offsetWidth; // Триггер рефлоу
        cube.classList.add('hit-anim');

        // Прокачка
        addExperience(10); // +XP
        addMastery(1);     // +Mastery
        
        updateTrainingHUD();
        // В обычном режиме перерисовываем скиллы (вдруг открылся новый)
        if(!isTutorialMode) renderSkills(false);
    };

    // ВЫХОД
    document.getElementById('btn-exit-training').onclick = async () => {
        document.getElementById('training-hub-container').classList.add('hidden');
        document.getElementById('gameplay-container').classList.remove('hidden');
        
        if (isTutorialMode) {
            loadedUserData.storySeen = true; // Туториал пройден
            alert("Обучение завершено. Теперь навыки зависят от твоего уровня!");
        }
        await saveProgress();
        updateStatusUI();
    };
}

function addExperience(amount) {
    if (loadedUserData.lvl >= MAX_LEVEL) return;
    
    loadedUserData.xp += amount;
    // Формула уровня: 100 * текущий уровень
    const xpNeeded = loadedUserData.lvl * 100;
    
    if (loadedUserData.xp >= xpNeeded) {
        loadedUserData.lvl++;
        loadedUserData.xp = 0;
        alert(`УРОВЕНЬ ПОВЫШЕН! Теперь LVL ${loadedUserData.lvl}`);
    }
}

function addMastery(amount) {
    if (loadedUserData.mastery >= MAX_MASTERY) return;
    loadedUserData.mastery += amount;
}

function updateTrainingHUD() {
    document.getElementById('train-lvl').textContent = loadedUserData.lvl;
    document.getElementById('train-mastery').textContent = loadedUserData.mastery;
}

// ОТРИСОВКА СКИЛЛОВ
function renderSkills(isTutorialMode) {
    const list = document.getElementById('skills-panel');
    list.innerHTML = "";

    let mySkills = [...SKILL_TREE.common];
    
    // Добавляем классовые скиллы
    if (loadedUserData.class.includes("Юта") || loadedUserData.class.includes("Копирование")) {
        mySkills = [...mySkills, ...SKILL_TREE.yuta];
    } else if (loadedUserData.class.includes("Сукуна")) {
        mySkills = [...mySkills, ...SKILL_TREE.sukuna];
    }

    mySkills.forEach(skill => {
        // Проверка условий
        const hasLvl = loadedUserData.lvl >= skill.reqLvl;
        const hasMas = loadedUserData.mastery >= skill.reqMas;
        const isUnlocked = (hasLvl && hasMas) || isTutorialMode; // В туториале открыто ВСЕ

        const card = document.createElement('div');
        card.className = `skill-card ${isUnlocked ? '' : 'locked'} ${isTutorialMode ? 'tutorial' : ''}`;
        
        let reqText = isUnlocked ? "ГОТОВО" : `Lvl ${skill.reqLvl} | Mas ${skill.reqMas}`;
        if(isTutorialMode) reqText = "TEST MODE";

        card.innerHTML = `
            <strong>${skill.name}</strong><br>
            <small>${reqText}</small>
        `;
        
        card.onclick = () => {
            if(isUnlocked) {
                // Анимация использования скилла
                const cube = document.getElementById('dummy-cube');
                cube.style.transform = `rotateX(${Math.random()*360}deg) rotateY(${Math.random()*360}deg)`;
                // За использование мощного скилла больше опыта
                addExperience(20);
                updateTrainingHUD();
            } else {
                alert(`Недостаточно опыта! Нужен Уровень ${skill.reqLvl} и Мастерство ${skill.reqMas}`);
            }
        };

        list.appendChild(card);
    });
}

// --- СОХРАНЕНИЕ ---
async function saveProgress() {
    const userRef = doc(db, "users", loadedUserData.uid || currentUserUid);
    await setDoc(userRef, {
        lvl: loadedUserData.lvl,
        mastery: loadedUserData.mastery,
        xp: loadedUserData.xp,
        storySeen: loadedUserData.storySeen || false
    }, { merge: true });
}

// ... (Функции startStory, showChoices, resetUserData и т.д. остаются как раньше)
// Скопируй их из предыдущего ответа, они универсальны.
// Важно: в resetUserData добавь удаление полей lvl и mastery.

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

export async function resetUserData(uid) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        class: deleteField(),
        rarity: deleteField(),
        lvl: deleteField(),
        mastery: deleteField(),
        xp: deleteField(),
        storySeen: deleteField(),
        rank: "Не маг"
    });
    return true;
}

// Не забудь добавить функции showChoices и логику Gacha (copy-paste из прошлого ответа), 
// добавив в сохранение saveGameData инициализацию lvl: 1, mastery: 0.

function showChoices(container) {
    container.innerHTML = "";
    container.classList.remove('hidden');
    const options = [
        { id: 1, title: "Палец Сукуны", class: "Сосуд Сукуны", rarity: "Legendary" },
        { id: 4, title: "ГАЧА (10 круток)", type: "gacha" }
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

async function saveGameData(className, rarity) {
    const newData = {
        class: className,
        rank: "Студент 1 курса",
        rarity: rarity || "Common",
        lvl: 1,
        mastery: 0,
        xp: 0,
        storySeen: false,
        createdAt: new Date()
    };
    await setDoc(doc(db, "users", loadedUserData?.uid || currentUserUid), newData, { merge: true });
    loadedUserData = newData;
    document.getElementById('spin-container').classList.add('hidden');
    document.getElementById('story-container').classList.add('hidden');
    document.getElementById('gameplay-container').classList.remove('hidden');
    updateStatusUI();
    setupTrainingButton();
}

// ... (Добавь сюда логику Gacha spins из предыдущего файла)
let spinsLeft = 10;
let currentSpunTechnique = null;
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
    if(spinsLeft<=0)return;
    // ... логика рандома
    const items = TECHNIQUES; 
    const won = items[Math.floor(Math.random()*items.length)];
    currentSpunTechnique = won;
    spinsLeft--;
    document.getElementById('spin-result').textContent = won.name;
    updateSpinUI();
}
function updateSpinUI() {
    document.getElementById('spins-left').textContent = spinsLeft;
    if(currentSpunTechnique) document.getElementById('btn-accept-spin').classList.remove('hidden');
}
const TECHNIQUES = [
    { name: "Копирование (Юта)", rarity: "Legendary" },
    { name: "Сукуна", rarity: "MASTERS" }
];