/**
 * shopping.js — In-store optimized shopping mode
 */

const ShoppingView = {
  _list: null,
  _items: [],
  _runningTotal: 0,
  _sessionPrices: {},

  async render() {
    const activeId = Store.get('activeList')?.id || Store.getActiveListId();
    if (!activeId) {
      UI.setContent(`
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <div class="empty-state-title">No active list</div>
          <p class="empty-state-text">Go to Lists and open a list to start shopping</p>
          <button class="btn btn-primary" onclick="App.navigate('lists')">Go to Lists</button>
        </div>`);
      return;
    }

    UI.showLoading();
    try {
      const list = await Api.getList(activeId);
      ShoppingView._list  = list;
      ShoppingView._items = Store.sortByCategory(list.items);
      ShoppingView._runningTotal = list.items
        .filter(i => i.checked && i.actual_price)
        .reduce((s, i) => s + i.actual_price * i.quantity, 0);

      ShoppingView._rerender();
    } catch (err) {
      UI.setContent(`<div class="empty-state"><p>${err.message}</p></div>`);
    }
  },

  _rerender() {
    const list   = ShoppingView._list;
    const items  = ShoppingView._items;
    const total  = items.length;
    const done   = items.filter(i => i.checked).length;
    const pct    = total > 0 ? (done / total) * 100 : 0;
    const unchecked = items.filter(i => !i.checked);
    const checked   = items.filter(i => i.checked);

    UI.setHeaderActions(`
      <button class="btn btn-ghost btn-sm" id="sh-back-btn">← Exit</button>
    `);

    UI.setContent(`
      <div style="padding-bottom:140px;">
        <!-- Shopping Header -->
        <div class="shopping-header" style="margin:-16px -16px var(--gap-lg);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div>
              <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:1rem;">${UI.escape(list.name)}</div>
              <div style="font-size:0.8rem;color:var(--text2);">Shopping Mode 🛒</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.1rem;font-weight:700;color:var(--cyan);">${done}/${total}</div>
              <div style="font-size:0.75rem;color:var(--text3);">items</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${pct > 85 ? 'success' : ''}" style="width:${pct.toFixed(0)}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text3);margin-top:4px;">
            <span>${(100 - pct).toFixed(0)}% remaining</span>
            <span>${pct.toFixed(0)}% done</span>
          </div>
        </div>

        <!-- Unchecked items (grouped by category) -->
        ${ShoppingView._renderCategoryGroups(unchecked)}

        <!-- Checked items (collapsed) -->
        ${checked.length ? `
        <div style="margin-top:var(--gap-lg);">
          <div class="category-group" style="color:var(--success);">
            <span>✅ Collected (${checked.length})</span>
          </div>
          ${checked.map(item => ShoppingView._itemRowChecked(item)).join('')}
        </div>` : ''}

        ${!unchecked.length && total > 0 ? `
        <div class="card glow-cyan" style="text-align:center;padding:var(--gap-xl);margin-top:var(--gap-lg);">
          <div style="font-size:3rem;margin-bottom:var(--gap-md);">🎉</div>
          <h2 style="margin-bottom:8px;">All done!</h2>
          <p style="color:var(--text2);margin-bottom:var(--gap-lg);">You've collected everything on your list.</p>
          <button class="btn btn-success btn-full" id="sh-finish-btn">✓ Finish Shopping</button>
        </div>` : ''}
      </div>

      <!-- Shopping Footer -->
      <div class="shopping-footer">
        <div>
          <div style="font-size:0.72rem;color:var(--text3);">Running Total</div>
          <div class="shopping-total">${Store.fmt(ShoppingView._runningTotal)}</div>
        </div>
        <div class="shopping-scan-btns">
          <button class="btn btn-ghost btn-sm" id="sh-barcode-btn" title="Scan Barcode">
            📊 Barcode
          </button>
          <button class="btn btn-primary btn-sm" id="sh-camera-btn" title="Photo Scan">
            📷 Scan
          </button>
        </div>
      </div>
    `);

    ShoppingView._wireEvents();
  },

  _renderCategoryGroups(items) {
    if (!items.length) return '';
    const grouped = {};
    for (const item of items) {
      const cat = item.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    return Object.entries(grouped).map(([cat, catItems]) => `
      <div class="category-group">
        <span>${Store.getCategoryIcon(cat)} ${cat}</span>
        <span style="color:var(--text3);font-size:0.72rem;">${catItems.length} left</span>
      </div>
      ${catItems.map(item => ShoppingView._itemRow(item)).join('')}
    `).join('');
  },

  _itemRow(item) {
    return `
      <div class="item-row" data-item-id="${item.id}" id="sh-item-${item.id}" style="cursor:pointer;">
        <div class="item-check"></div>
        <div class="item-info">
          <div class="item-name">${UI.escape(item.name)}</div>
          <div class="item-sub">${item.quantity} ${item.unit}</div>
        </div>
        <div style="text-align:right;">
          <div class="item-price">${item.estimated_price ? Store.fmt(item.estimated_price * item.quantity) : '—'}</div>
          <div style="font-size:0.7rem;color:var(--text3);">est.</div>
        </div>
      </div>
    `;
  },

  _itemRowChecked(item) {
    return `
      <div class="item-row checked" data-item-id="${item.id}" id="sh-item-${item.id}">
        <div class="item-check">✓</div>
        <div class="item-info">
          <div class="item-name">${UI.escape(item.name)}</div>
          <div class="item-sub">${item.quantity} ${item.unit}</div>
        </div>
        <div style="text-align:right;">
          <div class="item-price" style="color:var(--success);">${Store.fmt((item.actual_price || item.estimated_price) * item.quantity)}</div>
          <div style="font-size:0.7rem;color:var(--text3);">actual</div>
        </div>
      </div>
    `;
  },

  _wireEvents() {
    document.getElementById('sh-back-btn')?.addEventListener('click', () => App.navigate('lists'));

    // Item tap → price prompt → check off
    document.querySelectorAll('.item-row:not(.checked)').forEach(row => {
      row.addEventListener('click', () => {
        const item = ShoppingView._items.find(i => i.id === row.dataset.itemId);
        if (!item || item.checked) return;
        UI.promptPrice(item.name, item.estimated_price, async (price) => {
          try {
            await Api.updateItem(item.id, { checked: 1, actual_price: price });
            item.checked      = true;
            item.actual_price = price;
            ShoppingView._runningTotal += price * item.quantity;
            ShoppingView._rerender();
            UI.toast(`${item.name} ✓`, 'success');
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });
      });
    });

    // Camera scan
    document.getElementById('sh-camera-btn')?.addEventListener('click', () => {
      Camera.open(ShoppingView._list.id, ShoppingView._onCameraMatch);
    });

    // Barcode scan
    document.getElementById('sh-barcode-btn')?.addEventListener('click', () => {
      Barcode.open(ShoppingView._list.id, ShoppingView._onBarcodeFound);
    });

    // Finish shopping
    document.getElementById('sh-finish-btn')?.addEventListener('click', ShoppingView._finishShopping);
  },

  async _onCameraMatch(matchedItems) {
    const payload = Array.isArray(matchedItems) ? { items: matchedItems, actualPrice: null, useEstimate: true } : (matchedItems || {});
    const selectedItems = payload.items || [];
    if (!selectedItems.length) { UI.toast('No items matched', 'warning'); return; }

    for (const item of selectedItems) {
      const listItem = ShoppingView._items.find(i => i.id === item.id);
      if (listItem && !listItem.checked) {
        const finalPrice = payload.useEstimate
          ? (listItem.estimated_price || 0)
          : (Number.isFinite(payload.actualPrice) ? payload.actualPrice : (listItem.estimated_price || 0));

        await Api.updateItem(item.id, { checked: 1, actual_price: finalPrice });
        listItem.checked      = true;
        listItem.actual_price = finalPrice;
        ShoppingView._runningTotal += finalPrice * listItem.quantity;
      }
    }
    UI.toast(`${selectedItems.length} item(s) marked as collected`, 'success');
    ShoppingView._rerender();
  },

  async _onBarcodeFound(product) {
    // Find matching item in list
    const item = ShoppingView._items.find(i =>
      i.barcode === product.barcode ||
      (product.product_name && i.name.toLowerCase().includes(product.product_name.toLowerCase().slice(0, 5)))
    );

    if (item && !item.checked) {
      UI.promptPrice(item.name, item.estimated_price, async (price) => {
        await Api.updateItem(item.id, { checked: 1, actual_price: price, barcode: product.barcode });
        item.checked      = true;
        item.actual_price = price;
        ShoppingView._runningTotal += price * item.quantity;
        ShoppingView._rerender();
        UI.toast(`${item.name} ✓`, 'success');
      });
    } else if (product.product_name) {
      UI.toast(`"${product.product_name}" not in list — add it via List Detail`, 'info');
    }
  },

  async _finishShopping() {
    try {
      const total = ShoppingView._runningTotal;
      await Api.savePurchase({ list_id: ShoppingView._list.id, total_spent: total });
      UI.toast(`Shopping complete! Total: ${Store.fmt(total)}`, 'success');
      Store.setActiveList(null);
      App.navigate('dashboard');
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },
};

window.ShoppingView = ShoppingView;
