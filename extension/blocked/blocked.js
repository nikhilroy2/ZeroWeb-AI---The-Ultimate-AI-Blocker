/**
 * ZeroWeb AI - Access Blocked Controller
 * Shows blocked domain, handles returning or 1-click whitelisting.
 */

document.addEventListener('DOMContentLoaded', () => {
  const blockedTargetUrl = document.getElementById('blockedTargetUrl');
  const goBackBtn = document.getElementById('goBackBtn');
  const allowSiteBtn = document.getElementById('allowSiteBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');

  let targetUrl = '';
  let targetDomain = '';

  // Extract blocked URL from query or query background
  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('url');

  if (paramUrl) {
    targetUrl = paramUrl;
    try {
      targetDomain = new URL(targetUrl).hostname.toLowerCase();
    } catch (e) {
      targetDomain = paramUrl;
    }
    renderDomain();
  } else {
    chrome.runtime.sendMessage({ type: 'GET_LAST_BLOCKED_URL' }, (res) => {
      if (res?.url) {
        targetUrl = res.url;
        try {
          targetDomain = new URL(targetUrl).hostname.toLowerCase();
        } catch (e) {
          targetDomain = targetUrl;
        }
      }
      renderDomain();
    });
  }

  function renderDomain() {
    blockedTargetUrl.textContent = targetDomain || 'Standalone AI Platform';
  }

  // Go Back
  goBackBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });

  // Allow site (Whitelist) and proceed immediately
  allowSiteBtn.addEventListener('click', () => {
    if (!targetDomain) return;
    chrome.runtime.sendMessage({ type: 'ADD_WHITELIST', domain: targetDomain }, () => {
      if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
        window.location.href = targetUrl;
      } else {
        window.location.href = `https://${targetDomain}`;
      }
    });
  });

  // Open Settings
  openSettingsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.location.href = chrome.runtime.getURL('options/options.html');
    }
  });
});
