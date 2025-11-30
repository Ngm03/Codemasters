Aqmola Hub - Экосистемная Платформа и Telegram Бот

Проект Хакатона: CodeMasters
Команда: NGM
Трек: Задание B (Telegram Бот) и Задание A (Веб-платформа)

Обзор
Aqmola Hub — это комплексная цифровая экосистема, созданная для объединения стартапов, инвесторов и IT-специалистов Акмолинской области. Решение состоит из Веб-платформы (Задание A) и полностью интегрированного Telegram Mini App Бота (Задание B).

Система включает в себя AI-систему матчинга (в стиле Tinder) для стартапов и инвесторов, Обучающий центр (Learning Hub) и единую базу региональных IT-событий и вакансий.

Задание B: Возможности Telegram Бота
Telegram-бот служит основной точкой входа в экосистему, предлагая:
- Бесшовная интеграция Web App: Доступ к полной платформе в один клик через Telegram Mini App.
- Поиск по экосистеме: Мгновенный доступ к стартапам, инвесторам и событиям.
- Идентификация пользователя: Автоматическое распознавание через Telegram initData.
- Уведомления: Оповещения о совпадениях (матчах) и новых возможностях в реальном времени.

Ссылка на бота: https://t.me/NGM03bot
Юзернейм бота: @NGM03bot

Команды
- /start - Запустить Aqmola Hub Mini App и получить приветственное сообщение.
- /help - Посмотреть доступные команды и инструкции.

Установка и Настройка

Требования
- Node.js (v16+)
- MySQL (v8.0+)
- Токен Telegram бота (от @BotFather)
- Ngrok (для локальной разработки/туннелирования)

1. Клонирование репозитория
git clone https://github.com/your-username/aqmola-hub.git
cd aqmola-hub

2. Установка зависимостей
npm install

3. Настройка окружения
Создайте файл .env в корневой директории:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=telegram_miniapp
BOT_TOKEN=your_telegram_bot_token
NGROK_AUTHTOKEN=your_ngrok_token
GEMINI_API_KEY=your_gemini_key
PH_API_TOKEN=your_product_hunt_token
PORT=3000

4. Настройка базы данных
Импортируйте схему базы данных:
# Запустите скрипт миграции
node create_matching_tables.js
# Или импортируйте предоставленный SQL дамп

5. Запуск сервера
npm start

Сервер запустится на порту 3000 (или указанном PORT) и автоматически установит туннель Ngrok для вебхука Telegram.

Стек технологий
- Backend: Node.js, Express.js, MySQL, node-telegram-bot-api
- Frontend: HTML5, CSS3 (Кастомный премиум дизайн), JavaScript (Vanilla)
- AI/ML: Google Gemini (Генерация контента), Кастомный алгоритм матчинга
- Интеграции: Telegram Web Apps, Product Hunt API, HeadHunter API, SerpApi (Google Events)

Структура проекта
public/                 # Фронтенд ресурсы (HTML, CSS, JS)
  css/                  # Стили
  js/                   # Клиентская логика
  images/               # Статические изображения
  matching.html         # Интерфейс матчинга
  learning.html         # Обучающий центр
  ...
server.js               # Основной сервер и логика бота
database.js             # Подключение к БД
create_matching_tables.js # Скрипт миграции БД
...

Лицензия
Этот проект разработан специально для хакатона CodeMasters.
