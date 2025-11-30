let allEvents = [];

async function loadEvents() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="loading">${t.loading}</div>`;

    try {
        await FavoritesUtils.init();
        await FavoritesUtils.fetchFavorites('events');

        const data = await loadData('/api/events');
        if (data) {
            allEvents = data;
            displayEvents(data);
        } else {
            resultsDiv.innerHTML = `<div class="empty-state"><h3>${t.error_loading}</h3></div>`;
        }
    } catch (error) {
        console.error('Error loading events:', error);
        resultsDiv.innerHTML = `<div class="empty-state"><h3>${t.error_loading}</h3></div>`;
    }
}

function displayEvents(events) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const resultsDiv = document.getElementById('results');

    if (!events || events.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <h3>${t.no_events}</h3>
                <p>${t.no_events_desc}</p>
            </div>
        `;
        return;
    }

    const html = events.map(item => {
        const isGoogleEvent = item.source === 'Google Events';
        const shortDescription = item.description && item.description.length > 150
            ? item.description.substring(0, 150) + '...'
            : item.description;

        return `
        <div class="card" onclick="window.location.href='event-detail.html?id=${encodeURIComponent(item.id)}'" style="cursor: pointer; position: relative;">
            ${FavoritesUtils.getButtonHtml('events', item.id)}
            ${isGoogleEvent ? '<span class="badge" style="background: linear-gradient(135deg, #4285F4, #34A853); margin-bottom: 12px;">Google Events</span>' : ''}
            <span class="badge">${item.type}</span>
            <h4>${item.name}</h4>
            ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.name}" style="width: 100%; border-radius: 12px; margin: 12px 0;">` : ''}
            <p>${shortDescription || t.click_details}</p>
            <div class="info-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${item.date}
            </div>
            ${item.time ? `
                <div class="info-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${item.time}
                </div>
            ` : ''}
            <div class="info-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${item.location}
            </div>
            <div style="margin-top: 12px; padding: 8px 12px; background: rgba(124, 58, 237, 0.1); border-radius: 8px; text-align: center; color: var(--primary); font-weight: 600; font-size: 14px;">
                ${t.click_details_arrow}
            </div>
        </div>
    `}).join('');

    resultsDiv.innerHTML = html;
}

let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();

    if (query.length < 2) {
        displayEvents(allEvents);
        return;
    }

    searchTimeout = setTimeout(() => {
        const filtered = allEvents.filter(item =>
            item.name.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query)) ||
            item.type.toLowerCase().includes(query) ||
            (item.location && item.location.toLowerCase().includes(query))
        );
        displayEvents(filtered);
    }, 300);
});

loadEvents();
