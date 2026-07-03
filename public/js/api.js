/**
 * api.js — All HTTP calls to the SmartCart backend
 */

const API_BASE = '/api';

const Api = {
  // ── Generic fetch wrapper ───────────────────────────────────────────────
  async _req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
    return data;
  },

  get:    (path)        => Api._req('GET',    path),
  post:   (path, body)  => Api._req('POST',   path, body),
  put:    (path, body)  => Api._req('PUT',    path, body),
  delete: (path)        => Api._req('DELETE', path),

  // ── Lists ───────────────────────────────────────────────────────────────
  getLists:       ()          => Api.get('/lists'),
  createList:     (data)      => Api.post('/lists', data),
  getList:        (id)        => Api.get(`/lists/${id}`),
  updateList:     (id, data)  => Api.put(`/lists/${id}`, data),
  deleteList:     (id)        => Api.delete(`/lists/${id}`),
  cloneList:      (id, name)  => Api.post(`/lists/${id}/clone`, { name }),

  // ── Items ───────────────────────────────────────────────────────────────
  addItem:        (listId, data) => Api.post(`/lists/${listId}/items`, data),
  updateItem:     (id, data)     => Api.put(`/items/${id}`, data),
  deleteItem:     (id)           => Api.delete(`/items/${id}`),
  batchCheck:     (data)         => Api.post('/items/batch-check', data),

  // ── Purchases ───────────────────────────────────────────────────────────
  getPurchases:   ()      => Api.get('/purchases'),
  savePurchase:   (data)  => Api.post('/purchases', data),

  // ── Analytics ───────────────────────────────────────────────────────────
  getMonthly:         ()        => Api.get('/analytics/monthly'),
  getCategories:      (month)   => Api.get(`/analytics/categories${month ? '?month=' + month : ''}`),
  getStats:           (month)   => Api.get(`/analytics/stats${month ? '?month=' + month : ''}`),

  // ── Optimizer ───────────────────────────────────────────────────────────
  getRecommendations: () => Api.get('/optimizer/recommendations'),

  // ── Vision ──────────────────────────────────────────────────────────────
  analyzeImage: (image, list_id) => Api.post('/vision/analyze', { image, list_id }),

  // ── Barcode ─────────────────────────────────────────────────────────────
  lookupBarcode: (code) => Api.get(`/products/barcode/${code}`),

  // ── Budget ──────────────────────────────────────────────────────────────
  getBudget:    ()     => Api.get('/budget'),
  updateBudget: (data) => Api.put('/budget', data),
};

window.Api = Api;
