// Email verification result type
export interface VerificationResult {
  email: string;
  isTempEmail: boolean;
  trustScore: number;
  domainAge: string;
  hasMxRecords: boolean;
  patternMatch: string;
  error?: string
}

// Type for dashboard statistics
export interface DashboardStats {
  emailsChecked: number;
  tempEmailsDetected: number;
  apiCallsRemaining: number;
  detectionAccuracy: number;
}

// Activity for activity list
export interface Activity {
  id: number;
  type: 'temp_detected' | 'valid_email' | 'suspicious_email' | 'bulk_check';
  email?: string;
  message: string;
  timestamp: Date;
}

// Plan types for users
export type PlanType = 'free' | 'premium' | 'enterprise';

// User profile type
export interface UserProfile {
  id: number;
  username: string;
  plan: PlanType;
  apiCallsRemaining: number;
  apiCallsTotal: number;
}
