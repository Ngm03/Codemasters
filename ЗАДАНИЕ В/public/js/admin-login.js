const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');

// Initialize translations
const lang = localStorage.getItem('language') || 'ru';
if (typeof applyLanguage === 'function') {
    applyLanguage(lang);
}
const t = translations[lang];

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showError(t.fill_all_fields || 'Пожалуйста, заполните все поля');
        return;
    }

    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    hideError();

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Login successful, redirect to admin panel
            window.location.href = '/admin.html';
        } else {
            showError(data.error || t.invalid_credentials || 'Неверные учетные данные');
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(t.connection_error || 'Ошибка подключения к серверу');
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

// Check if already logged in
async function checkAuth() {
    try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();

        if (data.authenticated) {
            // Already logged in, redirect to admin panel
            window.location.href = '/admin.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

checkAuth();
