const urlParams = new URLSearchParams(window.location.search);
const newsId = urlParams.get('id');
let userId = 1;

async function syncTelegramUser() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;

        if (user) {
            try {
                const response = await fetch('/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegram_id: user.id,
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        username: user.username || '',
                        photo_url: user.photo_url || ''
                    })
                });

                const data = await response.json();
                if (data.userId) {
                    userId = data.userId;
                    console.log('✅ User synced:', userId);
                    return { ...user, userId: data.userId, photo_url: user.photo_url };
                }
            } catch (error) {
                console.error('❌ Error syncing user:', error);
            }
        }
    }
    return null;
}

// ... (rest of the file)




async function renderNewsDetail() {
    const response = await fetch(`/api/news/${newsId}?userId=${userId}`);
    const news = await response.json();

    const newsContent = document.getElementById('newsContent');
    const timeAgo = getTimeAgo(news.created_at);

    newsContent.innerHTML = `
        <div class="news-detail-author">
            <img src="${news.avatar_url || 'https://i.pravatar.cc/150?img=1'}" alt="${news.first_name}" class="news-detail-avatar">
            <div class="news-detail-author-info">
                <h3>${news.first_name} ${news.last_name}</h3>
                <div class="news-detail-time">${timeAgo}</div>
            </div>
        </div>
        <img src="${news.image_url}" alt="${news.title}" class="news-detail-image">
        <h2 class="news-detail-title">${news.title}</h2>
        <div class="news-detail-description">${news.description.replace(/\n/g, '<br><br>')}</div>
    `;

    document.getElementById('viewsCount').textContent = news.views;

    await renderComments();
}

async function renderComments() {
    const response = await fetch(`/api/news/${newsId}/comments?userId=${userId}`);
    const comments = await response.json();

    document.getElementById('commentsCount').textContent = comments.length;

    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';

    comments.forEach(comment => {
        const timeAgo = getTimeAgo(comment.created_at);
        const isLiked = comment.user_reaction === 'like';
        const isDisliked = comment.user_reaction === 'dislike';

        const commentItem = document.createElement('div');
        commentItem.classList.add('comment-item');
        commentItem.innerHTML = `
            <div class="comment-header">
                <img src="${comment.avatar_url || 'https://i.pravatar.cc/150?img=1'}" alt="${comment.first_name}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-author">
                        <span class="comment-author-name">${comment.first_name} ${comment.last_name}</span>
                        ${comment.reply_to_first_name ? `
                            <div class="reply-badge">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6M3 10l6-6"/>
                                </svg>
                                <span>${comment.reply_to_first_name}</span>
                            </div>
                        ` : ''}
                        <span class="comment-time">${timeAgo}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                    <div class="comment-actions">
                        <button class="comment-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleCommentInteraction(${comment.id}, 'like', this)">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            ${comment.likes}
                        </button>
                        <button class="comment-action-btn ${isDisliked ? 'liked' : ''}" onclick="toggleCommentInteraction(${comment.id}, 'dislike', this)">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                            </svg>
                            ${comment.dislikes}
                        </button>
                        <button class="comment-action-btn" onclick="replyToComment(${comment.id}, '${comment.first_name} ${comment.last_name}')">Ответить</button>
                        <button class="comment-menu-btn" onclick="showCommentMenu(${comment.id})">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        commentsList.appendChild(commentItem);
    });
}

let replyingToId = null;

// ... (existing code)

async function addComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();

    if (text) {
        await fetch(`/api/news/${newsId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                text,
                parent_id: replyingToId
            })
        });

        input.value = '';
        cancelReply(); // Reset reply state
        await renderComments();
    }
}

function replyToComment(commentId, authorName) {
    replyingToId = commentId;
    const indicator = document.getElementById('replyIndicator');
    const nameSpan = document.getElementById('replyingToName');
    const input = document.getElementById('commentInput');

    nameSpan.textContent = authorName;
    indicator.style.display = 'flex';
    input.focus();
    input.placeholder = `Ответ пользователю ${authorName}...`;
}

function cancelReply() {
    replyingToId = null;
    const indicator = document.getElementById('replyIndicator');
    const input = document.getElementById('commentInput');

    indicator.style.display = 'none';
    input.placeholder = 'Написать комментарий...';
}

async function toggleCommentInteraction(commentId, type, button) {
    await fetch(`/api/comments/${commentId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type })
    });

    button.classList.toggle('liked');
    await renderComments();
}

function showCommentMenu(commentId) {
    if (confirm('Пожаловаться на комментарий?')) {
        alert('Жалоба отправлена');
    }
}

function getTimeAgo(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        'год': 31536000,
        'месяц': 2592000,
        'день': 86400,
        'час': 3600,
        'минута': 60
    };

    for (const [name, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value);
        if (interval >= 1) {
            return `${interval} ${name}${interval > 1 ? (name === 'час' ? 'а' : name === 'месяц' ? 'а' : name === 'день' ? 'я' : 'ы') : ''} назад`;
        }
    }
    return 'Только что';
}

document.getElementById('commentInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addComment();
    }
});

async function init() {
    const user = await syncTelegramUser();

    // Increment view count
    fetch(`/api/news/${newsId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });

    if (user && user.photo_url) {
        const commentAvatar = document.querySelector('.comment-form .comment-avatar');
        if (commentAvatar) {
            commentAvatar.src = user.photo_url;
        }
    }

    await renderNewsDetail();
}

init();
