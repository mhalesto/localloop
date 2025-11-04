/**
 * Language Translation Service
 * Translates content between South African languages using OpenAI GPT-3.5-turbo
 */

import { getOpenAIHeaders, OPENAI_ENDPOINTS } from './config';

/**
 * Supported South African languages
 */
export const LANGUAGES = {
  EN: { code: 'en', name: 'English', flag: '🇬🇧' },
  AF: { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  ZU: { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
  XH: { code: 'xh', name: 'Xhosa', flag: '🇿🇦' },
  ST: { code: 'st', name: 'Sotho', flag: '🇿🇦' },
  TN: { code: 'tn', name: 'Tswana', flag: '🇿🇦' },
  SS: { code: 'ss', name: 'Swazi', flag: '🇿🇦' },
  VE: { code: 've', name: 'Venda', flag: '🇿🇦' },
  TS: { code: 'ts', name: 'Tsonga', flag: '🇿🇦' },
  NR: { code: 'nr', name: 'Ndebele', flag: '🇿🇦' },
  NS: { code: 'nso', name: 'Northern Sotho', flag: '🇿🇦' },
};

/**
 * Most commonly used languages (for quick access)
 */
export const COMMON_LANGUAGES = ['en', 'af', 'zu', 'xh'];

/**
 * Detect language of text (best guess)
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} Detected language info
 */
export async function detectLanguage(text) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(OPENAI_ENDPOINTS.CHAT, {
      method: 'POST',
      headers: getOpenAIHeaders(),
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a language detector. Reply with ONLY the 2-letter language code (e.g., "en", "af", "zu"). No other text.',
          },
          {
            role: 'user',
            content: `What language is this text in? Reply with only the language code.\n\n${text.substring(0, 500)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Detection failed: ${response.status}`);
    }

    const data = await response.json();
    const langCode = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    // Find matching language
    const language = Object.values(LANGUAGES).find(l => l.code === langCode);

    return {
      code: langCode,
      name: language?.name || 'Unknown',
      confidence: 0.8,
      method: 'openai',
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[Language Detection] Failed:', error.message);

    // Fallback: assume English
    return {
      code: 'en',
      name: 'English',
      confidence: 0.3,
      method: 'fallback',
    };
  }
}

/**
 * Translate text from one language to another
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g., 'af', 'zu')
 * @param {string} sourceLang - Source language code (optional, auto-detect if not provided)
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Translation result
 */
export async function translateText(text, targetLang, sourceLang = null, options = {}) {
  const targetLanguage = Object.values(LANGUAGES).find(l => l.code === targetLang);
  if (!targetLanguage) {
    throw new Error(`Unsupported target language: ${targetLang}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const sourceText = sourceLang
      ? `from ${LANGUAGES[sourceLang.toUpperCase()]?.name || sourceLang}`
      : '';

    const systemPrompt = `You are a professional translator specializing in South African languages. Translate the text to ${targetLanguage.name} ${sourceText}. Maintain the tone, style, and cultural context. Only return the translation, no explanations.`;

    const response = await fetch(OPENAI_ENDPOINTS.CHAT, {
      method: 'POST',
      headers: getOpenAIHeaders(),
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3, // Lower for more accurate translations
        max_tokens: Math.min(Math.ceil(text.length * 1.5), 4000), // Cap at 4000 tokens (GPT-3.5-turbo limit is 4096)
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Translation] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content?.trim();

    if (!translation) {
      throw new Error('No translation in OpenAI response');
    }

    return {
      original: text,
      translation,
      sourceLang: sourceLang || 'auto',
      targetLang,
      targetLanguageName: targetLanguage.name,
      method: 'openai',
      tokens: data.usage?.total_tokens || 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Translation timeout');
    }

    console.warn('[Translation] Failed:', error.message);
    throw error;
  }
}

/**
 * Translate a post (title + message)
 * @param {Object} post - Post to translate
 * @param {string} targetLang - Target language code
 * @returns {Promise<Object>} Translated post
 */
export async function translatePost(post, targetLang) {
  try {
    const [titleResult, messageResult] = await Promise.all([
      translateText(post.title || '', targetLang, null, { timeout: 30000 }),
      post.message ? translateText(post.message, targetLang, null, { timeout: 30000 }) : Promise.resolve(null),
    ]);

    return {
      title: titleResult.translation,
      message: messageResult?.translation || '',
      targetLang,
      method: 'openai',
    };
  } catch (error) {
    console.warn('[Post Translation] Failed:', error.message);
    throw error;
  }
}

/**
 * Get language name from code
 */
export function getLanguageName(code) {
  const lang = Object.values(LANGUAGES).find(l => l.code === code);
  return lang?.name || code;
}

/**
 * Get language flag from code
 */
export function getLanguageFlag(code) {
  const lang = Object.values(LANGUAGES).find(l => l.code === code);
  return lang?.flag || '🌍';
}
