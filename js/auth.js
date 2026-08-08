import { auth, db } from "./firebase-config.js";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// Кэш избранного в памяти — main.js читает/пишет отсюда вместо localStorage
window.favoritesCache = [];
window.isLoggedIn = false; // ← новая строка


// Загружает все избранные фильмы пользователя из Firestore в кэш
async function loadUserFavorites(uid) {
    const favoritesRef = collection(db, "users", uid, "favorites");
    const snapshot = await getDocs(favoritesRef);
    window.favoritesCache = snapshot.docs.map(docSnap => docSnap.data());

    // Сообщаем остальному коду (main.js), что данные готовы — можно перерисовать сердечки
    document.dispatchEvent(new Event("favoritesReady"));
}

// Добавляет фильм в Firestore (вызывается из main.js)
window.saveFavoriteToFirestore = async function (movie) {
    if (!auth.currentUser) return;
    const movieRef = doc(db, "users", auth.currentUser.uid, "favorites", String(movie.id));
    await setDoc(movieRef, movie);
};

// Убирает фильм из Firestore (вызывается из main.js)
window.removeFavoriteFromFirestore = async function (movieId) {
    if (!auth.currentUser) return;
    const movieRef = doc(db, "users", auth.currentUser.uid, "favorites", String(movieId));
    await deleteDoc(movieRef);
};

// Текущий режим формы: "login" или "register"
let authMode = "login";

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authSwitchText = document.getElementById("auth-switch-text");
const authSwitchLink = document.getElementById("auth-switch-link");
const authError = document.getElementById("auth-error");

// Функция переключения между режимами "вход" / "регистрация"
function toggleAuthMode() {
    authMode = authMode === "login" ? "register" : "login";

    if (authMode === "login") {
        authTitle.setAttribute("data-i18n", "auth_login_title");
        authSubmitBtn.setAttribute("data-i18n", "auth_login_btn");
        authSwitchText.setAttribute("data-i18n", "auth_switch_to_register");
        authSwitchLink.setAttribute("data-i18n", "auth_switch_link_register");
    } else {
        authTitle.setAttribute("data-i18n", "auth_register_title");
        authSubmitBtn.setAttribute("data-i18n", "auth_register_btn");
        authSwitchText.setAttribute("data-i18n", "auth_switch_to_login");
        authSwitchLink.setAttribute("data-i18n", "auth_switch_link_login");
    }

    // Обновляем текст согласно текущему языку (функция applyTranslations уже есть в main.js)
    applyTranslations(currentLang);

    authError.classList.add("hidden");
}

if (authSwitchLink) {
    authSwitchLink.addEventListener("click", (event) => {
        event.preventDefault();
        toggleAuthMode();
    });
}

// Функция перевода кода ошибки Firebase в понятное сообщение
function getErrorMessage(errorCode) {
    const errorMap = {
        "auth/invalid-email": "auth_error_invalid_email",
        "auth/wrong-password": "auth_error_wrong_password",
        "auth/user-not-found": "auth_error_user_not_found",
        "auth/invalid-credential": "auth_error_wrong_password",
        "auth/email-already-in-use": "auth_error_email_in_use",
        "auth/weak-password": "auth_error_weak_password"
    };

    const key = errorMap[errorCode] || "auth_error_generic";
    return translations[currentLang][key];
}

if (authForm) {
    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("auth-email").value;
        const password = document.getElementById("auth-password").value;

        authError.classList.add("hidden");

        try {
            if (authMode === "login") {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            // Успешный вход/регистрация — возвращаемся на главную
            window.location.href = "index.html";
        } catch (error) {
    authError.textContent = getErrorMessage(error.code);
    authError.classList.remove("hidden");
}
    });
}

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// Следим за статусом входа на КАЖДОЙ странице сайта
const authStatusDiv = document.getElementById("auth-status");

if (authStatusDiv) {
    onAuthStateChanged(auth, (user) => {
    if (user) {
        window.isLoggedIn = true;
        loadUserFavorites(user.uid); // ← новая строка

        // Пользователь вошёл — показываем аватар с буквой, email и кнопку "Выйти"
        const firstLetter = user.email.charAt(0).toUpperCase();

            authStatusDiv.innerHTML = `
                <div class="auth-user-capsule">
                    <span class="auth-user-avatar">${firstLetter}</span>
                    <span class="auth-user-email">${user.email}</span>
                </div>
                <button id="logout-btn" class="auth-logout-btn" data-i18n="nav_logout">Cerrar sesión</button>
            `;

            const logoutBtn = document.getElementById("logout-btn");
            logoutBtn.addEventListener("click", async () => {
                await signOut(auth);
                window.location.href = "index.html";
            });

        } else {
            // Пользователь не вошёл — показываем кнопку "Войти"
            authStatusDiv.innerHTML = `
                <a href="login.html" class="auth-login-link" data-i18n="nav_login">Iniciar sesión</a>
            `;
            window.isLoggedIn = false;
            window.favoritesCache = [];
            document.dispatchEvent(new Event("favoritesReady"));
        }

        // Обновляем переводы для только что вставленного текста
        if (typeof applyTranslations === "function") {
            applyTranslations(currentLang);
        }
    });
}