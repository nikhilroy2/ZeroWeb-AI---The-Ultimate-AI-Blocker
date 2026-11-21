/**
 * ZeroWeb AI - Content Script DOM Mutation Observer & Blocker
 * Injected at document_start.
 * Scans, intercepts, and strips out embedded AI widgets, search overviews,
 * and user-defined custom selectors in real time.
 */

(function () {
  'use strict';

  const currentHost = window.location.hostname.toLowerCase();
  let isMasterEnabled = true;
  let isWhitelisted = false;
  let categories = {
    standalone: true,
    search: true,
    social: true,
    chatbots: true
  };
  let customSelectors = [];
  let blockedCount = 0;
  let observer = null;
  let reportingTimeout = null;

  // Domain-specific rule mapping for high precision
  const SELECTORS_BY_CATEGORY = {
    search: [
      'div#mfe-c',
      'div.x54gtf',
      'div.ULSxyf:has([data-async-context*="ai_overview"])',
      'div[data-attrid="wa:/m/012..."]',
      'div[aria-label="AI Overview" i]',
      'div[data-as="aio"]',
      'div[data-attrid="ai_overview"]',
      'div.Yz2fe',
      'div:has(> [data-mc-name="AI Overview"])',
      'div#botstuff div:has(> [data-async-context*="ai_overview"])',
      'div[data-g-id*="gemini"]',
      'div:has(> a[href*="gemini.google.com"])',
      'button[aria-label*="Ask Gemini" i]',
      '#b_copilot',
      '.b_ans_copilot',
      '.cib-serp-main',
      '#copilot_app',
      'div[id*="copilot"]',
      'cib-serp'
    ],
    social: [
      'a[aria-label="Grok" i]',
      'a[href="/i/grok"]',
      '[data-testid="GrokDrawer"]',
      'div[data-testid="grok-pill"]',
      'button[aria-label*="AI" i]',
      'div.feed-shared-update-v2__ai-summary',
      '.artdeco-button:has(svg[data-test-icon*="sparkle"])',
      'button.ai-editor-assistant-btn',
      'ytd-ai-summary-renderer',
      'ytd-rich-shelf-renderer:has([aria-label*="AI" i])',
      'button[aria-label*="Ask" i]:has(svg)',
      '#ai-summary',
      'shreddit-ai-overview',
      'div[data-testid*="ai-summary"]',
      'div[id*="ai-answer"]',
      'faceplate-tracker[source="ai_summary"]',
      'copilot-chat-button',
      '[data-component="copilot-chat"]',
      '.copilot-summary'
    ],
    chatbots: [
      '#intercom-container',
      'iframe#intercom-frame',
      '#intercom-lightweight-app',
      '#drift-widget',
      'iframe[id*="drift"]',
      '#tidio-chat',
      'iframe[id*="tidio"]',
      'div#chatbase-bubble-window',
      'iframe[src*="chatbase.co"]',
      'iframe[src*="voiceflow.com"]',
      'div#voiceflow-chat',
      'div#dante-widget',
      'iframe[src*="dante-ai.com"]',
      'div#chatling-widget',
      'iframe[src*="chatling.ai"]',
      'div[id*="ai-chat-bubble" i]',
      'div[class*="ai-chatbot" i]',
      'iframe[src*="kapa.ai"]'
    ]
  };

  /**
   * Initialize state from extension background
   */
  async function init() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (!response || chrome.runtime.lastError) return;

        isMasterEnabled = response.masterEnabled ?? true;
        categories = response.categories || categories;
        customSelectors = response.customSelectors || [];

        // Check whitelist & temporary bypass
        const whitelistedDomains = response.whitelistedDomains || [];
        const temporaryBypasses = response.temporaryBypasses || {};
        const now = Date.now();

        const matchesDomain = (list) =>
          list.some((d) => currentHost === d || currentHost.endsWith('.' + d));

        if (matchesDomain(whitelistedDomains)) {
          isWhitelisted = true;
        }

        for (const [domain, expiry] of Object.entries(temporaryBypasses)) {
          if (expiry > now && (currentHost === domain || currentHost.endsWith('.' + domain))) {
            isWhitelisted = true;
            break;
          }
        }

        if (!isMasterEnabled || isWhitelisted) {
          disableContentBlocker();
          return;
        }

        injectDynamicCustomCSS();
        scanAndPurge();
        startObserver();
      });
    } catch (e) {
      // Background context unavailable
    }
  }

  /**
   * If disabled or whitelisted, unhide elements and disconnect observer
   */
  function disableContentBlocker() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    const blockedNodes = document.querySelectorAll('[data-zero-ai-blocked="true"]');
    for (const node of blockedNodes) {
      node.removeAttribute('data-zero-ai-blocked');
    }
    const dynamicStyle = document.getElementById('zero-ai-dynamic-styles');
    if (dynamicStyle) dynamicStyle.remove();
  }

  /**
   * Injects user custom selectors as high-priority style tag
   */
  function injectDynamicCustomCSS() {
    if (!customSelectors.length) return;
    let style = document.getElementById('zero-ai-dynamic-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'zero-ai-dynamic-styles';
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = customSelectors.join(',\n') + ` {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      max-height: 0 !important;
      overflow: hidden !important;
    }`;
  }

  /**
   * Collects all active selectors based on enabled categories
   */
  function getActiveSelectors() {
    const list = [...customSelectors];
    if (categories.search) {
      list.push(...SELECTORS_BY_CATEGORY.search);
    }
    if (categories.social) {
      list.push(...SELECTORS_BY_CATEGORY.social);
    }
    if (categories.chatbots) {
      list.push(...SELECTORS_BY_CATEGORY.chatbots);
    }
    return list;
  }

  /**
   * Scans DOM and marks/removes AI elements
   */
  function scanAndPurge(root = document) {
    if (!isMasterEnabled || isWhitelisted) return;

    const selectors = getActiveSelectors();
    if (!selectors.length) return;

    let newlyBlocked = 0;

    for (const sel of selectors) {
      try {
        const elements = (root === document ? document : root).querySelectorAll(sel);
        for (const el of elements) {
          if (!el.hasAttribute('data-zero-ai-blocked')) {
            el.setAttribute('data-zero-ai-blocked', 'true');
            // Try removing element cleanly, or hide if structural parent
            try {
              el.remove();
            } catch (err) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
            }
            newlyBlocked++;
          }
        }
      } catch (e) {
        // Selector syntax error in custom selectors
      }
    }

    if (newlyBlocked > 0) {
      blockedCount += newlyBlocked;
      scheduleReport();
    }
  }

  /**
   * Throttled reporting to background service worker
   */
  function scheduleReport() {
    if (reportingTimeout) return;
    reportingTimeout = setTimeout(() => {
      reportingTimeout = null;
      try {
        chrome.runtime.sendMessage({
          type: 'REPORT_BLOCKED',
          count: blockedCount,
          category: 'search'
        });
      } catch (err) {
        // Service worker might be sleeping
      }
    }, 250);
  }

  /**
   * Start MutationObserver to capture late dynamically rendered nodes
   */
  function startObserver() {
    if (observer || !document.documentElement) return;

    observer = new MutationObserver((mutations) => {
      let needsScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              needsScan = true;
              break;
            }
          }
        }
        if (needsScan) break;
      }
      if (needsScan) {
        scanAndPurge();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Listen to messages from popup or options page
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RELOAD_RULES') {
      init();
      sendResponse({ success: true });
    }
  });

  // Execute immediately
  init();

  // Additional triggers for document ready states
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scanAndPurge();
      startObserver();
    });
  } else {
    scanAndPurge();
    startObserver();
  }

  window.addEventListener('load', () => {
    scanAndPurge();
  });
})();

