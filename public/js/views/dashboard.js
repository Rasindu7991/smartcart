/**
 * dashboard.js — Home dashboard view
 */

const DashboardView = {
  async render() {
    UI.setHeaderActions('');
    UI.showLoading();

    try {
      const [stats, lists, monthly] = await Promise.all([
        Api.getStats(),
        Api.getLists(),
        Api.getMonthly(),
      ]);

      Store.set('currency', stats.currency);
      Store.set('monthlyLimit', stats.monthly_limit);

      const activeLists  = lists.filter(l => l.status === 'active');
      const activeList   = activeLists[0];
      const change       = stats.prev_total > 0
        ? ((stats.current_total - stats.prev_total) / stats.prev_total * 100).toFixed(1)
        : null;
      const changeDir    = change > 0 ? 'up' : 'down';
      const changeLabel  = change !== null
        ? `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}% vs last month`
        : 'No previous data';

      UI.setContent(`
        <div class="animate-fadeup">
          <!-- Greeting -->
          <div class="view-header">
            <h1 class="view-title">Dashboard 🏠</h1>
            <p class="view-subtitle">${DashboardView._greeting()}</p>
          </div>

          <!-- Budget Ring Card -->
          <div class="card card-gradient mb-lg" style="text-align:center;padding:var(--gap-xl);">
            <h3 style="margin-bottom:var(--gap-lg);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text3);">
              This Month's Budget
            </h3>
            <div style="display:flex;justify-content:center;" id="budget-ring-container"></div>
            <div class="stats-grid" style="margin-top:var(--gap-lg);">
              <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-value">${Store.fmt(stats.avg_weekly)}</div>
                <div class="stat-label">Avg weekly spend</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">📉</div>
                <div class="stat-value" style="font-size:1rem;">${changeLabel}</div>
                <div class="stat-label">vs last month</div>
              </div>
            </div>
          </div>

          <!-- Active List Preview -->
          ${activeList ? DashboardView._activeListCard(activeList) : DashboardView._noListCard()}

          <!-- 6-Month Trend -->
          ${monthly.length > 1 ? `
          <div class="card mb-lg">
            <div class="section-header">
              <span class="section-title">📈 Monthly Trend</span>
            </div>
            <div class="chart-wrapper">
              <canvas id="trend-chart" class="chart-canvas"></canvas>
            </div>
          </div>` : ''}

          <!-- Quick Add -->
          ${activeList ? `
          <div class="card" style="margin-bottom:100px;">
            <div class="section-header">
              <span class="section-title">⚡ Quick Add</span>
              <span class="text-muted" style="font-size:0.82rem;">to ${UI.escape(activeList.name)}</span>
            </div>
            <form id="quick-add-form" style="display:flex;gap:10px;">
              <input type="text" id="quick-item-name" class="form-input" placeholder="Add item…" style="flex:1;" />
              <button type="submit" class="btn btn-primary" style="flex-shrink:0;">Add</button>
            </form>
          </div>` : ''}
        </div>
      `);

      // Render budget ring
      const ringEl = document.getElementById('budget-ring-container');
      if (ringEl) {
        Charts.renderBudgetRing(ringEl, stats.current_total, stats.monthly_limit, Store.fmt(stats.current_total));
      }

      // Render trend chart
      if (monthly.length > 1) {
        setTimeout(() => {
          const canvas = document.getElementById('trend-chart');
          if (canvas) {
            Charts.drawBar(canvas, monthly.map(m => ({
              label: m.month.slice(5), // "06"
              value: m.total || 0,
            })));
          }
        }, 50);
      }

      // Quick add form
      const qaForm = document.getElementById('quick-add-form');
      if (qaForm && activeList) {
        qaForm.addEventListener('submit', async e => {
          e.preventDefault();
          const name = document.getElementById('quick-item-name').value.trim();
          if (!name) return;
          try {
            await Api.addItem(activeList.id, { name });
            document.getElementById('quick-item-name').value = '';
            UI.toast(`${name} added to ${activeList.name}`, 'success');
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });
      }

      // Shop button
      document.getElementById('dash-shop-btn')?.addEventListener('click', () => {
        Store.setActiveList(activeList);
        App.navigate('shopping');
      });

    } catch (err) {
      UI.setContent(`<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${err.message}</p></div>`);
    }
  },

  _activeListCard(list) {
    const pct    = list.item_count > 0 ? (list.checked_count / list.item_count) * 100 : 0;
    const remain = list.item_count - list.checked_count;
    return `
      <div class="card glow-purple mb-lg">
        <div class="section-header">
          <span class="section-title">📋 Active List</span>
          <span class="badge badge-${list.type === 'weekly' ? 'cyan' : 'purple'}">${list.type}</span>
        </div>
        <div style="font-size:1.3rem;font-weight:700;font-family:'Outfit',sans-serif;margin-bottom:var(--gap-sm);">
          ${UI.escape(list.name)}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text2);margin-bottom:var(--gap-md);">
          <span>${remain} items remaining</span>
          <span>${Store.fmt(list.estimated_total)} est.</span>
        </div>
        <div class="progress-bar mb-lg">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <button class="btn btn-accent btn-full" id="dash-shop-btn">
          🛒 Start Shopping
        </button>
      </div>
    `;
  },

  _noListCard() {
    return `
      <div class="card mb-lg" style="text-align:center;padding:var(--gap-xl);">
        <div style="font-size:3rem;margin-bottom:var(--gap-md);">📋</div>
        <h3 style="margin-bottom:var(--gap-sm);">No active list</h3>
        <p style="color:var(--text3);margin-bottom:var(--gap-lg);">Create a grocery list to get started</p>
        <button class="btn btn-primary" onclick="App.navigate('lists')">+ Create List</button>
      </div>
    `;
  },

  _greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning! Ready to plan your shopping?';
    if (h < 17) return 'Good afternoon! Check your grocery list.';
    return 'Good evening! Plan tomorrow\'s shopping.';
  },
};

window.DashboardView = DashboardView;
