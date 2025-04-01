import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key").notNull(),
  apiCallsRemaining: integer("api_calls_remaining").notNull().default(50),
  plan: text("plan").notNull().default("free"),
});

// Blacklisted domains that are known to be temporary emails
export const tempDomains = pgTable("temp_domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  source: text("source").notNull(), // where this domain was discovered (manual, api, crowdsourced)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Email verification history
export const verificationHistory = pgTable("verification_history", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  isTempEmail: boolean("is_temp_email").notNull(),
  trustScore: integer("trust_score").notNull(), // 0-100%
  domainAge: text("domain_age"),
  hasMxRecords: boolean("has_mx_records"),
  patternMatch: text("pattern_match"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

// Crowdsourced email reputation data
export const emailReputations = pgTable("email_reputations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(), // Can be a full email or just a domain
  isFullEmail: boolean("is_full_email").notNull(),
  reportType: text("report_type").notNull(), // 'legitimate', 'temporary', 'suspicious', 'phishing', 'spam'
  reportCount: integer("report_count").notNull().default(1),
  totalReports: integer("total_reports").notNull().default(1),
  confidenceScore: integer("confidence_score").notNull().default(0), // 0-100
  lastReportedAt: timestamp("last_reported_at").notNull().defaultNow(),
  firstReportedAt: timestamp("first_reported_at").notNull().defaultNow(),
  metadata: text("metadata"), // Additional JSON metadata about the reports
});

// Schema validation for adding a new user
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Schema validation for adding a new temp domain
export const insertTempDomainSchema = createInsertSchema(tempDomains).pick({
  domain: true,
  source: true,
});

// Schema validation for adding a new verification record
export const insertVerificationSchema = createInsertSchema(verificationHistory).pick({
  email: true,
  isTempEmail: true,
  trustScore: true,
  domainAge: true,
  hasMxRecords: true,
  patternMatch: true,
  userId: true,
});

// Schema validation for adding email reputation
export const insertEmailReputationSchema = createInsertSchema(emailReputations).pick({
  email: true,
  isFullEmail: true,
  reportType: true,
  reportCount: true,
  totalReports: true,
  confidenceScore: true,
  metadata: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTempDomain = z.infer<typeof insertTempDomainSchema>;
export type TempDomain = typeof tempDomains.$inferSelect;

export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Verification = typeof verificationHistory.$inferSelect;

export type InsertEmailReputation = z.infer<typeof insertEmailReputationSchema>;
export type EmailReputation = typeof emailReputations.$inferSelect;

// Email validation schema
export const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
