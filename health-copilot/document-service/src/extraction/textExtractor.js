const { extractTextFromPdf } = require('./pdfExtractor');
const { extractTextFromImage } = require('../ocr/ocrService');

const extractText = async (filePath, mimetype) => {
  if (mimetype === 'application/pdf') {
    return await extractTextFromPdf(filePath);
  } else if (
    mimetype === 'image/jpeg' ||
    mimetype === 'image/jpg' ||
    mimetype === 'image/png'
  ) {
    return await extractTextFromImage(filePath);
  } else {
    throw new Error(`Unsupported document MIME type: ${mimetype}`);
  }
};

module.exports = {
  extractText,
};
