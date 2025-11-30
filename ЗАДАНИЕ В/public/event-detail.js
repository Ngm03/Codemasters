async function loadEventDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    const detailDiv = document.getElementById('eventDetail');

    if (!eventId) {
        detailDiv.innerHTML = '<div class="empty-state"><h3>Событие не найдено</h3></div>';
        return;
    }

    detailDiv.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        const response = await fetch('/api/events');
        const events = await response.json();
        const event = events.find(e => e.id === eventId);

        if (!event) {
            detailDiv.innerHTML = '<div class="empty-state"><h3>Событие не найдено</h3></div>';
            return;
        }

        displayEventDetail(event);
    } catch (error) {
        console.error('Error loading event:', error);
        detailDiv.innerHTML = '<div class="empty-state"><h3>Ошибка загрузки</h3></div>';
    }
}

function displayEventDetail(event) {
    const detailDiv = document.getElementById('eventDetail');
    const isGoogleEvent = event.source === 'Google Events';

    const html = `
        <div class="card" style="margin-top: 20px;">
            ${isGoogleEvent ? '<span class="badge" style="background: linear-gradient(135deg, #4285F4, #34A853);">Google Events</span>' : ''}
            <span class="badge">${event.type}</span>
            
            <h2 style="font-size: 28px; font-weight: 800; margin: 16px 0; line-height: 1.3;">${event.name}</h2>
            
            ${event.thumbnail ? `
                <img src="${event.thumbnail}" alt="${event.name}" style="width: 100%; border-radius: 16px; margin: 20px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.1);">
            ` : ''}
            
            <div style="background: var(--bg-gray); padding: 20px; border-radius: 12px; margin: 20px 0;">
                <div class="info-row" style="margin-bottom: 12px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                    </svg>
                    <strong>Дата:</strong> ${event.date}
                </div>
                
                ${event.time ? `
                    <div class="info-row" style="margin-bottom: 12px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <strong>Время:</strong> ${event.time}
                    </div>
                ` : ''}
                
                <div class="info-row" style="margin-bottom: 12px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <strong>Место:</strong> ${event.location}
                </div>
                
                ${event.venue ? `
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        </svg>
                        <strong>Площадка:</strong> ${event.venue}
                    </div>
                ` : ''}
            </div>
            
            ${event.description ? `
                <div style="margin: 24px 0;">
                    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Описание</h3>
                    <p style="font-size: 16px; line-height: 1.7; color: var(--text-dark); white-space: pre-wrap;">${event.description}</p>
                </div>
            ` : ''}
            
            ${event.ticket_info && event.ticket_info.length > 0 ? `
                <div style="margin: 24px 0;">
                    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Билеты и информация</h3>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${event.ticket_info.map(ticket => `
                            <a href="${ticket.link}" target="_blank" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-gray); border-radius: 10px; text-decoration: none; color: var(--text-dark); transition: all 0.3s ease;">
                                <span style="font-weight: 600;">${ticket.source}</span>
                                <span style="font-size: 13px; color: var(--primary);">${ticket.link_type}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                ${event.link ? `
                    <button class="contact-btn" onclick="window.open('${event.link}', '_blank')" style="flex: 1;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Подробнее
                    </button>
                ` : ''}
                
                ${event.registration ? `
                    <button class="contact-btn" onclick="window.open('${event.registration}', '_blank')" style="flex: 1;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Регистрация
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    detailDiv.innerHTML = html;
}

loadEventDetail();
