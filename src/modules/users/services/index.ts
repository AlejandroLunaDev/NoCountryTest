import prisma from '../../../config/prisma';
import {
  CreateUserDTO,
  UpdateUserDTO,
  QueryUsersDTO,
  LoginUserDTO
} from '../types';
import { config } from '../../../config/env';
import { supabase } from '../../../config/supabase';

export const userService = {
  async createUser(data: CreateUserDTO) {
    const { name, email, password, role } = data;

    // Check if user already exists in Prisma database
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user in Supabase
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      throw new Error(`Supabase auth error: ${error.message}`);
    }

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        // Store a reference to the Supabase user ID instead of the password
        password: authData.user?.id || '',
        role
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) return null;

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateUser(id: string, data: UpdateUserDTO) {
    const updateData: any = { ...data };

    // If password is being updated, update it in Supabase
    if (data.password) {
      // Get the user's email to identify them in Supabase
      const user = await prisma.user.findUnique({
        where: { id },
        select: { email: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update password in Supabase
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        throw new Error(`Failed to update password: ${error.message}`);
      }

      // Don't store the actual password in our database
      delete updateData.password;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async deleteUser(id: string) {
    return prisma.user.delete({
      where: { id }
    });
  },

  async getUsers(query: QueryUsersDTO) {
    const { role, email, limit = 10, offset = 0 } = query;

    const whereClause: any = {};

    if (role) {
      whereClause.role = role;
    }

    if (email) {
      whereClause.email = { contains: email };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return users;
  },

  async login(data: LoginUserDTO) {
    const { email, password } = data;

    // Authenticate with Supabase
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error('Invalid credentials');
    }

    // Find user in our database
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found in database');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: authData.session.access_token
    };
  }
};
