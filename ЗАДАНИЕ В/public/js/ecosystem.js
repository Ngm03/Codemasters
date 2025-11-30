document.addEventListener('DOMContentLoaded', async () => {
    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    if (typeof applyLanguage === 'function') {
        applyLanguage(lang);
    }
    const t = translations[lang];

    const grid = document.getElementById('ecosystemGrid');
    const tg = window.Telegram.WebApp;

    tg.expand();
    tg.enableClosingConfirmation();

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

    try {
        const response = await fetch('/api/ecosystem');
        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();

        if (data.length === 0) {
            grid.innerHTML = `<div class="no-results">${t.no_services || 'Нет доступных сервисов.'}</div>`;
            return;
        }

        grid.innerHTML = data.map(item => {
            const emojiMatch = item.title.match(/^(\p{Emoji})/u);
            const icon = emojiMatch ? emojiMatch[1] : '🌱';
            const title = item.title.replace(/^(\p{Emoji})\s*/u, '');

            return `
                <div class="service-card">
                    <div class="service-icon">${icon}</div>
                    <div class="service-content">
                        <div class="service-title">${title}</div>
                        <div class="service-desc">${item.description}</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading ecosystem:', error);
        grid.innerHTML = `<div class="no-results" style="color: red;">${t.error_loading_data || 'Ошибка загрузки данных.'}</div>`;
    }
});
