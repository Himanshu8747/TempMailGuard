import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { log } from '../vite';
import { AppError } from './error-handler';
import { IStorage } from '../storage';

/**
 * CSRF Token middleware
 * This implements a double-submit cookie pattern for CSRF protection
 */
export function csrfProtection(options: { cookie?: string; header?: string } = {}) {
  const cookieName = options.cookie || 'csrf_token';
  const headerName = options.header || 'x-csrf-token';

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }

    // Skip for API requests that use API key authentication
    if (req.headers['x-api-key']) {
      next();
      return;
    }

    // Check if we have a CSRF token in cookies
    const cookieToken = req.cookies?.[cookieName];
    if (!cookieToken) {
      // Generate and set a new CSRF token if one doesn't exist
      const newToken = generateCsrfToken();
      res.cookie(cookieName, newToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
      
      // Fail this request as we've just set a new token
      return next(AppError.forbidden('CSRF token required', 'CSRF_REQUIRED'));
    }

    // Check that the token in the header matches the cookie token
    const headerToken = req.headers[headerName.toLowerCase()];
    if (!headerToken || headerToken !== cookieToken) {
      return next(AppError.forbidden('Invalid CSRF token', 'CSRF_INVALID'));
    }

    next();
  };
}

/**
 * Generate a secure random CSRF token
 */
function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * API Key validation middleware
 */
export function validateApiKey(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip API key validation for specified paths
    const noAuthPaths = [
      '/api/login',
      '/api/register',
      '/api/verify'  // Public API endpoint
    ];
    
    if (noAuthPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      // No API key, check if user is authenticated through session
      if ((req as any).user) {
        return next();
      }
      
      return next(AppError.unauthorized(
        'API key required', 
        'API_KEY_REQUIRED',
        { header: 'x-api-key' }
      ));
    }
    
    try {
      const user = await storage.getUserByApiKey(apiKey);
      
      if (!user) {
        return next(AppError.unauthorized('Invalid API key', 'INVALID_API_KEY'));
      }
      
      // Attach the user to the request for use in other middleware
      (req as any).user = user;
      
      next();
    } catch (error) {
      next(AppError.internal('Error validating API key'));
    }
  };
}

/**
 * API Key rotation middleware - called after successful login
 */
export function rotateApiKey(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return next(AppError.unauthorized('Authentication required'));
      }
      
      // Generate a new API key
      const newApiKey = randomBytes(32).toString('hex');
      
      // Update the user's API key
      const user = await storage.updateApiKey(userId, newApiKey);
      
      // Return the new API key
      res.json({
        message: 'API key rotated successfully',
        apiKey: newApiKey,
        userId: user.id,
        username: user.username
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Only set CSP in production to avoid issues during development
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';"
    );
  }
  
  next();
}