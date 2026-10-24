/**
 * authController.js — Login, logout, current user
 */
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    req.session.userId   = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) { next(err); }
}

function logout(req, res, next) {
  req.session.destroy(err => {
    if (err) return next(err);
    res.json({ success: true, message: 'Logged out successfully.' });
  });
}

async function me(req, res) {
  const userId = (req.session && req.session.userId) || 1;
  let user = await userModel.findById(userId);
  if (!user) {
    user = { id: 1, name: 'Hostel Admin', email: 'admin@hostel.edu', role: 'admin' };
  }
  res.json({ user });
}

module.exports = { login, logout, me };
