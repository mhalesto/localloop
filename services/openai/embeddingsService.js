/**
 * Embeddings Service
 * Provides semantic search and duplicate detection using OpenAI text-embedding-3-small
 * Very cost-effective: $0.00002 per 1000 tokens (~$0.00002 per post)
 */

import { getOpenAIHeaders, OPENAI_ENDPOINTS } from './config';

/**
 * Generate embedding vector for text
 * @param {string} text - Text to embed
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Embedding result with vector
 */
export async function generateEmbedding(text, options = {}) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for embedding');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

  try {
    // Truncate to avoid token limits
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

    const response = await fetch(OPENAI_ENDPOINTS.EMBEDDINGS, {
      method: 'POST',
      headers: getOpenAIHeaders(),
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Fast, cheap, good quality
        input: truncatedText,
        encoding_format: 'float',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Embeddings] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;

    if (!embedding) {
      throw new Error('No embedding in OpenAI response');
    }

    return {
      embedding,
      dimensions: embedding.length,
      model: 'text-embedding-3-small',
      tokens: data.usage?.total_tokens || 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Embedding timeout');
    }

    console.warn('[Embeddings] Failed:', error.message);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns value between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    throw new Error('Invalid vectors for similarity calculation');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find similar posts using embeddings
 * @param {string} query - Query text (new post content)
 * @param {Array} posts - Existing posts with embeddings
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Sorted array of similar posts
 */
export async function findSimilarPosts(query, posts, options = {}) {
  const { threshold = 0.7, maxResults = 5 } = options;

  try {
    // Generate embedding for query
    const queryResult = await generateEmbedding(query);
    const queryEmbedding = queryResult.embedding;

    // Calculate similarity with each post
    const similarities = posts
      .filter(post => post.embedding) // Only posts with embeddings
      .map(post => ({
        ...post,
        similarity: cosineSimilarity(queryEmbedding, post.embedding),
      }))
      .filter(post => post.similarity >= threshold) // Filter by threshold
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity
      .slice(0, maxResults); // Limit results

    return similarities;
  } catch (error) {
    console.warn('[Similar Posts] Failed:', error.message);
    return [];
  }
}

/**
 * Check for duplicate posts
 * @param {string} newPostText - Text of new post
 * @param {Array} recentPosts - Recent posts to check against
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Duplicate detection result
 */
export async function checkDuplicate(newPostText, recentPosts, options = {}) {
  const { threshold = 0.85 } = options; // Higher threshold for duplicates

  try {
    const similar = await findSimilarPosts(newPostText, recentPosts, {
      threshold,
      maxResults: 3,
    });

    const isDuplicate = similar.length > 0 && similar[0].similarity >= threshold;

    return {
      isDuplicate,
      similarPosts: similar,
      highestSimilarity: similar[0]?.similarity || 0,
      method: 'embeddings',
    };
  } catch (error) {
    console.warn('[Duplicate Check] Failed:', error.message);

    // Fallback: simple keyword matching
    return {
      isDuplicate: false,
      similarPosts: [],
      method: 'fallback',
      error: error.message,
    };
  }
}

/**
 * Semantic search across posts
 * @param {string} query - Search query
 * @param {Array} posts - Posts to search
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Search results
 */
export async function semanticSearch(query, posts, options = {}) {
  const { threshold = 0.5, maxResults = 20 } = options;

  try {
    const results = await findSimilarPosts(query, posts, {
      threshold,
      maxResults,
    });

    return {
      results,
      query,
      resultCount: results.length,
      method: 'semantic',
    };
  } catch (error) {
    console.warn('[Semantic Search] Failed:', error.message);

    // Fallback: keyword search
    const lowerQuery = query.toLowerCase();
    const keywordResults = posts
      .filter(post => {
        const text = `${post.title} ${post.message}`.toLowerCase();
        return text.includes(lowerQuery);
      })
      .slice(0, maxResults);

    return {
      results: keywordResults,
      query,
      resultCount: keywordResults.length,
      method: 'keyword-fallback',
    };
  }
}

/**
 * Generate embedding for a post (title + message)
 * @param {Object} post - Post object
 * @returns {Promise<Object>} Embedding result
 */
export async function generatePostEmbedding(post) {
  const text = `${post.title || ''}\n\n${post.message || ''}`.trim();
  return generateEmbedding(text);
}
