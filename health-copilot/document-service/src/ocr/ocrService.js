const fs = require('fs');
const path = require('path');
const { cleanText } = require('../cleaning/textCleaner');
const { validateFileSignature } = require('../validation/fileValidator');
const { getImageMetadata } = require('./imagePreprocessor');
const { normalizeOcrResponse } = require('./ocrResponseNormalizer');

let Tesseract = null;
try {
  Tesseract = require('tesseract.js');
} catch (e1) {
  try {
    Tesseract = require(path.resolve(__dirname, '../../../backend/node_modules/tesseract.js'));
  } catch (e2) {
    console.warn('[OCR] tesseract.js not found in current environment.');
  }
}

/**
 * Resolves local traineddata path to eliminate external CDN dependencies and avoid network timeouts.
 */
const resolveTrainedDataDir = () => {
  const candidates = [
    path.resolve(__dirname, '../../../'), // Root workspace
    path.resolve(__dirname, '../../../../'),
    process.cwd(),
  ];

  for (const dir of candidates) {
    const candidateFile = path.join(dir, 'eng.traineddata');
    if (fs.existsSync(candidateFile)) {
      return dir;
    }
  }
  return null;
};

/**
 * Runs Tesseract OCR on an image file with bounds validation, parameter tuning, and defensive parsing.
 *
 * @param {string} filePath - Absolute path to image on disk
 * @param {Object} [options={}] - Custom configuration options
 * @returns {Promise<Object>} Normalized OCR result
 */
const extractTextFromImage = async (filePath, options = {}) => {
  const startTime = Date.now();

  try {
    // 1. Validate environment
    if (!Tesseract) {
      return {
        text: '',
        confidence: 0,
        hasText: false,
        isImage: true,
        message: 'OCR engine is not available in this environment.',
      };
    }

    // 2. Validate file existence and size
    if (!filePath || typeof filePath !== 'string') {
      return {
        text: '',
        confidence: 0,
        hasText: false,
        isImage: true,
        message: 'Invalid file path provided for OCR processing.',
      };
    }

    if (!fs.existsSync(filePath)) {
      return {
        text: '',
        confidence: 0,
        hasText: false,
        isImage: true,
        message: 'Image file not found on disk.',
      };
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return {
        text: '',
        confidence: 0,
        hasText: false,
        isImage: true,
        message: 'Image file is empty (0 bytes).',
      };
    }

    if (stats.size > 25 * 1024 * 1024) {
      return {
        text: '',
        confidence: 0,
        hasText: false,
        isImage: true,
        message: 'Image file exceeds maximum allowable processing size of 25MB.',
      };
    }

    // 3. Validate file signature (magic bytes) to prevent non-image corruption crashes
    const sigCheck = validateFileSignature(filePath);
    if (!sigCheck.isValid && !sigCheck.detectedType?.startsWith('image/')) {
      return {
        text: '',
        confidence: 0,
        hasText: false,
        isImage: true,
        message: sigCheck.error || 'The file is not a supported or valid image format.',
      };
    }

    // 4. Validate image dimensions (prevent zero-width, zero-height, or invalid headers)
    const meta = getImageMetadata(filePath);
    if (!meta.isValid || meta.width <= 0 || meta.height <= 0) {
      return {
        text: '',
        confidence: 0,
        hasText: false,
        isImage: true,
        message: `Image dimension validation failed: ${meta.error || 'Zero or invalid image dimensions.'}`,
      };
    }

    const trainedDataDir = resolveTrainedDataDir();
    const workerOptions = trainedDataDir ? { langPath: trainedDataDir, gzip: false } : {};

    // 5. Pass 1: Primary OCR recognition with clinical DPI & layout settings
    let primaryResult = null;
    let worker = null;

    try {
      worker = await Tesseract.createWorker('eng', 1, workerOptions);
      await worker.setParameters({
        user_defined_dpi: '300',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1',
      });

      console.log(`[OCR] Executing Pass 1 on ${meta.width}x${meta.height} image (${(stats.size / 1024).toFixed(1)} KB)...`);
      primaryResult = await worker.recognize(filePath);
    } finally {
      if (worker) {
        await worker.terminate().catch(() => {});
        worker = null;
      }
    }

    // 6. Normalize Pass 1 response safely
    let normalized = normalizeOcrResponse(primaryResult, { width: meta.width, height: meta.height });
    normalized.text = cleanText(normalized.text);

    // 7. Pass 2 / Fallback Retry: If text is sparse or incomplete on a prescription/document, retry with SPARSE_TEXT
    const shouldRetryWithSparsePsm =
      normalized.text.length < 25 ||
      (normalized.confidence < 45 && normalized.text.length < 80);

    if (shouldRetryWithSparsePsm) {
      let retryWorker = null;
      try {
        console.log('[OCR] Incomplete text detected. Activating Pass 2 sparse layout retry...');
        retryWorker = await Tesseract.createWorker('eng', 1, workerOptions);
        await retryWorker.setParameters({
          user_defined_dpi: '300',
          tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
        });

        const retryResult = await retryWorker.recognize(filePath);
        const normalizedRetry = normalizeOcrResponse(retryResult, { width: meta.width, height: meta.height });
        normalizedRetry.text = cleanText(normalizedRetry.text);

        // Keep retry result if it extracted more content
        if (normalizedRetry.text.length > normalized.text.length) {
          normalized = normalizedRetry;
        }
      } catch (retryErr) {
        console.warn(`[OCR] Pass 2 sparse retry was bypassed: ${retryErr.message}`);
      } finally {
        if (retryWorker) {
          await retryWorker.terminate().catch(() => {});
          retryWorker = null;
        }
      }
    }

    const elapsedMs = Date.now() - startTime;
    const hasText = normalized.text.length >= 8;

    // Log diagnostic metrics without exposing sensitive patient details (PHI)
    console.log(`[OCR] Completed in ${elapsedMs}ms. Extracted ${normalized.text.length} chars, confidence: ${normalized.confidence}%, words: ${normalized.words.length}.`);

    return {
      text: normalized.text,
      confidence: normalized.confidence,
      hasText,
      isImage: true,
      lines: normalized.lines,
      words: normalized.words,
      blocks: normalized.blocks,
      wordCount: normalized.words.length,
      lineCount: normalized.lines.length,
      isHandwrittenCandidate: normalized.isHandwrittenCandidate,
      message: hasText
        ? 'Text extracted successfully from image via OCR.'
        : "We couldn't extract readable text from this document image.",
    };
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[OCR] Processing error after ${elapsedMs}ms: ${error.message}`);
    return {
      text: '',
      confidence: 0,
      hasText: false,
      isImage: true,
      message: `OCR processing failed safely: ${error.message}`,
    };
  }
};

module.exports = {
  extractTextFromImage,
  resolveTrainedDataDir,
};
