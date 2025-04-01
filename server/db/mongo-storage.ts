import { 
  IStorage,
  builtInTempDomains
} from '../storage';
import { 
  InsertUser, 
  User, 
  InsertTempDomain, 
  TempDomain, 
  InsertVerification, 
  Verification,
  EmailReputation
} from '../../shared/schema';
import { connectToDatabase } from './mongodb';
import { UserModel, TempDomainModel, VerificationModel, EmailReputationModel, getNextId } from './models';
import { log } from '../vite';
import crypto from 'crypto';

export class MongoStorage implements IStorage {
  private initialized = false;

  constructor() {
    // Initialize in the background to not block constructor
    this.initialize().catch(error => {
      log(`Background initialization failed: ${error}`, 'mongodb');
      // Mark as initialized anyway to prevent further attempts
      this.initialized = true;
    });
  }

  private async initialize() {
    try {
      // Create a connection promise with timeout
      const connectionPromise = connectToDatabase();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('MongoDB connection timeout after 5 seconds'));
        }, 5000);
      });
      
      // Race the connection against the timeout
      const connection = await Promise.race([
        connectionPromise,
        timeoutPromise
      ]);
      
      // Check if connection failed
      if (!connection) {
        throw new Error('MongoDB connection returned null');
      }
      
      // Set a timeout for database operations
      const seedPromise = async () => {
        // Check if we need to seed initial data
        const domainsCount = await TempDomainModel.countDocuments();
        
        if (domainsCount === 0) {
          log('Seeding initial temp domain data...', 'mongodb');
          // Seed built-in temp domains - limit concurrency to avoid overwhelming connection
          const chunks = [];
          const chunkSize = 20;
          
          for (let i = 0; i < builtInTempDomains.length; i += chunkSize) {
            chunks.push(builtInTempDomains.slice(i, i + chunkSize));
          }
          
          for (const chunk of chunks) {
            const domainPromises = chunk.map(async (domain: string) => {
              const id = await getNextId('TempDomain');
              return new TempDomainModel({
                id,
                domain,
                source: 'builtin',
                createdAt: new Date()
              }).save();
            });
            
            await Promise.all(domainPromises);
          }
          
          log(`Seeded ${builtInTempDomains.length} built-in temp domains`, 'mongodb');
        }
      };
      
      const seedTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('MongoDB seeding timeout after 10 seconds'));
        }, 10000);
      });
      
      // Try to seed data but don't let it block app startup for too long
      try {
        await Promise.race([seedPromise(), seedTimeoutPromise]);
      } catch (seedError) {
        log(`Warning: MongoDB seeding timed out or failed: ${seedError}`, 'mongodb');
        // We can continue even if seeding failed
      }
      
      this.initialized = true;
      log('MongoDB storage initialized successfully', 'mongodb');
    } catch (error) {
      log(`Failed to initialize MongoDB storage: ${error}`, 'mongodb');
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      try {
        // Try to initialize with a timeout guard
        const initPromise = this.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Initialization timed out after 5 seconds'));
          }, 5000);
        });
        
        await Promise.race([initPromise, timeoutPromise]);
      } catch (error) {
        log(`Failed to ensure initialization: ${error}`, 'mongodb');
        // Mark as initialized to prevent further attempts
        this.initialized = true; 
        throw error;
      }
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    const user = await UserModel.findOne({ id });
    return user ? user.toObject() : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const user = await UserModel.findOne({ username });
    return user ? user.toObject() : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = await getNextId('User');
    const apiKey = crypto.randomBytes(16).toString('hex');
    
    const user = new UserModel({
      ...insertUser,
      id,
      apiKey,
      apiCallsRemaining: 50,
      plan: 'free'
    });
    
    await user.save();
    return user.toObject();
  }

  async decrementApiCalls(userId: number, amount: number): Promise<User> {
    await this.ensureInitialized();
    const user = await UserModel.findOneAndUpdate(
      { id: userId },
      { $inc: { apiCallsRemaining: -amount } },
      { new: true }
    );
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    return user.toObject();
  }

  async resetApiCalls(userId: number): Promise<User> {
    await this.ensureInitialized();
    
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Set API calls based on plan
    let apiCallsRemaining = 10; // default for free tier (reduced from 50 to 10)
    if (user.plan === 'premium') {
      apiCallsRemaining = 1000;
    } else if (user.plan === 'enterprise') {
      apiCallsRemaining = 10000;
    }
    
    user.apiCallsRemaining = apiCallsRemaining;
    await user.save();
    return user.toObject();
  }

  async getUserApiUsage(userId: number): Promise<{used: number, total: number}> {
    await this.ensureInitialized();
    
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    let total = 10; // default for free tier (reduced from 50 to 10)
    if (user.plan === 'premium') {
      total = 1000;
    } else if (user.plan === 'enterprise') {
      total = 10000;
    }
    
    const used = total - user.apiCallsRemaining;
    return { used, total };
  }

  async updateUserPlan(userId: number, plan: string): Promise<User> {
    await this.ensureInitialized();
    
    // Validate the plan
    if (!['free', 'premium', 'enterprise'].includes(plan)) {
      throw new Error('Invalid plan type');
    }
    
    // Find the user
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Get current usage
    const currentUsage = await this.getUserApiUsage(userId);
    const usagePercentage = currentUsage.used / currentUsage.total;
    
    // Determine new API call limits based on plan
    let apiCallsTotal = 10; // Default for free plan (reduced from 50 to 10)
    
    if (plan === 'premium') {
      apiCallsTotal = 1000;
    } else if (plan === 'enterprise') {
      apiCallsTotal = 10000;
    }
    
    // Apply the same percentage to the new total
    // This ensures users don't lose their relative usage when upgrading/downgrading
    const newApiCallsRemaining = Math.round(apiCallsTotal * (1 - usagePercentage));
    
    // Update the user
    user.plan = plan;
    user.apiCallsRemaining = newApiCallsRemaining;
    await user.save();
    
    return user.toObject();
  }

  // Temp domain operations
  async getAllTempDomains(): Promise<TempDomain[]> {
    await this.ensureInitialized();
    const domains = await TempDomainModel.find().sort({ createdAt: -1 });
    return domains.map(domain => domain.toObject());
  }

  async addTempDomain(domain: InsertTempDomain): Promise<TempDomain> {
    await this.ensureInitialized();
    const id = await getNextId('TempDomain');
    
    const tempDomain = new TempDomainModel({
      ...domain,
      id,
      createdAt: new Date()
    });
    
    await tempDomain.save();
    return tempDomain.toObject();
  }

  async updateTempDomain(id: number, domain: string): Promise<TempDomain | undefined> {
    await this.ensureInitialized();
    
    const tempDomain = await TempDomainModel.findOneAndUpdate(
      { id },
      { domain },
      { new: true }
    );
    
    return tempDomain ? tempDomain.toObject() : undefined;
  }

  async deleteTempDomain(id: number): Promise<boolean> {
    await this.ensureInitialized();
    
    const result = await TempDomainModel.deleteOne({ id });
    return result.deletedCount === 1;
  }

  async isTempDomain(domain: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const tempDomain = await TempDomainModel.findOne({ domain });
    return !!tempDomain;
  }

  async getTempDomainById(id: number): Promise<TempDomain | undefined> {
    await this.ensureInitialized();
    
    const tempDomain = await TempDomainModel.findOne({ id });
    return tempDomain ? tempDomain.toObject() : undefined;
  }

  // Verification operations
  async addVerification(verification: InsertVerification): Promise<Verification> {
    await this.ensureInitialized();
    
    const id = await getNextId('Verification');
    
    const newVerification = new VerificationModel({
      ...verification,
      id,
      createdAt: new Date()
    });
    
    await newVerification.save();
    return newVerification.toObject();
  }

  async getVerificationsByUserId(userId: number): Promise<Verification[]> {
    await this.ensureInitialized();
    
    const verifications = await VerificationModel.find({ userId }).sort({ createdAt: -1 });
    return verifications.map(v => v.toObject());
  }

  async getRecentVerifications(limit: number = 10): Promise<Verification[]> {
    await this.ensureInitialized();
    
    const verifications = await VerificationModel.find()
      .sort({ createdAt: -1 })
      .limit(limit);
      
    return verifications.map(v => v.toObject());
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
    await this.ensureInitialized();
    
    // Get the domain part of the email
    const domain = email.split('@')[1];
    
    // Check if it's a known temp email domain
    const isTempDomain = await this.isTempDomain(domain);
    
    // Calculate trust score and other metrics
    let trustScore = isTempDomain ? 5 : 80;
    
    // Check for suspicious patterns
    const patternMatch = this.checkSuspiciousPatterns(email);
    if (patternMatch !== 'none') {
      trustScore -= 30;
    }
    
    // For temp emails the score should be very low
    if (isTempDomain) {
      trustScore = Math.min(trustScore, 10); // Cap at 10 for known temp domains
    }
    
    return {
      email,
      isTempEmail: isTempDomain || trustScore < 40,
      trustScore: Math.max(0, Math.min(100, trustScore)), // Ensure score is between 0-100
      domainAge: this.mockDomainAge(domain),
      hasMxRecords: true, // Mocked for now
      patternMatch
    };
  }

  private checkSuspiciousPatterns(email: string): string {
    const lowercaseEmail = email.toLowerCase();
    const username = lowercaseEmail.split('@')[0];
    
    // Check for random strings, numbers and special chars
    if (/^[a-z0-9]{10,}$/.test(username) && /[0-9]{3,}/.test(username)) {
      return 'random_string';
    }
    
    // Check for temporary patterns
    if (username.includes('temp') || username.includes('disposable') || 
        username.includes('fake') || username.includes('test')) {
      return 'temp_keywords';
    }
    
    // Check for sequential numbers
    if (/[0-9]{4,}/.test(username)) {
      return 'sequential_numbers';
    }
    
    return 'none';
  }
  
  private mockDomainAge(domain: string): string {
    // This is a mock function - in production, this would query WHOIS data
    // For demonstration, return a random age based on domain name length
    const hash = domain.length * 41 % 100;
    
    if (hash < 10) return '< 1 month';
    if (hash < 30) return '1-6 months';
    if (hash < 60) return '6-12 months';
    if (hash < 80) return '1-2 years';
    return '> 2 years';
  }

  // Crowdsourced reputation methods
  async getEmailReputation(email: string): Promise<EmailReputation | undefined> {
    await this.ensureInitialized();
    
    const reputation = await EmailReputationModel.findOne({ 
      email: email, 
      isFullEmail: true 
    });
    
    return reputation ? reputation.toObject() : undefined;
  }
  
  async getDomainReputation(domain: string): Promise<EmailReputation | undefined> {
    await this.ensureInitialized();
    
    const reputation = await EmailReputationModel.findOne({ 
      email: domain, 
      isFullEmail: false 
    });
    
    return reputation ? reputation.toObject() : undefined;
  }
  
  async reportEmail(email: string, reportType: string, metadata?: string): Promise<EmailReputation> {
    await this.ensureInitialized();
    
    // Determine if this is a full email or just a domain
    const isFullEmail = email.includes('@');
    const target = isFullEmail ? email : email.toLowerCase();
    
    // Check if we already have a reputation for this email/domain
    let reputation = await EmailReputationModel.findOne({ 
      email: target, 
      isFullEmail 
    });
    
    if (reputation) {
      // Update existing reputation
      if (reportType === reputation.reportType) {
        reputation.reportCount += 1;
      }
      
      reputation.totalReports += 1;
      reputation.lastReportedAt = new Date();
      
      // Update confidence score
      reputation.confidenceScore = Math.min(
        100, 
        Math.round((reputation.reportCount / (reputation.totalReports + 1)) * 100)
      );
      
      // Update metadata if provided
      if (metadata) {
        reputation.metadata = reputation.metadata 
          ? reputation.metadata + ',' + metadata 
          : metadata;
      }
      
      await reputation.save();
      return reputation.toObject();
    } else {
      // Create new reputation entry
      const id = await getNextId('EmailReputation');
      const now = new Date();
      
      const newReputation = new EmailReputationModel({
        id,
        email: target,
        isFullEmail,
        reportType,
        reportCount: 1,
        totalReports: 1,
        confidenceScore: 100, // First report is 100% confident
        lastReportedAt: now,
        firstReportedAt: now,
        metadata: metadata || null
      });
      
      await newReputation.save();
      return newReputation.toObject();
    }
  }
  
  async getMostReportedEmails(limit: number = 10): Promise<EmailReputation[]> {
    await this.ensureInitialized();
    
    const reputations = await EmailReputationModel.find()
      .sort({ totalReports: -1 })
      .limit(limit);
      
    return reputations.map(r => r.toObject());
  }
}