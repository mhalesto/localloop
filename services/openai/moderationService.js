/**
 * OpenAI Moderation Service
 * FREE API - detects harmful content
 * Much faster and more reliable than Hugging Face
 */

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';

/**
 * Moderation categories and thresholds
 */
const MODERATION_THRESHOLDS = {
  // Block immediately
  'sexual/minors': 0.1,
  'violence/graphic': 0.5,
  'self-harm/intent': 0.5,
  'self-harm/instructions': 0.5,

  // Review before publishing
  'hate': 0.6,
  'hate/threatening': 0.4,
  'harassment': 0.7,
  'harassment/threatening': 0.5,
  'sexual': 0.7,
  'violence': 0.7,
  'self-harm': 0.6,
};

/**
 * Call OpenAI Moderation API (FREE)
 */
async function callModerationAPI(text) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(OPENAI_MODERATION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Moderation API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Moderation timeout');
    }
    throw error;
  }
}

/**
 * Analyze content and determine action
 */
export async function analyzePostContent({ title = '', message = '' } = {}) {
  const text = [title, message].filter(Boolean).join('\n\n');

  if (!text.trim()) {
    return {
      action: 'approve',
      flagged: false,
      categories: {},
      scores: {},
      matchedLabels: [],
    };
  }

  try {
    const result = await callModerationAPI(text);

    if (!result.results || result.results.length === 0) {
      return {
        action: 'approve',
        flagged: false,
        categories: {},
        scores: {},
        matchedLabels: [],
      };
    }

    const moderation = result.results[0];
    const categories = moderation.categories || {};
    const scores = moderation.category_scores || {};

    // Determine which categories are flagged
    const flaggedCategories = [];
    const shouldBlock = [];
    const shouldReview = [];

    for (const [category, threshold] of Object.entries(MODERATION_THRESHOLDS)) {
      const score = scores[category] || 0;

      if (score >= threshold) {
        flaggedCategories.push(category);

        // Determine severity
        if (category.includes('minors') || category.includes('graphic') || category.includes('intent') || category.includes('instructions')) {
          shouldBlock.push(category);
        } else {
          shouldReview.push(category);
        }
      }
    }

    // Decide action
    let action = 'approve';
    if (shouldBlock.length > 0) {
      action = 'block';
    } else if (shouldReview.length > 0) {
      action = 'review';
    }

    return {
      action,
      flagged: moderation.flagged || flaggedCategories.length > 0,
      categories,
      scores,
      matchedLabels: flaggedCategories,
      raw: moderation,
    };
  } catch (error) {
    console.warn('[OpenAI Moderation] Failed:', error.message);

    // Default to approve on error (don't block legitimate content)
    return {
      action: 'approve',
      flagged: false,
      categories: {},
      scores: {},
      matchedLabels: [],
      error: error.message,
    };
  }
}

/**
 * Human-readable category names
 */
export const CATEGORY_LABELS = {
  'hate': 'hate speech',
  'hate/threatening': 'threatening hate speech',
  'harassment': 'harassment',
  'harassment/threatening': 'threatening harassment',
  'self-harm': 'self-harm content',
  'self-harm/intent': 'self-harm intent',
  'self-harm/instructions': 'self-harm instructions',
  'sexual': 'sexual content',
  'sexual/minors': 'sexual content involving minors',
  'violence': 'violence',
  'violence/graphic': 'graphic violence',
};

export function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}
