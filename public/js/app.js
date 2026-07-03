/**
 * app.js — Main router, bootstrap, and navigation controller
 */

const App = {
  _currentRoute:  'dashboard',
  _currentParams: {},

  // ── Route map ─────────────────────────────────────────────────────────────
  ROUTES: {
    'dashboard':   { view: () => DashboardView,   navId: 'dashboard' },
    'lists':       { view: () => ListView,         navId: 'lists'     },
    'list-detail': { view: () => ListDetailView,   navId: 'lists'     },
    'shopping':    { view: () => ShoppingView,     navId: null        },
    'analytics':   { view: () => AnalyticsView,    navId: 'analytics' },
    'optimizer':   { view: () => OptimizerView,    navId: 'optimizer' },
    'settings':    { view: () => SettingsView,     navId: 'settings'  },
  },

  // ── Navigate to a route ───────────────────────────────────────────────────
  navigate(route, params = {}) {
    if (!App.ROUTES[route]) {
      console.warn(`Unknown route: ${route}`);
      return App.navigate('dashboard');
    }

    App._currentRoute  = route;
    App._currentParams = params;
    window.location.hash = params.id ? `${route}/${params.id}` : route;

    App._renderRoute(route, params);
  },

  // ── Handle hash change ────────────────────────────────────────────────────
  _handleHash() {
    const hash   = window.location.hash.replace('#', '') || 'dashboard';
    const parts  = hash.split('/');
    const route  = parts[0];
    const id     = parts[1] || null;
    const params = id ? { id } : {};

    if (App.ROUTES[route]) {
      App._currentRoute  = route;
      App._currentParams = params;
      App._renderRoute(route, params);
    } else {
      App.navigate('dashboard');
    }
  },

  // ── Render a view ─────────────────────────────────────────────────────────
  _renderRoute(route, params) {
    const config = App.ROUTES[route];
    const view   = config.view();

    // Update nav active state
    const navId = config.navId;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', navId && el.dataset.route === navId);
    });

    // Render view
    view.render(params);
  },

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  async init() {
    // Load budget settings for currency etc.
    try {
      const budget = await Api.getBudget();
      Store.set('currency', budget.settings?.currency || 'USD');
      Store.set('monthlyLimit', budget.settings?.monthly_limit || 300);
    } catch (e) {
      // silently ignore on first load
    }

    // Wire bottom nav clicks
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.route));
    });

    // Handle browser back/forward
    window.addEventListener('hashchange', App._handleHash);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('[SW] Service Worker registered');
      }).catch(err => {
        console.warn('[SW] Registration failed:', err);
      });
    }

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      window._pwaPrompt = e;
      // Show a subtle install button if user hasn't installed
      const btn = document.createElement('button');
      btn.className = 'btn btn-accent btn-sm';
      btn.innerHTML = '📱 Install App';
      btn.style.cssText = 'position:fixed;bottom:calc(var(--nav-height)+80px);right:16px;z-index:60;';
      btn.addEventListener('click', async () => {
        window._pwaPrompt.prompt();
        const result = await window._pwaPrompt.userChoice;
        if (result.outcome === 'accepted') btn.remove();
      });
      document.body.appendChild(btn);
      setTimeout(() => btn.remove(), 15000); // auto-hide after 15s
    });

    // Initial route
    App._handleHash();
  },
};

// ── Boot when DOM is ready ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(err => {
    console.error('App init failed:', err);
    document.getElementById('main-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Connection Error</div>
        <p class="empty-state-text">Could not connect to the server. Make sure it's running at port 3000.</p>
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
      </div>`;
  });
});

window.App = App;
