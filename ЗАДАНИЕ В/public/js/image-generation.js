document.addEventListener('DOMContentLoaded', () => {
    // Initialize translations
    const lang = localStorage.getItem('language') || 'ru';
    if (typeof applyLanguage === 'function') {
        applyLanguage(lang);
    }
    const t = translations[lang];

    const generateBtn = document.getElementById('generateButton');
    const promptInput = document.getElementById('prompt');
    const aspectRatioInput = document.getElementById('aspectRatio');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultImage = document.getElementById('resultImage');
    const spinner = document.querySelector('.loading-spinner');
    const btnText = document.querySelector('.btn-text');
    const errorContainer = document.getElementById('errorContainer');

    promptInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        const aspectRatio = aspectRatioInput.value;

        if (!prompt) {
            showError(t.enter_image_desc || 'Пожалуйста, введите описание изображения');
            promptInput.focus();
            return;
        }

        hideError();
        setLoading(true);
        resultImage.parentElement.style.display = 'none';

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    aspect_ratio: aspectRatio
                })
            });

            const data = await response.json();

            if (data.success && data.images && data.images.length > 0) {
                resultImage.src = data.images[0];
                resultImage.onload = () => {
                    resultImage.parentElement.style.display = 'block';
                    if (window.innerWidth < 768) {
                        resultImage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                };
            } else {
                showError(data.error || t.generation_error || 'Произошла ошибка при генерации');
            }

        } catch (error) {
            console.error('Error:', error);
            showError(t.connection_error || 'Ошибка соединения с сервером. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        generateBtn.disabled = isLoading;
        if (isLoading) {
            spinner.style.display = 'block';
            btnText.textContent = t.creating_masterpiece || 'Создаем шедевр...';
        } else {
            spinner.style.display = 'none';
            // We need to restore the SVG icon here as well, but for simplicity let's just restore text and re-apply translation if needed
            // Or better, just keep the icon in HTML and toggle visibility of spinner/text span
            // The current HTML structure has spinner and btn-text as siblings.
            // When loading, spinner is block.
            // When not loading, spinner is none.
            // btnText content changes.

            // Let's reconstruct the button content to be safe and include the icon
            btnText.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"
                    style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                    <path
                        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                ${t.generate_btn || 'Сгенерировать'}
            `;
        }
    }

    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }

    function hideError() {
        errorContainer.style.display = 'none';
    }
});
