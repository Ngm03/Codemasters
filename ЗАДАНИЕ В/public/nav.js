function createBottomNav(activePage) {
    if (!document.querySelector('link[href="css/bottom-nav.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/bottom-nav.css';
        document.head.appendChild(link);
    }

    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const menuPages = ['startups', 'teams', 'events', 'specialists'];
    const isMenuActive = menuPages.includes(activePage);

    const navHTML = `
    <div class="ai-modal" id="aiModal">
        <div class="ai-modal-backdrop" onclick="toggleAiModal()"></div>
        <div class="ai-modal-content">
            <div class="ai-modal-handle"></div>
            <div class="ai-modal-header">
                <h3>${t.menu_title}</h3>
                <button class="close-btn" onclick="toggleAiModal()">&times;</button>
            </div>
            <div class="ai-grid">
                <a href="startups.html" class="ai-card">
                    <div class="ai-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
                            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
                            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
                            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
                        </svg>
                    </div>
                    <span>${t.menu_startups}</span>
                </a>
                <a href="teams.html" class="ai-card">
                    <div class="ai-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                    <span>${t.menu_teams}</span>
                </a>
                <a href="events.html" class="ai-card">
                    <div class="ai-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                    <span>${t.menu_events}</span>
                </a>
                <a href="specialists.html" class="ai-card">
                    <div class="ai-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                    </div>
                    <span>${t.menu_specialists}</span>
                </a>
                <a href="admin.html" class="ai-card" id="adminMenuLink" style="display: none;">
                    <div class="ai-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <span>${t.menu_admin}</span>
                </a>
                <a href="validator.html" class="ai-card">
                    <div class="ai-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                    </div>
                    <span>${t.menu_validator}</span>
                </a>
                <a href="learning.html" class="ai-card">
                    <div class="ai-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                    </div>
                    <span>Learning Hub</span>
                </a>
            </div>
        </div>
    </div>

    <nav class="bottom-nav">
        <a href="index.html" class="nav-item ${activePage === 'home' ? 'active' : ''}">
            <svg class="nav-icon" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>${t.nav_home}</span>
        </a>
        
        <a href="market.html" class="nav-item ${activePage === 'market' ? 'active' : ''}">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>${t.nav_market}</span>
        </a>

        <button class="nav-item ${isMenuActive ? 'active' : ''}" onclick="toggleAiModal()">
            <svg class="nav-icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>${t.nav_menu}</span>
        </button>

        <a href="matchmaker.html" class="nav-item ${activePage === 'matchmaker' ? 'active' : ''}">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <span>${t.nav_matchmaker}</span>
        </a>

        <a href="profile.html" class="nav-item ${activePage === 'profile' ? 'active' : ''}">
            <svg class="nav-icon" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>${t.nav_profile}</span>
        </a>
    </nav>
    `;

    document.body.insertAdjacentHTML('beforeend', navHTML);

    // Check admin status after navigation is added to DOM
    checkAdminStatus();
}

function toggleAiModal() {
    const modal = document.getElementById('aiModal');
    modal.classList.toggle('active');

    if (modal.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// Check if user is admin and show admin panel link
async function checkAdminStatus() {
    try {
        // Get Telegram user ID
        let telegramId = null;

        if (window.Telegram && window.Telegram.WebApp) {
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            if (user) {
                telegramId = user.id;
            }
        }

        if (!telegramId) {
            console.log('No Telegram ID found');
            return;
        }

        // Check if user is admin via API
        const response = await fetch(`/api/admin/check-telegram/${telegramId}`);
        const data = await response.json();

        if (data.isAdmin) {
            const adminLink = document.getElementById('adminMenuLink');
            if (adminLink) {
                adminLink.style.display = 'flex';
                console.log('Admin menu link shown');
            }
        }
    } catch (error) {
        console.error('Admin check error:', error);
    }
}
