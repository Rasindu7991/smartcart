/**
 * listDetail.js — Single list view with item management
 */

const ListDetailView = {
  _listId: null,

  async render(params = {}) {
    ListDetailView._listId = params.id;
    UI.showLoading();

    try {
      const list = await Api.getList(params.id);
      Store.setActiveList(list);

      const grouped  = ListDetailView._groupByCategory(list.items);
      const estTotal = list.items.reduce((s, i) => s + (i.estimated_price * i.quantity), 0);
      const checked  = list.items.filter(i => i.checked).length;

      UI.setHeaderActions(`
        <button class="btn btn-ghost btn-sm" id="ld-back-btn">← Back</button>
      `);

      UI.setContent(`
        <div class="animate-fadeup">
          <!-- Header -->
          <div style="margin-bottom:var(--gap-lg);">
            <div style="display:flex;align-items:center;gap:var(--gap-sm);margin-bottom:8px;">
              <h1 style="font-size:1.4rem;font-weight:800;font-family:'Outfit',sans-serif;">${UI.escape(list.name)}</h1>
              <span class="badge badge-${list.type === 'weekly' ? 'cyan' : 'purple'}">${list.type}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text2);margin-bottom:var(--gap-md);">
              <span>${list.items.length} items · ${checked} done</span>
              <span>Est. ${Store.fmt(estTotal)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${list.items.length ? (checked/list.items.length*100) : 0}%"></div>
            </div>
          </div>

          <!-- Shop button -->
          ${list.status === 'active' ? `
          <button class="btn btn-accent btn-full mb-lg" id="ld-shop-btn">
            🛒 Start Shopping Mode
          </button>` : `<div class="badge badge-success" style="margin-bottom:var(--gap-lg);">✓ Completed</div>`}

          <!-- Add Item Form -->
          <div class="card mb-lg" id="add-item-card">
            <div class="section-header" style="cursor:pointer;" id="add-item-toggle">
              <span class="section-title">+ Add Item</span>
              <span style="color:var(--text3);font-size:1.2rem;" id="add-toggle-icon">▼</span>
            </div>
            <div id="add-item-form-wrap">
              <form id="add-item-form" style="display:flex;flex-direction:column;gap:var(--gap-md);margin-top:var(--gap-md);">
                <div class="form-group">
                  <input type="text" id="item-name" class="form-input" placeholder="Item name *" required />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <select id="item-category" class="form-select">
                      ${Store.CATEGORY_ORDER.map(c => `<option value="${c}">${Store.getCategoryIcon(c)} ${c}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group">
                    <input type="number" id="item-price" class="form-input" placeholder="Est. price" step="0.01" min="0" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <input type="number" id="item-qty" class="form-input" placeholder="Qty" value="1" min="0.1" step="0.1" />
                  </div>
                  <div class="form-group">
                    <select id="item-unit" class="form-select">
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="pack">pack</option>
                      <option value="dozen">dozen</option>
                    </select>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary">+ Add Item</button>
              </form>
            </div>
          </div>

          <!-- Items List -->
          <div id="items-container">
            ${ListDetailView._renderItems(grouped)}
          </div>
          <div style="margin-bottom:100px;"></div>
        </div>
      `);

      ListDetailView._wireEvents(list);

    } catch (err) {
      UI.setContent(`<div class="empty-state"><p>${err.message}</p></div>`);
    }
  },

  _groupByCategory(items) {
    const sorted = Store.sortByCategory(items);
    const groups = {};
    for (const item of sorted) {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  },

  _renderItems(grouped) {
    const cats = Object.keys(grouped);
    if (!cats.length) {
      return `
        <div class="empty-state" style="padding:var(--gap-xl) 0;">
          <div class="empty-state-icon">🛒</div>
          <div class="empty-state-title">List is empty</div>
          <p class="empty-state-text">Add items using the form above</p>
        </div>`;
    }

    return cats.map(cat => `
      <div class="category-group">
        <span>${Store.getCategoryIcon(cat)} ${cat}</span>
      </div>
      ${grouped[cat].map(item => ListDetailView._itemRow(item)).join('')}
    `).join('');
  },

  _itemRow(item) {
    return `
      <div class="item-row ${item.checked ? 'checked' : ''}" data-item-id="${item.id}">
        <div class="item-check">${item.checked ? '✓' : ''}</div>
        <div class="item-info">
          <div class="item-name">${UI.escape(item.name)}</div>
          <div class="item-sub">${item.quantity} ${item.unit} · ${Store.getCategoryIcon(item.category)} ${item.category}</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--gap-sm);">
          <div class="item-price">${item.estimated_price ? Store.fmt(item.estimated_price * item.quantity) : '—'}</div>
          <button class="btn btn-ghost btn-icon btn-sm item-delete-btn" data-id="${item.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  },

  _wireEvents(list) {
    // Back button
    document.getElementById('ld-back-btn')?.addEventListener('click', () => App.navigate('lists'));

    // Shop button
    document.getElementById('ld-shop-btn')?.addEventListener('click', () => {
      App.navigate('shopping');
    });

    // Toggle add form
    document.getElementById('add-item-toggle')?.addEventListener('click', () => {
      const wrap = document.getElementById('add-item-form-wrap');
      const icon = document.getElementById('add-toggle-icon');
      const open = wrap.style.display !== 'none';
      wrap.style.display = open ? 'none' : 'block';
      icon.textContent   = open ? '▶' : '▼';
    });

    // Add item form
    document.getElementById('add-item-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const name  = document.getElementById('item-name').value.trim();
      const cat   = document.getElementById('item-category').value;
      const price = parseFloat(document.getElementById('item-price').value) || 0;
      const qty   = parseFloat(document.getElementById('item-qty').value)   || 1;
      const unit  = document.getElementById('item-unit').value;

      if (!name) return;
      try {
        await Api.addItem(list.id, { name, category: cat, estimated_price: price, quantity: qty, unit });
        document.getElementById('item-name').value  = '';
        document.getElementById('item-price').value = '';
        document.getElementById('item-qty').value   = '1';
        UI.toast(`${name} added`, 'success');
        // Refresh items section
        const updated = await Api.getList(list.id);
        document.getElementById('items-container').innerHTML =
          ListDetailView._renderItems(ListDetailView._groupByCategory(updated.items));
        ListDetailView._wireItemEvents(updated.items);
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });

    ListDetailView._wireItemEvents(list.items);
  },

  _wireItemEvents(items) {
    // Toggle check
    document.querySelectorAll('.item-row').forEach(row => {
      row.addEventListener('click', async e => {
        if (e.target.closest('.item-delete-btn')) return;
        const id   = row.dataset.itemId;
        const item = items.find(i => i.id === id);
        if (!item) return;
        try {
          await Api.updateItem(id, { checked: item.checked ? 0 : 1 });
          row.classList.toggle('checked');
          row.querySelector('.item-check').textContent = item.checked ? '' : '✓';
          item.checked = !item.checked;
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      });
    });

    // Delete item
    document.querySelectorAll('.item-delete-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        try {
          await Api.deleteItem(btn.dataset.id);
          btn.closest('.item-row').remove();
          UI.toast('Item removed', 'info');
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      });
    });
  },
};

window.ListDetailView = ListDetailView;
