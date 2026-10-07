const vectorSearch = require('./vectorSearch');

class ChunkRetriever {
  /**
   * Retrieves the most relevant chunks across all authorized documents for the user.
   */
  retrieveChunks(query, userDocuments = [], topK = 4) {
    if (!userDocuments || userDocuments.length === 0) {
      return [];
    }

    // Flatten all chunks with their parent document metadata
    const allChunks = [];
    for (const doc of userDocuments) {
      if (doc.chunks && Array.isArray(doc.chunks)) {
        for (const c of doc.chunks) {
          allChunks.push({
            documentId: doc._id,
            fileName: doc.fileName,
            documentType: doc.documentType,
            chunkText: c.chunkText,
            createdAt: doc.createdAt,
          });
        }
      } else if (doc.extractedText) {
        // Fallback if chunks array not yet populated
        allChunks.push({
          documentId: doc._id,
          fileName: doc.fileName,
          documentType: doc.documentType,
          chunkText: doc.extractedText.substring(0, 1000),
          createdAt: doc.createdAt,
        });
      }
    }

    return vectorSearch.search(query, allChunks, topK);
  }
}

module.exports = new ChunkRetriever();
