import { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

/**
 * Custom application error with status code and error code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Factory methods for common error types
   */
  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details?: any) {
    return new AppError(message, 400, code, details);
  }
  
  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details?: any) {
    return new AppError(message, 401, code, details);
  }
  
  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details?: any) {
    return new AppError(message, 403, code, details);
  }
  
  static notFound(message = 'Not found', code = 'NOT_FOUND', details?: any) {
    return new AppError(message, 404, code, details);
  }
  
  static methodNotAllowed(message = 'Method not allowed', code = 'METHOD_NOT_ALLOWED', details?: any) {
    return new AppError(message, 405, code, details);
  }
  
  static conflict(message = 'Conflict', code = 'CONFLICT', details?: any) {
    return new AppError(message, 409, code, details);
  }
  
  static tooManyRequests(message = 'Too many requests', code = 'TOO_MANY_REQUESTS', details?: any) {
    return new AppError(message, 429, code, details);
  }
  
  static internal(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR', details?: any) {
    return new AppError(message, 500, code, details);
  }
}

/**
 * Error handler middleware for Express
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Log the error
  log(`Error in ${req.method} ${req.path}: ${err.message}`, 'error');
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }
  
  // If it's our custom error class
  if (err instanceof AppError) {
    const { statusCode, code, message, details } = err;
    
    res.status(statusCode).json({
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    });
    return;
  }
  
  // If it's a Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message
      }
    });
    return;
  }
  
  // If it's a JWT error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
    return;
  }
  
  // Handle any other error types
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    }
  });
}

/**
 * 404 Not Found handler for routes that don't match any handlers
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    }
  });
}