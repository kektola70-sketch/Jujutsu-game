import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db; 
export function initDB(app) { db = getFirestore(app); }

// --- ДАННЫЕ ДЛЯ РУЛЕТКИ (Gacha) ---
const TECHNIQUES = [
    // COMMON (30%)
    { name: "Манипуляция проклятой энергией", rarity: "Common", class: "r-common" },
    { name: "Использование оружия", rarity: "Common", class: "r-common" },
    { name: "Простые Шикигами", rarity: "Common", class: "r-common" },
    
    // UNCOMMON (25%)
    { name: "Манипуляция волосами", rarity: "Uncommon", class: "r-uncommon" },
    { name: "Создание конструкций", rarity: "Uncommon", class: "r-uncommon" },
    { name: "Ядовитая кровь (Слабая)", rarity: "Uncommon", class: "r-uncommon" },

    // RARE (20%)
    { name: "Соломенная Кукла (Нобара)", rarity: "Rare", class: "r-rare" },
    { name: "Техника Соотношения (Нанами)", rarity: "Rare", class: "r-rare" },
    { name: "Буги-Вуги (Тодо)", rarity: "Rare", class: "r-rare" },

    // EPIC (15%)
    { name: "Проклятая Речь (Инумаки)", rarity: "Epic", class: "r-epic" },
    { name: "Растения Бедствия (Ханами)", rarity: "Epic", class: "r-epic" },
    { name: "Огонь Бедствия (Джого)", rarity: "Epic", class: "r-epic" },

    // MYTHIC (10%)
    { name: "Десять Теней (Фушигуро)", rarity: "Mythic", class: "r-mythic" },
    { name: "Мутация Души (Махито)", rarity: "Mythic", class: "r-mythic" },
    { name: "Обратная Техника (Шоко)", rarity: "Mythic", class: "r-mythic" },

    // LEGENDARY (5%)
    { name: "Звездная Ярость (Юки)", rarity: "Legendary", class: "r-legendary" },
    { name: "Копирование (Юта)", rarity: "Legendary", class: "r-legendary" },

    // MASTERS (2.5%) - Самые сильные
    { name: "LIMITLESS + SIX EYES (Годжо)", rarity: "MASTERS", class: "r-masters" },
    { name: "MALEVOLENT SHRINE (Сукуна)", rarity: "MASTERS", class: "r-masters" },
    { name: "HEAVENLY RESTRICTION (Тодзи)", rarity: "MASTERS", class: "r-masters" }
];

// --- СЮЖЕТ ---
const storySteps = [
    "Тишина... Ты в теле младенца. Кендзяку смотрит на тебя.",
    "«Эра проклятий требует жертв», — говорит он.",
    "На столе лежат предметы для эксперимента. Но ты чувствуешь, что внутри тебя уже спит скрытая сила.",
    "Кендзяку ухмыляется: «Или, может быть, мы позволим судьбе самой выбрать твой дар?»"
];

let currentStoryIndex = 0;
let currentUserUid = null;
let spinsLeft = 10;
let currentSpunTechnique = null; // То, что выпало сейчас

export async function checkUserProgress(uid, menuScreen, gameScreen) {
    currentUserUid = uid;
    const userRef = doc(db, "users", uid);
    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().class) {
            // ИГРОК УЖЕ ИМЕЕТ КЛАСС
            const data = userSnap.data();
            document.getElementById('player-class-display').textContent = data.class;
            document.getElementById('player-rank-display').textContent = data.rank;
            
            // Если есть редкость, покажем и её
            const rarityEl = document.getElementById('player-rarity-display');
            rarityEl.textContent = data.rarity || "Особая";
            // Добавляем цвет классу редкости
            rarityEl.className = getRarityClass(data.rarity);

            menuScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
        } else {
            // НОВИЧОК
            menuScreen.classList.add('hidden');
            startStory();
        }
    } catch (e) { console.error(e); }
}

export function startStory() {
    const storyContainer = document.getElementById('story-container');
    const btnNext = document.getElementById('btn-next-story');
    const title = document.getElementById('story-title');
    const text = document.getElementById('story-text');
    
    storyContainer.classList.remove('hidden');
    document.getElementById('choice-container').classList.add('hidden');
    btnNext.classList.remove('hidden');
    
    currentStoryIndex = 0;
    title.textContent = "Эксперимент";
    text.textContent = storySteps[0];

    btnNext.onclick = () => {
        currentStoryIndex++;
        if(currentStoryIndex < storySteps.length) {
            text.textContent = storySteps[currentStoryIndex];
        } else {
            title.textContent = "ВЫБОР ПУТИ";
            text.textContent = "Выбери свою судьбу. Используй предметы или положись на удачу.";
            btnNext.classList.add('hidden');
            showChoices(document.getElementById('choice-container'));
        }
    };
}

function showChoices(container) {
    container.innerHTML = "";
    container.classList.remove('hidden');

    const options = [
        { id: 1, title: "Съесть Палец Сукуны", desc: "Стать сосудом Двуликого.", class: "Сосуд Сукуны", rarity: "Legendary" },
        { id: 2, title: "Картина Смерти", desc: "Стать магом крови (Чосо).", class: "Маг Крови", rarity: "Epic" },
        { id: 3, title: "Небесное Ограничение", desc: "Отказаться от магии ради физухи.", class: "Небесное Ограничение", rarity: "Masters" },
        // 4 ВАРИАНТ - ГАЧА
        { id: 4, title: "ПРОБУДИТЬ ТЕХНИКУ (Reroll)", desc: "10 попыток выбить клановую технику.", type: "gacha" }
    ];

    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = "choice-card";
        // Подсветка 4 варианта
        if(opt.type === "gacha") card.style.borderColor = "var(--mythic)";

        card.innerHTML = `<span class="choice-title">${opt.title}</span><span class="choice-desc">${opt.desc}</span>`;
        
        card.onclick = () => {
            if(opt.type === "gacha") {
                startGachaMode();
            } else {
                saveGameData(opt.class, opt.rarity);
            }
        };
        container.appendChild(card);
    });
}

// --- ЛОГИКА ГАЧИ (SPIN) ---
function startGachaMode() {
    document.getElementById('story-container').classList.add('hidden');
    document.getElementById('spin-container').classList.remove('hidden');
    spinsLeft = 10;
    updateSpinUI();

    document.getElementById('btn-spin').onclick = spinRoulette;
    document.getElementById('btn-accept-spin').onclick = () => {
        if(currentSpunTechnique) {
            saveGameData(currentSpunTechnique.name, currentSpunTechnique.rarity);
        }
    };
}

function spinRoulette() {
    if(spinsLeft <= 0) return;

    const resultEl = document.getElementById('spin-result');
    const rarityEl = document.getElementById('spin-rarity');
    
    // Анимация
    resultEl.textContent = "...";
    rarityEl.className = "spin-rarity";
    
    // Генерация числа 0-100
    const rand = Math.random() * 100;
    let rarityPool = "";
    
    // Шансы (Cumulative)
    if (rand < 30) rarityPool = "Common";
    else if (rand < 55) rarityPool = "Uncommon"; // 30+25
    else if (rand < 75) rarityPool = "Rare";     // 55+20
    else if (rand < 90) rarityPool = "Epic";     // 75+15
    else if (rand < 96) rarityPool = "Mythic";   // 90+6 (чуть урезал)
    else if (rand < 98.5) rarityPool = "Legendary"; // 96+2.5
    else rarityPool = "MASTERS";                 // Оставшиеся 1.5%

    // Выбираем случайную технику из пула
    const poolItems = TECHNIQUES.filter(t => t.rarity === rarityPool);
    const wonItem = poolItems[Math.floor(Math.random() * poolItems.length)];

    currentSpunTechnique = wonItem;
    spinsLeft--;

    // Показ результата
    resultEl.textContent = wonItem.name;
    rarityEl.textContent = wonItem.rarity;
    rarityEl.className = `spin-rarity ${wonItem.class}`; // Цвет
    
    updateSpinUI();
}

function updateSpinUI() {
    document.getElementById('spins-left').textContent = spinsLeft;
    
    const btnSpin = document.getElementById('btn-spin');
    const btnAccept = document.getElementById('btn-accept-spin');

    if(currentSpunTechnique) {
        btnAccept.classList.remove('hidden');
    }
    
    if(spinsLeft <= 0) {
        btnSpin.classList.add('hidden'); // Скрываем кнопку спина
        btnSpin.disabled = true;
    }
}

// Вспомогательная для CSS классов
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

// СОХРАНЕНИЕ В БАЗУ И СТАРТ
async function saveGameData(className, rarity) {
    const gameScreen = document.getElementById('gameplay-container');
    const spinScreen = document.getElementById('spin-container');
    const storyScreen = document.getElementById('story-container');

    try {
        await setDoc(doc(db, "users", currentUserUid), {
            class: className,
            rank: "Студент 1 курса",
            rarity: rarity || "Common",
            storyCompleted: true,
            createdAt: new Date()
        }, { merge: true });

        alert(`Ты получил силу: ${className} [${rarity}]`);

        // Обновляем UI
        document.getElementById('player-class-display').textContent = className;
        document.getElementById('player-rank-display').textContent = "Студент 1 курса";
        const rEl = document.getElementById('player-rarity-display');
        rEl.textContent = rarity;
        rEl.className = getRarityClass(rarity);

        storyScreen.classList.add('hidden');
        spinScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');

    } catch (e) {
        console.error("Save error:", e);
        alert("Ошибка сохранения");
    }
}