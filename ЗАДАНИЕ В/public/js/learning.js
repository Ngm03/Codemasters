const tg = window.Telegram.WebApp;
tg.expand();

const lang = localStorage.getItem('language') || 'ru';
applyLanguage(lang);

const searchInput = document.getElementById('searchInput');
const tabs = document.querySelectorAll('.tab');
const videosContent = document.getElementById('videosContent');
const coursesContent = document.getElementById('coursesContent');

let currentTab = 'videos';
let searchQuery = '';
let searchTimeout;

const user = tg.initDataUnsafe?.user || { id: 12345, first_name: 'Guest' };

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        currentTab = tab.dataset.tab;
        showTab(currentTab);
        safeHaptic('light');
    });
});

// Search
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (currentTab === 'videos') {
            loadVideos(searchQuery || 'javascript tutorial');
        }
    }, 500);
});

function showTab(tab) {
    videosContent.style.display = tab === 'videos' ? 'block' : 'none';
    coursesContent.style.display = tab === 'courses' ? 'block' : 'none';
}

// Load Videos
async function loadVideos(query = 'javascript tutorial') {
    videosContent.innerHTML = '<div class="loading"><div class="spinner"></div><div>Загрузка видео...</div></div>';

    try {
        const response = await fetch(`/api/learning/videos?query=${encodeURIComponent(query)}`);
        const videos = await response.json();

        if (videos.length === 0) {
            videosContent.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <line x1="2" y1="7" x2="7" y2="7"></line>
                        <line x1="2" y1="17" x2="7" y2="17"></line>
                        <line x1="17" y1="17" x2="22" y2="17"></line>
                        <line x1="17" y1="7" x2="22" y2="7"></line>
                    </svg>
                    <div>Видео не найдены</div>
                </div>
            `;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'grid';

        videos.forEach(video => {
            const card = createVideoCard(video);
            grid.appendChild(card);
        });

        videosContent.innerHTML = '';
        videosContent.appendChild(grid);

    } catch (error) {
        console.error('Error loading videos:', error);
        videosContent.innerHTML = '<div class="empty-state"><div>Ошибка загрузки видео</div></div>';
    }
}

// Load Courses
async function loadCourses() {
    coursesContent.innerHTML = '<div class="loading"><div class="spinner"></div><div>Загрузка курсов...</div></div>';

    try {
        const response = await fetch('/api/learning/courses');
        const courses = await response.json();

        const grid = document.createElement('div');
        grid.className = 'grid';

        courses.forEach(course => {
            const card = createCourseCard(course);
            grid.appendChild(card);
        });

        coursesContent.innerHTML = '';
        coursesContent.appendChild(grid);

    } catch (error) {
        console.error('Error loading courses:', error);
        coursesContent.innerHTML = '<div class="empty-state"><div>Ошибка загрузки курсов</div></div>';
    }
}

// Load Articles
async function loadArticles(tags = 'javascript,webdev') {
    articlesContent.innerHTML = '<div class="loading"><div class="spinner"></div><div>Загрузка статей...</div></div>';

    try {
        const response = await fetch(`/api/learning/articles?tags=${encodeURIComponent(tags)}`);
        const articles = await response.json();

        const grid = document.createElement('div');
        grid.className = 'grid';

        articles.forEach(article => {
            const card = createArticleCard(article);
            grid.appendChild(card);
        });

        articlesContent.innerHTML = '';
        articlesContent.appendChild(grid);

    } catch (error) {
        console.error('Error loading articles:', error);
        articlesContent.innerHTML = '<div class="empty-state"><div>Ошибка загрузки статей</div></div>';
    }
}

// Create Video Card
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => window.open(video.link, '_blank');

    card.innerHTML = `
        <img class="card-image" src="${video.thumbnail}" alt="${video.title}" onerror="this.style.display='none'">
        <div class="card-body">
            <div class="card-title">${video.title}</div>
            <div class="card-meta">
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                    </svg>
                    ${video.channel}
                </span>
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${video.duration}
                </span>
            </div>
            <div class="card-meta">
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    ${formatViews(video.views)}
                </span>
                ${video.published ? `<span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${video.published}
                </span>` : ''}
            </div>
        </div>
    `;

    return card;
}

// Create Course Card
function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => window.open(course.link, '_blank');

    card.innerHTML = `
        <div class="card-image" style="background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
        </div>
        <div class="card-body">
            <div class="card-title">${course.title}</div>
            <div class="card-meta">
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    ${course.lessons} уроков
                </span>
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${course.hours}ч
                </span>
            </div>
            ${course.certification ? '<div class="tag"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>Сертификат</div>' : ''}
        </div>
    `;

    return card;
}

// Create Article Card
function createArticleCard(article) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => window.open(article.url, '_blank');

    card.innerHTML = `
        ${article.cover_image ? `<img class="card-image" src="${article.cover_image}" alt="${article.title}">` : '<div class="card-image" style="background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%);"></div>'}
        <div class="card-body">
            <div class="card-title">${article.title}</div>
            <div class="card-meta">
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    ${article.author}
                </span>
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    ${article.reading_time} мин
                </span>
            </div>
            <div class="card-tags">
                ${article.tags.slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
        </div>
    `;

    return card;
}

function formatViews(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views;
}

function safeHaptic(style) {
    try {
        if (tg.isVersionAtLeast('6.1') && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred(style);
        }
    } catch (e) {
        // Ignore
    }
}

// Initial load
loadVideos();
loadCourses();
