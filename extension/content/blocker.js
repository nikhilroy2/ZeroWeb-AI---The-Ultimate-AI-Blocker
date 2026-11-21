/**
 * ZeroWeb AI - Content Script DOM Mutation Observer & Element Purger
 * Active by default on all websites unless whitelisted or master switch is OFF.
 * Removes AI Overviews, search generative widgets, social AI drawers, and embedded chatbots.
 */

(function () {
  'use strict';

  const currentHost = window.location.hostname.toLowerCase();
  let isEnabled = true;
  let isWhitelisted = false;
  let observer = null;
  let blockedCount = 0;
  let reportTimer = null;

  // Comprehensive AI Element Selectors (Active by default)
  const AI_SELECTORS = [
    // 1. Google Search AI Overviews & Gemini
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
    'div[data-component="ai-overview"]',
    'div.MjjYud:has([data-attrid="ai_overview"])',

    // 2. Bing & Microsoft Copilot
    '#b_copilot',
    '.b_ans_copilot',
    '.cib-serp-main',
    '#copilot_app',
    'div[id*="copilot"]',
    'div[class*="copilot"]',
    'div[data-priority="1"]:has(cib-serp)',
    '.b_ans:has(cib-serp)',
    'cib-serp',

    // 3. Twitter / X - Grok
    'a[aria-label="Grok" i]',
    'a[href="/i/grok"]',
    '[data-testid="GrokDrawer"]',
    'div[data-testid="grok-pill"]',
    'div[data-testid="grok-button"]',
    'div:has(> a[href="/i/grok"])',

    // 4. LinkedIn - AI Inlines
    'button[aria-label*="AI" i]',
    'div.feed-shared-update-v2__ai-summary',
    'div.update-components-ai-summary',
    '.artdeco-button:has(svg[data-test-icon*="sparkle"])',
    'button.ai-editor-assistant-btn',
    'div[data-control-name="ai_assistant"]',

    // 5. YouTube - AI Summaries & Ask Button
    'ytd-ai-summary-renderer',
    'ytd-rich-shelf-renderer:has([aria-label*="AI" i])',
    'button[aria-label*="Ask" i]:has(svg)',
    '#ai-summary',

    // 6. Reddit - AI Answers
    'shreddit-ai-overview',
    'div[data-testid*="ai-summary"]',
    'div[id*="ai-answer"]',
    'faceplate-tracker[source="ai_summary"]',

    // 7. GitHub - Copilot Chat Inlines
    'copilot-chat-button',
    '[data-component="copilot-chat"]',
    '.copilot-summary',

    // 8. Floating AI Chatbots & Customer Assistants
    '#intercom-container',
    'iframe#intercom-frame',
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
  ];

  const SELECTOR_STRING = AI_SELECTORS.join(',\n');

  function init() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
        if (!res || chrome.runtime.lastError) return;

        isEnabled = res.masterEnabled ?? true;
        const whitelist = res.whitelistedDomains || [];

        // Check if current hostname is whitelisted
        isWhitelisted = whitelist.some(
          (d) => currentHost === d || currentHost.endsWith('.' + d)
        );

        if (!isEnabled || isWhitelisted) {
          disableBlocker();
          return;
        }

        // Active: Purge DOM and monitor
        purgeDOM();
        startObserver();
      });
    } catch (e) {
      // Background not ready
    }
  }

  function disableBlocker() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    const nodes = document.querySelectorAll('[data-zero-ai-blocked="true"]');
    for (const node of nodes) {
      node.removeAttribute('data-zero-ai-blocked');
      node.style.display = '';
      node.style.visibility = '';
    }
  }

  function purgeDOM(root = document) {
    if (!isEnabled || isWhitelisted) return;

    let count = 0;
    try {
      const targets = (root === document ? document : root).querySelectorAll(SELECTOR_STRING);
      for (const el of targets) {
        if (!el.hasAttribute('data-zero-ai-blocked')) {
          el.setAttribute('data-zero-ai-blocked', 'true');
          try {
            el.remove();
          } catch (err) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
          }
          count++;
        }
      }
    } catch (e) {
      // Ignore query errors
    }

    if (count > 0) {
      blockedCount += count;
      scheduleReport();
    }
  }

  function scheduleReport() {
    if (reportTimer) return;
    reportTimer = setTimeout(() => {
      reportTimer = null;
      try {
        chrome.runtime.sendMessage({
          type: 'REPORT_BLOCKED',
          count: blockedCount
        });
      } catch (e) { }
    }, 200);
  }

  function startObserver() {
    if (observer || !document.documentElement) return;

    observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
      }
      if (shouldCheck) {
        purgeDOM();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Run on start
  init();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      purgeDOM();
      startObserver();
    });
  } else {
    purgeDOM();
    startObserver();
  }

  window.addEventListener('load', purgeDOM);
})();
