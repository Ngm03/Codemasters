let currentTab = 'startups';
let userId = 1;

async function init() {
    await syncTelegramUser();
    await loadFavorites(currentTab);
}

async function syncTelegramUser() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;

        if (user) {
            try {
                const response = await fetch('/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegram_id: user.id,
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        username: user.username || '',
                        photo_url: user.photo_url || ''
                    })
                });

                const data = await response.json();
                if (data.userId) {
                    userId = data.userId;
                }
            } catch (error) {
                console.error('❌ Error syncing user:', error);
            }
        }
    }
}

function switchTab(tab) {
    currentTab = tab;

    // Update UI
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        // Simple check based on onclick attribute since text content might change with language
        if (t.getAttribute('onclick').includes(`'${tab}'`)) {
            t.classList.add('active');
        }
    });

    loadFavorites(tab);
}

async function loadFavorites(type) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const container = document.getElementById('favoritesContent');
    container.innerHTML = `<div class="loading">${t.loading}</div>`;

    try {
        // Sync FavoritesUtils state first so toggleFavorite works correctly
        if (window.FavoritesUtils) {
            await window.FavoritesUtils.fetchFavorites(type);
        }

        const response = await fetch(`/api/favorites/${type}?userId=${userId}`);
        const favorites = await response.json();

        if (favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2z"></path>
                    </svg>
                    <h3 class="empty-state-title">${t.no_favorites_title}</h3>
                    <p class="empty-state-desc">${t.no_favorites_desc}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = favorites.map(item => createFavoriteCard(item, type)).join('');

    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = `<div class="error">${t.error_loading_data}</div>`;
    }
}

function createFavoriteCard(item, type) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const image = item.image_url || item.logo_url || item.thumbnail || 'https://via.placeholder.com/80';
    const title = item.title || item.name || item.role;
    const meta = getMetaInfo(item, type, t);
    // Ensure ID is quoted for string IDs
    const idStr = String(item.id);

    return `
        <div class="favorite-card" onclick="openDetail('${type}', '${idStr}')" style="position: relative;">
            <img src="${image}" alt="${title}" class="card-image" onerror="this.src='https://via.placeholder.com/80'">
            <div class="card-content">
                <div class="card-title">${title}</div>
                <div class="card-meta">${meta}</div>
            </div>
            <button class="remove-favorite-btn" onclick="event.stopPropagation(); removeFromFavorites('${type}', '${idStr}', this)" style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="color: #ef4444;">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
    `;
}

async function removeFromFavorites(type, itemId, btn) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    if (confirm(t.remove_confirm)) {
        await FavoritesUtils.toggleFavorite(type, itemId, btn);
        // Reload current tab to refresh list
        loadFavorites(currentTab);
    }
}

function getMetaInfo(item, type, t) {
    switch (type) {
        case 'startups': return item.category || t.startup_default;
        case 'events': return item.date || new Date(item.date).toLocaleDateString() || t.event_default;
        case 'teams': return `${item.members || 0} ${t.members_count}`;
        case 'vacancies': return item.company || t.company_default;
        case 'news': return new Date(item.created_at).toLocaleDateString();
        default: return '';
    }
}

function openDetail(type, id) {
    switch (type) {
        case 'news':
            window.location.href = `news-detail.html?id=${id}`;
            break;
        case 'startups':
            // Startups don't have detail page yet, maybe just alert or do nothing
            // window.location.href = `startup-detail.html?id=${id}`;
            break;
        case 'events':
            window.location.href = `event-detail.html?id=${id}`;
            break;
        case 'teams':
            window.location.href = `team-detail.html?id=${id}`;
            break;
        case 'vacancies':
            // Vacancies don't have detail page yet
            break;
        default:
            console.log('Open detail:', type, id);
    }
}

init();
