// TempMailGuard Chrome Extension
// Content script to detect email inputs and validate them in real-time

// Default configuration - will be updated from extension settings
let config = {
  apiUrl: 'http://localhost:5000/api',
  validationDelay: 500, // ms delay after typing stops before validation
  warningDuration: 5000, // ms to show warnings
  trustThreshold: 40, // Match the server threshold (40 instead of previous 50)
};

// Try to load configuration from the extension
try {
  chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
    if (response && response.config) {
      console.log('Content script loaded config:', response.config);
      config.apiUrl = `${response.config.apiEndpoint}/api`;
    }
  });
} catch (error) {
  console.error('Failed to load configuration:', error);
}

// Store for timeouts to prevent excessive API calls
let timeouts = {};
let extensionEnabled = true;
let notificationsEnabled = true;

// Initialize settings
chrome.storage.sync.get('settings', (data) => {
  if (data.settings) {
    extensionEnabled = data.settings.enabled;
    notificationsEnabled = data.settings.showNotifications;
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings && changes.settings.newValue) {
    extensionEnabled = changes.settings.newValue.enabled;
    notificationsEnabled = changes.settings.newValue.showNotifications;
  }
});

// Find all email input fields on the page
function findEmailInputs() {
  const emailInputs = [];
  const inputs = document.querySelectorAll('input');
  
  inputs.forEach(input => {
    // Check if input is for email based on type, name, id, or placeholder
    if (
      input.type === 'email' ||
      input.name?.toLowerCase().includes('email') ||
      input.id?.toLowerCase().includes('email') ||
      input.placeholder?.toLowerCase().includes('email')
    ) {
      emailInputs.push(input);
    }
  });
  
  return emailInputs;
}

// Create and insert warning element next to an input
function createWarningElement(input, result) {
  // If extension is disabled, don't show warnings
  if (!extensionEnabled || !notificationsEnabled) {
    return;
  }
  
  // Remove any existing warning
  removeWarningElement(input);
  
  // Create the warning container
  const warningElement = document.createElement('div');
  warningElement.className = 'tempmail-warning';
  
  // Set appropriate status and message
  if (result.isTempEmail) {
    warningElement.innerHTML = `
      <div class="tempmail-icon tempmail-icon-error">&#10007;</div>
      <div class="tempmail-content">
        <p class="tempmail-title">Temporary Email Detected</p>
        <p class="tempmail-message">This appears to be a disposable email address.</p>
        <div class="tempmail-trust-score">
          <span>Trust Score: ${result.trustScore}%</span>
          <div class="tempmail-trust-meter">
            <div class="tempmail-trust-value" style="width: ${result.trustScore}%; background-color: #EF4444;"></div>
          </div>
        </div>
      </div>
    `;
  } else if (result.trustScore < config.trustThreshold) {
    warningElement.innerHTML = `
      <div class="tempmail-icon tempmail-icon-warning">&#9888;</div>
      <div class="tempmail-content">
        <p class="tempmail-title">Suspicious Email</p>
        <p class="tempmail-message">This email address looks suspicious.</p>
        <div class="tempmail-trust-score">
          <span>Trust Score: ${result.trustScore}%</span>
          <div class="tempmail-trust-meter">
            <div class="tempmail-trust-value" style="width: ${result.trustScore}%; background-color: #F59E0B;"></div>
          </div>
        </div>
      </div>
    `;
  } else {
    warningElement.innerHTML = `
      <div class="tempmail-icon tempmail-icon-success">&#10003;</div>
      <div class="tempmail-content">
        <p class="tempmail-title">Valid Email</p>
        <p class="tempmail-message">This email appears to be legitimate.</p>
        <div class="tempmail-trust-score">
          <span>Trust Score: ${result.trustScore}%</span>
          <div class="tempmail-trust-meter">
            <div class="tempmail-trust-value" style="width: ${result.trustScore}%; background-color: #10B981;"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Get input position and insert warning after it
  const rect = input.getBoundingClientRect();
  warningElement.style.top = `${rect.bottom + window.scrollY}px`;
  warningElement.style.left = `${rect.left + window.scrollX}px`;
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.className = 'tempmail-close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    warningElement.remove();
  });
  warningElement.appendChild(closeButton);
  
  // Add report button for suspicious/temp emails
  if (result.isTempEmail || result.trustScore < config.trustThreshold) {
    const reportButton = document.createElement('button');
    reportButton.className = 'tempmail-report';
    reportButton.innerHTML = 'Report';
    reportButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'openDashboard'
      });
    });
    warningElement.appendChild(reportButton);
  }
  
  // Add to body
  document.body.appendChild(warningElement);
  
  // Highlight input
  if (result.isTempEmail) {
    input.classList.add('tempmail-input-error');
  } else if (result.trustScore < config.trustThreshold) {
    input.classList.add('tempmail-input-warning');
  } else {
    input.classList.add('tempmail-input-success');
  }
  
  // Remove after the configured duration
  setTimeout(() => {
    warningElement.remove();
  }, config.warningDuration);
}

// Remove warning element and input highlighting
function removeWarningElement(input) {
  input.classList.remove('tempmail-input-error', 'tempmail-input-warning', 'tempmail-input-success');
  const warnings = document.querySelectorAll('.tempmail-warning');
  warnings.forEach(warning => warning.remove());
}

// Validate email via background script which handles API calls
async function validateEmail(email, input) {
  if (!extensionEnabled) {
    return;
  }
  
  try {
    // Check if email looks valid
    if (!email || !email.includes('@')) {
      return;
    }
    
    // Use the background script to verify the email
    chrome.runtime.sendMessage({ 
      action: 'verifyEmail', 
      email: email 
    }, (result) => {
      if (result && !result.error) {
        // Display the results
        createWarningElement(input, result);
      } else {
        console.error('TempMailGuard: Error validating email', result?.error || 'Unknown error');
      }
    });
    
  } catch (error) {
    console.error('TempMailGuard: Error validating email', error);
  }
}

// Add event listeners to email inputs
function setupEmailInputListeners() {
  if (!extensionEnabled) {
    return;
  }
  
  const emailInputs = findEmailInputs();
  
  emailInputs.forEach(input => {
    // Skip already monitored inputs
    if (input.dataset.tempMailGuard === 'monitored') {
      return;
    }
    
    // Add an identifier for easy reference
    input.dataset.tempMailGuard = 'monitored';
    
    // Add listeners
    input.addEventListener('input', handleInputChange);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('paste', handlePaste);
  });
}

// Handler for input changes
function handleInputChange(event) {
  if (!extensionEnabled) {
    return;
  }
  
  const input = event.target;
  const email = input.value.trim();
  
  // Clear existing timeout
  if (timeouts[input.id || input.name]) {
    clearTimeout(timeouts[input.id || input.name]);
  }
  
  // Check if input is empty or doesn't look like an email
  if (!email || !email.includes('@')) {
    removeWarningElement(input);
    return;
  }
  
  // Set a new timeout for validation
  timeouts[input.id || input.name] = setTimeout(() => {
    validateEmail(email, input);
  }, config.validationDelay);
}

// Handler for blur event (when input loses focus)
function handleBlur(event) {
  if (!extensionEnabled) {
    return;
  }
  
  const input = event.target;
  const email = input.value.trim();
  
  // If there's valid content and it looks like an email, validate
  if (email && email.includes('@')) {
    validateEmail(email, input);
  }
}

// Handler for paste event
function handlePaste(event) {
  if (!extensionEnabled) {
    return;
  }
  
  // Get pasted content
  let pastedText;
  if (event.clipboardData && event.clipboardData.getData) {
    pastedText = event.clipboardData.getData('text/plain');
  }
  
  if (pastedText && pastedText.includes('@')) {
    // If it looks like an email, validate after a short delay
    const input = event.target;
    setTimeout(() => {
      validateEmail(input.value.trim(), input);
    }, 50); // Short delay to ensure the paste completes
  }
}

// Initialize extension
function init() {
  // Set up listeners for existing email inputs
  setupEmailInputListeners();
  
  // Set up a MutationObserver to detect dynamically added inputs
  const observer = new MutationObserver(mutations => {
    if (!extensionEnabled) {
      return;
    }
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        setupEmailInputListeners();
      }
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Listen for messages from popup and background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if there are email inputs on the page
    if (request.action === 'checkCurrentPage') {
      const emailInputs = findEmailInputs();
      sendResponse({ count: emailInputs.length });
    }
    
    // Update settings when changed
    if (request.action === 'settingsUpdated') {
      extensionEnabled = request.settings.enabled;
      notificationsEnabled = request.settings.showNotifications;
      sendResponse({ success: true });
    }
  });
}

// Run the initialization when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
