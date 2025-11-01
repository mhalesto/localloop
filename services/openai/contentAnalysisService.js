/**
 * Content Analysis Service
 * Provides content warnings and sentiment analysis using FREE OpenAI Moderation API
 * This extracts additional value from the moderation data we're already getting
 */

import { analyzePostContent } from './moderationService';

/**
 * Content warning categories
 */
export const WARNING_CATEGORIES = {
  VIOLENCE: {
    label: 'Violence',
    icon: '⚠️',
    color: '#FF5722',
    description: 'Contains descriptions of violence',
  },
  MENTAL_HEALTH: {
    label: 'Mental Health',
    icon: '🧠',
    color: '#9C27B0',
    description: 'Discusses self-harm or mental health crises',
  },
  SEXUAL: {
    label: 'Adult Content',
    icon: '🔞',
    color: '#E91E63',
    description: 'Contains sexual content',
  },
  HATE: {
    label: 'Hate Speech',
    icon: '🚫',
    color: '#B71C1C',
    description: 'May contain hate speech or harassment',
  },
  DISTURBING: {
    label: 'Graphic Content',
    icon: '⛔',
    color: '#F44336',
    description: 'Contains graphic or disturbing content',
  },
};

/**
 * Sentiment types
 */
export const SENTIMENTS = {
  POSITIVE: { label: 'Positive', icon: '😊', color: '#4CAF50' },
  NEUTRAL: { label: 'Neutral', icon: '😐', color: '#9E9E9E' },
  NEGATIVE: { label: 'Negative', icon: '😔', color: '#FF9800' },
  URGENT: { label: 'Urgent', icon: '🚨', color: '#F44336' },
  CELEBRATORY: { label: 'Celebratory', icon: '🎉', color: '#FFD700' },
  SEEKING_ADVICE: { label: 'Seeking Advice', icon: '❓', color: '#2196F3' },
};

/**
 * Analyze content and generate warnings
 * Uses the FREE moderation API data
 * @param {string} title - Post title
 * @param {string} message - Post message
 * @returns {Promise<Object>} Analysis with warnings and sentiment
 */
export async function analyzeContent(title, message) {
  try {
    // Get moderation data (FREE API)
    const moderation = await analyzePostContent({ title, message });

    const warnings = [];
    const scores = moderation.scores || {};
    const categories = moderation.categories || {};

    // Generate content warnings based on moderation scores
    // Violence warnings
    if (scores['violence'] > 0.5 || scores['violence/graphic'] > 0.3) {
      if (scores['violence/graphic'] > 0.3) {
        warnings.push('DISTURBING');
      } else {
        warnings.push('VIOLENCE');
      }
    }

    // Mental health warnings
    if (
      scores['self-harm'] > 0.4 ||
      scores['self-harm/intent'] > 0.3 ||
      scores['self-harm/instructions'] > 0.2
    ) {
      warnings.push('MENTAL_HEALTH');
    }

    // Sexual content warnings
    if (scores['sexual'] > 0.6 || scores['sexual/minors'] > 0.1) {
      warnings.push('SEXUAL');
    }

    // Hate speech warnings
    if (
      scores['hate'] > 0.5 ||
      scores['hate/threatening'] > 0.3 ||
      scores['harassment'] > 0.6 ||
      scores['harassment/threatening'] > 0.4
    ) {
      warnings.push('HATE');
    }

    // Determine sentiment from moderation data + text analysis
    const sentiment = determineSentiment(title, message, scores);

    return {
      warnings: warnings.map(w => WARNING_CATEGORIES[w]),
      sentiment,
      moderation,
      hasWarnings: warnings.length > 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.warn('[Content Analysis] Failed:', error.message);

    // Fallback: basic text analysis
    return {
      warnings: [],
      sentiment: basicSentimentFromText(title, message),
      hasWarnings: false,
      error: error.message,
    };
  }
}

/**
 * Determine sentiment from text and moderation scores
 */
function determineSentiment(title, message, scores) {
  const text = `${title} ${message}`.toLowerCase();

  // Check for urgent/crisis keywords
  const urgentKeywords = ['help', 'urgent', 'emergency', 'asap', 'crisis', 'please help'];
  const isUrgent = urgentKeywords.some(kw => text.includes(kw));

  if (isUrgent || scores['self-harm/intent'] > 0.5) {
    return SENTIMENTS.URGENT;
  }

  // Check for celebratory keywords
  const celebratoryKeywords = [
    'celebrate',
    'congrat',
    'success',
    'won',
    'achieved',
    'proud',
    'excited',
    'finally',
    'great news',
  ];
  const isCelebratory = celebratoryKeywords.some(kw => text.includes(kw));

  if (isCelebratory) {
    return SENTIMENTS.CELEBRATORY;
  }

  // Check for advice-seeking
  const adviceKeywords = [
    'should i',
    'what do',
    'how do',
    'advice',
    'help me',
    'recommend',
    'suggest',
    'any idea',
  ];
  const isSeekingAdvice = adviceKeywords.some(kw => text.includes(kw)) || text.includes('?');

  if (isSeekingAdvice) {
    return SENTIMENTS.SEEKING_ADVICE;
  }

  // Check for negative indicators
  const negativeScore =
    (scores['violence'] || 0) * 0.3 +
    (scores['hate'] || 0) * 0.4 +
    (scores['harassment'] || 0) * 0.3;

  if (negativeScore > 0.3) {
    return SENTIMENTS.NEGATIVE;
  }

  // Check for positive/negative keywords
  const positiveKeywords = ['happy', 'great', 'good', 'love', 'thank', 'amazing', 'wonderful'];
  const negativeKeywords = [
    'bad',
    'hate',
    'angry',
    'frustrated',
    'terrible',
    'worst',
    'annoyed',
  ];

  const positiveCount = positiveKeywords.filter(kw => text.includes(kw)).length;
  const negativeCount = negativeKeywords.filter(kw => text.includes(kw)).length;

  if (positiveCount > negativeCount) {
    return SENTIMENTS.POSITIVE;
  } else if (negativeCount > positiveCount) {
    return SENTIMENTS.NEGATIVE;
  }

  return SENTIMENTS.NEUTRAL;
}

/**
 * Basic sentiment analysis from text only (fallback)
 */
function basicSentimentFromText(title, message) {
  const text = `${title} ${message}`.toLowerCase();

  // Urgent check
  if (
    text.includes('help') ||
    text.includes('urgent') ||
    text.includes('emergency') ||
    text.includes('crisis')
  ) {
    return SENTIMENTS.URGENT;
  }

  // Celebratory check
  if (text.includes('celebrate') || text.includes('success') || text.includes('proud')) {
    return SENTIMENTS.CELEBRATORY;
  }

  // Question check
  if (text.includes('?') || text.includes('advice') || text.includes('should i')) {
    return SENTIMENTS.SEEKING_ADVICE;
  }

  return SENTIMENTS.NEUTRAL;
}

/**
 * Check if content needs a warning overlay
 */
export function needsWarningOverlay(warnings) {
  if (!warnings || warnings.length === 0) return false;

  // Show overlay for serious warnings
  const seriousWarnings = ['DISTURBING', 'MENTAL_HEALTH', 'HATE'];
  return warnings.some(w => seriousWarnings.includes(w.label));
}

/**
 * Get warning display text
 */
export function getWarningText(warnings) {
  if (!warnings || warnings.length === 0) return null;

  if (warnings.length === 1) {
    return warnings[0].description;
  }

  return `This content may contain ${warnings.map(w => w.label.toLowerCase()).join(', ')}`;
}
