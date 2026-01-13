import { Hono } from 'hono';
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
  getUserEmail,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { serviceAuthMiddleware } from '../middleware/serviceAuth';

const authRoutes = new Hono();

// Public routes
authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/refresh', refreshAccessToken);
authRoutes.post('/logout', logout);

// Protected routes
authRoutes.get('/profile', authMiddleware, getProfile);

authRoutes.get('/user-email/:id', serviceAuthMiddleware, getUserEmail);

export default authRoutes;
