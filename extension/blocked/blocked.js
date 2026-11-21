/**
 * ZeroWeb AI - Access Blocked Page Controller
 * Reads destination domain, handles return navigation, temporary bypass, and permanent whitelist.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const blockedTargetUrl = document.getElementById('blockedTargetUrl');
  const goBackBtn = document.getElementById('goBackBtn');
  const tempBypassBtn = document.getElementById('tempBypassBtn');
  const alwaysAllowBtn = document.getElementById('alwaysAllowBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');

  let targetUrl = '';
  let targetDomain = '';

  // 1. Determine target URL from query parameter or background memory
  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('url');

  if (paramUrl) {
    targetUrl = paramUrl;
    try {
      targetDomain = new URL(targetUrl).hostname.toLowerCase();
    } catch (e) {
      targetDomain = paramUrl;
    }
  } else {
    // Query background for last recorded navigation
    chrome.runtime.sendMessage({ type: 'GET_LAST_BLOCKED_URL' }, (res) => {
      if (res?.url) {
        targetUrl = res.url;
        try {
          targetDomain = new URL(targetUrl).hostname.toLowerCase();
        } catch (e) {
          targetDomain = targetUrl;
        }
      }
      renderTarget();
    });
  }

  function renderTarget() {
    if (targetDomain) {
      blockedTargetUrl.textContent = targetDomain;
    } else {
      blockedTargetUrl.textContent = 'Standalone AI Platform';
    }
  }

  renderTarget();

  // 2. Action: Return to Safety
  goBackBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });

  // 3. Action: Allow for 10 Minutes
  tempBypassBtn.addEventListener('click', () => {
    if (!targetDomain) return;
    chrome.runtime.sendMessage({ type: 'TEMP_BYPASS', domain: targetDomain, minutes: 10 }, () => {
      // Navigate to target URL
      if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
        window.location.href = targetUrl;
      } else {
        window.location.href = `https://${targetDomain}`;
      }
    });
  });

  // 4. Action: Always Whitelist Domain
  alwaysAllowBtn.addEventListener('click', () => {
    if (!targetDomain) return;
    chrome.runtime.sendMessage({ type: 'WHITELIST_DOMAIN', domain: targetDomain }, () => {
      // Navigate to target URL
      if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
        window.location.href = targetUrl;
      } else {
        window.location.href = `https://${targetDomain}`;
      }
    });
  });

  // 5. Action: Open Settings
  openSettingsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.location.href = chrome.runtime.getURL('options/options.html');
    }
  });
});
