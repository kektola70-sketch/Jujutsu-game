import { checkUserProgress, resetUserData } from "./gameData.js";

export function initMenu(auth, signOutFunc) {
    const btnStart = document.getElementById('btn-start-game');
    const btnSettings = document.getElementById('btn-settings');
    const btnLogout = document.getElementById('btn-logout');
    const btnBack = document.getElementById('btn-back-to-menu');
    const btnReset = document.getElementById('btn-reset-progress'); // Кнопка сброса

    const menuScreen = document.getElementById('menu-container');
    const gameScreen = document.getElementById('gameplay-container');
    const settingsModal = document.getElementById('settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');

    if(btnStart) {
        btnStart.addEventListener('click', () => {
            const user = auth.currentUser;
            if(user) checkUserProgress(user.uid, menuScreen, gameScreen);
        });
    }

    if(btnSettings) btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    
    if(btnCloseSettings) btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // ЛОГИКА СБРОСА
    if(btnReset) {
        btnReset.addEventListener('click', async () => {
            if(confirm("ВНИМАНИЕ! Это удалит твою текущую технику и ранг. Ты вернешься в начало истории. Ты уверен?")) {
                const user = auth.currentUser;
                if(user) {
                    const success = await resetUserData(user.uid);
                    if(success) {
                        alert("Прогресс сброшен. Твоя душа очищена.");
                        // Закрываем настройки
                        settingsModal.classList.add('hidden');
                        // Скрываем игру, показываем меню
                        gameScreen.classList.add('hidden');
                        menuScreen.classList.remove('hidden');
                        // Обновляем ранг в меню
                        document.getElementById('menu-rank').textContent = "Не маг";
                        document.getElementById('menu-rank').style.color = "#a0a0a0";
                    } else {
                        alert("Ошибка сброса.");
                    }
                }
            }
        });
    }

    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Выйти?")) signOutFunc(auth);
        });
    }

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
    if(userData) {
        usernameEl.textContent = userData.email ? userData.email.split('@')[0].toUpperCase() : "АНОНИМ";
        rankEl.textContent = userData.rank || "Не маг";
        
        if(userData.rank === "Не маг") rankEl.style.color = "#a0a0a0";
        else rankEl.style.color = "#ff0055";
    }
}