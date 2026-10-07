const fs = require('fs');
const Tesseract = require('tesseract.js');
const { cleanText } = require('../cleaning/textCleaner');

/**
 * Image / OCR handler.
 * Uses Tesseract.js to perform OCR directly in Node.js on JPG/JPEG/PNG documents.
 */
const extractTextFromImage = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('Image file not found on disk');
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('Image file is empty');
    }

    console.log(`[OCR] Starting Tesseract OCR recognition on: ${filePath}`);
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
    const cleaned = cleanText(text || '');

    console.log(`[OCR] Recognition complete. Extracted ${cleaned.length} characters.`);

    return {
      text: cleaned,
      hasText: cleaned.length > 10,
      isImage: true,
      message: cleaned.length > 10
        ? 'Text extracted successfully from image via OCR.'
        : "We couldn't extract readable text from this document image.",
    };
  } catch (error) {
    console.error(`[OCR] Processing error: ${error.message}`);
    return {
      text: '',
      hasText: false,
      isImage: true,
      message: `OCR processing failed: ${error.message}`,
    };
  }
};

module.exports = {
  extractTextFromImage,
};
