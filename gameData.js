import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db; 
export function initDB(app) { db = getFirestore(app); }

// Глобальная переменная для хранения данных текущего игрока
let loadedUserData = null;

// --- ТЕХНИКИ И ШАНСЫ ---
const TECHNIQUES = [
    { name: "Манипуляция проклятой энергией", rarity: "Common", class: "r-common" },
    { name: "Использование оружия", rarity: "Common", class: "r-common" },
    { name: "Простые Шикигами", rarity: "Common", class: "r-common" },
    { name: "Манипуляция волосами", rarity: "Uncommon", class: "r-uncommon" },
    { name: "Создание конструкций", rarity: "Uncommon", class: "r-uncommon" },
    { name: "Ядовитая кровь (Слабая)", rarity: "Uncommon", class: "r-uncommon" },
    { name: "Соломенная Кукла (Нобара)", rarity: "Rare", class: "r-rare" },
    { name: "Техника Соотношения (Нанами)", rarity: "Rare", class: "r-rare" },
    { name: "Буги-Вуги (Тодо)", rarity: "Rare", class: "r-rare" },
    { name: "Проклятая Речь (Инумаки)", rarity: "Epic", class: "r-epic" },
    { name: "Растения Бедствия (Ханами)", rarity: "Epic", class: "r-epic" },
    { name: "Огонь Бедствия (Джого)", rarity: "Epic", class: "r-epic" },
    { name: "Десять Теней (Фушигуро)", rarity: "Mythic", class: "r-mythic" },
    { name: "Мутация Души (Махито)", rarity: "Mythic", class: "r-mythic" },
    { name: "Обратная Техника (Шоко)", rarity: "Mythic", class: "r-mythic" },
    { name: "Звездная Ярость (Юки)", rarity: "Legendary", class: "r-legendary" },
    { name: "Копирование (Юта)", rarity: "Legendary", class: "r-legendary" }, // ЭТО ВАЖНО
    { name: "LIMITLESS + SIX EYES (Годжо)", rarity: "MASTERS", class: "r-masters" },
    { name: "MALEVOLENT SHRINE (Сукуна)", rarity: "MASTERS", class: "r-masters" },
    { name: "HEAVENLY RESTRICTION (Тодзи)", rarity: "MASTERS", class: "r-masters" }
];

// --- ИСТОРИЯ ЮТЫ ---
const YUTA_STORY = [
    "Больничная палата. Писк кардиомонитора остановился. Твоя сестра умерла... но она не ушла.",
    "Её душа исказилась, превратившись в чудовищное проклятие. Она осталась здесь, чтобы защищать тебя. «Юта... я буду всегда с тобой...»",
    "Несколько минут спустя... Ты сидишь на улице, обхватив колени. К тебе подходит высокий человек с повязкой на глазах. Сатору Годжо.",
    "«Ты проклят, парень. Но это можно контролировать. Вступай в Магический Техникум», — предложил он. Ты согласился, ведь тебе больше некуда идти.",
    "Магический Техникум. Класс первого курса. Годжо стоит у двери: «Юта, заходи!»\nИз класса слышно бормотание Маки: «Пф, будет у меня в игноре».",
    "Ты делаешь неуверенный шаг внутрь. В ту же секунду воздух тяжелеет. Панда, Инумаки и Маки вскакивают, выхватывая оружие. Они чувствуют ауру смерти.",
    "Годжо смеется: «Эй, полегче с ним!»\nНо поздно. Они готовы убить тебя, чувствуя угрозу.",
    "Вдруг из твоей тени вырывается гигантская когтистая лапа. Чудовищный крик оглушает всех:\n«НЕ ТРОНЬТЕ ЮТУ!!!»",
    "Это твоя сестра. Ты в панике пытаешься её сдержать: «Сестра, не надо! Они не враги!»"
];

// --- ИСТОРИЯ ПРОЛОГА ---
const INTRO_STORY = [
    "Тишина... Ты в теле младенца. Кендзяку смотрит на тебя.",
    "«Эра проклятий требует жертв», — говорит он.",
    "На столе лежат предметы для эксперимента.",
    "Кендзяку ухмыляется: «Или, может быть, мы позволим судьбе самой выбрать твой дар?»"
];

let currentStoryIndex = 0;
let currentUserUid = null;
let currentActiveStory = []; // Какая история сейчас идет
let spinsLeft = 10;
let currentSpunTechnique = null;

// ПРОВЕРКА ПРОГРЕССА
export async function checkUserProgress(uid, menuScreen, gameScreen) {
    currentUserUid = uid;
    const userRef = doc(db, "users", uid);
    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().class) {
            loadedUserData = userSnap.data(); // Сохраняем данные в переменную
            
            // Отображение
            document.getElementById('player-class-display').textContent = loadedUserData.class;
            document.getElementById('player-rank-display').textContent = loadedUserData.rank;
            const rarityEl = document.getElementById('player-rarity-display');
            rarityEl.textContent = loadedUserData.rarity || "Особая";
            rarityEl.className = getRarityClass(loadedUserData.rarity);

            // Активируем кнопку тренировки
            setupTrainingButton();

            menuScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
        } else {
            loadedUserData = null;
            menuScreen.classList.add('hidden');
            startStory(INTRO_STORY, "Эксперимент", true); // true = в конце будет выбор
        }
    } catch (e) { console.error(e); }
}

// НАСТРОЙКА КНОПКИ ТРЕНИРОВКИ
function setupTrainingButton() {
    const btnTrain = document.getElementById('btn-training');
    // Удаляем старые слушатели, чтобы не дублировались
    const newBtn = btnTrain.cloneNode(true);
    btnTrain.parentNode.replaceChild(newBtn, btnTrain);
    
    newBtn.addEventListener('click', () => {
        if (!loadedUserData) return;

        // Если класс Юта (Копирование)
        if (loadedUserData.class.includes("Копирование") || loadedUserData.class.includes("Юта")) {
            // Запускаем историю Юты
            document.getElementById('gameplay-container').classList.add('hidden');
            startStory(YUTA_STORY, "Воспоминание Юты", false); // false = без выбора в конце
        } else {
            alert("Тренировка прошла успешно! Твой уровень проклятой энергии немного вырос. (Сюжет для этого персонажа в разработке)");
        }
    });
}

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ИСТОРИИ
export function startStory(storyArray, titleText, showChoicesAtEnd) {
    const storyContainer = document.getElementById('story-container');
    const btnNext = document.getElementById('btn-next-story');
    const title = document.getElementById('story-title');
    const text = document.getElementById('story-text');
    
    currentActiveStory = storyArray;
    
    storyContainer.classList.remove('hidden');
    document.getElementById('choice-container').classList.add('hidden');
    btnNext.classList.remove('hidden');
    
    currentStoryIndex = 0;
    title.textContent = titleText;
    text.textContent = currentActiveStory[0];

    btnNext.onclick = () => {
        currentStoryIndex++;
        if(currentStoryIndex < currentActiveStory.length) {
            text.textContent = currentActiveStory[currentStoryIndex];
        } else {
            // Конец истории
            if (showChoicesAtEnd) {
                // Если это пролог -> показываем выбор классов
                title.textContent = "ВЫБОР ПУТИ";
                text.textContent = "Выбери свою судьбу.";
                btnNext.classList.add('hidden');
                showChoices(document.getElementById('choice-container'));
            } else {
                // Если это тренировка -> возвращаемся в игру
                storyContainer.classList.add('hidden');
                document.getElementById('gameplay-container').classList.remove('hidden');
            }
        }
    };
}

// СБРОС (RESET)
export async function resetUserData(uid) {
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, {
            class: deleteField(),
            rarity: deleteField(),
            storyCompleted: deleteField(),
            rank: "Не маг"
        });
        loadedUserData = null; // Очищаем локальные данные
        return true;
    } catch (e) {
        console.error("Ошибка сброса:", e);
        return false;
    }
}

// ГЕНЕРАЦИЯ КАРТОЧЕК ВЫБОРА (ПРОЛОГ)
function showChoices(container) {
    container.innerHTML = "";
    container.classList.remove('hidden');

    const options = [
        { id: 1, title: "Съесть Палец Сукуны", desc: "Стать сосудом Двуликого.", class: "Сосуд Сукуны", rarity: "Legendary" },
        { id: 2, title: "Картина Смерти", desc: "Стать магом крови.", class: "Маг Крови", rarity: "Epic" },
        { id: 3, title: "Небесное Ограничение", desc: "Физическая сила.", class: "Небесное Ограничение", rarity: "Masters" },
        { id: 4, title: "ПРОБУДИТЬ ТЕХНИКУ (Reroll)", desc: "10 попыток выбить клан.", type: "gacha" }
    ];

    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = "choice-card";
        if(opt.type === "gacha") card.style.borderColor = "var(--mythic)";
        card.innerHTML = `<span class="choice-title">${opt.title}</span><span class="choice-desc">${opt.desc}</span>`;
        card.onclick = () => {
            if(opt.type === "gacha") startGachaMode();
            else saveGameData(opt.class, opt.rarity);
        };
        container.appendChild(card);
    });
}

// ГАЧА РЕЖИМ
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
    rarityEl.className = "spin-rarity";
    
    const rand = Math.random() * 100;
    let rarityPool = "";
    
    if (rand < 30) rarityPool = "Common";
    else if (rand < 55) rarityPool = "Uncommon";
    else if (rand < 75) rarityPool = "Rare";
    else if (rand < 90) rarityPool = "Epic";
    else if (rand < 96) rarityPool = "Mythic";
    else if (rand < 98.5) rarityPool = "Legendary";
    else rarityPool = "MASTERS";

    const poolItems = TECHNIQUES.filter(t => t.rarity === rarityPool);
    const wonItem = poolItems[Math.floor(Math.random() * poolItems.length)];

    currentSpunTechnique = wonItem;
    spinsLeft--;

    resultEl.textContent = wonItem.name;
    rarityEl.textContent = wonItem.rarity;
    rarityEl.className = `spin-rarity ${wonItem.class}`;
    updateSpinUI();
}

function updateSpinUI() {
    document.getElementById('spins-left').textContent = spinsLeft;
    const btnSpin = document.getElementById('btn-spin');
    const btnAccept = document.getElementById('btn-accept-spin');

    if(currentSpunTechnique) btnAccept.classList.remove('hidden');
    if(spinsLeft <= 0) {
        btnSpin.classList.add('hidden');
        btnSpin.disabled = true;
    } else {
        btnSpin.classList.remove('hidden'); 
        btnSpin.disabled = false;
    }
}

function getRarityClass(rarity) {
    if(rarity === "Common") return "r-common";
    if(rarity === "Uncommon") return "r-uncommon";
    if(rarity === "Rare") return "r-rare";
    if(rarity === "Epic") return "r-epic";
    if(rarity === "Mythic") return "r-mythic";
    if(rarity === "Legendary") return "r-legendary";
    if(rarity === "MASTERS") return "r-masters";
    return "";
}

async function saveGameData(className, rarity) {
    const gameScreen = document.getElementById('gameplay-container');
    const spinScreen = document.getElementById('spin-container');
    
    try {
        const newData = {
            class: className,
            rank: "Студент 1 курса",
            rarity: rarity || "Common",
            storyCompleted: true,
            createdAt: new Date()
        };

        await setDoc(doc(db, "users", currentUserUid), newData, { merge: true });
        
        loadedUserData = newData; // Обновляем локально

        alert(`Ты получил силу: ${className} [${rarity}]`);
        
        // Обновляем UI
        document.getElementById('player-class-display').textContent = className;
        document.getElementById('player-rank-display').textContent = "Студент 1 курса";
        const rEl = document.getElementById('player-rarity-display');
        rEl.textContent = rarity;
        rEl.className = getRarityClass(rarity);

        // Настраиваем кнопку тренировки для новой техники
        setupTrainingButton();

        spinScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    } catch (e) {
        console.error("Save error:", e);
        alert("Ошибка сохранения");
    }
}