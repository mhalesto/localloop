/**
 * OpenAI Summarization Service
 * Uses GPT-3.5-turbo for high-quality text summarization
 * Much faster and more reliable than Hugging Face
 */

import { callOpenAI, OPENAI_ENDPOINTS } from './config';

/**
 * Quality levels for summarization
 */
const QUALITY_SETTINGS = {
  fast: {
    maxTokens: 100,
    temperature: 0.3,
    systemPrompt: 'You are a summarization assistant. Create a brief, clear summary in 2-3 sentences.',
  },
  balanced: {
    maxTokens: 150,
    temperature: 0.5,
    systemPrompt: 'You are a summarization assistant. Create a clear, comprehensive summary that captures the main points.',
  },
  best: {
    maxTokens: 200,
    temperature: 0.7,
    systemPrompt: 'You are a summarization assistant. Create a detailed, nuanced summary that captures the key points, tone, and context.',
  },
};

/**
 * Summarize text using OpenAI GPT-3.5-turbo
 * @param {string} text - Text to summarize
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Summary result
 */
export async function summarizeText(text, options = {}) {
  const {
    quality = 'best', // 'fast', 'balanced', 'best'
    timeout = 15000, // 15 seconds
  } = options;

  if (!text || text.trim().length < 20) {
    return {
      summary: text,
      method: 'passthrough',
      error: 'Text too short to summarize',
    };
  }

  const settings = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.balanced;

  try {
    // Truncate very long texts to stay within token limits
    const truncatedText = text.length > 3000 ? text.substring(0, 3000) + '...' : text;

    const data = await callOpenAI(OPENAI_ENDPOINTS.CHAT, {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: settings.systemPrompt },
        { role: 'user', content: `Summarize this text:\n\n${truncatedText}` },
      ],
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    });

    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error('No summary in OpenAI response');
    }

    return {
      summary,
      method: 'openai',
      quality,
      model: 'gpt-3.5-turbo',
      tokens: data.usage?.total_tokens || 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('[OpenAI Summary] Timeout after', timeout, 'ms');
      throw new Error('Summarization timeout');
    }

    console.warn('[OpenAI Summary] Failed:', error.message);
    throw error;
  }
}

/**
 * Fallback extractive summarization (simple first sentences)
 */
export function extractiveSummary(text, maxSentences = 3) {
  if (!text || text.trim().length === 0) {
    return '';
  }

  // Split into sentences (basic approach)
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (sentences.length === 0) {
    return text.substring(0, 200);
  }

  // Take first N sentences
  const summary = sentences
    .slice(0, maxSentences)
    .join('. ') + (sentences.length > maxSentences ? '...' : '.');

  return summary;
}

/**
 * Smart summarization with fallback
 * Tries OpenAI first, falls back to extractive if it fails
 */
export async function smartSummarize(text, options = {}) {
  try {
    return await summarizeText(text, options);
  } catch (error) {
    console.warn('[OpenAI Summary] Using fallback summarization:', error.message);

    // Fallback to extractive summary
    return {
      summary: extractiveSummary(text, 3),
      method: 'extractive',
      error: error.message,
      timestamp: Date.now(),
    };
  }
}
