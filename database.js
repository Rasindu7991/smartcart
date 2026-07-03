const fs = require('fs');
const path = require('path');

const DB_DIR = process.env.DB_DIR || __dirname;
const DB_FILE = path.join(DB_DIR, 'smartcart_db.json');

// Default initial state
const defaultState = {
  lists: [],
  items: [],
  purchases: [],
  budget_settings: {
    monthly_limit: 300,
    currency: 'LKR',
    google_vision_api_key: ''
  },
  category_budgets: [
    { category: 'Produce',      monthly_limit: 60,  icon: '🥦' },
    { category: 'Dairy',        monthly_limit: 40,  icon: '🥛' },
    { category: 'Meat',         monthly_limit: 70,  icon: '🥩' },
    { category: 'Bakery',       monthly_limit: 25,  icon: '🍞' },
    { category: 'Frozen',       monthly_limit: 30,  icon: '❄️' },
    { category: 'Pantry',       monthly_limit: 50,  icon: '🥫' },
    { category: 'Beverages',    monthly_limit: 30,  icon: '🧃' },
    { category: 'Snacks',       monthly_limit: 20,  icon: '🍿' },
    { category: 'Personal Care',monthly_limit: 25,  icon: '🧴' },
    { category: 'Cleaning',     monthly_limit: 20,  icon: '🧹' },
    { category: 'Other',        monthly_limit: 30,  icon: '🛒' },
  ],
  barcode_cache: {}
};

let data = { ...defaultState };

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      data = JSON.parse(raw);
      // Ensure all root keys exist
      for (const key of Object.keys(defaultState)) {
        if (data[key] === undefined) {
          data[key] = JSON.parse(JSON.stringify(defaultState[key]));
        }
      }
    } else {
      data = JSON.parse(JSON.stringify(defaultState));
      save();
    }
  } catch (err) {
    console.error('Error loading database file:', err);
    data = JSON.parse(JSON.stringify(defaultState));
  }
}

function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

// Load data immediately
load();

// Helper to get week number
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const db = {
  // ── Lists ───────────────────────────────────────────────────────────────────
  getLists() {
    return data.lists.map(l => {
      const items = data.items.filter(i => i.list_id === l.id);
      const item_count = items.length;
      const checked_count = items.filter(i => i.checked === 1).length;
      const estimated_total = items.reduce((sum, i) => sum + (i.estimated_price || 0) * (i.quantity || 0), 0);
      const actual_total = items.reduce((sum, i) => {
        if (i.checked === 1) {
          const price = i.actual_price !== null && i.actual_price !== undefined ? i.actual_price : (i.estimated_price || 0);
          return sum + price * (i.quantity || 0);
        }
        return sum;
      }, 0);
      return {
        ...l,
        item_count,
        checked_count,
        estimated_total,
        actual_total
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  createList(id, name, type) {
    const list = {
      id,
      name,
      type: type || 'weekly',
      status: 'active',
      created_at: new Date().toISOString(),
      completed_at: null
    };
    data.lists.push(list);
    save();
    return list;
  },

  getListOnly(id) {
    return data.lists.find(l => l.id === id) || null;
  },

  getListWithItems(id) {
    const list = data.lists.find(l => l.id === id);
    if (!list) return null;
    const items = data.items
      .filter(i => i.list_id === id)
      .sort((a, b) => {
        const catComp = (a.category || '').localeCompare(b.category || '');
        if (catComp !== 0) return catComp;
        return (a.name || '').localeCompare(b.name || '');
      });
    return { ...list, items };
  },

  updateList(id, updates) {
    const list = data.lists.find(l => l.id === id);
    if (!list) return null;
    if (updates.name !== undefined) list.name = updates.name.trim();
    if (updates.type !== undefined) list.type = updates.type;
    if (updates.status !== undefined) {
      list.status = updates.status;
      if (updates.status === 'completed') {
        list.completed_at = new Date().toISOString();
      }
    }
    save();
    return list;
  },

  deleteList(id) {
    data.lists = data.lists.filter(l => l.id !== id);
    data.items = data.items.filter(i => i.list_id !== id);
    save();
  },

  // ── Items ──────────────────────────────────────────────────────────────────
  addItem(id, list_id, name, category, quantity, unit, estimated_price, barcode, notes) {
    const item = {
      id,
      list_id,
      name,
      category: category || 'Other',
      quantity: quantity !== undefined ? parseFloat(quantity) : 1,
      unit: unit || 'pcs',
      estimated_price: estimated_price !== undefined ? parseFloat(estimated_price) : 0,
      actual_price: null,
      checked: 0,
      checked_at: null,
      barcode: barcode || null,
      notes: notes || null
    };
    data.items.push(item);
    save();
    return item;
  },

  getItem(id) {
    return data.items.find(i => i.id === id) || null;
  },

  updateItem(id, updates) {
    const item = data.items.find(i => i.id === id);
    if (!item) return null;
    const allowed = ['name', 'category', 'quantity', 'unit', 'estimated_price', 'actual_price', 'checked', 'barcode', 'notes'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        if (key === 'quantity' || key === 'estimated_price' || key === 'actual_price') {
          item[key] = updates[key] !== null ? parseFloat(updates[key]) : null;
        } else {
          item[key] = updates[key];
        }
      }
    }
    if (updates.checked === 1) {
      if (!item.checked_at) {
        item.checked_at = new Date().toISOString();
      }
    } else if (updates.checked === 0) {
      item.checked_at = null;
      item.actual_price = null;
    }
    save();
    return item;
  },

  deleteItem(id) {
    data.items = data.items.filter(i => i.id !== id);
    save();
  },

  batchCheck(ids, checked, actual_price) {
    const now = checked ? new Date().toISOString() : null;
    for (const id of ids) {
      const item = data.items.find(i => i.id === id);
      if (item) {
        item.checked = checked ? 1 : 0;
        item.checked_at = now;
        item.actual_price = actual_price !== undefined && actual_price !== null ? parseFloat(actual_price) : null;
      }
    }
    save();
  },

  // ── Purchases ──────────────────────────────────────────────────────────────
  createPurchase(id, list_id, total_spent, store_name, notes) {
    const purchase = {
      id,
      list_id: list_id || null,
      date: new Date().toISOString(),
      total_spent: total_spent !== undefined ? parseFloat(total_spent) : 0,
      store_name: store_name || null,
      notes: notes || null
    };
    data.purchases.push(purchase);
    if (list_id) {
      const list = data.lists.find(l => l.id === list_id);
      if (list) {
        list.status = 'completed';
        list.completed_at = new Date().toISOString();
      }
    }
    save();
    return purchase;
  },

  getPurchases() {
    return [...data.purchases]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  getMonthlyAnalytics() {
    const monthlyData = {};
    data.items.forEach(i => {
      if (i.checked === 1 && i.actual_price !== null && i.checked_at) {
        const month = i.checked_at.slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { month, total: 0, items_bought: 0 };
        }
        monthlyData[month].total += (i.actual_price || 0) * (i.quantity || 0);
        monthlyData[month].items_bought += 1;
      }
    });
    Object.keys(monthlyData).forEach(m => {
      monthlyData[m].total = Math.round(monthlyData[m].total * 100) / 100;
    });
    return Object.values(monthlyData)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);
  },

  getCategoryAnalytics(month) {
    const categories = {};
    data.items.forEach(i => {
      if (i.checked === 1 && i.actual_price !== null && i.checked_at && i.checked_at.slice(0, 7) === month) {
        const cat = i.category || 'Other';
        if (!categories[cat]) {
          categories[cat] = { category: cat, total: 0, items_bought: 0 };
        }
        categories[cat].total += (i.actual_price || 0) * (i.quantity || 0);
        categories[cat].items_bought += 1;
      }
    });
    Object.keys(categories).forEach(c => {
      categories[c].total = Math.round(categories[c].total * 100) / 100;
    });
    return Object.values(categories).sort((a, b) => b.total - a.total);
  },

  getStats(month, prevMonth) {
    let current_total = 0;
    data.items.forEach(i => {
      if (i.checked === 1 && i.actual_price !== null && i.checked_at && i.checked_at.slice(0, 7) === month) {
        current_total += (i.actual_price || 0) * (i.quantity || 0);
      }
    });
    current_total = Math.round(current_total * 100) / 100;

    let prev_total = 0;
    data.items.forEach(i => {
      if (i.checked === 1 && i.actual_price !== null && i.checked_at && i.checked_at.slice(0, 7) === prevMonth) {
        prev_total += (i.actual_price || 0) * (i.quantity || 0);
      }
    });
    prev_total = Math.round(prev_total * 100) / 100;

    const weeklyTotals = {};
    data.items.forEach(i => {
      if (i.checked === 1 && i.actual_price !== null && i.checked_at) {
        const d = new Date(i.checked_at);
        const week = getWeekNumber(d);
        const key = `${d.getFullYear()}-${week}`;
        if (!weeklyTotals[key]) weeklyTotals[key] = 0;
        weeklyTotals[key] += (i.actual_price || 0) * (i.quantity || 0);
      }
    });
    const weekVals = Object.values(weeklyTotals);
    const last8Weeks = weekVals.slice(-8);
    const avg_weekly = last8Weeks.length
      ? Math.round((last8Weeks.reduce((sum, val) => sum + val, 0) / last8Weeks.length) * 100) / 100
      : 0;

    const catTotals = {};
    data.items.forEach(i => {
      if (i.checked === 1 && i.actual_price !== null && i.checked_at && i.checked_at.slice(0, 7) === month) {
        const cat = i.category || 'Other';
        if (!catTotals[cat]) catTotals[cat] = 0;
        catTotals[cat] += (i.actual_price || 0) * (i.quantity || 0);
      }
    });
    let topCategory = null;
    let maxCatTotal = -1;
    Object.keys(catTotals).forEach(cat => {
      if (catTotals[cat] > maxCatTotal) {
        maxCatTotal = catTotals[cat];
        topCategory = { category: cat, total: Math.round(catTotals[cat] * 100) / 100 };
      }
    });

    return {
      month,
      current_total,
      prev_total,
      avg_weekly,
      top_category: topCategory,
      monthly_limit: data.budget_settings.monthly_limit,
      currency: data.budget_settings.currency
    };
  },

  // ── Optimizer ──────────────────────────────────────────────────────────────
  getAvgByCategory() {
    const monthlyCatTotals = {};
    data.items.forEach(i => {
      if (i.checked === 1 && i.actual_price !== null && i.checked_at) {
        const cat = i.category || 'Other';
        const m = i.checked_at.slice(0, 7);
        if (!monthlyCatTotals[cat]) monthlyCatTotals[cat] = {};
        if (!monthlyCatTotals[cat][m]) monthlyCatTotals[cat][m] = 0;
        monthlyCatTotals[cat][m] += (i.actual_price || 0) * (i.quantity || 0);
      }
    });
    const avgByCategory = [];
    Object.keys(monthlyCatTotals).forEach(cat => {
      const months = Object.values(monthlyCatTotals[cat]);
      const sum = months.reduce((s, val) => s + val, 0);
      const avg_monthly = months.length ? Math.round((sum / months.length) * 100) / 100 : 0;
      const max_monthly = months.length ? Math.round(Math.max(...months) * 100) / 100 : 0;
      avgByCategory.push({ category: cat, avg_monthly, max_monthly });
    });
    return avgByCategory;
  },

  // ── Budget & Settings ──────────────────────────────────────────────────────
  getBudget() {
    return {
      settings: data.budget_settings,
      categories: data.category_budgets
    };
  },

  updateBudget(updates) {
    if (updates.monthly_limit !== undefined) data.budget_settings.monthly_limit = parseFloat(updates.monthly_limit);
    if (updates.currency !== undefined) data.budget_settings.currency = updates.currency;
    if (updates.google_vision_api_key !== undefined) data.budget_settings.google_vision_api_key = updates.google_vision_api_key;

    if (Array.isArray(updates.categories)) {
      updates.categories.forEach(cat => {
        const match = data.category_budgets.find(c => c.category === cat.category);
        if (match) {
          match.monthly_limit = parseFloat(cat.monthly_limit);
          if (cat.icon) match.icon = cat.icon;
        } else {
          data.category_budgets.push({
            category: cat.category,
            monthly_limit: parseFloat(cat.monthly_limit),
            icon: cat.icon || '🛒'
          });
        }
      });
    }
    save();
    return this.getBudget();
  },

  // ── Barcode Cache ──────────────────────────────────────────────────────────
  getBarcodeCache(code) {
    return data.barcode_cache[code] || null;
  },

  setBarcodeCache(code, product_name, brand, category) {
    data.barcode_cache[code] = {
      barcode: code,
      product_name,
      brand,
      category,
      cached_at: new Date().toISOString()
    };
    save();
  },

  getUncheckedItems(list_id) {
    return data.items.filter(i => i.list_id === list_id && i.checked === 0);
  }
};

module.exports = db;
