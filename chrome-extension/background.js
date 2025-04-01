// TempMailGuard Background Script
// Handles communication between content scripts and popup

// Import configuration (this will be replaced during extension download)
// The config values will be overridden from config.js which is customized during download
let API_URL = 'http://localhost:3000/api';
let extensionConfig = {
  enableAutoCheck: true,
  showInlineWarnings: true,
  blockFormSubmission: false,
  collectAnonymousStats: true,
  activateOnAllSites: false,
  excludeSites: [],
  trustThreshold: 30,
  apiEndpoint: "http://localhost:3000",
  extensionVersion: "1.0.0"
};

// Update API URL from config if available
try {
  // This will be set by the config.js that's included in the download
  if (typeof EXTENSION_CONFIG !== 'undefined') {
    extensionConfig = EXTENSION_CONFIG;
    API_URL = `${extensionConfig.apiEndpoint}/api`;
    console.log("Loaded configuration from config.js");
    console.log("Using API endpoint:", API_URL);
  }
} catch (error) {
  console.error("Failed to load custom configuration:", error);
}

// Default extension settings (for compatibility with old code)
const defaultSettings = {
  enabled: true,
  showNotifications: extensionConfig.showInlineWarnings,
  validateOnBlur: extensionConfig.enableAutoCheck,
  validateOnInput: extensionConfig.enableAutoCheck,
  apiKey: '', // Would be set by user after authenticating
  domainList: 'global', // 'global' or 'custom'
  trustThreshold: extensionConfig.trustThreshold
};

// Local cache for domain lists to reduce API calls
let tempDomainCache = {
  lastUpdated: 0,
  domains: []
};

// Initialize extension settings
chrome.runtime.onInstalled.addListener(() => {
  console.log('TempMailGuard extension installed');
  
  // Initialize settings
  chrome.storage.sync.get('settings', (data) => {
    if (!data.settings) {
      chrome.storage.sync.set({ settings: defaultSettings });
    }
  });
  
  // Create context menu for right-click email verification
  chrome.contextMenus?.create({
    id: 'verify-email',
    title: 'Verify Email Address',
    contexts: ['selection']
  });
  
  // Fetch the latest temp domain list
  updateTempDomainCache();
});

// Update the temporary domain cache (fetch from API)
async function updateTempDomainCache() {
  try {
    // Only update if cache is older than 24 hours
    const now = Date.now();
    if (now - tempDomainCache.lastUpdated < 86400000) {
      return; // Cache is still fresh
    }
    
    // Get settings to include API key if available
    let settings = defaultSettings;
    try {
      const data = await chrome.storage.sync.get('settings');
      if (data.settings) {
        settings = data.settings;
      }
    } catch (e) {
      console.error('Error getting settings:', e);
    }
    
    const apiKey = settings.apiKey || '';
    const headers = apiKey ? { 'X-API-Key': apiKey } : {};
    
    // Use config server URL
    const apiUrl = `${extensionConfig.apiEndpoint}/api/temp-domains`;
    console.log('Updating domain cache from:', apiUrl);
    
    const response = await fetch(apiUrl, { headers });
    
    if (response.ok) {
      const domains = await response.json();
      tempDomainCache = {
        lastUpdated: now,
        domains: domains.map(d => d.domain.toLowerCase())
      };
      console.log(`Updated temp domain cache with ${domains.length} domains`);
    } else {
      console.error('Failed to update temp domain cache');
    }
  } catch (error) {
    console.error('Error updating temp domain cache:', error);
  }
}

// Check if domain is in the temporary domain list
function isTempDomain(domain) {
  // Use the cached list if available
  if (tempDomainCache.domains.length > 0) {
    return tempDomainCache.domains.includes(domain.toLowerCase());
  }
  
  // Fallback to built-in list if cache is not available
  const knownTempDomains = [
    'tempmail.com', 'temp-mail.org', 'mailinator.com', '10minutemail.com',
    'guerrillamail.com', 'sharklasers.com', 'throwawaymail.com', 'yopmail.com',
    'dispostable.com', 'mailnesia.com', 'tempr.email', 'getnada.com', 
    'dizigg.com', // Explicitly added to ensure detection
    'emailtemp.org', 'tempinbox.com', 'fakemailgenerator.com', 'emailfake.com',
    'mohmal.com', 'temp-mail.io', 'minuteinbox.com', '1secmail.com', 'spamgourmet.com',
    'emailna.co', 'tmpmail.org', 'tmp-mail.org', 'tmpeml.com', 'tmpbox.net',
    'moakt.cc', 'disbox.net', 'tmpmail.net', 'ezztt.com', 'secmail.com',
    'mailtempto.com', 'firemailbox.club', 'etempmail.net', 'emailnator.com',
    'inboxkitten.com', 'email-fake.com', 'tempmailo.com', 'fakemail.net',
    'faketempmail.com', 'mailgen.biz', 'tempmail.ninja', 'randomail.net',
    'mailpoof.com', 'vomoto.com', 'tempail.com', 'fakemailbox.com', 'tenmail.org',
    'mailpect.com', 'cmail.club', 'tmailcloud.com', 'tmail.io', 'gmailcom.co',
    'dropmail.me', 'altmails.com', 'zipmail.in'
  ];
  
  // Check pattern-based detection for domains not in our explicit list
  if (!knownTempDomains.includes(domain.toLowerCase())) {
    // Check for typical temp mail domain patterns
    const tempDomainPatterns = [
      /temp/i, /disposable/i, /throwaway/i, /fake/i, /trash/i, /junk/i, /spam/i, 
      /burner/i, /guerrilla/i, /mailinator/i, /yopmail/i, /10minute/i, /discard/i, 
      /nada/i, /tmp/i, /one-?time/i, /1time/i, /tempmail/i
    ];
    
    for (const pattern of tempDomainPatterns) {
      if (pattern.test(domain.toLowerCase())) {
        return true;
      }
    }
  }
  
  return knownTempDomains.includes(domain.toLowerCase());
}

// Check if URL pattern is for a known email service
function isEmailService(url) {
  const emailDomains = [
    'mail.google.com',
    'outlook.live.com',
    'outlook.office.com',
    'mail.yahoo.com',
    'protonmail.com',
    'tutanota.com',
    'mail.proton.me',
    'mail.zoho.com'
  ];
  
  try {
    const urlObj = new URL(url);
    return emailDomains.some(domain => urlObj.host.includes(domain));
  } catch (e) {
    return false;
  }
}

// Verify email via API
async function verifyEmail(email) {
  try {
    if (!email || !email.includes('@')) {
      return { error: 'Invalid email format' };
    }
    
    // Try API first (if API key exists)
    let settings = defaultSettings;
    try {
      const data = await chrome.storage.sync.get('settings');
      if (data.settings) {
        settings = data.settings;
      }
    } catch (e) {
      console.error('Error getting settings:', e);
    }
    
    // Check if domain is in cached temp domain list first
    const domain = email.split('@')[1].toLowerCase();
    if (isTempDomain(domain)) {
      return {
        email,
        isTempEmail: true,
        trustScore: 10,
        domainAge: 'unknown',
        hasMxRecords: false,
        patternMatch: 'Matches known temporary email domain'
      };
    }
    
    try {
      // Make API request with apiKey if available
      const apiKey = settings.apiKey || '';
      const headers = apiKey ? { 'X-API-Key': apiKey } : {};
      
      // Use apiEndpoint from config to construct the URL
      // This ensures we're always using the correct server URL
      const apiUrl = `${extensionConfig.apiEndpoint}/api/verify?email=${encodeURIComponent(email)}`;
      console.log('Verifying email with API URL:', apiUrl);
      
      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (apiError) {
      console.error('API error:', apiError);
      
      // Fall back to domain-based checking
      return fallbackVerification(email);
    }
  } catch (error) {
    console.error('Error verifying email:', error);
    return { error: 'Failed to verify email. Please try again.' };
  }
}

// Fallback verification when API is not available
function fallbackVerification(email) {
  if (!email || !email.includes('@')) {
    return { error: 'Invalid email format' };
  }
  
  const domain = email.split('@')[1].toLowerCase();
  
  // Check temp domains
  if (isTempDomain(domain)) {
    return {
      email,
      isTempEmail: true,
      trustScore: 15,
      domainAge: 'unknown',
      hasMxRecords: false,
      patternMatch: 'Matches known temporary email domain'
    };
  }
  
  // Check for temporary email patterns
  const tempPatterns = [
    // Domain patterns (look for these in the full email)
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
  
  const matchesPattern = tempPatterns.some(pattern => pattern.test(email.toLowerCase()));
  
  if (matchesPattern) {
    return {
      email,
      isTempEmail: true,
      trustScore: 30,
      domainAge: 'unknown',
      hasMxRecords: true,
      patternMatch: 'Matches temporary email pattern'
    };
  }
  
  // Check well-known domains
  const wellKnownDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
    'aol.com', 'icloud.com', 'protonmail.com', 'tutanota.com'
  ];
  
  if (wellKnownDomains.includes(domain)) {
    return {
      email,
      isTempEmail: false,
      trustScore: 90,
      domainAge: 'more than 10 years',
      hasMxRecords: true,
      patternMatch: 'No suspicious patterns'
    };
  }
  
  // For any other domain
  // A trust score of 60 is above our threshold of 40
  return {
    email,
    isTempEmail: false,
    trustScore: 60,
    domainAge: 'unknown',
    hasMxRecords: true,
    patternMatch: 'Unknown domain'
  };
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle requests from popup
  if (request.action === 'getSettings') {
    chrome.storage.sync.get('settings', (data) => {
      sendResponse(data.settings || defaultSettings);
    });
    return true; // Keep the messaging channel open for async response
  }
  
  // Save settings
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Get the current tab
  if (request.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const isEmail = isEmailService(tabs[0].url);
        sendResponse({ tab: tabs[0], isEmailService: isEmail });
      } else {
        sendResponse({ error: 'No active tab' });
      }
    });
    return true;
  }
  
  // Manually verify an email (from popup)
  if (request.action === 'verifyEmail') {
    verifyEmail(request.email).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ error: error.message || 'Failed to verify email' });
    });
    return true;
  }
  
  // Update domain list cache
  if (request.action === 'updateDomainCache') {
    updateTempDomainCache().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }
  
  // Check if domain is temp
  if (request.action === 'isTempDomain') {
    const result = isTempDomain(request.domain);
    sendResponse({ isTempDomain: result });
    return true;
  }
  
  // Return configuration to content script
  if (request.action === 'getConfig') {
    sendResponse({ 
      config: extensionConfig,
      success: true 
    });
    return true;
  }
  
  // Redirect to dashboard
  if (request.action === 'openDashboard') {
    const path = request.path || '';
    const dashboardUrl = `${extensionConfig.apiEndpoint}${path}`;
    console.log('Opening dashboard URL:', dashboardUrl);
    chrome.tabs.create({ url: dashboardUrl });
    sendResponse({ success: true });
    return true;
  }
  
  // Redirect to API access page
  if (request.action === 'openApiAccess') {
    const apiAccessUrl = `${extensionConfig.apiEndpoint}/api-access`;
    console.log('Opening API access URL:', apiAccessUrl);
    chrome.tabs.create({ url: apiAccessUrl });
    sendResponse({ success: true });
    return true;
  }
});

// Listen for context menu clicks
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'verify-email' && info.selectionText) {
    // Check if the selection appears to be an email
    const selectedText = info.selectionText.trim();
    
    if (selectedText.includes('@')) {
      // Verify the selected text as an email
      verifyEmail(selectedText).then(result => {
        if (result.error) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'Email Verification Error',
            message: result.error
          });
          return;
        }
        
        // Show notification with result
        let message = '';
        if (result.isTempEmail) {
          message = `This appears to be a temporary email address. Trust score: ${result.trustScore}%`;
        } else if (result.trustScore < 40) {
          message = `This email address looks suspicious. Trust score: ${result.trustScore}%`;
        } else {
          message = `This email appears to be legitimate. Trust score: ${result.trustScore}%`;
        }
        
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'Email Verification Result',
          message: message
        });
      });
    }
  }
});

// Check for domain cache updates when extension becomes active
chrome.runtime.onStartup.addListener(() => {
  updateTempDomainCache();
});
