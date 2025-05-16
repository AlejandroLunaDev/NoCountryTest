import { Request, Response } from 'express';
import { userService } from '../services';

export const userController = {
  async createUser(req: Request, res: Response) {
    try {
      const userData = req.body;
      
      const user = await userService.createUser(userData);
      
      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      if (error.message === 'User with this email already exists') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating user',
        error: error.message
      });
    }
  },
  
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      console.error('Error getting user:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting user',
        error: error.message
      });
    }
  },
  
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userData = req.body;
      
      // Check if user exists
      const existingUser = await userService.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const updatedUser = await userService.updateUser(id, userData);
      
      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user',
        error: error.message
      });
    }
  },
  
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const existingUser = await userService.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      await userService.deleteUser(id);
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting user',
        error: error.message
      });
    }
  },
  
  async getUsers(req: Request, res: Response) {
    try {
      const { role, email, limit, offset } = req.query;
      
      const users = await userService.getUsers({
        role: role as string,
        email: email as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error: any) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting users',
        error: error.message
      });
    }
  },
  
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      const result = await userService.login({ email, password });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error during login:', error);
      
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: error.message
      });
    }
  }
};