// Export environment variables for Vite to use on the client side
// These will be prefixed with VITE_ and exposed to the client
module.exports = {
  VITE_CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  VITE_HF_API_KEY: process.env.HF_API_KEY,
};