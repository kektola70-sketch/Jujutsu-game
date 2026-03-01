import { checkUserProgress, startStory } from "./gameData.js";

export function initMenu(auth, signOutFunc) {
    const btnStart = document.getElementById('btn-start-game');
    const btnSettings = document.getElementById('btn-settings');
    const btnLogout = document.getElementById('btn-logout');
    const btnBack = document.getElementById('btn-back-to-menu');
    
    // Экраны
    const menuScreen = document.getElementById('menu-container');
    const gameScreen = document.getElementById('gameplay-container');
    const settingsModal = document.getElementById('settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');

    // 1. НАЧАТЬ (Проверка прогресса)
    if(btnStart) {
        btnStart.addEventListener('click', () => {
            const user = auth.currentUser;
            if(user) {
                // Функция из gameData.js проверит, новичок ли игрок
                checkUserProgress(user.uid, menuScreen, gameScreen);
            }
        });
    }

    // 2. НАСТРОЙКИ (Открыть)
    if(btnSettings) {
        btnSettings.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
    }

    // 3. ЗАКРЫТЬ НАСТРОЙКИ
    if(btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
            // Здесь можно сохранить настройки в LocalStorage
            const sound = document.getElementById('setting-sound').checked;
            const graphics = document.getElementById('setting-graphics').value;
            console.log("Настройки сохранены:", { sound, graphics });
            
            settingsModal.classList.add('hidden');
        });
    }

    // 4. ВЫХОД
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Покинуть магический техникум?")) {
                signOutFunc(auth);
            }
        });
    }

    // 5. НАЗАД В МЕНЮ
    if(btnBack) {
        btnBack.addEventListener('click', () => {
            gameScreen.classList.add('hidden');
            menuScreen.classList.remove('hidden');
        });
    }
}

export function updateProfileUI(userData) {
    const usernameEl = document.getElementById('menu-username');
    const rankEl = document.getElementById('menu-rank');
    const avatarEl = document.getElementById('avatar-display');

    if(userData) {
        usernameEl.textContent = userData.email ? userData.email.split('@')[0] : "Маг";
        // Если данные загружены из БД, ставим их, иначе дефолт
        rankEl.textContent = userData.rank || "Не маг";
        
        // Цвет ранга
        if(userData.rank === "Не маг") rankEl.style.color = "#a0a0a0";
        else rankEl.style.color = "#ff0055";
    }
}