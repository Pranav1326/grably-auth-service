import type { Context } from "hono";
import { loginSchema } from "../schemas/auth";
import { db } from "../db";
import { refreshTokens, admin, users, shopKeeper } from "../db/schema";
import { eq, desc, or, ilike, sql } from "drizzle-orm";
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
    const accessToken = await generateAccessToken(user.id, user.email);
    const refreshToken = await generateRefreshToken(user.id, user.email);
    
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

// ============ User Management (Service-to-Service) ============

export const getUsers = async (c: Context) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('search') || '';

    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        avatar: users.avatar,
        isVerified: users.isVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Add search filter if provided
    if (search) {
      query = query.where(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      ) as any;
    }

    const userList = await query;
    
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    return c.json({
      users: userList,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
};

export const createUser = async (c: Context) => {
  try {
    const body = await c.req.json();
    // You can add validation here if needed

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);
    
    // Create new user
    const newUser = await db.insert(users).values({
      name: body.name,
      email: body.email,
      password: hashedPassword,
      phone: body.phone,
    }).returning();

    const { password, ...userWithoutPassword } = newUser[0];

    return c.json({ message: 'User created successfully', user: userWithoutPassword }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
};

export const getUser = async (c: Context) => {
  try {
    const userId = c.req.param('id');
    
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        avatar: users.avatar,
        isVerified: users.isVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
};

export const updateUser = async (c: Context) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { password, ...userWithoutPassword } = updatedUser;

    return c.json({ message: 'User updated successfully', user: userWithoutPassword });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
};

export const deleteUser = async (c: Context) => {
  try {
    const userId = c.req.param('id');

    await db.delete(users).where(eq(users.id, userId));

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
};

export const toggleUserStatus = async (c: Context) => {
  try {
    const userId = c.req.param('id');

    const [user] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const [updatedUser] = await db
      .update(users)
      .set({ 
        isActive: !user.isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    const { password, ...userWithoutPassword } = updatedUser;

    return c.json({ 
      message: 'User status updated successfully', 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return c.json({ error: 'Failed to toggle user status' }, 500);
  }
};

// ============ Shopkeeper Management (Service-to-Service) ============

export const getShopkeepers = async (c: Context) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('search') || '';

    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: shopKeeper.id,
        email: shopKeeper.email,
        name: shopKeeper.name,
        phone: shopKeeper.phone,
        avatar: shopKeeper.avatar,
        isVerified: shopKeeper.isVerified,
        isActive: shopKeeper.isActive,
        createdAt: shopKeeper.createdAt,
      })
      .from(shopKeeper)
      .orderBy(desc(shopKeeper.createdAt))
      .limit(limit)
      .offset(offset);

    // Add search filter if provided
    if (search) {
      query = query.where(
        or(
          ilike(shopKeeper.name, `%${search}%`),
          ilike(shopKeeper.email, `%${search}%`)
        )
      ) as any;
    }

    const shopkeeperList = await query;
    
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shopKeeper);

    return c.json({
      shopkeepers: shopkeeperList,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get shopkeepers error:', error);
    return c.json({ error: 'Failed to fetch shopkeepers' }, 500);
  }
};

export const createShopkeeper = async (c: Context) => {
  try {
    const body = await c.req.json();
    // You can add validation here if needed

    // Check if shopkeeper already exists
    const [existingShopkeeper] = await db
      .select()
      .from(shopKeeper)
      .where(eq(shopKeeper.email, body.email))
      .limit(1);

    if (existingShopkeeper) {
      return c.json({ error: 'Shopkeeper already exists' }, 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);
    
    // Create new shopkeeper
    const newShopkeeper = await db.insert(shopKeeper).values({
      name: body.name,
      email: body.email,
      password: hashedPassword,
      phone: body.phone,
    }).returning();

    const { password, ...shopkeeperWithoutPassword } = newShopkeeper[0];

    return c.json({ message: 'Shopkeeper created successfully', shopkeeper: shopkeeperWithoutPassword }, 201);
  } catch (error) {
    console.error('Create shopkeeper error:', error);
    return c.json({ error: 'Failed to create shopkeeper' }, 500);
  }
}

export const getShopkeeper = async (c: Context) => {
  try {
    const shopkeeperId = c.req.param('id');
    
    const [shopkeeper] = await db
      .select({
        id: shopKeeper.id,
        email: shopKeeper.email,
        name: shopKeeper.name,
        phone: shopKeeper.phone,
        avatar: shopKeeper.avatar,
        isVerified: shopKeeper.isVerified,
        isActive: shopKeeper.isActive,
        createdAt: shopKeeper.createdAt,
      })
      .from(shopKeeper)
      .where(eq(shopKeeper.id, shopkeeperId))
      .limit(1);

    if (!shopkeeper) {
      return c.json({ error: 'Shopkeeper not found' }, 404);
    }

    return c.json({ shopkeeper });
  } catch (error) {
    console.error('Get shopkeeper error:', error);
    return c.json({ error: 'Failed to fetch shopkeeper' }, 500);
  }
};

export const updateShopkeeper = async (c: Context) => {
  try {
    const shopkeeperId = c.req.param('id');
    const body = await c.req.json();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;

    const [updatedShopkeeper] = await db
      .update(shopKeeper)
      .set(updateData)
      .where(eq(shopKeeper.id, shopkeeperId))
      .returning();

    if (!updatedShopkeeper) {
      return c.json({ error: 'Shopkeeper not found' }, 404);
    }

    const { password, ...shopkeeperWithoutPassword } = updatedShopkeeper;

    return c.json({ message: 'Shopkeeper updated successfully', shopkeeper: shopkeeperWithoutPassword });
  } catch (error) {
    console.error('Update shopkeeper error:', error);
    return c.json({ error: 'Failed to update shopkeeper' }, 500);
  }
};

export const deleteShopkeeper = async (c: Context) => {
  try {
    const shopkeeperId = c.req.param('id');

    await db.delete(shopKeeper).where(eq(shopKeeper.id, shopkeeperId));

    return c.json({ message: 'Shopkeeper deleted successfully' });
  } catch (error) {
    console.error('Delete shopkeeper error:', error);
    return c.json({ error: 'Failed to delete shopkeeper' }, 500);
  }
};

export const toggleShopkeeperStatus = async (c: Context) => {
  try {
    const shopkeeperId = c.req.param('id');

    const [shopkeeper] = await db
      .select({ isActive: shopKeeper.isActive })
      .from(shopKeeper)
      .where(eq(shopKeeper.id, shopkeeperId))
      .limit(1);

    if (!shopkeeper) {
      return c.json({ error: 'Shopkeeper not found' }, 404);
    }

    const [updatedShopkeeper] = await db
      .update(shopKeeper)
      .set({ 
        isActive: !shopkeeper.isActive,
        updatedAt: new Date(),
      })
      .where(eq(shopKeeper.id, shopkeeperId))
      .returning();

    const { password, ...shopkeeperWithoutPassword } = updatedShopkeeper;

    return c.json({ 
      message: 'Shopkeeper status updated successfully', 
      shopkeeper: shopkeeperWithoutPassword 
    });
  } catch (error) {
    console.error('Toggle shopkeeper status error:', error);
    return c.json({ error: 'Failed to toggle shopkeeper status' }, 500);
  }
};

export const getAdmins = async (c: Context) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('search') || '';

    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        createdAt: admin.createdAt,
        isActive: admin.isActive,
      })
      .from(admin)
      .orderBy(desc(admin.createdAt))
      .limit(limit)
      .offset(offset);

    // Add search filter if provided
    if (search) {
      query = query.where(
        or(
          ilike(admin.name, `%${search}%`),
          ilike(admin.email, `%${search}%`)
        )
      ) as any;
    }

    const adminList = await query;
    
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(admin);

    return c.json({
      admins: adminList,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get admins error:', error);
    return c.json({ error: 'Failed to fetch admins' }, 500);
  }
}

export const createAdmin = async (c: Context) => {
  try {
    const body = await c.req.json();
    // You can add validation here if needed

    // Check if admin already exists
    const [existingAdmin] = await db
      .select()
      .from(admin)
      .where(eq(admin.email, body.email))
      .limit(1);

    if (existingAdmin) {
      return c.json({ error: 'Admin already exists' }, 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);
    
    // Create new admin
    const newAdmin = await db.insert(admin).values({
      name: body.name,
      email: body.email,
      password: hashedPassword,
    }).returning();

    return c.json({ message: 'Admin created successfully', adminId: newAdmin[0].id }, 201);
  } catch (error) {
    console.error('Create admin error:', error);
    return c.json({ error: 'Failed to create admin' }, 500);
  }
};

export const getAdmin = async (c: Context) => {
  try {
    const adminId = c.req.param('id');
    
    const [adminUser] = await db
      .select({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        createdAt: admin.createdAt,
      })
      .from(admin)
      .where(eq(admin.id, adminId))
      .limit(1);

    if (!adminUser) {
      return c.json({ error: 'Admin not found' }, 404);
    }

    return c.json({ admin: adminUser });
  } catch (error) {
    console.error('Get admin error:', error);
    return c.json({ error: 'Failed to fetch admin' }, 500);
  }
}

export const updateAdmin = async (c: Context) => {
  try {
    const adminId = c.req.param('id');
    const body = await c.req.json();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name) updateData.name = body.name;

    const [updatedAdmin] = await db
      .update(admin)
      .set(updateData)
      .where(eq(admin.id, adminId))
      .returning();

    if (!updatedAdmin) {
      return c.json({ error: 'Admin not found' }, 404);
    }

    const { password, ...adminWithoutPassword } = updatedAdmin;

    return c.json({ message: 'Admin updated successfully', admin: adminWithoutPassword });
  } catch (error) {
    console.error('Update admin error:', error);
    return c.json({ error: 'Failed to update admin' }, 500);
  }
};

export const deleteAdmin = async (c: Context) => {
  try {
    const adminId = c.req.param('id');

    await db.delete(admin).where(eq(admin.id, adminId));

    return c.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    return c.json({ error: 'Failed to delete admin' }, 500);
  }
};

export const toggleAdminStatus = async (c: Context) => {
  try {
    const adminId = c.req.param('id');

    const [adminUser] = await db
      .select({ isActive: admin.isActive })
      .from(admin)
      .where(eq(admin.id, adminId))
      .limit(1);

    if (!adminUser) {
      return c.json({ error: 'Admin not found' }, 404);
    }

    const [updatedAdmin] = await db
      .update(admin)
      .set({ 
        isActive: !adminUser.isActive,
        updatedAt: new Date(),
      })
      .where(eq(admin.id, adminId))
      .returning();

    const { password, ...adminWithoutPassword } = updatedAdmin;

    return c.json({ 
      message: 'Admin status updated successfully', 
      admin: adminWithoutPassword 
    });
  } catch (error) {
    console.error(' Toggle admin status error:', error);
    return c.json({ error: 'Failed to toggle admin status' }, 500);
  }
};