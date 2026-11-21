/**
 * ZeroWeb AI - Popup Controller
 * Connects UI toggle switches, stats counters, whitelist manager, and background state.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const masterToggle = document.getElementById('masterToggle');
  const siteDomainEl = document.getElementById('siteDomain');
  const siteStatusEl = document.getElementById('siteStatus');
  const siteWhitelistBtn = document.getElementById('siteWhitelistBtn');
  const pageBlockedCountEl = document.getElementById('pageBlockedCount');
  const totalBlockedCountEl = document.getElementById('totalBlockedCount');

  const catStandalone = document.getElementById('catStandalone');
  const catSearch = document.getElementById('catSearch');
  const catSocial = document.getElementById('catSocial');
  const catChatbots = document.getElementById('catChatbots');

  const pause15Btn = document.getElementById('pause15Btn');
  const openOptionsBtn = document.getElementById('openOptionsBtn');

  let currentTab = null;
  let currentDomain = '';
  let isWhitelisted = false;

  // 1. Get Active Tab Info
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      currentTab = tabs[0];
      if (currentTab.url && (currentTab.url.startsWith('http://') || currentTab.url.startsWith('https://'))) {
        const urlObj = new URL(currentTab.url);
        currentDomain = urlObj.hostname.toLowerCase();
        siteDomainEl.textContent = currentDomain;
      } else {
        siteDomainEl.textContent = 'Browser Internal Page';
        siteWhitelistBtn.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Error fetching active tab:', err);
  }

  // 2. Fetch Extension State from Background
  function syncUI() {
    chrome.runtime.sendMessage(
      { type: 'GET_STATE', tabId: currentTab?.id },
      (state) => {
        if (!state || chrome.runtime.lastError) return;

        // Master switch
        masterToggle.checked = state.masterEnabled ?? true;

        // Categories
        const cats = state.categories || {};
        catStandalone.checked = cats.standalone ?? true;
        catSearch.checked = cats.search ?? true;
        catSocial.checked = cats.social ?? true;
        catChatbots.checked = cats.chatbots ?? true;

        // Stats
        pageBlockedCountEl.textContent = state.currentTabBlocked || 0;
        totalBlockedCountEl.textContent = state.stats?.totalBlocked || 0;

        // Whitelist state for current domain
        const whitelistedList = state.whitelistedDomains || [];
        const temporaryBypasses = state.temporaryBypasses || {};
        const now = Date.now();

        isWhitelisted =
          whitelistedList.includes(currentDomain) ||
          (temporaryBypasses[currentDomain] && temporaryBypasses[currentDomain] > now);

        if (!masterToggle.checked) {
          siteStatusEl.textContent = 'Disabled';
          siteStatusEl.className = 'site-status-badge disabled';
        } else if (isWhitelisted) {
          siteStatusEl.textContent = 'Whitelisted';
          siteStatusEl.className = 'site-status-badge whitelisted';
          siteWhitelistBtn.textContent = 'Remove Whitelist';
          siteWhitelistBtn.classList.add('active');
        } else {
          siteStatusEl.textContent = 'Protected';
          siteStatusEl.className = 'site-status-badge';
          siteWhitelistBtn.textContent = 'Whitelist Site';
          siteWhitelistBtn.classList.remove('active');
        }
      }
    );
  }

  syncUI();

  // 3. Event Listeners

  // Master Toggle
  masterToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_MASTER' }, (res) => {
      syncUI();
      reloadCurrentTab();
    });
  });

  // Category Toggles
  const categoryMap = [
    { el: catStandalone, name: 'standalone' },
    { el: catSearch, name: 'search' },
    { el: catSocial, name: 'social' },
    { el: catChatbots, name: 'chatbots' }
  ];

  categoryMap.forEach(({ el, name }) => {
    el.addEventListener('change', () => {
      chrome.runtime.sendMessage(
        { type: 'TOGGLE_CATEGORY', category: name },
        () => {
          syncUI();
          reloadCurrentTab();
        }
      );
    });
  });

  // Whitelist Button
  siteWhitelistBtn.addEventListener('click', () => {
    if (!currentDomain) return;

    if (isWhitelisted) {
      chrome.runtime.sendMessage(
        { type: 'REMOVE_WHITELIST', domain: currentDomain },
        () => {
          syncUI();
          reloadCurrentTab();
        }
      );
    } else {
      chrome.runtime.sendMessage(
        { type: 'WHITELIST_DOMAIN', domain: currentDomain },
        () => {
          syncUI();
          reloadCurrentTab();
        }
      );
    }
  });

  // Pause for 15 minutes
  pause15Btn.addEventListener('click', () => {
    if (!currentDomain) return;
    chrome.runtime.sendMessage(
      { type: 'TEMP_BYPASS', domain: currentDomain, minutes: 15 },
      () => {
        syncUI();
        reloadCurrentTab();
      }
    );
  });

  // Open Options Page
  openOptionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });

  // Helper: Reload current tab to apply changes immediately
  function reloadCurrentTab() {
    if (currentTab?.id) {
      chrome.tabs.reload(currentTab.id);
    }
  }
});
