let currentTab = 'startups';
let adminTelegramId = null;
let pendingData = {
    startups: [],
    events: [],
    teams: [],
    vacancies: [],
    news: []
};
let usersData = [];

async function init() {
    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    if (typeof applyLanguage === 'function') {
        applyLanguage(lang);
    }
    const t = translations[lang];

    try {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            if (user && user.id) {
                adminTelegramId = String(user.id);
                localStorage.setItem('adminTelegramId', adminTelegramId);
            }
        }

        if (!adminTelegramId) {
            const storedId = localStorage.getItem('adminTelegramId');
            if (storedId) {
                adminTelegramId = storedId;
            }
        }

        if (!adminTelegramId) {
            const manualId = prompt(t.enter_telegram_id || 'Введите ваш Telegram ID:');
            if (manualId) {
                adminTelegramId = manualId.trim();
                localStorage.setItem('adminTelegramId', adminTelegramId);
            } else {
                alert(t.error_telegram_id || 'Ошибка: не удалось получить Telegram ID');
                window.location.href = 'index.html';
                return;
            }
        }

        console.log('Admin ID:', adminTelegramId);
        const response = await fetch(`/api/admin/check-telegram/${adminTelegramId}`);
        const data = await response.json();

        if (!data.isAdmin) {
            alert(t.no_admin_rights || 'У вас нет прав администратора');
            window.location.href = 'index.html';
            return;
        }

        await loadPendingContent();
        renderContent();
    } catch (error) {
        console.error('Init error:', error);
        alert((t.init_error || 'Ошибка инициализации: ') + error.message);
        window.location.href = 'index.html';
    }
}

async function loadPendingContent() {
    try {
        const response = await fetch('/api/admin/pending');
        const data = await response.json();
        pendingData = data;
    } catch (error) {
        console.error('Error loading pending content:', error);
    }
}

function switchTab(event, tab) {
    currentTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.remove('active');
    });
    event.target.classList.add('active');
    renderContent();
}

function renderContent() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];
    const container = document.getElementById('content');

    if (currentTab === 'users') {
        loadUsers();
        return;
    }

    const items = pendingData[currentTab] || [];

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>${t.no_pending_items || '✓ Нет ожидающих модерации элементов'}</h3>
                <p>${t.all_items_processed || 'Все элементы обработаны'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => createItemCard(item, t)).join('');
}

function createItemCard(item, t) {
    const title = item.name || item.title || t.untitled || 'Без названия';
    const desc = item.description || '';
    const author = `${item.first_name || ''} ${item.last_name || ''}`.trim() || t.unknown || 'Неизвестно';
    const authorInitials = ((item.first_name?.[0] || '') + (item.last_name?.[0] || '')).toUpperCase();

    let meta = '';
    if (currentTab === 'startups') meta = `${item.category || ''} • ${item.stage || ''}`;
    if (currentTab === 'events') meta = `${new Date(item.event_date).toLocaleDateString('ru-RU')} • ${item.location || ''}`;
    if (currentTab === 'teams') meta = item.location || '';
    if (currentTab === 'vacancies') meta = `${item.employer || ''} • ${item.salary || ''}`;
    if (currentTab === 'news') meta = `Категория: ${item.category_id || ''}`;

    const type = currentTab === 'startups' ? 'startup' :
        currentTab === 'events' ? 'event' :
            currentTab === 'teams' ? 'team' :
                currentTab === 'vacancies' ? 'vacancy' : 'news';

    // Get content image/logo
    let contentImage = '';
    if (currentTab === 'startups' && item.logo_url) {
        contentImage = `<div class="content-image"><img src="${item.logo_url}" alt="${title}"></div>`;
    } else if (currentTab === 'events' && item.image_url) {
        contentImage = `<div class="content-image"><img src="${item.image_url}" alt="${title}"></div>`;
    } else if (currentTab === 'teams' && item.logo_url) {
        contentImage = `<div class="content-image"><img src="${item.logo_url}" alt="${title}"></div>`;
    } else if (currentTab === 'news' && item.image_url) {
        contentImage = `<div class="content-image"><img src="${item.image_url}" alt="${title}"></div>`;
    }

    return `
        <div class="admin-card">
            <div class="item-header">
                <div class="item-title">${title}</div>
                <div class="item-author">
                    <div class="author-avatar">
                        ${item.avatar_url ?
            `<img src="${item.avatar_url}" alt="${author}">` :
            authorInitials || '?'
        }
                    </div>
                    <span>👤 ${author}</span>
                </div>
            </div>
            ${meta ? `<div class="item-meta">${meta}</div>` : ''}
            ${contentImage}
            <div class="item-content">${desc.substring(0, 150)}${desc.length > 150 ? '...' : ''}</div>
            <div class="admin-actions">
                <button class="admin-btn btn-approve" onclick="approveItem('${type}', ${item.id})">
                    ${t.btn_approve || '✓ Одобрить'}
                </button>
                <button class="admin-btn btn-reject" onclick="rejectItem('${type}', ${item.id})">
                    ${t.btn_reject || '✕ Отклонить'}
                </button>
            </div>
        </div>
    `;
}

async function approveItem(type, id) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    if (!confirm(t.confirm_approve || 'Одобрить этот элемент?')) return;

    try {
        const response = await fetch('/api/admin/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id })
        });

        if (response.ok) {
            await loadPendingContent();
            renderContent();
            alert(t.item_approved || '✓ Элемент одобрен');
        } else {
            alert(t.approve_error || 'Ошибка при одобрении');
        }
    } catch (error) {
        console.error('Error approving:', error);
        alert(t.approve_error || 'Ошибка при одобрении');
    }
}

async function rejectItem(type, id) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    if (!confirm(t.confirm_reject || 'Отклонить и удалить этот элемент?')) return;

    try {
        const response = await fetch('/api/admin/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id })
        });

        if (response.ok) {
            await loadPendingContent();
            renderContent();
            alert(t.item_rejected || '✓ Элемент отклонен');
        } else {
            alert(t.reject_error || 'Ошибка при отклонении');
        }
    } catch (error) {
        console.error('Error rejecting:', error);
        alert(t.reject_error || 'Ошибка при отклонении');
    }
}

async function loadUsers() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];
    const container = document.getElementById('content');
    container.innerHTML = `<div class="loading-state"><h3>${t.loading_users || '⏳ Загрузка пользователей...'}</h3></div>`;

    try {
        if (!adminTelegramId) {
            throw new Error('Admin Telegram ID not set');
        }

        console.log('Loading users with Admin ID:', adminTelegramId);
        const response = await fetch(`/api/admin/users?adminTelegramId=${adminTelegramId}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Users loaded:', data.length);
        usersData = data;
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = `
            <div class="empty-state">
                <h3>${t.error_loading_users || '❌ Ошибка загрузки пользователей'}</h3>
                <p>${error.message}</p>
                <p style="margin-top: 12px; font-size: 12px;">Admin ID: ${adminTelegramId || 'не установлен'}</p>
                <button class="admin-btn" onclick="loadUsers()" style="margin-top: 16px;">Повторить</button>
            </div>
        `;
    }
}

function renderUsers() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];
    const container = document.getElementById('content');

    if (!usersData || usersData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>${t.no_users || '👥 Нет пользователей'}</h3>
                <p>${t.users_will_appear || 'Пользователи появятся после регистрации'}</p>
            </div>
        `;
        return;
    }

    const adminCount = usersData.filter(u => u.is_admin).length;

    const userCards = usersData.map(user => {
        const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase();
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || t.no_name || 'Без имени';
        const date = new Date(user.created_at).toLocaleDateString('ru-RU');

        return `
            <div class="admin-card user-card">
                <div class="user-avatar">
                    ${user.avatar_url ?
                `<img src="${user.avatar_url}" alt="${fullName}">` :
                initials || '?'
            }
                </div>
                <div class="user-info">
                    <div class="user-name">
                        ${fullName}
                        ${user.is_admin ? '<span class="admin-badge">ADMIN</span>' : ''}
                    </div>
                    <div class="user-meta">
                        @${user.username || 'нет username'} • ID: ${user.telegram_id} • ${date}
                    </div>
                </div>
                <div class="admin-actions">
                    <button class="admin-btn btn-admin" onclick="toggleAdmin(${user.id}, ${user.is_admin})">
                        ${user.is_admin ? (t.btn_remove_admin || '✕ Убрать админа') : (t.btn_make_admin || '👑 Сделать админом')}
                    </button>
                    <button class="admin-btn btn-delete" onclick="deleteUser(${user.id}, '${fullName.replace(/'/g, "\\'")}')">
                        ${t.btn_delete || '🗑 Удалить'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="stats-card">
            <h3>${t.users_stats || '📊 Статистика пользователей'}</h3>
            <p>${t.total || 'Всего'}: ${usersData.length} • ${t.admins_count || 'Администраторов'}: ${adminCount}</p>
        </div>
        ${userCards}
    `;
}

async function toggleAdmin(userId, isCurrentlyAdmin) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];
    // Simple confirmation for now, or could use dynamic string construction if needed
    const action = isCurrentlyAdmin ? 'убрать права администратора' : 'выдать права администратора'; // Fallback

    // Ideally we'd have specific keys, but for now let's just ask "Are you sure?"
    if (!confirm(`Вы уверены?`)) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                isAdmin: !isCurrentlyAdmin,
                adminTelegramId: adminTelegramId
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(isCurrentlyAdmin ? (t.admin_rights_removed || '✓ Права администратора убраны') : (t.admin_rights_granted || '✓ Права администратора выданы'));
            await loadUsers();
        } else {
            alert(t.rights_error || 'Ошибка при изменении прав');
        }
    } catch (error) {
        console.error('Error toggling admin:', error);
        alert(t.rights_error || 'Ошибка при изменении прав');
    }
}

async function deleteUser(userId, userName) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    if (!confirm(`${t.confirm_delete_user || 'Вы уверены, что хотите удалить пользователя'} "${userName}"?`)) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}?adminTelegramId=${adminTelegramId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert(t.user_deleted || '✓ Пользователь удален');
            await loadUsers();
        } else {
            alert(t.delete_error || 'Ошибка при удалении');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert(t.delete_error || 'Ошибка при удалении');
    }
}

init();
