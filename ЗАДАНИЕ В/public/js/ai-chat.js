document.addEventListener('DOMContentLoaded', () => {
    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    if (typeof applyLanguage === 'function') {
        applyLanguage(lang);
    }
    const t = translations[lang];

    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesArea = document.getElementById('messagesArea');

    let chatHistory = [];

    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        if (this.value.trim().length > 0) {
            sendButton.removeAttribute('disabled');
        } else {
            sendButton.setAttribute('disabled', 'true');
        }
    });

    sendButton.addEventListener('click', sendMessage);

    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim().length > 0) {
                sendMessage();
            }
        }
    });

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendButton.setAttribute('disabled', 'true');

        addMessage(text, 'user');

        chatHistory.push({ role: 'user', text: text });

        const typingId = showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    history: chatHistory.slice(0, -1)
                })
            });

            const data = await response.json();

            removeTypingIndicator(typingId);

            if (data.success) {
                addMessage(data.response, 'ai');
                chatHistory.push({ role: 'model', text: data.response });
            } else {
                addMessage(t.ai_error, 'ai');
                console.error('AI Error:', data.error);
            }

        } catch (error) {
            removeTypingIndicator(typingId);
            addMessage(t.network_error, 'ai');
            console.error('Network Error:', error);
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const formattedText = formatMessage(text);

        messageDiv.innerHTML = `
            <div class="message-content">${formattedText}</div>
            <div class="message-time">${time}</div>
        `;

        messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const indicatorDiv = document.createElement('div');
        indicatorDiv.id = id;
        indicatorDiv.classList.add('typing-indicator');
        indicatorDiv.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        messagesArea.appendChild(indicatorDiv);
        scrollToBottom();
        return id;
    }

    function removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    function scrollToBottom() {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function formatMessage(text) {
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

        formatted = formatted.replace(/\n/g, '<br>');

        formatted = formatted.replace(/^- (.*)/gm, '<li>$1</li>');

        return formatted;
    }
});
