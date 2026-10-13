/**
 * OCR Response Normalization & Bounds Validation Utility
 *
 * Provides defensive parsing for OCR responses (Tesseract, vision APIs, cloud providers).
 * Prevents "out of range", unhandled type errors, negative indexing, and invalid coordinates.
 */

/**
 * Validates and normalizes bounding box coordinates within image bounds.
 *
 * @param {Object} rawBox - Input bounding box { x0, y0, x1, y1 } or { left, top, width, height }
 * @param {number} [maxWidth=0] - Maximum allowable X coordinate
 * @param {number} [maxHeight=0] - Maximum allowable Y coordinate
 * @returns {{ x0: number, y0: number, x1: number, y1: number, width: number, height: number, isValid: boolean }}
 */
const normalizeBoundingBox = (rawBox, maxWidth = 0, maxHeight = 0) => {
  if (!rawBox || typeof rawBox !== 'object') {
    return { x0: 0, y0: 0, x1: 0, y1: 0, width: 0, height: 0, isValid: false };
  }

  // Handle { left, top, width, height } representation
  let x0 = rawBox.x0 !== undefined ? rawBox.x0 : rawBox.left;
  let y0 = rawBox.y0 !== undefined ? rawBox.y0 : rawBox.top;
  let x1 = rawBox.x1 !== undefined ? rawBox.x1 : (x0 !== undefined && rawBox.width !== undefined ? x0 + rawBox.width : undefined);
  let y1 = rawBox.y1 !== undefined ? rawBox.y1 : (y0 !== undefined && rawBox.height !== undefined ? y0 + rawBox.height : undefined);

  // Fallbacks to 0 for missing coordinates
  x0 = typeof x0 === 'number' && !isNaN(x0) ? Math.max(0, Math.floor(x0)) : 0;
  y0 = typeof y0 === 'number' && !isNaN(y0) ? Math.max(0, Math.floor(y0)) : 0;
  x1 = typeof x1 === 'number' && !isNaN(x1) ? Math.max(0, Math.floor(x1)) : x0;
  y1 = typeof y1 === 'number' && !isNaN(y1) ? Math.max(0, Math.floor(y1)) : y0;

  // Swap if min > max
  if (x0 > x1) {
    const tmp = x0;
    x0 = x1;
    x1 = tmp;
  }
  if (y0 > y1) {
    const tmp = y0;
    y0 = y1;
    y1 = tmp;
  }

  // Clamp within image dimensions if supplied
  if (typeof maxWidth === 'number' && maxWidth > 0) {
    x0 = Math.min(x0, maxWidth);
    x1 = Math.min(x1, maxWidth);
  }
  if (typeof maxHeight === 'number' && maxHeight > 0) {
    y0 = Math.min(y0, maxHeight);
    y1 = Math.min(y1, maxHeight);
  }

  const width = Math.max(0, x1 - x0);
  const height = Math.max(0, y1 - y0);
  const isValid = width > 0 && height > 0;

  return { x0, y0, x1, y1, width, height, isValid };
};

/**
 * Normalizes an array of words safely with bounds validation.
 */
const normalizeWords = (rawWords, maxWidth = 0, maxHeight = 0) => {
  if (!Array.isArray(rawWords) || rawWords.length === 0) {
    return [];
  }

  const normalized = [];
  for (let i = 0; i < rawWords.length; i++) {
    const w = rawWords[i];
    if (!w) continue;

    const text = typeof w.text === 'string' ? w.text.trim() : typeof w === 'string' ? w.trim() : '';
    if (!text) continue;

    const conf = typeof w.confidence === 'number' && !isNaN(w.confidence)
      ? Math.max(0, Math.min(100, Math.round(w.confidence)))
      : 0;

    const bbox = normalizeBoundingBox(w.bbox, maxWidth, maxHeight);

    normalized.push({
      wordIndex: normalized.length,
      text,
      confidence: conf,
      bbox,
    });
  }

  return normalized;
};

/**
 * Normalizes an array of lines safely with bounds validation.
 */
const normalizeLines = (rawLines, maxWidth = 0, maxHeight = 0) => {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return [];
  }

  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (!l) continue;

    const lineText = typeof l.text === 'string' ? l.text.trim() : typeof l === 'string' ? l.trim() : '';
    if (!lineText) continue;

    const words = Array.isArray(l.words) ? normalizeWords(l.words, maxWidth, maxHeight) : [];
    const bbox = normalizeBoundingBox(l.bbox, maxWidth, maxHeight);

    lines.push({
      lineIndex: lines.length,
      text: lineText,
      words,
      bbox,
    });
  }

  return lines;
};

/**
 * Validates, bounds, and normalizes a raw OCR response.
 *
 * @param {Object} rawResponse - Tesseract or vision model raw result
 * @param {Object} [imageMeta={}] - Optional image dimensions { width, height }
 * @returns {Object} Clean normalized OCR data structure
 */
const normalizeOcrResponse = (rawResponse, imageMeta = {}) => {
  const imgWidth = typeof imageMeta.width === 'number' && imageMeta.width > 0 ? imageMeta.width : 0;
  const imgHeight = typeof imageMeta.height === 'number' && imageMeta.height > 0 ? imageMeta.height : 0;

  // Handle null, undefined, or primitive responses gracefully
  if (!rawResponse || typeof rawResponse !== 'object') {
    return {
      text: '',
      confidence: 0,
      pages: [],
      blocks: [],
      lines: [],
      words: [],
      hasText: false,
      isHandwrittenCandidate: false,
      charCount: 0,
      wordCount: 0,
      lineCount: 0,
      warnings: ['OCR returned an empty or non-object response payload.'],
    };
  }

  // Safely extract data block if nested under .data (Tesseract standard)
  const data = rawResponse.data && typeof rawResponse.data === 'object' ? rawResponse.data : rawResponse;

  // Safe text extraction
  let rawText = '';
  if (typeof data.text === 'string') {
    rawText = data.text;
  } else if (typeof rawResponse.text === 'string') {
    rawText = rawResponse.text;
  }

  const cleanedText = rawText.trim();

  // Safe confidence extraction (bounded between 0 and 100)
  let confidence = 0;
  if (typeof data.confidence === 'number' && !isNaN(data.confidence)) {
    confidence = Math.max(0, Math.min(100, Math.round(data.confidence)));
  }

  // Safe blocks extraction
  const blocks = [];
  const rawBlocks = Array.isArray(data.blocks) ? data.blocks : [];
  for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
    const b = rawBlocks[bIdx];
    if (!b) continue;

    const blockText = typeof b.text === 'string' ? b.text.trim() : '';
    const blockBbox = normalizeBoundingBox(b.bbox, imgWidth, imgHeight);

    const paragraphs = [];
    const rawParagraphs = Array.isArray(b.paragraphs) ? b.paragraphs : [];
    for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
      const p = rawParagraphs[pIdx];
      if (!p) continue;
      const pText = typeof p.text === 'string' ? p.text.trim() : '';
      const pBbox = normalizeBoundingBox(p.bbox, imgWidth, imgHeight);
      const pLines = Array.isArray(p.lines) ? normalizeLines(p.lines, imgWidth, imgHeight) : [];

      paragraphs.push({
        paragraphIndex: paragraphs.length,
        text: pText,
        bbox: pBbox,
        lines: pLines,
      });
    }

    blocks.push({
      blockIndex: blocks.length,
      text: blockText,
      bbox: blockBbox,
      paragraphs,
    });
  }

  // Safe lines extraction
  const lines = Array.isArray(data.lines)
    ? normalizeLines(data.lines, imgWidth, imgHeight)
    : cleanedText
      ? cleanedText.split('\n').filter((l) => l.trim().length > 0).map((l, i) => ({ lineIndex: i, text: l.trim(), words: [], bbox: { x0: 0, y0: 0, x1: 0, y1: 0, isValid: false } }))
      : [];

  // Safe words extraction
  const words = Array.isArray(data.words)
    ? normalizeWords(data.words, imgWidth, imgHeight)
    : cleanedText
      ? cleanedText.split(/\s+/).filter(Boolean).map((w, i) => ({ wordIndex: i, text: w, confidence: 0, bbox: { x0: 0, y0: 0, x1: 0, y1: 0, isValid: false } }))
      : [];

  const charCount = cleanedText.length;
  const wordCount = words.length;
  const lineCount = lines.length;
  const alphanumericChars = (cleanedText.match(/[a-zA-Z0-9]/g) || []).length;
  const hasText = alphanumericChars >= 3;

  // Handwriting heuristic: variable confidence, low dictionary hit, or prescription markers
  const hasPrescriptionMarkers = /(?:rx|sig:|tab|lic\.|ptr|physician)/i.test(cleanedText);
  const isHandwrittenCandidate = hasText && ((confidence > 0 && confidence < 75) || (hasPrescriptionMarkers && confidence < 80));

  return {
    text: hasText ? cleanedText : '',
    confidence: hasText ? confidence : 0,
    pages: Array.isArray(data.pages) ? data.pages : [],
    blocks: hasText ? blocks : [],
    lines: hasText ? lines : [],
    words: hasText ? words : [],
    hasText,
    isHandwrittenCandidate,
    charCount: hasText ? charCount : 0,
    wordCount: hasText ? wordCount : 0,
    lineCount: hasText ? lineCount : 0,
    warnings: [],
  };
};

module.exports = {
  normalizeOcrResponse,
  normalizeBoundingBox,
  normalizeWords,
  normalizeLines,
};
