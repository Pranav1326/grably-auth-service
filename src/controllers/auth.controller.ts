import type { Context } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/auth';
import { loginSchema, refreshTokenSchema, registerSchema } from '../schemas/auth';

export const register = async (c: Context) => {
  try {
    const body = await c.req.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    console.log('existingUser:', existingUser);
    
    if (existingUser.length > 0) {
      return c.json({ error: 'User already exists with this email' }, 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone || null,
      })
      .returning();

    // Generate tokens
    const accessToken = generateAccessToken(newUser.id, newUser.email);
    const refreshToken = generateRefreshToken(newUser.id, newUser.email);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(refreshTokens).values({
      userId: newUser.id,
      token: refreshToken,
      expiresAt,
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = newUser;

    return c.json(
      {
        message: 'User registered successfully',
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    console.error('Register error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

export const login = async (c: Context) => {
  try {
    const body = await c.req.json();
    const validatedData = loginSchema.parse(body);

    // Find user
    const [user] = await db
      .select({ 
        id: users.id, 
        email: users.email, 
        name: users.name,
        avatar: users.avatar,
        createdAt: users.createdAt,
        isActive: users.isActive,
        password: users.password
      })
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);
      
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return c.json({ error: 'Account is deactivated' }, 403);
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    // Remove password from response
    const { password, isActive, ...userWithoutPassword } = user;

    return c.json({
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

export const refreshAccessToken = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = refreshTokenSchema.parse(body);

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return c.json({ error: 'Invalid refresh token' }, 401);
    }

    // Check if refresh token exists in database
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .limit(1);

    if (!tokenRecord) {
      return c.json({ error: 'Refresh token not found' }, 401);
    }

    // Check if token is expired
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      // Delete expired token
      await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
      return c.json({ error: 'Refresh token expired' }, 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken(decoded.userId, decoded.email);

    return c.json({
      message: 'Token refreshed successfully',
      accessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    console.error('Refresh token error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

export const logout = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = refreshTokenSchema.parse(body);

    // Delete refresh token from database
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));

    return c.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

export const getProfile = async (c: Context) => {
  try {
    const userId = c.get('userId');

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return c.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

export const getUserEmail = async (c: Context) => {
  try {
    const userId = c.req.param('id');

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ email: user.email });
  } catch (error) {
    console.error('Get user email error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}