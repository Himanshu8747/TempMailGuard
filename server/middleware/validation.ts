import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { AppError } from './error-handler';

/**
 * Validate request body against a zod schema
 */
export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  errorMessage: string = 'Invalid request body'
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        next(AppError.badRequest(errorMessage, 'VALIDATION_ERROR', validationError.details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request params against a zod schema
 */
export function validateParams<T extends z.ZodTypeAny>(
  schema: T,
  errorMessage: string = 'Invalid request parameters'
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        next(AppError.badRequest(errorMessage, 'VALIDATION_ERROR', validationError.details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request query against a zod schema
 */
export function validateQuery<T extends z.ZodTypeAny>(
  schema: T,
  errorMessage: string = 'Invalid query parameters'
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        next(AppError.badRequest(errorMessage, 'VALIDATION_ERROR', validationError.details));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate email
 */
export const emailSchema = z.string().email().min(5).max(255);

/**
 * Request with authenticated user
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return next(AppError.unauthorized('Authentication required'));
  }
  next();
}

/**
 * Validate user has sufficient API calls remaining
 */
export function checkApiCallsRemaining(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return next(AppError.unauthorized('Authentication required'));
  }
  
  if (user.apiCallsRemaining <= 0) {
    return next(AppError.forbidden(
      'API call limit reached', 
      'API_LIMIT_REACHED',
      { 
        limit: user.plan === 'free' ? 10 : (user.plan === 'premium' ? 1000 : 10000),
        resetInfo: 'API call limits reset daily at midnight UTC'
      }
    ));
  }
  
  next();
}

/**
 * Restrict endpoint to specific plans
 */
export function requirePlan(allowedPlans: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return next(AppError.unauthorized('Authentication required'));
    }
    
    if (!allowedPlans.includes(user.plan)) {
      return next(AppError.forbidden(
        'This feature requires a higher plan', 
        'PLAN_UPGRADE_REQUIRED',
        { 
          currentPlan: user.plan,
          requiredPlans: allowedPlans
        }
      ));
    }
    
    next();
  };
}