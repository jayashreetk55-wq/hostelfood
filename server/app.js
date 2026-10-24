/**
 * app.js — Express application setup
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');

const { errorHandler } = require('./middleware/errorHandler');

// Route modules
const authRoutes      = require('./routes/authRoutes');
const menuRoutes      = require('./routes/menuRoutes');
const wasteRoutes     = require('./routes/wasteRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes    = require('./routes/reportRoutes');
const settingsRoutes  = require('./routes/settingsRoutes');

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,          // set true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));

// Auto-assign admin session so sign-in is completely bypassed
app.use((req, res, next) => {
  if (req.session) {
    if (!req.session.userId) {
      req.session.userId = 1;
      req.session.userRole = 'admin';
      req.session.userName = 'Hostel Admin';
      req.session.userEmail = 'admin@hostel.edu';
    }
  }
  next();
});

// ── Redirect root and index.html directly to Dashboard ──────
app.get(['/', '/index.html'], (req, res) => {
  res.redirect('/dashboard.html');
});

// ── Static Files (Frontend) ───────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/menus',     menuRoutes);
app.use('/api/waste',     wasteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/settings/food-items', settingsRoutes);

// ── Catch-all: serve Dashboard for unknown routes ─────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// ── Error Handler (must be last) ─────────────────────────
app.use(errorHandler);

module.exports = app;
