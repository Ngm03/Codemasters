let userId = 1;
let currentUser = {};

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
                    await loadUserProfile();
                }
            } catch (error) {
                console.error('❌ Error syncing user:', error);
            }
        }
    } else {
        await loadUserProfile();
    }
}

async function loadUserProfile() {
    try {
        const response = await fetch(`/api/users/${userId}`);
        currentUser = await response.json();

        document.getElementById('profileAvatar').src = currentUser.avatar_url || 'https://i.pravatar.cc/150?img=1';
        document.getElementById('profileName').textContent = `${currentUser.first_name} ${currentUser.last_name || ''}`.trim();
        document.getElementById('profileRole').textContent = currentUser.role || 'Роль не выбрана';
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function openRoleModal() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const modal = createModal(t.modal_role_title, `
        <div class="role-grid">
            <div class="role-card" onclick="selectRole('${t.role_developer}')">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <div class="role-card-title">${t.role_developer}</div>
            </div>
            <div class="role-card" onclick="selectRole('${t.role_founder}')">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <div class="role-card-title">${t.role_founder}</div>
            </div>
            <div class="role-card" onclick="selectRole('${t.role_investor}')">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <div class="role-card-title">${t.role_investor}</div>
            </div>
            <div class="role-card" onclick="selectRole('${t.role_designer}')">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                    <path d="M2 2l7.586 7.586"></path>
                    <circle cx="11" cy="11" r="2"></circle>
                </svg>
                <div class="role-card-title">${t.role_designer}</div>
            </div>
            <div class="role-card" onclick="selectRole('${t.role_marketer}')">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <div class="role-card-title">${t.role_marketer}</div>
            </div>
            <div class="role-card" onclick="selectRole('${t.role_student}')">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
                <div class="role-card-title">${t.role_student}</div>
            </div>
        </div>
    `);
}

async function selectRole(role) {
    try {
        await fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
        });

        document.getElementById('profileRole').textContent = role;
        closeAllModals();
    } catch (error) {
        console.error('Error updating role:', error);
    }
}

function openPersonalData() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const modal = createModal(t.modal_personal_title, `
        <div class="avatar-upload">
            <img src="${currentUser.avatar_url || 'https://i.pravatar.cc/150?img=1'}" alt="Avatar" class="avatar-preview" id="avatarPreview">
            <button class="upload-btn" onclick="uploadAvatar()">${t.change_photo}</button>
        </div>
        <div class="form-group">
            <label class="form-label">${t.first_name}</label>
            <input type="text" class="form-input" id="firstName" value="${currentUser.first_name || ''}" placeholder="${t.first_name}">
        </div>
        <div class="form-group">
            <label class="form-label">${t.last_name}</label>
            <input type="text" class="form-input" id="lastName" value="${currentUser.last_name || ''}" placeholder="${t.last_name}">
        </div>
        <button class="save-btn" onclick="savePersonalData()">${t.save_changes}</button>
    `);
}

function uploadAvatar() {
    alert('Функция загрузки аватара будет доступна в следующей версии');
}

async function savePersonalData() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;

    try {
        await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: firstName, last_name: lastName })
        });

        await loadUserProfile();
        closeAllModals();
    } catch (error) {
        console.error('Error saving personal data:', error);
    }
}

function openSecurity() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const modal = createModal(t.modal_security_title, `
        <div class="form-group">
            <label class="form-label">${t.phone}</label>
            <input type="tel" class="form-input" id="phone" value="${currentUser.phone || ''}" placeholder="+7 (___) ___-__-__">
        </div>
        <div class="form-group">
            <label class="form-label">${t.email}</label>
            <input type="email" class="form-input" id="email" value="${currentUser.email || ''}" placeholder="example@mail.com">
        </div>
        <div class="form-group">
            <label class="form-label">${t.password}</label>
            <input type="password" class="form-input" id="password" placeholder="••••••••">
        </div>
        <button class="save-btn" onclick="saveSecurity()">${t.save_changes}</button>
    `);
}

async function saveSecurity() {
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await fetch(`/api/users/${userId}/security`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, email, password })
        });

        closeAllModals();
    } catch (error) {
        console.error('Error saving security:', error);
    }
}

function openAccountActions() {
    const modal = createModal('Действия с аккаунтом', `
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
            Удаление аккаунта приведет к безвозвратной потере всех ваших данных, включая подписки, избранное и комментарии.
        </p>
        <button class="delete-account-btn" onclick="deleteAccount()">Удалить аккаунт</button>
    `);
}

function deleteAccount() {
    if (confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
        alert('Функция удаления аккаунта будет доступна в следующей версии');
    }
}

function openNotifications() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const modal = createModal(t.modal_notifications_title, `
        <div class="toggle-switch">
            <span class="toggle-label">${t.notif_news}</span>
            <div class="toggle active" onclick="toggleNotification(this)">
                <div class="toggle-slider"></div>
            </div>
        </div>
        <div class="toggle-switch">
            <span class="toggle-label">${t.notif_startups}</span>
            <div class="toggle active" onclick="toggleNotification(this)">
                <div class="toggle-slider"></div>
            </div>
        </div>
        <div class="toggle-switch">
            <span class="toggle-label">${t.notif_events}</span>
            <div class="toggle active" onclick="toggleNotification(this)">
                <div class="toggle-slider"></div>
            </div>
        </div>
        <div class="toggle-switch">
            <span class="toggle-label">${t.notif_vacancies}</span>
            <div class="toggle" onclick="toggleNotification(this)">
                <div class="toggle-slider"></div>
            </div>
        </div>
    `);
}

function toggleNotification(toggle) {
    toggle.classList.toggle('active');
}



function openLanguage() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];
    const currentLang = localStorage.getItem('language') || 'ru';

    const modal = createModal(t.modal_language_title, `
        <div class="language-option ${currentLang === 'ru' ? 'selected' : ''}" onclick="selectLanguage(this, 'ru')">
            <span class="language-name">Русский</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        <div class="language-option ${currentLang === 'kk' ? 'selected' : ''}" onclick="selectLanguage(this, 'kk')">
            <span class="language-name">Қазақша</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        <div class="language-option ${currentLang === 'en' ? 'selected' : ''}" onclick="selectLanguage(this, 'en')">
            <span class="language-name">English</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
    `);
}

async function selectLanguage(element, language) {
    try {
        setLanguage(language); // Apply immediately

        await fetch(`/api/users/${userId}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language })
        });

        document.querySelectorAll('.language-option').forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');

        currentUser.language = language; // Update local state
        closeAllModals();
    } catch (error) {
        console.error('Error saving language:', error);
    }
}

function openSupport() {
    const modal = createModal('Поддержка', `
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
            Если у вас возникли вопросы или проблемы, свяжитесь с нами:
        </p>
        <div class="form-group">
            <label class="form-label">Email поддержки</label>
            <input type="email" class="form-input" value="support@aqmolastart.kz" readonly>
        </div>
        <div class="form-group">
            <label class="form-label">Telegram</label>
            <input type="text" class="form-input" value="@aqmolastart_support" readonly>
        </div>
    `);
}

function openFeedback() {
    const modal = createModal('Отзыв', `
        <div class="form-group">
            <label class="form-label">Ваш отзыв</label>
            <textarea class="form-input" id="feedbackText" rows="5" placeholder="Расскажите, что вам нравится или что можно улучшить..."></textarea>
        </div>
        <button class="save-btn" onclick="sendFeedback()">Отправить отзыв</button>
    `);
}

function sendFeedback() {
    const feedback = document.getElementById('feedbackText').value;
    if (feedback.trim()) {
        alert('Спасибо за ваш отзыв!');
        closeAllModals();
    }
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        window.location.href = '/';
    }
}

function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeAllModals()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <button class="close-btn" onclick="closeAllModals()">&times;</button>
            </div>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);

    // Trigger reflow
    modal.offsetHeight;

    // Add active class for animation
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });

    return modal;
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.remove());
}

syncTelegramUser();
