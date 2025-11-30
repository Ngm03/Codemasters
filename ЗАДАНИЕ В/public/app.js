let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

async function loadData(endpoint) {
    try {
        const response = await fetch(endpoint);
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

async function searchData(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        return await response.json();
    } catch (error) {
        console.error('Search error:', error);
        return null;
    }
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('ru-RU');
}

function openTelegram(username) {
    const cleanUsername = username.replace('@', '');
    window.open(`https://t.me/${cleanUsername}`, '_blank');
}

function openUrl(url) {
    window.open(url, '_blank');
}

// Theme & Language Logic
function setTheme(theme) {
    if (theme === 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    } else if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
}

function setLanguage(lang) {
    if (typeof applyLanguage === 'function') {
        applyLanguage(lang);
    }
    localStorage.setItem('language', lang);
}

// Initialize Settings
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    setTheme(savedTheme);

    const savedLang = localStorage.getItem('language') || 'ru';
    setLanguage(savedLang);
});
