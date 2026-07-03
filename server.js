const express = require('express');
const path    = require('path');
const cors    = require('cors');
const fetch   = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const db      = require('./database');
const { analyzeImage, matchLabelsToItems } = require('./vision');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════════════════════════════════════════
// LISTS
// ══════════════════════════════════════════════════════════════════════════════

// GET all lists (with item counts + totals)
app.get('/api/lists', (req, res) => {
  try {
    const lists = db.getLists();
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create list
app.post('/api/lists', (req, res) => {
  try {
    const { name, type = 'weekly' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = uuidv4();
    const list = db.createList(id, name.trim(), type);
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single list with items
app.get('/api/lists/:id', (req, res) => {
  try {
    const list = db.getListWithItems(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update list
app.put('/api/lists/:id', (req, res) => {
  try {
    const { name, type, status } = req.body;
    const list = db.getListOnly(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;

    const updated = db.updateList(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE list
app.delete('/api/lists/:id', (req, res) => {
  try {
    db.deleteList(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST clone a list
app.post('/api/lists/:id/clone', (req, res) => {
  try {
    const source = db.getListWithItems(req.params.id);
    if (!source) return res.status(404).json({ error: 'List not found' });

    const newId = uuidv4();
    const newName = req.body.name || `${source.name} (Copy)`;
    db.createList(newId, newName, source.type);

    for (const item of source.items) {
      db.addItem(
        uuidv4(),
        newId,
        item.name,
        item.category,
        item.quantity,
        item.unit,
        item.estimated_price,
        item.barcode,
        item.notes
      );
    }

    const cloned = db.getListWithItems(newId);
    res.status(201).json(cloned);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ITEMS
// ══════════════════════════════════════════════════════════════════════════════

// POST add item to list
app.post('/api/lists/:id/items', (req, res) => {
  try {
    const list = db.getListOnly(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const { name, category = 'Other', quantity = 1, unit = 'pcs', estimated_price = 0, barcode = null, notes = null } = req.body;
    if (!name) return res.status(400).json({ error: 'Item name is required' });

    const id = uuidv4();
    const item = db.addItem(id, req.params.id, name, category, quantity, unit, estimated_price, barcode, notes);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update item (check off, price, etc.)
app.put('/api/items/:id', (req, res) => {
  try {
    const item = db.getItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const allowed = ['name', 'category', 'quantity', 'unit', 'estimated_price', 'actual_price', 'checked', 'barcode', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updated = db.updateItem(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  try {
    db.deleteItem(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk-check items
app.post('/api/items/batch-check', (req, res) => {
  try {
    const { ids, checked, actual_price } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

    db.batchCheck(ids, checked, actual_price);
    res.json({ ok: true, updated: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PURCHASES
// ══════════════════════════════════════════════════════════════════════════════

// POST save a completed shopping session
app.post('/api/purchases', (req, res) => {
  try {
    const { list_id, total_spent, store_name, notes } = req.body;
    const id = uuidv4();
    const purchase = db.createPurchase(id, list_id, total_spent, store_name, notes);
    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all purchases
app.get('/api/purchases', (req, res) => {
  try {
    const purchases = db.getPurchases();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

// GET monthly spend totals (last 6 months)
app.get('/api/analytics/monthly', (req, res) => {
  try {
    const monthly = db.getMonthlyAnalytics();
    res.json(monthly.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET spend by category (current month or ?month=YYYY-MM)
app.get('/api/analytics/categories', (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const categories = db.getCategoryAnalytics(month);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET overall stats
app.get('/api/analytics/stats', (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const prevMonth = getPrevMonth(month);
    const stats = db.getStats(month, prevMonth);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET OPTIMIZER
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/optimizer/recommendations', (req, res) => {
  try {
    const budget = db.getBudget();
    const settings = budget.settings;
    const catBudgets = budget.categories;
    const avgByCategory = db.getAvgByCategory();

    const catBudgetMap = Object.fromEntries(catBudgets.map(c => [c.category, c]));
    const recommendations = [];
    let predictedTotal = 0;

    for (const row of avgByCategory) {
      const limit = catBudgetMap[row.category]?.monthly_limit || 50;
      predictedTotal += row.avg_monthly;

      if (row.avg_monthly > limit) {
        const overspend = ((row.avg_monthly - limit) / limit * 100).toFixed(0);
        recommendations.push({
          type: 'overspend',
          category: row.category,
          icon: catBudgetMap[row.category]?.icon || '🛒',
          avg_monthly: row.avg_monthly,
          limit,
          message: `You average $${row.avg_monthly} on ${row.category} but your limit is $${limit} (+${overspend}% over)`,
          suggestion: `Try to reduce ${row.category} spending by $${(row.avg_monthly - limit).toFixed(2)} next month`,
        });
      } else if (row.avg_monthly < limit * 0.5) {
        const saved = (limit - row.avg_monthly).toFixed(2);
        recommendations.push({
          type: 'saving',
          category: row.category,
          icon: catBudgetMap[row.category]?.icon || '✅',
          avg_monthly: row.avg_monthly,
          limit,
          message: `Great! You're saving $${saved}/month on ${row.category}`,
          suggestion: `You could reallocate $${saved} to other categories`,
        });
      }
    }

    const totalLimit = settings?.monthly_limit || 300;
    if (predictedTotal > totalLimit) {
      recommendations.unshift({
        type: 'budget_alert',
        icon: '⚠️',
        message: `Your predicted spend of $${predictedTotal.toFixed(2)} exceeds your $${totalLimit} monthly budget`,
        suggestion: `Consider reducing Snacks and Beverages spending to stay within budget`,
        predicted: predictedTotal.toFixed(2),
        limit: totalLimit,
      });
    }

    res.json({ recommendations, predicted_total: predictedTotal.toFixed(2), monthly_limit: totalLimit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE CLOUD VISION (PROXY)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/vision/analyze', async (req, res) => {
  try {
    const { image, list_id } = req.body;
    if (!image) return res.status(400).json({ error: 'Image data is required' });

    const budget = db.getBudget();
    const apiKey = budget.settings?.google_vision_api_key || '';

    const { labels, demo } = await analyzeImage(image, apiKey);

    let matches = [];
    if (list_id) {
      const items = db.getUncheckedItems(list_id);
      matches = matchLabelsToItems(labels, items);
    }

    res.json({ labels, matches, demo });
  } catch (err) {
    console.error('Vision error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BARCODE LOOKUP
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/products/barcode/:code', async (req, res) => {
  const { code } = req.params;

  try {
    // Check local cache first
    const cached = db.getBarcodeCache(code);
    if (cached) return res.json({ ...cached, source: 'cache' });

    // Fetch from Open Food Facts
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, {
      headers: { 'User-Agent': 'SmartCart/1.0' },
      timeout: 5000,
    });
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const product = data.product;
      const name     = product.product_name || product.product_name_en || 'Unknown Product';
      const brand    = product.brands || '';
      const category = mapOpenFoodCategory(product.categories || '');

      db.setBarcodeCache(code, name, brand, category);

      return res.json({ barcode: code, product_name: name, brand, category, source: 'openfoodfacts' });
    }
    res.json({ barcode: code, product_name: null, source: 'not_found' });
  } catch (err) {
    console.error('Barcode lookup error:', err.message);
    res.json({ barcode: code, product_name: null, source: 'error', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/budget', (req, res) => {
  try {
    res.json(db.getBudget());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/budget', (req, res) => {
  try {
    const updated = db.updateBudget(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catch-all: serve index.html for client-side routing ──────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPrevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function mapOpenFoodCategory(rawCategory) {
  const lower = rawCategory.toLowerCase();
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('cheese'))  return 'Dairy';
  if (lower.includes('meat') || lower.includes('poultry') || lower.includes('beef'))   return 'Meat';
  if (lower.includes('vegetable') || lower.includes('fruit') || lower.includes('produce')) return 'Produce';
  if (lower.includes('bread') || lower.includes('bakery'))                              return 'Bakery';
  if (lower.includes('frozen'))                                                          return 'Frozen';
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('juice')) return 'Beverages';
  if (lower.includes('snack') || lower.includes('chip') || lower.includes('biscuit'))  return 'Snacks';
  return 'Pantry';
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🛒 SmartCart running at http://localhost:${PORT}\n`);
});
