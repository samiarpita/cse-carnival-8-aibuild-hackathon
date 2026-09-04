import express from 'express';
import { db, hashPassword, verifyPassword, generateToken, verifyToken } from '../db/client.js';

const router = express.Router();

// Middleware to extract authenticated user from Bearer token
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Missing or invalid Authorization header'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Session token has expired or is invalid'
      });
    }

    const user = await db.users.getById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'user_not_found',
        message: 'User account no longer exists'
      });
    }

    const { password_hash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    next(err);
  }
}

export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z)' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter (a-z)' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number (0-9)' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.)' };
  }
  return { valid: true };
}

// POST /api/auth/register - Register a new student/faculty/club account
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, student_id, department, role, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'validation_error', message: 'Full name is required' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'validation_error', message: 'Valid university email is required' });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'weak_password',
        message: passwordValidation.message
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedStudentId = student_id ? student_id.trim() : null;

    // Check if email already registered
    const existingEmail = await db.users.getByEmail(trimmedEmail);
    if (existingEmail) {
      return res.status(409).json({
        error: 'email_exists',
        message: `An account with email '${trimmedEmail}' already exists.`
      });
    }

    // Check if student_id already registered
    if (trimmedStudentId) {
      const existingId = await db.users.getByStudentId(trimmedStudentId);
      if (existingId) {
        return res.status(409).json({
          error: 'student_id_exists',
          message: `An account with Student ID '${trimmedStudentId}' already exists.`
        });
      }
    }

    const finalStudentId = trimmedStudentId || `26-${Math.floor(10000 + Math.random() * 90000)}`;
    const finalRole = role || 'Student';
    const avatar = finalRole === 'Faculty' ? '👨‍🏫' : finalRole === 'Club Organizer' ? '🏆' : '👨‍🎓';
    const password_hash = hashPassword(password);

    const newUser = await db.users.create({
      name: name.trim(),
      email: trimmedEmail,
      student_id: finalStudentId,
      department: department || 'Computer Science & Engineering',
      role: finalRole,
      password_hash,
      avatar
    });

    const { password_hash: _, ...safeUser } = newUser;
    const token = generateToken(safeUser);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - Sign in with email/student_id & password
router.post('/login', async (req, res, next) => {
  try {
    const { emailOrId, password } = req.body;

    if (!emailOrId || !password) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'University Email / Student ID and password are required'
      });
    }

    const identifier = emailOrId.trim();
    const user = await db.users.getByIdentifier(identifier);

    if (!user) {
      return res.status(401).json({
        error: 'user_not_found',
        message: 'Account not found with this email or Student ID. Please register first.'
      });
    }

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'invalid_password',
        message: 'Incorrect password. Please verify your credentials.'
      });
    }

    const { password_hash, ...safeUser } = user;
    const token = generateToken(safeUser);

    res.json({
      success: true,
      message: `Welcome back, ${safeUser.name}!`,
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - Get currently authenticated user profile
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// GET /api/auth/users - List available demo users (passwords excluded)
router.get('/users', async (req, res, next) => {
  try {
    const users = await db.users.getAll();
    res.json({
      success: true,
      users
    });
  } catch (err) {
    next(err);
  }
});

export default router;
