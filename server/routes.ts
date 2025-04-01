import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import path from "path";
import fs from "fs";
import archiver from "archiver";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes - all routes are prefixed with /api
  
  // Initialize a demo user for testing if not already present
  try {
    let demoUser = await storage.getUserByUsername('demouser');
    if (!demoUser) {
      demoUser = await storage.createUser({
        username: 'demouser',
        password: 'demo123' // A simple password for the demo user
      });
      console.log('Created demo user:', demoUser);
    }
  } catch (error) {
    console.error('Error creating demo user:', error);
  }

  // Verify a single email
  app.get("/api/verify", async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ error: 'Email parameter is required' });
      }
      
      const result = await storage.verifyEmail(email);
      
      // Always add to verification history to track activity
      try {
        // For GET requests, we'll use a default user ID of 1
        const userId = 1;
        
        // Add this verification to the recent activity
        await storage.addVerification({
          email: result.email,
          isTempEmail: result.isTempEmail,
          trustScore: result.trustScore,
          domainAge: result.domainAge,
          hasMxRecords: result.hasMxRecords,
          patternMatch: result.patternMatch,
          userId: userId
        });
        
        // No need to decrement API calls for GET requests to keep the demo functional
      } catch (verificationError) {
        console.error('Failed to add verification record:', verificationError);
        // Continue anyway to return the result
      }
      
      return res.json(result);
    } catch (error) {
      console.error('Email verification error:', error);
      return res.status(500).json({ error: 'Failed to verify email' });
    }
  });
  
  app.post("/api/verify", async (req: Request, res: Response) => {
    try {
      const { email } = emailSchema.parse(req.body);
      
      // Get the user (in a real app, this would use auth tokens)
      // For now, we'll use a demo user ID
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if the user has API calls remaining
      if (user.apiCallsRemaining <= 0) {
        return res.status(403).json({ 
          error: "API limit exceeded", 
          message: "You have used all your available API calls for this billing period"
        });
      }
      
      // Verify email address
      const result = await storage.verifyEmail(email);
      
      // Get reputation data
      const reputationData = await storage.getEmailReputation(email);
      
      // If we have reputation data, adjust the trust score
      if (reputationData) {
        // If many users reported it as temporary/suspicious/spam/phishing, reduce the trust score further
        if (
          reputationData.reportType !== 'legitimate' && 
          reputationData.totalReports > 3 &&
          reputationData.confidenceScore > 70
        ) {
          result.trustScore = Math.max(10, result.trustScore - 20);
          result.isTempEmail = true; // Mark as temp email based on crowd reports
        }
        
        // If many users report it as legitimate, increase trust score
        if (
          reputationData.reportType === 'legitimate' && 
          reputationData.totalReports > 5 &&
          reputationData.confidenceScore > 80
        ) {
          result.trustScore = Math.min(100, result.trustScore + 10);
        }
      }
      
      // Add to verification history
      await storage.addVerification({
        email: result.email,
        isTempEmail: result.isTempEmail,
        trustScore: result.trustScore,
        domainAge: result.domainAge,
        hasMxRecords: result.hasMxRecords,
        patternMatch: result.patternMatch,
        userId: userId
      });
      
      // Decrement API calls (single verification = 1 call)
      await storage.decrementApiCalls(userId, 1);
      
      // Get updated API calls remaining
      const apiUsage = await storage.getUserApiUsage(userId);
      
      return res.json({
        ...result,
        reputationData,
        apiCallsRemaining: user.apiCallsRemaining - 1, 
        apiCallsTotal: apiUsage.total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      return res.status(500).json({ error: "Failed to verify email" });
    }
  });
  
  // Get known temporary domains
  app.get("/api/temp-domains", async (_req: Request, res: Response) => {
    try {
      const domains = await storage.getAllTempDomains();
      return res.json(domains);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch temp domains" });
    }
  });
  
  // Add a new temporary domain
  app.post("/api/temp-domains", async (req: Request, res: Response) => {
    try {
      const domainSchema = z.object({
        domain: z.string().min(3)
      });
      
      const { domain } = domainSchema.parse(req.body);
      
      // Check if domain already exists
      const isDomainExists = await storage.isTempDomain(domain);
      if (isDomainExists) {
        return res.status(409).json({ error: "Domain already exists in the blocklist" });
      }
      
      const newDomain = await storage.addTempDomain({
        domain,
        source: 'user'
      });
      
      return res.status(201).json(newDomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      return res.status(500).json({ error: "Failed to add domain" });
    }
  });
  
  // Get a specific domain by ID
  app.get("/api/temp-domains/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const domainId = parseInt(id, 10);
      
      if (isNaN(domainId)) {
        return res.status(400).json({ error: "Invalid domain ID" });
      }
      
      const domain = await storage.getTempDomainById(domainId);
      
      if (!domain) {
        return res.status(404).json({ error: "Domain not found" });
      }
      
      return res.json(domain);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch domain" });
    }
  });
  
  // Update a domain
  app.patch("/api/temp-domains/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const domainId = parseInt(id, 10);
      
      if (isNaN(domainId)) {
        return res.status(400).json({ error: "Invalid domain ID" });
      }
      
      const domainSchema = z.object({
        domain: z.string().min(3)
      });
      
      const { domain } = domainSchema.parse(req.body);
      
      const existingDomain = await storage.getTempDomainById(domainId);
      if (!existingDomain) {
        return res.status(404).json({ error: "Domain not found" });
      }
      
      // Prevent updating built-in domains
      if (existingDomain.source === 'builtin') {
        return res.status(403).json({ error: "Cannot modify built-in domains" });
      }
      
      const updatedDomain = await storage.updateTempDomain(domainId, domain);
      
      return res.json(updatedDomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      return res.status(500).json({ error: "Failed to update domain" });
    }
  });
  
  // Delete a domain
  app.delete("/api/temp-domains/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const domainId = parseInt(id, 10);
      
      if (isNaN(domainId)) {
        return res.status(400).json({ error: "Invalid domain ID" });
      }
      
      const domain = await storage.getTempDomainById(domainId);
      
      if (!domain) {
        return res.status(404).json({ error: "Domain not found" });
      }
      
      // Prevent deleting built-in domains
      if (domain.source === 'builtin') {
        return res.status(403).json({ error: "Cannot delete built-in domains" });
      }
      
      await storage.deleteTempDomain(domainId);
      
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete domain" });
    }
  });
  
  // Check if a domain is a known temporary email domain
  app.get("/api/is-temp-domain/:domain", async (req: Request, res: Response) => {
    try {
      const { domain } = req.params;
      const isTempDomain = await storage.isTempDomain(domain);
      return res.json({ domain, isTempDomain });
    } catch (error) {
      return res.status(500).json({ error: "Failed to check domain" });
    }
  });
  
  // Get recent verifications (limited to 10)
  app.get("/api/recent-verifications", async (_req: Request, res: Response) => {
    try {
      const verifications = await storage.getRecentVerifications(10);
      return res.json(verifications);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch recent verifications" });
    }
  });
  
  // Bulk email verification (for CSV uploads or multiple emails)
  app.post("/api/verify-bulk", async (req: Request, res: Response) => {
    try {
      const bulkSchema = z.object({
        emails: z.array(z.string().email())
      });
      
      const { emails } = bulkSchema.parse(req.body);
      
      if (emails.length > 15) {
        return res.status(400).json({ error: "Maximum 15 emails allowed per bulk request" });
      }
      
      // Get the user (in a real app, this would use auth tokens)
      // For now, we'll use a demo user ID
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Each bulk request costs 10 API calls, so check if user has enough
      if (user.apiCallsRemaining < 10) {
        return res.status(403).json({ 
          error: "API limit exceeded", 
          message: `Bulk verification requires 10 API calls, but you only have ${user.apiCallsRemaining} remaining.`
        });
      }
      
      // Decrement API calls for bulk check (fixed cost)
      await storage.decrementApiCalls(userId, 10);
      
      // Process each email
      const results = await Promise.all(
        emails.map(async (email) => {
          try {
            const result = await storage.verifyEmail(email);
            
            // Add to verification history
            await storage.addVerification({
              email: result.email,
              isTempEmail: result.isTempEmail,
              trustScore: result.trustScore,
              domainAge: result.domainAge,
              hasMxRecords: result.hasMxRecords,
              patternMatch: result.patternMatch,
              userId: userId
            });
            
            return result;
          } catch (error) {
            return {
              email,
              error: "Failed to verify this email"
            };
          }
        })
      );
      
      // Get updated API calls remaining
      const apiUsage = await storage.getUserApiUsage(userId);
      
      return res.json({ 
        results,
        apiCallsRemaining: user.apiCallsRemaining - 10,
        apiCallsTotal: apiUsage.total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      return res.status(500).json({ error: "Failed to process bulk verification" });
    }
  });
  
  // Reset API calls (for testing purposes)
  app.post("/api/user/reset-api-calls", async (_req: Request, res: Response) => {
    try {
      // Get the user (in a real app, this would use auth tokens)
      // For now, we'll use a demo user ID
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updatedUser = await storage.resetApiCalls(userId);
      
      return res.json({
        message: "API calls reset successfully",
        apiCallsRemaining: updatedUser.apiCallsRemaining
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to reset API calls" });
    }
  });
  
  // Get user API usage
  app.get("/api/user/usage", async (_req: Request, res: Response) => {
    try {
      // Get the user (in a real app, this would use auth tokens)
      // For now, we'll use a demo user ID
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const apiUsage = await storage.getUserApiUsage(userId);
      
      return res.json({
        username: user.username,
        plan: user.plan,
        apiCallsUsed: apiUsage.used,
        apiCallsRemaining: user.apiCallsRemaining,
        apiCallsTotal: apiUsage.total,
        nextReset: getNextResetDate() // Monthly reset date
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch API usage" });
    }
  });
  
  // Update user subscription plan
  app.post("/api/user/update-plan", async (req: Request, res: Response) => {
    try {
      const planSchema = z.object({
        plan: z.enum(['free', 'premium', 'enterprise'])
      });
      
      const { plan } = planSchema.parse(req.body);
      
      // In a real app, we'd use the authenticated user's ID
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Update the user's plan
      const updatedUser = await storage.updateUserPlan(userId, plan);
      
      // Get updated API usage
      const apiUsage = await storage.getUserApiUsage(userId);
      
      return res.json({
        success: true,
        message: `Plan successfully updated to ${plan}`,
        user: {
          username: updatedUser.username,
          plan: updatedUser.plan,
          apiCallsRemaining: updatedUser.apiCallsRemaining,
          apiCallsTotal: apiUsage.total
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      console.error('Error updating user plan:', error);
      return res.status(500).json({ error: "Failed to update subscription plan" });
    }
  });
  
  // Helper function to get next reset date (1st of next month)
  function getNextResetDate(): string {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }
  
  // Get statistics for dashboard
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      // Get the user (in a real app, this would use auth tokens)
      // For now, we'll use a demo user ID
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const domains = await storage.getAllTempDomains();
      const verificationsResult = await storage.getRecentVerifications(100);
      
      // Extract the verifications array and ensure it's an array
      const verifications = verificationsResult.verifications || [];
      
      // Calculate statistics
      const emailsChecked = verifications.length;
      const tempEmailsDetected = verifications.filter((v) => v.isTempEmail).length;
      
      // Get API usage information
      const apiUsage = await storage.getUserApiUsage(userId);
      
      // Calculate detection accuracy (in a real app this would be more sophisticated)
      const detectionAccuracy = emailsChecked > 0 
        ? ((tempEmailsDetected / emailsChecked) * 100).toFixed(1)
        : "100.0";
      
      return res.json({
        emailsChecked,
        tempEmailsDetected,
        totalDomains: domains.length,
        apiCallsRemaining: user.apiCallsRemaining,
        apiCallsTotal: apiUsage.total,
        detectionAccuracy: parseFloat(detectionAccuracy),
        plan: user.plan
      });
    } catch (error) {
      console.error('Error in stats endpoint:', error);
      return res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });
  
  // Crowdsourced email reputation endpoints
  app.get("/api/reputation/email/:email", async (req: Request, res: Response) => {
    try {
      const email = req.params.email;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      const reputation = await storage.getEmailReputation(email);
      res.json(reputation || { exists: false });
    } catch (error) {
      console.error(`Error getting email reputation:`, error);
      res.status(500).json({ error: 'Failed to get email reputation' });
    }
  });
  
  app.get("/api/reputation/domain/:domain", async (req: Request, res: Response) => {
    try {
      const domain = req.params.domain;
      if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
      }
      
      const reputation = await storage.getDomainReputation(domain);
      res.json(reputation || { exists: false });
    } catch (error) {
      console.error(`Error getting domain reputation:`, error);
      res.status(500).json({ error: 'Failed to get domain reputation' });
    }
  });
  
  app.post("/api/reputation/report", async (req: Request, res: Response) => {
    try {
      const { email, reportType, metadata } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email or domain is required' });
      }
      
      if (!reportType) {
        return res.status(400).json({ error: 'Report type is required' });
      }
      
      // Validate report type
      const validReportTypes = ['legitimate', 'temporary', 'suspicious', 'phishing', 'spam'];
      if (!validReportTypes.includes(reportType)) {
        return res.status(400).json({ 
          error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}` 
        });
      }
      
      const result = await storage.reportEmail(email, reportType, metadata);
      res.json(result);
    } catch (error) {
      console.error(`Error reporting email:`, error);
      res.status(500).json({ error: 'Failed to report email' });
    }
  });
  
  app.get("/api/reputation/most-reported", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const reputations = await storage.getMostReportedEmails(limit);
      res.json(reputations);
    } catch (error) {
      console.error(`Error getting most reported emails:`, error);
      res.status(500).json({ error: 'Failed to get most reported emails' });
    }
  });

  // Generate and download Chrome extension with custom configuration
  app.post("/api/extension/download", async (req: Request, res: Response) => {
    console.log("[Extension] Download request received");
    try {
      const configSchema = z.object({
        settings: z.object({
          enableAutoCheck: z.boolean(),
          showInlineWarnings: z.boolean(),
          blockFormSubmission: z.boolean(),
          collectAnonymousStats: z.boolean(),
          activateOnAllSites: z.boolean(),
          excludeSites: z.string()
        }),
        trustThreshold: z.number().min(0).max(100)
      });
      
      const config = configSchema.parse(req.body);
      console.log("[Extension] Configuration validated:", JSON.stringify(config, null, 2));
      
      // Set up the zip archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      // Set up error handling on the archive
      archive.on('error', function(err) {
        console.error("[Extension] Archive error:", err);
        res.status(500).json({ error: 'Failed to create archive: ' + err.message });
      });
      
      // Set the response headers for file download
      res.attachment('TempMailGuard-Extension.zip');
      res.setHeader('Content-Type', 'application/zip');
      
      // Pipe the archive to the response
      archive.pipe(res);
      
      // Path to the Chrome extension files
      const extensionPath = path.join(process.cwd(), 'chrome-extension');
      console.log("[Extension] Extension path:", extensionPath);
      
      // Check if directory exists
      if (!fs.existsSync(extensionPath)) {
        console.error("[Extension] Directory not found:", extensionPath);
        return res.status(500).json({ error: 'Extension directory not found' });
      }
      
      // Read manifest.json to update it with user configuration
      const manifestPath = path.join(extensionPath, 'manifest.json');
      console.log("[Extension] Reading manifest from:", manifestPath);
      let manifest;
      
      try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        manifest = JSON.parse(manifestContent);
        console.log("[Extension] Manifest read successfully");
        
        // Add background permission if it doesn't exist
        if (!manifest.permissions.includes('background')) {
          manifest.permissions.push('background');
          console.log("[Extension] Added background permission");
        }
      } catch (err) {
        console.error('[Extension] Error reading manifest.json:', err);
        return res.status(500).json({ error: 'Failed to read extension manifest' });
      }
      
      // Create config.js with user settings
      // Extract host and port from request, fallback to defaults
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      const serverUrl = `${protocol}://${host}`;
      
      console.log("[Extension] Server URL for config:", serverUrl);
      
      const configJs = `// TempMailGuard extension configuration
// Generated on ${new Date().toISOString()}
// Server: ${serverUrl}

const EXTENSION_CONFIG = {
  enableAutoCheck: ${config.settings.enableAutoCheck},
  showInlineWarnings: ${config.settings.showInlineWarnings},
  blockFormSubmission: ${config.settings.blockFormSubmission},
  collectAnonymousStats: ${config.settings.collectAnonymousStats},
  activateOnAllSites: ${config.settings.activateOnAllSites},
  excludeSites: ${JSON.stringify(
    config.settings.excludeSites
      .split('\n')
      .map(site => site.trim())
      .filter(Boolean)
  )},
  trustThreshold: ${config.trustThreshold},
  apiEndpoint: "${serverUrl}",
  extensionVersion: "${manifest.version || '1.0.0'}"
};
`;
      
      // Add each file from the extension directory to the archive
      const addDirectoryToArchive = (dirPath: string, archivePath: string) => {
        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            // Recursively add subdirectories
            addDirectoryToArchive(filePath, path.join(archivePath, file));
          } else {
            // Skip config.js as we'll create a custom one
            if (file === 'config.js') return;
            
            // Handle manifest.json specially to update permissions
            if (file === 'manifest.json') {
              archive.append(JSON.stringify(manifest, null, 2), { name: path.join(archivePath, file) });
            } else {
              archive.file(filePath, { name: path.join(archivePath, file) });
            }
          }
        });
      };
      
      // Add all extension files to the archive
      addDirectoryToArchive(extensionPath, '');
      
      // Add the custom config.js file
      archive.append(configJs, { name: 'config.js' });
      
      // Finalize the archive
      archive.finalize();
      
    } catch (error) {
      console.error('Error generating extension:', error);
      
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      return res.status(500).json({ error: 'Failed to generate extension package' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
