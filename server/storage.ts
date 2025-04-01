import type { User, InsertUser, TempDomain, InsertTempDomain, Verification, InsertVerification, EmailReputation } from "@shared/schema";
import { randomBytes } from "crypto";
import dns from "dns";
import util from "util";
import { Cache } from "./utils/cache";

// Promisify DNS functions
const resolveMx = util.promisify(dns.resolveMx);
const resolveTxt = util.promisify(dns.resolveTxt);

// Cache for domain verification
const domainVerificationCache = new Cache<any>(15 * 60 * 1000); // 15 minutes TTL

/**
 * Utility function to add timeout to promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  timeoutValue?: T, 
): Promise<T> {
  let timer: NodeJS.Timeout;
  
  // Create a promise that resolves/rejects after the specified timeout
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      if (timeoutValue !== undefined) {
        resolve(timeoutValue);
      } else {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }
    }, timeout);
  });
  
  // Race the original promise against the timeout
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeoutPromise,
  ]);
}

// List of built-in temporary email domains
export const builtInTempDomains = [
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'mailinator.com',
  'guerrillamail.com',
  'yopmail.com',
  'dispostable.com',
  'trashmail.com',
  'tempmailer.com',
  '10minutemail.com',
  'mailnesia.com',
  'fake-email.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'emailondeck.com',
  'spamgourmet.com',
  'temp-mail.ru',
  'tempr.email',
  'getnada.com',
  'maildrop.cc',
  'anonbox.net',
  'mailnull.com',
  'discard.email',
  'mailbox.org',
  'mintemail.com',
  'mvrht.net',
  'tempail.com',
  'emailsensei.com',
  'disposablemail.com',
  'mailhazard.com',
  'mytemp.email',
  'burnermail.io',
  'temp-mail.io',
  'spambog.com',
  'blogtrot.com',
  'mohmal.com',
  'fakeinbox.com',
  'mailcatch.com',
  'tempmailaddress.com',
  'tempemails.io',
  // Additional temporary email domains
  'dizigg.com',            // Known temporary email service
  'emailna.co',
  'tmpmail.org',
  'tmp-mail.org',
  'tmpeml.com',
  'tmpbox.net',
  'moakt.cc',
  'disbox.net',
  'tmpmail.net',
  'ezztt.com',
  'secmail.com',
  'mailtempto.com',
  'firemailbox.club',
  'etempmail.net',
  'emailnator.com',
  'inboxkitten.com',
  'email-fake.com',
  'tempmailo.com',
  'fakemail.net',
  'faketempmail.com',
  'mailgen.biz',
  'tempmail.ninja',
  'randomail.net',
  'mailpoof.com',
  'vomoto.com',
  'tempail.com',
  'fakemailbox.com',
  'tenmail.org',
  'mailpect.com',
  'cmail.club',
  'tmailcloud.com',
  'tmail.io',
  'gmailcom.co',
  'dropmail.me',
  'altmails.com',
  'zipmail.in',
  'mymailpro.net',
  'trx365.net',
  'mail4.top',
  'fackmail.net',
  'emlhub.com',
  'tempmail.in',
  'instantemailaddress.com',
  'coolmailpro.com',
  'crazymailing.com',
  'smashmail.de',
  'wegwerfmail.de',
  'guerillamail.com',
  'guerillamail.net',
  'guerillamail.org',
  'sharklasers.com',
  'incognitomail.org',
  'incognitomail.net',
  'cock.li',
  'bareed.ws',
  'zep-mail.com',
  'nowmail.com',
  'inboxalias.com',
  'flurished.com',
  'damnthespam.com',
  'wealthyarmpits.com',
  'greencafe24.com',
  'putosmail.com',
  'everybodygotmail.com',
  'getsharecal.com',
  'hatlasub.com',
];

// Patterns for temporary email detection
const TEMP_EMAIL_PATTERNS = [
  // Domain patterns
  /temp/, /disposable/, /throwaway/, /fake/, /trash/, /junk/, /spam/, /burner/,
  /guerrilla/, /mailinator/, /yopmail/, /10minute/, /discard/, /nada/,
  // Username patterns (higher confidence)
  /[0-9]{5,}@/, /^test[0-9]{2,}@/, /^[a-z0-9]{8,}@/, /^[a-z]+[0-9]{4,}@/,
  /^(temp|tmp|mail|spam|no|fake|user|test|random)[._-]?[a-z0-9]+@/,
  /^[a-z]{4,7}[0-9]{4,}@/,
  // Random-looking usernames
  /^[a-z][0-9]{4,}[a-z]+@/, /^[a-z]+[0-9]{4,}[a-z]+@/,
  // Specific pattern for services like dizigg.com, tempmail, etc.
  /^[a-z]{5,7}[0-9]{4,}@dizigg\.com/,
  /^[a-z]{5,7}[0-9]{4,}@/,
  // High-entropy usernames with random characters
  /^[a-z0-9]{10,}@/
];

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>; 
  createUser(user: InsertUser): Promise<User>;
  decrementApiCalls(userId: number, amount: number): Promise<User>;
  resetApiCalls(userId: number): Promise<User>;
  getUserApiUsage(userId: number): Promise<{used: number, total: number}>;
  updateUserPlan(userId: number, plan: string): Promise<User>;
  updateApiKey(userId: number, newApiKey: string): Promise<User>;
  
  // Temp domain operations
  getAllTempDomains(): Promise<TempDomain[]>;
  getTempDomainsPaginated(page: number, limit: number): Promise<{domains: TempDomain[], total: number}>;
  addTempDomain(domain: InsertTempDomain): Promise<TempDomain>;
  updateTempDomain(id: number, domain: string): Promise<TempDomain | undefined>;
  deleteTempDomain(id: number): Promise<boolean>;
  isTempDomain(domain: string): Promise<boolean>;
  getTempDomainById(id: number): Promise<TempDomain | undefined>;
  
  // Verification operations
  addVerification(verification: InsertVerification): Promise<Verification>;
  getVerificationsByUserId(userId: number, page?: number, limit?: number): Promise<{verifications: Verification[], total: number}>;
  getRecentVerifications(limit?: number, page?: number): Promise<{verifications: Verification[], total: number}>;
  
  // Email verification logic
  verifyEmail(email: string): Promise<{
    email: string;
    isTempEmail: boolean;
    trustScore: number;
    domainAge: string;
    hasMxRecords: boolean;
    patternMatch: string;
  }>;
  
  // Crowdsourced reputation operations
  getEmailReputation(email: string): Promise<EmailReputation | undefined>;
  getDomainReputation(domain: string): Promise<EmailReputation | undefined>;
  reportEmail(email: string, reportType: string, metadata?: string): Promise<EmailReputation>;
  getMostReportedEmails(limit?: number, page?: number): Promise<{reputations: EmailReputation[], total: number}>;
}

/**
 * In-memory implementation of storage interface
 */
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tempDomains: Map<number, TempDomain>;
  private verificationHistory: Map<number, Verification>;
  private currentUserId: number;
  private currentTempDomainId: number;
  private currentVerificationId: number;
  private emailReputations: Map<number, EmailReputation>;
  private currentReputationId: number;

  constructor() {
    this.users = new Map();
    this.tempDomains = new Map();
    this.verificationHistory = new Map();
    this.emailReputations = new Map();
    
    this.currentUserId = 1;
    this.currentTempDomainId = 1;
    this.currentVerificationId = 1;
    this.currentReputationId = 1;
    
    // Add built-in temporary domains
    this.initializeBuiltInDomains();
  }
  
  private async initializeBuiltInDomains() {
    for (const domain of builtInTempDomains) {
      await this.addTempDomain({ 
        domain,
        source: 'builtin'
      });
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }
  
  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.apiKey === apiKey) {
        return user;
      }
    }
    return undefined;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const apiKey = randomBytes(32).toString('hex');
    const user: User = { 
      ...insertUser, 
      id, 
      apiKey, 
      apiCallsRemaining: 10, // Free plan starts with 10 calls
      plan: 'free' 
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async decrementApiCalls(userId: number, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Calculate new API calls remaining
    const newApiCallsRemaining = Math.max(0, user.apiCallsRemaining - amount);
    
    // Update the user
    const updatedUser = { ...user, apiCallsRemaining: newApiCallsRemaining };
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async resetApiCalls(userId: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Reset API calls based on plan
    let apiCallsTotal = 10; // Default for free plan (reduced from 50 to 10)
    
    if (user.plan === 'premium') {
      apiCallsTotal = 1000;
    } else if (user.plan === 'enterprise') {
      apiCallsTotal = 10000;
    }
    
    // Update the user
    const updatedUser = { ...user, apiCallsRemaining: apiCallsTotal };
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async getUserApiUsage(userId: number): Promise<{used: number, total: number}> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Calculate total API calls based on plan
    let total = 10; // Default for free plan
    
    if (user.plan === 'premium') {
      total = 1000;
    } else if (user.plan === 'enterprise') {
      total = 10000;
    }
    
    // Calculate used API calls
    const used = total - user.apiCallsRemaining;
    
    return { used, total };
  }
  
  async updateUserPlan(userId: number, plan: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update the user's plan
    const updatedUser = { ...user, plan };
    this.users.set(userId, updatedUser);
    
    // Now reset the API calls for the new plan
    return this.resetApiCalls(userId);
  }
  
  async updateApiKey(userId: number, newApiKey: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update the user's API key
    const updatedUser = { ...user, apiKey: newApiKey };
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  // Temp domain operations
  async getAllTempDomains(): Promise<TempDomain[]> {
    return Array.from(this.tempDomains.values());
  }
  
  async getTempDomainsPaginated(page: number, limit: number): Promise<{domains: TempDomain[], total: number}> {
    const domains = Array.from(this.tempDomains.values());
    
    // Sort by ID, newest first
    domains.sort((a, b) => b.id - a.id);
    
    // Calculate pagination
    const total = domains.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      domains: domains.slice(startIndex, endIndex),
      total
    };
  }
  
  async addTempDomain(domain: InsertTempDomain): Promise<TempDomain> {
    const id = this.currentTempDomainId++;
    
    const tempDomain: TempDomain = { 
      ...domain,
      id,
      createdAt: new Date()
    };
    
    this.tempDomains.set(id, tempDomain);
    return tempDomain;
  }
  
  async updateTempDomain(id: number, domain: string): Promise<TempDomain | undefined> {
    const tempDomain = this.tempDomains.get(id);
    if (!tempDomain) {
      return undefined;
    }
    
    const updatedDomain = { ...tempDomain, domain };
    this.tempDomains.set(id, updatedDomain);
    
    return updatedDomain;
  }
  
  async deleteTempDomain(id: number): Promise<boolean> {
    return this.tempDomains.delete(id);
  }
  
  async getTempDomainById(id: number): Promise<TempDomain | undefined> {
    return this.tempDomains.get(id);
  }
  
  async isTempDomain(domain: string): Promise<boolean> {
    // First, check if the domain is in our database
    for (const tempDomain of this.tempDomains.values()) {
      if (tempDomain.domain.toLowerCase() === domain.toLowerCase()) {
        return true;
      }
    }
    
    // Next, check if any of our patterns match
    for (const pattern of TEMP_EMAIL_PATTERNS) {
      if (pattern.test(domain.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }
  
  // Verification operations
  async addVerification(verification: InsertVerification): Promise<Verification> {
    const id = this.currentVerificationId++;
    
    const newVerification: Verification = {
      ...verification,
      id,
      createdAt: new Date()
    };
    
    this.verificationHistory.set(id, newVerification);
    return newVerification;
  }
  
  async getVerificationsByUserId(userId: number, page: number = 1, limit: number = 20): Promise<{verifications: Verification[], total: number}> {
    // Filter verifications for the given user
    const userVerifications = Array.from(this.verificationHistory.values())
      .filter(v => v.userId === userId);
    
    // Sort by creation date, most recent first
    userVerifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Calculate pagination
    const total = userVerifications.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      verifications: userVerifications.slice(startIndex, endIndex),
      total
    };
  }
  
  async getRecentVerifications(limit: number = 10, page: number = 1): Promise<{verifications: Verification[], total: number}> {
    const verifications = Array.from(this.verificationHistory.values());
    
    // Sort by creation date, most recent first
    verifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Calculate pagination
    const total = verifications.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      verifications: verifications.slice(startIndex, endIndex),
      total
    };
  }
  
  // Email verification logic
  async verifyEmail(email: string): Promise<{
    email: string;
    isTempEmail: boolean;
    trustScore: number;
    domainAge: string;
    hasMxRecords: boolean;
    patternMatch: string;
  }> {
    const domain = email.split('@')[1].toLowerCase();
    const username = email.split('@')[0].toLowerCase();
    
    // Check if result is in cache
    const cacheKey = `verify:${email}`;
    const cachedResult = domainVerificationCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Start with a high trust score that gets reduced based on checks
    let trustScore = 100;
    let patternMatch = '';
    
    // First check if the domain is in our known temporary domain list
    const isTempDomain = await this.isTempDomain(domain);
    if (isTempDomain) {
      trustScore -= 80;
      patternMatch = 'Known temporary email domain';
    }
    
    // Check for suspicious email patterns
    let patternMatched = false;
    for (const pattern of TEMP_EMAIL_PATTERNS) {
      if (pattern.test(email.toLowerCase())) {
        trustScore -= 40;
        patternMatch = `Email matches temporary pattern: ${pattern}`;
        patternMatched = true;
        break;
      }
    }
    
    // Additional check for random-looking usernames (high entropy)
    if (!patternMatched) {
      // Check for random strings of characters and numbers 
      // which are common in temporary emails
      const hasNumbers = /[0-9]/.test(username);
      const hasLetters = /[a-z]/.test(username);
      const hasSpecialChars = /[^a-z0-9]/.test(username);
      const length = username.length;
      
      // Calculate entropy score - higher means more random-looking
      let entropyScore = 0;
      
      // Long usernames are more suspicious
      if (length > 12) entropyScore += 2;
      if (length > 8) entropyScore += 1;
      
      // Mix of numbers and letters increases entropy
      if (hasNumbers && hasLetters) entropyScore += 2;
      
      // Random distribution of numbers suggests automated generation
      if (hasNumbers) {
        const digitCount = (username.match(/[0-9]/g) || []).length;
        const digitRatio = digitCount / length;
        
        // Check if the email has a high number of digits
        if (digitRatio > 0.4) entropyScore += 2;
        if (digitCount >= 4) entropyScore += 1;
      }
      
      // Check for sequential numbers which are common in temp emails
      if (/\d{4,}/.test(username)) entropyScore += 3;
      
      // Special case for dizigg.com and similar services
      if (domain === 'dizigg.com' && /[a-z]{5,7}[0-9]{4,}/.test(username)) {
        entropyScore += 5;
        patternMatch = 'Matches typical pattern for disposable email service';
      }
      
      // Apply penalties based on entropy score
      if (entropyScore >= 5) {
        trustScore -= 35;
        if (!patternMatch) patternMatch = 'Username appears randomly generated';
      } else if (entropyScore >= 3) {
        trustScore -= 20;
        if (!patternMatch) patternMatch = 'Username has suspicious pattern';
      }
    }
    
    // Check for MX records with a timeout (indicates deliverability)
    let hasMxRecords = false;
    try {
      const mxRecords = await withTimeout(resolveMx(domain), 2000, []);
      hasMxRecords = mxRecords.length > 0;
      
      if (!hasMxRecords) {
        trustScore -= 30;
      }
    } catch (error) {
      // Failed to check MX records
      hasMxRecords = false;
      trustScore -= 20; // Penalize but not as much as no MX records
    }
    
    // Calculate "domain age" (in this demo, we use a simulated value)
    const domainAge = this.mockDomainAge(domain);
    if (domainAge === 'New (less than 30 days)') {
      trustScore -= 15;
    } else if (domainAge === 'Recent (1-6 months)') {
      trustScore -= 5;
    }
    
    // Check if domain looks like a well-known legitimate email provider
    const legitDomains = [
      'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 
      'icloud.com', 'protonmail.com', 'aol.com', 'zoho.com',
      'mail.com', 'yandex.com', 'tutanota.com'
    ];
    
    if (legitDomains.includes(domain)) {
      // If it's a well-known provider, give a small boost
      trustScore = Math.min(100, trustScore + 10);
      if (patternMatch === '') {
        patternMatch = 'Known legitimate email provider';
      }
    }
    
    // Get crowd-sourced reputation if available
    const reputation = await this.getDomainReputation(domain);
    if (reputation) {
      // If domain has been reported multiple times as a temp/spam domain
      if (
        reputation.reportType !== 'legitimate' && 
        reputation.totalReports > 2 &&
        reputation.confidenceScore > 50
      ) {
        trustScore -= 25;
        patternMatch = `${patternMatch} Reported by multiple users as "${reputation.reportType}"`;
      }
      
      // If domain has been validated as legitimate multiple times
      if (
        reputation.reportType === 'legitimate' && 
        reputation.totalReports > 4 &&
        reputation.confidenceScore > 75
      ) {
        trustScore = Math.min(100, trustScore + 15);
        patternMatch = `${patternMatch} Verified as legitimate by multiple users`;
      }
    }
    
    // Ensure trust score is within 0-100 range
    trustScore = Math.max(0, Math.min(100, trustScore));
    
    // Determine if email is temporary based on trust score threshold
    // Lower the threshold from 50 to 40 to be more aggressive about flagging
    const isTempEmail = trustScore < 40;
    
    // Create and cache the result
    const result = {
      email,
      isTempEmail,
      trustScore,
      domainAge,
      hasMxRecords,
      patternMatch: patternMatch || 'No patterns detected'
    };
    
    domainVerificationCache.set(cacheKey, result);
    
    return result;
  }
  
  private mockDomainAge(domain: string): string {
    // For the demo, we'll create predictable fake domain ages 
    // based on the domain name to ensure consistent results
    
    // Use the domain's hash to generate a consistent age
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = ((hash << 5) - hash) + domain.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Use the hash to determine a domain age
    const ageCategory = Math.abs(hash) % 5;
    
    switch (ageCategory) {
      case 0:
        return 'New (less than 30 days)';
      case 1:
        return 'Recent (1-6 months)';
      case 2:
        return 'Established (6-12 months)';
      case 3:
        return 'Mature (1-5 years)';
      case 4:
        return 'Old (5+ years)';
      default:
        return 'Unknown';
    }
  }
  
  // Crowdsourced reputation operations
  async getEmailReputation(email: string): Promise<EmailReputation | undefined> {
    // Search for exact email match first
    for (const reputation of this.emailReputations.values()) {
      if (reputation.isFullEmail && reputation.email.toLowerCase() === email.toLowerCase()) {
        return reputation;
      }
    }
    
    // If no exact match, try domain match
    const domain = email.split('@')[1].toLowerCase();
    return this.getDomainReputation(domain);
  }
  
  async getDomainReputation(domain: string): Promise<EmailReputation | undefined> {
    for (const reputation of this.emailReputations.values()) {
      if (!reputation.isFullEmail && reputation.email.toLowerCase() === domain.toLowerCase()) {
        return reputation;
      }
    }
    return undefined;
  }
  
  async reportEmail(email: string, reportType: string, metadata?: string): Promise<EmailReputation> {
    // Determine if this is a full email or just a domain
    const isFullEmail = email.includes('@');
    const target = isFullEmail ? email.toLowerCase() : email.toLowerCase();
    
    // Check if there's already a reputation entry for this target
    let existingReputation: EmailReputation | undefined;
    
    for (const reputation of this.emailReputations.values()) {
      if (reputation.email.toLowerCase() === target && reputation.isFullEmail === isFullEmail) {
        existingReputation = reputation;
        break;
      }
    }
    
    if (existingReputation) {
      // Update existing reputation
      const now = new Date();
      const reportCount = existingReputation.reportType === reportType ? 
        existingReputation.reportCount + 1 : 1;
      
      // Calculate confidence score (higher with more consistent reports)
      let confidenceScore = Math.min(100, (reportCount / existingReputation.totalReports) * 100);
      
      // If we're changing report types, reduce confidence
      if (existingReputation.reportType !== reportType) {
        confidenceScore = Math.max(30, confidenceScore - 30);
      }
      
      const updatedReputation: EmailReputation = {
        ...existingReputation,
        reportType,
        reportCount,
        totalReports: existingReputation.totalReports + 1,
        confidenceScore,
        lastReportedAt: now,
        metadata: metadata || existingReputation.metadata
      };
      
      this.emailReputations.set(existingReputation.id, updatedReputation);
      return updatedReputation;
    } else {
      // Create new reputation entry
      const now = new Date();
      const id = this.currentReputationId++;
      
      const newReputation: EmailReputation = {
        id,
        email: target,
        isFullEmail,
        reportType,
        reportCount: 1,
        totalReports: 1,
        confidenceScore: 60, // Initial confidence is moderate
        lastReportedAt: now,
        firstReportedAt: now,
        metadata: metadata || null
      };
      
      this.emailReputations.set(id, newReputation);
      return newReputation;
    }
  }
  
  async getMostReportedEmails(limit: number = 10, page: number = 1): Promise<{reputations: EmailReputation[], total: number}> {
    const reputations = Array.from(this.emailReputations.values());
    
    // Sort by number of reports (descending)
    reputations.sort((a, b) => b.totalReports - a.totalReports);
    
    // Calculate pagination
    const total = reputations.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      reputations: reputations.slice(startIndex, endIndex),
      total
    };
  }
}

/**
 * Create appropriate storage instance
 */
export async function createStorage(): Promise<IStorage> {
  return new MemStorage();
}

/**
 * Singleton storage instance
 */
export const storage = new MemStorage();