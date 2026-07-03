/**
 * store.js — Lightweight client-side state management
 */

const Store = {
  _state: {
    activeList:   null,   // Currently selected list (for shopping mode)
    currentRoute: 'dashboard',
    currency:     'LKR',
    monthlyLimit: 300,
  },

  get: (key) => Store._state[key],
  set: (key, val) => { Store._state[key] = val; },

  // Persist active list id across page reload
  setActiveList(list) {
    Store._state.activeList = list;
    if (list) {
      localStorage.setItem('sc_active_list', list.id);
    } else {
      localStorage.removeItem('sc_active_list');
    }
  },

  getActiveListId: () => localStorage.getItem('sc_active_list'),

  // Currency formatter
  fmt(amount) {
    const cur = Store._state.currency || 'LKR';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: cur, minimumFractionDigits: 2
      }).format(amount || 0);
    } catch {
      return `$${(amount || 0).toFixed(2)}`;
    }
  },

  // Category order for shopping mode (aisle order)
  CATEGORY_ORDER: [
    'Produce', 'Dairy', 'Meat', 'Bakery',
    'Frozen', 'Pantry', 'Beverages', 'Snacks',
    'Personal Care', 'Cleaning', 'Other'
  ],

  CATEGORY_ICONS: {
    'Produce':      '🥦',
    'Dairy':        '🥛',
    'Meat':         '🥩',
    'Bakery':       '🍞',
    'Frozen':       '❄️',
    'Pantry':       '🥫',
    'Beverages':    '🧃',
    'Snacks':       '🍿',
    'Personal Care':'🧴',
    'Cleaning':     '🧹',
    'Other':        '🛒',
  },

  getCategoryIcon(cat) {
    return Store.CATEGORY_ICONS[cat] || '🛒';
  },

  sortByCategory(items) {
    return [...items].sort((a, b) => {
      const ai = Store.CATEGORY_ORDER.indexOf(a.category);
      const bi = Store.CATEGORY_ORDER.indexOf(b.category);
      const ao = ai === -1 ? 99 : ai;
      const bo = bi === -1 ? 99 : bi;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
  },
};

window.Store = Store;
