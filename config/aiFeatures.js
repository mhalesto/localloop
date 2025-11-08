/**
 * AI Features Configuration
 *
 * MASTER CONTROL: Set features to false here to disable them completely
 * These settings override user preferences - if disabled here, users cannot enable them
 *
 * If enabled here, premium users can toggle them in settings
 */

export const AI_FEATURES_CONFIG = {
  // ============================================================================
  // CORE FEATURES (Already Integrated)
  // ============================================================================

  /**
   * Content Moderation (FREE OpenAI API)
   * Automatically detects harmful content
   * Cost: FREE (unlimited)
   */
  moderation: {
    enabled: true,
    requiresPremium: false, // Always available
    forceEnabled: true, // Cannot be disabled by users (safety feature)
  },

  /**
   * Auto-Tagging
   * Categorizes posts into 27 topics
   * Cost: ~$0.002 per post
   */
  autoTagging: {
    enabled: true,
    requiresPremium: false, // Available to all users
    userCanToggle: true, // Users can disable in settings
  },

  /**
   * AI Summarization
   * Summarizes long post descriptions
   * Basic/Premium: Hugging Face BART (FREE)
   * Gold: GPT-4o with style options (~$0.002 per summary)
   */
  summarization: {
    enabled: true,
    requiresPremium: false, // Available to all users
    goldEnhancement: true, // Gold users get GPT-4o instead of BART
    userCanToggle: true, // Users can disable in settings
  },

  /**
   * Content Warnings (FREE - extracted from moderation)
   * Shows warnings for violence, mental health, etc.
   * Cost: FREE
   */
  contentWarnings: {
    enabled: true,
    requiresPremium: false,
    userCanToggle: false, // Always shown for safety
  },

  /**
   * Sentiment Analysis (FREE - extracted from moderation)
   * Detects post sentiment (positive, urgent, etc.)
   * Cost: FREE
   */
  sentimentAnalysis: {
    enabled: true,
    requiresPremium: false,
    userCanToggle: true, // Users can hide sentiment badges
  },

  // ============================================================================
  // NEW FEATURES (Services ready, UI pending)
  // ============================================================================

  /**
   * Thread Summarization
   * Summarizes long comment threads
   * Cost: ~$0.0035 per thread
   */
  threadSummarization: {
    enabled: true,
    requiresPremium: true, // Premium feature
    userCanToggle: true,
  },

  /**
   * Smart Comment Suggestions
   * AI-powered comment writing help
   * Premium: Basic suggestions
   * Gold: GPT-4o personalized suggestions with tone control (~$0.003 per suggestion)
   */
  commentSuggestions: {
    enabled: true,
    requiresPremium: true, // Premium feature
    goldEnhancement: true, // Gold users get GPT-4o suggestions
    userCanToggle: true,
  },

  /**
   * Title Generation
   * Auto-generate post titles from content
   * Cost: ~$0.001 per title
   */
  titleGeneration: {
    enabled: true,
    requiresPremium: false, // FREE for testing
    userCanToggle: true,
  },

  /**
   * Language Translation
   * Translate posts to 11 South African languages
   * Cost: ~$0.003 per translation
   */
  translation: {
    enabled: true,
    requiresPremium: true, // Premium feature
    userCanToggle: true,
  },

  /**
   * Duplicate Post Detection
   * Warns before posting similar content
   * Cost: ~$0.00002 per check (very cheap)
   */
  duplicateDetection: {
    enabled: true, // ✅ ENABLED
    requiresPremium: false,
    userCanToggle: true,
  },

  /**
   * Semantic Search
   * Search by meaning, not just keywords
   * Cost: ~$0.00002 per search
   */
  semanticSearch: {
    enabled: true, // ✅ ENABLED
    requiresPremium: true,
    userCanToggle: false,
  },

  /**
   * Post Quality Scoring
   * Rates posts and boosts quality content
   * Cost: ~$0.001 per score
   */
  qualityScoring: {
    enabled: true, // ✅ ENABLED
    requiresPremium: true,
    userCanToggle: false,
  },

  /**
   * Profile Cartoon Generator
   * Convert profile picture to cartoon/artistic styles
   * Basic/Premium: Generic cartoon styles (DALL-E 3 Standard ~$0.04)
   * Gold: Personalized with GPT-4o Vision analysis + HD quality (~$0.05)
   * Usage limits: Basic=5 lifetime, Premium=10/month, Gold=20/month
   * Gold Exclusive: Custom text prompts + Vision-analyzed personalization
   */
  profileCartoon: {
    enabled: true, // ✅ ENABLED
    requiresPremium: false, // Basic gets 5, Premium gets 10/month, Gold gets 20/month
    goldEnhancement: true, // Gold gets Vision analysis + HD quality
    userCanToggle: false, // Always available (usage limited by plan)
  },

  // ============================================================================
  // GOLD-EXCLUSIVE FEATURES (GPT-4o Powered)
  // ============================================================================

  /**
   * Smart Post Composer (GOLD ONLY)
   * AI-assisted post writing with GPT-4o
   * Helps users write engaging posts based on their ideas
   * Cost: ~$0.01 per composition
   */
  smartComposer: {
    enabled: true, // ✅ ENABLED
    requiresPremium: true,
    requiresGold: true, // GOLD ONLY
    userCanToggle: true,
  },

  /**
   * Enhanced Translation (GOLD ONLY)
   * GPT-4o translation with cultural context
   * More natural and culturally aware than basic translation
   * Cost: ~$0.005 per translation
   */
  enhancedTranslation: {
    enabled: true, // ✅ ENABLED
    requiresPremium: true,
    requiresGold: true, // GOLD ONLY
    userCanToggle: true,
  },
};

/**
 * Check if a feature is available for a user
 * @param {string} featureName - Name of the feature
 * @param {boolean} isPremium - Whether user has premium
 * @param {Object} userPreferences - User's feature preferences
 * @param {string} subscriptionPlan - User's subscription plan ('basic' | 'premium' | 'gold')
 * @returns {boolean} Whether feature should be active
 */
export function isFeatureEnabled(featureName, isPremium = false, userPreferences = {}, subscriptionPlan = 'basic') {
  const feature = AI_FEATURES_CONFIG[featureName];

  if (!feature) {
    console.warn(`[AI Features] Unknown feature: ${featureName}`);
    return false;
  }

  // Master kill switch - if disabled in config, feature is off for everyone
  if (!feature.enabled) {
    return false;
  }

  // If feature is force enabled (like moderation), always on
  if (feature.forceEnabled) {
    return true;
  }

  // Check Gold requirement
  if (feature.requiresGold && subscriptionPlan !== 'gold') {
    return false;
  }

  // Check premium requirement
  if (feature.requiresPremium && !isPremium) {
    return false;
  }

  // Check user preference (if they can toggle)
  if (feature.userCanToggle && userPreferences[featureName] === false) {
    return false;
  }

  // Feature is available!
  return true;
}

/**
 * Get all features available to a user
 * @param {boolean} isPremium - Whether user has premium
 * @param {Object} userPreferences - User's feature preferences
 * @returns {Object} Object with feature names as keys, enabled state as values
 */
export function getAvailableFeatures(isPremium = false, userPreferences = {}) {
  const available = {};

  Object.keys(AI_FEATURES_CONFIG).forEach(featureName => {
    available[featureName] = isFeatureEnabled(featureName, isPremium, userPreferences);
  });

  return available;
}

/**
 * Get features that user can toggle in settings
 * @param {boolean} isPremium - Whether user has premium
 * @returns {Array} Array of feature objects
 */
export function getTogglableFeatures(isPremium = false) {
  return Object.entries(AI_FEATURES_CONFIG)
    .filter(([name, config]) => {
      // Feature must be enabled in master config
      if (!config.enabled) return false;
      // Feature must allow user toggling
      if (!config.userCanToggle) return false;
      // Feature must not require premium, or user must have premium
      if (config.requiresPremium && !isPremium) return false;
      return true;
    })
    .map(([name, config]) => ({
      name,
      config,
    }));
}

/**
 * Feature display information for UI
 */
export const FEATURE_INFO = {
  moderation: {
    title: 'Content Moderation',
    description: 'Automatically detects harmful content',
    icon: '🛡️',
    badge: 'FREE',
  },
  autoTagging: {
    title: 'Auto-Tagging',
    description: 'Categorizes posts automatically',
    icon: '🏷️',
    badge: null,
  },
  summarization: {
    title: 'AI Summaries',
    description: 'Summarize long posts',
    icon: '📝',
    badge: null,
  },
  contentWarnings: {
    title: 'Content Warnings',
    description: 'Warns about sensitive content',
    icon: '⚠️',
    badge: 'FREE',
  },
  sentimentAnalysis: {
    title: 'Sentiment Detection',
    description: 'Detects post mood and tone',
    icon: '😊',
    badge: 'FREE',
  },
  threadSummarization: {
    title: 'Thread Summaries',
    description: 'Summarize long discussions',
    icon: '💬',
    badge: 'PREMIUM',
  },
  commentSuggestions: {
    title: 'Smart Replies',
    description: 'AI-powered comment suggestions',
    icon: '💡',
    badge: 'PREMIUM',
  },
  titleGeneration: {
    title: 'Title Generator',
    description: 'Auto-generate post titles',
    icon: '✨',
    badge: 'PREMIUM',
  },
  translation: {
    title: 'Translation',
    description: 'Translate to 11 languages',
    icon: '🌍',
    badge: 'PREMIUM',
  },
  duplicateDetection: {
    title: 'Duplicate Detection',
    description: 'Prevents duplicate posts',
    icon: '🔍',
    badge: null,
  },
  semanticSearch: {
    title: 'Smart Search',
    description: 'Search by meaning',
    icon: '🔎',
    badge: 'PREMIUM',
  },
  qualityScoring: {
    title: 'Quality Scoring',
    description: 'Rates post quality',
    icon: '⭐',
    badge: 'PREMIUM',
  },
  profileCartoon: {
    title: 'Cartoon Profile',
    description: 'AI-generated cartoon avatar',
    icon: '🎨',
    badge: null,
    goldDescription: 'Personalized with GPT-4o Vision + HD quality',
  },
  smartComposer: {
    title: 'AI Post Composer',
    description: 'GPT-4o helps write engaging posts',
    icon: '✍️',
    badge: 'GOLD',
  },
  enhancedTranslation: {
    title: 'Smart Translation',
    description: 'GPT-4o with cultural context',
    icon: '🌐',
    badge: 'GOLD',
  },
};

/**
 * Get feature info for display
 */
export function getFeatureInfo(featureName) {
  return FEATURE_INFO[featureName] || {
    title: featureName,
    description: 'AI feature',
    icon: '🤖',
    badge: null,
  };
}

// Export default for convenience
export default AI_FEATURES_CONFIG;
