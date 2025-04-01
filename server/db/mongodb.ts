import mongoose from 'mongoose';
import { log } from '../vite';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/temp-email-detector';

// Define the structure we'll use for caching the connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare a global variable type to avoid TypeScript errors
declare global {
  var mongoose: MongooseCache | undefined;
}

// Cache connection
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

// Update global cache
if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      // Add connection timeouts to prevent long connection attempts
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      // Recommended options for better stability
      serverSelectionTimeoutMS: 5000,
      // These options help with connection issues
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Maintain up to 10 socket connections
    };

    log(`Connecting to MongoDB at ${MONGODB_URI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`, 'mongodb');
    
    try {
      // Use a promise with a timeout to prevent hanging
      const connectPromise = mongoose.connect(MONGODB_URI, opts);
      
      // Create a timeout promise that rejects after 10 seconds
      const timeoutPromise = new Promise<typeof mongoose>((_, reject) => {
        setTimeout(() => {
          reject(new Error('MongoDB connection timeout after 10 seconds'));
        }, 10000);
      });
      
      // Race the connection against the timeout
      cached.promise = Promise.race([connectPromise, timeoutPromise])
        .then(connection => {
          log('Connected to MongoDB', 'mongodb');
          return connection;
        })
        .catch(error => {
          log(`MongoDB connection error: ${error}`, 'mongodb');
          // Return null so the app can continue without MongoDB
          cached.promise = null;
          throw error;
        });
    } catch (error) {
      log(`Failed to initialize MongoDB connection: ${error}`, 'mongodb');
      // Return null so the app can continue without MongoDB
      cached.promise = null;
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    log(`MongoDB connection failed, falling back to memory storage: ${error}`, 'mongodb');
    // Return null to indicate connection failure
    return null;
  }
}

// Handle connection errors
mongoose.connection.on('error', (err) => {
  log(`MongoDB connection error: ${err}`, 'mongodb');
});

// Log when disconnected
mongoose.connection.on('disconnected', () => {
  log('MongoDB disconnected', 'mongodb');
});

// Handle process termination and close connection properly
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

export default mongoose;