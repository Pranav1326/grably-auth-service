import type { Context, Next } from 'hono';
import { env } from '../config/env';

/**
 * Middleware to authenticate service-to-service requests
 * Validates the X-Service-Token header against the configured service secret
 */
export async function serviceAuthMiddleware(c: Context, next: Next) {
  const serviceToken = c.req.header('X-Service-Token');
  
  if (!serviceToken || serviceToken !== env.SERVICE_SECRET_TOKEN) {
    return c.json({ error: 'Unauthorized service access' }, 401);
  }
  
  await next();
}
