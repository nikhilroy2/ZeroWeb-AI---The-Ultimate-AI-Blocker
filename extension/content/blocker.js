/**
 * ZeroWeb AI - Content Script DOM Mutation Observer & Element Purger
 * Synchronously intercepts any .ai domain or standalone AI platform,
 * and dynamically hunts and purges internal AI tools, AI agents, search overviews,
 * and floating chatbots across ANY website.
 */

(function () {
  'use strict';

  const currentHost = window.location.hostname.toLowerCase();

  // Standalone non-.ai platforms that must be redirected
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

  function isAiPlatform(hostname) {
    if (!hostname) return false;
    // Intercept ANY .ai domain (e.g. manus.ai, claude.ai, perplexity.ai)
    if (hostname.endsWith('.ai') || hostname === 'ai') {
      return true;
    }
    return STANDALONE_AI_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    );
  }

  // =========================================================================
  // IMMEDIATE GUARD: If browsing any .ai or standalone AI platform, redirect
  // =========================================================================
  if (isAiPlatform(currentHost)) {
    if (document.documentElement) {
      document.documentElement.style.display = 'none';
    }

    chrome.storage.local.get(['masterEnabled', 'whitelistedDomains'], (data) => {
      const isMaster = data.masterEnabled ?? true;
      const whitelist = data.whitelistedDomains || [];
      const isAllowed = whitelist.some(
        (d) => currentHost === d || currentHost.endsWith('.' + d)
      );

      if (isMaster && !isAllowed) {
        window.location.replace(chrome.runtime.getURL('blocked/blocked.html'));
      } else {
        if (document.documentElement) {
          document.documentElement.style.display = '';
        }
      }
    });

    return; // Stop further execution on AI platform
  }

  // =========================================================================
  // REGULAR WEBSITES: Purge own built-in AI tools, AI agents, and overviews
  // =========================================================================
  let isEnabled = true;
  let isWhitelisted = false;
  let observer = null;
  let blockedCount = 0;
  let reportTimer = null;

  // Regex matching AI tool/agent titles, labels, or button text
  const AI_TEXT_REGEX = /\b(ask\s*ai|ai\s*agent|ai\s*assistant|ai\s*copilot|chat\s*with\s*ai|write\s*with\s*ai|summarize\s*with\s*ai|rewrite\s*with\s*ai|generate\s*with\s*ai|ai\s*helper|ai\s*summary|ask\s*copilot|notion\s*ai|atlassian\s*intelligence|magic\s*write|sidekick\s*ai)\b/i;

  // Structural selectors
  const AI_SELECTORS = [
    // Generic AI agent & tool selectors on ANY site
    '[id*="ai-agent" i]',
    '[class*="ai-agent" i]',
    '[id*="ai-assistant" i]',
    '[class*="ai-assistant" i]',
    '[id*="ai-copilot" i]',
    '[class*="ai-copilot" i]',
    '[id*="ai-helper" i]',
    '[class*="ai-helper" i]',
    '[id*="ai-sidebar" i]',
    '[class*="ai-sidebar" i]',
    '[id*="ai-drawer" i]',
    '[class*="ai-drawer" i]',
    '[id*="ai-writer" i]',
    '[class*="ai-writer" i]',
    '[id*="ai-summary" i]',
    '[class*="ai-summary" i]',
    '[id*="ai-widget" i]',
    '[class*="ai-widget" i]',
    '[id*="ai-chat" i]',
    '[class*="ai-chat" i]',
    '[id*="ai-bot" i]',
    '[class*="ai-bot" i]',
    '[id*="ai-bubble" i]',
    '[class*="ai-bubble" i]',
    '[data-testid*="ai-agent" i]',
    '[data-testid*="ai-assistant" i]',
    '[data-testid*="ai-copilot" i]',
    '[aria-label*="Ask AI" i]',
    '[aria-label*="AI Assistant" i]',
    '[aria-label*="AI Agent" i]',
    '[aria-label*="AI Copilot" i]',
    '[aria-label*="Write with AI" i]',
    '[aria-label*="Generate with AI" i]',
    '[aria-label*="Summarize with AI" i]',
    '[title*="Ask AI" i]',
    '[title*="AI Assistant" i]',
    '[title*="AI Agent" i]',

    // Notion, Atlassian, Canva, Figma, Shopify, Hubspot AI
    '.notion-ai-button',
    '[data-testid*="atlassian-intelligence"]',
    '[data-testid*="rovo"]',
    '[data-testid*="magic-ai"]',
    '[aria-label*="Magic Write" i]',
    '[data-testid*="ai-actions"]',
    '[data-testid*="sidekick"]',
    '[data-test-id*="breeze-ai"]',
    '.jetpack-ai-assistant',

    // Google Search AI Overviews
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
    'button[aria-label*="Ask Gemini" i]',

    // Bing Copilot
    '#b_copilot',
    '.b_ans_copilot',
    '.cib-serp-main',
    '#copilot_app',
    'cib-serp',

    // Social Media AI
    'a[aria-label="Grok" i]',
    'a[href="/i/grok"]',
    '[data-testid="GrokDrawer"]',
    'div[data-testid="grok-pill"]',
    'button[aria-label*="AI" i]',
    'div.feed-shared-update-v2__ai-summary',
    'ytd-ai-summary-renderer',
    'shreddit-ai-overview',
    'copilot-chat-button',
    '[data-component="copilot-chat"]',

    // Embedded Chatbots
    '#intercom-container',
    'iframe#intercom-frame',
    '#drift-widget',
    '#tidio-chat',
    'div#chatbase-bubble-window',
    'iframe[src*="chatbase.co"]',
    'iframe[src*="voiceflow.com"]',
    'div#voiceflow-chat',
    'div#dante-widget',
    'div#chatling-widget',
    'iframe[src*="kapa.ai"]',
    'div[id*="inkeep"]'
  ];

  const SELECTOR_STRING = AI_SELECTORS.join(',\n');

  function init() {
    chrome.storage.local.get(['masterEnabled', 'whitelistedDomains'], (res) => {
      if (!res) return;

      isEnabled = res.masterEnabled ?? true;
      const whitelist = res.whitelistedDomains || [];

      isWhitelisted = whitelist.some(
        (d) => currentHost === d || currentHost.endsWith('.' + d)
      );

      if (!isEnabled || isWhitelisted) {
        disableBlocker();
        return;
      }

      purgeDOM();
      startObserver();
    });
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

  /**
   * Block an AI element cleanly
   */
  function blockElement(el) {
    if (el.hasAttribute('data-zero-ai-blocked')) return false;
    el.setAttribute('data-zero-ai-blocked', 'true');
    try {
      el.remove();
    } catch (e) {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    }
    return true;
  }

  /**
   * Scans DOM using both structural selectors and dynamic text/label heuristics
   */
  function purgeDOM(root = document) {
    if (!isEnabled || isWhitelisted) return;

    let count = 0;
    const targetRoot = root === document ? document : root;

    // 1. Selector-based purge
    try {
      const elements = targetRoot.querySelectorAll(SELECTOR_STRING);
      for (const el of elements) {
        if (blockElement(el)) count++;
      }
    } catch (e) {}

    // 2. Dynamic Heuristic Purge for own AI tools/agents across ANY website
    try {
      // Check interactive triggers: buttons, links, floating action bars, summary pills
      const candidates = targetRoot.querySelectorAll('button, a, summary, [role="button"], [class*="sparkle" i], [class*="bot" i], [class*="chat" i]');
      for (const el of candidates) {
        if (el.hasAttribute('data-zero-ai-blocked')) continue;

        // Check text, aria-label, title, or dataset
        const label = (
          (el.getAttribute('aria-label') || '') + ' ' +
          (el.getAttribute('title') || '') + ' ' +
          (el.innerText || '')
        ).trim();

        if (label.length > 0 && label.length < 80 && AI_TEXT_REGEX.test(label)) {
          // If candidate is a button inside a floating container or toolbar, remove candidate
          if (blockElement(el)) count++;
        }
      }
    } catch (e) {}

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
      } catch (e) {}
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
