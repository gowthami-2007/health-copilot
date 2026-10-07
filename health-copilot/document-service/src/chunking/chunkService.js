/**
 * Chunks extracted medical text into overlapping segments optimized for RAG.
 */
const createChunks = (text, chunkSize = 800, overlap = 150) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (trimmed.length <= chunkSize) {
    return [{ chunkText: trimmed }];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < trimmed.length) {
    let endIndex = startIndex + chunkSize;

    // Try not to split in the middle of a sentence or line
    if (endIndex < trimmed.length) {
      const boundaryMatch = trimmed.substring(startIndex, endIndex).search(/(\.\s|\n\n|\n)[^.\n]*$/);
      if (boundaryMatch > chunkSize * 0.6) {
        endIndex = startIndex + boundaryMatch + 1;
      }
    } else {
      endIndex = trimmed.length;
    }

    const chunkContent = trimmed.substring(startIndex, endIndex).trim();
    if (chunkContent.length > 20) {
      chunks.push({
        chunkText: chunkContent,
      });
    }

    if (endIndex >= trimmed.length) {
      break;
    }

    startIndex = Math.max(startIndex + 1, endIndex - overlap);
  }

  return chunks;
};

module.exports = {
  createChunks,
};
