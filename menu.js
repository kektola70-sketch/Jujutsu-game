// menu.js

// Экспортируем функцию инициализации меню
export function initMenu(auth, signOutFunc) {
    
    // Элементы
    const btnStart = document.getElementById('btn-start-game');
    const btnSettings = document.getElementById('btn-settings');
    const btnLogout = document.getElementById('btn-logout');
    const btnBack = document.getElementById('btn-back-to-menu');
    
    // Экраны
    const menuScreen = document.getElementById('menu-container');
    const gameScreen = document.getElementById('gameplay-container');

    // 1. Кнопка "Начать миссию"
    if(btnStart) {
        btnStart.addEventListener('click', () => {
            console.log("Запуск игры...");
            // Скрываем меню, показываем игру
            menuScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
        });
    }

    // 2. Кнопка "Настройки"
    if(btnSettings) {
        btnSettings.addEventListener('click', () => {
            alert("Настройки пока недоступны. Используй Проклятую Энергию с умом.");
        });
    }

    // 3. Кнопка "Выход"
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Покинуть магический техникум?")) {
                signOutFunc(auth).then(() => {
                    console.log("User logged out via Menu");
                });
            }
        });
    }

    // 4. Кнопка "Вернуться в меню" (из игры)
    if(btnBack) {
        btnBack.addEventListener('click', () => {
            gameScreen.classList.add('hidden');
            menuScreen.classList.remove('hidden');
        });
    }
}

// Функция для обновления интерфейса профиля
export function updateProfileUI(user) {
    const usernameEl = document.getElementById('menu-username');
    if(user) {
        // Если есть email, берем часть до @, иначе 'Неизвестный'
        const name = user.email ? user.email.split('@')[0] : "Сукуна (Аноним)";
        usernameEl.textContent = name;
    }
}