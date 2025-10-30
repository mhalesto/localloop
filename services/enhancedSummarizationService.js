// Enhanced Summarization Service with multiple fallback strategies
import { Platform } from 'react-native';

// Configuration for different summarization strategies
const SUMMARIZATION_CONFIG = {
  // Hugging Face Inference API (free tier available)
  huggingFace: {
    baseUrl: 'https://api-inference.huggingface.co/models/',
    models: [
      'facebook/bart-large-cnn',
      'google/pegasus-xsum',
      'sshleifer/distilbart-cnn-12-6',
      'philschmid/bart-large-cnn-samsum'
    ],
    headers: {
      'Content-Type': 'application/json',
      // Note: Set EXPO_PUBLIC_HF_API_KEY in your .env file
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_HF_API_KEY || 'YOUR_HF_API_KEY'}`
    }
  },
  // Open-source local fallback algorithms
  algorithms: {
    extractive: true,
    abstractive: true,
    hybrid: true
  }
};

// Cache for storing recent summaries
const summaryCache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Advanced text preprocessing
 */
const preprocessText = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters but keep punctuation
    .replace(/[^\w\s.,!?;:\-'"]/g, '')
    // Fix common encoding issues
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
};

/**
 * Calculate sentence importance scores using TF-IDF
 */
const calculateSentenceScores = (sentences, words) => {
  // Calculate term frequency
  const wordFreq = {};
  words.forEach(word => {
    const lower = word.toLowerCase();
    wordFreq[lower] = (wordFreq[lower] || 0) + 1;
  });

  // Calculate IDF (simplified - in production, use corpus data)
  const maxFreq = Math.max(...Object.values(wordFreq));
  const tf = {};
  Object.keys(wordFreq).forEach(word => {
    tf[word] = wordFreq[word] / maxFreq;
  });

  // Score sentences
  const sentenceScores = sentences.map(sentence => {
    const sentWords = sentence.toLowerCase().split(/\s+/);
    let score = 0;
    let wordCount = 0;

    sentWords.forEach(word => {
      if (tf[word]) {
        score += tf[word];
        wordCount++;
      }
    });

    // Add position-based weighting (earlier sentences get slight boost)
    const positionBoost = 1 - (sentences.indexOf(sentence) / sentences.length) * 0.2;

    return {
      sentence,
      score: wordCount > 0 ? (score / wordCount) * positionBoost : 0
    };
  });

  return sentenceScores;
};

/**
 * Extractive summarization using sentence ranking
 */
const extractiveSummarize = (text, targetLength = 'balanced') => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length <= 2) return text;

  const words = text.split(/\s+/);
  const sentenceScores = calculateSentenceScores(sentences, words);

  // Sort by score
  sentenceScores.sort((a, b) => b.score - a.score);

  // Determine number of sentences to keep
  let numSentences;
  switch (targetLength) {
    case 'concise':
      numSentences = Math.max(1, Math.ceil(sentences.length * 0.2));
      break;
    case 'detailed':
      numSentences = Math.max(3, Math.ceil(sentences.length * 0.5));
      break;
    default: // balanced
      numSentences = Math.max(2, Math.ceil(sentences.length * 0.33));
  }

  // Select top sentences and maintain original order
  const selectedSentences = sentenceScores
    .slice(0, numSentences)
    .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
    .map(item => item.sentence);

  return selectedSentences.join(' ').trim();
};

/**
 * Keyword-based abstractive summarization
 */
const keywordBasedSummarize = (text, targetLength = 'balanced') => {
  // Extract key phrases
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const words = text.toLowerCase().split(/\s+/);

  // Stop words to filter out
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'can', 'shall', 'to',
    'of', 'in', 'for', 'with', 'by', 'from', 'about', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under'
  ]);

  // Extract keywords
  const keywords = {};
  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      keywords[word] = (keywords[word] || 0) + 1;
    }
  });

  // Sort keywords by frequency
  const topKeywords = Object.entries(keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, targetLength === 'concise' ? 5 : targetLength === 'detailed' ? 15 : 10)
    .map(([word]) => word);

  // Find sentences containing most keywords
  const sentenceKeywordScores = sentences.map(sentence => {
    const sentLower = sentence.toLowerCase();
    const keywordCount = topKeywords.filter(kw => sentLower.includes(kw)).length;
    return { sentence, score: keywordCount };
  });

  // Select sentences with most keywords
  const numSentences = targetLength === 'concise' ? 1 : targetLength === 'detailed' ? 3 : 2;
  const selectedSentences = sentenceKeywordScores
    .sort((a, b) => b.score - a.score)
    .slice(0, numSentences)
    .map(item => item.sentence);

  if (selectedSentences.length === 0) {
    return sentences.slice(0, numSentences).join(' ').trim();
  }

  return selectedSentences.join(' ').trim();
};

/**
 * Hybrid summarization combining extractive and abstractive approaches
 */
const hybridSummarize = (text, targetLength = 'balanced') => {
  const extractive = extractiveSummarize(text, targetLength);
  const keywords = keywordBasedSummarize(text, targetLength);

  // Combine both approaches
  const extractiveSents = extractive.split(/[.!?]+/).filter(s => s.trim());
  const keywordSents = keywords.split(/[.!?]+/).filter(s => s.trim());

  // Remove duplicates while preserving order
  const combined = new Set();
  const result = [];

  [...extractiveSents, ...keywordSents].forEach(sent => {
    const normalized = sent.trim().toLowerCase();
    if (!combined.has(normalized) && sent.trim()) {
      combined.add(normalized);
      result.push(sent.trim());
    }
  });

  // Limit based on target length
  const maxSents = targetLength === 'concise' ? 2 : targetLength === 'detailed' ? 5 : 3;
  return result.slice(0, maxSents).join('. ') + '.';
};

/**
 * Try to use Hugging Face API for summarization
 */
const tryHuggingFaceAPI = async (text, model, targetLength = 'balanced') => {
  const maxLength = targetLength === 'concise' ? 60 : targetLength === 'detailed' ? 250 : 130;
  const minLength = targetLength === 'concise' ? 30 : targetLength === 'detailed' ? 120 : 50;

  try {
    console.log(`[HF API] Trying model: ${model}`);

    // Create a timeout promise
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      SUMMARIZATION_CONFIG.huggingFace.baseUrl + model,
      {
        method: 'POST',
        headers: SUMMARIZATION_CONFIG.huggingFace.headers,
        body: JSON.stringify({
          inputs: text.substring(0, 1024), // Limit input length for API
          parameters: {
            max_length: maxLength,
            min_length: minLength,
            do_sample: false,
            truncation: true
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      console.log(`[HF API] Success with model: ${model}`);
      console.log(`[HF API] Result:`, result);
      return result[0]?.summary_text || result?.summary_text || null;
    } else {
      const error = await response.text();
      console.log(`[HF API] Failed with status ${response.status}: ${error}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[HF API] Timeout for model ${model}`);
    } else {
      console.log(`[HF API] Error with model ${model}:`, error.message);
    }
  }

  return null;
};

/**
 * Main summarization function with multiple strategies
 */
export async function enhancedSummarize(
  text,
  options = {}
) {
  const {
    lengthPreference = 'balanced',
    quality = 'best',
    useCache = true,
    strategy = 'auto'
  } = options;

  // Check cache first
  if (useCache) {
    const cacheKey = `${text.substring(0, 100)}_${lengthPreference}_${quality}`;
    const cached = summaryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        ...cached.data,
        fromCache: true
      };
    }
  }

  const processedText = preprocessText(text);

  if (!processedText || processedText.length < 50) {
    return {
      summary: processedText,
      method: 'passthrough',
      quality: 'original'
    };
  }

  let summary = null;
  let method = null;

  // Strategy 1: Always try Hugging Face API first (since we have an API key)
  if (strategy !== 'local') {
    console.log('[Summarize] Attempting Hugging Face API summarization...');
    for (const model of SUMMARIZATION_CONFIG.huggingFace.models) {
      summary = await tryHuggingFaceAPI(processedText, model, lengthPreference);
      if (summary) {
        method = `huggingface:${model}`;
        console.log('[Summarize] Success with HF API:', model);
        break;
      }
    }

    if (!summary) {
      console.log('[Summarize] All HF models failed, falling back to local algorithms');
    }
  }

  // Strategy 2: Use hybrid approach for best local quality
  if (!summary && (strategy === 'auto' || strategy === 'hybrid')) {
    summary = hybridSummarize(processedText, lengthPreference);
    method = 'hybrid';
  }

  // Strategy 3: Fallback to extractive
  if (!summary && (strategy === 'auto' || strategy === 'extractive')) {
    summary = extractiveSummarize(processedText, lengthPreference);
    method = 'extractive';
  }

  // Strategy 4: Final fallback to keyword-based
  if (!summary) {
    summary = keywordBasedSummarize(processedText, lengthPreference);
    method = 'keyword';
  }

  // Ensure summary is not longer than original
  if (summary && summary.length > text.length) {
    summary = text;
    method = 'original';
  }

  const result = {
    summary: summary || text,
    method: method || 'fallback',
    quality: quality,
    lengthPreference: lengthPreference,
    originalLength: text.length,
    summaryLength: (summary || text).length,
    compressionRatio: ((summary || text).length / text.length * 100).toFixed(1) + '%'
  };

  // Cache the result
  if (useCache && summary) {
    const cacheKey = `${text.substring(0, 100)}_${lengthPreference}_${quality}`;
    summaryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (summaryCache.size > 100) {
      const entries = Array.from(summaryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 50).forEach(([key]) => summaryCache.delete(key));
    }
  }

  return result;
}

/**
 * Backward compatibility wrapper
 */
export async function summarizePostDescription(
  description,
  { lengthPreference = 'balanced', quality = 'fast', signal } = {}
) {
  try {
    // Try enhanced summarization first
    const result = await enhancedSummarize(description, {
      lengthPreference,
      quality,
      strategy: quality === 'best' ? 'auto' : 'hybrid'
    });

    return {
      summary: result.summary,
      model: result.method,
      quality: result.quality,
      fallback: result.method !== 'huggingface',
      options: { lengthPreference }
    };
  } catch (error) {
    // Fallback to simple extraction
    const sentences = description.match(/[^.!?]+[.!?]+/g) || [description];
    const numSentences = lengthPreference === 'concise' ? 1 : lengthPreference === 'detailed' ? 3 : 2;
    const summary = sentences.slice(0, numSentences).join(' ').trim();

    return {
      summary: summary || description,
      model: 'emergency-fallback',
      quality: 'fallback',
      fallback: true,
      options: { lengthPreference }
    };
  }
}

// Export utility functions for testing
export const utils = {
  preprocessText,
  extractiveSummarize,
  keywordBasedSummarize,
  hybridSummarize,
  calculateSentenceScores
};