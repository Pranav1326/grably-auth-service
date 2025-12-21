import bcrypt from 'bcryptjs';
import { sign, verify, decode } from 'hono/jwt';
import { env } from '../config/env';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateAccessToken = async (userId: string, email: string): Promise<string> => {
  return await sign(
    { 
      userId,
      email,
      exp: Number(env.JWT_EXPIRES_IN) 
    },
    env.JWT_SECRET,
    'HS256'
  );
};

export const generateRefreshToken = async (userId: string, email: string): Promise<string> => {
  return await sign(
    { 
      userId,
      email,
      exp: Number(env.JWT_REFRESH_EXPIRES_IN) 
    },
    env.JWT_REFRESH_SECRET,
    'HS256'
  );
};

export const verifyAccessToken = (token: string): any => {
  try {
    return verify(token, env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return verify(token, env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

export const generateRandomToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
