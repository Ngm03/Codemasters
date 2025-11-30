// tg is already declared in app.js
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.expand();
}

let currentFilter = 'all';
let selectedType = 'ask';
let allPosts = [];

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();

    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    applyLanguage(lang);
});

async function loadPosts() {
    const feed = document.getElementById('marketFeed');
    feed.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch('/api/market');
        const posts = await response.json();
        allPosts = posts;
        renderPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
        feed.innerHTML = `<div class="error-message" data-i18n="error_loading">${translations[localStorage.getItem('language') || 'ru'].error_loading}</div>`;
    }
}

function renderPosts() {
    const feed = document.getElementById('marketFeed');
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const filteredPosts = currentFilter === 'all'
        ? allPosts
        : allPosts.filter(p => p.type === currentFilter);

    if (filteredPosts.length === 0) {
        feed.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div style="margin-bottom: 15px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary); opacity: 0.5;">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                </div>
                ${t.nothing_found}
            </div>
        `;
        return;
    }

    feed.innerHTML = filteredPosts.map(post => {
        const isAsk = post.type === 'ask';
        const tagClass = isAsk ? 'tag-ask' : 'tag-offer';
        const tagName = isAsk ? t.tag_ask : t.tag_offer;
        const timeAgo = getTimeAgo(new Date(post.created_at));

        // Check if current user is owner (simple check via telegram id if available in localstorage, 
        // but for now we rely on server check for delete action)
        const deleteButton = `
            <button class="delete-btn" onclick="deletePost(${post.id})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                </svg>
            </button>
            `;

        return `
            <div class="market-card">
                <div class="card-header">
                    <img src="${post.avatar_url || 'https://i.pravatar.cc/150'}" class="user-avatar" alt="${post.first_name}">
                    <div class="user-info">
                        <div class="user-name">${post.first_name} ${post.last_name || ''}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                    <div class="post-tag ${tagClass}">${tagName}</div>
                </div>
                <div class="card-content">${escapeHtml(post.content)}</div>
                <div class="card-actions">
                    ${post.username ? `
                        <button class="contact-btn" onclick="window.open('https://t.me/${post.username}', '_blank')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
                            </svg>
                            ${t.contact}
                        </button>
                    ` : ''}
                    ${deleteButton} 
                </div>
            </div>
            `;
    }).join('');
}

function filterPosts(type) {
    currentFilter = type;
    document.querySelectorAll('.market-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('onclick').includes(`'${type}'`)) {
            tab.classList.add('active');
        }
    });
    renderPosts();
}

function openPostModal() {
    document.getElementById('postModal').classList.add('active');
}

function closePostModal() {
    document.getElementById('postModal').classList.remove('active');
}

function selectType(type) {
    selectedType = type;
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('selected'));
    document.getElementById(type === 'ask' ? 'typeAsk' : 'typeOffer').classList.add('selected');
}

async function submitPost() {
    const content = document.getElementById('postContent').value.trim();
    if (!content) return;

    const btn = document.querySelector('.submit-post-btn');
    const originalText = btn.innerText;
    btn.innerText = '...';
    btn.disabled = true;

    try {
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!user) {
            safeShowAlert('Please open in Telegram');
            return;
        }

        const response = await fetch('/api/market', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: user.id,
                type: selectedType,
                content: content
            })
        });

        if (response.ok) {
            closePostModal();
            document.getElementById('postContent').value = '';
            loadPosts();
            safeShowPopup('Post published!');
        } else {
            safeShowAlert('Error publishing post');
        }
    } catch (error) {
        console.error('Error:', error);
        safeShowAlert('Network error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Helper functions for Telegram WebApp methods with fallback
function safeShowAlert(message) {
    if (window.Telegram?.WebApp?.showAlert) {
        try {
            window.Telegram.WebApp.showAlert(message);
        } catch (e) {
            console.warn('Telegram showAlert failed, falling back to alert', e);
            alert(message);
        }
    } else {
        alert(message);
    }
}

function safeShowPopup(message) {
    if (window.Telegram?.WebApp?.showPopup) {
        try {
            window.Telegram.WebApp.showPopup({ message: message });
        } catch (e) {
            console.warn('Telegram showPopup failed, falling back to alert', e);
            alert(message);
        }
    } else {
        alert(message);
    }
}

async function deletePost(id) {
    if (!confirm('Delete this post?')) return;

    try {
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!user) return;

        const response = await fetch(`/api/market/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: user.id })
        });

        if (response.ok) {
            loadPosts();
        } else {
            safeShowAlert('You can only delete your own posts');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
