/**
 * ZeroWeb AI - Background Service Worker (Manifest V3)
 * Blocks ALL AI websites (.ai domains & standalone AI platforms) by default.
 * Multi-layer interception: DeclarativeNetRequest + webNavigation + tabs.
 */

const DEFAULT_SETTINGS = {
  masterEnabled: true,
  whitelistedDomains: [],
  showBlockedPage: true,
  totalBlocked: 0
};

// Known standalone non-.ai domains
const STANDALONE_AI_DOMAINS = [
  'chatgpt.com',
  'chat.openai.com',
  'openai.com',
  'gemini.google.com',
  'copilot.microsoft.com',
  'deepseek.com',
  'chat.deepseek.com',
  'grok.com',
  'midjourney.com',
  'suno.com',
  'suno.ai',
  'udio.com',
  'runwayml.com',
  'runway.com',
  'v0.dev',
  'civitai.com',
  'janitorai.com',
  'poe.com',
  'you.com',
  'monica.im'
];

function isAiHost(hostname) {
  if (!hostname) return false;
  // Matches any .ai domain (e.g. manus.ai, claude.ai, perplexity.ai, etc.)
  if (hostname.endsWith('.ai') || hostname === 'ai') return true;
  return STANDALONE_AI_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith('.' + d)
  );
}

// In-memory tab tracking
const tabBlockedCounts = new Map();
const lastAttemptedUrls = new Map();

// Initialize on install / startup
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  const settings = {
    masterEnabled: current.masterEnabled ?? DEFAULT_SETTINGS.masterEnabled,
    whitelistedDomains: current.whitelistedDomains ?? DEFAULT_SETTINGS.whitelistedDomains,
    showBlockedPage: current.showBlockedPage ?? DEFAULT_SETTINGS.showBlockedPage,
    totalBlocked: current.totalBlocked ?? DEFAULT_SETTINGS.totalBlocked
  };
  await chrome.storage.local.set(settings);
  await syncRules(settings);
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(null);
  await syncRules(data);
});

/**
 * Layer 1: webNavigation.onBeforeNavigate
 * Intercepts navigation to any .ai domain or AI platform BEFORE network transmission
 */
if (chrome.webNavigation?.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return; // main frame only
    const url = details.url;
    if (!url || !url.startsWith('http')) return;

    try {
      const host = new URL(url).hostname.toLowerCase();
      if (!isAiHost(host)) return;

      const data = await chrome.storage.local.get(['masterEnabled', 'whitelistedDomains']);
      if (data.masterEnabled === false) return;

      const whitelist = data.whitelistedDomains || [];
      const isAllowed = whitelist.some((d) => host === d || host.endsWith('.' + d));

      if (!isAllowed) {
        lastAttemptedUrls.set(details.tabId, url);
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL('blocked/blocked.html')
        });
      }
    } catch (e) {}
  });
}

/**
 * Layer 2: tabs.onUpdated backup
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab?.url;
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (isAiHost(host)) {
        const data = await chrome.storage.local.get(['masterEnabled', 'whitelistedDomains']);
        if (data.masterEnabled === false) return;

        const whitelist = data.whitelistedDomains || [];
        const isAllowed = whitelist.some((d) => host === d || host.endsWith('.' + d));

        if (!isAllowed) {
          lastAttemptedUrls.set(tabId, url);
          chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL('blocked/blocked.html')
          });
        }
      }
    } catch (e) {}
  }

  if (changeInfo.status === 'loading') {
    tabBlockedCounts.set(tabId, 0);
    updateBadge(tabId, 0);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabBlockedCounts.delete(tabId);
  lastAttemptedUrls.delete(tabId);
});

/**
 * Layer 3: DeclarativeNetRequest Rules Synchronization
 */
async function syncRules(settings) {
  try {
    const isMaster = settings.masterEnabled ?? true;
    const rulesetId = 'static_ai_rules';

    if (!isMaster) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: [rulesetId]
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [rulesetId]
      });
    }

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r) => r.id);

    const addRules = [];
    let nextId = 10000;

    // 1. Dynamic regex redirect for any .ai domain
    if (isMaster) {
      const blockedPageUrl = chrome.runtime.getURL('blocked/blocked.html');
      addRules.push({
        id: nextId++,
        priority: 2,
        action: {
          type: 'redirect',
          redirect: { regexSubstitution: blockedPageUrl }
        },
        condition: {
          regexFilter: '^https?://[^/:]+\\.ai(:[0-9]+)?(/.*)?$',
          resourceTypes: ['main_frame']
        }
      });
    }

    // 2. Whitelisted Domains (Priority 100: Overrides all blocking)
    const whitelisted = settings.whitelistedDomains || [];
    for (const domain of whitelisted) {
      const clean = domain.trim().toLowerCase();
      if (!clean) continue;
      addRules.push({
        id: nextId++,
        priority: 100,
        action: { type: 'allow' },
        condition: {
          urlFilter: `||${clean}`,
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

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
  } catch (err) {
    console.error('[ZeroWeb AI] Error updating rules:', err);
  }
}

async function updateBadge(tabId, count) {
  try {
    const data = await chrome.storage.local.get(['masterEnabled']);
    if (data.masterEnabled === false) {
      await chrome.action.setBadgeText({ text: 'OFF', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#64748B', tabId });
      return;
    }
    const text = count && count > 0 ? (count > 99 ? '99+' : count.toString()) : '';
    await chrome.action.setBadgeText({ text, tabId });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color: '#E11D48', tabId });
    }
  } catch (e) {}
}

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
          masterEnabled: data.masterEnabled ?? true,
          whitelistedDomains: data.whitelistedDomains || [],
          showBlockedPage: data.showBlockedPage ?? true,
          totalBlocked: data.totalBlocked || 0,
          currentTabBlocked: tabCount
        });
        break;
      }

      case 'TOGGLE_MASTER': {
        const data = await chrome.storage.local.get(['masterEnabled']);
        const updated = !(data.masterEnabled ?? true);
        await chrome.storage.local.set({ masterEnabled: updated });
        const all = await chrome.storage.local.get(null);
        await syncRules(all);

        const tabs = await chrome.tabs.query({});
        for (const t of tabs) {
          const c = tabBlockedCounts.get(t.id) || 0;
          updateBadge(t.id, c);
        }

        sendResponse({ success: true, masterEnabled: updated });
        break;
      }

      case 'TOGGLE_WHITELIST': {
        const domain = (message.domain || '').trim().toLowerCase();
        if (!domain) return sendResponse({ success: false });

        const data = await chrome.storage.local.get(['whitelistedDomains']);
        let list = [...(data.whitelistedDomains || [])];

        const index = list.indexOf(domain);
        let nowWhitelisted = false;
        if (index > -1) {
          list.splice(index, 1);
          nowWhitelisted = false;
        } else {
          list.push(domain);
          nowWhitelisted = true;
        }

        await chrome.storage.local.set({ whitelistedDomains: list });
        const all = await chrome.storage.local.get(null);
        await syncRules(all);

        sendResponse({ success: true, isWhitelisted: nowWhitelisted, whitelistedDomains: list });
        break;
      }

      case 'ADD_WHITELIST': {
        const domain = (message.domain || '').trim().toLowerCase();
        if (!domain) return sendResponse({ success: false });

        const data = await chrome.storage.local.get(['whitelistedDomains']);
        const set = new Set(data.whitelistedDomains || []);
        set.add(domain);
        const list = Array.from(set);

        await chrome.storage.local.set({ whitelistedDomains: list });
        const all = await chrome.storage.local.get(null);
        await syncRules(all);

        sendResponse({ success: true, whitelistedDomains: list });
        break;
      }

      case 'REMOVE_WHITELIST': {
        const domain = (message.domain || '').trim().toLowerCase();
        const data = await chrome.storage.local.get(['whitelistedDomains']);
        const list = (data.whitelistedDomains || []).filter((d) => d !== domain);

        await chrome.storage.local.set({ whitelistedDomains: list });
        const all = await chrome.storage.local.get(null);
        await syncRules(all);

        sendResponse({ success: true, whitelistedDomains: list });
        break;
      }

      case 'TOGGLE_BLOCKED_PAGE': {
        const data = await chrome.storage.local.get(['showBlockedPage']);
        const updated = !(data.showBlockedPage ?? true);
        await chrome.storage.local.set({ showBlockedPage: updated });
        sendResponse({ success: true, showBlockedPage: updated });
        break;
      }

      case 'REPORT_BLOCKED': {
        const { count = 1 } = message;
        if (tabId) {
          const current = (tabBlockedCounts.get(tabId) || 0) + count;
          tabBlockedCounts.set(tabId, current);
          updateBadge(tabId, current);
        }

        const data = await chrome.storage.local.get(['totalBlocked']);
        const updatedTotal = (data.totalBlocked || 0) + count;
        await chrome.storage.local.set({ totalBlocked: updatedTotal });
        sendResponse({ success: true, totalBlocked: updatedTotal });
        break;
      }

      case 'RESET_STATS': {
        await chrome.storage.local.set({ totalBlocked: 0 });
        sendResponse({ success: true, totalBlocked: 0 });
        break;
      }

      case 'GET_LAST_BLOCKED_URL': {
        const reqTabId = message.tabId || tabId;
        const lastUrl = lastAttemptedUrls.get(reqTabId) || '';
        sendResponse({ url: lastUrl });
        break;
      }

      default:
        sendResponse({ error: 'Unknown action' });
    }
  })();

  return true;
});
