/**
 * ZeroWeb AI - Access Blocked Controller
 * Minimal: Extracts domain and displays it. No buttons, no extra text.
 */

document.addEventListener('DOMContentLoaded', () => {
  const blockedTargetUrl = document.getElementById('blockedTargetUrl');

  // Extract blocked URL from query or query background
  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('url');

  if (paramUrl) {
    try {
      blockedTargetUrl.textContent = new URL(paramUrl).hostname.toLowerCase();
    } catch (e) {
      blockedTargetUrl.textContent = paramUrl;
    }
  } else {
    chrome.runtime.sendMessage({ type: 'GET_LAST_BLOCKED_URL' }, (res) => {
      if (res?.url) {
        try {
          blockedTargetUrl.textContent = new URL(res.url).hostname.toLowerCase();
        } catch (e) {
          blockedTargetUrl.textContent = res.url;
        }
      }
    });
  }
});
