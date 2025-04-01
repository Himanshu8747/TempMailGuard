// Environment variables for the server
export const HF_API_KEY = process.env.HF_API_KEY || '';
export const MONGODB_URI = process.env.MONGODB_URI || '';

// Validate that required environment variables are set
export function validateEnv() {
  const missingVars = [];
  
  if (!HF_API_KEY) missingVars.push('HF_API_KEY');
  
  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
}