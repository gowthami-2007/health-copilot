const { validateFile } = require('./validation/fileValidator');
const { extractTextFromPdf } = require('./extraction/pdfExtractor');
const { extractText } = require('./extraction/textExtractor');
const { createChunks } = require('./chunking/chunkService');
const { cleanText } = require('./cleaning/textCleaner');
const { processDocumentFile } = require('./processing/documentProcessor');

module.exports = {
  validateFile,
  extractTextFromPdf,
  extractText,
  createChunks,
  cleanText,
  processDocumentFile,
};
