import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { initMenu, updateProfileUI } from "./menu.js";
import { initDB } from "./gameData.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpNFC0W1PRJ2Q3L0i7D7iSBWfKwhhNezs",
  authDomain: "jujutsu-game.firebaseapp.com",
  projectId: "jujutsu-game",
  storageBucket: "jujutsu-game.firebasestorage.app",
  messagingSenderId: "894199979228",
  appId: "1:894199979228:web:9fc7c12291b8dffd862819",
  measurementId: "G-2F9RFQV09Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

initDB(app);
initMenu(auth, signOut);

const authContainer = document.getElementById('auth-container');
const menuContainer = document.getElementById('menu-container');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');

document.getElementById('btn-register').addEventListener('click', () => createUserWithEmailAndPassword(auth, emailInput.value, passInput.value).catch(e => alert(e.message)));
document.getElementById('btn-login').addEventListener('click', () => signInWithEmailAndPassword(auth, emailInput.value, passInput.value).catch(e => alert(e.message)));
document.getElementById('btn-google').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => alert(e.message)));
document.getElementById('btn-anon').addEventListener('click', () => signInAnonymously(auth).catch(e => alert(e.message)));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        authContainer.classList.add('hidden');
        document.getElementById('story-container').classList.add('hidden');
        document.getElementById('spin-container').classList.add('hidden'); // Скрываем спин при входе
        
        const userRef = doc(db, "users", user.uid);
        let userData = { email: user.email, rank: "Не маг" };
        try {
            const s = await getDoc(userRef);
            if(s.exists()) userData = { ...userData, ...s.data() };
            else await setDoc(userRef, { email: user.email, rank: "Не маг", createdAt: new Date() });
        } catch(e) { console.error(e); }

        updateProfileUI(userData);
        menuContainer.classList.remove('hidden');
    } else {
        authContainer.classList.remove('hidden');
        menuContainer.classList.add('hidden');
        document.getElementById('gameplay-container').classList.add('hidden');
    }
});