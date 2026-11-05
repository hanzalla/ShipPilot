import bcrypt from 'bcrypt';
import db from '../config/db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res, next) {
  try {
    const name     = req.body.name?.trim();
    const email    = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (email.length > 255) {
      return res.status(400).json({ error: 'Email must be 255 characters or fewer' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    // bcrypt silently truncates at 72 bytes — reject passwords that exceed it
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Password must be 72 bytes or fewer' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, hash]
    );

    req.session.userId   = result.insertId;
    req.session.userName = name;

    res.status(201).json({ id: result.insertId, name, email });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email    = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId   = user.id;
    req.session.userName = user.name;

    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
}

export function me(req, res) {
  res.json({ id: req.session.userId, name: req.session.userName });
}
