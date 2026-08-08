// Функция получения случайного номера страницы (от 1 до maxPage)
function getRandomPage(maxPage = 10) {
    return Math.floor(Math.random() * maxPage) + 1;
}

// Наш ключ TMDB API
const API_KEY = "ad5299716219d384bf23e8b6597e2244";
const BASE_URL = "https://api.themoviedb.org/3";

// Соответствие наших кодов языка (es/en/ru) кодам TMDB (es-ES/en-US/ru-RU)
const TMDB_LANG_MAP = {
    es: "es-ES",
    en: "en-US",
    ru: "ru-RU"
};

// Тексты сообщений об ошибках на всех трёх языках
const ERROR_MESSAGES = {
    es: {
        load_failed: "No se pudieron cargar las películas. Comprueba tu conexión.",
        load_failed_short: "No se pudieron cargar las películas.",
        no_results: "No se encontraron resultados.",
        connection_error: "Error de conexión. Inténtalo de nuevo."
    },
    en: {
        load_failed: "Couldn't load movies. Check your connection.",
        load_failed_short: "Couldn't load movies.",
        no_results: "No results found.",
        connection_error: "Connection error. Please try again."
    },
    ru: {
        load_failed: "Не удалось загрузить фильмы. Проверьте подключение.",
        load_failed_short: "Не удалось загрузить фильмы.",
        no_results: "Ничего не найдено.",
        connection_error: "Ошибка соединения. Попробуйте снова."
    }
};

async function getPopularMovies(lang = "es") {
    const tmdbLang = TMDB_LANG_MAP[lang];
    const randomPage = getRandomPage(20);

    const targetId = document.getElementById("popular-grid") ? "popular-grid" : "movies-grid";
    showSkeletonCards(targetId, targetId === "popular-grid" ? 12 : 24);

    try {
        const url1 = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=${tmdbLang}&page=${randomPage}&include_adult=false`;
        const url2 = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=${tmdbLang}&page=${randomPage + 1}&include_adult=false`;
        const [response1, response2] = await Promise.all([
            fetch(url1),
            fetch(url2)
        ]);

        if (!response1.ok || !response2.ok) {
            throw new Error("API response not ok");
        }

        const data1 = await response1.json();
        const data2 = await response2.json();

        const combinedMovies = [...data1.results, ...data2.results.slice(0, 4)];
        renderMovies(combinedMovies, targetId);
    } catch (error) {
        console.error("Error fetching popular movies:", error);
        showErrorMessage(targetId, ERROR_MESSAGES[lang].load_failed, true);
    }
}

// Функция получения топ фильмов по рейтингу
async function getTopRatedMovies(lang = "es") {
    const tmdbLang = TMDB_LANG_MAP[lang];
    const randomPage = getRandomPage(20);

    showSkeletonCards("top-rated-grid", 6);

    try {
        const url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=${tmdbLang}&page=${randomPage}&include_adult=false`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("API response not ok");
        }

        const data = await response.json();
        renderMovies(data.results.slice(0, 6), "top-rated-grid");
    } catch (error) {
        console.error("Error fetching top rated movies:", error);
        showErrorMessage("top-rated-grid", ERROR_MESSAGES[lang].load_failed_short, true);
    }
}

// Функция получения фильмов, которые скоро выйдут
async function getUpcomingMovies(lang = "es") {
    const tmdbLang = TMDB_LANG_MAP[lang];
    const randomPage = getRandomPage(5);

    showSkeletonCards("upcoming-grid", 6);

    try {
        const url = `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=${tmdbLang}&page=${randomPage}&include_adult=false`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("API response not ok");
        }

        const data = await response.json();
        renderMovies(data.results.slice(0, 6), "upcoming-grid");
    } catch (error) {
        console.error("Error fetching upcoming movies:", error);
        showErrorMessage("upcoming-grid", ERROR_MESSAGES[lang].load_failed_short, true);
    }
}

// Вызываем функцию при первой загрузке страницы (испанский по умолчанию)
getPopularMovies("es");
getTopRatedMovies("es");
getUpcomingMovies("es");

// Функция для поиска фильмов по названию
async function searchMovies(query, lang = "es") {
    const tmdbLang = TMDB_LANG_MAP[lang];

    showSkeletonCards("movies-grid", 12);

    try {
        const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=${tmdbLang}&query=${encodeURIComponent(query)}&include_adult=false`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("API response not ok");
        }

        const data = await response.json();

        if (data.results.length === 0) {
    showErrorMessage("movies-grid", ERROR_MESSAGES[lang].no_results);
} else {
    renderMovies(data.results);
}
} catch (error) {
    console.error("Error searching movies:", error);
    showErrorMessage("movies-grid", ERROR_MESSAGES[lang].connection_error, true);
}
}