let allSpecialists = [];

async function loadSpecialists() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="loading">${t.loading}</div>`;

    try {
        await FavoritesUtils.init();
        await FavoritesUtils.fetchFavorites('vacancies');

        const data = await loadData('/api/specialists');
        if (data) {
            allSpecialists = data;
            displaySpecialists(data);
        } else {
            resultsDiv.innerHTML = `<div class="empty-state"><h3>${t.error_loading}</h3></div>`;
        }
    } catch (error) {
        console.error('Error loading specialists:', error);
        resultsDiv.innerHTML = `<div class="empty-state"><h3>${t.error_loading}</h3></div>`;
    }
}

function displaySpecialists(specialists) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const resultsDiv = document.getElementById('results');

    if (!specialists || specialists.length === 0) {
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

    const html = specialists.map(item => {
        const isHH = item.source === 'HeadHunter';

        return `
        <div class="card" style="position: relative;">
            ${FavoritesUtils.getButtonHtml('vacancies', item.id)}
            ${isHH ? '<span class="badge" style="background: linear-gradient(135deg, #D6001C, #B00016); margin-bottom: 12px;">HeadHunter</span>' : ''}
            <h4>${isHH ? item.role : item.name}</h4>
            ${!isHH ? `<span class="badge">${item.role}</span>` : ''}
            ${isHH && item.company ? `
                <div class="info-row" style="margin-top: 12px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    ${item.company}
                </div>
            ` : ''}
            <div class="info-row" style="margin-top: 12px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${item.city} • ${item.experience}
            </div>
            ${isHH && item.salary ? `
                <div class="info-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    ${item.salary}
                </div>
            ` : item.rate ? `
                <div class="info-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                    ${item.rate}
                </div>
            ` : ''}
            ${item.skills ? `
                <div class="tags">
                    ${item.skills.map(s => `<span class="tag primary">${s}</span>`).join('')}
                </div>
            ` : ''}
            ${item.description ? `<p style="font-size: 14px; color: var(--text-gray); margin: 12px 0;">${item.description}</p>` : ''}
            ${!isHH ? `
                <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 16px; background: ${item.available ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${item.available ? '#059669' : '#DC2626'};">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                        ${item.available ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path>'}
                    </svg>
                    ${item.available ? t.available : t.busy}
                </div>
            ` : ''}
            ${isHH && item.url ? `
                <button class="contact-btn" onclick="window.open('${item.url}', '_blank')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1-2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    ${t.open_vacancy}
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
        displaySpecialists(allSpecialists);
        return;
    }

    searchTimeout = setTimeout(() => {
        const filtered = allSpecialists.filter(item =>
            (item.name && item.name.toLowerCase().includes(query)) ||
            item.role.toLowerCase().includes(query) ||
            (item.company && item.company.toLowerCase().includes(query)) ||
            (item.skills && item.skills.some(s => s.toLowerCase().includes(query)))
        );
        displaySpecialists(filtered);
    }, 300);
});

loadSpecialists();
