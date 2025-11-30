let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
const indicatorsContainer = document.getElementById('carouselIndicators');
let userId = 1;
let currentView = 'all';
let categories = [];
let subscriptions = [];

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
                    // Save admin status to localStorage
                    localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');

                    // Trigger admin check if nav is already loaded
                    if (typeof checkAdminStatus === 'function') {
                        checkAdminStatus();
                    }
                }
            } catch (error) {
                console.error(error);
            }
        }
    }
}

slides.forEach((_, index) => {
    const indicator = document.createElement('div');
    indicator.classList.add('carousel-indicator');
    if (index === 0) indicator.classList.add('active');
    indicator.addEventListener('click', () => goToSlide(index));
    indicatorsContainer.appendChild(indicator);
});

function goToSlide(index) {
    slides[currentSlide].classList.remove('active');
    document.querySelectorAll('.carousel-indicator')[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    document.querySelectorAll('.carousel-indicator')[currentSlide].classList.add('active');
}

function nextSlide() {
    goToSlide((currentSlide + 1) % slides.length);
}

setInterval(nextSlide, 5000);

async function loadCategories() {
    const response = await fetch('/api/news/categories');
    categories = await response.json();
}

async function loadSubscriptions() {
    const response = await fetch(`/api/subscriptions?userId=${userId}`);
    subscriptions = await response.json();
}

async function loadNews() {
    const subscribed = currentView === 'subscribed';
    const response = await fetch(`/api/news?userId=${userId}&subscribed=${subscribed}`);
    const news = await response.json();
    renderNews(news);
}

function renderNews(newsArray) {
    const newsFeed = document.getElementById('newsFeed');
    newsFeed.innerHTML = '';

    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    if (newsArray.length === 0) {
        newsFeed.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="80" height="80" stroke="currentColor" stroke-width="2" fill="none">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <h3>${t.no_news}</h3>
                <p>${currentView === 'subscribed' ? t.subscribe_hint : t.news_empty}</p>
            </div>
        `;
        return;
    }

    newsArray.forEach(news => {
        const newsCard = document.createElement('div');
        newsCard.classList.add('news-card');

        const timeAgo = getTimeAgo(new Date(news.created_at));
        const isLiked = news.user_reaction === 'like';
        const isDisliked = news.user_reaction === 'dislike';
        const isFavorited = news.is_favorited > 0;

        let actionsHtml = '';
        if (news.is_external) {
            actionsHtml = `
                <div class="action-group">
                    <button class="action-btn" onclick="window.open('${news.external_url}', '_blank')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        <span>${t.read}</span>
                    </button>
                </div>
                <div class="action-group">
                    <button class="action-btn" onclick="shareNews(${news.id}, '${news.external_url || ''}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="action-group">
                    <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleInteraction(${news.id}, 'like', this)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        <span>${news.likes}</span>
                    </button>
                    <button class="action-btn ${isDisliked ? 'disliked' : ''}" onclick="toggleInteraction(${news.id}, 'dislike', this)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                        </svg>
                        <span>${news.dislikes}</span>
                    </button>
                    <button class="action-btn" onclick="openComments(${news.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${news.comments_count}</span>
                    </button>
                </div>
                <div class="action-group">
                    <button class="action-btn ${isFavorited ? 'favorited' : ''}" onclick="toggleInteraction(${news.id}, 'favorite', this)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </button>
                    <button class="action-btn" onclick="shareNews(${news.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                </div>
            `;
        }

        newsCard.innerHTML = `
            <div class="news-header">
                <img src="${news.avatar_url || 'https://i.pravatar.cc/150?img=1'}" alt="${news.first_name}" class="news-avatar">
                <div class="news-author-info">
                    <div class="news-author-name">${news.first_name} ${news.last_name}</div>
                    <div class="news-time">${timeAgo}</div>
                </div>
            </div>
            <img src="${news.image_url}" alt="${news.title}" class="news-image" onclick="${news.is_external ? `window.open('${news.external_url}', '_blank')` : `openNewsDetail(${news.id})`}" style="cursor: pointer;">
            <div class="news-title" onclick="${news.is_external ? `window.open('${news.external_url}', '_blank')` : `openNewsDetail(${news.id})`}" style="cursor: pointer;">${news.title}</div>
            <div class="news-actions">
                ${actionsHtml}
            </div>
        `;
        newsFeed.appendChild(newsCard);
    });
}

function getTimeAgo(date) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return t.just_now;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} ${getNoun(minutes, t.time_m[0], t.time_m[1], t.time_m[2])} ${t.time_ago_suffix}`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${getNoun(hours, t.time_h[0], t.time_h[1], t.time_h[2])} ${t.time_ago_suffix}`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ${getNoun(days, t.time_d[0], t.time_d[1], t.time_d[2])} ${t.time_ago_suffix}`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ${getNoun(months, t.time_mo[0], t.time_mo[1], t.time_mo[2])} ${t.time_ago_suffix}`;

    const years = Math.floor(months / 12);
    return `${years} ${getNoun(years, t.time_y[0], t.time_y[1], t.time_y[2])} ${t.time_ago_suffix}`;
}

function getNoun(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
}

async function toggleInteraction(newsId, type, button) {
    const response = await fetch(`/api/news/${newsId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type })
    });

    const result = await response.json();

    if (type === 'like' || type === 'dislike') {
        const likeBtn = button.parentElement.children[0];
        const dislikeBtn = button.parentElement.children[1];
        const likeCountSpan = likeBtn.querySelector('span');
        const dislikeCountSpan = dislikeBtn.querySelector('span');

        let likes = parseInt(likeCountSpan.textContent) || 0;
        let dislikes = parseInt(dislikeCountSpan.textContent) || 0;

        if (type === 'like') {
            if (likeBtn.classList.contains('liked')) {
                // Removing like
                likeBtn.classList.remove('liked');
                likes--;
            } else {
                // Adding like
                likeBtn.classList.add('liked');
                likes++;
                if (dislikeBtn.classList.contains('disliked')) {
                    // Removing dislike if present
                    dislikeBtn.classList.remove('disliked');
                    dislikes--;
                }
            }
        } else {
            if (dislikeBtn.classList.contains('disliked')) {
                // Removing dislike
                dislikeBtn.classList.remove('disliked');
                dislikes--;
            } else {
                // Adding dislike
                dislikeBtn.classList.add('disliked');
                dislikes++;
                if (likeBtn.classList.contains('liked')) {
                    // Removing like if present
                    likeBtn.classList.remove('liked');
                    likes--;
                }
            }
        }

        likeCountSpan.textContent = likes;
        dislikeCountSpan.textContent = dislikes;

    } else if (type === 'favorite') {
        button.classList.toggle('favorited');
    }
}

function openNewsDetail(newsId) {
    fetch(`/api/news/${newsId}/view`, { method: 'POST' });
    window.location.href = `news-detail.html?id=${newsId}`;
}

function openComments(newsId) {
    window.location.href = `news-detail.html?id=${newsId}#comments`;
}

function shareNews(newsId, externalUrl) {
    const url = externalUrl ? externalUrl : `${window.location.origin}/news-detail.html?id=${newsId}`;
    showShareModal(url);
}

function showShareModal(url) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const modal = document.createElement('div');
    modal.className = 'subscriptions-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>${t.share_news}</h3>
                <button class="close-btn" onclick="this.closest('.subscriptions-modal').remove()">&times;</button>
            </div>
            <div class="share-input-container">
                <input type="text" class="share-input" value="${url}" readonly>
                <button class="copy-btn" onclick="copyToClipboard('${url}', this)">${t.copy}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function copyToClipboard(text, button) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = t.copied;
        button.classList.add('copied');

        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

document.querySelector('.subscriptions-btn').addEventListener('click', async () => {
    await loadCategories();
    await loadSubscriptions();
    showSubscriptionsModal();
});

document.querySelector('.filter-btn').addEventListener('click', () => {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    currentView = currentView === 'all' ? 'subscribed' : 'all';
    document.querySelector('.subscriptions-btn').textContent = currentView === 'subscribed' ? t.all_news : t.my_subscriptions;
    loadNews();
});

function showSubscriptionsModal() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const modal = document.createElement('div');
    modal.className = 'subscriptions-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>${t.subscriptions_title}</h3>
                <button class="close-btn" onclick="this.closest('.subscriptions-modal').remove()">&times;</button>
            </div>
            <div class="categories-list">
                ${categories.map(cat => {
        const isSubscribed = subscriptions.some(s => s.id === cat.id);
        return `
                        <div class="category-item">
                            <div>
                                <div class="category-name">${cat.name}</div>
                                <div class="category-desc">${cat.description}</div>
                            </div>
                            <button class="subscribe-btn ${isSubscribed ? 'subscribed' : ''}" 
                                    onclick="toggleSubscription(${cat.id}, this)">
                                ${isSubscribed ? t.unsubscribe : t.subscribe}
                            </button>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function toggleSubscription(categoryId, button) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const isSubscribed = button.classList.contains('subscribed');

    if (isSubscribed) {
        await fetch(`/api/subscriptions/${categoryId}?userId=${userId}`, { method: 'DELETE' });
        button.classList.remove('subscribed');
        button.textContent = t.subscribe;
    } else {
        await fetch('/api/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, categoryId })
        });
        button.classList.add('subscribed');
        button.textContent = t.unsubscribe;
    }

    await loadSubscriptions();
}

async function init() {
    await syncTelegramUser();
    await loadNews();
}

init();
