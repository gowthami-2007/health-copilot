const embeddingService = require('../embeddings/embeddingService');

class VectorSearch {
  /**
   * Searches a set of document chunks against a user query.
   * Returns top-k ranked chunks with relevance score.
   */
  search(query, chunks = [], topK = 4) {
    if (!query || chunks.length === 0) {
      return [];
    }

    const queryVector = embeddingService.computeTermVector(query);

    const scored = chunks.map((chunk) => {
      const chunkVector = embeddingService.computeTermVector(chunk.chunkText);
      const score = embeddingService.calculateSimilarity(queryVector, chunkVector);
      return {
        ...chunk,
        score,
      };
    });

    // Sort descending by similarity score
    scored.sort((a, b) => b.score - a.score);

    // Return top-k chunks that have meaningful relevance
    return scored.slice(0, topK).filter((c) => c.score > 0.05);
  }
}

module.exports = new VectorSearch();
