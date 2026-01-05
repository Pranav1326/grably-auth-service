import type { Context } from "hono";
import { loginSchema } from "../schemas/auth";
import { db } from "../db";
import { refreshTokens, admin } from "../db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, generateAccessToken, generateRefreshToken, hashPassword } from "../utils/auth";
import z from "zod";

export const register = async (c: Context) => {
  try {
    const body = await c.req.json();
    // You can add validation here if needed

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(admin)
      .where(eq(admin.email, body.email))
      .limit(1);

    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);
    
    // Create new user
    const newAdmin = await db.insert(admin).values({
      name: body.name,
      email: body.email,
      password: hashedPassword,
    }).returning();

    return c.json({ message: 'User registered successfully', userId: newAdmin[0].id }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

export const login = async (c: Context) => {
  try {
    const body = await c.req.json();
    const validatedData = loginSchema.parse(body);

    // Find user
    const [user] = await db
      .select({ 
        id: admin.id, 
        email: admin.email, 
        name: admin.name,
        createdAt: admin.createdAt,
        password: admin.password
      })
      .from(admin)
      .where(eq(admin.email, validatedData.email))
      .limit(1);
      
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Check if user is active
    // if (!user.isActive) {
    //   return c.json({ error: 'Account is deactivated' }, 403);
    // }

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
    // const expiresAt = new Date();
    // expiresAt.setDate(expiresAt.getDate() + 30);

    // await db.insert(refreshTokens).values({
    //   userId: user.id,
    //   token: refreshToken,
    //   expiresAt,
    // });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

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

export const getProfile = async (c: Context) => {
  try {
    const userId = c.get('userId');

    const [user] = await db
      .select()
      .from(admin)
      .where(eq(admin.id, userId))
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