import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db';
import { authAccounts } from '../db/schema/auth';
import { eq } from 'drizzle-orm';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  role: z.enum(['admin', 'viewer']).optional().default('viewer'),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { username, password, role } = parsed.data;

  try {
    const existing = await db
      .select()
      .from(authAccounts)
      .where(eq(authAccounts.username, username))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [newAccount] = await db
      .insert(authAccounts)
      .values({ username, passwordHash, role })
      .returning({ id: authAccounts.id, username: authAccounts.username, role: authAccounts.role });

    res.status(201).json({
      message: 'Account created successfully',
      user: newAccount,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { username, password } = parsed.data;

  try {
    const [account] = await db
      .select()
      .from(authAccounts)
      .where(eq(authAccounts.username, username))
      .limit(1);

    if (!account) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, account.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const token = jwt.sign(
      { id: account.id, username: account.username, role: account.role },
      secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: account.id,
        username: account.username,
        role: account.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me  — protected, returns current user info
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { id: number; username: string; role: string };
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
});

export default router;
