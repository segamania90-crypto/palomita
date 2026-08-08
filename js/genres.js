// ===== Логика фильтра по жанрам =====

let allGenres = [];       // сюда сохраним список жанров с TMDB
let activeGenreId = null; // id выбранного жанра (null = жанр не выбран)

// Функция получения списка жанров с TMDB
async function getGenres(lang = "es") {
    const tmdbLang = TMDB_LANG_MAP[lang];
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=${tmdbLang}`;
    const response = await fetch(url);
    const data = await response.json();
    allGenres = data.genres;
    renderGenreButtons();
}

// Функция отрисовки кнопок жанров на странице
function renderGenreButtons() {
    const container = document.getElementById("genre-filters");
    if (!container) return; // на случай если мы не на странице search.html

    container.innerHTML = "";

    allGenres.forEach(genre => {
        const btn = document.createElement("button");
        btn.className = "genre-btn";
        btn.textContent = genre.name;
        btn.dataset.genreId = genre.id;

        if (genre.id === activeGenreId) {
            btn.classList.add("active");
        }

        btn.addEventListener("click", () => {
            // Если кликнули на уже активный жанр — снимаем фильтр
            if (activeGenreId === genre.id) {
                activeGenreId = null;
                getPopularMovies(currentLang);
            } else {
                activeGenreId = genre.id;
                getMoviesByGenre(genre.id, currentLang);
            }
            renderGenreButtons(); // перерисовываем кнопки, чтобы обновить "active"
        });

        container.appendChild(btn);
    });
}

// Функция получения фильмов по жанру
async function getMoviesByGenre(genreId, lang = "es") {
    const tmdbLang = TMDB_LANG_MAP[lang];
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=${tmdbLang}&with_genres=${genreId}&include_adult=false`;
    const response = await fetch(url);
    const data = await response.json();
    renderMovies(data.results);
}

// Запускаем при загрузке страницы (только если есть контейнер для жанров)
if (document.getElementById("genre-filters")) {
    getGenres(currentLang);
}