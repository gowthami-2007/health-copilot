const { validateFile } = require('../validation/fileValidator');
const { extractText } = require('../extraction/textExtractor');
const { createChunks } = require('../chunking/chunkService');

const processDocumentFile = async (filePath, mimetype, fileSize) => {
  // 1. Validate file format, size, and binary signature
  const validation = validateFile({ mimetype, size: fileSize, originalname: filePath, path: filePath });
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
      extractedText: '',
      chunks: [],
    };
  }

  // 2. Extract text
  try {
    const extractionResult = await extractText(filePath, mimetype);

    if (!extractionResult || !extractionResult.hasText) {
      return {
        success: false,
        error: (extractionResult && extractionResult.message) || "We couldn't extract readable text from this document.",
        extractedText: extractionResult ? extractionResult.text || '' : '',
        chunks: [],
        confidence: extractionResult ? extractionResult.confidence || 0 : 0,
      };
    }

    // 3. Chunk text for vector/RAG indexing
    const chunks = createChunks(extractionResult.text);

    return {
      success: true,
      error: null,
      extractedText: extractionResult.text,
      confidence: extractionResult.confidence || 0,
      isImage: Boolean(extractionResult.isImage),
      isHandwrittenCandidate: Boolean(extractionResult.isHandwrittenCandidate),
      words: Array.isArray(extractionResult.words) ? extractionResult.words : [],
      lines: Array.isArray(extractionResult.lines) ? extractionResult.lines : [],
      chunks,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error occurred while processing file',
      extractedText: '',
      chunks: [],
    };
  }
};

module.exports = {
  processDocumentFile,
};
