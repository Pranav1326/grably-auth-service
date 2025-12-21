import { Hono } from 'hono';
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const authRoutes = new Hono();

// Public routes
authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/refresh', refreshAccessToken);
authRoutes.post('/logout', logout);

// Protected routes
authRoutes.get('/profile', authMiddleware, getProfile);

export default authRoutes;
