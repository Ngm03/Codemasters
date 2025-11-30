document.addEventListener('DOMContentLoaded', () => {
    initFAB();
});

function initFAB() {
    // Determine content type based on URL
    const path = window.location.pathname;
    let type = 'news'; // Default
    if (path.includes('startups')) type = 'startup';
    else if (path.includes('events')) type = 'event';
    else if (path.includes('teams')) type = 'team';
    else if (path.includes('specialists')) type = 'vacancy';

    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    // Inject FAB HTML
    const fab = document.createElement('button');
    fab.className = 'fab-btn';
    fab.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    fab.onclick = () => openFabModal(type);
    document.body.appendChild(fab);

    // Inject Modal HTML
    const modal = document.createElement('div');
    modal.className = 'fab-modal';
    modal.id = 'fabModal';
    modal.innerHTML = `
        <div class="fab-modal-content">
            <div class="fab-modal-header">
                <div class="fab-modal-title" id="fabModalTitle">${t.fab_add || 'Добавить'}</div>
                <button class="fab-close-btn" onclick="closeFabModal()">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        <form id="fabForm" onsubmit="submitFabForm(event, '${type}')">
            <div id="fabFormFields"></div>
            <button type="submit" class="fab-submit-btn">${t.fab_submit || 'Отправить на модерацию'}</button>
        </form>
        </div >
        `;
    document.body.appendChild(modal);

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) closeFabModal();
    };
}

function openFabModal(type) {
    const modal = document.getElementById('fabModal');
    const title = document.getElementById('fabModalTitle');
    const fields = document.getElementById('fabFormFields');
    const form = document.getElementById('fabForm');

    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    // Update submit handler to use current type
    form.onsubmit = (e) => submitFabForm(e, type);

    let html = '';

    if (type === 'startup') {
        title.textContent = t.fab_add_startup || 'Добавить стартап';
        html = `
        <div class="fab-form-group">
                <label class="fab-label">${t.fab_name || 'Название'}</label>
                <input type="text" name="name" class="fab-input" required>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_desc || 'Описание'}</label>
                <textarea name="description" class="fab-textarea" required></textarea>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_category || 'Категория'}</label>
                <select name="category" class="fab-select">
                    <option value="FinTech">FinTech</option>
                    <option value="EdTech">EdTech</option>
                    <option value="HealthTech">HealthTech</option>
                    <option value="AgroTech">AgroTech</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Other">${t.fab_other || 'Другое'}</option>
                </select>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_stage || 'Стадия'}</label>
                <select name="stage" class="fab-select">
                    <option value="Idea">${t.fab_idea || 'Идея'}</option>
                    <option value="MVP">${t.fab_mvp || 'MVP'}</option>
                    <option value="Growth">${t.fab_growth || 'Рост'}</option>
                    <option value="Scale">${t.fab_scale || 'Масштабирование'}</option>
                </select>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_website || 'Веб-сайт'}</label>
                <input type="url" name="website_url" class="fab-input">
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_logo || 'Логотип'}</label>
                <input type="file" name="logo" class="fab-input" accept="image/*">
            </div>
    `;
    } else if (type === 'event') {
        title.textContent = t.fab_add_event || 'Добавить событие';
        html = `
        <div class="fab-form-group">
                <label class="fab-label">${t.fab_name || 'Название'}</label>
                <input type="text" name="title" class="fab-input" required>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_desc || 'Описание'}</label>
                <textarea name="description" class="fab-textarea" required></textarea>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_datetime || 'Дата и время'}</label>
                <input type="datetime-local" name="event_date" class="fab-input" required>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_venue || 'Место проведения'}</label>
                <input type="text" name="location" class="fab-input" required>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_reg_link || 'Ссылка на регистрацию'}</label>
                <input type="url" name="url" class="fab-input">
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_image || 'Изображение'}</label>
                <input type="file" name="image" class="fab-input" accept="image/*">
            </div>
            <div class="fab-form-group">
                <label class="fab-label">
                    <input type="checkbox" name="is_online" value="true"> ${t.fab_online || 'Онлайн мероприятие'}
                </label>
            </div>
    `;
    } else if (type === 'team') {
        title.textContent = t.fab_add_team || 'Добавить команду';
        html = `
        <div class="fab-form-group">
                <label class="fab-label">${t.fab_team_name || 'Название команды'}</label>
                <input type="text" name="name" class="fab-input" required>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_desc || 'Описание'}</label>
                <textarea name="description" class="fab-textarea" required></textarea>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_location || 'Локация'}</label>
                <input type="text" name="location" class="fab-input" value="Казахстан">
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_website_link || 'Веб-сайт / Ссылка'}</label>
                <input type="url" name="website_url" class="fab-input">
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_logo || 'Логотип'}</label>
                <input type="file" name="logo" class="fab-input" accept="image/*">
            </div>
    `;
    } else if (type === 'vacancy') {
        title.textContent = t.fab_add_vacancy || 'Добавить вакансию';
        html = `
        <div class="fab-form-group">
                <label class="fab-label">${t.fab_position || 'Должность'}</label>
                <input type="text" name="title" class="fab-input" required>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_company || 'Компания'}</label>
                <input type="text" name="employer" class="fab-input" required>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_desc || 'Описание'}</label>
                <textarea name="description" class="fab-textarea" required></textarea>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_salary || 'Зарплата'}</label>
                <input type="text" name="salary" class="fab-input" placeholder="${t.fab_salary_placeholder || 'Например: 300 000 KZT'}">
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_experience || 'Опыт работы'}</label>
                <select name="experience" class="fab-select">
                    <option value="No experience">${t.fab_no_exp || 'Без опыта'}</option>
                    <option value="1-3 years">${t.fab_1_3_years || '1-3 года'}</option>
                    <option value="3-6 years">${t.fab_3_6_years || '3-6 лет'}</option>
                    <option value="6+ years">${t.fab_6_plus_years || 'Более 6 лет'}</option>
                </select>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_location || 'Локация'}</label>
                <input type="text" name="location" class="fab-input" value="Астана">
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_vacancy_link || 'Ссылка на вакансию'}</label>
                <input type="url" name="url" class="fab-input">
            </div>
    `;
    } else { // News
        title.textContent = t.fab_suggest_news || 'Предложить новость';
        html = `
        <div class="fab-form-group">
                <label class="fab-label">${t.fab_headline || 'Заголовок'}</label>
                <input type="text" name="title" class="fab-input" required>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_news_text || 'Текст новости'}</label>
                <textarea name="description" class="fab-textarea" required></textarea>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_category || 'Категория'}</label>
                <select name="category_id" class="fab-select">
                    <option value="1">${t.fab_tech || 'Технологии'}</option>
                    <option value="2">${t.fab_startups || 'Стартапы'}</option>
                    <option value="3">${t.fab_invest || 'Инвестиции'}</option>
                    <option value="4">${t.fab_events || 'Мероприятия'}</option>
                </select>
            </div>
            <div class="fab-form-group">
                <label class="fab-label">${t.fab_image || 'Изображение'}</label>
                <input type="file" name="image" class="fab-input" accept="image/*">
            </div>
    `;
    }

    fields.innerHTML = html;
    modal.classList.add('active');
}

function closeFabModal() {
    document.getElementById('fabModal').classList.remove('active');
}

async function submitFabForm(e, type) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');

    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    // Disable button to prevent double submit
    submitBtn.disabled = true;
    submitBtn.textContent = t.fab_sending || 'Отправка...';

    try {
        // 1. Get Telegram User Data
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        let internalUserId = 1; // Default fallback

        // 2. Sync User if available
        if (tgUser) {
            try {
                const syncRes = await fetch('/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegram_id: tgUser.id,
                        first_name: tgUser.first_name,
                        last_name: tgUser.last_name,
                        username: tgUser.username,
                        photo_url: tgUser.photo_url
                    })
                });
                if (syncRes.ok) {
                    const syncData = await syncRes.json();
                    internalUserId = syncData.userId;
                }
            } catch (err) {
                console.error('User sync failed, using default ID:', err);
            }
        }

        // 3. Prepare Request
        formData.append('userId', internalUserId);

        let url = '';
        if (type === 'news') {
            url = '/api/news';
        } else {
            // Use the mobile routes endpoints: /api/users/:userId/:type
            let pluralType = type + 's';
            if (type === 'vacancy') pluralType = 'vacancies';
            url = `/api/users/${internalUserId}/${pluralType}`;
        }

        // 4. Send Request
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert(t.fab_success || 'Успешно отправлено на модерацию!');
            closeFabModal();
            form.reset();
        } else {
            alert((t.fab_error || 'Ошибка: ') + (result.error || (t.fab_unknown_error || 'Неизвестная ошибка')));
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert(t.fab_network_error || 'Ошибка сети');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = t.fab_submit || 'Отправить на модерацию';
    }
}
