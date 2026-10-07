/**
 * Lightweight local text vectorization and term frequency embedding service.
 * Enables vector retrieval without requiring external paid vector database services.
 */

class EmbeddingService {
  /**
   * Tokenizes and normalizes text into lowercase words.
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  /**
   * Computes term frequency vector representation for a given text.
   */
  computeTermVector(text) {
    const tokens = this.tokenize(text);
    const freq = {};
    for (const t of tokens) {
      freq[t] = (freq[t] || 0) + 1;
    }
    return freq;
  }

  /**
   * Calculates cosine similarity between a query vector and a document chunk vector.
   */
  calculateSimilarity(queryVector, docVector) {
    const queryKeys = Object.keys(queryVector);
    if (queryKeys.length === 0) return 0;

    let dotProduct = 0;
    let queryNorm = 0;
    let docNorm = 0;

    for (const key of queryKeys) {
      queryNorm += queryVector[key] * queryVector[key];
      if (docVector[key]) {
        dotProduct += queryVector[key] * docVector[key];
      }
    }

    for (const key in docVector) {
      docNorm += docVector[key] * docVector[key];
    }

    if (queryNorm === 0 || docNorm === 0) return 0;

    return dotProduct / (Math.sqrt(queryNorm) * Math.sqrt(docNorm));
  }
}

module.exports = new EmbeddingService();
