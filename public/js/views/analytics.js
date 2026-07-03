/**
 * analytics.js — Monthly analytics view with charts
 */

const AnalyticsView = {
  _month: new Date().toISOString().slice(0, 7),

  async render() {
    UI.setHeaderActions('');
    UI.showLoading();

    try {
      const [stats, categories, monthly] = await Promise.all([
        Api.getStats(AnalyticsView._month),
        Api.getCategories(AnalyticsView._month),
        Api.getMonthly(),
      ]);

      const change     = stats.prev_total > 0
        ? ((stats.current_total - stats.prev_total) / stats.prev_total * 100).toFixed(1)
        : null;
      const changeDir  = change !== null ? (change > 0 ? 'up' : 'down') : null;

      UI.setContent(`
        <div class="animate-fadeup">
          <div class="view-header">
            <h1 class="view-title">Analytics 📊</h1>
          </div>

          <!-- Month Navigator -->
          <div class="month-nav">
            <button class="month-nav-btn" id="an-prev-btn">‹</button>
            <div class="month-nav-label">${UI.formatMonth(AnalyticsView._month)}</div>
            <button class="month-nav-btn" id="an-next-btn">›</button>
          </div>

          <!-- Stat Cards -->
          <div class="stats-grid mb-lg">
            <div class="stat-card">
              <div class="stat-icon">💰</div>
              <div class="stat-value">${Store.fmt(stats.current_total)}</div>
              <div class="stat-label">Total Spent</div>
              ${changeDir ? `<div class="stat-delta ${changeDir}">${change > 0 ? '↑' : '↓'} ${Math.abs(change)}% vs last month</div>` : ''}
            </div>
            <div class="stat-card">
              <div class="stat-icon">📅</div>
              <div class="stat-value">${Store.fmt(stats.avg_weekly)}</div>
              <div class="stat-label">Avg Weekly</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🏆</div>
              <div class="stat-value" style="font-size:0.95rem;">${stats.top_category?.category || '—'}</div>
              <div class="stat-label">Top Category</div>
              ${stats.top_category ? `<div style="font-size:0.75rem;color:var(--text3);">${Store.fmt(stats.top_category.total)}</div>` : ''}
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-value">${Store.fmt(stats.monthly_limit - stats.current_total)}</div>
              <div class="stat-label">${stats.current_total <= stats.monthly_limit ? 'Remaining' : 'Over Budget'}</div>
            </div>
          </div>

          <!-- Monthly Bar Chart -->
          ${monthly.length ? `
          <div class="card mb-lg">
            <div class="section-header mb-md">
              <span class="section-title">📈 6-Month Trend</span>
            </div>
            <div class="chart-wrapper">
              <canvas id="monthly-chart" class="chart-canvas"></canvas>
            </div>
          </div>` : ''}

          <!-- Category Donut -->
          ${categories.length ? `
          <div class="card mb-lg">
            <div class="section-header mb-md">
              <span class="section-title">🍩 By Category</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--gap-lg);flex-wrap:wrap;justify-content:center;">
              <div style="position:relative;flex-shrink:0;">
                <canvas id="cat-donut" style="display:block;"></canvas>
              </div>
              <div class="chart-legend" id="cat-legend" style="flex:1;min-width:160px;flex-direction:column;display:flex;gap:8px;"></div>
            </div>
          </div>` : `
          <div class="card mb-lg" style="text-align:center;padding:var(--gap-xl);">
            <p style="color:var(--text3);">No spending data for this month yet.</p>
          </div>`}

          <div style="margin-bottom:100px;"></div>
        </div>
      `);

      // Draw monthly bar chart
      if (monthly.length) {
        setTimeout(() => {
          const canvas = document.getElementById('monthly-chart');
          if (canvas) {
            Charts.drawBar(canvas, monthly.map(m => ({
              label: m.month.slice(5),
              value: m.total || 0,
            })));
          }
        }, 50);
      }

      // Draw category donut
      if (categories.length) {
        setTimeout(() => {
          const canvas = document.getElementById('cat-donut');
          const legend = document.getElementById('cat-legend');
          if (canvas) {
            canvas.style.width  = '180px';
            canvas.style.height = '180px';
            canvas.width  = 180;
            canvas.height = 180;
            const total = categories.reduce((s, c) => s + c.total, 0);
            Charts.drawDonut(
              canvas,
              categories.map((c, i) => ({ label: c.category, value: c.total, color: Charts.COLORS[i] })),
              Store.fmt(total),
              'total'
            );
            if (legend) {
              Charts.renderLegend(legend, categories.map((c, i) => ({
                label: `${Store.getCategoryIcon(c.category)} ${c.category}`,
                value: c.total,
                color: Charts.COLORS[i],
              })));
            }
          }
        }, 50);
      }

      // Month navigation
      document.getElementById('an-prev-btn')?.addEventListener('click', () => {
        AnalyticsView._month = AnalyticsView._prevMonth(AnalyticsView._month);
        AnalyticsView.render();
      });
      document.getElementById('an-next-btn')?.addEventListener('click', () => {
        const next = AnalyticsView._nextMonth(AnalyticsView._month);
        if (next <= new Date().toISOString().slice(0, 7)) {
          AnalyticsView._month = next;
          AnalyticsView.render();
        }
      });

    } catch (err) {
      UI.setContent(`<div class="empty-state"><p>${err.message}</p></div>`);
    }
  },

  _prevMonth(yyyyMM) {
    const [y, m] = yyyyMM.split('-').map(Number);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${String(m - 1).padStart(2, '0')}`;
  },

  _nextMonth(yyyyMM) {
    const [y, m] = yyyyMM.split('-').map(Number);
    if (m === 12) return `${y + 1}-01`;
    return `${y}-${String(m + 1).padStart(2, '0')}`;
  },
};

window.AnalyticsView = AnalyticsView;
