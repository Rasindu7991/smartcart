/**
 * barcode.js — ZXing-based real-time barcode scanning
 */

const Barcode = {
  _reader:  null,
  _active:  false,
  _listId:  null,
  _onFound: null,

  /**
   * Open the barcode scanner overlay.
   * @param {string}   listId  - Active shopping list ID
   * @param {function} onFound - Callback({ barcode, product_name, brand, category, item })
   */
  open(listId, onFound) {
    Barcode._listId  = listId;
    Barcode._onFound = onFound;
    Barcode._active  = true;

    const overlay = document.getElementById('barcode-overlay');
    overlay.classList.remove('hidden');

    document.getElementById('barcode-close-btn').onclick = Barcode.close;
    document.getElementById('barcode-result').textContent = 'Point camera at barcode';

    Barcode._startScanning();
  },

  close() {
    Barcode._active = false;
    if (Barcode._reader) {
      Barcode._reader.reset();
      Barcode._reader = null;
    }
    document.getElementById('barcode-overlay').classList.add('hidden');
    document.getElementById('barcode-result').textContent = 'Point camera at barcode';
  },

  async _startScanning() {
    // Wait for ZXing to load (it's a CDN script)
    if (typeof ZXing === 'undefined') {
      UI.toast('Barcode library loading... please wait', 'info');
      setTimeout(Barcode._startScanning, 1000);
      return;
    }

    const hints = new Map();
    const formats = [
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.CODE_128,
      ZXing.BarcodeFormat.QR_CODE,
    ];
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);

    Barcode._reader = new ZXing.BrowserMultiFormatReader(hints);

    try {
      const videoEl = document.getElementById('barcode-video');
      await Barcode._reader.decodeFromVideoDevice(null, videoEl, (result, err) => {
        if (!Barcode._active) return;
        if (result) {
          Barcode._onBarcode(result.getText());
        }
      });
    } catch (err) {
      const resultEl = document.getElementById('barcode-result');
      resultEl.innerHTML = `<span style="color:var(--danger)">⚠️ Camera unavailable: ${err.message}</span>`;
    }
  },

  async _onBarcode(code) {
    const resultEl = document.getElementById('barcode-result');
    resultEl.innerHTML = `
      <div style="color:var(--cyan);font-weight:600;">✓ Scanned: ${code}</div>
      <div class="spinner" style="width:20px;height:20px;border-width:2px;margin:8px auto;"></div>
      <div style="color:var(--text2);font-size:0.82rem;">Looking up product…</div>
    `;

    try {
      const product = await Api.lookupBarcode(code);

      if (product.product_name) {
        Barcode._showProduct(product);
      } else {
        resultEl.innerHTML = `
          <div style="color:var(--warning);">⚠️ Product not found for barcode: ${code}</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px;" id="barcode-add-manual">
            + Add manually
          </button>
        `;
        document.getElementById('barcode-add-manual')?.addEventListener('click', () => {
          Barcode.close();
          if (Barcode._onFound) Barcode._onFound({ barcode: code, product_name: null, manual: true });
        });
      }
    } catch (err) {
      resultEl.innerHTML = `<span style="color:var(--danger);">⚠️ Lookup failed: ${err.message}</span>`;
    }
  },

  _showProduct(product) {
    const resultEl = document.getElementById('barcode-result');
    resultEl.innerHTML = `
      <div style="background:rgba(11,16,37,0.9);border:1px solid var(--glass-border);border-radius:14px;padding:16px;max-width:320px;margin:auto;">
        <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:4px;">${UI.escape(product.product_name)}</div>
        ${product.brand ? `<div style="font-size:0.82rem;color:var(--text2);">${UI.escape(product.brand)}</div>` : ''}
        <div style="margin:8px 0;"><span class="badge badge-cyan">${UI.escape(product.category || 'Other')}</span></div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn btn-ghost btn-sm" id="bc-dismiss" style="flex:1;">Dismiss</button>
          <button class="btn btn-success btn-sm" id="bc-checkoff" style="flex:2;">✓ Found in List</button>
        </div>
      </div>
    `;

    document.getElementById('bc-dismiss')?.addEventListener('click', () => {
      document.getElementById('barcode-result').textContent = 'Point camera at barcode';
    });

    document.getElementById('bc-checkoff')?.addEventListener('click', () => {
      Barcode.close();
      if (Barcode._onFound) Barcode._onFound(product);
    });
  },
};

window.Barcode = Barcode;
