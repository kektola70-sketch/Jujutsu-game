import { checkUserProgress, resetUserData } from "./gameData.js";

export function initMenu(auth, signOutFunc) {
    const btnStart = document.getElementById('btn-start-game');
    const btnSettings = document.getElementById('btn-settings');
    const btnLogout = document.getElementById('btn-logout');
    const btnReset = document.getElementById('btn-reset-progress');

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

    if(btnReset) {
        btnReset.addEventListener('click', async () => {
            if(confirm("Сбросить прогресс? Это удалит персонажа.")) {
                const user = auth.currentUser;
                if(user) {
                    await resetUserData(user.uid);
                    alert("Прогресс сброшен.");
                    settingsModal.classList.add('hidden');
                    gameScreen.classList.add('hidden');
                    menuScreen.classList.remove('hidden');
                    updateProfileUI({ email: user.email, rank: "Не маг" });
                }
            }
        });
    }

    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Выйти?")) signOutFunc(auth);
        });
    }

    const btnBack = document.getElementById('btn-back-to-menu');
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
    }
}