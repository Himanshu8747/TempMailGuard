import mongoose, { Document, Schema } from 'mongoose';
import { User, TempDomain, Verification, EmailReputation } from '../../shared/schema';

// User Schema
interface UserDocument extends Document, Omit<User, 'id'> {
  id: number;
}

const userSchema = new Schema<UserDocument>({
  id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  apiKey: { type: String, required: true, unique: true },
  apiCallsRemaining: { type: Number, required: true, default: 50 },
  plan: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' }
}, { timestamps: true });

// Temp Domain Schema
interface TempDomainDocument extends Document, Omit<TempDomain, 'id'> {
  id: number;
}

const tempDomainSchema = new Schema<TempDomainDocument>({
  id: { type: Number, required: true, unique: true },
  domain: { type: String, required: true, unique: true },
  source: { type: String, enum: ['builtin', 'user'], required: true },
  createdAt: { type: Date, default: Date.now }
});

// Verification History Schema
interface VerificationDocument extends Document, Omit<Verification, 'id'> {
  id: number;
}

const verificationSchema = new Schema<VerificationDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true },
  email: { type: String, required: true },
  isTempEmail: { type: Boolean, required: true },
  trustScore: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Email Reputation Schema
interface EmailReputationDocument extends Document, Omit<EmailReputation, 'id'> {
  id: number;
}

const emailReputationSchema = new Schema<EmailReputationDocument>({
  id: { type: Number, required: true, unique: true },
  email: { type: String, required: true },
  isFullEmail: { type: Boolean, required: true },
  reportType: { type: String, required: true },
  reportCount: { type: Number, required: true, default: 1 },
  totalReports: { type: Number, required: true, default: 1 },
  confidenceScore: { type: Number, required: true, default: 0 },
  lastReportedAt: { type: Date, required: true, default: Date.now },
  firstReportedAt: { type: Date, required: true, default: Date.now },
  metadata: { type: String, default: null }
});

// Create and export models
export const UserModel = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);
export const TempDomainModel = mongoose.models.TempDomain || mongoose.model<TempDomainDocument>('TempDomain', tempDomainSchema);
export const VerificationModel = mongoose.models.Verification || mongoose.model<VerificationDocument>('Verification', verificationSchema);
export const EmailReputationModel = mongoose.models.EmailReputation || mongoose.model<EmailReputationDocument>('EmailReputation', emailReputationSchema);

// Counters for auto-incrementing IDs
interface CounterDocument extends Document {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export const CounterModel = mongoose.models.Counter || mongoose.model<CounterDocument>('Counter', counterSchema);

// Function to get the next ID value for a specific model
export async function getNextId(modelName: string): Promise<number> {
  const counter = await CounterModel.findByIdAndUpdate(
    modelName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}