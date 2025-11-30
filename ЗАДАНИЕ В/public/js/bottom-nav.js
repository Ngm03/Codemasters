function createBottomNav(activePage) {
    if (!document.querySelector('link[href="css/bottom-nav.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/bottom-nav.css';
        document.head.appendChild(link);
    }

    const menuPages = ['startups', 'teams', 'events', 'specialists'];
    const isMenuActive = menuPages.includes(activePage);

    const navHTML = `
    <div class="ai-modal" id="aiModal">
        <div class="ai-modal-backdrop" onclick="toggleAiModal()"></div>
        <div class="ai-modal-content">
            <div class="ai-modal-handle"></div>
            <div class="ai-modal-header">
                <h3>Меню</h3>
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
                    <span>Стартапы</span>
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
                    <span>Команды</span>
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
                    <span>События</span>
                </a>
                <a href="specialists.html" class="ai-card">
                    <div class="ai-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                    </div>
                    <span>Специалисты</span>
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
            <span>Главная</span>
        </a>
        
        <a href="#" class="nav-item ${activePage === 'notifications' ? 'active' : ''}">
            <svg class="nav-icon" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>Уведомления</span>
        </a>

        <button class="nav-item ${isMenuActive ? 'active' : ''}" onclick="toggleAiModal()">
            <svg class="nav-icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Меню</span>
        </button>

        <a href="#" class="nav-item ${activePage === 'quiz' ? 'active' : ''}">
            <svg class="nav-icon" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Quiz</span>
        </a>

        <a href="#" class="nav-item ${activePage === 'profile' ? 'active' : ''}">
            <svg class="nav-icon" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Профиль</span>
        </a>
    </nav>
    `;

    document.body.insertAdjacentHTML('beforeend', navHTML);
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
