const tg = window.Telegram.WebApp;
tg.expand();

// API Base URL
const API_BASE = '/api/matching';

// State
let currentUser = null;
let currentProfile = null;
let matches = [];
let currentCardIndex = 0;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const setupState = document.getElementById('setupState');
const matchingState = document.getElementById('matchingState');
const emptyState = document.getElementById('emptyState');
const cardsContainer = document.getElementById('cardsContainer');
const matchModal = document.getElementById('matchModal');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkProfile();
    } catch (error) {
        console.error('Init error:', error);
        showState(setupState);
    }
});

// Check if user has a profile
async function checkProfile() {
    showState(loadingState);

    try {
        // Get user ID from Telegram
        let userId = 12345; // Default mock ID for testing

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            userId = tg.initDataUnsafe.user.id;
            console.log('Using Telegram User ID:', userId);
        } else {
            console.warn('Running outside Telegram, using mock ID:', userId);
        }

        const response = await fetch(`${API_BASE}/my-profile?user_id=${userId}`);
        const data = await response.json();

        if (data.investor || data.startup) {
            currentProfile = data.investor || data.startup;
            currentUser = {
                id: userId,
                type: data.investor ? 'investor' : 'startup'
            };
            await loadMatches();
        } else {
            showState(setupState);
        }
    } catch (error) {
        console.error('Profile check failed:', error);
        showState(setupState);
    }
}

// Load matches from API
async function loadMatches() {
    showState(loadingState);

    try {
        const response = await fetch(`${API_BASE}/find-matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                type: currentUser.type
            })
        });

        const data = await response.json();
        matches = data.matches || [];

        if (matches.length > 0) {
            renderCards();
            showState(matchingState);
        } else {
            showState(emptyState);
        }
    } catch (error) {
        console.error('Load matches failed:', error);
        showState(emptyState);
    }
}

// Render cards stack
function renderCards() {
    cardsContainer.innerHTML = '';
    currentCardIndex = 0;

    matches.forEach((match, index) => {
        const card = document.createElement('div');
        card.className = 'tinder-card';
        card.style.zIndex = matches.length - index;

        // Determine image based on type
        const image = match.logo_url || match.pitch_deck_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(match.startup_name || 'Startup')}&background=random&size=400`;

        card.innerHTML = `
            <img src="${image}" class="card-image" alt="Profile">
            <div class="card-content">
                <div class="card-header">
                    <div class="card-title">${match.startup_name || 'Startup'}</div>
                    <div class="match-score">${Math.round(match.match_score)}% Match</div>
                </div>
                <div class="card-subtitle">${match.industry} • ${match.stage}</div>
                
                <div class="tags">
                    ${(match.technologies || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
                
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${match.solution_description || match.problem_statement || 'No description available.'}
                </p>
                
                <div class="match-reasons">
                    ${match.score_breakdown?.industry === 1 ? `
                        <div class="reason">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            Совпадение индустрии
                        </div>
                    ` : ''}
                    ${match.score_breakdown?.investment === 1 ? `
                        <div class="reason">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            Подходящий бюджет
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add touch events for swipe
        initSwipe(card);

        cardsContainer.appendChild(card);
    });
}

// Swipe Logic
function initSwipe(card) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    card.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        card.style.transition = 'none';
    });

    card.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        const rotation = diff * 0.1;

        card.style.transform = `translateX(${diff}px) rotate(${rotation}deg)`;

        // Opacity of "Like"/"Pass" indicators could be added here
    });

    card.addEventListener('touchend', () => {
        isDragging = false;
        card.style.transition = 'transform 0.3s ease';

        const diff = currentX - startX;
        const threshold = 100;

        if (diff > threshold) {
            handleSwipe('right'); // Like
        } else if (diff < -threshold) {
            handleSwipe('left'); // Pass
        } else {
            card.style.transform = 'translateX(0) rotate(0)';
        }
    });
}

// Handle Like/Pass actions
async function handleSwipe(direction) {
    const cards = document.querySelectorAll('.tinder-card');
    if (cards.length === 0) return;

    const currentCard = cards[0]; // Top card
    const match = matches[currentCardIndex];

    // Animate card off screen
    const translateX = direction === 'right' ? 1000 : -1000;
    const rotate = direction === 'right' ? 30 : -30;

    currentCard.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
    currentCard.style.transform = `translateX(${translateX}px) rotate(${rotate}deg)`;
    currentCard.style.opacity = '0';

    // Remove from DOM after animation
    setTimeout(() => {
        currentCard.remove();
        currentCardIndex++;

        if (currentCardIndex >= matches.length) {
            showState(emptyState);
        }
    }, 300);

    // Send API request
    try {
        const response = await fetch(`${API_BASE}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                target_id: match.id,
                action: direction === 'right' ? 'interested' : 'passed',
                type: currentUser.type
            })
        });

        const data = await response.json();

        if (data.is_mutual && direction === 'right') {
            showMatchModal();
        }
    } catch (error) {
        console.error('Action failed:', error);
    }
}

// Profile Setup Logic
function selectRole(role) {
    // For MVP, we'll just auto-create a mock profile based on selection
    // In real app, show a form
    createMockProfile(role);
}

async function createMockProfile(role) {
    showState(loadingState);

    const userId = 12345;
    let body = {};
    let endpoint = '';

    if (role === 'investor') {
        endpoint = '/investor-profile';
        body = {
            user_id: userId,
            investor_type: 'angel',
            investment_range_min: 10000,
            investment_range_max: 100000,
            preferred_stages: ['seed'],
            preferred_industries: ['fintech', 'ai'],
            geographic_focus: ['Kazakhstan'],
            preferred_technologies: ['AI'],
            bio: 'Angel investor interested in AI'
        };
    } else {
        endpoint = '/startup-profile';
        body = {
            user_id: userId,
            startup_name: 'My Startup',
            industry: 'fintech',
            stage: 'seed',
            funding_goal: 50000,
            location: 'Astana',
            technologies: ['React', 'Node'],
            problem_statement: 'Solving payments',
            solution_description: 'AI-powered payment gateway'
        };
    }

    try {
        await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Reload to start matching
        location.reload();
    } catch (error) {
        console.error('Setup failed:', error);
        alert('Failed to create profile');
        showState(setupState);
    }
}

// UI Helpers
function showState(element) {
    [loadingState, setupState, matchingState, emptyState].forEach(el => {
        el.classList.add('hidden');
    });
    element.classList.remove('hidden');
}

function showMatchModal() {
    matchModal.classList.remove('hidden');
    tg.HapticFeedback.notificationOccurred('success');
}

function closeModal() {
    matchModal.classList.add('hidden');
}

function startChat() {
    // Redirect to chat (placeholder)
    alert('Chat feature coming soon!');
    closeModal();
}

function toggleDetails() {
    // Expand card details (placeholder)
    const cards = document.querySelectorAll('.tinder-card');
    if (cards.length > 0) {
        cards[0].classList.toggle('expanded');
    }
}

// Open profile page
function openProfile() {
    window.location.href = 'profile.html';
}
