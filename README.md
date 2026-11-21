# ZeroWeb AI - The Ultimate AI Blocker (Manifest V3)

> **Reclaim the Web. Zero AI Clutter.**  
> A high-performance, production-ready, Chrome Web Store-compliant browser extension designed to block standalone AI platforms, search engine AI overviews, social media AI features, and embedded chatbots.

---

## 📁 Repository Structure

Following the exact specifications in [project.md](file:///.agents/rules/project.md):

```text
/
├── extension/                  # Chrome Web Store uploadable folder
│   ├── manifest.json           # Manifest V3 configuration
│   ├── background.js           # Service worker (declarativeNetRequest, state sync)
│   ├── rules.json              # Static network blocking rules for known AI domains
│   ├── content/
│   │   ├── blocker.js          # DOM mutation observer & element remover
│   │   └── blocker.css         # Immediate CSS hiding rules to prevent FOUC
│   ├── popup/
│   │   ├── popup.html          # Extension toolbar popup UI
│   │   ├── popup.css           # Clean, modern styling
│   │   └── popup.js            # Toggle switches, blocked counter, quick stats
│   ├── options/
│   │   ├── options.html        # Full settings & custom blocklist management
│   │   ├── options.css         # Options dashboard styles
│   │   └── options.js          # Options controller & import/export
│   ├── blocked/
│   │   ├── blocked.html        # Custom "Access Blocked" redirect page
│   │   ├── blocked.css         # Minimalist cyber-shield styling
│   │   └── blocked.js          # Return, bypass & whitelist actions
│   └── assets/
│       └── icons/              # SVG source + PNGs (16x16, 32x32, 48x48, 128x128)
│
└── website/                    # Static hosting folder for Chrome Web Store URLs
    ├── index.html              # Extension landing page & feature showcase
    ├── privacy.html            # Chrome Web Store compliant Privacy Policy
    ├── terms.html              # Terms of Service
    ├── styles.css              # Shared responsive stylesheet
    └── favicon.ico             # Website favicon
```

---

## ⚡ Core Features

1. **Native DeclarativeNetRequest Blocking**:
   - Zero latency impact. Subresource requests and navigation requests to standalone generative AI platforms (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Mistral, Grok, Midjourney, Suno, etc.) are intercepted at the browser engine level.
   - Redirects `main_frame` navigation to a sleek, informative `blocked/blocked.html` page with 1-click temporary 10-minute bypass or permanent whitelist options.

2. **Instant Zero-FOUC DOM Purging**:
   - `blocker.css` is injected at `document_start` to instantly suppress Google AI Overviews, Bing Copilot sidebars, X/Grok drawers, LinkedIn "Write with AI" buttons, and Reddit AI answers before screen rendering occurs (zero flicker).
   - `blocker.js` uses a `MutationObserver` on `document.documentElement` to continuously catch and strip out late-rendered widgets and floating AI chatbots (Intercom, Drift, Tidio, Chatbase, Voiceflow).

3. **100% Offline & Private (Zero Telemetry)**:
   - Operates with zero remote servers, analytics SDKs, or external trackers.
   - All custom rules and counters persist locally in `chrome.storage.local`.

4. **Granular Control Dashboard**:
   - Toolbar popup for instant active tab whitelist toggling, master shield switch, and real-time blocked counters.
   - Comprehensive full-tab Options dashboard to add custom wildcard domains, custom CSS selectors, manage active temporary bypasses with auto-expiration, export/import JSON configurations, and view category analytics.

---

## 🚀 Quick Start / How to Test in Chrome

1. Open Google Chrome, Brave, or any Chromium-based browser.
2. Navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `extension/` folder inside this repository:
   ```text
   c:\NIKHIL_DEV_PROJECTS\MY_OWN\chrome_extensions\zero_web_ai\extension
   ```
6. The **ZeroWeb AI** icon will appear in your toolbar! Pin it and enjoy an AI-clutter-free web experience.

---

## 🌐 Static Web Hosting (Chrome Web Store Links)

The `website/` folder is completely standalone and ready for static hosting on GitHub Pages, Cloudflare Pages, Netlify, or Vercel:
- **Landing Page**: `website/index.html` (includes interactive before/after AI blocker simulation)
- **Privacy Policy**: `website/privacy.html` (fully compliant with Chrome Web Store Developer Program Policies)
- **Terms of Service**: `website/terms.html`
