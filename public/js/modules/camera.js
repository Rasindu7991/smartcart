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

    // Snapshot
    const canvas  = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

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
      <div style="background:rgba(11,16,37,0.9);border:1px solid rgba(245,158,11,0.4);border-radius:14px;padding:16px;max-width:360px;">
        <p style="color:var(--warning);font-size:0.82rem;margin-bottom:12px;text-align:center;">
          ⚠️ Demo mode — Add your Google Vision API key in Settings for real recognition
        </p>
        ${Camera._buildMatchHTML(result)}
      </div>`;
  },

  _showMatches(result, container) {
    container.innerHTML = `
      <div style="background:rgba(11,16,37,0.9);border:1px solid var(--glass-border);border-radius:14px;padding:16px;max-width:360px;">
        <p style="color:var(--text2);font-size:0.82rem;margin-bottom:12px;text-align:center;">
          🎯 Detected: ${result.labels.join(', ')}
        </p>
        ${Camera._buildMatchHTML(result)}
      </div>`;
  },

  _buildMatchHTML(result) {
    if (!result.matches?.length) {
      return `<p style="color:var(--text3);text-align:center;font-size:0.85rem;">No matching items found in your list.</p>`;
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
        ✓ Mark Selected as Collected
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

        if (Camera._onMatch) Camera._onMatch(selected);
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
