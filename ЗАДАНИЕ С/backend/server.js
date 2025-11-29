const express = require('express');
const router = express.Router();
const db = require('./database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// Serve uploaded files (This needs to be in server.js really, but we can't do app.use here easily without passing app. 
// For now, we assume server.js handles static files or we rely on the existing static middleware if uploads is in public.
// But the guide says "Add to server.js... app.use('/uploads'...)". 
// Since we are in a router, we can't easily add a global middleware. 
// We will rely on the user adding `app.use('/uploads', express.static(path.join(__dirname, 'uploads')));` to server.js 
// OR we can try to serve it via a specific route here, but standard static middleware is better in server.js.
// I will add the endpoints below.

// Простой Rate Limiter (защита от спама) для чата
const chatRateLimits = new Map(); // IP -> { count, lastTime }

// --- Admin Middleware ---
const isAdmin = async (req, res, next) => {
  const userId = req.header('x-user-id');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [users] = await db.query('SELECT is_admin FROM users WHERE id = ?', [userId]);
    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// --- Mobile App API (MySQL) ---

// Get all users
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Add user
router.post('/users', async (req, res) => {
  // Note: Adjust these fields to match your actual 'users' table columns
  const data = req.body;
  try {
    console.log('Received user data:', data);

    // Map 'password' from request to 'password_hash' in database
    const { password, ...userData } = req.body;
    const dbData = { ...userData };

    if (password) {
      dbData.password_hash = password; // Note: In production, use bcrypt to hash this!
    }

    const [result] = await db.query('INSERT INTO users SET ?', [dbData]);

    res.json({ success: true, id: result.insertId, message: 'User added successfully' });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    // Find user by email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password (simple comparison for now, as we store plain text/hash directly)
    if (user.password_hash !== password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Return full user object (excluding password)
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update user profile
router.put('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }

  try {
    await db.query('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    res.json({ success: true, user: { id: userId, name } });
  } catch (e) {
    console.error('Error updating user:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload user avatar
router.put('/users/:userId/avatar', upload.single('avatar'), async (req, res) => {
  const { userId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const avatar_url = `/uploads/${req.file.filename}`;

  try {
    await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatar_url, userId]);
    res.json({ success: true, avatar_url });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change user password
router.put('/users/:userId/password', async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    // Verify current password
    const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Note: In production, use bcrypt.compare()
    if (users[0].password_hash !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password (Note: In production, use bcrypt.hash())
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPassword, userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. AI Чат (POST /api/chat) -> теперь /chat (так как монтируется под /api)
router.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  const ip = req.ip;

  // --- SECURITY: Rate Limiting ---
  const now = Date.now();
  const limitData = chatRateLimits.get(ip) || { count: 0, lastTime: now };

  // Сброс счетчика каждую минуту
  if (now - limitData.lastTime > 60000) {
    limitData.count = 0;
    limitData.lastTime = now;
  }

  if (limitData.count >= 10) { // Максимум 10 сообщений в минуту
    return res.status(429).json({ error: 'Too many requests. Please wait.' });
  }

  limitData.count++;
  chatRateLimits.set(ip, limitData);

  // --- SECURITY: Input Validation ---
  if (!message || message.length > 1000) {
    return res.status(400).json({ error: 'Message too long (max 1000 chars)' });
  }

  try {
    // Temporary: Use the key provided by the user if not in env
    const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDfsGW2j3QLcFD0jDi4GvMTHWvuowWWrMw';

    // Import the new SDK
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Construct the prompt from history
    const context = "You are NGM, a smart assistant for startups. You help entrepreneurs with business, marketing, and technology advice. IMPORTANT: Always detect the language of the user's message and respond in the SAME language (English, Russian, Kazakh, etc.). Be concise and to the point.";

    let fullPrompt = context + "\n\n";

    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        const role = (msg.role === 'ai' || msg.role === 'model') ? 'Model' : 'User';
        const text = msg.content || msg.parts || msg.text || '';
        fullPrompt += `${role}: ${text}\n`;
      });
    }

    fullPrompt += `User: ${message}\nModel:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    res.json({ response: response.text, success: true });
  } catch (e) {
    console.error('AI Error:', e);

    // Fallback logic if needed
    if (e.message.includes('404') || e.message.includes('not found')) {
      console.log('Gemini 2.5 failed, trying 1.5-flash with new SDK...');
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'AIzaSyDfsGW2j3QLcFD0jDi4GvMTHWvuowWWrMw' });
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: req.body.message,
        });
        return res.json({ response: response.text, success: true });
      } catch (retryError) {
        console.error('Retry Error:', retryError);
      }
    }

    res.status(500).json({ error: 'AI Error', details: e.message });
  }
});

// Get all favorites for a user
router.get('/users/:userId/favorites', async (req, res) => {
  const { userId } = req.params;

  try {
    const [favorites] = await db.query(
      'SELECT item_type, item_id FROM user_favorites WHERE user_id = ?',
      [userId]
    );

    // Group by type
    const grouped = {
      startups: [],
      vacancies: [],
      events: []
    };

    favorites.forEach(fav => {
      if (fav.item_type === 'startup') grouped.startups.push(fav.item_id);
      else if (fav.item_type === 'vacancy') grouped.vacancies.push(fav.item_id);
      else if (fav.item_type === 'event') grouped.events.push(fav.item_id);
    });

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a favorite
router.post('/users/:userId/favorites', async (req, res) => {
  const { userId } = req.params;
  const { itemType, itemId } = req.body;

  if (!itemType || !itemId) {
    return res.status(400).json({ error: 'itemType and itemId are required' });
  }

  if (!['startup', 'vacancy', 'event'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid itemType' });
  }

  try {
    await db.query(
      'INSERT INTO user_favorites (user_id, item_type, item_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE item_id = item_id',
      [userId, itemType, itemId]
    );

    res.status(201).json({ success: true, message: 'Favorite added' });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a favorite
router.delete('/users/:userId/favorites/:itemType/:itemId', async (req, res) => {
  const { userId, itemType, itemId } = req.params;

  if (!['startup', 'vacancy', 'event'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid itemType' });
  }

  try {
    await db.query(
      'DELETE FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, itemType, itemId]
    );

    res.json({ success: true, message: 'Favorite removed' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER PROFILE ENDPOINTS =============

// Update user role
router.put('/users/:userId/role', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = ['developer', 'founder', 'investor', 'hr', 'student', 'mentor', 'other'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await db.query('UPDATE users SET user_role = ? WHERE id = ?', [role, userId]);
    res.json({ success: true, message: 'Role updated' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile (bio, company, position)
router.put('/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const { bio, company, position } = req.body;

  try {
    await db.query(
      'UPDATE users SET bio = ?, company = ?, position = ? WHERE id = ?',
      [bio || null, company || null, position || null, userId]
    );
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER STARTUPS ENDPOINTS =============

// Get user's startups
router.get('/users/:userId/startups', async (req, res) => {
  const { userId } = req.params;

  try {
    const [startups] = await db.query(
      'SELECT * FROM user_startups WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(startups);
  } catch (error) {
    console.error('Error fetching user startups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create startup (with file upload)
router.post('/users/:userId/startups', upload.single('logo'), async (req, res) => {
  const { userId } = req.params;
  const { name, description, category, stage, website_url } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO user_startups (user_id, name, description, category, stage, website_url, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, description, category, stage, website_url, logo_url]
    );

    res.status(201).json({
      success: true,
      message: 'Startup created and pending approval',
      startupId: result.insertId
    });
  } catch (error) {
    console.error('Error creating startup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update startup
router.put('/users/:userId/startups/:startupId', upload.single('logo'), async (req, res) => {
  const { userId, startupId } = req.params;
  const { name, description, category, stage, website_url } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    // Check ownership
    const [existing] = await db.query(
      'SELECT * FROM user_startups WHERE id = ? AND user_id = ?',
      [startupId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Startup not found or unauthorized' });
    }

    let query = 'UPDATE user_startups SET name = ?, description = ?, category = ?, stage = ?, website_url = ?, is_approved = false';
    let params = [name, description, category, stage, website_url];

    if (logo_url) {
      query += ', logo_url = ?';
      params.push(logo_url);
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(startupId, userId);

    await db.query(query, params);

    res.json({ success: true, message: 'Startup updated and pending re-approval' });
  } catch (error) {
    console.error('Error updating startup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete startup
router.delete('/users/:userId/startups/:startupId', async (req, res) => {
  const { userId, startupId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM user_startups WHERE id = ? AND user_id = ?',
      [startupId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Startup not found or unauthorized' });
    }

    res.json({ success: true, message: 'Startup deleted' });
  } catch (error) {
    console.error('Error deleting startup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all approved startups (for main feed)
router.get('/startups/approved', async (req, res) => {
  try {
    const [startups] = await db.query(
      'SELECT s.*, u.name as creator_name FROM user_startups s JOIN users u ON s.user_id = u.id WHERE s.is_approved = true ORDER BY s.created_at DESC'
    );
    res.json(startups);
  } catch (error) {
    console.error('Error fetching approved startups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER TEAMS ENDPOINTS =============

// Get user's teams
router.get('/users/:userId/teams', async (req, res) => {
  const { userId } = req.params;

  try {
    const [teams] = await db.query(
      'SELECT * FROM user_teams WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(teams);
  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create team
router.post('/users/:userId/teams', upload.single('logo'), async (req, res) => {
  const { userId } = req.params;
  const { name, description, location, website_url } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO user_teams (user_id, name, description, location, website_url, logo_url) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, description, location, website_url, logo_url]
    );

    res.status(201).json({
      success: true,
      message: 'Team created and pending approval',
      teamId: result.insertId
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update team
router.put('/users/:userId/teams/:teamId', upload.single('logo'), async (req, res) => {
  const { userId, teamId } = req.params;
  const { name, description, location, website_url } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const [existing] = await db.query(
      'SELECT * FROM user_teams WHERE id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Team not found or unauthorized' });
    }

    let query = 'UPDATE user_teams SET name = ?, description = ?, location = ?, website_url = ?, is_approved = false';
    let params = [name, description, location, website_url];

    if (logo_url) {
      query += ', logo_url = ?';
      params.push(logo_url);
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(teamId, userId);

    await db.query(query, params);

    res.json({ success: true, message: 'Team updated and pending re-approval' });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete team
router.delete('/users/:userId/teams/:teamId', async (req, res) => {
  const { userId, teamId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM user_teams WHERE id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Team not found or unauthorized' });
    }

    res.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all approved teams (for main feed)
router.get('/teams/approved', async (req, res) => {
  try {
    const [teams] = await db.query(
      'SELECT t.*, u.name as creator_name FROM user_teams t JOIN users u ON t.user_id = u.id WHERE t.is_approved = true ORDER BY t.created_at DESC'
    );
    res.json(teams);
  } catch (error) {
    console.error('Error fetching approved teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER EVENTS ENDPOINTS =============

// Get user's events
router.get('/users/:userId/events', async (req, res) => {
  const { userId } = req.params;

  try {
    const [events] = await db.query(
      'SELECT * FROM user_events WHERE user_id = ? ORDER BY event_date DESC',
      [userId]
    );
    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post('/users/:userId/events', upload.single('image'), async (req, res) => {
  const { userId } = req.params;
  const { title, description, event_date, location, url, category, max_participants, is_online } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title || !event_date) {
    return res.status(400).json({ error: 'Title and event date are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO user_events (user_id, title, description, event_date, location, url, image_url, category, max_participants, is_online) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, description, event_date, location, url, image_url, category, max_participants || 100, is_online === 'true']
    );

    res.status(201).json({
      success: true,
      message: 'Event created and pending approval',
      eventId: result.insertId
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
router.put('/users/:userId/events/:eventId', upload.single('image'), async (req, res) => {
  const { userId, eventId } = req.params;
  const { title, description, event_date, location, url, category, max_participants, is_online } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const [existing] = await db.query(
      'SELECT * FROM user_events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }

    let query = 'UPDATE user_events SET title = ?, description = ?, event_date = ?, location = ?, url = ?, category = ?, max_participants = ?, is_online = ?, is_approved = false';
    let params = [title, description, event_date, location, url, category, max_participants, is_online === 'true'];

    if (image_url) {
      query += ', image_url = ?';
      params.push(image_url);
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(eventId, userId);

    await db.query(query, params);

    res.json({ success: true, message: 'Event updated and pending re-approval' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/users/:userId/events/:eventId', async (req, res) => {
  const { userId, eventId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM user_events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }

    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all approved events (for main feed)
router.get('/events/approved', async (req, res) => {
  try {
    const [events] = await db.query(
      'SELECT e.*, u.name as creator_name FROM user_events e JOIN users u ON e.user_id = u.id WHERE e.is_approved = true ORDER BY e.event_date ASC'
    );
    res.json(events);
  } catch (error) {
    console.error('Error fetching approved events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER VACANCIES ENDPOINTS =============

// Get user's vacancies
router.get('/users/:userId/vacancies', async (req, res) => {
  const { userId } = req.params;

  try {
    const [vacancies] = await db.query(
      'SELECT * FROM user_vacancies WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(vacancies);
  } catch (error) {
    console.error('Error fetching user vacancies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create vacancy
router.post('/users/:userId/vacancies', async (req, res) => {
  const { userId } = req.params;
  const { title, employer, description, location, salary, experience, url } = req.body;

  if (!title || !employer) {
    return res.status(400).json({ error: 'Title and employer are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO user_vacancies (user_id, title, employer, description, location, salary, experience, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, employer, description, location, salary, experience, url]
    );

    res.status(201).json({
      success: true,
      message: 'Vacancy created and pending approval',
      vacancyId: result.insertId
    });
  } catch (error) {
    console.error('Error creating vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vacancy
router.put('/users/:userId/vacancies/:vacancyId', async (req, res) => {
  const { userId, vacancyId } = req.params;
  const { title, employer, description, location, salary, experience, url } = req.body;

  try {
    const [existing] = await db.query(
      'SELECT * FROM user_vacancies WHERE id = ? AND user_id = ?',
      [vacancyId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vacancy not found or unauthorized' });
    }

    await db.query(
      'UPDATE user_vacancies SET title = ?, employer = ?, description = ?, location = ?, salary = ?, experience = ?, url = ?, is_approved = false WHERE id = ? AND user_id = ?',
      [title, employer, description, location, salary, experience, url, vacancyId, userId]
    );

    res.json({ success: true, message: 'Vacancy updated and pending re-approval' });
  } catch (error) {
    console.error('Error updating vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vacancy
router.delete('/users/:userId/vacancies/:vacancyId', async (req, res) => {
  const { userId, vacancyId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM user_vacancies WHERE id = ? AND user_id = ?',
      [vacancyId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vacancy not found or unauthorized' });
    }

    res.json({ success: true, message: 'Vacancy deleted' });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all approved vacancies (for main feed)
router.get('/vacancies/approved', async (req, res) => {
  try {
    const [vacancies] = await db.query(
      'SELECT v.*, u.name as creator_name FROM user_vacancies v JOIN users u ON v.user_id = u.id WHERE v.is_approved = true ORDER BY v.created_at DESC'
    );
    res.json(vacancies);
  } catch (error) {
    console.error('Error fetching approved vacancies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// ============= USER PROFILE ENDPOINTS =============

// Update user role
router.put('/users/:userId/role', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = ['developer', 'founder', 'investor', 'hr', 'student', 'mentor', 'other'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await db.query('UPDATE users SET user_role = ? WHERE id = ?', [role, userId]);
    res.json({ success: true, message: 'Role updated' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile (bio, company, position)
router.put('/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const { bio, company, position } = req.body;

  try {
    await db.query(
      'UPDATE users SET bio = ?, company = ?, position = ? WHERE id = ?',
      [bio || null, company || null, position || null, userId]
    );
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER STARTUPS ENDPOINTS =============

// Get user's startups
router.get('/users/:userId/startups', async (req, res) => {
  const { userId } = req.params;

  try {
    const [startups] = await db.query(
      'SELECT * FROM user_startups WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(startups);
  } catch (error) {
    console.error('Error fetching user startups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create startup (with file upload)
router.post('/users/:userId/startups', upload.single('logo'), async (req, res) => {
  const { userId } = req.params;
  const { name, description, category, stage, website_url } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO user_startups (user_id, name, description, category, stage, website_url, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, description, category, stage, website_url, logo_url]
    );

    res.status(201).json({
      success: true,
      message: 'Startup created and pending approval',
      startupId: result.insertId
    });
  } catch (error) {
    console.error('Error creating startup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update startup
router.put('/users/:userId/startups/:startupId', upload.single('logo'), async (req, res) => {
  const { userId, startupId } = req.params;
  const { name, description, category, stage, website_url } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    // Check ownership
    const [existing] = await db.query(
      'SELECT * FROM user_startups WHERE id = ? AND user_id = ?',
      [startupId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Startup not found or unauthorized' });
    }

    let query = 'UPDATE user_startups SET name = ?, description = ?, category = ?, stage = ?, website_url = ?, is_approved = false';
    let params = [name, description, category, stage, website_url];

    if (logo_url) {
      query += ', logo_url = ?';
      params.push(logo_url);
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(startupId, userId);

    await db.query(query, params);

    res.json({ success: true, message: 'Startup updated and pending re-approval' });
  } catch (error) {
    console.error('Error updating startup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete startup
router.delete('/users/:userId/startups/:startupId', async (req, res) => {
  const { userId, startupId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM user_startups WHERE id = ? AND user_id = ?',
      [startupId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Startup not found or unauthorized' });
    }

    res.json({ success: true, message: 'Startup deleted' });
  } catch (error) {
    console.error('Error deleting startup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all approved startups (for main feed)
router.get('/startups/approved', async (req, res) => {
  try {
    const [startups] = await db.query(
      'SELECT s.*, u.name as creator_name FROM user_startups s JOIN users u ON s.user_id = u.id WHERE s.is_approved = true ORDER BY s.created_at DESC'
    );
    res.json(startups);
  } catch (error) {
    console.error('Error fetching approved startups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER TEAMS ENDPOINTS =============

// Get user's teams
router.get('/users/:userId/teams', async (req, res) => {
  const { userId } = req.params;

  try {
    const [teams] = await db.query(
      'SELECT * FROM user_teams WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(teams);
  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create team
router.post('/users/:userId/teams', upload.single('logo'), async (req, res) => {
  const { userId } = req.params;
  const { name, description, location, website_url } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO user_teams (user_id, name, description, location, website_url, logo_url) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, description, location, website_url, logo_url]
    );

    res.status(201).json({
      success: true,
      message: 'Team created and pending approval',
      teamId: result.insertId
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update team
router.put('/users/:userId/teams/:teamId', upload.single('logo'), async (req, res) => {
  const { userId, teamId } = req.params;
  const { name, description, location, website_url } = req.body;
  const logo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const [existing] = await db.query(
      'SELECT * FROM user_teams WHERE id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Team not found or unauthorized' });
    }

    let query = 'UPDATE user_teams SET name = ?, description = ?, location = ?, website_url = ?, is_approved = false';
    let params = [name, description, location, website_url];

    if (logo_url) {
      query += ', logo_url = ?';
      params.push(logo_url);
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(teamId, userId);

    await db.query(query, params);

    res.json({ success: true, message: 'Team updated and pending re-approval' });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete team
router.delete('/users/:userId/teams/:teamId', async (req, res) => {
  const { userId, teamId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM user_teams WHERE id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Team not found or unauthorized' });
    }

    res.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER EVENTS ENDPOINTS =============

// Get user's events
router.get('/users/:userId/events', async (req, res) => {
  const { userId } = req.params;

  try {
    const [events] = await db.query(
      'SELECT * FROM user_events WHERE user_id = ? ORDER BY event_date DESC',
      [userId]
    );
    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post('/users/:userId/events', upload.single('image'), async (req, res) => {
  const { userId } = req.params;
  const { title, description, event_date, location, url, category, max_participants, is_online } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title || !event_date) {
    return res.status(400).json({ error: 'Title and event date are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO user_events (user_id, title, description, event_date, location, url, image_url, category, max_participants, is_online) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, description, event_date, location, url, image_url, category, max_participants || 100, is_online === 'true']
    );

    res.status(201).json({
      success: true,
      message: 'Event created and pending approval',
      eventId: result.insertId
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
router.put('/users/:userId/events/:eventId', upload.single('image'), async (req, res) => {
  const { userId, eventId } = req.params;
  const { title, description, event_date, location, url, category, max_participants, is_online } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const [existing] = await db.query(
      'SELECT * FROM user_events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }

    let query = 'UPDATE user_events SET title = ?, description = ?, event_date = ?, location = ?, url = ?, category = ?, max_participants = ?, is_online = ?, is_approved = false';
    let params = [title, description, event_date, location, url, category, max_participants, is_online === 'true'];

    if (image_url) {
      query += ', image_url = ?';
      params.push(image_url);
    }

    query += ' WHERE id = ? AND user_id = ?';
    params.push(eventId, userId);

    await db.query(query, params);

    res.json({ success: true, message: 'Event updated and pending re-approval' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/users/:userId/events/:eventId', async (req, res) => {
  const { userId, eventId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM user_events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }

    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= USER VACANCIES ENDPOINTS =============

// Get user's vacancies
router.get('/users/:userId/vacancies', async (req, res) => {
  const { userId } = req.params;

  try {
    const [vacancies] = await db.query(
      'SELECT * FROM user_vacancies WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(vacancies);
  } catch (error) {
    console.error('Error fetching user vacancies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create vacancy
router.post('/users/:userId/vacancies', async (req, res) => {
  const { userId } = req.params;
  const { title, employer, description, location, salary, experience, url } = req.body;

  if (!title || !employer) {
    return res.status(400).json({ error: 'Title and employer are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO user_vacancies (user_id, title, employer, description, location, salary, experience, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, employer, description, location, salary, experience, url]
    );

    res.status(201).json({
      success: true,
      message: 'Vacancy created and pending approval',
      vacancyId: result.insertId
    });
  } catch (error) {
    console.error('Error creating vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vacancy
router.put('/users/:userId/vacancies/:vacancyId', async (req, res) => {
  const { userId, vacancyId } = req.params;
  const { title, employer, description, location, salary, experience, url } = req.body;

  try {
    const [existing] = await db.query(
      'SELECT * FROM user_vacancies WHERE id = ? AND user_id = ?',
      [vacancyId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vacancy not found or unauthorized' });
    }

    await db.query(
      'UPDATE user_vacancies SET title = ?, employer = ?, description = ?, location = ?, salary = ?, experience = ?, url = ?, is_approved = false WHERE id = ? AND user_id = ?',
      [title, employer, description, location, salary, experience, url, vacancyId, userId]
    );

    res.json({ success: true, message: 'Vacancy updated and pending re-approval' });
  } catch (error) {
    console.error('Error updating vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vacancy
router.delete('/users/:userId/vacancies/:vacancyId', async (req, res) => {
  const { userId, vacancyId } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM user_vacancies WHERE id = ? AND user_id = ?',
      [vacancyId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vacancy not found or unauthorized' });
    }

    res.json({ success: true, message: 'Vacancy deleted' });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= ADMIN ENDPOINTS =============

// Setup admin schema (one-time use)
router.get('/setup/admin-schema', async (req, res) => {
  try {
    // Add is_admin column to users table if it doesn't exist
    // Note: 'IF NOT EXISTS' for columns requires MySQL 8.0.29+. 
    // We'll try a raw add and catch duplicate error (1060) for compatibility.
    try {
      await db.query(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE`);
      res.json({ success: true, message: 'Admin schema updated: is_admin column added' });
    } catch (e) {
      if (e.errno === 1060) {
        res.json({ success: true, message: 'Admin schema already up to date' });
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error('Error updating schema:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Promote user to admin (for testing/setup)
router.post('/admin/promote/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query('UPDATE users SET is_admin = TRUE WHERE id = ?', [userId]);
    res.json({ success: true, message: 'User promoted to admin' });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/users', isAdmin, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, user_role, is_admin, created_at FROM users');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/admin/users/:userId', isAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending content
router.get('/admin/pending/:type', isAdmin, async (req, res) => {
  const { type } = req.params;
  let table;
  switch (type) {
    case 'startups': table = 'user_startups'; break;
    case 'teams': table = 'user_teams'; break;
    case 'events': table = 'user_events'; break;
    case 'vacancies': table = 'user_vacancies'; break;
    default: return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    const [items] = await db.query(
      `SELECT t.*, u.name as creator_name, u.email as creator_email 
       FROM ${table} t 
       LEFT JOIN users u ON t.user_id = u.id 
       WHERE t.is_approved = FALSE 
       ORDER BY t.created_at ASC`
    );
    res.json(items);
  } catch (error) {
    console.error(`Error fetching pending ${type}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get content (startups, teams, events, vacancies)
router.get('/admin/content/:type', isAdmin, async (req, res) => {
  const { type } = req.params;
  let table;
  switch (type) {
    case 'startups': table = 'user_startups'; break;
    case 'teams': table = 'user_teams'; break;
    case 'events': table = 'user_events'; break;
    case 'vacancies': table = 'user_vacancies'; break;
    default: return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    const [items] = await db.query(
      `SELECT t.*, u.name as creator_name, u.email as creator_email 
       FROM ${table} t 
       LEFT JOIN users u ON t.user_id = u.id 
       ORDER BY t.created_at DESC`
    );
    res.json(items);
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve content
router.post('/admin/approve/:type/:id', isAdmin, async (req, res) => {
  const { type, id } = req.params;

  let table;
  switch (type) {
    case 'startups': table = 'user_startups'; break;
    case 'teams': table = 'user_teams'; break;
    case 'events': table = 'user_events'; break;
    case 'vacancies': table = 'user_vacancies'; break;
    default: return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    await db.query(`UPDATE ${table} SET is_approved = TRUE WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Item approved' });
  } catch (error) {
    console.error(`Error approving ${type}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject content (delete)
router.delete('/admin/reject/:type/:id', isAdmin, async (req, res) => {
  const { type, id } = req.params;

  let table;
  switch (type) {
    case 'startups': table = 'user_startups'; break;
    case 'teams': table = 'user_teams'; break;
    case 'events': table = 'user_events'; break;
    case 'vacancies': table = 'user_vacancies'; break;
    default: return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Item rejected and deleted' });
  } catch (error) {
    console.error(`Error rejecting ${type}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
