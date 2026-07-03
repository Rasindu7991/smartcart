/**
 * ui.js — Reusable UI helpers: toasts, modals, confirms
 */

const UI = {
  // ── Toast Notifications ──────────────────────────────────────────────────
  toast(message, type = 'info', duration = 3000) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('leaving');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);

    return toast;
  },

  // ── Bottom Sheet Modal ────────────────────────────────────────────────────
  showModal({ title, content, actions = [] }) {
    const existing = document.getElementById('active-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';

    const actionsHtml = actions.map(a =>
      `<button class="btn ${a.class || 'btn-ghost'} btn-full" id="modal-action-${a.id}">${a.label}</button>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="modal-handle"></div>
        <div class="modal-title">${title}</div>
        <div class="modal-body">${content}</div>
        ${actionsHtml ? `<div style="display:flex;flex-direction:column;gap:10px;margin-top:20px">${actionsHtml}</div>` : ''}
      </div>
    `;

    document.getElementById('modal-container').appendChild(overlay);

    // Trigger open animation
    requestAnimationFrame(() => overlay.classList.add('open'));

    // Close on backdrop click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) UI.closeModal();
    });

    // Wire up action buttons
    actions.forEach(a => {
      const btn = overlay.querySelector(`#modal-action-${a.id}`);
      if (btn && a.onClick) {
        btn.addEventListener('click', () => {
          if (a.closeOnClick !== false) UI.closeModal();
          a.onClick();
        });
      }
    });

    return overlay;
  },

  closeModal() {
    const modal = document.getElementById('active-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.addEventListener('transitionend', () => modal.remove(), { once: true });
  },

  // ── Confirm Dialog ────────────────────────────────────────────────────────
  confirm(message, onConfirm, onCancel) {
    UI.showModal({
      title: 'Confirm',
      content: `<p style="text-align:center;margin-bottom:8px;">${message}</p>`,
      actions: [
        { id: 'cancel',  label: 'Cancel',  class: 'btn-ghost',  onClick: onCancel || (() => {}) },
        { id: 'confirm', label: 'Confirm', class: 'btn-danger', onClick: onConfirm },
      ]
    });
  },

  // ── Price Entry Prompt ────────────────────────────────────────────────────
  promptPrice(itemName, estimatedPrice, onConfirm) {
    UI.showModal({
      title: `✅ ${itemName}`,
      content: `
        <p style="text-align:center;color:var(--text2);margin-bottom:16px;">Enter the actual price</p>
        <div class="form-group">
          <input type="number" id="price-input" class="form-input" placeholder="0.00"
            value="${estimatedPrice || ''}" step="0.01" min="0" style="text-align:center;font-size:1.4rem;font-weight:700;" />
          <p style="text-align:center;font-size:0.78rem;color:var(--text3);">Estimated: ${Store.fmt(estimatedPrice)}</p>
        </div>
      `,
      actions: [
        { id: 'skip',    label: 'Skip (use estimate)', class: 'btn-ghost',   onClick: () => onConfirm(estimatedPrice) },
        { id: 'confirm', label: 'Add to Cart ✓',       class: 'btn-success', closeOnClick: false, onClick: () => {
          const val = parseFloat(document.getElementById('price-input').value);
          UI.closeModal();
          onConfirm(isNaN(val) ? estimatedPrice : val);
        }},
      ]
    });
    // Auto-select price input
    setTimeout(() => {
      const input = document.getElementById('price-input');
      if (input) { input.focus(); input.select(); }
    }, 350);
  },

  // ── Set main content ──────────────────────────────────────────────────────
  setContent(html) {
    const main = document.getElementById('main-content');
    main.innerHTML = html;
  },

  // ── Show loading ──────────────────────────────────────────────────────────
  showLoading() {
    UI.setContent('<div class="loading-overlay"><div class="spinner"></div></div>');
  },

  // ── Update nav active state ───────────────────────────────────────────────
  setActiveNav(route) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });
  },

  // ── Set header actions ────────────────────────────────────────────────────
  setHeaderActions(html) {
    document.getElementById('header-actions').innerHTML = html || '';
  },

  // ── Animate items in list ─────────────────────────────────────────────────
  animateList(selector, delay = 50) {
    const items = document.querySelectorAll(selector);
    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * delay);
    });
  },

  // ── Escape HTML ──────────────────────────────────────────────────────────
  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ── Format date ──────────────────────────────────────────────────────────
  formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatMonth(yyyyMM) {
    if (!yyyyMM) return '';
    const [y, m] = yyyyMM.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  },
};

window.UI = UI;
