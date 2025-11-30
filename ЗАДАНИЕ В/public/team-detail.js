async function loadTeamDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('id');

    const detailDiv = document.getElementById('teamDetail');

    if (!teamId) {
        detailDiv.innerHTML = '<div class="empty-state"><h3>Команда не найдена</h3></div>';
        return;
    }

    detailDiv.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        const response = await fetch('/api/teams');
        const teams = await response.json();
        const team = teams.find(t => t.id == teamId || t.id === teamId);

        if (!team) {
            detailDiv.innerHTML = '<div class="empty-state"><h3>Команда не найдена</h3></div>';
            return;
        }

        displayTeamDetail(team);
    } catch (error) {
        console.error('Error loading team:', error);
        detailDiv.innerHTML = '<div class="empty-state"><h3>Ошибка загрузки</h3></div>';
    }
}

function displayTeamDetail(team) {
    const detailDiv = document.getElementById('teamDetail');
    const isGoogleTeam = team.source && (team.source === 'LinkedIn' || team.source === 'GitHub' || team.source === 'Web');

    const html = `
        <div class="team-detail-header">
            ${isGoogleTeam ? `<span class="team-source-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                ${team.source}
            </span>` : ''}
            <h2>${team.name}</h2>
            ${team.city ? `<p>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${team.city}
            </p>` : ''}
        </div>

        <div class="team-info-grid">
            <div class="team-info-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h4>Участники</h4>
                <p>${team.members || 'Уточняется'}</p>
            </div>
            
            <div class="team-info-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <h4>Локация</h4>
                <p>${team.city || 'Казахстан'}</p>
            </div>
        </div>

        ${team.description ? `
            <div class="team-description-box">
                <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    О команде
                </h3>
                <p>${team.description}</p>
            </div>
        ` : ''}

        ${team.technologies && team.technologies.length > 0 ? `
            <div class="tech-stack-section">
                <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    Технологии
                </h3>
                <div class="tech-stack-grid">
                    ${team.technologies.map(tech => `
                        <span class="tech-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="m9 12 2 2 4-4"></path>
                            </svg>
                            ${tech}
                        </span>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${team.projects && team.projects.length > 0 ? `
            <div class="projects-section">
                <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Проекты
                </h3>
                ${team.projects.map(project => `
                    <div class="project-item">
                        <h4>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            ${project}
                        </h4>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${team.achievements ? `
            <div class="achievements-section">
                <h3>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21L12 17.27L18.18 21l-1.63-7.03L22 9.24l-7.19-.61L12 2z"/>
                    </svg>
                    Достижения
                </h3>
                <p>${team.achievements}</p>
            </div>
        ` : ''}

        <div class="team-links-section">
            <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                Контакты и ссылки
            </h3>
            
            ${team.link ? `
                <a href="${team.link}" target="_blank" class="link-card">
                    <div class="link-card-content">
                        <div class="link-icon ${team.source === 'LinkedIn' ? 'linkedin' : team.source === 'GitHub' ? 'github' : 'web'}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                ${team.source === 'LinkedIn' ? `
                                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                                    <rect x="2" y="9" width="4" height="12"></rect>
                                    <circle cx="4" cy="4" r="2"></circle>
                                ` : team.source === 'GitHub' ? `
                                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                ` : `
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                `}
                            </svg>
                        </div>
                        <div class="link-info">
                            <h4>${team.source === 'LinkedIn' ? 'LinkedIn профиль' : team.source === 'GitHub' ? 'GitHub репозиторий' : 'Веб-сайт'}</h4>
                            <p>${team.source || 'Перейти'}</p>
                        </div>
                    </div>
                    <div class="link-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m9 18 6-6-6-6"></path>
                        </svg>
                    </div>
                </a>
            ` : ''}

            ${team.contact && team.contact !== team.link ? `
                <a href="${team.contact.startsWith('@') ? 'https://t.me/' + team.contact.substring(1) : team.contact}" target="_blank" class="link-card">
                    <div class="link-card-content">
                        <div class="link-icon telegram">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                            </svg>
                        </div>
                        <div class="link-info">
                            <h4>Связаться в Telegram</h4>
                            <p>${team.contact}</p>
                        </div>
                    </div>
                    <div class="link-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m9 18 6-6-6-6"></path>
                        </svg>
                    </div>
                </a>
            ` : ''}
        </div>
    `;

    detailDiv.innerHTML = html;
}

loadTeamDetail();
