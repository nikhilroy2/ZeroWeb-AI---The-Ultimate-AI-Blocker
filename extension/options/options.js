/**
 * ZeroWeb AI - Options & Settings Controller
 * Minimal, reliable, zero-confusion settings manager.
 */

document.addEventListener('DOMContentLoaded', () => {
  const masterToggle = document.getElementById('masterToggle');
  const masterStatusLabel = document.getElementById('masterStatusLabel');
  const domainInput = document.getElementById('domainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');
  const whitelistContainer = document.getElementById('whitelistContainer');
  const showBlockedPageToggle = document.getElementById('showBlockedPageToggle');
  const totalBlockedNum = document.getElementById('totalBlockedNum');
  const resetStatsBtn = document.getElementById('resetStatsBtn');
  const toast = document.getElementById('toast');

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2500);
  }

  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
      if (!res || chrome.runtime.lastError) return;

      const master = res.masterEnabled ?? true;
      masterToggle.checked = master;
      masterStatusLabel.textContent = master ? 'Shield Active' : 'Shield Disabled';
      masterStatusLabel.className = master ? 'master-label' : 'master-label disabled';

      showBlockedPageToggle.checked = res.showBlockedPage ?? true;
      totalBlockedNum.textContent = res.totalBlocked || 0;

      renderWhitelist(res.whitelistedDomains || []);
    });
  }

  function renderWhitelist(domains) {
    whitelistContainer.innerHTML = '';
    if (!domains.length) {
      whitelistContainer.innerHTML = '<div class="empty-state">No websites allowed.</div>';
      return;
    }

    domains.forEach((domain) => {
      const row = document.createElement('div');
      row.className = 'whitelist-row';
      row.innerHTML = `
        <span class="domain-tag">${escapeHtml(domain)}</span>
        <button class="remove-btn">✕ Block Again</button>
      `;
      row.querySelector('.remove-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'REMOVE_WHITELIST', domain }, () => {
          showToast(`"${domain}" removed.`);
          loadSettings();
        });
      });
      whitelistContainer.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Master switch
  masterToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_MASTER' }, (res) => {
      showToast(res.masterEnabled ? 'AI Blocker Enabled' : 'AI Blocker Disabled');
      loadSettings();
    });
  });

  // Add domain to whitelist
  function addDomain() {
    let domain = domainInput.value.trim().toLowerCase();
    if (!domain) return;

    domain = domain.replace(/^https?:\/\//i, '').split('/')[0];

    chrome.runtime.sendMessage({ type: 'ADD_WHITELIST', domain }, () => {
      domainInput.value = '';
      showToast(`"${domain}" allowed.`);
      loadSettings();
    });
  }

  addDomainBtn.addEventListener('click', addDomain);
  domainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDomain();
  });

  // Toggle show blocked page
  showBlockedPageToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_BLOCKED_PAGE' }, () => {
      showToast('Preference saved');
    });
  });

  // Reset stats
  resetStatsBtn.addEventListener('click', () => {
    if (confirm('Reset counter to 0?')) {
      chrome.runtime.sendMessage({ type: 'RESET_STATS' }, () => {
        showToast('Counter reset to 0');
        loadSettings();
      });
    }
  });

  loadSettings();
});
