console.log('✅ main.js загружен');

// Локальная заглушка для постера (SVG, без внешних запросов к сервисам-плейсхолдерам —
// via.placeholder.com периодически недоступен и даёт ERR_CONNECTION_CLOSED)
const NO_POSTER_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='342' height='513' viewBox='0 0 342 513'%3E%3Crect width='342' height='513' fill='%231C1C24'/%3E%3Cg fill='none' stroke='%239A9AA5' stroke-width='2'%3E%3Cpath d='M110 190h122v133H110z'/%3E%3Cpath d='M110 280l35-35 25 25 40-45 22 22'/%3E%3Ccircle cx='150' cy='215' r='9'/%3E%3C/g%3E%3Ctext x='171' y='355' font-family='Poppins, Arial, sans-serif' font-size='16' fill='%239A9AA5' text-anchor='middle'%3ESin imagen%3C/text%3E%3C/svg%3E";

// ===== Логика избранного (Firestore, через window.favoritesCache из auth.js) =====

function getFavorites() {
    return window.favoritesCache || [];
}

function isFavorite(movieId) {
    return getFavorites().some(movie => movie.id === movieId);
}

function toggleFavorite(movie) {
    if (isFavorite(movie.id)) {
        // Убираем сразу из кэша (иконка мгновенно перекрасится)
        window.favoritesCache = getFavorites().filter(fav => fav.id !== movie.id);
        // И в фоне убираем из Firestore
        window.removeFavoriteFromFirestore(movie.id);
    } else {
        window.favoritesCache = [...getFavorites(), movie];
        window.saveFavoriteToFirestore(movie);
    }
}

// Отрисовать избранные фильмы на странице favorites.html
function loadFavoritesPage() {
    const grid = document.getElementById("favorites-grid");
    if (!grid) return; // на случай если мы не на странице favorites.html

    const emptyMessage = document.getElementById("favorites-empty");
    const loginRequiredMessage = document.getElementById("favorites-login-required");

    // Не вошёл — показываем "войдите", ничего больше не рисуем
    if (!window.isLoggedIn) {
        grid.innerHTML = "";
        emptyMessage.classList.add("hidden");
        if (loginRequiredMessage) loginRequiredMessage.classList.remove("hidden");
        return;
    }

    if (loginRequiredMessage) loginRequiredMessage.classList.add("hidden");

    const favorites = getFavorites();
    if (favorites.length === 0) {
        grid.innerHTML = "";
        emptyMessage.classList.remove("hidden");
    } else {
        emptyMessage.classList.add("hidden");
        renderMovies(favorites, "favorites-grid");
    }
}

// Список слов для фильтрации нежелательного контента (эротика/18+ по смыслу)
 const BLOCKED_KEYWORDS = [
    // Английский
    "sex", "erotic", "erotica", "porn", "xxx",
    "softcore", "hardcore", "pink film", "pinku",
    // Испанский
    "sexo", "erótico", "erótica", "porno",
    // Русский
    "секс", "эротика", "эротический", "порно"
];

// Функция проверки: содержит ли фильм запрещённые слова в названии или описании
function isBlockedContent(movie) {
    const text = `${movie.title} ${movie.overview}`.toLowerCase();
    return BLOCKED_KEYWORDS.some(word => text.includes(word));
}
// Функция показа skeleton-карточек (заглушек) во время загрузки данных с TMDB
function showSkeletonCards(targetId, count = 8) {
    const grid = document.getElementById(targetId);
    if (!grid) return; // на случай если такого контейнера нет на странице

    grid.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const skeletonCard = document.createElement("div");
        skeletonCard.className = "skeleton-card";
        skeletonCard.innerHTML = `
            <div class="skeleton-poster"></div>
            <div class="skeleton-info">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        `;
        grid.appendChild(skeletonCard);
    }
}

// Функция показа сообщения об ошибке вместо карточек
function showErrorMessage(targetId, message, isNetworkError = false) {
    const grid = document.getElementById(targetId);
    if (!grid) return;

    grid.innerHTML = "";

    const errorDiv = document.createElement("div");
    errorDiv.className = isNetworkError ? "error-message network-error" : "error-message";
    errorDiv.textContent = message;
    grid.appendChild(errorDiv);
}

// Функция для отображения списка фильмов на странице
function renderMovies(movies, targetId = "movies-grid") {
    movies = movies.filter(movie => !movie.adult && !isBlockedContent(movie));

    const grid = document.getElementById(targetId);
    if (!grid) return; // на случай если такого контейнера нет на странице
    grid.innerHTML = "";

    movies.forEach(movie => {

        const card = document.createElement("div");
        card.className = "movie-card";

        const posterUrl = movie.poster_path
            ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
            : NO_POSTER_PLACEHOLDER;

        card.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title}">
            <button class="favorite-btn ${isFavorite(movie.id) ? 'active' : ''}">
            <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            </button>
            <div class="movie-card-info">
                <h3>${movie.title}</h3>
                <span class="rating">⭐ ${movie.vote_average.toFixed(1)}</span>
            </div>
        `;

        card.addEventListener("click", () => openModal(movie));

        const favBtn = card.querySelector(".favorite-btn");
        favBtn.addEventListener("click", (event) => {
            event.stopPropagation(); // чтобы клик по сердечку не открывал модалку
            toggleFavorite(movie);
            favBtn.classList.toggle("active");

            // Если мы на странице избранного и фильм только что убрали — обновляем список сразу
            if (targetId === "favorites-grid" && !isFavorite(movie.id)) {
                loadFavoritesPage();
            }
        });

        grid.appendChild(card);
    });
}

// ===== Логика модального окна =====

const modal = document.getElementById("movie-modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");
const modalOverlay = document.querySelector(".modal-overlay");

// Функция открытия модального окна с деталями фильма
function openModal(movie) {
    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
        : NO_POSTER_PLACEHOLDER;

    modalBody.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" class="modal-poster">
        <div class="modal-title-row">
            <h2>${movie.title}</h2>
            <button class="favorite-btn modal-favorite-btn ${isFavorite(movie.id) ? 'active' : ''}">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
        </div>
        <p class="modal-rating">⭐ ${movie.vote_average.toFixed(1)} — ${movie.release_date}</p>
        <p class="modal-overview">${movie.overview}</p>
    `;

    const modalFavBtn = modalBody.querySelector(".modal-favorite-btn");
    modalFavBtn.addEventListener("click", () => {
        toggleFavorite(movie);
        modalFavBtn.classList.toggle("active");
    });

    modal.classList.remove("hidden");
}


// Функция закрытия модального окна
function closeModal() {
    modal.classList.add("hidden");
}


// Закрытие по клику на крестик
if (modalClose) {
    modalClose.addEventListener("click", closeModal);
}

// Закрытие по клику на затемнённый фон
if (modalOverlay) {
    modalOverlay.addEventListener("click", closeModal);
}

// ===== Переключатель языка =====

const langButtons = document.querySelectorAll(".lang-btn");
// Достаем сохраненный язык из памяти или берем 'es' по умолчанию
let currentLang = localStorage.getItem("app_lang") || "es";

langButtons.forEach(button => {
    button.addEventListener("click", () => {
        const selectedLang = button.dataset.lang;
        currentLang = selectedLang;

        // Сохраняем выбор в память
        localStorage.setItem("app_lang", selectedLang);

        // Убираем "active" со всех кнопок, ставим только на нажатую
        langButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        applyTranslations(currentLang);
        if (document.getElementById("popular-grid")) {
            getPopularMovies(currentLang);
            getTopRatedMovies(currentLang);
            getUpcomingMovies(currentLang);
        } else {
            const currentQuery = document.getElementById("search-input")?.value.trim();
            if (currentQuery) {
                searchMovies(currentQuery, currentLang);
            } else {
                getPopularMovies(currentLang);
            }
        }
    });
});


// ===== Словарь переводов интерфейса =====

const translations = {
    es: {
        footer_text: "Datos proporcionados por TMDB",
        nav_home: "Inicio",
        nav_search: "Buscar",
        nav_favorites: "Favoritos",
        nav_about: "Acerca de",
        nav_login: "Iniciar sesión",
        nav_logout: "Cerrar sesión",
        section_popular: "Populares ahora",
        section_top_rated: "Mejor valoradas",
        section_upcoming: "Próximamente",
        section_favorites: "Mis favoritos",
        favorites_empty: "Aún no tienes películas favoritas.",
        favorites_login_required: "Inicia sesión para ver tus películas favoritas.",
        about_title: "Acerca de Palomita",
        about_text_1: "Palomita es un catálogo de películas y series creado como proyecto de portafolio, con el objetivo de practicar JavaScript, trabajo con el DOM y consumo de APIs externas.",
        about_text_2: "Todos los datos de películas, pósteres y sinopsis provienen de la API pública de TMDB (The Movie Database).",
        about_attribution: "Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.",
        auth_login_title: "Iniciar sesión",
        auth_register_title: "Crear cuenta",
        auth_login_btn: "Iniciar sesión",
        auth_register_btn: "Registrarse",
        auth_switch_to_register: "¿No tienes cuenta?",
        auth_switch_to_login: "¿Ya tienes cuenta?",
        auth_switch_link_register: "Regístrate",
        auth_switch_link_login: "Inicia sesión",
        auth_error_invalid_email: "El correo electrónico no es válido.",
        auth_error_wrong_password: "Contraseña incorrecta.",
        auth_error_user_not_found: "No existe una cuenta con ese correo.",
        auth_error_email_in_use: "Ya existe una cuenta con ese correo.",
        auth_error_weak_password: "La contraseña debe tener al menos 6 caracteres.",
        auth_error_generic: "Ha ocurrido un error. Inténtalo de nuevo."
    },
    en: {
        footer_text: "Data provided by TMDB",
        nav_home: "Home",
        nav_search: "Search",
        nav_favorites: "Favorites",
        nav_about: "About",
        nav_login: "Log in",
        nav_logout: "Log out",
        section_popular: "Popular now",
        section_top_rated: "Top rated",
        section_upcoming: "Coming soon",
        section_favorites: "My favorites",
        favorites_empty: "You don't have any favorite movies yet.",
        favorites_login_required: "Log in to see your favorite movies.",
        about_title: "About Palomita",
        about_text_1: "Palomita is a movie and TV show catalog built as a portfolio project, aimed at practicing JavaScript, DOM manipulation, and working with external APIs.",
        about_text_2: "All movie data, posters, and synopses come from the public TMDB (The Movie Database) API.",
        about_attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
        auth_login_title: "Log in",
        auth_register_title: "Create account",
        auth_login_btn: "Log in",
        auth_register_btn: "Sign up",
        auth_switch_to_register: "Don't have an account?",
        auth_switch_to_login: "Already have an account?",
        auth_switch_link_register: "Sign up",
        auth_switch_link_login: "Log in",
        auth_error_invalid_email: "That email address is invalid.",
        auth_error_wrong_password: "Incorrect password.",
        auth_error_user_not_found: "No account found with that email.",
        auth_error_email_in_use: "An account with that email already exists.",
        auth_error_weak_password: "Password must be at least 6 characters.",
        auth_error_generic: "Something went wrong. Please try again."
    },
    ru: {
        footer_text: "Данные предоставлены TMDB",
        nav_home: "Главная",
        nav_search: "Поиск",
        nav_favorites: "Избранное",
        nav_about: "О проекте",
        nav_login: "Войти",
        nav_logout: "Выйти",
        section_popular: "Популярное сейчас",
        section_top_rated: "Топ по рейтингу",
        section_upcoming: "Скоро в кино",
        section_favorites: "Моё избранное",
        favorites_empty: "Пока нет избранных фильмов.",
        favorites_login_required: "Войдите, чтобы увидеть избранные фильмы.",
        about_title: "О проекте Palomita",
        about_text_1: "Palomita — каталог фильмов и сериалов, созданный как портфолио-проект для практики JavaScript, работы с DOM и внешними API.",
        about_text_2: "Все данные о фильмах, постеры и описания предоставлены публичным API TMDB (The Movie Database).",
        about_attribution: "Этот продукт использует API TMDB, но не одобрен и не сертифицирован TMDB.",
        auth_login_title: "Вход",
        auth_register_title: "Создать аккаунт",
        auth_login_btn: "Войти",
        auth_register_btn: "Зарегистрироваться",
        auth_switch_to_register: "Нет аккаунта?",
        auth_switch_to_login: "Уже есть аккаунт?",
        auth_switch_link_register: "Зарегистрируйтесь",
        auth_switch_link_login: "Войдите",
        auth_error_invalid_email: "Некорректный email.",
        auth_error_wrong_password: "Неверный пароль.",
        auth_error_user_not_found: "Аккаунт с таким email не найден.",
        auth_error_email_in_use: "Аккаунт с таким email уже существует.",
        auth_error_weak_password: "Пароль должен содержать не менее 6 символов.",
        auth_error_generic: "Произошла ошибка. Попробуйте снова."
    }
};

// Функция применения перевода интерфейса
function applyTranslations(lang) {
    const elements = document.querySelectorAll("[data-i18n]");

    elements.forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = translations[lang][key];
    });

    // Меняем язык у самого HTML-документа (для доступности/SEO)
    document.documentElement.lang = lang;
}

// Применяем сохранённый язык к тексту
applyTranslations(currentLang);

// Делаем активной правильную кнопку (ES, EN или RU)
langButtons.forEach(btn => {
    if (btn.dataset.lang === currentLang) {
        btn.classList.add("active");
    } else {
        btn.classList.remove("active");
    }
});


// ===== Логика поиска =====

const searchInput = document.getElementById("search-input");
let searchTimeout;

if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);

        const query = searchInput.value.trim();

        searchTimeout = setTimeout(() => {
            if (query.length === 0) {
                getPopularMovies(currentLang);
            } else {
                searchMovies(query, currentLang);
            }
        }, 500);
    });
}

// Запускаем отрисовку избранного, если мы на странице favorites.html
loadFavoritesPage();

document.addEventListener("favoritesReady", () => {
    loadFavoritesPage();
});

// ===== ФИКС: подскролл к полю ввода при открытии клавиатуры на мобильном =====
// Проблема: на телефоне при тапе на Email/Пароль выезжает клавиатура и закрывает
// поле или кнопку "Войти", а браузер сам не всегда докручивает до нужного места.
document.querySelectorAll('#auth-form input').forEach(input => {
    input.addEventListener('focus', () => {
        setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // задержка, чтобы клавиатура успела открыться и вьюпорт пересчитался
    });
});

// ===== Показать/скрыть пароль =====

const togglePasswordBtn = document.getElementById("toggle-password");
const passwordInput = document.getElementById("auth-password");

if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
        const isVisible = passwordInput.type === "text";
        passwordInput.type = isVisible ? "password" : "text";
        togglePasswordBtn.classList.toggle("active", !isVisible);
    });
}

// ===== Маскот-попкорн (плавающий в углу экрана) =====

const mascotPopcorn = document.createElement('div');
mascotPopcorn.classList.add('mascot-popcorn');
mascotPopcorn.textContent = '🍿';
mascotPopcorn.draggable = false;
document.body.appendChild(mascotPopcorn);

// Четыре угла маршрута (в процентах от ширины/высоты экрана — как раньше в keyframes)
const MASCOT_WAYPOINTS = [
    { top: 85, left: 90 }, // низ-право (старт)
    { top: 10, left: 90 }, // верх-право
    { top: 10, left: 5 },  // верх-лево
    { top: 85, left: 5 },  // низ-лево
];

const MASCOT_PAUSE_MS = 5000; // 5 секунд стоит в углу
const MASCOT_MOVE_MS = 6000;  // 6 секунд едет между углами
const MASCOT_EDGE_MARGIN_PX = 10; // минимальный отступ от края экрана

let mascotWaypointIndex = 0;
let mascotMoveTimeout = null;

// Переводим точку маршрута (проценты от ширины/высоты экрана) в пиксели,
// но не даём попкорну вылезти за реальные границы экрана — учитываем
// его собственную ширину/высоту (она разная на мобильном и десктопе,
// см. font-size в css/style.css) и оставляем отступ по краям.
function getMascotPixelPosition(waypoint) {
    const w = mascotPopcorn.offsetWidth;
    const h = mascotPopcorn.offsetHeight;

    const rawLeft = (waypoint.left / 100) * window.innerWidth;
    const rawTop = (waypoint.top / 100) * window.innerHeight;

    const maxLeft = window.innerWidth - w - MASCOT_EDGE_MARGIN_PX;
    const maxTop = window.innerHeight - h - MASCOT_EDGE_MARGIN_PX;

    const left = Math.min(Math.max(rawLeft, MASCOT_EDGE_MARGIN_PX), Math.max(maxLeft, MASCOT_EDGE_MARGIN_PX));
    const top = Math.min(Math.max(rawTop, MASCOT_EDGE_MARGIN_PX), Math.max(maxTop, MASCOT_EDGE_MARGIN_PX));

    return { left, top };
}

// Ставим попкорн сразу в стартовую точку (без анимации, чтобы не дёрнулся при загрузке)
{
    const startPos = getMascotPixelPosition(MASCOT_WAYPOINTS[0]);
    mascotPopcorn.style.left = `${startPos.left}px`;
    mascotPopcorn.style.top = `${startPos.top}px`;
}

// Едем к следующей точке маршрута, потом стоим, потом снова едем — и так по кругу
function travelToNextWaypoint() {
    // Случайный угол, но не тот же самый, где попкорн уже стоит
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * MASCOT_WAYPOINTS.length);
    } while (nextIndex === mascotWaypointIndex);
    mascotWaypointIndex = nextIndex;
    const wp = MASCOT_WAYPOINTS[mascotWaypointIndex];
    const pos = getMascotPixelPosition(wp);

    mascotPopcorn.style.transition = `left ${MASCOT_MOVE_MS}ms linear, top ${MASCOT_MOVE_MS}ms linear`;
    mascotPopcorn.style.left = `${pos.left}px`;
    mascotPopcorn.style.top = `${pos.top}px`;

    mascotMoveTimeout = setTimeout(() => {
        mascotMoveTimeout = setTimeout(travelToNextWaypoint, MASCOT_PAUSE_MS);
    }, MASCOT_MOVE_MS);
}

// Стартуем маршрут после небольшой паузы
mascotMoveTimeout = setTimeout(travelToNextWaypoint, MASCOT_PAUSE_MS);

// ===== Перетаскивание маскота пальцем/мышкой =====

let isDraggingMascot = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

mascotPopcorn.style.touchAction = "none";

mascotPopcorn.addEventListener("pointerdown", (e) => {
    isDraggingMascot = true;
    mascotPopcorn.style.cursor = "grabbing";

    clearTimeout(mascotMoveTimeout); // останавливаем текущий переезд по маршруту

    const rect = mascotPopcorn.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    mascotPopcorn.style.transition = "none"; // чтобы палец двигал попкорн мгновенно, без плавности
    mascotPopcorn.style.left = `${rect.left}px`;
    mascotPopcorn.style.top = `${rect.top}px`;

    mascotPopcorn.setPointerCapture(e.pointerId);
});

mascotPopcorn.addEventListener("pointermove", (e) => {
    if (!isDraggingMascot) return;
    mascotPopcorn.style.left = `${e.clientX - dragOffsetX}px`;
    mascotPopcorn.style.top = `${e.clientY - dragOffsetY}px`;
});

mascotPopcorn.addEventListener("pointerup", () => {
    if (!isDraggingMascot) return;
    isDraggingMascot = false;
    mascotPopcorn.style.cursor = "grab";

    // Остаёмся там, где отпустили, и через паузу продолжаем маршрут дальше
    mascotMoveTimeout = setTimeout(travelToNextWaypoint, MASCOT_PAUSE_MS);
});

// ===== Навигация: клики по ссылкам меню (.main-nav a) =====
// Раньше здесь было 4 разных обработчика (дублировали друг друга) —
// объединено в 2: один для мыши/десктопа (click), один для тача/мобильного
// (touchstart, потому что на некоторых мобильных браузерах обычный click
// после touchstart срабатывает с задержкой или не срабатывает вовсе).
// Оба используют делегирование на document — работает даже если ссылки
// в меню изменятся динамически, не нужно вешать обработчик на каждую.

document.addEventListener('click', function(e) {
    const link = e.target.closest('.main-nav a');
    if (link && link.href) {
        e.preventDefault();
        window.location.href = link.href;
    }
});

document.addEventListener('touchstart', function(e) {
    const link = e.target.closest('.main-nav a');
    if (link && link.href) {
        e.preventDefault();
        window.location.href = link.href;
    }
}, { passive: false });