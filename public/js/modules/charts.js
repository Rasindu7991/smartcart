/**
 * charts.js — Canvas-based chart rendering (no external library)
 */

const Charts = {
  // ── Colour Palette ────────────────────────────────────────────────────────
  COLORS: [
    '#7c3aed', '#06d6d6', '#10b981', '#f59e0b',
    '#ef4444', '#3b82f6', '#ec4899', '#84cc16',
    '#f97316', '#8b5cf6', '#06b6d4', '#14b8a6',
  ],

  // ── Bar Chart ─────────────────────────────────────────────────────────────
  /**
   * Draws a bar chart on the given canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {Array<{label:string, value:number}>} data
   */
  drawBar(canvas, data) {
    if (!canvas || !data?.length) return;

    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.offsetWidth;
    const H      = 220;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const PAD_L = 52, PAD_R = 8, PAD_T = 20, PAD_B = 36;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const maxVal = Math.max(...data.map(d => d.value), 1);

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    const gridLines = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.font        = '11px Inter, sans-serif';
    ctx.fillStyle   = 'rgba(148,163,184,0.7)';
    ctx.textAlign   = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const y = PAD_T + chartH - (i / gridLines) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(PAD_L + chartW, y);
      ctx.stroke();
      const val = (maxVal * i / gridLines);
      const label = typeof Store !== 'undefined' ? Store.fmt(val) : '$' + val.toFixed(0);
      // Truncate long currency labels (e.g. "LKR 2,200.00" → "2,200")
      const shortLabel = label.replace(/^[A-Z]{2,3}\s*/, '');
      ctx.fillText(shortLabel, PAD_L - 4, y + 4);
    }

    // Bars
    const barW  = Math.min(chartW / data.length * 0.55, 40);
    const gap   = chartW / data.length;

    data.forEach((d, i) => {
      const x      = PAD_L + gap * i + (gap - barW) / 2;
      const barH   = (d.value / maxVal) * chartH;
      const y      = PAD_T + chartH - barH;
      const color  = Charts.COLORS[i % Charts.COLORS.length];

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '55');

      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
      ctx.fillStyle = grad;
      ctx.fill();

      // Glow
      ctx.shadowColor  = color;
      ctx.shadowBlur   = 8;
      ctx.fill();
      ctx.shadowBlur   = 0;

      // Value label on bar
      if (barH > 24) {
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font      = '10px Inter, sans-serif';
        const barLabel = typeof Store !== 'undefined'
          ? Store.fmt(d.value).replace(/^[A-Z]{2,3}\s*/, '')
          : d.value.toFixed(0);
        ctx.fillText(barLabel, x + barW / 2, y + 14);
      }

      // X-axis label
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.textAlign = 'center';
      ctx.font      = '11px Inter, sans-serif';
      ctx.fillText(d.label, x + barW / 2, H - 10);
    });
  },

  // ── Donut Chart ───────────────────────────────────────────────────────────
  /**
   * Draws a donut chart on the given canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {Array<{label:string, value:number, color?:string}>} data
   * @param {string} centerLabel   - Main text in the center
   * @param {string} centerSub     - Sub text in the center
   */
  drawDonut(canvas, data, centerLabel = '', centerSub = '') {
    if (!canvas || !data?.length) return;

    const dpr  = window.devicePixelRatio || 1;
    const SIZE = Math.min(canvas.offsetWidth, 220);
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width  = SIZE + 'px';
    canvas.style.height = SIZE + 'px';

    const ctx   = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx    = SIZE / 2;
    const cy    = SIZE / 2;
    const outer = SIZE / 2 - 10;
    const inner = outer * 0.62;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;

    ctx.clearRect(0, 0, SIZE, SIZE);

    let startAngle = -Math.PI / 2;

    data.forEach((d, i) => {
      const slice = (d.value / total) * Math.PI * 2;
      const color = d.color || Charts.COLORS[i % Charts.COLORS.length];
      const endAngle = startAngle + slice;

      ctx.beginPath();
      ctx.arc(cx, cy, outer, startAngle, endAngle);
      ctx.arc(cx, cy, inner, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = color;

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.shadowBlur  = 0;

      startAngle = endAngle;
    });

    // Center text
    if (centerLabel) {
      ctx.fillStyle = '#f1f5f9';
      ctx.font      = `700 ${Math.floor(SIZE * 0.12)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerLabel, cx, cy - (centerSub ? SIZE * 0.06 : 0));
    }
    if (centerSub) {
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.font      = `500 ${Math.floor(SIZE * 0.07)}px Inter, sans-serif`;
      ctx.fillText(centerSub, cx, cy + SIZE * 0.08);
    }
  },

  // ── Budget Ring (SVG) ─────────────────────────────────────────────────────
  /**
   * Renders an animated SVG budget ring.
   * @param {HTMLElement} container
   * @param {number} spent
   * @param {number} limit
   * @param {string} currency - formatted currency string for center
   */
  renderBudgetRing(container, spent, limit, currency) {
    const pct    = Math.min(spent / (limit || 1), 1);
    const SIZE   = 180;
    const R      = 78;
    const CIRCUM = 2 * Math.PI * R;
    const offset = CIRCUM * (1 - pct);
    const danger = pct > 0.85;
    const warn   = pct > 0.65;
    const color  = danger ? '#ef4444' : warn ? '#f59e0b' : 'url(#ringGrad)';

    container.innerHTML = `
      <div style="position:relative;width:${SIZE}px;height:${SIZE}px;">
        <svg class="budget-ring-svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#7c3aed"/>
              <stop offset="100%" stop-color="#06d6d6"/>
            </linearGradient>
          </defs>
          <circle class="budget-ring-track" cx="${SIZE/2}" cy="${SIZE/2}" r="${R}"/>
          <circle class="budget-ring-fill" cx="${SIZE/2}" cy="${SIZE/2}" r="${R}"
            stroke="${color}"
            stroke-dasharray="${CIRCUM}"
            stroke-dashoffset="${offset}"
            style="transition:stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)"/>
        </svg>
        <div class="budget-ring-center">
          <div class="budget-ring-amount" style="color:${danger?'var(--danger)':warn?'var(--warning)':'var(--text)'}">${currency}</div>
          <div class="budget-ring-label">of ${Store.fmt(limit)}</div>
          <div class="budget-ring-label" style="margin-top:2px;color:${danger?'var(--danger)':warn?'var(--warning)':'var(--success)'}">
            ${(pct * 100).toFixed(0)}% used
          </div>
        </div>
      </div>
    `;
  },

  // ── Legend ────────────────────────────────────────────────────────────────
  renderLegend(container, data) {
    container.innerHTML = data.map((d, i) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${d.color || Charts.COLORS[i % Charts.COLORS.length]}"></div>
        <span>${UI.escape(d.label)}</span>
        <span style="color:var(--text3);margin-left:4px;">${Store.fmt(d.value)}</span>
      </div>
    `).join('');
  },
};

window.Charts = Charts;
