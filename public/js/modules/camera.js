/**
 * camera.js — Device camera access + Google Vision AI integration
 */

const Camera = {
  _stream: null,
  _listId: null,
  _onMatch: null,

  /**
   * Open the camera overlay for image capture.
   * @param {string} listId    - Active shopping list ID (for Vision matching)
   * @param {function} onMatch - Callback with matched items array
   */
  open(listId, onMatch) {
    Camera._listId  = listId;
    Camera._onMatch = onMatch;

    const overlay = document.getElementById('camera-overlay');
    overlay.classList.remove('hidden');
    Camera._startStream('camera-video');

    // Wire buttons
    document.getElementById('camera-close-btn').onclick   = Camera.close;
    document.getElementById('camera-capture-btn').onclick = Camera.capture;
  },

  close() {
    Camera._stopStream();
    document.getElementById('camera-overlay').classList.add('hidden');
    document.getElementById('camera-result').innerHTML = '';
  },

  async _startStream(videoId) {
    try {
      Camera._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = document.getElementById(videoId);
      video.srcObject = Camera._stream;
    } catch (err) {
      UI.toast('Camera access denied. Please allow camera permissions.', 'error');
      Camera.close();
    }
  },

  _stopStream() {
    if (Camera._stream) {
      Camera._stream.getTracks().forEach(t => t.stop());
      Camera._stream = null;
    }
  },

  async capture() {
    const video   = document.getElementById('camera-video');
    const resultEl = document.getElementById('camera-result');

    // Snapshot scaling (limit resolution for faster upload and to prevent socket timeouts)
    const maxDim = 640;
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;

    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas  = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);

    const base64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];

    resultEl.innerHTML = `
      <div style="text-align:center;color:#fff;padding:12px;">
        <div class="spinner" style="margin:0 auto 12px;"></div>
        <p style="font-size:0.9rem;">Analyzing image…</p>
      </div>`;

    try {
      const result = await Api.analyzeImage(base64, Camera._listId);
      Camera._lastResult = result;

      if (result.demo) {
        Camera._showDemoNotice(result, resultEl);
      } else {
        Camera._showMatches(result, resultEl);
      }
    } catch (err) {
      resultEl.innerHTML = `<p style="color:var(--danger);text-align:center;padding:12px;">⚠️ ${err.message}</p>`;
    }
  },

  _showDemoNotice(result, container) {
    container.innerHTML = `
      <div style="background:rgba(11,16,37,0.94);border:1px solid rgba(245,158,11,0.4);border-radius:16px;padding:16px;max-width:360px;margin:0 auto;backdrop-filter:blur(16px);">
        <p style="color:var(--warning);font-size:0.82rem;margin-bottom:12px;text-align:center;">
          ⚠️ Demo mode — Add your Google Vision API key in Settings for real recognition
        </p>
        ${Camera._buildPriceHTML(result)}
        ${Camera._buildMatchHTML(result)}
      </div>`;
    Camera._focusPriceInput();
  },

  _showMatches(result, container) {
    container.innerHTML = `
      <div style="background:rgba(11,16,37,0.94);border:1px solid var(--glass-border);border-radius:16px;padding:16px;max-width:360px;margin:0 auto;backdrop-filter:blur(16px);">
        <p style="color:var(--text2);font-size:0.82rem;margin-bottom:12px;text-align:center;">
          🎯 Detected: ${result.labels.join(', ')}
        </p>
        ${Camera._buildPriceHTML(result)}
        ${Camera._buildMatchHTML(result)}
      </div>`;
    Camera._focusPriceInput();
  },

  _buildPriceHTML(result) {
    const detected = result.detectedPrice;
    const candidates = result.priceCandidates || [];
    const hint = detected !== null
      ? `Price detected from image: ${Store.fmt(detected)}`
      : 'Enter the actual price manually if it is not visible in the photo.';

    const extra = candidates.length > 1
      ? `<div style="font-size:0.72rem;color:var(--text3);margin-top:4px;">Other matches: ${candidates.slice(1).map(v => Store.fmt(v)).join(', ')}</div>`
      : '';

    return `
      <div style="margin-bottom:14px;padding:12px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Actual Price</div>
        <input type="number" id="cam-price-input" class="form-input" step="0.01" min="0"
          value="${detected !== null ? detected : ''}"
          placeholder="Enter price" style="text-align:center;font-size:1.15rem;font-weight:800;" />
        <div style="font-size:0.76rem;color:var(--text3);margin-top:8px;text-align:center;">${hint}</div>
        ${extra}
      </div>
    `;
  },

  _focusPriceInput() {
    setTimeout(() => {
      const input = document.getElementById('cam-price-input');
      if (input) {
        input.focus();
        if (!input.value) input.select();
      }
    }, 150);
  },

  _buildMatchHTML(result) {
    if (!result.matches?.length) {
      return `<p style="color:var(--text3);text-align:center;font-size:0.85rem;margin-bottom:12px;">No matching items found in your list.</p>`;
    }

    const chips = result.matches.slice(0, 6).map(m => `
      <div class="chip match" id="cam-match-${m.item.id}" data-item-id="${m.item.id}"
        style="margin:4px;display:inline-flex;align-items:center;gap:6px;">
        ✅ ${UI.escape(m.item.name)}
        <span style="font-size:0.7rem;opacity:0.7">${(m.score * 100).toFixed(0)}%</span>
      </div>
    `).join('');

    return `
      <div style="margin-bottom:12px;text-align:center;">${chips}</div>
      <button class="btn btn-success btn-full" id="cam-confirm-btn" style="font-size:0.9rem;">
        ✓ Add Selected Items
      </button>
      <button class="btn btn-ghost btn-full" id="cam-use-estimate-btn" style="font-size:0.85rem;margin-top:10px;">
        Use estimate instead
      </button>
      <p style="color:var(--text3);font-size:0.75rem;text-align:center;margin-top:8px;">Tap items to deselect</p>
    `;
  },

  // Called after DOM is set — wire chip toggles and confirm
  wireMatchInteractions(result) {
    (result.matches || []).forEach(m => {
      const chip = document.getElementById(`cam-match-${m.item.id}`);
      if (!chip) return;
      chip.addEventListener('click', () => chip.classList.toggle('rejected'));
    });

    const confirmBtn = document.getElementById('cam-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const selected = (result.matches || [])
          .filter(m => {
            const chip = document.getElementById(`cam-match-${m.item.id}`);
            return chip && !chip.classList.contains('rejected');
          })
          .map(m => m.item);

        const input = document.getElementById('cam-price-input');
        const actualPrice = parseFloat(input?.value);
        if (isNaN(actualPrice) || actualPrice < 0) {
          UI.toast('Enter the actual price or use the estimate option', 'warning');
          return;
        }

        if (Camera._onMatch) Camera._onMatch({ items: selected, actualPrice, useEstimate: false });
        Camera.close();
      });
    }

    const estimateBtn = document.getElementById('cam-use-estimate-btn');
    if (estimateBtn) {
      estimateBtn.addEventListener('click', () => {
        const selected = (result.matches || [])
          .filter(m => {
            const chip = document.getElementById(`cam-match-${m.item.id}`);
            return chip && !chip.classList.contains('rejected');
          })
          .map(m => m.item);

        if (Camera._onMatch) Camera._onMatch({ items: selected, actualPrice: null, useEstimate: true });
        Camera.close();
      });
    }
  },
};

// Re-wire after DOM updates
const _origCapture = Camera.capture.bind(Camera);
Camera.capture = async function() {
  await _origCapture();
  // Wire up after render
  setTimeout(() => {
    const result = Camera._lastResult;
    if (result) Camera.wireMatchInteractions(result);
  }, 100);
};

window.Camera = Camera;
