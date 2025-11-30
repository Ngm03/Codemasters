let allTeams = [];

async function loadTeams() {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="loading">${t.loading}</div>`;

    try {
        await FavoritesUtils.init();
        await FavoritesUtils.fetchFavorites('teams');

        const data = await loadData('/api/teams');
        if (data) {
            allTeams = data;
            displayTeams(data);
        } else {
            resultsDiv.innerHTML = `<div class="empty-state"><h3>${t.error_loading}</h3></div>`;
        }
    } catch (error) {
        console.error('Error loading teams:', error);
        resultsDiv.innerHTML = `<div class="empty-state"><h3>${t.error_loading}</h3></div>`;
    }
}

function displayTeams(teams) {
    const lang = localStorage.getItem('language') || 'ru';
    const t = translations[lang];

    const resultsDiv = document.getElementById('results');

    if (!teams || teams.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <h3>${t.no_teams}</h3>
                <p>${t.no_teams_desc}</p>
            </div>
        `;
        return;
    }

    const html = teams.map(item => {
        const isGoogleTeam = item.source && (item.source === 'LinkedIn' || item.source === 'GitHub' || item.source === 'Web');
        const shortDescription = item.description && item.description.length > 120
            ? item.description.substring(0, 120) + '...'
            : item.description || item.specialization || t.it_team_default;

        const badgeClass = item.source === 'LinkedIn' ? 'linkedin-badge' :
            item.source === 'GitHub' ? 'github-badge' :
                item.source === 'Web' ? 'web-badge' : '';

        return `
        <div class="team-card" onclick="window.location.href='team-detail.html?id=${encodeURIComponent(item.id)}'" style="position: relative;">
            ${FavoritesUtils.getButtonHtml('teams', item.id)}
            <div class="team-header">
                <div class="team-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div class="team-info">
                    ${isGoogleTeam ? `
                        <span class="team-source-badge ${badgeClass}">
                            ${item.source === 'LinkedIn' ? `
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                                </svg>
                            ` : item.source === 'GitHub' ? `
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
                                </svg>
                            ` : `
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                </svg>
                            `}
                            ${item.source}
                        </span>
                    ` : ''}
                    <h3 class="team-name">${item.name}</h3>
                </div>
            </div>
            
            <p class="team-description">${shortDescription}</p>
            
            <div class="team-stats">
                <div class="team-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    <span><strong>${item.members || t.team_members_label}</strong></span>
                </div>
                <div class="team-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>${item.city || t.location_default}</span>
                </div>
            </div>
            
            ${item.technologies && item.technologies.length > 0 ? `
                <div class="team-technologies">
                    ${item.technologies.slice(0, 4).map(t => `<span class="tech-badge">${t}</span>`).join('')}
                    ${item.technologies.length > 4 ? `<span class="tech-badge">+${item.technologies.length - 4}</span>` : ''}
                </div>
            ` : ''}
            
            ${item.projects && item.projects.length > 0 ? `
                <div class="team-projects">
                    <h5>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                        ${t.projects_label}
                    </h5>
                    <p>${item.projects.slice(0, 2).join(', ')}${item.projects.length > 2 ? '...' : ''}</p>
                </div>
            ` : ''}
            
            ${item.achievements ? `
                <div class="team-achievements">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21L12 17.27L18.18 21l-1.63-7.03L22 9.24l-7.19-.61L12 2z"/>
                    </svg>
                    <p>${item.achievements}</p>
                </div>
            ` : ''}
            
            <div class="team-cta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12 2 2 4-4"></path>
                </svg>
                ${t.team_details_btn}
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
        displayTeams(allTeams);
        return;
    }

    searchTimeout = setTimeout(() => {
        const filtered = allTeams.filter(item =>
            item.name.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query)) ||
            (item.specialization && item.specialization.toLowerCase().includes(query)) ||
            (item.technologies && item.technologies.some(t => t.toLowerCase().includes(query)))
        );
        displayTeams(filtered);
    }, 300);
});

loadTeams();
