/**
 * ZeroWeb AI - Popup Controller
 * Minimal, fast, and 100% workable.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const masterToggle = document.getElementById('masterToggle');
  const siteDomainEl = document.getElementById('siteDomain');
  const siteStatusBadge = document.getElementById('siteStatusBadge');
  const whitelistToggleBtn = document.getElementById('whitelistToggleBtn');
  const pageBlockedCount = document.getElementById('pageBlockedCount');
  const totalBlockedCount = document.getElementById('totalBlockedCount');
  const openSettingsBtn = document.getElementById('openSettingsBtn');

  let activeTab = null;
  let currentDomain = '';
  let isWhitelisted = false;

  // 1. Get current active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]?.url) {
      activeTab = tabs[0];
      if (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://')) {
        currentDomain = new URL(activeTab.url).hostname.toLowerCase();
        siteDomainEl.textContent = currentDomain;
      } else {
        siteDomainEl.textContent = 'Browser Internal Page';
        whitelistToggleBtn.style.display = 'none';
      }
    }
  } catch (e) {}

  // 2. Fetch state & update UI
  function updateUI() {
    chrome.runtime.sendMessage({ type: 'GET_STATE', tabId: activeTab?.id }, (res) => {
      if (!res || chrome.runtime.lastError) return;

      const master = res.masterEnabled ?? true;
      masterToggle.checked = master;

      pageBlockedCount.textContent = res.currentTabBlocked || 0;
      totalBlockedCount.textContent = res.totalBlocked || 0;

      const whitelist = res.whitelistedDomains || [];
      isWhitelisted = whitelist.some(
        (d) => currentDomain === d || currentDomain.endsWith('.' + d)
      );

      if (!master) {
        siteStatusBadge.textContent = 'PROTECTION PAUSED';
        siteStatusBadge.className = 'status-pill disabled';
        whitelistToggleBtn.disabled = true;
        whitelistToggleBtn.textContent = 'Shield is Disabled';
      } else if (isWhitelisted) {
        siteStatusBadge.textContent = 'ALLOWING AI (WHITELISTED)';
        siteStatusBadge.className = 'status-pill whitelisted';
        whitelistToggleBtn.disabled = false;
        whitelistToggleBtn.textContent = 'Block AI on this site';
        whitelistToggleBtn.className = 'action-btn reblock';
      } else {
        siteStatusBadge.textContent = 'BLOCKING ALL AI';
        siteStatusBadge.className = 'status-pill';
        whitelistToggleBtn.disabled = false;
        whitelistToggleBtn.textContent = 'Allow AI on this site';
        whitelistToggleBtn.className = 'action-btn';
      }
    });
  }

  updateUI();

  // 3. Master Toggle
  masterToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_MASTER' }, () => {
      updateUI();
      if (activeTab?.id) chrome.tabs.reload(activeTab.id);
    });
  });

  // 4. Whitelist / Block Toggle
  whitelistToggleBtn.addEventListener('click', () => {
    if (!currentDomain) return;
    chrome.runtime.sendMessage({ type: 'TOGGLE_WHITELIST', domain: currentDomain }, () => {
      updateUI();
      if (activeTab?.id) chrome.tabs.reload(activeTab.id);
    });
  });

  // 5. Open Settings
  openSettingsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });
});
