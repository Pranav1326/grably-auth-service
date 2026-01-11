import { Hono } from 'hono';
import {
  getProfile,
  login,
  register,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getShopkeepers,
  getShopkeeper,
  updateShopkeeper,
  deleteShopkeeper,
  toggleShopkeeperStatus,
  createUser,
  getAdmins,
  createAdmin,
  getAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
  createShopkeeper,
} from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth';
import { serviceAuthMiddleware } from '../middleware/serviceAuth';

const adminRoutes = new Hono();

// Public routes
adminRoutes.post('/register', register);
adminRoutes.post('/login', login);
// adminRoutes.post('/refresh', refreshAccessToken);
// adminRoutes.post('/logout', logout);

// Protected routes (for admin dashboard)
adminRoutes.get('/profile', authMiddleware, getProfile);

// Service-to-service endpoints (protected by service token)
// User management
adminRoutes.get('/users', serviceAuthMiddleware, getUsers);
adminRoutes.post('/users', serviceAuthMiddleware, createUser);
adminRoutes.get('/users/:id', serviceAuthMiddleware, getUser);
adminRoutes.put('/users/:id', serviceAuthMiddleware, updateUser);
adminRoutes.delete('/users/:id', serviceAuthMiddleware, deleteUser);
adminRoutes.patch('/users/:id/toggle-status', serviceAuthMiddleware, toggleUserStatus);

// Shopkeeper management
adminRoutes.get('/shopkeepers', serviceAuthMiddleware, getShopkeepers);
adminRoutes.post('/shopkeepers', serviceAuthMiddleware, createShopkeeper);
adminRoutes.get('/shopkeepers/:id', serviceAuthMiddleware, getShopkeeper);
adminRoutes.put('/shopkeepers/:id', serviceAuthMiddleware, updateShopkeeper);
adminRoutes.delete('/shopkeepers/:id', serviceAuthMiddleware, deleteShopkeeper);
adminRoutes.patch('/shopkeepers/:id/toggle-status', serviceAuthMiddleware, toggleShopkeeperStatus);

// Admin management
adminRoutes.get('/admins', serviceAuthMiddleware, getAdmins);
adminRoutes.post('/admins', serviceAuthMiddleware, createAdmin);
adminRoutes.get('/admins/:id', serviceAuthMiddleware, getAdmin);
adminRoutes.put('/admins/:id', serviceAuthMiddleware, updateAdmin);
adminRoutes.delete('/admins/:id', serviceAuthMiddleware, deleteAdmin);
adminRoutes.patch('/admins/:id/toggle-status', serviceAuthMiddleware, toggleAdminStatus);

export default adminRoutes;
