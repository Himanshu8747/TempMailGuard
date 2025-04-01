import { apiRequest } from "@/lib/queryClient";
import type { VerificationResult } from "@/types";
/**
 * Verify a single email address
 */
export async function verifyEmail(email: string): Promise<VerificationResult> {
  try {
    const response = await apiRequest("POST", "/api/verify", { email });
    return await response.json();
  } catch (error) {
    console.error("Failed to verify email:", error);
    throw error;
  }
}

/**
 * Verify multiple email addresses at once
 */
export async function verifyBulkEmails(emails: string[]): Promise<VerificationResult[]> {
  try {
    const response = await apiRequest("POST", "/api/bulk-verify", { emails });
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Failed to verify bulk emails:", error);
    throw error;
  }
}

export function parseEmailsFromCsv(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const emails = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle CSV lines (email might be first column)
    const possibleEmail = line.split(',')[0].trim().toLowerCase();
    
    // Basic email validation
    if (possibleEmail.includes('@') && possibleEmail.includes('.')) {
      emails.add(possibleEmail);
    }
  }

  return Array.from(emails);
}

export function getTrustScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Get status badge color based on temp email status
 */
export function getStatusBadgeClass(isTempEmail: boolean, trustScore: number): string {
  if (isTempEmail) {
    return 'bg-red-100 text-red-800';
  } else if (trustScore < 60) {
    return 'bg-yellow-100 text-yellow-800';
  } else {
    return 'bg-green-100 text-green-800';
  }
}

/**
 * Get status text based on verification result
 */
export function getStatusText(isTempEmail: boolean, trustScore: number): string {
  if (isTempEmail) {
    return 'Temporary Email';
  } else if (trustScore < 60) {
    return 'Suspicious Email';
  } else {
    return 'Valid Email';
  }
}

/**
 * Get recommendation based on verification result
 */
export function getRecommendation(result: VerificationResult): string {
  // If the email pattern matches known temporary email patterns or the domain is known
  if (result.isTempEmail) {
    if (result.patternMatch === 'Matches temporary email pattern') {
      return 'This email matches known temporary email patterns. We strongly recommend blocking this email for signup.';
    } else {
      return 'This email appears to be from a disposable email service. We recommend blocking this email for signup.';
    }
  } 
  // For suspicious emails with lower trust scores
  else if (result.trustScore < 60) {
    return 'This email domain has suspicious characteristics. Consider additional verification steps before accepting.';
  } 
  // For legitimate emails
  else {
    return 'This email appears to be legitimate. It is safe to accept this email.';
  }
}
