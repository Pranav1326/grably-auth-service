import type { Context, Next } from 'hono';
import { verifyAccessToken } from '../utils/auth';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }

  // Attach user info to context
  c.set('userId', decoded.userId);
  c.set('userEmail', decoded.email);

  await next();
};
