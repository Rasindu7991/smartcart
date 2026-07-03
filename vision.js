const fetchImpl = typeof fetch === 'function' ? fetch.bind(globalThis) : require('node-fetch');

/**
 * Analyzes an image using Google Cloud Vision API (Label Detection).
 * Returns labels plus an optional OCR price hint.
 * Falls back to a demo mode if no API key is provided.
 *
 * @param {string} base64Image - Base64-encoded image (without data URI prefix)
 * @param {string} apiKey      - Google Cloud Vision API key
 * @returns {Promise<{labels: string[], demo: boolean, detectedPrice: number|null, priceCandidates: number[], ocrText: string}>}
 */
async function analyzeImage(base64Image, apiKey) {
  // ── Demo mode (no API key) ────────────────────────────────────────────────
  if (!apiKey || apiKey.trim() === '') {
    return {
      demo: true,
      labels: generateDemoLabels(),
      detectedPrice: null,
      priceCandidates: [],
      ocrText: '',
    };
  }

  // ── Real Vision API call ──────────────────────────────────────────────────
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const imageContent = normalizeBase64Image(base64Image);

  const requestBody = {
    requests: [
      {
        image: { content: imageContent },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 15 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
          { type: 'TEXT_DETECTION', maxResults: 5 },
        ],
      },
    ],
  };

  let response;
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      break;
    } catch (err) {
      lastError = err;
      if (attempt === 2 || !isRetryableFetchError(err)) {
        throw err;
      }
    }
  }

  if (!response) {
    throw lastError;
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Vision API error ${response.status}: ${err}`);
  }

  const bodyText = await response.text();
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (err) {
    throw new Error(`Vision API returned invalid JSON: ${bodyText.slice(0, 200)}`);
  }
  const result = data.responses?.[0];

  const labels = new Set();

  // Extract label annotations
  (result?.labelAnnotations || []).forEach(l => {
    if (l.score > 0.6) labels.add(l.description.toLowerCase());
  });

  // Extract localized object names
  (result?.localizedObjectAnnotations || []).forEach(o => {
    if (o.score > 0.5) labels.add(o.name.toLowerCase());
  });

  // Extract text (product names from text on packaging)
  const textBlock = result?.textAnnotations?.[0]?.description || '';
  if (textBlock) {
    // Split and filter short/generic words
    textBlock
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 8)
      .forEach(w => labels.add(w.toLowerCase().replace(/[^a-z]/g, '')));
  }

  const priceCandidates = extractPriceCandidates(textBlock);

  return {
    demo: false,
    labels: [...labels],
    detectedPrice: priceCandidates[0] ?? null,
    priceCandidates,
    ocrText: textBlock,
  };
}

function normalizeBase64Image(base64Image) {
  return String(base64Image || '').replace(/^data:[^;]+;base64,/, '').trim();
}

function isRetryableFetchError(err) {
  const message = String(err?.message || err);
  return /Premature close|socket hang up|ECONNRESET|EPIPE|fetch failed/i.test(message);
}

/**
 * Extracts plausible prices from OCR text.
 * Prefers values with explicit currency markers, then falls back to amount-like tokens.
 */
function extractPriceCandidates(textBlock) {
  const candidates = [];
  const seen = new Set();
  const lines = String(textBlock || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const pushValue = (value) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const key = value.toFixed(2);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(value);
  };

  // 1) Currency-marked amounts on each OCR line.
  for (const line of lines) {
    const hasCurrencyWord = /\b(LKR|RS\.?|RUPEES?|RU\.?)\b|රු/gi.test(line);
    const matches = [...line.matchAll(/(?:LKR|Rs\.?|Rs|රු\.?|රු)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi)];
    for (const match of matches) {
      const raw = match[1];
      const value = parseFloat(raw.replace(/,/g, ''));
      if (hasCurrencyWord || /[₹රු]|(?:LKR|RS|RUPEE)/i.test(line) || value >= 10) {
        pushValue(value);
      }
    }
  }

  // 2) If nothing obvious was found, use standalone amounts from the full text.
  if (!candidates.length) {
    const allMatches = String(textBlock || '').match(/\b[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?\b|\b[0-9]+(?:\.[0-9]{1,2})?\b/g) || [];
    for (const raw of allMatches) {
      const value = parseFloat(raw.replace(/,/g, ''));
      // Avoid very small tokens such as weights or counts.
      if (value >= 10) pushValue(value);
    }
  }

  return candidates.slice(0, 3);
}

/**
 * Generates realistic demo labels for testing without an API key.
 */
function generateDemoLabels() {
  const pools = [
    ['milk', 'dairy', 'bottle', 'white'],
    ['apple', 'fruit', 'produce', 'red'],
    ['bread', 'bakery', 'wheat', 'loaf'],
    ['chicken', 'meat', 'poultry', 'protein'],
    ['yogurt', 'dairy', 'container', 'probiotic'],
    ['orange juice', 'beverages', 'citrus', 'juice'],
    ['pasta', 'pantry', 'dry goods', 'carbohydrate'],
    ['eggs', 'dairy', 'protein', 'carton'],
  ];
  const chosen = pools[Math.floor(Math.random() * pools.length)];
  return chosen;
}

/**
 * Fuzzy-matches Vision labels against a list of item names.
 * Returns matched items sorted by confidence.
 *
 * @param {string[]} labels - Labels from Vision API
 * @param {Array<{id:string, name:string, category:string}>} items - Shopping list items
 * @returns {Array<{item: object, score: number}>}
 */
function matchLabelsToItems(labels, items) {
  const matches = [];

  for (const item of items) {
    const itemName = item.name.toLowerCase();
    const itemCategory = item.category.toLowerCase();
    let best = 0;

    for (const label of labels) {
      const score = fuzzyScore(label, itemName) || fuzzyScore(label, itemCategory);
      if (score > best) best = score;
    }

    if (best > 0.4) {
      matches.push({ item, score: best });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Simple fuzzy scoring: substring match + character overlap.
 */
function fuzzyScore(a, b) {
  if (a === b) return 1.0;
  if (b.includes(a) || a.includes(b)) return 0.85;

  // Character overlap ratio
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(c => setB.has(c)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

module.exports = { analyzeImage, matchLabelsToItems };
