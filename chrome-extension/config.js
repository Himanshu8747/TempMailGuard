// TempMailGuard extension configuration
// This is the default configuration file
// When downloaded, this file will be customized with user settings

const EXTENSION_CONFIG = {
  enableAutoCheck: true,
  showInlineWarnings: true,
  blockFormSubmission: false,
  collectAnonymousStats: true,
  activateOnAllSites: false,
  excludeSites: [],
  trustThreshold: 40, // Updated to match the server threshold
  apiEndpoint: "http://localhost:5000",
  extensionVersion: "1.0.0"
};