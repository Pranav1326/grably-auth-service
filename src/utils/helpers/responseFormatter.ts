import type { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';

export const successResponse = (c: Context, data: any, message: string = 'Success', statusCode: StatusCode = 200) => {
  return c.json({
    success: true,
    message,
    data,
  }, statusCode);
};

export const errorResponse = (c: Context, errorMessage: string, details?: any, statusCode: StatusCode = 500) => {
  return c.json({
    success: false,
    error: errorMessage,
    details: details || null,
  }, statusCode);
};
