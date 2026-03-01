import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db; 
export function initDB(app) { db = getFirestore(app); }

let loadedUserData = null; // Данные игрока
const MAX_LEVEL = 500;
const MAX_MASTERY = 500;

// --- ТЕХНИКИ И РЕДКОСТИ (GACHA) ---
const TECHNIQUES = [
    { name: "Манипуляция П.Э.", rarity: "Common", class: "r-common" },
    { name: "Использование оружия", rarity: "Common", class: "r-common" },
    { name: "Соломенная Кукла", rarity: "Rare", class: "r-rare" },
    { name: "Десять Теней", rarity: "Mythic", class: "r-mythic" },
    { name: "Копирование (Юта)", rarity: "Legendary", class: "r-legendary" },
    { name: "LIMITLESS + SIX EYES", rarity: "MASTERS", class: "r-masters" },
    { name: "MALEVOLENT SHRINE", rarity: "MASTERS", class: "r-masters" },
    { name: "Небесное Ограничение", rarity: "MASTERS", class: "r-masters" }
];

// --- СКИЛЛЫ (Требования) ---
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

// --- ИСТОРИЯ ЮТЫ ---
const YUTA_STORY = [
    "Больница. Писк монитора. Твоя сестра умерла... но она осталась.",
    "Её душа стала проклятием, чтобы защищать тебя.",
    "Несколько минут спустя... Годжо находит тебя: «Ты опасен. Идем в техникум».",
    "Техникум. Ты входишь в класс. Маки, Панда и Инумаки сразу нападают!",
    "Твоя тень разрывается. Рика кричит: «НЕ ТРОНЬТЕ ЮТУ!!!». Все в ужасе.",
    "Годжо смеется: «Отлично! А теперь покажи, на что ты способен. Начинаем тренировку!»"
];

// --- ПРОВЕРКА ПРОГРЕССА ПРИ ВХОДЕ ---
export async function checkUserProgress(uid, menuScreen, gameScreen) {
    const userRef = doc(db, "users", uid);
    try {
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().class) {
            loadedUserData = userSnap.data();
            
            // Инициализация полей
            if(!loadedUserData.lvl) loadedUserData.lvl = 1;
            if(!loadedUserData.mastery) loadedUserData.mastery = 0;
            if(!loadedUserData.xp) loadedUserData.xp = 0;
            // tutorialStep: 0 = не прошел, 99 = прошел
            if(loadedUserData.tutorialStep === undefined) loadedUserData.tutorialStep = 0; 

            updateStatusUI();
            setupTrainingButton();

            menuScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');

            // ЕСЛИ НОВИЧОК -> ЗАПУСК ОБУЧЕНИЯ (TUTORIAL)
            if (loadedUserData.tutorialStep === 0) {
                // Небольшая задержка, чтобы интерфейс прогрузился
                setTimeout(() => startTutorialSequence(1), 500);
            }

        } else {
            loadedUserData = null;
            menuScreen.classList.add('hidden');
            startStory(["Ты рождаешься в мире, полном проклятий..."], "Пролог", true);
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

// --- СИСТЕМА ОБУЧЕНИЯ (ИНТЕРАКТИВ) ---
function startTutorialSequence(step) {
    const overlay = document.getElementById('tutorial-overlay');
    const msg = document.getElementById('tutorial-msg');
    
    // Включаем затемнение
    overlay.classList.remove('hidden');

    // Убираем старые подсветки
    document.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));

    if (step === 1) {
        // ШАГ 1: Нажать Тренировку
        msg.textContent = "Годжо: «Нажми ТРЕНИРОВКА, чтобы начать!»";
        const btn = document.getElementById('btn-training');
        btn.classList.add('highlight-element');

        // Перехватываем клик
        const oldOnClick = btn.onclick; // Сохраняем логику кнопки
        btn.onclick = (e) => {
            // Снимаем подсветку
            btn.classList.remove('highlight-element');
            // Выполняем обычное действие (открыть 3D)
            open3DTraining(true); // true = это режим обучения
            // Прячем оверлей на секунду пока грузится сцена
            overlay.classList.add('hidden');
        };
    } 
    else if (step === 2) {
        // ШАГ 2: Внутри 3D -> Нажать Удар
        overlay.classList.remove('hidden');
        msg.textContent = "Годжо: «Теперь атакуй! Нажми УДАР.»";
        
        const btnHit = document.getElementById('btn-hit-dummy');
        btnHit.classList.add('highlight-element');

        btnHit.onclick = () => {
             // Логика удара
             performHitAnim();
             addRewards(10, 1);
             
             btnHit.classList.remove('highlight-element');
             // Переход к шагу 3
             startTutorialSequence(3);
        };
    }
    else if (step === 3) {
        // ШАГ 3: Выход
        msg.textContent = "Годжо: «Отлично! Нажми ВЫХОД, чтобы сохранить прогресс.»";
        
        // Отключаем удар, чтобы не отвлекал
        document.getElementById('btn-hit-dummy').onclick = null;
        
        const btnExit = document.getElementById('btn-exit-training');
        btnExit.classList.add('highlight-element');

        btnExit.onclick = async () => {
            overlay.classList.add('hidden');
            btnExit.classList.remove('highlight-element');
            
            document.getElementById('training-hub-container').classList.add('hidden');
            document.getElementById('gameplay-container').classList.remove('hidden');
            
            // Сохраняем, что обучение пройдено
            loadedUserData.tutorialStep = 99;
            await saveProgress();
            
            alert("Обучение завершено! Теперь прокачивайся самостоятельно.");
            
            // Возвращаем нормальные функции кнопкам
            setupTrainingButton(); 
        };
    }
}

// --- КНОПКА ТРЕНИРОВКИ ---
function setupTrainingButton() {
    const btnTrain = document.getElementById('btn-training');
    const newBtn = btnTrain.cloneNode(true); // Сброс слушателей
    btnTrain.parentNode.replaceChild(newBtn, btnTrain);
    
    newBtn.addEventListener('click', () => {
        // Если это Юта и он еще не видел историю (но обучение прошел или скипнул)
        if ((loadedUserData.class.includes("Юта") || loadedUserData.class.includes("Копирование")) && !loadedUserData.storySeen) {
            startStory(YUTA_STORY, "История: Юта", false, () => {
                // После истории открываем 3D
                loadedUserData.storySeen = true;
                saveProgress();
                open3DTraining(false); 
            });
        } else {
            // Обычный вход
            open3DTraining(false);
        }
    });
}

// --- 3D ТРЕНИРОВКА ---
function open3DTraining(isTutorial) {
    document.getElementById('gameplay-container').classList.add('hidden');
    document.getElementById('story-container').classList.add('hidden');
    document.getElementById('training-hub-container').classList.remove('hidden');

    updateTrainingHUD();
    renderSkills(isTutorial); // В туториале все открыто

    const btnHit = document.getElementById('btn-hit-dummy');
    const btnExit = document.getElementById('btn-exit-training');

    if (isTutorial) {
        // Если обучение -> запускаем Шаг 2
        setTimeout(() => startTutorialSequence(2), 300);
    } else {
        // ОБЫЧНЫЙ РЕЖИМ
        btnHit.onclick = () => {
            performHitAnim();
            addRewards(5, 1);
            renderSkills(false); // Проверка на новые скиллы
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
    void cube.offsetWidth; // Триггер
    cube.classList.add('hit-anim');
    
    // Случайный поворот
    const rx = -20 + (Math.random() * 20 - 10);
    const ry = 45 + (Math.random() * 40 - 20);
    cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
}

function addRewards(xp, mas) {
    if (loadedUserData.lvl < MAX_LEVEL) {
        loadedUserData.xp += xp;
        if (loadedUserData.xp >= loadedUserData.lvl * 100) {
            loadedUserData.lvl++;
            loadedUserData.xp = 0;
            // Визуальный эффект уровня можно добавить тут
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

// ОТРИСОВКА СКИЛЛОВ
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
        
        let subtext = isUnlocked ? "Готово" : `Lvl ${skill.reqLvl}`;
        
        card.innerHTML = `<strong>${skill.name}</strong><br>${subtext}`;
        
        card.onclick = () => {
            if(isUnlocked) {
                performHitAnim(); // Использование скилла тоже бьет
                addRewards(20, 2); // Больше наград
            } else {
                alert(`Нужен Уровень ${skill.reqLvl} и Мастерство ${skill.reqMas}`);
            }
        };
        list.appendChild(card);
    });
}

// --- СОХРАНЕНИЕ ---
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

// --- СТАНДАРТНЫЕ ФУНКЦИИ (История, Гача, Сброс) ---

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
    
    // Рандом
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

// ВАЖНОЕ СОХРАНЕНИЕ ПРИ СОЗДАНИИ
async function saveGameData(className, rarity) {
    const newData = {
        class: className,
        rarity: rarity || "Common",
        rank: "Студент 1 курса",
        lvl: 1,
        mastery: 0,
        xp: 0,
        tutorialStep: 0, // 0 = НУЖЕН ТУТОРИАЛ
        storySeen: false,
        createdAt: new Date()
    };
    await setDoc(doc(db, "users", loadedUserData?.uid || currentUserUid), newData, { merge: true });
    loadedUserData = newData;

    document.getElementById('spin-container').classList.add('hidden');
    document.getElementById('story-container').classList.add('hidden');
    
    // Перезапуск проверки для старта туториала
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

// Присваиваем UID глобально при входе
export function setGlobalUid(uid) { currentUserUid = uid; }