/**
 * ZeroWeb AI - Background Service Worker (Manifest V3)
 * Manages DeclarativeNetRequest rules, dynamic whitelists/blocklists,
 * state synchronization, tab badges, and event routing.
 */

const DEFAULT_SETTINGS = {
  masterEnabled: true,
  categories: {
    standalone: true,  // ChatGPT, Claude, Gemini, Perplexity, etc.
    search: true,      // Google AI Overviews, Bing Copilot, etc.
    social: true,      // X/Grok, LinkedIn AI, YouTube AI, Reddit AI
    chatbots: true     // Floating web chatbots & AI assistants
  },
  whitelistedDomains: [],
  customBlockedDomains: [],
  customSelectors: [],
  temporaryBypasses: {}, // { [domain]: expiryTimestamp }
  stats: {
    totalBlocked: 0,
    todayBlocked: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    byCategory: {
      standalone: 0,
      search: 0,
      social: 0,
      chatbots: 0,
      custom: 0
    }
  },
  preferences: {
    showBadge: true,
    blockRedirectMode: 'blocked_page', // 'blocked_page' | 'silent_drop'
    showNotification: false
  }
};

// In-memory tab tracking
const tabBlockedCounts = new Map();
const lastAttemptedUrls = new Map();

// Initialize on install / startup
chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get(null);
  const initial = { ...DEFAULT_SETTINGS };

  // Preserve existing keys if any
  for (const key of Object.keys(initial)) {
    if (current[key] === undefined) {
      current[key] = initial[key];
    }
  }
  await chrome.storage.local.set(current);
  await syncRules(current);

  // Set up periodic alarm for temporary bypass cleanup
  chrome.alarms.create('cleanup_temp_bypasses', { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(null);
  await syncRules(data);
});

// Periodic alarm listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup_temp_bypasses') {
    const data = await chrome.storage.local.get(['temporaryBypasses']);
    const bypasses = data.temporaryBypasses || {};
    const now = Date.now();
    let changed = false;

    for (const [domain, expiry] of Object.entries(bypasses)) {
      if (expiry <= now) {
        delete bypasses[domain];
        changed = true;
      }
    }

    if (changed) {
      await chrome.storage.local.set({ temporaryBypasses: bypasses });
      const fullData = await chrome.storage.local.get(null);
      await syncRules(fullData);
    }
  }
});

// Track navigation attempts to record last blocked URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    if (changeInfo.url.startsWith(chrome.runtime.getURL('blocked/blocked.html'))) {
      // Keep last url if already set
    } else {
      lastAttemptedUrls.set(tabId, changeInfo.url);
    }
  }
  if (changeInfo.status === 'loading') {
    // Reset tab blocked count on new navigation
    tabBlockedCounts.set(tabId, 0);
    updateBadge(tabId, 0);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabBlockedCounts.delete(tabId);
  lastAttemptedUrls.delete(tabId);
});

/**
 * Synchronize static and dynamic DeclarativeNetRequest rules
 */
async function syncRules(settings) {
  try {
    const masterEnabled = settings.masterEnabled ?? true;
    const standaloneEnabled = settings.categories?.standalone ?? true;

    // 1. Toggle Static Ruleset
    const rulesetId = 'static_ai_rules';
    if (!masterEnabled || !standaloneEnabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: [rulesetId]
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [rulesetId]
      });
    }

    // 2. Fetch existing dynamic rules to clear
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r) => r.id);

    const addRules = [];
    let nextId = 10000;

    // Whitelist rules (Priority 100 - overrides static & custom blocking)
    const whitelisted = new Set([
      ...(settings.whitelistedDomains || []),
      ...Object.keys(settings.temporaryBypasses || {}).filter((d) => (settings.temporaryBypasses[d] || 0) > Date.now())
    ]);

    for (const domain of whitelisted) {
      const cleanDomain = domain.trim().toLowerCase();
      if (!cleanDomain) continue;
      addRules.push({
        id: nextId++,
        priority: 100,
        action: { type: 'allow' },
        condition: {
          urlFilter: `||${cleanDomain}`,
          resourceTypes: [
            'main_frame',
            'sub_frame',
            'stylesheet',
            'script',
            'image',
            'xmlhttprequest',
            'websocket',
            'other'
          ]
        }
      });
    }

    // Custom blocked domains (Priority 50)
    if (masterEnabled && settings.customBlockedDomains?.length) {
      const redirectMode = settings.preferences?.blockRedirectMode || 'blocked_page';
      for (const domain of settings.customBlockedDomains) {
        const cleanDomain = domain.trim().toLowerCase();
        if (!cleanDomain) continue;

        if (redirectMode === 'blocked_page') {
          addRules.push({
            id: nextId++,
            priority: 50,
            action: {
              type: 'redirect',
              redirect: { extensionPath: '/blocked/blocked.html' }
            },
            condition: {
              urlFilter: `||${cleanDomain}`,
              resourceTypes: ['main_frame']
            }
          });
          addRules.push({
            id: nextId++,
            priority: 50,
            action: { type: 'block' },
            condition: {
              urlFilter: `||${cleanDomain}`,
              resourceTypes: [
                'sub_frame',
                'stylesheet',
                'script',
                'image',
                'xmlhttprequest',
                'websocket',
                'other'
              ]
            }
          });
        } else {
          addRules.push({
            id: nextId++,
            priority: 50,
            action: { type: 'block' },
            condition: {
              urlFilter: `||${cleanDomain}`,
              resourceTypes: [
                'main_frame',
                'sub_frame',
                'stylesheet',
                'script',
                'image',
                'xmlhttprequest',
                'websocket',
                'other'
              ]
            }
          });
        }
      }
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
  } catch (err) {
    console.error('[ZeroWeb AI] Error syncing rules:', err);
  }
}

/**
 * Updates extension action badge
 */
async function updateBadge(tabId, count) {
  try {
    const data = await chrome.storage.local.get(['masterEnabled', 'preferences']);
    if (data.masterEnabled === false) {
      await chrome.action.setBadgeText({ text: 'OFF', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#64748B', tabId });
      return;
    }

    if (!data.preferences?.showBadge) {
      await chrome.action.setBadgeText({ text: '', tabId });
      return;
    }

    const text = count && count > 0 ? (count > 99 ? '99+' : count.toString()) : '';
    await chrome.action.setBadgeText({ text, tabId });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color: '#E11D48', tabId });
    }
  } catch (e) {
    // Tab might be closed
  }
}

// Runtime message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  (async () => {
    switch (message.type) {
      case 'GET_STATE': {
        const data = await chrome.storage.local.get(null);
        let tabCount = 0;
        if (message.tabId) {
          tabCount = tabBlockedCounts.get(message.tabId) || 0;
        } else if (tabId) {
          tabCount = tabBlockedCounts.get(tabId) || 0;
        }
        sendResponse({
          ...data,
          currentTabBlocked: tabCount
        });
        break;
      }

      case 'TOGGLE_MASTER': {
        const data = await chrome.storage.local.get(['masterEnabled']);
        const updated = !(data.masterEnabled ?? true);
        await chrome.storage.local.set({ masterEnabled: updated });
        const allData = await chrome.storage.local.get(null);
        await syncRules(allData);

        // Update all tab badges
        const tabs = await chrome.tabs.query({});
        for (const t of tabs) {
          const c = tabBlockedCounts.get(t.id) || 0;
          updateBadge(t.id, c);
        }

        sendResponse({ success: true, masterEnabled: updated });
        break;
      }

      case 'TOGGLE_CATEGORY': {
        const { category } = message;
        const data = await chrome.storage.local.get(['categories']);
        const cats = data.categories || { ...DEFAULT_SETTINGS.categories };
        cats[category] = !cats[category];
        await chrome.storage.local.set({ categories: cats });
        const allData = await chrome.storage.local.get(null);
        await syncRules(allData);
        sendResponse({ success: true, categories: cats });
        break;
      }

      case 'WHITELIST_DOMAIN': {
        const { domain } = message;
        if (!domain) return sendResponse({ success: false });
        const data = await chrome.storage.local.get(['whitelistedDomains']);
        const list = new Set(data.whitelistedDomains || []);
        list.add(domain.toLowerCase().trim());
        await chrome.storage.local.set({ whitelistedDomains: Array.from(list) });
        const allData = await chrome.storage.local.get(null);
        await syncRules(allData);
        sendResponse({ success: true, whitelistedDomains: Array.from(list) });
        break;
      }

      case 'REMOVE_WHITELIST': {
        const { domain } = message;
        const data = await chrome.storage.local.get(['whitelistedDomains']);
        const list = (data.whitelistedDomains || []).filter((d) => d !== domain.toLowerCase().trim());
        await chrome.storage.local.set({ whitelistedDomains: list });
        const allData = await chrome.storage.local.get(null);
        await syncRules(allData);
        sendResponse({ success: true, whitelistedDomains: list });
        break;
      }

      case 'TEMP_BYPASS': {
        const { domain, minutes = 10 } = message;
        if (!domain) return sendResponse({ success: false });
        const data = await chrome.storage.local.get(['temporaryBypasses']);
        const bypasses = data.temporaryBypasses || {};
        bypasses[domain.toLowerCase().trim()] = Date.now() + minutes * 60 * 1000;
        await chrome.storage.local.set({ temporaryBypasses: bypasses });
        const allData = await chrome.storage.local.get(null);
        await syncRules(allData);
        sendResponse({ success: true, temporaryBypasses: bypasses });
        break;
      }

      case 'ADD_CUSTOM_DOMAIN': {
        const { domain } = message;
        if (!domain) return sendResponse({ success: false });
        const data = await chrome.storage.local.get(['customBlockedDomains']);
        const list = new Set(data.customBlockedDomains || []);
        list.add(domain.toLowerCase().trim());
        await chrome.storage.local.set({ customBlockedDomains: Array.from(list) });
        const allData = await chrome.storage.local.get(null);
        await syncRules(allData);
        sendResponse({ success: true, customBlockedDomains: Array.from(list) });
        break;
      }

      case 'REMOVE_CUSTOM_DOMAIN': {
        const { domain } = message;
        const data = await chrome.storage.local.get(['customBlockedDomains']);
        const list = (data.customBlockedDomains || []).filter((d) => d !== domain.toLowerCase().trim());
        await chrome.storage.local.set({ customBlockedDomains: list });
        const allData = await chrome.storage.local.get(null);
        await syncRules(allData);
        sendResponse({ success: true, customBlockedDomains: list });
        break;
      }

      case 'ADD_CUSTOM_SELECTOR': {
        const { selector } = message;
        if (!selector) return sendResponse({ success: false });
        const data = await chrome.storage.local.get(['customSelectors']);
        const list = new Set(data.customSelectors || []);
        list.add(selector.trim());
        await chrome.storage.local.set({ customSelectors: Array.from(list) });
        sendResponse({ success: true, customSelectors: Array.from(list) });
        break;
      }

      case 'REMOVE_CUSTOM_SELECTOR': {
        const { selector } = message;
        const data = await chrome.storage.local.get(['customSelectors']);
        const list = (data.customSelectors || []).filter((s) => s !== selector.trim());
        await chrome.storage.local.set({ customSelectors: list });
        sendResponse({ success: true, customSelectors: list });
        break;
      }

      case 'REPORT_BLOCKED': {
        const { count = 1, category = 'custom' } = message;
        if (tabId) {
          const current = (tabBlockedCounts.get(tabId) || 0) + count;
          tabBlockedCounts.set(tabId, current);
          updateBadge(tabId, current);
        }

        // Increment stats
        const data = await chrome.storage.local.get(['stats']);
        const stats = data.stats || { ...DEFAULT_SETTINGS.stats };
        const today = new Date().toISOString().split('T')[0];

        if (stats.lastResetDate !== today) {
          stats.todayBlocked = 0;
          stats.lastResetDate = today;
        }

        stats.totalBlocked = (stats.totalBlocked || 0) + count;
        stats.todayBlocked = (stats.todayBlocked || 0) + count;
        stats.byCategory = stats.byCategory || {};
        stats.byCategory[category] = (stats.byCategory[category] || 0) + count;

        await chrome.storage.local.set({ stats });
        sendResponse({ success: true, totalBlocked: stats.totalBlocked });
        break;
      }

      case 'GET_LAST_BLOCKED_URL': {
        const reqTabId = message.tabId || tabId;
        const lastUrl = lastAttemptedUrls.get(reqTabId) || '';
        sendResponse({ url: lastUrl });
        break;
      }

      case 'RESET_STATS': {
        const stats = {
          totalBlocked: 0,
          todayBlocked: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          byCategory: { standalone: 0, search: 0, social: 0, chatbots: 0, custom: 0 }
        };
        await chrome.storage.local.set({ stats });
        sendResponse({ success: true, stats });
        break;
      }

      case 'UPDATE_PREFERENCES': {
        const { preferences } = message;
        const data = await chrome.storage.local.get(['preferences']);
        const updated = { ...(data.preferences || {}), ...preferences };
        await chrome.storage.local.set({ preferences: updated });
        const allData = await chrome.storage.local.get(null);
        await syncRules(allData);
        sendResponse({ success: true, preferences: updated });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();

  return true; // Keep channel open for async response
});
