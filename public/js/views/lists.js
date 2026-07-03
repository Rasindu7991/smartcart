/**
 * lists.js — Lists overview view
 */

const ListView = {
  async render() {
    UI.setHeaderActions(`
      <button class="btn btn-primary btn-sm" id="create-list-btn">+ New List</button>
    `);
    UI.showLoading();

    try {
      const lists = await Api.getLists();
      const active    = lists.filter(l => l.status === 'active');
      const completed = lists.filter(l => l.status === 'completed');

      UI.setContent(`
        <div class="animate-fadeup">
          <div class="view-header">
            <h1 class="view-title">My Lists 📋</h1>
            <p class="view-subtitle">${lists.length} list${lists.length !== 1 ? 's' : ''} total</p>
          </div>

          ${active.length ? `
          <div class="section-header">
            <span class="section-title">Active</span>
            <span class="badge badge-success">${active.length}</span>
          </div>
          <div class="list-cards mb-lg" id="active-cards">
            ${active.map(l => ListView._listCard(l)).join('')}
          </div>` : ''}

          ${!lists.length ? `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No lists yet</div>
            <p class="empty-state-text">Create your first grocery list to get started</p>
            <button class="btn btn-primary" id="empty-create-btn">+ Create List</button>
          </div>` : ''}

          ${completed.length ? `
          <div class="section-header" style="margin-top:var(--gap-lg);">
            <span class="section-title">Completed</span>
            <span class="badge badge-ghost">${completed.length}</span>
          </div>
          <div class="list-cards" id="completed-cards" style="margin-bottom:100px;">
            ${completed.map(l => ListView._listCard(l)).join('')}
          </div>` : '<div style="margin-bottom:100px;"></div>'}
        </div>
      `);

      UI.animateList('.list-card');
      ListView._wireEvents(lists);

    } catch (err) {
      UI.setContent(`<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${err.message}</p></div>`);
    }
  },

  _listCard(list) {
    const pct    = list.item_count > 0 ? (list.checked_count / list.item_count) * 100 : 0;
    const date   = UI.formatDate(list.created_at);
    const isComp = list.status === 'completed';
    return `
      <div class="list-card ${isComp ? 'completed' : ''}" data-list-id="${list.id}">
        <div class="list-card-header">
          <div>
            <div class="list-card-name">${UI.escape(list.name)}</div>
            <div style="margin-top:4px;display:flex;gap:6px;align-items:center;">
              <span class="badge badge-${list.type === 'weekly' ? 'cyan' : 'purple'}">${list.type}</span>
              ${isComp ? '<span class="badge badge-success">✓ done</span>' : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-icon btn-sm list-clone-btn" data-id="${list.id}" title="Clone list">📋</button>
            <button class="btn btn-ghost btn-icon btn-sm list-delete-btn" data-id="${list.id}" title="Delete list">🗑️</button>
          </div>
        </div>
        <div class="list-card-meta">
          <span>${list.item_count || 0} items · ${list.checked_count || 0} done</span>
          <span>${Store.fmt(list.estimated_total)} est.</span>
        </div>
        ${!isComp ? `
        <div class="progress-bar" style="margin-bottom:var(--gap-md);">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>` : ''}
        <div class="list-card-meta">
          <span style="color:var(--text3);">Created ${date}</span>
          ${list.actual_total ? `<span style="color:var(--success);font-weight:600;">Spent: ${Store.fmt(list.actual_total)}</span>` : ''}
        </div>
        ${!isComp ? `
        <div class="list-card-actions">
          <button class="btn btn-ghost btn-sm list-open-btn" data-id="${list.id}" style="flex:1;">✏️ Edit List</button>
          <button class="btn btn-accent btn-sm list-shop-btn" data-id="${list.id}" style="flex:1;">🛒 Shop</button>
        </div>` : `
        <div class="list-card-actions">
          <button class="btn btn-ghost btn-sm list-open-btn" data-id="${list.id}" style="flex:1;">👁 View</button>
        </div>`}
      </div>
    `;
  },

  _wireEvents(lists) {
    // Create list
    ['create-list-btn', 'empty-create-btn'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', ListView._openCreateModal);
    });

    // Open list detail
    document.querySelectorAll('.list-open-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        App.navigate('list-detail', { id: btn.dataset.id });
      });
    });

    // Shop
    document.querySelectorAll('.list-shop-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const list = lists.find(l => l.id === btn.dataset.id);
        if (list) {
          Store.setActiveList(list);
          App.navigate('shopping');
        }
      });
    });

    // Clone
    document.querySelectorAll('.list-clone-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        try {
          await Api.cloneList(btn.dataset.id);
          UI.toast('List cloned!', 'success');
          ListView.render();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      });
    });

    // Delete
    document.querySelectorAll('.list-delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const list = lists.find(l => l.id === btn.dataset.id);
        UI.confirm(`Delete "${list?.name}"? This cannot be undone.`, async () => {
          try {
            await Api.deleteList(btn.dataset.id);
            UI.toast('List deleted', 'info');
            ListView.render();
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });
      });
    });

    // Card click → list detail
    document.querySelectorAll('.list-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        App.navigate('list-detail', { id: card.dataset.listId });
      });
    });
  },

  _openCreateModal() {
    UI.showModal({
      title: '📋 New Grocery List',
      content: `
        <div class="form-group mb-md">
          <label class="form-label">List Name</label>
          <input type="text" id="new-list-name" class="form-input" placeholder="e.g. June Week 1" />
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select id="new-list-type" class="form-select">
            <option value="weekly">📅 Weekly</option>
            <option value="monthly">🗓️ Monthly</option>
          </select>
        </div>
      `,
      actions: [
        { id: 'cancel', label: 'Cancel', class: 'btn-ghost', onClick: () => {} },
        {
          id: 'create', label: '+ Create List', class: 'btn-primary', closeOnClick: false,
          onClick: async () => {
            const name = document.getElementById('new-list-name').value.trim();
            const type = document.getElementById('new-list-type').value;
            if (!name) { UI.toast('Please enter a list name', 'warning'); return; }
            try {
              await Api.createList({ name, type });
              UI.closeModal();
              UI.toast('List created!', 'success');
              ListView.render();
            } catch (err) {
              UI.toast(err.message, 'error');
            }
          }
        },
      ]
    });
    setTimeout(() => document.getElementById('new-list-name')?.focus(), 350);
  },
};

window.ListView = ListView;
