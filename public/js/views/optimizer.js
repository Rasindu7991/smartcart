/**
 * optimizer.js — Budget optimizer & AI recommendations view
 */

const OptimizerView = {
  async render() {
    UI.setHeaderActions('');
    UI.showLoading();

    try {
      const [recs, budget] = await Promise.all([
        Api.getRecommendations(),
        Api.getBudget(),
      ]);

      const settings = budget.settings;
      const pct      = recs.predicted_total > 0
        ? Math.min((recs.predicted_total / (settings.monthly_limit || 300)) * 100, 120)
        : 0;
      const isOver   = pct > 100;

      UI.setContent(`
        <div class="animate-fadeup">
          <div class="view-header">
            <h1 class="view-title">Optimizer 💡</h1>
            <p class="view-subtitle">AI-powered budget recommendations</p>
          </div>

          <!-- Prediction Card -->
          <div class="card card-gradient mb-lg" style="padding:var(--gap-xl);text-align:center;">
            <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text3);margin-bottom:var(--gap-sm);">
              Predicted Next Month
            </div>
            <div style="font-family:'Outfit',sans-serif;font-size:2.2rem;font-weight:800;
              color:${isOver ? 'var(--danger)' : 'var(--success)'};">
              ${Store.fmt(recs.predicted_total)}
            </div>
            <div style="font-size:0.85rem;color:var(--text2);margin:8px 0;">
              Budget: ${Store.fmt(settings.monthly_limit)}
            </div>

            <!-- Prediction ring bar -->
            <div style="background:var(--glass-md);border-radius:var(--r-full);height:10px;margin:var(--gap-md) 0;overflow:hidden;">
              <div style="height:100%;border-radius:var(--r-full);width:${Math.min(pct, 100)}%;
                background:${isOver ? 'var(--grad-danger)' : 'var(--grad-success)'};
                transition:width 0.8s cubic-bezier(0.4,0,0.2,1);"></div>
            </div>

            <div style="font-size:0.82rem;color:${isOver ? 'var(--danger)' : 'var(--success)'};">
              ${isOver
                ? `⚠️ ${(pct - 100).toFixed(0)}% over budget — action recommended`
                : `✅ ${(100 - pct).toFixed(0)}% under budget — great job!`}
            </div>
          </div>

          <!-- Monthly Budget Input -->
          <div class="card mb-lg">
            <div class="section-title mb-md">🎯 Monthly Budget</div>
            <div style="display:flex;gap:var(--gap-sm);align-items:center;">
              <input type="number" id="budget-limit-input" class="form-input" style="flex:1;"
                value="${settings.monthly_limit}" min="1" step="10" placeholder="Monthly limit" />
              <button class="btn btn-primary" id="save-budget-btn">Save</button>
            </div>
          </div>

          <!-- Recommendations -->
          <div class="section-header mb-md">
            <span class="section-title">📋 Recommendations</span>
            <span class="badge badge-purple">${recs.recommendations.length}</span>
          </div>

          ${recs.recommendations.length ? recs.recommendations.map(r => `
            <div class="recommendation-card ${r.type === 'overspend' ? 'overspend' : r.type === 'budget_alert' ? 'alert' : 'saving'}">
              <div class="rec-icon">${r.icon || (r.type === 'overspend' ? '⚠️' : r.type === 'saving' ? '✅' : '💡')}</div>
              <div class="rec-content">
                <div class="rec-message">${UI.escape(r.message)}</div>
                <div class="rec-suggestion">${UI.escape(r.suggestion)}</div>
                ${r.avg_monthly ? `
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                  <span class="badge badge-${r.type === 'overspend' ? 'danger' : 'success'}">
                    Avg: ${Store.fmt(r.avg_monthly)}
                  </span>
                  <span class="badge badge-ghost">Limit: ${Store.fmt(r.limit)}</span>
                </div>` : ''}
              </div>
            </div>
          `).join('') : `
          <div class="empty-state" style="padding:var(--gap-xl) 0;">
            <div class="empty-state-icon">🎉</div>
            <div class="empty-state-title">All good!</div>
            <p class="empty-state-text">Start shopping to get personalized recommendations based on your spending history.</p>
          </div>`}

          <!-- Category Budgets -->
          <div class="section-header mt-lg mb-md">
            <span class="section-title">📂 Category Limits</span>
          </div>
          <div class="card mb-lg">
            ${budget.categories.map(cat => `
              <div class="settings-row">
                <div>
                  <div class="settings-row-label">${Store.getCategoryIcon(cat.category)} ${cat.category}</div>
                </div>
                <div style="display:flex;align-items:center;gap:var(--gap-sm);">
                  <input type="number" class="form-input cat-budget-input" data-cat="${cat.category}"
                    value="${cat.monthly_limit}" min="0" step="5"
                    style="width:90px;text-align:right;padding:8px 12px;" />
                </div>
              </div>
            `).join('')}
            <div style="padding:var(--gap-md) var(--gap-lg);">
              <button class="btn btn-primary btn-full" id="save-cat-budgets-btn">Save Category Budgets</button>
            </div>
          </div>

          <div style="margin-bottom:100px;"></div>
        </div>
      `);

      // Save monthly limit
      document.getElementById('save-budget-btn')?.addEventListener('click', async () => {
        const val = parseFloat(document.getElementById('budget-limit-input').value);
        if (isNaN(val) || val <= 0) { UI.toast('Enter a valid budget', 'warning'); return; }
        try {
          await Api.updateBudget({ monthly_limit: val });
          UI.toast('Budget saved!', 'success');
          OptimizerView.render();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      });

      // Save category budgets
      document.getElementById('save-cat-budgets-btn')?.addEventListener('click', async () => {
        const cats = [...document.querySelectorAll('.cat-budget-input')].map(inp => ({
          category:      inp.dataset.cat,
          monthly_limit: parseFloat(inp.value) || 0,
          icon:          Store.getCategoryIcon(inp.dataset.cat),
        }));
        try {
          await Api.updateBudget({ categories: cats });
          UI.toast('Category budgets saved!', 'success');
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      });

    } catch (err) {
      UI.setContent(`<div class="empty-state"><p>${err.message}</p></div>`);
    }
  },
};

window.OptimizerView = OptimizerView;
