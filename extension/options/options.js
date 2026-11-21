/**
 * ZeroWeb AI - Options & Settings Controller
 * Handles tab navigation, CRUD operations for custom blocklists & whitelists,
 * preference management, analytics display, and JSON backup/restore.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageHeading = document.getElementById('pageHeading');
  const pageSubheading = document.getElementById('pageSubheading');
  const optionsMasterToggle = document.getElementById('optionsMasterToggle');
  const sidebarStatusDot = document.getElementById('sidebarStatusDot');
  const sidebarStatusText = document.getElementById('sidebarStatusText');

  // Stats Elements
  const statTotalBlocked = document.getElementById('statTotalBlocked');
  const statTodayBlocked = document.getElementById('statTodayBlocked');
  const statCustomDomains = document.getElementById('statCustomDomains');
  const statWhitelisted = document.getElementById('statWhitelisted');
  const countStandalone = document.getElementById('countStandalone');
  const countSearch = document.getElementById('countSearch');
  const countSocial = document.getElementById('countSocial');
  const countChatbots = document.getElementById('countChatbots');
  const barStandalone = document.getElementById('barStandalone');
  const barSearch = document.getElementById('barSearch');
  const barSocial = document.getElementById('barSocial');
  const barChatbots = document.getElementById('barChatbots');
  const resetStatsBtn = document.getElementById('resetStatsBtn');

  // Categories Elements
  const catStandaloneOpt = document.getElementById('catStandaloneOpt');
  const catSearchOpt = document.getElementById('catSearchOpt');
  const catSocialOpt = document.getElementById('catSocialOpt');
  const catChatbotsOpt = document.getElementById('catChatbotsOpt');

  // Custom Blocklist Elements
  const newCustomDomainInput = document.getElementById('newCustomDomainInput');
  const addCustomDomainBtn = document.getElementById('addCustomDomainBtn');
  const customDomainsList = document.getElementById('customDomainsList');
  const newCustomSelectorInput = document.getElementById('newCustomSelectorInput');
  const addCustomSelectorBtn = document.getElementById('addCustomSelectorBtn');
  const customSelectorsList = document.getElementById('customSelectorsList');

  // Whitelist Elements
  const newWhitelistInput = document.getElementById('newWhitelistInput');
  const addWhitelistBtn = document.getElementById('addWhitelistBtn');
  const whitelistContainer = document.getElementById('whitelistContainer');
  const temporaryBypassesContainer = document.getElementById('temporaryBypassesContainer');

  // Preferences Elements
  const prefRedirectMode = document.getElementById('prefRedirectMode');
  const prefShowBadge = document.getElementById('prefShowBadge');

  // Backup Elements
  const exportBackupBtn = document.getElementById('exportBackupBtn');
  const importFileInput = document.getElementById('importFileInput');
  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Tab Titles
  const tabMetadata = {
    'tab-dashboard': { title: 'Overview & Analytics', desc: 'Real-time statistics and protection health' },
    'tab-categories': { title: 'Protection Categories', desc: 'Control built-in AI blocklists and DOM purgers' },
    'tab-blocklist': { title: 'Custom Blocklist', desc: 'Block custom domains and CSS selectors' },
    'tab-whitelist': { title: 'Whitelist & Bypasses', desc: 'Domains permitted to bypass AI blocking' },
    'tab-preferences': { title: 'Preferences', desc: 'Configure extension behavior and display' },
    'tab-backup': { title: 'Backup & Reset', desc: 'Export, import or reset extension settings' }
  };

  // Tab Switching
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      navItems.forEach((n) => n.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      const meta = tabMetadata[targetId] || { title: 'Settings', desc: '' };
      pageHeading.textContent = meta.title;
      pageSubheading.textContent = meta.desc;
    });
  });

  // Toast Notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Load and Render State
  async function loadState() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
      if (!state || chrome.runtime.lastError) return;

      // Master switch
      const enabled = state.masterEnabled ?? true;
      optionsMasterToggle.checked = enabled;
      sidebarStatusDot.className = enabled ? 'status-dot active' : 'status-dot inactive';
      sidebarStatusText.textContent = enabled ? 'Shield Active' : 'Shield Disabled';

      // Stats
      const stats = state.stats || {};
      const total = stats.totalBlocked || 0;
      statTotalBlocked.textContent = total;
      statTodayBlocked.textContent = stats.todayBlocked || 0;
      statCustomDomains.textContent = (state.customBlockedDomains || []).length;
      statWhitelisted.textContent = (state.whitelistedDomains || []).length;

      const byCat = stats.byCategory || {};
      const cStand = byCat.standalone || 0;
      const cSearch = byCat.search || 0;
      const cSocial = byCat.social || 0;
      const cChat = byCat.chatbots || 0;

      countStandalone.textContent = cStand;
      countSearch.textContent = cSearch;
      countSocial.textContent = cSocial;
      countChatbots.textContent = cChat;

      const maxCat = Math.max(cStand, cSearch, cSocial, cChat, 1);
      barStandalone.style.width = `${Math.min(100, (cStand / maxCat) * 100)}%`;
      barSearch.style.width = `${Math.min(100, (cSearch / maxCat) * 100)}%`;
      barSocial.style.width = `${Math.min(100, (cSocial / maxCat) * 100)}%`;
      barChatbots.style.width = `${Math.min(100, (cChat / maxCat) * 100)}%`;

      // Categories
      const cats = state.categories || {};
      catStandaloneOpt.checked = cats.standalone ?? true;
      catSearchOpt.checked = cats.search ?? true;
      catSocialOpt.checked = cats.social ?? true;
      catChatbotsOpt.checked = cats.chatbots ?? true;

      // Custom Blocked Domains
      renderCustomDomains(state.customBlockedDomains || []);

      // Custom Selectors
      renderCustomSelectors(state.customSelectors || []);

      // Whitelist
      renderWhitelist(state.whitelistedDomains || []);

      // Temporary Bypasses
      renderTemporaryBypasses(state.temporaryBypasses || {});

      // Preferences
      const prefs = state.preferences || {};
      prefRedirectMode.value = prefs.blockRedirectMode || 'blocked_page';
      prefShowBadge.checked = prefs.showBadge ?? true;
    });
  }

  // Render Custom Domains
  function renderCustomDomains(domains) {
    customDomainsList.innerHTML = '';
    if (!domains.length) {
      customDomainsList.innerHTML = '<div class="empty-state">No custom domains added yet.</div>';
      return;
    }
    domains.forEach((domain) => {
      const row = document.createElement('div');
      row.className = 'rule-row';
      row.innerHTML = `
        <span class="rule-text">${escapeHtml(domain)}</span>
        <button class="rule-del-btn" title="Remove Domain">✕</button>
      `;
      row.querySelector('.rule-del-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'REMOVE_CUSTOM_DOMAIN', domain }, () => {
          showToast(`Removed "${domain}" from blocklist`, 'info');
          loadState();
        });
      });
      customDomainsList.appendChild(row);
    });
  }

  // Render Custom Selectors
  function renderCustomSelectors(selectors) {
    customSelectorsList.innerHTML = '';
    if (!selectors.length) {
      customSelectorsList.innerHTML = '<div class="empty-state">No custom CSS selectors added yet.</div>';
      return;
    }
    selectors.forEach((sel) => {
      const row = document.createElement('div');
      row.className = 'rule-row';
      row.innerHTML = `
        <span class="rule-text">${escapeHtml(sel)}</span>
        <button class="rule-del-btn" title="Remove Selector">✕</button>
      `;
      row.querySelector('.rule-del-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'REMOVE_CUSTOM_SELECTOR', selector: sel }, () => {
          showToast(`Removed selector "${sel}"`, 'info');
          loadState();
        });
      });
      customSelectorsList.appendChild(row);
    });
  }

  // Render Whitelist
  function renderWhitelist(domains) {
    whitelistContainer.innerHTML = '';
    if (!domains.length) {
      whitelistContainer.innerHTML = '<div class="empty-state">No domains whitelisted. ZeroWeb AI is active across all sites.</div>';
      return;
    }
    domains.forEach((domain) => {
      const row = document.createElement('div');
      row.className = 'rule-row';
      row.innerHTML = `
        <span class="rule-text">${escapeHtml(domain)}</span>
        <button class="rule-del-btn" title="Remove from Whitelist">✕</button>
      `;
      row.querySelector('.rule-del-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'REMOVE_WHITELIST', domain }, () => {
          showToast(`Removed "${domain}" from whitelist`, 'info');
          loadState();
        });
      });
      whitelistContainer.appendChild(row);
    });
  }

  // Render Temporary Bypasses
  function renderTemporaryBypasses(bypasses) {
    temporaryBypassesContainer.innerHTML = '';
    const now = Date.now();
    const activeEntries = Object.entries(bypasses).filter(([_, expiry]) => expiry > now);

    if (!activeEntries.length) {
      temporaryBypassesContainer.innerHTML = '<div class="empty-state">No temporary bypasses currently active.</div>';
      return;
    }

    activeEntries.forEach(([domain, expiry]) => {
      const remainingMinutes = Math.ceil((expiry - now) / (60 * 1000));
      const row = document.createElement('div');
      row.className = 'rule-row';
      row.innerHTML = `
        <span class="rule-text">${escapeHtml(domain)} <small style="color: #94a3b8">(${remainingMinutes} min remaining)</small></span>
        <button class="rule-del-btn" title="Cancel Bypass">✕</button>
      `;
      row.querySelector('.rule-del-btn').addEventListener('click', () => {
        chrome.storage.local.get(['temporaryBypasses'], (data) => {
          const bp = data.temporaryBypasses || {};
          delete bp[domain];
          chrome.storage.local.set({ temporaryBypasses: bp }, () => {
            showToast(`Cancelled temporary bypass for ${domain}`, 'info');
            loadState();
          });
        });
      });
      temporaryBypassesContainer.appendChild(row);
    });
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Master switch handler
  optionsMasterToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_MASTER' }, () => {
      showToast('Master protection status updated', 'success');
      loadState();
    });
  });

  // Category switches
  [
    { el: catStandaloneOpt, cat: 'standalone' },
    { el: catSearchOpt, cat: 'search' },
    { el: catSocialOpt, cat: 'social' },
    { el: catChatbotsOpt, cat: 'chatbots' }
  ].forEach(({ el, cat }) => {
    el.addEventListener('change', () => {
      chrome.runtime.sendMessage({ type: 'TOGGLE_CATEGORY', category: cat }, () => {
        showToast(`Category "${cat}" updated`, 'success');
        loadState();
      });
    });
  });

  // Add Custom Domain
  addCustomDomainBtn.addEventListener('click', () => {
    const domain = newCustomDomainInput.value.trim().toLowerCase();
    if (!domain) return;
    chrome.runtime.sendMessage({ type: 'ADD_CUSTOM_DOMAIN', domain }, (res) => {
      if (res?.success) {
        newCustomDomainInput.value = '';
        showToast(`Added "${domain}" to custom blocklist`, 'success');
        loadState();
      }
    });
  });

  // Add Custom Selector
  addCustomSelectorBtn.addEventListener('click', () => {
    const selector = newCustomSelectorInput.value.trim();
    if (!selector) return;
    chrome.runtime.sendMessage({ type: 'ADD_CUSTOM_SELECTOR', selector }, (res) => {
      if (res?.success) {
        newCustomSelectorInput.value = '';
        showToast(`Added custom selector "${selector}"`, 'success');
        loadState();
      }
    });
  });

  // Add Whitelist Domain
  addWhitelistBtn.addEventListener('click', () => {
    const domain = newWhitelistInput.value.trim().toLowerCase();
    if (!domain) return;
    chrome.runtime.sendMessage({ type: 'WHITELIST_DOMAIN', domain }, (res) => {
      if (res?.success) {
        newWhitelistInput.value = '';
        showToast(`Whitelisted "${domain}"`, 'success');
        loadState();
      }
    });
  });

  // Preferences Change
  prefRedirectMode.addEventListener('change', () => {
    chrome.runtime.sendMessage(
      { type: 'UPDATE_PREFERENCES', preferences: { blockRedirectMode: prefRedirectMode.value } },
      () => showToast('Interception mode updated', 'success')
    );
  });

  prefShowBadge.addEventListener('change', () => {
    chrome.runtime.sendMessage(
      { type: 'UPDATE_PREFERENCES', preferences: { showBadge: prefShowBadge.checked } },
      () => showToast('Badge counter preference saved', 'success')
    );
  });

  // Reset Statistics
  resetStatsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all interception counters?')) {
      chrome.runtime.sendMessage({ type: 'RESET_STATS' }, () => {
        showToast('Statistics reset successfully', 'info');
        loadState();
      });
    }
  });

  // Export Settings
  exportBackupBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeroweb-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Settings exported to JSON', 'success');
  });

  // Import Settings
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        await chrome.storage.local.clear();
        await chrome.storage.local.set(imported);
        showToast('Settings imported successfully! Reloading...', 'success');
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        showToast('Invalid JSON backup file', 'error');
      }
    };
    reader.readAsText(file);
  });

  // Reset to Defaults
  resetDefaultsBtn.addEventListener('click', async () => {
    if (confirm('Warning: This will wipe all your custom blocklists, whitelists, and stats, restoring ZeroWeb AI to factory state. Proceed?')) {
      await chrome.storage.local.clear();
      showToast('Restored to default settings. Reloading...', 'info');
      setTimeout(() => location.reload(), 1000);
    }
  });

  // Initialize
  loadState();
});

