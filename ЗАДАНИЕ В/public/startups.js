let allStartups = [];

async function loadStartups() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="loading">${t.loading}</div>`;

    try {
        await FavoritesUtils.init();
        await FavoritesUtils.fetchFavorites('startups');

        let data;
        if (window.apiService) {
            data = await window.apiService.getStartups();
        } else {
            data = await loadData('/api/startups');
        }

        if (data) {
            allStartups = data;
            displayStartups(data);
        } else {
            resultsDiv.innerHTML = `<div class="empty-state"><h3>${t.error_loading}</h3></div>`;
        }
    } catch (error) {
        console.error('Error loading startups:', error);
        resultsDiv.innerHTML = `<div class="empty-state"><h3>${t.error_loading}</h3></div>`;
    }
}

function displayStartups(startups) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const resultsDiv = document.getElementById('results');

    if (!startups || startups.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <h3>${t.nothing_found}</h3>
            </div>
        `;
        return;
    }

    const html = startups.map(item => {
        const isPH = item.source === 'Product Hunt';

        return `
        <div class="card" style="position: relative;">
            ${FavoritesUtils.getButtonHtml('startups', item.id)}
            <span class="badge">${item.category}</span>
            ${isPH ? '<span class="badge" style="background: linear-gradient(135deg, #da552f, #c44422); margin-left: 8px;">Product Hunt</span>' : ''}
            <h4>${item.name}</h4>
            <p>${item.description}</p>
            ${isPH ? `
                <div class="info-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    ${item.votes} ${t.upvotes} • ${item.comments} ${t.comments}
                </div>
                ${item.founder ? `<div class="info-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    ${t.by} ${item.founder}
                </div>` : ''}
            ` : `
                <div class="info-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${item.city} • ${item.stage}${item.founded ? ' • ' + item.founded : ''}
                </div>
                ${item.technologies ? `<div class="tags">
                    ${item.technologies.map(t => `<span class="tag primary">${t}</span>`).join('')}
                </div>` : ''}
            `}
            ${item.website ? `
                <button class="contact-btn" onclick="window.open('${item.website}', '_blank')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    ${t.visit_website}
                </button>
            ` : item.contact ? `
                <button class="contact-btn" onclick="window.open('https://t.me/${item.contact.replace('@', '')}', '_blank')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m22 2-7 20-4-9-9-4Z"></path>
                        <path d="M22 2 11 13"></path>
                    </svg>
                    ${t.contact}
                </button>
            ` : ''}
        </div>
    `}).join('');

    resultsDiv.innerHTML = html;
}

let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();

    if (query.length < 2) {
        displayStartups(allStartups);
        return;
    }

    searchTimeout = setTimeout(() => {
        const filtered = allStartups.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            (item.technologies && item.technologies.some(t => t.toLowerCase().includes(query))) ||
            (item.founder && item.founder.toLowerCase().includes(query))
        );
        displayStartups(filtered);
    }, 300);
});

loadStartups();
