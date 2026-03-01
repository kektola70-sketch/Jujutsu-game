import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db; // Сюда сохраним ссылку на БД

export function initDB(app) {
    db = getFirestore(app);
}

// --- СЮЖЕТ И ВЫБОР ---

const storySteps = [
    "Ты открываешь глаза в странной лаборатории. Голова раскалывается.",
    "Ты смутно помнишь своё детство. Твоя мать... она была доброй, но однажды её поведение изменилось.",
    "На лбу матери появился шрам, которого раньше не было. Это был уже не твой родитель. Это был Кендзяку, древний маг, захвативший её тело.",
    "«Ради эволюции проклятой энергии», — шептал он, проводя над тобой эксперименты. Теперь ты стоишь перед выбором, который определит твою судьбу."
];

let currentStoryIndex = 0;
let currentUserUid = null;

// Проверяем, есть ли сохранение у игрока
export async function checkUserProgress(uid, menuScreen, gameScreen) {
    currentUserUid = uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().class) {
        // У игрока уже есть класс -> Идем сразу в Игру
        console.log("Игрок найден:", userSnap.data());
        document.getElementById('player-class-display').textContent = userSnap.data().class;
        
        menuScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    } else {
        // Игрок новый или без класса -> Запускаем Обучение
        console.log("Новый игрок. Запуск сюжета.");
        menuScreen.classList.add('hidden');
        startStory();
    }
}

// Запуск истории
export function startStory() {
    const storyContainer = document.getElementById('story-container');
    const storyText = document.getElementById('story-text');
    const btnNext = document.getElementById('btn-next-story');
    const choiceContainer = document.getElementById('choice-container');
    const title = document.getElementById('story-title');

    storyContainer.classList.remove('hidden');
    choiceContainer.classList.add('hidden');
    btnNext.classList.remove('hidden');
    
    currentStoryIndex = 0;
    title.textContent = "Предистория";
    storyText.textContent = storySteps[0];

    // Клик по "Продолжить"
    btnNext.onclick = () => {
        currentStoryIndex++;
        if(currentStoryIndex < storySteps.length) {
            storyText.textContent = storySteps[currentStoryIndex];
        } else {
            // История кончилась, показываем выбор
            title.textContent = "ЭКСПЕРИМЕНТ";
            storyText.textContent = "Перед тобой на столе лежат три проклятых предмета. Кендзяку наблюдает. Что ты выберешь?";
            btnNext.classList.add('hidden');
            showChoices(choiceContainer);
        }
    };
}

function showChoices(container) {
    container.innerHTML = "";
    container.classList.remove('hidden');

    const options = [
        {
            id: 1,
            title: "1. Гнилой Палец",
            desc: "Съесть палец Двуликого. Риск смерти 99%. Награда: Сила Сукуны.",
            class: "Сосуд Сукуны",
            rank: "Студент 1 курса"
        },
        {
            id: 2,
            title: "2. Картина Смерти (Эмбрион)",
            desc: "Проглотить проклятый плод. Стать полу-проклятием с магией крови.",
            class: "Маг Крови (Чосо)",
            rank: "Студент 1 курса"
        },
        {
            id: 3,
            title: "3. Сломанное Небесное Копье",
            desc: "Вживить осколок в тело. Это убьёт магию, но дарует сверхчеловеческую силу.",
            class: "Небесное Ограничение",
            rank: "Студент 1 курса"
        }
    ];

    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = "choice-card";
        card.innerHTML = `
            <span class="choice-title">${opt.title}</span>
            <span class="choice-desc">${opt.desc}</span>
        `;
        card.onclick = () => selectPath(opt);
        container.appendChild(card);
    });
}

async function selectPath(option) {
    const storyContainer = document.getElementById('story-container');
    const gameScreen = document.getElementById('gameplay-container');
    
    // Сохраняем выбор в БД
    try {
        await setDoc(doc(db, "users", currentUserUid), {
            class: option.class,
            rank: option.rank, // Повышаем ранг после выбора
            storyCompleted: true,
            email: document.getElementById('menu-username').textContent // Сохраним имя для удобства
        }, { merge: true });

        alert(`Ты выбрал путь: ${option.class}. Твое тело изменилось.`);
        
        // Обновляем интерфейс
        document.getElementById('menu-rank').textContent = option.rank;
        document.getElementById('player-class-display').textContent = option.class;

        storyContainer.classList.add('hidden');
        gameScreen.classList.remove('hidden');

    } catch (e) {
        console.error("Ошибка сохранения:", e);
        alert("Ошибка магии (базы данных). Проверь консоль.");
    }
}