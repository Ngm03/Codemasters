require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const { execSync, spawn } = require('child_process');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const db = require('./database');
const multer = require('multer');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: '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' });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const PORT = process.env.PORT || 3001;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;

const crypto = require('crypto');
const session = require('express-session');

const app = express();
app.use(express.json());

// Session middleware for admin authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false // Set to true in production with HTTPS
  }
}));
app.use(cors());
app.use(express.static('public'));
app.use('/api/generated-images', express.static(path.join(__dirname, 'generated-images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let bot;
let ngrokUrl = null;
let ngrokProcess = null;

const PH_API_TOKEN = process.env.PH_API_TOKEN;
const PH_API_URL = 'https://api.producthunt.com/v2/api/graphql';

let phCache = {
  posts: [],
  kazakhstanPosts: [],
  lastUpdate: null
};
const PH_CACHE_DURATION = 30 * 60 * 1000;

const HH_API_URL = 'https://api.hh.ru';
const HH_AREA_ASTANA = 160;
const HH_AREA_KAZAKHSTAN = 40;

let hhCache = {
  vacancies: [],
  employers: [],
  lastUpdate: null
};
const HH_CACHE_DURATION = 30 * 60 * 1000;

const SERPAPI_KEY = '04459b8cb782a7a1aab4a3c75b28e7a4ae79c14fd7dbc8ab796ed38c9983e5db';
const SERPAPI_URL = 'https://serpapi.com/search.json';

let eventsCache = {
  events: [],
  lastUpdate: null
};
const EVENTS_CACHE_DURATION = 60 * 60 * 1000;

const aqmolaStartData = {
  startups: [],
  teams: [],
  specialists: [],
  events: []
};

async function fetchProductHuntPosts() {
  if (!PH_API_TOKEN) {
    console.warn('⚠️ PH_API_TOKEN not set, skipping Product Hunt integration');
    return [];
  }

  const query = `
    query {
      posts(first: 50, order: NEWEST) {
        edges {
          node {
            id
            name
            tagline
            votesCount
            commentsCount
            createdAt
            website
            thumbnail {
              url
            }
            user {
              name
              username
            }
            topics {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(PH_API_URL,
      { query },
      {
        headers: {
          'Authorization': `Bearer ${PH_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (response.data.errors) {
      console.error('Product Hunt API errors:', response.data.errors);
      return [];
    }

    return response.data.data.posts.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error fetching Product Hunt posts:', error.message);
    return [];
  }
}

function filterKazakhstanStartups(posts) {
  const keywords = [
    'kazakhstan', 'astana', 'nur-sultan', 'almaty',
    'казахстан', 'астана', 'нур-султан', 'алматы',
    'kz', '.kz', 'kazakh',
    'shymkent', 'шымкент', 'karaganda', 'караганда',
    'aktobe', 'актобе', 'taraz', 'тараз',
    'central asia', 'центральная азия',
    'silk road', 'шелковый путь'
  ];

  return posts.filter(post => {
    const searchText = `
      ${post.name} 
      ${post.tagline} 
      ${post.user.name} 
      ${post.user.username}
      ${post.website || ''}
    `.toLowerCase();

    return keywords.some(keyword => searchText.includes(keyword));
  });
}

async function updatePHCache() {
  const now = Date.now();

  if (phCache.lastUpdate && (now - phCache.lastUpdate) < PH_CACHE_DURATION) {
    return;
  }

  console.log('🔄 Updating Product Hunt cache...');

  try {
    const posts = await fetchProductHuntPosts();

    if (posts.length === 0) {
      console.log('⚠️ No Product Hunt posts fetched');
      return;
    }

    const kazakhstanPosts = filterKazakhstanStartups(posts);

    phCache.posts = posts;
    phCache.kazakhstanPosts = kazakhstanPosts;
    phCache.lastUpdate = now;

    console.log(`✅ PH Cache updated: ${posts.length} total posts, ${kazakhstanPosts.length} from Kazakhstan`);
  } catch (error) {
    console.error('Error updating PH cache:', error.message);
  }
}

updatePHCache();

setInterval(updatePHCache, PH_CACHE_DURATION);

async function fetchHHVacancies() {
  const keywords = [
    'стартап', 'startup', 'Seed', 'Series A', 'MVP',
    'CTO', 'co-founder', 'founder', 'tech lead', 'IT'
  ];

  const searchQuery = keywords.join(' OR ');

  const params = new URLSearchParams({
    host: 'hh.kz',
    area: HH_AREA_ASTANA,
    text: searchQuery,
    per_page: 50,
    order_by: 'publication_time'
  });

  try {
    const response = await axios.get(`${HH_API_URL}/vacancies?${params}`);
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching HH vacancies:', error.message);
    return [];
  }
}

async function fetchHHEmployer(employerId) {
  try {
    const response = await axios.get(`${HH_API_URL}/employers/${employerId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching employer ${employerId}:`, error.message);
    return null;
  }
}

async function updateHHCache() {
  const now = Date.now();

  if (hhCache.lastUpdate && (now - hhCache.lastUpdate) < HH_CACHE_DURATION) {
    return;
  }

  console.log('🔄 Updating HeadHunter cache...');

  try {
    const vacancies = await fetchHHVacancies();

    if (vacancies.length === 0) {
      console.log('⚠️ No HeadHunter vacancies fetched');
      return;
    }

    const employerIds = [...new Set(vacancies.map(v => v.employer.id))];
    const employers = [];

    for (const id of employerIds.slice(0, 20)) {
      const employer = await fetchHHEmployer(id);
      if (employer) {
        employers.push(employer);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    hhCache.vacancies = vacancies;
    hhCache.employers = employers;
    hhCache.lastUpdate = now;

    console.log(`✅ HH Cache updated: ${vacancies.length} vacancies, ${employers.length} employers`);
  } catch (error) {
    console.error('Error updating HH cache:', error.message);
  }
}

function convertHHToStartups() {
  return hhCache.employers.map(employer => ({
    id: `hh_${employer.id}`,
    name: employer.name,
    category: 'Tech',
    stage: 'Hiring',
    description: employer.description?.replace(/<[^>]*>/g, '').substring(0, 200) || 'IT компания в Астане',
    city: 'Астана',
    website: employer.site_url,
    vacancies: hhCache.vacancies.filter(v => v.employer.id === employer.id).length,
    source: 'HeadHunter',
    logo: employer.logo_urls?.['90']
  }));
}

updateHHCache();

setInterval(updateHHCache, HH_CACHE_DURATION);

async function fetchGoogleEvents() {
  const queries = ['IT events Almaty Astana', 'Tech conferences Kazakhstan'];

  for (const query of queries) {
    const params = new URLSearchParams({
      engine: 'google_events',
      q: query,
      hl: 'en',
      gl: 'kz',
      api_key: SERPAPI_KEY
    });

    const url = `${SERPAPI_URL}?${params}`;
    console.log(`🔍 Fetching Google Events for "${query}"...`);

    try {
      const response = await axios.get(url);

      if (response.data.error) {
        console.error('❌ SerpApi error:', response.data.error);
        continue;
      }

      if (response.data.events_results && response.data.events_results.length > 0) {
        console.log(`✅ Found ${response.data.events_results.length} events for "${query}"`);
        return response.data.events_results;
      }
    } catch (error) {
      console.error(`❌ Error fetching events for "${query}":`, error.message);
    }
  }

  console.log('⚠️ No events found for any query');
  return [];
}

async function updateEventsCache() {
  const now = Date.now();

  if (eventsCache.lastUpdate && (now - eventsCache.lastUpdate) < EVENTS_CACHE_DURATION) {
    return;
  }

  console.log('🔄 Updating Google Events cache...');

  try {
    const events = await fetchGoogleEvents();

    if (events.length === 0) {
      console.log('⚠️ No Google Events fetched');
      return;
    }

    eventsCache.events = events;
    eventsCache.lastUpdate = now;

    console.log(`✅ Events Cache updated: ${events.length} events`);
  } catch (error) {
    console.error('Error updating Events cache:', error.message);
  }
}

updateEventsCache();

setInterval(updateEventsCache, EVENTS_CACHE_DURATION);

let teamsCache = {
  teams: [],
  lastUpdate: null
};
const TEAMS_CACHE_DURATION = 24 * 60 * 60 * 1000;

async function fetchGoogleTeams() {
  const searchQueries = [
    'IT команда Казахстан LinkedIn',
    'Software development team Kazakhstan',
    'Tech startup team Astana',
    'IT компания команда Алматы'
  ];

  const allTeams = [];

  for (const query of searchQueries) {
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      hl: 'ru',
      gl: 'kz',
      num: 10,
      api_key: SERPAPI_KEY
    });

    try {
      const response = await axios.get(`${SERPAPI_URL}?${params}`);

      if (response.data.organic_results) {
        const results = response.data.organic_results
          .filter(result =>
            result.link &&
            (result.link.includes('linkedin.com') ||
              result.link.includes('github.com') ||
              result.snippet?.toLowerCase().includes('команд') ||
              result.snippet?.toLowerCase().includes('team'))
          )
          .map(result => ({
            name: result.title,
            description: result.snippet,
            link: result.link,
            source: result.link.includes('linkedin.com') ? 'LinkedIn' :
              result.link.includes('github.com') ? 'GitHub' : 'Web'
          }));

        allTeams.push(...results);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching teams for query "${query}":`, error.message);
    }
  }

  return allTeams;
}

async function updateTeamsCache() {
  const now = Date.now();

  if (teamsCache.lastUpdate && (now - teamsCache.lastUpdate) < TEAMS_CACHE_DURATION) {
    return;
  }

  console.log('🔄 Updating Google Teams cache...');

  try {
    const teams = await fetchGoogleTeams();

    if (teams.length === 0) {
      console.log('⚠️ No Google Teams fetched');
      return;
    }

    teamsCache.teams = teams;
    teamsCache.lastUpdate = now;

    console.log(`✅ Teams Cache updated: ${teams.length} teams`);
  } catch (error) {
    console.error('Error updating Teams cache:', error.message);
  }
}

updateTeamsCache();

setInterval(updateTeamsCache, TEAMS_CACHE_DURATION);

function cleanNgrok() {
  console.log('🔄 Cleaning up ngrok processes...');

  if (ngrokProcess) {
    try {
      ngrokProcess.kill();
      ngrokProcess = null;
    } catch (e) { }
  }

  try {
    execSync('taskkill /IM ngrok.exe /F', { stdio: 'ignore' });
    console.log('✅ System ngrok processes killed via taskkill.');
  } catch (e) {
  }
}

function startNgrokCLI(port, authtoken) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting ngrok via CLI on port ${port}...`);

    ngrokProcess = spawn('npx', ['ngrok', 'http', port.toString(), '--authtoken', authtoken], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    let errorOutput = '';

    ngrokProcess.stdout.on('data', (data) => {
      console.log('Ngrok:', data.toString().trim());
    });

    ngrokProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('Ngrok stderr:', data.toString().trim());
    });

    ngrokProcess.on('error', (error) => {
      reject(new Error(`Failed to start ngrok process: ${error.message}`));
    });

    ngrokProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Ngrok exited with code ${code}: ${errorOutput}`));
      }
    });

    const checkNgrokAPI = async () => {
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
          const tunnels = response.data.tunnels;

          if (tunnels && tunnels.length > 0) {
            const httpsТunnel = tunnels.find(t => t.proto === 'https');
            if (httpsТunnel) {
              const url = httpsТunnel.public_url;
              console.log(`✅ Ngrok tunnel created: ${url}`);
              resolve(url);
              return;
            }
          }
        } catch (error) {
        }
      }

      reject(new Error('Timeout waiting for ngrok to start (20 seconds)'));
    };

    checkNgrokAPI();
  });
}

function isEnglish(text) {
  const latinChars = text.match(/[a-zA-Z\s\.,!?;:]/g);
  return latinChars && latinChars.length > text.length * 0.5;
}

function translateToEnglish(russianText) {
  const translationMap = {
    'пшеница': 'wheat', 'пшеничное поле': 'wheat field', 'поле': 'field', 'сад': 'garden',
    'цветы': 'flowers', 'газон': 'lawn', 'кустарники': 'shrubs', 'фонтан': 'fountain',
    'солнечный день': 'sunny day', 'высокое качество': 'high quality', 'реалистичный': 'realistic',
    'красивый': 'beautiful', 'разноцветные': 'multicolored', 'зеленый': 'green', 'маленький': 'small',
    'посередине': 'in the middle', 'огород': 'vegetable garden', 'томаты': 'tomatoes',
    'картофель': 'potatoes', 'морковь': 'carrots', 'ячмень': 'barley', 'кукуруза': 'corn',
    'люцерна': 'alfalfa',
    'байтерек': 'Baiterek tower in Astana, a futuristic tall white tower with a large golden sphere on top, surrounded by modern architecture, sunny day, 8k resolution, highly detailed',
    'астана': 'Astana city skyline, modern futuristic architecture, skyscrapers, Baiterek tower in the center, golden hour, cinematic lighting, 8k',
    'казахстан': 'Beautiful landscape of Kazakhstan, vast steppes, mountains in the background, yurt, horses, sunny day, national patterns',
    'алматы': 'Almaty city with mountains in the background, Kok Tobe tower, modern buildings mixed with greenery, apple trees, sunny day',
    'хан шатыр': 'Khan Shatyr entertainment center in Astana, a giant transparent tent-like structure, futuristic architecture, modern city background'
  };

  let translatedText = russianText.toLowerCase();
  for (const [russian, english] of Object.entries(translationMap)) {
    translatedText = translatedText.replace(new RegExp(russian, 'g'), english);
  }
  return (translatedText === russianText.toLowerCase() || translatedText.trim() === '') ? 'beautiful agricultural landscape' : translatedText;
}

let googleGenAI = null;
async function getGenAIClient() {
  if (googleGenAI) return googleGenAI;
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  googleGenAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return googleGenAI;
}

async function initBot() {
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing! Check .env file.');
    return;
  }

  try {
    bot = new TelegramBot(BOT_TOKEN);

    cleanNgrok();

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!NGROK_AUTHTOKEN) {
      throw new Error('NGROK_AUTHTOKEN not found in .env file!');
    }

    ngrokUrl = await startNgrokCLI(PORT, NGROK_AUTHTOKEN);

    const webhookUrl = `${ngrokUrl}/webhook`;
    await bot.setWebHook(webhookUrl);
    console.log(`✅ Webhook set: ${webhookUrl}`);

    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from.first_name || 'Friend';

      bot.sendMessage(chatId, `👋 Привет, ${firstName}!\n\nЯ — твой проводник в агро-экосистему.\n\nВсе функции теперь доступны в нашем Mini App! 🚀\n\nНажми на кнопку ниже, чтобы начать:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Открыть Mini App', web_app: { url: ngrokUrl } }]
          ]
        }
      });
    });

  } catch (error) {
    console.error('❌ Bot initialization failed:', error.message);
    console.error('📋 Full error details:', error);

    if (error.message.includes('tunnel')) {
      console.error('💡 Возможные причины:');
      console.error('   1. Проверьте, что NGROK_AUTHTOKEN правильно указан в .env');
      console.error('   2. Убедитесь, что порт', PORT, 'не занят другим процессом');
      console.error('   3. Проверьте интернет-соединение');
      console.error('   4. Попробуйте использовать другой регион (us, eu, ap, au, sa, jp, in)');
    }

    process.exit(1);
  }
}

// --- Admin Authentication Middleware ---
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// --- Admin Auth API ---

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find admin user
    const [users] = await db.query(
      'SELECT id, username, first_name, last_name FROM users WHERE username = ? AND password = ? AND is_admin = TRUE',
      [username, password]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = users[0];

    // Create session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [admin.id]);

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: `${admin.first_name} ${admin.last_name}`
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/admin/check', (req, res) => {
  if (req.session && req.session.adminId) {
    res.json({ authenticated: true, adminId: req.session.adminId });
  } else {
    res.json({ authenticated: false });
  }
});

// Check if telegram user is admin
app.get('/api/admin/check-telegram/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;

    const [users] = await db.query(
      'SELECT id, is_admin FROM users WHERE telegram_id = ?',
      [telegramId]
    );

    if (users.length > 0 && users[0].is_admin) {
      res.json({ isAdmin: true, userId: users[0].id });
    } else {
      res.json({ isAdmin: false });
    }
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Admin API ---

// Get all users
app.get('/api/admin/users', async (req, res) => {
  try {
    console.log('[DEBUG] /api/admin/users called');
    console.log('[DEBUG] Query:', req.query);
    console.log('[DEBUG] Headers:', req.headers);

    // Check if requester is admin
    let telegramId = req.query.adminTelegramId;
    console.log('[DEBUG] telegramId:', telegramId);

    if (!telegramId) {
      console.log('[DEBUG] No telegramId provided -> 401');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [adminCheck] = await db.query(
      'SELECT is_admin FROM users WHERE telegram_id = ?',
      [telegramId]
    );

    if (!adminCheck.length || !adminCheck[0].is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch all users
    const [users] = await db.query(`
      SELECT 
        id, 
        telegram_id, 
        first_name, 
        last_name, 
        username, 
        is_admin, 
        created_at,
        avatar_url
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle admin status
app.put('/api/admin/users/:userId/admin', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin, adminTelegramId } = req.body;

    if (!adminTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if requester is admin
    const [adminCheck] = await db.query(
      'SELECT is_admin FROM users WHERE telegram_id = ?',
      [adminTelegramId]
    );

    if (!adminCheck.length || !adminCheck[0].is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Update user admin status
    await db.query(
      'UPDATE users SET is_admin = ? WHERE id = ?',
      [isAdmin ? 1 : 0, userId]
    );

    res.json({ success: true, userId, isAdmin });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminTelegramId } = req.query;

    if (!adminTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if requester is admin
    const [adminCheck] = await db.query(
      'SELECT is_admin FROM users WHERE telegram_id = ?',
      [adminTelegramId]
    );

    if (!adminCheck.length || !adminCheck[0].is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete user's content first (cascade)
    await db.query('DELETE FROM user_startups WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM user_events WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM user_teams WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM user_vacancies WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM user_news WHERE user_id = ?', [userId]);

    // Delete user
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true, userId });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/admin/pending', async (req, res) => {
  try {
    // Simple admin check (replace with proper auth in production)
    // const userId = req.header('x-user-id');
    // if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [startups] = await db.query('SELECT s.*, u.first_name, u.last_name, u.avatar_url FROM user_startups s JOIN users u ON s.user_id = u.id WHERE s.is_approved = FALSE');
    const [events] = await db.query('SELECT e.*, u.first_name, u.last_name, u.avatar_url FROM user_events e JOIN users u ON e.user_id = u.id WHERE e.is_approved = FALSE');
    const [teams] = await db.query('SELECT t.*, u.first_name, u.last_name, u.avatar_url FROM user_teams t JOIN users u ON t.user_id = u.id WHERE t.is_approved = FALSE');
    const [vacancies] = await db.query('SELECT v.*, u.first_name, u.last_name, u.avatar_url FROM user_vacancies v JOIN users u ON v.user_id = u.id WHERE v.is_approved = FALSE');
    const [news] = await db.query('SELECT n.*, u.first_name, u.last_name, u.avatar_url FROM news n JOIN users u ON n.author_id = u.id WHERE n.is_approved = FALSE');

    res.json({
      startups,
      events,
      teams,
      vacancies,
      news
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/approve', async (req, res) => {
  try {
    const { type, id } = req.body;
    let table;
    switch (type) {
      case 'startup': table = 'user_startups'; break;
      case 'event': table = 'user_events'; break;
      case 'team': table = 'user_teams'; break;
      case 'vacancy': table = 'user_vacancies'; break;
      case 'news': table = 'news'; break;
      default: return res.status(400).json({ error: 'Invalid type' });
    }

    await db.query(`UPDATE ${table} SET is_approved = TRUE WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/reject', async (req, res) => {
  try {
    const { type, id } = req.body;
    let table;
    switch (type) {
      case 'startup': table = 'user_startups'; break;
      case 'event': table = 'user_events'; break;
      case 'team': table = 'user_teams'; break;
      case 'vacancy': table = 'user_vacancies'; break;
      case 'news': table = 'news'; break;
      default: return res.status(400).json({ error: 'Invalid type' });
    }

    await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const mobileRoutes = require('./mobile_routes');
app.use('/api', mobileRoutes);

app.get('/api/data', async (req, res) => {
  await updatePHCache();
  await updateHHCache();
  res.json({
    ...aqmolaStartData,
    productHunt: {
      total: phCache.posts.length,
      kazakhstan: phCache.kazakhstanPosts.length
    },
    headHunter: {
      vacancies: hhCache.vacancies.length,
      employers: hhCache.employers.length
    }
  });
});

app.get('/api/startups', async (req, res) => {
  await updatePHCache();

  const { category, stage, city } = req.query;
  let startups = [...aqmolaStartData.startups];

  // Fetch approved user startups
  try {
    const [userStartups] = await db.query('SELECT * FROM user_startups WHERE is_approved = TRUE ORDER BY created_at DESC');
    const mappedUserStartups = userStartups.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      stage: s.stage,
      description: s.description,
      votes: 0,
      comments: 0,
      website: s.website_url,
      logo_url: s.logo_url,
      founder: 'User', // Could fetch user name if needed
      source: 'User Submission',
      createdAt: s.created_at,
      city: 'Local'
    }));
    startups = [...mappedUserStartups, ...startups];
  } catch (e) {
    console.error('Error fetching user startups:', e);
  }

  const phStartups = phCache.posts.map(post => ({
    id: `ph_${post.id}`,
    name: post.name,
    category: post.topics?.edges[0]?.node?.name || 'Tech',
    stage: 'Product Hunt',
    description: post.tagline,
    votes: post.votesCount,
    comments: post.commentsCount,
    website: post.website,
    founder: post.user.name,
    source: 'Product Hunt',
    createdAt: post.createdAt,
    city: 'Global'
  }));

  startups = [...startups, ...phStartups];

  if (category) startups = startups.filter(s => s.category === category);
  if (stage) startups = startups.filter(s => s.stage === stage);
  if (city) startups = startups.filter(s => s.city === city);
  res.json(startups);
});

app.get('/api/teams', async (req, res) => {
  await updateTeamsCache();

  let teams = [...aqmolaStartData.teams];

  // Fetch approved user teams
  try {
    const [userTeams] = await db.query('SELECT * FROM user_teams WHERE is_approved = TRUE ORDER BY created_at DESC');
    const mappedUserTeams = userTeams.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      members: 'Уточняется',
      city: t.location || 'Казахстан',
      technologies: [],
      contact: t.website_url,
      logo_url: t.logo_url,
      source: 'User Submission',
      link: t.website_url
    }));
    teams = [...mappedUserTeams, ...teams];
  } catch (e) {
    console.error('Error fetching user teams:', e);
  }

  const googleTeams = teamsCache.teams.map((team, index) => ({
    id: `gs_${index}`,
    name: team.name,
    description: team.description || 'IT команда',
    members: 'Уточняется',
    city: 'Казахстан',
    technologies: [],
    contact: team.link,
    source: team.source,
    link: team.link
  }));

  teams = [...teams, ...googleTeams];

  res.json(teams);
});

app.get('/api/specialists', async (req, res) => {
  await updateHHCache();

  const { role, city, available } = req.query;
  let specialists = [...aqmolaStartData.specialists];

  // Fetch approved user vacancies
  try {
    const [userVacancies] = await db.query('SELECT * FROM user_vacancies WHERE is_approved = TRUE ORDER BY created_at DESC');
    const mappedUserVacancies = userVacancies.map(v => ({
      id: v.id,
      name: v.title,
      role: v.title,
      company: v.employer,
      salary: v.salary || 'По договоренности',
      experience: v.experience || 'Не указан',
      city: v.location || 'Астана',
      available: true,
      description: v.description,
      url: v.url,
      source: 'User Submission',
      published: v.created_at
    }));
    specialists = [...mappedUserVacancies, ...specialists];
  } catch (e) {
    console.error('Error fetching user vacancies:', e);
  }

  const hhVacancies = hhCache.vacancies.map(vacancy => ({
    id: `hh_${vacancy.id}`,
    name: vacancy.name,
    role: vacancy.name,
    company: vacancy.employer.name,
    salary: vacancy.salary ?
      `${vacancy.salary.from || ''} - ${vacancy.salary.to || ''} ${vacancy.salary.currency || 'KZT'}`.trim() :
      'По договоренности',
    experience: vacancy.experience?.name || 'Не указан',
    city: 'Астана',
    available: true,
    description: vacancy.snippet?.requirement || '',
    url: vacancy.alternate_url,
    source: 'HeadHunter',
    published: vacancy.published_at
  }));

  specialists = [...specialists, ...hhVacancies];

  if (role) specialists = specialists.filter(s => s.role.toLowerCase().includes(role.toLowerCase()));
  if (city) specialists = specialists.filter(s => s.city === city);
  if (available !== undefined) specialists = specialists.filter(s => s.available === (available === 'true'));

  res.json(specialists);
});

app.get('/api/events', async (req, res) => {
  await updateEventsCache();

  let events = [...aqmolaStartData.events];

  // Fetch approved user events
  try {
    const [userEvents] = await db.query('SELECT * FROM user_events WHERE is_approved = TRUE ORDER BY event_date ASC');
    const mappedUserEvents = userEvents.map(e => ({
      id: e.id,
      name: e.title,
      type: e.category || 'Мероприятие',
      date: e.event_date,
      time: '',
      location: e.location,
      description: e.description,
      link: e.url,
      source: 'User Submission',
      thumbnail: e.image_url,
      venue: e.is_online ? 'Online' : e.location,
      ticket_info: 'Check link'
    }));
    events = [...mappedUserEvents, ...events];
  } catch (e) {
    console.error('Error fetching user events:', e);
  }

  const googleEvents = eventsCache.events.map(event => ({
    id: `ge_${event.title?.replace(/[^a-zA-Z0-9]/g, '_')}`,
    name: event.title,
    type: 'Мероприятие',
    date: event.date?.when || event.date?.start_date || 'Дата уточняется',
    time: event.date?.when || '',
    location: event.address?.join(', ') || 'Астана',
    description: event.description || '',
    link: event.link,
    source: 'Google Events',
    thumbnail: event.thumbnail,
    venue: event.venue?.name,
    ticket_info: event.ticket_info
  }));

  events = [...events, ...googleEvents];

  res.json(events);
});

app.get('/api/ph/posts', async (req, res) => {
  await updatePHCache();
  res.json(phCache.posts);
});

app.get('/api/ph/kazakhstan', async (req, res) => {
  await updatePHCache();
  res.json(phCache.kazakhstanPosts);
});

app.get('/api/hh/vacancies', async (req, res) => {
  await updateHHCache();
  res.json(hhCache.vacancies);
});

app.get('/api/hh/employers', async (req, res) => {
  await updateHHCache();
  res.json(hhCache.employers);
});

app.get('/api/hn/show', async (req, res) => {
  await updateHNCache();
  res.json(hnCache.showStories);
});

app.get('/api/hn/jobs', async (req, res) => {
  await updateHNCache();
  res.json(hnCache.jobStories);
});

app.get('/api/search', (req, res) => {
  const query = req.query.q?.toLowerCase();
  if (!query) return res.json({ results: [] });

  const results = {
    startups: [],
    teams: [],
    specialists: [],
    events: []
  };

  aqmolaStartData.startups.forEach(item => {
    if (item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.technologies.some(t => t.toLowerCase().includes(query))) {
      results.startups.push(item);
    }
  });

  aqmolaStartData.teams.forEach(item => {
    if (item.name.toLowerCase().includes(query) ||
      item.specialization.toLowerCase().includes(query) ||
      item.technologies.some(t => t.toLowerCase().includes(query))) {
      results.teams.push(item);
    }
  });

  aqmolaStartData.specialists.forEach(item => {
    if (item.name.toLowerCase().includes(query) ||
      item.role.toLowerCase().includes(query) ||
      item.skills.some(s => s.toLowerCase().includes(query))) {
      results.specialists.push(item);
    }
  });

  aqmolaStartData.events.forEach(item => {
    if (item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)) {
      results.events.push(item);
    }
  });

  res.json(results);
});

app.get('/api/bot-info', (req, res) => {
  res.json({
    ngrokUrl: ngrokUrl || 'Not created',
    webhookUrl: ngrokUrl ? `${ngrokUrl}/webhook` : 'Not set'
  });
});

app.post('/webhook', (req, res) => {
  if (bot) bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspect_ratio = '1:1' } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });

    let englishPrompt = isEnglish(prompt) ? prompt : translateToEnglish(prompt);

    const API_KEYS = [
      'sk-vIOREWMGWHVA4qVJdYhJIzDzKrhEsrLDT4Qv3ADebNGcy8Mh',
      'sk-NywA0MNH4Ju3jXBWo5eAlozjBcWZ98fblYTgFsmRuijdwfgI'
    ];
    const STABILITY_API_URL = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';

    const formData = new FormData();
    formData.append('prompt', englishPrompt);
    formData.append('aspect_ratio', aspect_ratio);
    formData.append('output_format', 'png');
    formData.append('model', 'sd3.5-medium');

    let response, lastError;
    let success = false;

    for (const apiKey of API_KEYS) {
      try {
        response = await axios({
          method: 'POST',
          url: STABILITY_API_URL,
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'image/*', ...formData.getHeaders() },
          data: formData,
          responseType: 'arraybuffer'
        });
        success = true;
        break;
      } catch (error) {
        lastError = error;
        if (error.response && error.response.status === 402) continue;
        console.error(`API Error (${error.response?.status}):`, error.message);
      }
    }

    if (!success) throw lastError || new Error('All API keys failed');

    const imagesDir = path.join(__dirname, 'generated-images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const filename = `generated-${Date.now()}.png`;
    fs.writeFileSync(path.join(imagesDir, filename), response.data);

    res.json({ success: true, images: [`/api/generated-images/${filename}`] });

  } catch (error) {
    console.error('Image Gen Error:', error.message);
    res.status(500).json({ success: false, error: 'Generation failed', details: error.message });
  }
});


// --- AI Matchmaker ---

app.post('/api/match/specialists', async (req, res) => {
  try {
    const { description, role } = req.body;
    if (!description || !role) return res.status(400).json({ error: 'Missing fields' });

    // Fetch candidates (users)
    const [users] = await db.query('SELECT id, first_name, last_name, username, role, bio FROM users LIMIT 50');

    // Prepare local candidates
    let candidates = users.map(u => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name || ''}`,
      username: u.username,
      role: u.role || 'Specialist',
      bio: u.bio || 'No bio',
      source: 'User'
    }));

    // Add External Teams (LinkedIn/GitHub) from Cache
    if (teamsCache.teams && teamsCache.teams.length > 0) {
      const externalTalent = teamsCache.teams.slice(0, 20).map((t, index) => ({
        id: `ext_${index}`,
        name: t.name,
        username: null,
        role: t.name, // Often the title is the role/team name
        bio: t.description,
        source: t.source || 'External',
        link: t.link
      }));
      candidates = [...candidates, ...externalTalent];
    }

    const prompt = `
      Role: Expert IT Recruiter.
      Task: Find top 3 candidates for the project.
      
      Project: "${description}"
      Role Needed: "${role}"

      Candidates:
      ${JSON.stringify(candidates.map(c => ({ id: c.id, name: c.name, role: c.role, bio: c.bio, source: c.source })))}

      Output JSON ONLY:
      [
        { "id": <user_id_or_string>, "match_score": <0-100>, "message": "<short_personal_message>" }
      ]
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "moonshotai/kimi-k2-instruct-0905",
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 1,
      stream: false,
      stop: null
    });

    const text = chatCompletion.choices[0]?.message?.content?.replace(/```json|```/g, '').trim() || '[]';
    const matches = JSON.parse(text);

    // Merge with candidate data
    const finalResults = matches.map(m => {
      const candidate = candidates.find(c => String(c.id) === String(m.id));
      return { ...m, user: candidate }; // Using 'user' key for frontend compatibility
    });

    res.json(finalResults);
  } catch (error) {
    console.error('Match Specialist Error:', error);
    res.status(500).json({ error: 'AI matching failed' });
  }
});

app.post('/api/match/startups', async (req, res) => {
  try {
    const { skills, role } = req.body;
    if (!skills || !role) return res.status(400).json({ error: 'Missing fields' });

    // Fetch startups from DB
    const [dbStartups] = await db.query('SELECT id, name, description, category, website_url FROM user_startups WHERE is_approved = TRUE LIMIT 50');

    // Prepare DB startups
    let startupList = dbStartups.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      source: 'User',
      website_url: s.website_url
    }));

    // Add Product Hunt startups
    if (phCache.posts && phCache.posts.length > 0) {
      const phStartups = phCache.posts.slice(0, 20).map(p => ({
        id: `ph_${p.id}`,
        name: p.name,
        description: p.tagline,
        category: 'Product Hunt',
        source: 'Product Hunt',
        website_url: p.website
      }));
      startupList = [...startupList, ...phStartups];
    }

    // Add HeadHunter employers
    if (hhCache.employers && hhCache.employers.length > 0) {
      const hhStartups = hhCache.employers.slice(0, 20).map(e => ({
        id: `hh_${e.id}`,
        name: e.name,
        description: e.description?.replace(/<[^>]*>/g, '').substring(0, 200) || 'IT Company',
        category: 'HeadHunter',
        source: 'HeadHunter',
        website_url: e.site_url
      }));
      startupList = [...startupList, ...hhStartups];
    }

    const prompt = `
      Role: Expert Career Coach.
      Task: Find top 3 startups for the specialist.

      Specialist Skills: "${skills}"
      Desired Role: "${role}"

      Startups:
      ${JSON.stringify(startupList.map(s => ({ id: s.id, name: s.name, description: s.description, category: s.category })))}

      Output JSON ONLY:
      [
        { "id": <startup_id>, "match_score": <0-100>, "message": "<short_pitch>" }
      ]
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "moonshotai/kimi-k2-instruct-0905",
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 1,
      stream: false,
      stop: null
    });

    const text = chatCompletion.choices[0]?.message?.content?.replace(/```json|```/g, '').trim() || '[]';
    res.json(JSON.parse(text));
  } catch (error) {
    console.error('Match Startup Error:', error);
    res.status(500).json({ error: 'AI matching failed' });
  }
});

// Audio Upload Configuration
const uploadAudio = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: function (req, file, cb) {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(m4a|mp3|wav|ogg|webm)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

app.post('/api/validate-idea', uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });

    const userId = req.body.userId;

    // Ensure user exists to prevent FK error
    try {
      const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        // Create guest user if not exists (for testing/fallback)
        await pool.query('INSERT INTO users (id, first_name, username) VALUES (?, ?, ?)',
          [userId, 'Guest', 'guest_' + userId]);
        console.log(`[Validator] Created guest user ${userId}`);
      }
    } catch (dbError) {
      console.error('[Validator] DB Error checking user:', dbError);
      // Continue anyway, maybe it's a transient issue or we can proceed without saving history
    }

    const filePath = req.file.path;
    const fileSize = req.file.size;
    console.log(`[Validator] Processing file: ${filePath}, Size: ${fileSize} bytes, Mime: ${req.file.mimetype}`);

    if (fileSize < 100) {
      console.warn('[Validator] File too small, rejecting');
      return res.status(400).json({ error: 'Audio file is too short or empty' });
    }

    // 1. Transcribe with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      temperature: 0,
      response_format: "verbose_json",
    });

    const ideaText = transcription.text;

    // 2. Analyze with LLM
    const prompt = `
      Role: Brutally Honest VC & Startup Expert.
      Task: Analyze this startup idea from a voice note.
      
      Idea: "${ideaText}"

      Instructions:
      1. Detect the language of the idea (Russian, English, etc.).
      2. Respond IN THE SAME LANGUAGE.
      3. Your response should be a single conversational message (Markdown supported).
      4. Structure your response:
         - Acknowledge the idea.
         - Give a quick "Lean Canvas" summary (Problem, Solution, Biz Model) but in a chatty way.
         - Finish with a spicy "Roast" or critique.
      
      Output JSON ONLY:
      {
        "transcription": "${ideaText.replace(/"/g, '\\"')}",
        "response": "<your_markdown_response>"
      }
    `;

    const analysis = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "moonshotai/kimi-k2-instruct-0905",
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(analysis.choices[0]?.message?.content || '{}');

    // Save to History
    if (userId) {
      try {
        await db.query(
          'INSERT INTO idea_validations (user_id, transcription, response) VALUES (?, ?, ?)',
          [userId, result.transcription, result.response]
        );
      } catch (dbError) {
        console.error('Error saving validation history:', dbError);
        // Don't fail the request if saving fails
      }
    }

    fs.unlinkSync(filePath); // Cleanup temp file
    res.json(result);

  } catch (error) {
    console.error('Validation Error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Cleanup on error
    res.status(500).json({ error: 'Validation failed: ' + error.message });
  }
});

// Get Validation History
app.get('/api/validate-idea/history', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const [rows] = await db.query(
      'SELECT * FROM idea_validations WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('History Error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});


const { initNewsDatabase } = require('./init_news_db');

app.get('/api/news/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM news_categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/news', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const subscribed = req.query.subscribed === 'true';

    // Fetch local news
    let query = `
          SELECT n.*, 
            c.name as category_name, c.slug as category_slug,
            u.first_name, u.last_name, u.avatar_url,
            (SELECT COUNT(*) FROM news_interactions WHERE news_id = n.id AND type = 'like') as likes,
            (SELECT COUNT(*) FROM news_interactions WHERE news_id = n.id AND type = 'dislike') as dislikes,
            (SELECT COUNT(*) FROM news_comments WHERE news_id = n.id) as comments_count,
            (SELECT type FROM news_interactions WHERE news_id = n.id AND user_id = ? AND type IN ('like', 'dislike')) as user_reaction,
            (SELECT COUNT(*) FROM news_interactions WHERE news_id = n.id AND user_id = ? AND type = 'favorite') as is_favorited
          FROM news n
          JOIN news_categories c ON n.category_id = c.id
          JOIN users u ON n.author_id = u.id
          WHERE n.is_approved = TRUE
        `;

    let localNews = [];
    if (subscribed) {
      query += ` AND c.id IN (SELECT category_id FROM user_subscriptions WHERE user_id = ?)`;
      const [rows] = await db.query(query + ' ORDER BY n.created_at DESC', [userId, userId, userId]);
      localNews = rows;
    } else {
      const [rows] = await db.query(query + ' ORDER BY n.created_at DESC', [userId, userId]);
      localNews = rows;
    }

    // Fetch external IT news
    let externalNews = [];
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          qInTitle: 'IT OR программирование OR "искусственный интеллект" OR "разработка по" OR "нейросеть" OR "кибербезопасность" OR "блокчейн" OR "стартап" OR apple OR google OR microsoft OR "язык программирования"',
          language: 'ru',
          sortBy: 'publishedAt',
          apiKey: '182c536cb2d34f30bdaaf0b71611fe3e'
        }
      });

      if (response.data.articles) {
        externalNews = response.data.articles
          .filter(article =>
            article.urlToImage &&
            article.urlToImage.startsWith('http') &&
            article.title &&
            article.description
          )
          .map((article, index) => ({
            id: -(index + 1), // Negative ID for external news
            title: article.title,
            description: article.description,
            image_url: article.urlToImage,
            category_name: 'IT News',
            first_name: article.source.name || 'Unknown',
            last_name: '',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(article.source.name || 'N')}&background=random&color=fff`,
            created_at: article.publishedAt, // ISO format is handled by Date() in frontend
            likes: 0,
            dislikes: 0,
            comments_count: 0,
            user_reaction: null,
            is_favorited: 0,
            is_external: true,
            external_url: article.url
          }));
      }
    } catch (apiError) {
      console.error('NewsAPI Error:', apiError.message);
    }

    // Merge and sort by date
    const allNews = [...localNews, ...externalNews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allNews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/news/:id', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [news] = await db.query(`
      SELECT n.*, 
        c.name as category_name, c.slug as category_slug,
        u.first_name, u.last_name, u.avatar_url,
        (SELECT COUNT(*) FROM news_interactions WHERE news_id = n.id AND type = 'like') as likes,
        (SELECT COUNT(*) FROM news_interactions WHERE news_id = n.id AND type = 'dislike') as dislikes,
        (SELECT type FROM news_interactions WHERE news_id = n.id AND user_id = ? AND type IN ('like', 'dislike')) as user_reaction,
        (SELECT COUNT(*) FROM news_interactions WHERE news_id = n.id AND user_id = ? AND type = 'favorite') as is_favorited
      FROM news n
      JOIN news_categories c ON n.category_id = c.id
      JOIN users u ON n.author_id = u.id
      WHERE n.id = ?
    `, [userId, userId, req.params.id]);

    if (news.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }

    res.json(news[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/news/:id/view', async (req, res) => {
  try {
    const { userId } = req.body;
    const newsId = req.params.id;
    const finalUserId = userId || 1;
    console.log(`[VIEW] Request for news ${newsId} from user ${finalUserId}`);

    try {
      await db.query('INSERT INTO news_views (news_id, user_id) VALUES (?, ?)', [newsId, finalUserId]);
      console.log(`[VIEW] Insert success, incrementing views`);
      await db.query('UPDATE news SET views = views + 1 WHERE id = ?', [newsId]);
      res.json({ success: true, viewed: true });
    } catch (e) {
      console.log(`[VIEW] Insert failed: ${e.code} (${e.errno})`);
      if (e.errno === 1062 || e.code === 'ER_DUP_ENTRY') { // Duplicate entry
        res.json({ success: true, viewed: false, message: 'Already viewed' });
      } else {
        throw e;
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/news/:id/interact', async (req, res) => {
  try {
    const { userId, type } = req.body;
    const newsId = req.params.id;

    if (!['like', 'dislike', 'favorite'].includes(type)) {
      return res.status(400).json({ error: 'Invalid interaction type' });
    }

    const [existing] = await db.query(
      'SELECT * FROM news_interactions WHERE news_id = ? AND user_id = ? AND type = ?',
      [newsId, userId, type]
    );

    if (existing.length > 0) {
      await db.query('DELETE FROM news_interactions WHERE id = ?', [existing[0].id]);
      res.json({ action: 'removed' });
    } else {
      if (type === 'like' || type === 'dislike') {
        await db.query(
          'DELETE FROM news_interactions WHERE news_id = ? AND user_id = ? AND type IN (?, ?)',
          [newsId, userId, 'like', 'dislike']
        );
      }
      await db.query(
        'INSERT INTO news_interactions (news_id, user_id, type) VALUES (?, ?, ?)',
        [newsId, userId, type]
      );
      res.json({ action: 'added' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/news/:id/comments', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [comments] = await db.query(`
      SELECT c.*,
        u.first_name, u.last_name, u.avatar_url,
        pu.first_name as reply_to_first_name, pu.last_name as reply_to_last_name,
        (SELECT COUNT(*) FROM comment_interactions WHERE comment_id = c.id AND type = 'like') as likes,
        (SELECT COUNT(*) FROM comment_interactions WHERE comment_id = c.id AND type = 'dislike') as dislikes,
        (SELECT type FROM comment_interactions WHERE comment_id = c.id AND user_id = ?) as user_reaction
      FROM news_comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN news_comments pc ON c.parent_id = pc.id
      LEFT JOIN users pu ON pc.user_id = pu.id
      WHERE c.news_id = ?
      ORDER BY c.created_at DESC
    `, [userId, req.params.id]);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/news/:id/comments', async (req, res) => {
  try {
    const { userId, text, parent_id } = req.body;
    const newsId = req.params.id;

    await db.query(
      'INSERT INTO news_comments (news_id, user_id, text, parent_id) VALUES (?, ?, ?, ?)',
      [newsId, userId, text, parent_id || null]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/comments/:id/interact', async (req, res) => {
  try {
    const { userId, type } = req.body;
    const commentId = req.params.id;

    const [existing] = await db.query(
      'SELECT * FROM comment_interactions WHERE comment_id = ? AND user_id = ? AND type = ?',
      [commentId, userId, type]
    );

    if (existing.length > 0) {
      await db.query('DELETE FROM comment_interactions WHERE id = ?', [existing[0].id]);
      res.json({ action: 'removed' });
    } else {
      await db.query(
        'DELETE FROM comment_interactions WHERE comment_id = ? AND user_id = ? AND type IN (?, ?)',
        [commentId, userId, 'like', 'dislike']
      );
      await db.query(
        'INSERT INTO comment_interactions (comment_id, user_id, type) VALUES (?, ?, ?)',
        [commentId, userId, type]
      );
      res.json({ action: 'added' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/subscriptions', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [subscriptions] = await db.query(`
      SELECT c.* FROM news_categories c
      JOIN user_subscriptions s ON c.id = s.category_id
      WHERE s.user_id = ?
    `, [userId]);
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const { userId, categoryId } = req.body;
    await db.query(
      'INSERT IGNORE INTO user_subscriptions (user_id, category_id) VALUES (?, ?)',
      [userId, categoryId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subscriptions/:categoryId', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    await db.query(
      'DELETE FROM user_subscriptions WHERE user_id = ? AND category_id = ?',
      [userId, req.params.categoryId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/sync', async (req, res) => {
  try {
    const { telegram_id, first_name, last_name, username, photo_url } = req.body;

    const [existing] = await db.query('SELECT id, is_admin FROM users WHERE telegram_id = ?', [telegram_id]);

    if (existing.length > 0) {
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, avatar_url = ? WHERE telegram_id = ?',
        [first_name, last_name, username, photo_url, telegram_id]
      );
      res.json({
        userId: existing[0].id,
        isAdmin: existing[0].is_admin || false,
        synced: true
      });
    } else {
      const [result] = await db.query(
        'INSERT INTO users (telegram_id, first_name, last_name, username, avatar_url) VALUES (?, ?, ?, ?, ?)',
        [telegram_id, first_name, last_name, username, photo_url]
      );
      res.json({
        userId: result.insertId,
        isAdmin: false,
        synced: true
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

    if (users.length > 0) {
      res.json(users[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name } = req.body;

    await db.query('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?', [first_name, last_name, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { language, theme } = req.body;

    let query = 'UPDATE users SET ';
    let params = [];
    let updates = [];

    if (language) {
      updates.push('language = ?');
      params.push(language);
    }

    if (theme) {
      updates.push('theme = ?');
      params.push(theme);
    }

    if (updates.length === 0) {
      return res.json({ success: true });
    }

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/security', async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, email, password } = req.body;

    let query = 'UPDATE users SET phone = ?, email = ?';
    let params = [phone, email];

    if (password) {
      query += ', password = ?';
      params.push(password);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/favorites/startups', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [rows] = await db.query(`
      SELECT item_id FROM user_favorites 
      WHERE user_id = ? AND item_type = 'startup'
    `, [userId]);
    const favoriteIds = rows.map(r => String(r.item_id));

    if (favoriteIds.length === 0) return res.json([]);

    await updatePHCache();
    let startups = [...aqmolaStartData.startups];
    const phStartups = phCache.posts.map(post => ({
      id: `ph_${post.id}`,
      name: post.name,
      category: post.topics?.edges[0]?.node?.name || 'Tech',
      stage: 'Product Hunt',
      description: post.tagline,
      votes: post.votesCount,
      comments: post.commentsCount,
      website: post.website,
      founder: post.user.name,
      source: 'Product Hunt',
      createdAt: post.createdAt,
      city: 'Global'
    }));
    startups = [...startups, ...phStartups];

    const favorites = startups.filter(s => favoriteIds.includes(String(s.id)));
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/favorites/events', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [rows] = await db.query(`
      SELECT item_id FROM user_favorites 
      WHERE user_id = ? AND item_type = 'event'
    `, [userId]);
    const favoriteIds = rows.map(r => String(r.item_id));

    if (favoriteIds.length === 0) return res.json([]);

    await updateEventsCache();
    let events = [...aqmolaStartData.events];
    const googleEvents = eventsCache.events.map(event => ({
      id: `ge_${event.title?.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: event.title,
      type: 'Мероприятие',
      date: event.date?.start_date || 'Скоро',
      time: event.date?.when || '',
      location: event.address?.join(', ') || 'Онлайн',
      description: event.description,
      thumbnail: event.thumbnail,
      link: event.link,
      source: 'Google Events'
    }));
    events = [...events, ...googleEvents];

    const favorites = events.filter(e => favoriteIds.includes(String(e.id)));
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/favorites/teams', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [rows] = await db.query(`
      SELECT item_id FROM user_favorites 
      WHERE user_id = ? AND item_type = 'team'
    `, [userId]);
    const favoriteIds = rows.map(r => String(r.item_id));

    if (favoriteIds.length === 0) return res.json([]);

    await updateTeamsCache();
    let teams = [...aqmolaStartData.teams];
    const googleTeams = teamsCache.teams.map((team, index) => ({
      id: `gs_${index}`,
      name: team.name,
      description: team.description || 'IT команда',
      members: 'Уточняется',
      city: 'Казахстан',
      technologies: [],
      contact: team.link,
      source: team.source,
      link: team.link
    }));
    teams = [...teams, ...googleTeams];

    const favorites = teams.filter(t => favoriteIds.includes(String(t.id)));
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/favorites/vacancies', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [rows] = await db.query(`
      SELECT item_id FROM user_favorites 
      WHERE user_id = ? AND item_type = 'vacancy'
    `, [userId]);
    const favoriteIds = rows.map(r => String(r.item_id));

    if (favoriteIds.length === 0) return res.json([]);

    await updateHHCache();
    let specialists = [...aqmolaStartData.specialists];
    const hhVacancies = hhCache.vacancies.map(vacancy => ({
      id: `hh_${vacancy.id}`,
      name: vacancy.name,
      role: vacancy.name,
      company: vacancy.employer.name,
      salary: vacancy.salary ?
        `${vacancy.salary.from || ''} - ${vacancy.salary.to || ''} ${vacancy.salary.currency || 'KZT'}`.trim() :
        'По договоренности',
      experience: vacancy.experience?.name || 'Не указан',
      city: 'Астана',
      available: true,
      description: vacancy.snippet?.requirement || '',
      url: vacancy.alternate_url,
      source: 'HeadHunter',
      published: vacancy.published_at
    }));
    specialists = [...specialists, ...hhVacancies];

    const favorites = specialists.filter(s => favoriteIds.includes(String(s.id)));
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const { userId, itemType, itemId } = req.body;
    await db.query(`
      INSERT INTO user_favorites (user_id, item_type, item_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
    `, [userId, itemType, itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/favorites', async (req, res) => {
  try {
    const { userId, itemType, itemId } = req.body;
    await db.query(`
      DELETE FROM user_favorites
      WHERE user_id = ? AND item_type = ? AND item_id = ?
    `, [userId, itemType, itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// --- News Submission ---
app.post('/api/news', upload.single('image'), async (req, res) => {
  try {
    const { userId, title, description, category_id } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!userId || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.query(
      'INSERT INTO news (author_id, title, description, category_id, image_url, is_approved) VALUES (?, ?, ?, ?, ?, FALSE)',
      [userId, title, description, category_id || 1, image_url]
    );

    res.json({ success: true, message: 'News submitted for moderation' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/favorites/news', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [favorites] = await db.query(`
            SELECT n.* FROM news n
            JOIN news_interactions ni ON n.id = ni.news_id
            WHERE ni.user_id = ? AND ni.type = 'favorite'
        `, [userId]);
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Live Market API ---

// Get active market posts
app.get('/api/market', async (req, res) => {
  try {
    const [posts] = await db.query(`
      SELECT 
        mp.id, 
        mp.type, 
        mp.content, 
        mp.created_at, 
        u.first_name, 
        u.last_name, 
        u.username, 
        u.avatar_url,
        mp.user_id
      FROM market_posts mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.is_active = TRUE
      ORDER BY mp.created_at DESC
      LIMIT 50
    `);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching market posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new market post
app.post('/api/market', async (req, res) => {
  try {
    const { telegramId, type, content } = req.body;

    if (!telegramId || !type || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user ID
    const [users] = await db.query('SELECT id FROM users WHERE telegram_id = ?', [telegramId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = users[0].id;

    await db.query(
      'INSERT INTO market_posts (user_id, type, content) VALUES (?, ?, ?)',
      [userId, type, content]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating market post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete a market post
app.delete('/api/market/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { telegramId } = req.body; // Pass telegramId in body for auth check

    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership or admin status
    const [users] = await db.query('SELECT id, is_admin FROM users WHERE telegram_id = ?', [telegramId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];

    const [post] = await db.query('SELECT user_id FROM market_posts WHERE id = ?', [id]);
    if (post.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post[0].user_id !== user.id && !user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.query('DELETE FROM market_posts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting market post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ==================== LEARNING HUB API ====================

// Learning Hub Cache
let learningCache = {
  videos: { data: [], lastUpdate: null },
  courses: { data: [], lastUpdate: null },
  articles: { data: [], lastUpdate: null }
};
const LEARNING_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// YouTube Videos via SerpAPI
app.get('/api/learning/videos', async (req, res) => {
  try {
    const query = req.query.query || 'javascript tutorial';
    const cacheKey = `videos_${query}`;

    // Check cache
    if (learningCache.videos.lastUpdate &&
      Date.now() - learningCache.videos.lastUpdate < LEARNING_CACHE_DURATION &&
      learningCache.videos.query === query) {
      return res.json(learningCache.videos.data);
    }

    const response = await axios.get(SERPAPI_URL, {
      params: {
        engine: 'youtube',
        search_query: query,
        api_key: SERPAPI_KEY
      }
    });

    const videos = (response.data.video_results || []).map(video => ({
      title: video.title,
      channel: video.channel?.name || 'Unknown',
      duration: video.length || '0:00',
      views: video.views || 0,
      thumbnail: video.thumbnail?.static || '',
      link: video.link,
      published: video.published_date || ''
    }));

    learningCache.videos = {
      data: videos,
      lastUpdate: Date.now(),
      query: query
    };

    res.json(videos);
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// freeCodeCamp Courses via GraphQL
app.get('/api/learning/courses', async (req, res) => {
  try {
    // Check cache
    if (learningCache.courses.lastUpdate &&
      Date.now() - learningCache.courses.lastUpdate < LEARNING_CACHE_DURATION) {
      return res.json(learningCache.courses.data);
    }

    // Fallback mock courses in case API fails
    const mockCourses = [
      {
        id: 1,
        title: 'Responsive Web Design',
        description: 'Learn HTML, CSS, and responsive design principles',
        lessons: 300,
        hours: 300,
        certification: true,
        link: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/'
      },
      {
        id: 2,
        title: 'JavaScript Algorithms And Data Structures',
        description: 'Master JavaScript fundamentals and algorithms',
        lessons: 300,
        hours: 300,
        certification: true,
        link: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/'
      },
      {
        id: 3,
        title: 'Front End Development Libraries',
        description: 'Learn React, Redux, and modern frontend tools',
        lessons: 300,
        hours: 300,
        certification: true,
        link: 'https://www.freecodecamp.org/learn/front-end-development-libraries/'
      },
      {
        id: 4,
        title: 'Data Visualization',
        description: 'Create interactive data visualizations with D3.js',
        lessons: 300,
        hours: 300,
        certification: true,
        link: 'https://www.freecodecamp.org/learn/data-visualization/'
      },
      {
        id: 5,
        title: 'Back End Development And APIs',
        description: 'Build APIs with Node.js and Express',
        lessons: 300,
        hours: 300,
        certification: true,
        link: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/'
      },
      {
        id: 6,
        title: 'Machine Learning With Python',
        description: 'Introduction to machine learning and neural networks',
        lessons: 300,
        hours: 300,
        certification: true,
        link: 'https://www.freecodecamp.org/learn/machine-learning-with-python/'
      }
    ];

    try {
      const graphqlQuery = {
        query: `
          query {
            curriculum {
              superblocks
            }
          }
        `
      };

      const response = await axios.post('https://www.freecodecamp.org/graphql', graphqlQuery, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (response.data && response.data.data && response.data.data.curriculum && response.data.data.curriculum.superblocks) {
        const superblocks = response.data.data.curriculum.superblocks;

        const courses = superblocks.map((block, index) => ({
          id: index,
          title: block.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Learn ${block.replace(/-/g, ' ')} with freeCodeCamp`,
          lessons: 300,
          hours: 300,
          certification: true,
          link: `https://www.freecodecamp.org/learn/${block}/`
        }));

        learningCache.courses = {
          data: courses,
          lastUpdate: Date.now()
        };

        return res.json(courses);
      } else {
        console.warn('freeCodeCamp API returned unexpected format, using mock data');
        learningCache.courses = {
          data: mockCourses,
          lastUpdate: Date.now()
        };
        return res.json(mockCourses);
      }
    } catch (apiError) {
      console.warn('freeCodeCamp API error, using mock data:', apiError.message);
      learningCache.courses = {
        data: mockCourses,
        lastUpdate: Date.now()
      };
      return res.json(mockCourses);
    }
  } catch (error) {
    console.error('Error in courses endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Dev.to Articles via REST API
app.get('/api/learning/articles', async (req, res) => {
  try {
    const tags = req.query.tags || 'javascript,webdev';
    const cacheKey = `articles_${tags}`;

    // Check cache
    if (learningCache.articles.lastUpdate &&
      Date.now() - learningCache.articles.lastUpdate < LEARNING_CACHE_DURATION &&
      learningCache.articles.tags === tags) {
      return res.json(learningCache.articles.data);
    }

    const response = await axios.get('https://dev.to/api/articles', {
      params: {
        per_page: 20,
        tag: tags
      }
    });

    const articles = response.data.map(article => ({
      title: article.title,
      author: article.user.name,
      tags: article.tag_list,
      reading_time: article.reading_time_minutes || 5,
      url: article.url,
      cover_image: article.cover_image || '',
      published_at: article.published_at
    }));

    learningCache.articles = {
      data: articles,
      lastUpdate: Date.now(),
      tags: tags
    };

    res.json(articles);
  } catch (error) {
    console.error('Error fetching Dev.to articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Save Learning Progress
app.post('/api/learning/progress', async (req, res) => {
  try {
    const { userId, itemId, itemType, progress } = req.body;

    await db.query(
      'INSERT INTO learning_progress (user_id, item_id, item_type, progress) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE progress = ?',
      [userId, itemId, itemType, progress, progress]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// ==================== END LEARNING HUB API ====================

// ==================== MATCHING SYSTEM API ====================

// Helper to get user ID from initData (mock for now, replace with actual validation)
const getUserIdFromInitData = async (initData) => {
  // In production, validate initData and extract user ID
  // For now, we'll assume the client sends a valid user ID in a header or we decode it
  // This is a placeholder. In real app, verify Telegram WebApp data.
  return 12345; // Mock user ID
};

// Create/Update Investor Profile
app.post('/api/matching/investor-profile', async (req, res) => {
  try {
    const {
      user_id, // In real app, get from auth/initData
      investor_type = null,
      investment_range_min = null,
      investment_range_max = null,
      preferred_stages = [],
      preferred_industries = [],
      geographic_focus = [],
      portfolio_size = null,
      successful_exits = null,
      preferred_technologies = [],
      bio = null,
      linkedin_url = null,
      website_url = null
    } = req.body;

    // Check if profile exists
    const [existing] = await db.execute(
      'SELECT id FROM investor_profiles WHERE user_id = ?',
      [user_id]
    );

    if (existing.length > 0) {
      // Update
      await db.execute(`
        UPDATE investor_profiles SET
          investor_type = ?, investment_range_min = ?, investment_range_max = ?,
          preferred_stages = ?, preferred_industries = ?, geographic_focus = ?,
          portfolio_size = ?, successful_exits = ?, preferred_technologies = ?,
          bio = ?, linkedin_url = ?, website_url = ?
        WHERE user_id = ?
      `, [
        investor_type, investment_range_min, investment_range_max,
        JSON.stringify(preferred_stages || []), JSON.stringify(preferred_industries || []), JSON.stringify(geographic_focus || []),
        portfolio_size, successful_exits, JSON.stringify(preferred_technologies || []),
        bio, linkedin_url, website_url, user_id
      ]);
    } else {
      // Create
      await db.execute(`
        INSERT INTO investor_profiles (
          user_id, investor_type, investment_range_min, investment_range_max,
          preferred_stages, preferred_industries, geographic_focus,
          portfolio_size, successful_exits, preferred_technologies,
          bio, linkedin_url, website_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user_id, investor_type, investment_range_min, investment_range_max,
        JSON.stringify(preferred_stages || []), JSON.stringify(preferred_industries || []), JSON.stringify(geographic_focus || []),
        portfolio_size, successful_exits, JSON.stringify(preferred_technologies || []),
        bio, linkedin_url, website_url
      ]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving investor profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Create/Update Startup Profile
app.post('/api/matching/startup-profile', async (req, res) => {
  try {
    const {
      user_id, // In real app, get from auth/initData
      startup_name = null,
      industry = null,
      stage = null,
      funding_goal = null,
      current_revenue = null,
      team_size = null,
      founded_year = null,
      location = null,
      technologies = [],
      problem_statement = null,
      solution_description = null,
      target_market = null,
      competitive_advantage = null,
      pitch_deck_url = null,
      website_url = null,
      demo_url = null
    } = req.body;

    // Check if profile exists
    const [existing] = await db.execute(
      'SELECT id FROM startup_profiles WHERE user_id = ?',
      [user_id]
    );

    if (existing.length > 0) {
      // Update
      await db.execute(`
        UPDATE startup_profiles SET
          startup_name = ?, industry = ?, stage = ?, funding_goal = ?,
          current_revenue = ?, team_size = ?, founded_year = ?, location = ?,
          technologies = ?, problem_statement = ?, solution_description = ?,
          target_market = ?, competitive_advantage = ?, pitch_deck_url = ?,
          website_url = ?, demo_url = ?
        WHERE user_id = ?
      `, [
        startup_name, industry, stage, funding_goal,
        current_revenue, team_size, founded_year, location,
        JSON.stringify(technologies || []), problem_statement, solution_description,
        target_market, competitive_advantage, pitch_deck_url,
        website_url, demo_url, user_id
      ]);
    } else {
      // Create
      await db.execute(`
        INSERT INTO startup_profiles (
          user_id, startup_name, industry, stage, funding_goal,
          current_revenue, team_size, founded_year, location,
          technologies, problem_statement, solution_description,
          target_market, competitive_advantage, pitch_deck_url,
          website_url, demo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user_id, startup_name, industry, stage, funding_goal,
        current_revenue, team_size, founded_year, location,
        JSON.stringify(technologies || []), problem_statement, solution_description,
        target_market, competitive_advantage, pitch_deck_url,
        website_url, demo_url
      ]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving startup profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Get My Profile
app.get('/api/matching/my-profile', async (req, res) => {
  try {
    const userId = req.query.user_id; // In real app, get from auth

    const [investor] = await db.execute(
      'SELECT * FROM investor_profiles WHERE user_id = ?',
      [userId]
    );

    const [startup] = await db.execute(
      'SELECT * FROM startup_profiles WHERE user_id = ?',
      [userId]
    );

    res.json({
      investor: investor[0] || null,
      startup: startup[0] || null
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Find Matches (The AI Algorithm)
app.post('/api/matching/find-matches', async (req, res) => {
  try {
    const { user_id, type } = req.body; // type: 'investor' or 'startup'

    let matches = [];

    if (type === 'investor') {
      // User is investor, looking for startups
      const [investorProfile] = await db.execute(
        'SELECT * FROM investor_profiles WHERE user_id = ?',
        [user_id]
      );

      if (!investorProfile[0]) return res.status(404).json({ error: 'Profile not found' });
      const investor = investorProfile[0];

      // Get all startups not yet matched/passed
      const [startups] = await db.execute(`
        SELECT s.* FROM startup_profiles s
        LEFT JOIN matches m ON m.startup_id = s.id AND m.investor_id = ?
        WHERE m.id IS NULL
      `, [investor.id]);

      // Calculate scores
      matches = startups.map(startup => {
        let score = 0;
        const breakdown = {};

        // 1. Industry Match (30%)
        const preferredIndustries = typeof investor.preferred_industries === 'string'
          ? JSON.parse(investor.preferred_industries)
          : investor.preferred_industries || [];

        if (preferredIndustries.includes(startup.industry)) {
          score += 30;
          breakdown.industry = 1.0;
        } else {
          breakdown.industry = 0;
        }

        // 2. Stage Match (25%)
        const preferredStages = typeof investor.preferred_stages === 'string'
          ? JSON.parse(investor.preferred_stages)
          : investor.preferred_stages || [];

        if (preferredStages.includes(startup.stage)) {
          score += 25;
          breakdown.stage = 1.0;
        } else {
          breakdown.stage = 0;
        }

        // 3. Investment Range (20%)
        if (startup.funding_goal >= investor.investment_range_min &&
          startup.funding_goal <= investor.investment_range_max) {
          score += 20;
          breakdown.investment = 1.0;
        } else {
          // Partial score if close
          breakdown.investment = 0;
        }

        // 4. Geography (15%)
        const geoFocus = typeof investor.geographic_focus === 'string'
          ? JSON.parse(investor.geographic_focus)
          : investor.geographic_focus || [];

        if (geoFocus.includes(startup.location) || geoFocus.includes('Global')) {
          score += 15;
          breakdown.geography = 1.0;
        } else {
          breakdown.geography = 0;
        }

        // 5. Tech Stack (10%)
        const preferredTech = typeof investor.preferred_technologies === 'string'
          ? JSON.parse(investor.preferred_technologies)
          : investor.preferred_technologies || [];
        const startupTech = typeof startup.technologies === 'string'
          ? JSON.parse(startup.technologies)
          : startup.technologies || [];

        const techOverlap = startupTech.filter(t => preferredTech.includes(t)).length;
        if (techOverlap > 0) {
          score += 10;
          breakdown.technology = 1.0;
        } else {
          breakdown.technology = 0;
        }

        return {
          ...startup,
          match_score: score,
          score_breakdown: breakdown
        };
      });

    } else {
      // User is startup, looking for investors
      // Similar logic reversed...
      // For MVP, let's focus on Investor finding Startups first
    }

    // Sort by score
    matches.sort((a, b) => b.match_score - a.match_score);

    res.json({ matches });
  } catch (error) {
    console.error('Error finding matches:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// Express Interest (Like/Pass)
app.post('/api/matching/like', async (req, res) => {
  try {
    const { user_id, target_id, action, type } = req.body; // action: 'interested' or 'passed'

    let investor_id, startup_id;
    let updateField;

    if (type === 'investor') {
      // Get investor profile ID
      const [inv] = await db.execute('SELECT id FROM investor_profiles WHERE user_id = ?', [user_id]);
      investor_id = inv[0].id;
      startup_id = target_id;
      updateField = 'investor_interest';
    } else {
      // Get startup profile ID
      const [st] = await db.execute('SELECT id FROM startup_profiles WHERE user_id = ?', [user_id]);
      startup_id = st[0].id;
      investor_id = target_id;
      updateField = 'startup_interest';
    }

    // Check if match record exists
    const [existing] = await db.execute(
      'SELECT * FROM matches WHERE investor_id = ? AND startup_id = ?',
      [investor_id, startup_id]
    );

    let is_mutual = false;

    if (existing.length > 0) {
      // Update existing
      await db.execute(
        `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
        [action, existing[0].id]
      );

      // Check mutual
      const [updated] = await db.execute(
        'SELECT * FROM matches WHERE id = ?',
        [existing[0].id]
      );
      if (updated[0].investor_interest === 'interested' && updated[0].startup_interest === 'interested') {
        is_mutual = true;
        await db.execute('UPDATE matches SET is_mutual = TRUE WHERE id = ?', [existing[0].id]);
      }
    } else {
      // Create new
      await db.execute(
        `INSERT INTO matches (investor_id, startup_id, ${updateField}) VALUES (?, ?, ?)`,
        [investor_id, startup_id, action]
      );
    }

    res.json({ success: true, is_mutual });
  } catch (error) {
    console.error('Error processing match action:', error);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// Get Mutual Matches
app.get('/api/matching/mutual-matches', async (req, res) => {
  try {
    const userId = req.query.user_id;
    const type = req.query.type; // 'investor' or 'startup'

    let query = '';
    let params = [];

    if (type === 'investor') {
      const [inv] = await db.execute('SELECT id FROM investor_profiles WHERE user_id = ?', [userId]);
      if (!inv[0]) return res.json({ matches: [] });

      query = `
        SELECT s.*, m.created_at as matched_at 
        FROM matches m
        JOIN startup_profiles s ON m.startup_id = s.id
        WHERE m.investor_id = ? AND m.is_mutual = TRUE
      `;
      params = [inv[0].id];
    } else {
      const [st] = await db.execute('SELECT id FROM startup_profiles WHERE user_id = ?', [userId]);
      if (!st[0]) return res.json({ matches: [] });

      query = `
        SELECT i.*, m.created_at as matched_at 
        FROM matches m
        JOIN investor_profiles i ON m.investor_id = i.id
        WHERE m.startup_id = ? AND m.is_mutual = TRUE
      `;
      params = [st[0].id];
    }

    const [matches] = await db.execute(query, params);
    res.json({ matches });
  } catch (error) {
    console.error('Error fetching mutual matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ==================== END MATCHING SYSTEM API ====================

// Create HTTP server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Chat Roulette System
const waitingQueue = [];
const activeChats = new Map(); // socketId -> { partnerId, roomId }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join queue
  socket.on('join-queue', (userData) => {
    console.log('User joining queue:', userData);

    // Remove from queue if already there
    const existingIndex = waitingQueue.findIndex(u => u.socketId === socket.id);
    if (existingIndex !== -1) {
      waitingQueue.splice(existingIndex, 1);
    }

    // Add to queue
    waitingQueue.push({
      socketId: socket.id,
      userId: userData.userId,
      firstName: userData.firstName,
      username: userData.username
    });

    // Broadcast queue size
    io.emit('queue-update', { count: waitingQueue.length });

    // Try to match
    tryMatch();
  });

  // Send message
  socket.on('send-message', (data) => {
    const chat = activeChats.get(socket.id);
    if (chat) {
      io.to(chat.partnerId).emit('receive-message', data);
    }
  });

  // Real-time audio streaming
  socket.on('audio-stream', (audioData) => {
    const chat = activeChats.get(socket.id);
    if (chat) {
      io.to(chat.partnerId).emit('audio-stream', audioData);
    }
  });

  // Typing indicator
  socket.on('typing', () => {
    const chat = activeChats.get(socket.id);
    if (chat) {
      io.to(chat.partnerId).emit('partner-typing');
    }
  });

  // Next partner
  socket.on('next-partner', () => {
    leaveChat(socket.id);
    socket.emit('search-started');

    // Re-join queue
    const userData = socket.handshake.query;
    waitingQueue.push({
      socketId: socket.id,
      userId: userData.userId,
      firstName: userData.firstName,
      username: userData.username
    });

    io.emit('queue-update', { count: waitingQueue.length });
    tryMatch();
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove from queue
    const queueIndex = waitingQueue.findIndex(u => u.socketId === socket.id);
    if (queueIndex !== -1) {
      waitingQueue.splice(queueIndex, 1);
      io.emit('queue-update', { count: waitingQueue.length });
    }

    // Leave chat
    leaveChat(socket.id);
  });
});

function tryMatch() {
  while (waitingQueue.length >= 2) {
    const user1 = waitingQueue.shift();
    const user2 = waitingQueue.shift();

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Set active chats
    activeChats.set(user1.socketId, { partnerId: user2.socketId, roomId });
    activeChats.set(user2.socketId, { partnerId: user1.socketId, roomId });

    // Notify both users
    io.to(user1.socketId).emit('match-found', {
      partnerName: user2.firstName,
      partnerUsername: user2.username
    });

    io.to(user2.socketId).emit('match-found', {
      partnerName: user1.firstName,
      partnerUsername: user1.username
    });

    console.log(`Matched: ${user1.firstName} <-> ${user2.firstName}`);
  }

  io.emit('queue-update', { count: waitingQueue.length });
}

function leaveChat(socketId) {
  const chat = activeChats.get(socketId);
  if (chat) {
    // Notify partner
    io.to(chat.partnerId).emit('partner-left');

    // Remove both from active chats
    activeChats.delete(socketId);
    activeChats.delete(chat.partnerId);
  }
}

app.listen(PORT, async () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  await initNewsDatabase();
  setTimeout(initBot, 1000);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping server...');
  await cleanNgrok();
  process.exit();
});