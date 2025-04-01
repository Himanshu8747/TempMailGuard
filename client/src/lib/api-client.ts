/**
 * API Client for making authenticated requests to the backend
 */

import { queryClient } from './queryClient';

// Types for email verification result
export interface VerificationResult {
  email: string;
  isTempEmail: boolean;
  trustScore: number;
  domainAge: string;
  hasMxRecords: boolean;
  patternMatch: string;
  reputationData?: {
    reportType: string;
    reportCount: number;
    totalReports: number;
    confidenceScore: number;
  };
}

// Types for domain information
export interface TempDomain {
  id: number;
  domain: string;
  source: 'builtin' | 'user' | 'api' | 'crowdsourced';
  createdAt: string;
}

// Types for verification history
export interface Verification {
  id: number;
  email: string;
  isTempEmail: boolean;
  trustScore: number;
  domainAge: string | null;
  hasMxRecords: boolean | null;
  patternMatch: string | null;
  userId: number | null;
  createdAt: string;
}

// Types for API pagination
export interface PaginatedResponse<T> {
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

// Error handling
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Get authentication headers including CSRF token and API key if available
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add CSRF token if available
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  // Add API key if available
  const apiKey = getApiKey();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  return headers;
}

/**
 * Get CSRF token from cookie for use in requests
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(^|;)\s*csrf_token=([^;]+)/);
  return match ? match[2] : null;
}

/**
 * Get API key from local storage
 */
export function getApiKey(): string | null {
  return localStorage.getItem('api_key');
}

/**
 * Set API key in local storage
 */
export function setApiKey(apiKey: string): void {
  localStorage.setItem('api_key', apiKey);
}

/**
 * Clear API key from local storage
 */
export function clearApiKey(): void {
  localStorage.removeItem('api_key');
}

/**
 * Verify an email address
 */
export async function verifyEmail(email: string): Promise<VerificationResult> {
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to verify email',
        response.status,
        error.error?.code || 'VERIFICATION_FAILED'
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Verify multiple emails (bulk verification)
 */
export async function verifyBulkEmails(emails: string[]): Promise<{ results: VerificationResult[] }> {
  try {
    const response = await fetch('/api/verify-bulk', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ emails })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to verify emails',
        response.status,
        error.error?.code || 'BULK_VERIFICATION_FAILED'
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Get user API usage statistics
 */
export async function getUserApiUsage(): Promise<{
  used: number;
  total: number;
  nextReset: string;
  plan: string;
}> {
  try {
    const response = await fetch('/api/user/usage', {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to get API usage',
        response.status,
        error.error?.code || 'API_USAGE_FAILED'
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Get temporary domains list with pagination
 */
export async function getTempDomains(page: number = 1, limit: number = 20): Promise<PaginatedResponse<TempDomain>> {
  try {
    const response = await fetch(`/api/temp-domains?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to get temporary domains',
        response.status,
        error.error?.code || 'GET_DOMAINS_FAILED'
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Add a new temporary domain
 */
export async function addTempDomain(domain: string): Promise<TempDomain> {
  try {
    const response = await fetch('/api/temp-domains', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ domain })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to add domain',
        response.status,
        error.error?.code || 'ADD_DOMAIN_FAILED'
      );
    }

    // Invalidate temp domains cache
    queryClient.invalidateQueries({ queryKey: ['/api/temp-domains'] });
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Update a temporary domain
 */
export async function updateTempDomain(id: number, domain: string): Promise<TempDomain> {
  try {
    const response = await fetch(`/api/temp-domains/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ domain })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to update domain',
        response.status,
        error.error?.code || 'UPDATE_DOMAIN_FAILED'
      );
    }

    // Invalidate temp domains cache
    queryClient.invalidateQueries({ queryKey: ['/api/temp-domains'] });
    queryClient.invalidateQueries({ queryKey: [`/api/temp-domains/${id}`] });
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Delete a temporary domain
 */
export async function deleteTempDomain(id: number): Promise<void> {
  try {
    const response = await fetch(`/api/temp-domains/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to delete domain',
        response.status,
        error.error?.code || 'DELETE_DOMAIN_FAILED'
      );
    }

    // Invalidate temp domains cache
    queryClient.invalidateQueries({ queryKey: ['/api/temp-domains'] });
    
    return;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Get recent verification history
 */
export async function getRecentVerifications(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Verification>> {
  try {
    const response = await fetch(`/api/recent-verifications?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to get recent verifications',
        response.status,
        error.error?.code || 'GET_VERIFICATIONS_FAILED'
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Report an email or domain 
 */
export async function reportEmail(target: string, reportType: 'spam' | 'temp' | 'scam' | 'legit' | 'other', metadata?: string): Promise<any> {
  try {
    const response = await fetch('/api/reputation/report', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ target, reportType, metadata })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to report email',
        response.status,
        error.error?.code || 'REPORT_FAILED'
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Update user subscription plan
 */
export async function updateUserPlan(plan: 'free' | 'premium' | 'enterprise'): Promise<any> {
  try {
    const response = await fetch('/api/user/update-plan', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to update plan',
        response.status,
        error.error?.code || 'UPDATE_PLAN_FAILED'
      );
    }

    // Invalidate user-related queries
    queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Rotate the user's API key
 */
export async function rotateApiKey(): Promise<{ apiKey: string }> {
  try {
    const response = await fetch('/api/rotate-key', {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error?.message || 'Failed to rotate API key',
        response.status,
        error.error?.code || 'ROTATE_KEY_FAILED'
      );
    }

    const result = await response.json();
    
    // Update local storage with new API key
    setApiKey(result.apiKey);
    
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}