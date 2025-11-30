window.FavoritesUtils = {
    userId: null,
    favorites: {
        startups: [],
        events: [],
        teams: [],
        vacancies: []
    },

    async init() {
        if (window.Telegram && window.Telegram.WebApp) {
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            if (user) {
                await this.syncUser(user);
            }
        }
        // Fallback or dev mode
        if (!this.userId) this.userId = 1;
    },

    async syncUser(user) {
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
                this.userId = data.userId;
            }
        } catch (error) {
            console.error('Error syncing user:', error);
        }
    },

    async fetchFavorites(type) {
        if (!this.userId) await this.init();
        try {
            const response = await fetch(`/api/favorites/${type}?userId=${this.userId}`);
            const data = await response.json();
            this.favorites[type] = data.map(item => String(item.id));
            return this.favorites[type];
        } catch (error) {
            console.error(`Error fetching ${type} favorites:`, error);
            return [];
        }
    },

    isFavorited(type, itemId) {
        return this.favorites[type]?.includes(String(itemId));
    },

    async toggleFavorite(type, itemId, btnElement) {
        if (!this.userId) await this.init();

        const idStr = String(itemId);
        const isFav = this.isFavorited(type, idStr);

        // Special handling for news
        if (type === 'news') {
            try {
                const response = await fetch(`/api/news/${itemId}/interact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: this.userId,
                        type: 'favorite'
                    })
                });

                if (response.ok) {
                    const svg = btnElement.querySelector('svg');
                    if (isFav) {
                        this.favorites[type] = this.favorites[type].filter(id => id !== idStr);
                        btnElement.classList.remove('active');
                        svg.style.fill = 'none';
                        svg.style.color = '#9ca3af';
                    } else {
                        this.favorites[type].push(idStr);
                        btnElement.classList.add('active');
                        svg.style.fill = 'currentColor';
                        svg.style.color = '#f59e0b';
                    }
                }
            } catch (error) {
                console.error('Error toggling news favorite:', error);
            }
            return;
        }

        // Handle singular/plural mapping
        let itemType = type;
        if (type === 'startups') itemType = 'startup';
        if (type === 'events') itemType = 'event';
        if (type === 'teams') itemType = 'team';
        if (type === 'vacancies') itemType = 'vacancy';

        const method = isFav ? 'DELETE' : 'POST';

        try {
            const response = await fetch('/api/favorites', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    itemType: itemType,
                    itemId: idStr
                })
            });

            if (response.ok) {
                const svg = btnElement.querySelector('svg');
                if (isFav) {
                    this.favorites[type] = this.favorites[type].filter(id => id !== idStr);
                    btnElement.classList.remove('active');
                    svg.style.fill = 'none';
                    svg.style.color = '#9ca3af';
                } else {
                    this.favorites[type].push(idStr);
                    btnElement.classList.add('active');
                    svg.style.fill = 'currentColor';
                    svg.style.color = '#f59e0b';
                }
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    },

    getButtonHtml(type, itemId) {
        const isFav = this.isFavorited(type, itemId);
        return `
            <button class="favorite-btn ${isFav ? 'active' : ''}" 
                    onclick="event.stopPropagation(); FavoritesUtils.toggleFavorite('${type}', '${itemId}', this)"
                    style="position: absolute; top: 10px; right: 10px; background: white; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; z-index: 10;">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="${isFav ? 'currentColor' : 'none'}" style="color: ${isFav ? '#f59e0b' : '#9ca3af'}; transition: all 0.2s;">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2z"></path>
                </svg>
            </button>
        `;
    }
};
