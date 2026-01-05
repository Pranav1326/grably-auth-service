import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import { errorResponse } from './utils/helpers/responseFormatter';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors()
);
// app.use(
//   '*',
//   cors({
//     origin: env.ALLOWED_ORIGINS,
//     credentials: true,
//   })
// );

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Grably Auth Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/api/auth', authRoutes);

app.route('/api/admin', adminRoutes);

// 404 handler
app.notFound((c) => {
  return errorResponse(c, 'Route not found', undefined, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return errorResponse(
    c,
    'Internal server error',
    env.NODE_ENV === 'development' ? err.message : undefined,
    500
  );
});

// Start server
console.log(`🚀 Starting Grably Auth Service...`);
console.log(`📝 Environment: ${env.NODE_ENV}`);
console.log(`🔗 Server running on http://${env.HOST}:${env.PORT}`);

export default {
  port: env.PORT,
  // hostname: env.HOST,
  fetch: app.fetch,
};
