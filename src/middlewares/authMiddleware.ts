import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';
import prisma from '../config/prisma';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware to verify Supabase JWT token and protect routes
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required', 401));
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return next(new AppError('Invalid or expired token', 401));
    }
    
    // Add user data to request object
    req.user = data.user;
    
    next();
  } catch (error: any) {
    next(new AppError('Authentication error: ' + error.message, 401));
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }
      
      // Get user from database to check role
      const user = await prisma.user.findUnique({
        where: { email: req.user.email }
      });
      
      if (!user) {
        return next(new AppError('User not found', 404));
      }
      
      if (!roles.includes(user.role)) {
        return next(new AppError('Unauthorized: Insufficient permissions', 403));
      }
      
      next();
    } catch (error: any) {
      next(new AppError('Authorization error: ' + error.message, 403));
    }
  };
};