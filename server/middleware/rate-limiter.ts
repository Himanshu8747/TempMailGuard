import { Request, Response, NextFunction } from 'express';
import { Cache } from '../utils/cache';
import { AppError } from './error-handler';

// Cache to store IP-based rate limit data
// Using 1 hour expiry for IP rate limits
const ipRateLimits = new Cache<{ count: number; resetAt: number; }>(60 * 60 * 1000);

// Cache to store auth-based rate limit data
// Using 10 minutes expiry for auth attempts 
const authRateLimits = new Cache<{ count: number; resetAt: number; }>(10 * 60 * 1000);

/**
 * Standard rate limiting middleware for API requests
 * Uses IP-based rate limiting by default
 */
export function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for trusted IPs (e.g. for local development)
  const trustedIps = ['127.0.0.1', '::1', 'localhost'];
  if (trustedIps.includes(req.ip || '')) {
    return next();
  }
  
  // Get client IP address
  const ip = req.ip || 'unknown_ip';
  const key = `rate:${ip}`;
  
  // Get current rate limit data for this IP
  const now = Date.now();
  let limit = ipRateLimits.get(key);
  
  // If not in cache or reset time has passed, create new entry
  if (!limit || now > limit.resetAt) {
    limit = {
      count: 0,
      resetAt: now + (60 * 1000) // Reset after 1 minute
    };
  }
  
  // Increment count and update cache
  limit.count += 1;
  ipRateLimits.set(key, limit);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', '60');  // 60 requests per minute
  res.setHeader('X-RateLimit-Remaining', Math.max(0, 60 - limit.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(limit.resetAt / 1000).toString());
  
  // If over limit, return rate limit error
  if (limit.count > 60) { // 60 requests per minute
    return next(
      AppError.tooManyRequests(
        'Rate limit exceeded, please try again later',
        'RATE_LIMIT_EXCEEDED',
        {
          limit: 60,
          timeWindow: '1 minute',
          retryAfter: Math.ceil((limit.resetAt - now) / 1000)
        }
      )
    );
  }
  
  next();
}

/**
 * Authentication rate limiting middleware
 * Prevents brute force attacks by limiting authentication attempts
 */
export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for trusted IPs (e.g. for local development)
  const trustedIps = ['127.0.0.1', '::1', 'localhost'];
  if (trustedIps.includes(req.ip || '')) {
    return next();
  }
  
  // Get client IP address and identifier (username if provided)
  const ip = req.ip || 'unknown_ip';
  let identifier = req.body?.username || 'anonymous';
  
  // Sanitize identifier to prevent cache key manipulation
  identifier = identifier.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  
  // Create rate limit key combining IP and identifier
  const key = `auth:${ip}:${identifier}`;
  
  // Get current rate limit data
  const now = Date.now();
  let limit = authRateLimits.get(key);
  
  // If not in cache or reset time has passed, create new entry
  if (!limit || now > limit.resetAt) {
    limit = {
      count: 0,
      resetAt: now + (10 * 60 * 1000) // Reset after 10 minutes
    };
  }
  
  // Increment count and update cache
  limit.count += 1;
  authRateLimits.set(key, limit);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', '5');  // 5 login attempts per 10 minutes
  res.setHeader('X-RateLimit-Remaining', Math.max(0, 5 - limit.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(limit.resetAt / 1000).toString());
  
  // If over limit, return rate limit error
  if (limit.count > 5) { // 5 attempts per 10 minutes
    return next(
      AppError.tooManyRequests(
        'Too many authentication attempts, please try again later',
        'AUTH_ATTEMPTS_EXCEEDED',
        {
          limit: 5,
          timeWindow: '10 minutes',
          retryAfter: Math.ceil((limit.resetAt - now) / 1000)
        }
      )
    );
  }
  
  next();
}