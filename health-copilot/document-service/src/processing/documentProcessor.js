const { validateFile } = require('../validation/fileValidator');
const { extractText } = require('../extraction/textExtractor');
const { createChunks } = require('../chunking/chunkService');

const processDocumentFile = async (filePath, mimetype, fileSize) => {
  // 1. Validate file format and size
  const validation = validateFile({ mimetype, size: fileSize, originalname: filePath });
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

    if (!extractionResult.hasText) {
      return {
        success: false,
        error: extractionResult.message || "We couldn't extract readable text from this document.",
        extractedText: '',
        chunks: [],
      };
    }

    // 3. Chunk text for vector/RAG indexing
    const chunks = createChunks(extractionResult.text);

    return {
      success: true,
      error: null,
      extractedText: extractionResult.text,
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
