import { Hono } from 'hono';
import {
  getProfile,
  login,
  register,
} from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth';

const adminRoutes = new Hono();

// Public routes
adminRoutes.post('/register', register);
adminRoutes.post('/login', login);
// adminRoutes.post('/refresh', refreshAccessToken);
// adminRoutes.post('/logout', logout);

// Protected routes
adminRoutes.get('/profile', authMiddleware, getProfile);

export default adminRoutes;
