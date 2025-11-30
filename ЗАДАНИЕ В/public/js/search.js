document.addEventListener('DOMContentLoaded', async () => {
    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    if (typeof applyLanguage === 'function') {
        applyLanguage(lang);
    }
    const t = translations[lang];

    const searchInput = document.getElementById('searchInput');
    const resultsList = document.getElementById('resultsList');
    const tg = window.Telegram.WebApp;

    tg.expand();

    function applyTheme() {
        if (tg.themeParams) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
            document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
            document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
            document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
            document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color);
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color);
        }
    }
    applyTheme();

    let ecosystemData = [];

    try {
        if (window.apiService) {
            const data = await window.apiService.getAllData();
            ecosystemData = [
                ...(data.startups || []).map(i => ({ ...i, type: 'Startup' })),
                ...(data.teams || []).map(i => ({ ...i, type: 'Team' })),
                ...(data.specialists || []).map(i => ({ ...i, type: 'Specialist' })),
                ...(data.events || []).map(i => ({ ...i, type: 'Event' }))
            ];
        } else {
            console.error('ApiService not found');
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }

    function performSearch(query) {
        if (!query) {
            resultsList.innerHTML = `<div class="no-results">${t.start_typing || 'Начните вводить запрос для поиска'}</div>`;
            return;
        }

        const lowerQuery = query.toLowerCase();
        const results = ecosystemData.filter(item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.description.toLowerCase().includes(lowerQuery)
        );

        if (results.length === 0) {
            resultsList.innerHTML = `<div class="no-results">${t.nothing_found || 'Ничего не найдено'}</div>`;
            return;
        }

        resultsList.innerHTML = results.map(item => `
            <div class="result-card">
                <div class="result-title">${item.title}</div>
                <div class="result-desc">${item.description}</div>
            </div>
        `).join('');
    }

    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value.trim());
    });
});
