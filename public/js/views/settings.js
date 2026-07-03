/**
 * settings.js — App settings view
 */

const SettingsView = {
  async render() {
    UI.setHeaderActions('');
    UI.showLoading();

    try {
      const budget = await Api.getBudget();
      const s = budget.settings;

      UI.setContent(`
        <div class="animate-fadeup">
          <div class="view-header">
            <h1 class="view-title">Settings ⚙️</h1>
          </div>

          <!-- Google Vision API -->
          <div class="settings-section mb-lg">
            <div class="settings-section-title">🤖 Image Recognition</div>
            <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:12px;">
              <div>
                <div class="settings-row-label">Google Cloud Vision API Key</div>
                <div class="settings-row-sub">Required for AI image recognition in shopping mode</div>
              </div>
              <input type="password" id="vision-api-key" class="form-input"
                placeholder="AIza…" value="${s.google_vision_api_key || ''}" />
              <div style="display:flex;gap:8px;width:100%;">
                <button class="btn btn-ghost btn-sm" id="toggle-api-key">👁 Show</button>
                <button class="btn btn-primary btn-sm" id="save-api-key" style="flex:1;">Save API Key</button>
              </div>
              <a href="https://cloud.google.com/vision" target="_blank" rel="noopener"
                style="font-size:0.78rem;color:var(--purple-light);">
                How to get a Vision API key ↗
              </a>
            </div>
          </div>

          <!-- Budget -->
          <div class="settings-section mb-lg">
            <div class="settings-section-title">💰 Budget</div>
            <div class="settings-row">
              <div>
                <div class="settings-row-label">Monthly Budget</div>
                <div class="settings-row-sub">Your target grocery spend per month</div>
              </div>
              <input type="number" id="monthly-budget" class="form-input" style="width:100px;text-align:right;"
                value="${s.monthly_limit || 300}" min="1" step="10" />
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-row-label">Currency</div>
                <div class="settings-row-sub">Display currency</div>
              </div>
              <select id="currency-select" class="form-select" style="width:120px;">
                ${[
                  { code: 'LKR', label: 'LKR - Sri Lankan Rupee' },
                  { code: 'USD', label: 'USD - US Dollar' },
                  { code: 'EUR', label: 'EUR - Euro' },
                  { code: 'GBP', label: 'GBP - British Pound' },
                  { code: 'INR', label: 'INR - Indian Rupee' },
                  { code: 'AUD', label: 'AUD - Australian Dollar' },
                  { code: 'CAD', label: 'CAD - Canadian Dollar' },
                  { code: 'JPY', label: 'JPY - Japanese Yen' },
                  { code: 'SGD', label: 'SGD - Singapore Dollar' },
                  { code: 'AED', label: 'AED - UAE Dirham' },
                ].map(c =>
                  `<option value="${c.code}" ${s.currency === c.code ? 'selected' : ''}>${c.label}</option>`
                ).join('')}
              </select>
            </div>
            <div style="padding:var(--gap-md) var(--gap-lg);">
              <button class="btn btn-primary btn-full" id="save-budget-settings">Save Budget Settings</button>
            </div>
          </div>

          <!-- PWA -->
          <div class="settings-section mb-lg">
            <div class="settings-section-title">📱 PWA / Install</div>
            <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:8px;">
              <div class="settings-row-label">Install SmartCart on your phone</div>
              <div class="settings-row-sub">On Android Chrome: tap the menu ⋮ → "Add to Home Screen"</div>
              <div class="settings-row-sub">On iOS Safari: tap Share → "Add to Home Screen"</div>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-row-label">App Version</div>
              </div>
              <span class="badge badge-ghost">v1.0.0</span>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-row-label">Offline Mode</div>
                <div class="settings-row-sub">Service worker caches the app for offline use</div>
              </div>
              <span class="badge badge-success">✓ Active</span>
            </div>
          </div>

          <!-- Data Management -->
          <div class="settings-section mb-lg">
            <div class="settings-section-title">🗄️ Data Management</div>
            <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:12px;">
              <button class="btn btn-ghost btn-full" id="export-data-btn">📤 Export All Data (JSON)</button>
            </div>
            <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:12px;">
              <button class="btn btn-danger btn-full" id="clear-data-btn">🗑️ Clear All Data</button>
            </div>
          </div>

          <!-- About -->
          <div class="card" style="text-align:center;padding:var(--gap-xl);margin-bottom:100px;">
            <div style="font-size:3rem;margin-bottom:var(--gap-sm);">🛒</div>
            <div style="font-family:'Outfit',sans-serif;font-size:1.2rem;font-weight:800;
              background:var(--grad-accent);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
              SmartCart
            </div>
            <p style="color:var(--text3);font-size:0.82rem;margin-top:8px;">
              Smart Grocery Management with AI Recognition & Budget Tracking
            </p>
            <p style="color:var(--text3);font-size:0.75rem;margin-top:4px;">Version 1.0.0</p>
          </div>
        </div>
      `);

      SettingsView._wireEvents(s);

    } catch (err) {
      UI.setContent(`<div class="empty-state"><p>${err.message}</p></div>`);
    }
  },

  _wireEvents(s) {
    // Toggle API key visibility
    const apiKeyInput = document.getElementById('vision-api-key');
    document.getElementById('toggle-api-key')?.addEventListener('click', () => {
      apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    });

    // Save API key
    document.getElementById('save-api-key')?.addEventListener('click', async () => {
      const key = apiKeyInput.value.trim();
      try {
        await Api.updateBudget({ google_vision_api_key: key });
        UI.toast(key ? 'API key saved! Image recognition is now active.' : 'API key cleared.', 'success');
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });

    // Save budget settings
    document.getElementById('save-budget-settings')?.addEventListener('click', async () => {
      const limit    = parseFloat(document.getElementById('monthly-budget').value)  || 300;
      const currency = document.getElementById('currency-select').value;
      try {
        await Api.updateBudget({ monthly_limit: limit, currency });
        Store.set('currency', currency);
        Store.set('monthlyLimit', limit);
        UI.toast('Budget settings saved!', 'success');
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });

    // Export data
    document.getElementById('export-data-btn')?.addEventListener('click', async () => {
      try {
        const [lists, purchases, budget] = await Promise.all([
          Api.getLists(),
          Api.getPurchases(),
          Api.getBudget(),
        ]);
        const data     = { lists, purchases, budget, exported_at: new Date().toISOString() };
        const blob     = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url      = URL.createObjectURL(blob);
        const a        = document.createElement('a');
        a.href         = url;
        a.download     = `smartcart-export-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('Data exported!', 'success');
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });

    // Clear all data
    document.getElementById('clear-data-btn')?.addEventListener('click', () => {
      UI.confirm(
        '⚠️ This will permanently delete all your lists, items, and purchase history. Are you sure?',
        async () => {
          try {
            const lists = await Api.getLists();
            for (const list of lists) await Api.deleteList(list.id);
            Store.setActiveList(null);
            UI.toast('All data cleared', 'info');
            App.navigate('dashboard');
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        }
      );
    });
  },
};

window.SettingsView = SettingsView;
