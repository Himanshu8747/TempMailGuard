import { Request } from 'express';

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  totalItems: number;
  baseUrl: string;
}

/**
 * Pagination result with metadata
 */
export interface PaginationResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
  links: {
    self: string;
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

/**
 * Parse pagination parameters from request query
 * Provides defaults and validation
 */
export function getPaginationParams(req: Request): { page: number; limit: number } {
  const pageQuery = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limitQuery = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  
  const page = isNaN(pageQuery) || pageQuery < 1 ? 1 : pageQuery;
  const limit = isNaN(limitQuery) || limitQuery < 1 || limitQuery > 100 ? 20 : limitQuery;
  
  return { page, limit };
}

/**
 * Calculate pagination metadata for a collection of items
 */
export function paginate<T>(
  items: T[],
  options: PaginationOptions
): PaginationResult<T> {
  const { page, limit, totalItems, baseUrl } = options;
  
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / limit);
  
  // Ensure page is within bounds
  const currentPage = page > totalPages && totalPages > 0 ? totalPages : page;
  
  // Check if there are previous/next pages
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  
  // Create URLs for navigation links
  const createUrl = (p: number) => `${baseUrl}?page=${p}&limit=${limit}`;
  
  // Build result object
  return {
    data: items,
    meta: {
      page: currentPage,
      limit,
      totalItems,
      totalPages,
      hasPrevPage,
      hasNextPage
    },
    links: {
      self: createUrl(currentPage),
      first: createUrl(1),
      last: totalPages > 0 ? createUrl(totalPages) : createUrl(1),
      prev: hasPrevPage ? createUrl(currentPage - 1) : null,
      next: hasNextPage ? createUrl(currentPage + 1) : null
    }
  };
}