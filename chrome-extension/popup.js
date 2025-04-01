// TempMailGuard Popup Script

// DOM elements
const statusIndicator = document.getElementById('status-indicator');
const currentUrl = document.getElementById('current-url');
const emailInputsCount = document.getElementById('email-inputs-count');
const emailInput = document.getElementById('email-input');
const verifyButton = document.getElementById('verify-button');
const resultArea = document.getElementById('result-area');
const resultEmail = document.getElementById('result-email');
const resultStatus = document.getElementById('result-status');
const trustScoreValue = document.getElementById('trust-score-value');
const trustMeterValue = document.getElementById('trust-meter-value');
const domainAge = document.getElementById('domain-age');
const mxRecords = document.getElementById('mx-records');
const patternMatch = document.getElementById('pattern-match');
const domainAgeItem = document.getElementById('domain-age-item');
const mxRecordsItem = document.getElementById('mx-records-item');
const patternItem = document.getElementById('pattern-item');
const extensionEnabled = document.getElementById('extension-enabled');
const showNotifications = document.getElementById('show-notifications');
const validateOnInput = document.getElementById('validate-on-input');
const validateOnBlur = document.getElementById('validate-on-blur');
const domainListType = document.getElementById('domain-list-type');
const apiKeyInput = document.getElementById('api-key');
const apiKeyToggle = document.getElementById('api-key-toggle');
const apiKeyContainer = document.getElementById('api-key-container');
const openDashboardButton = document.getElementById('open-dashboard');
const openApiAccessButton = document.getElementById('open-api-access');
const refreshDomainsButton = document.getElementById('refresh-domains');
const loginButton = document.getElementById('login-button');
const loginContainer = document.getElementById('login-container');
const userContainer = document.getElementById('user-container');
const userEmail = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const reportButton = document.getElementById('report-button');

// Initialize popup
// Helper function to show messages (defined early as it's used in config loading)
function showMessage(type, text) {
  // On initial load, DOM might not be ready yet, so we'll queue it
  const showMessageWhenReady = () => {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
      console.warn('Message container not found, retrying...');
      setTimeout(showMessageWhenReady, 100);
      return;
    }
    
    // Create message element
    const message = document.createElement('div');
    message.className = `message message-${type}`;
    message.textContent = text;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'message-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      message.remove();
    });
    message.appendChild(closeButton);
    
    // Add to container
    messageContainer.appendChild(message);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      message.remove();
    }, 5000);
  };
  
  // Start the attempt to show the message
  showMessageWhenReady();
}

// Check for custom configuration
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

// Update from config.js if available
try {
  if (typeof EXTENSION_CONFIG !== 'undefined') {
    extensionConfig = EXTENSION_CONFIG;
    console.log("Popup: Loaded configuration from config.js");
    console.log("Using API endpoint:", extensionConfig.apiEndpoint);
    
    // Test the connection to the API to make sure config works
    fetch(`${extensionConfig.apiEndpoint}/api/temp-domains`)
      .then(response => {
        if (response.ok) {
          console.log(`Successfully connected to API at ${extensionConfig.apiEndpoint}`);
          showMessage('info', `Connected to server: ${extensionConfig.apiEndpoint}`);
        } else {
          console.error(`Failed to connect to API: ${response.status}`);
          showMessage('error', `Error connecting to server: ${response.status}`);
        }
      })
      .catch(err => {
        console.error('API connection test failed:', err);
        showMessage('error', `Connection error: ${err.message}`);
      });
  }
} catch (error) {
  console.error("Failed to load custom configuration:", error);
  showMessage('error', `Config error: ${error.message}`);
}

document.addEventListener('DOMContentLoaded', () => {
  // Update the server URL and extension version in the UI
  const apiEndpointElement = document.getElementById('api-endpoint');
  const extensionVersionElement = document.getElementById('extension-version');
  
  if (apiEndpointElement) {
    apiEndpointElement.textContent = extensionConfig.apiEndpoint.replace(/^https?:\/\//, '');
    apiEndpointElement.title = extensionConfig.apiEndpoint;
  }
  
  if (extensionVersionElement) {
    extensionVersionElement.textContent = `v${extensionConfig.extensionVersion}`;
  }
  // Load current tab info
  chrome.runtime.sendMessage({ action: 'getCurrentTab' }, (response) => {
    if (response && response.tab) {
      currentUrl.textContent = response.tab.url;
      
      // Check if current page has email inputs
      try {
        chrome.tabs.sendMessage(response.tab.id, { action: 'checkCurrentPage' }, (response) => {
          if (chrome.runtime.lastError) {
            emailInputsCount.innerHTML = 'Unable to check email fields on this page';
            return;
          }
          
          if (response && response.count) {
            emailInputsCount.innerHTML = `Found <span>${response.count}</span> email ${response.count === 1 ? 'field' : 'fields'} on this page`;
          } else {
            emailInputsCount.innerHTML = 'No email fields found on this page';
          }
        });
      } catch (e) {
        console.error('Error checking page:', e);
        emailInputsCount.innerHTML = 'Unable to check email fields on this page';
      }
    }
  });
  
  // Load settings
  loadSettings();
  
  // Set up event listeners
  verifyButton.addEventListener('click', verifyEmail);
  extensionEnabled.addEventListener('change', saveSettings);
  showNotifications.addEventListener('change', saveSettings);
  validateOnInput.addEventListener('change', saveSettings);
  validateOnBlur.addEventListener('change', saveSettings);
  domainListType.addEventListener('change', saveSettings);
  apiKeyInput.addEventListener('change', saveSettings);
  apiKeyToggle.addEventListener('click', toggleApiKeyVisibility);
  openDashboardButton.addEventListener('click', openDashboard);
  openApiAccessButton.addEventListener('click', openApiAccess);
  refreshDomainsButton.addEventListener('click', refreshDomains);
  loginButton.addEventListener('click', openLogin);
  logoutButton.addEventListener('click', logout);
  reportButton.addEventListener('click', reportEmail);
  
  // Enable the verification form submit on Enter key
  emailInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      verifyEmail();
    }
  });
});

// Load extension settings
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    if (settings) {
      // Basic settings
      extensionEnabled.checked = settings.enabled;
      showNotifications.checked = settings.showNotifications;
      validateOnInput.checked = settings.validateOnInput !== false; // Default to true
      validateOnBlur.checked = settings.validateOnBlur !== false; // Default to true
      
      // Domain list type
      if (domainListType) {
        domainListType.value = settings.domainList || 'global';
      }
      
      // API key (masked)
      if (apiKeyInput && settings.apiKey) {
        apiKeyInput.value = settings.apiKey;
        apiKeyInput.type = 'password'; // Default to hidden
      }
      
      // Update status indicator
      if (settings.enabled) {
        statusIndicator.textContent = 'Active';
        statusIndicator.className = 'status-active';
      } else {
        statusIndicator.textContent = 'Disabled';
        statusIndicator.className = 'status-inactive';
      }
      
      // Update user info
      updateUserInfo(settings);
    }
  });
}

// Save extension settings
function saveSettings() {
  const settings = {
    enabled: extensionEnabled.checked,
    showNotifications: showNotifications.checked,
    validateOnBlur: validateOnBlur ? validateOnBlur.checked : true,
    validateOnInput: validateOnInput ? validateOnInput.checked : true,
    domainList: domainListType ? domainListType.value : 'global',
    apiKey: apiKeyInput ? apiKeyInput.value : ''
  };
  
  chrome.runtime.sendMessage({ 
    action: 'saveSettings', 
    settings: settings 
  }, (response) => {
    if (response && response.success) {
      // Update status indicator
      if (settings.enabled) {
        statusIndicator.textContent = 'Active';
        statusIndicator.className = 'status-active';
      } else {
        statusIndicator.textContent = 'Disabled';
        statusIndicator.className = 'status-inactive';
      }
      
      // Notify content scripts about the settings change
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'settingsUpdated',
            settings: settings
          });
        }
      });
    }
  });
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    apiKeyToggle.textContent = 'Hide';
  } else {
    apiKeyInput.type = 'password';
    apiKeyToggle.textContent = 'Show';
  }
}

// Open dashboard in new tab
function openDashboard() {
  chrome.runtime.sendMessage({ action: 'openDashboard' });
  window.close(); // Close popup
}

// Open API access page in new tab
function openApiAccess() {
  chrome.runtime.sendMessage({ action: 'openApiAccess' });
  window.close(); // Close popup
}

// Refresh domain list cache
function refreshDomains() {
  if (refreshDomainsButton) {
    refreshDomainsButton.textContent = 'Refreshing...';
    refreshDomainsButton.disabled = true;
  }
  
  chrome.runtime.sendMessage({ action: 'updateDomainCache' }, (response) => {
    if (refreshDomainsButton) {
      refreshDomainsButton.textContent = 'Refresh Domain List';
      refreshDomainsButton.disabled = false;
    }
    
    if (response && response.error) {
      showMessage('error', `Failed to update domain list: ${response.error}`);
    } else {
      showMessage('success', 'Domain list updated successfully');
    }
  });
}

// Open login page
function openLogin() {
  chrome.runtime.sendMessage({ action: 'openDashboard' });
  window.close(); // Close popup
}

// Logout user
function logout() {
  chrome.runtime.sendMessage({ 
    action: 'saveSettings', 
    settings: { apiKey: '' }
  }, () => {
    // Clear UI
    apiKeyInput.value = '';
    updateUserInfo(null);
    showMessage('success', 'Logged out successfully');
  });
}

// Report the current email
function reportEmail() {
  if (!resultEmail.textContent) {
    return;
  }
  
  // Open report page on dashboard
  chrome.runtime.sendMessage({ 
    action: 'openDashboard',
    path: `/reputation/report?email=${encodeURIComponent(resultEmail.textContent)}`
  });
  window.close(); // Close popup
}

// Update user info in UI
function updateUserInfo(settings) {
  if (loginContainer && userContainer && userEmail) {
    if (settings && settings.apiKey) {
      loginContainer.classList.add('hidden');
      userContainer.classList.remove('hidden');
      // In a real implementation, we would decode the JWT or make an API call here
      userEmail.textContent = 'Authenticated User';
    } else {
      loginContainer.classList.remove('hidden');
      userContainer.classList.add('hidden');
    }
  }
}

// Already defined at the top of the file to avoid reference errors

// Verify an email address
function verifyEmail() {
  const email = emailInput.value.trim();
  
  if (!email || !email.includes('@')) {
    showMessage('error', 'Please enter a valid email address');
    return;
  }
  
  // Show loading state
  verifyButton.textContent = 'Verifying...';
  verifyButton.disabled = true;
  resultArea.classList.add('hidden');
  
  // Call background script to verify the email
  chrome.runtime.sendMessage({ 
    action: 'verifyEmail', 
    email: email 
  }, (result) => {
    // Reset button
    verifyButton.textContent = 'Verify';
    verifyButton.disabled = false;
    
    if (result && result.error) {
      showMessage('error', result.error);
      return;
    }
    
    // Update UI with results
    resultEmail.textContent = result.email;
    trustScoreValue.textContent = `${result.trustScore}%`;
    domainAge.textContent = result.domainAge || 'Unknown';
    mxRecords.textContent = result.hasMxRecords ? 'Valid' : 'Invalid';
    patternMatch.textContent = result.patternMatch || 'No pattern analysis';
    
    // Update trust meter
    trustMeterValue.style.width = `${result.trustScore}%`;
    
    // Update status badge and colors
    if (result.isTempEmail) {
      resultStatus.textContent = 'Temporary';
      resultStatus.className = 'status-badge status-temp';
      trustMeterValue.style.backgroundColor = '#EF4444';
      domainAgeItem.className = 'detail-item detail-error';
      mxRecordsItem.className = 'detail-item detail-error';
      patternItem.className = 'detail-item detail-error';
      
      // Show report button for temporary emails
      if (reportButton) {
        reportButton.classList.remove('hidden');
      }
    } else if (result.trustScore < 60) {
      resultStatus.textContent = 'Suspicious';
      resultStatus.className = 'status-badge status-suspicious';
      trustMeterValue.style.backgroundColor = '#F59E0B';
      domainAgeItem.className = 'detail-item detail-warning';
      mxRecordsItem.className = 'detail-item detail-warning';
      patternItem.className = 'detail-item detail-warning';
      
      // Show report button for suspicious emails
      if (reportButton) {
        reportButton.classList.remove('hidden');
      }
    } else {
      resultStatus.textContent = 'Valid';
      resultStatus.className = 'status-badge status-valid';
      trustMeterValue.style.backgroundColor = '#10B981';
      domainAgeItem.className = 'detail-item detail-success';
      mxRecordsItem.className = 'detail-item detail-success';
      patternItem.className = 'detail-item detail-success';
      
      // Hide report button for valid emails
      if (reportButton) {
        reportButton.classList.add('hidden');
      }
    }
    
    // Show result area
    resultArea.classList.remove('hidden');
  });
}
