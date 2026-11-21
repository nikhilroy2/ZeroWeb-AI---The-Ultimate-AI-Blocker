# Project Rules & Specification: AI Blocker Chrome Extension (Manifest V3)

## 1. Project Overview & Goal
Build a complete, production-ready, Chrome Web Store-compliant Chrome Extension (Manifest V3) designed to completely block standalone AI platforms, embedded AI tools across websites/social media, and browser-level AI triggers. In addition to the extension source code, generate a separate static web folder containing the Chrome Web Store required legal pages (Privacy Policy, Terms of Service) and a product landing page.

## 2. Directory Structure
Maintain a clean separation between the Chrome Extension and the promotional/legal web pages:
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
│   │   ├── options.css
│   │   └── options.js
│   ├── blocked/
│   │   ├── blocked.html        # Custom "Access Blocked" redirect page
│   │   └── blocked.css
│   └── assets/
│       └── icons/              # SVG source + PNGs (16x16, 32x32, 48x48, 128x128)
│
└── website/                    # Static hosting folder for Chrome Web Store URLs
    ├── index.html              # Extension landing page & feature showcase
    ├── privacy.html            # Chrome Web Store compliant Privacy Policy
    ├── terms.html              # Terms of Service
    ├── styles.css              # Shared responsive stylesheet
    └── favicon.ico             # Website favicon