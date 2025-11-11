/**
 * Subscription Plans Configuration
 * Defines the available subscription tiers for the app
 */

export const SUBSCRIPTION_PLANS = {
  BASIC: {
    id: 'basic',
    name: 'Basic',
    price: 0,
    currency: 'ZAR',
    interval: 'forever',
    description: 'Essential features for casual users',
    features: [
      '5 posts per day',
      '5 statuses per day',
      '2 events per month',
      'Unlimited comments & replies',
      '5 basic accent themes',
      { text: '5 AI cartoon avatars (lifetime)', badge: 'NEW', badgeColor: '#FF9500' },
      'Free AI features',
      'Standard support (48h)',
      'Ads + watermark on uploads until you upgrade',
    ],
    limits: {
      postsPerDay: 5,
      statusesPerDay: 5,
      customThemes: false,
      premiumThemes: false,
      goldThemes: false,
      customTypography: false,
      dreamyScroll: false,
      aiFeatures: false,
      threadSummarization: false,
      commentSuggestions: false,
      translation: false,
      titleGeneration: false,
      semanticSearch: false,
      qualityScoring: false,
      premiumBadge: false,
      goldBadge: false,
      prioritySupport: false,
      marketListingsActive: 3,
      marketListingDuration: 14, // days
      marketListingImages: 3,
      avatarChoices: 10,
      profileAnalytics: false,
      cartoonAvatarsMonthly: 0,
      cartoonAvatarsLifetime: 5,
      customCartoonPrompts: false,
      artworkDownloadsPerDay: 3,
      eventsPerMonth: 2,
      // AI Feature Daily Limits (Basic - Very Limited)
      aiSummarizationsPerDay: 0, // No AI summaries for Basic
      aiPostImprovementsPerDay: 0, // No AI improvements for Basic
      aiTitleGenerationsPerDay: 0, // No AI title generation for Basic
    },
  },
  GO: {
    id: 'premium', // Internal ID remains 'premium' for backwards compatibility
    name: 'Go',
    price: 79.99,
    currency: 'ZAR',
    interval: 'month',
    yearlyPrice: 799,
    yearlySavings: 'save 17% (2 months free)',
    popular: false,
    description: 'Perfect for active community members',
    features: [
      'Unlimited posts & statuses',
      '5 events per month',
      '15+ premium gradient themes',
      'Custom typography controls',
      { text: '10 AI cartoon avatars/month', badge: 'NEW', badgeColor: '#FF9500' },
      { text: '8 cartoon styles (Pixar, Anime, etc.)', badge: 'NEW', badgeColor: '#FF9500' },
      'AI thread summaries',
      'Smart comment suggestions',
      'Translation (11 languages)',
      'Premium badge',
      'Ad-free experience',
      'Priority support (12h)',
      'Monthly marketplace boost credit',
    ],
    limits: {
      postsPerDay: -1, // unlimited
      statusesPerDay: -1,
      customThemes: true,
      premiumThemes: true,
      goldThemes: false,
      customTypography: true,
      dreamyScroll: true,
      aiFeatures: true,
      threadSummarization: true,
      commentSuggestions: true,
      translation: true,
      titleGeneration: true,
      semanticSearch: true,
      qualityScoring: true,
      premiumBadge: true,
      goldBadge: false,
      prioritySupport: true,
      marketListingsActive: -1, // unlimited
      marketListingDuration: 30,
      marketListingImages: 5,
      avatarChoices: 50,
      profileAnalytics: true,
      cartoonAvatarsMonthly: 10,
      cartoonAvatarsLifetime: null,
      customCartoonPrompts: false,
      artworkDownloadsPerDay: 20,
      eventsPerMonth: 5,
      // AI Feature Daily Limits (Premium - Good limits)
      aiSummarizationsPerDay: 15, // 15 summaries per day
      aiPostImprovementsPerDay: 10, // 10 post improvements per day
      aiTitleGenerationsPerDay: 20, // 20 title generations per day
    },
    savings: null,
  },
  PREMIUM: {
    id: 'gold', // Internal ID remains 'gold' for backwards compatibility
    name: 'Premium',
    price: 149.99,
    currency: 'ZAR',
    interval: 'month',
    yearlyPrice: 1499,
    yearlySavings: 'save 17% (2 months free)',
    description: 'GPT-4o powered AI + VIP experience',
    popular: true,
    features: [
      'Everything in Go',
      '15 events per month',
      { text: '✨ GPT-4o AI Post Composer', badge: 'NEW', badgeColor: '#5E5CE6' },
      { text: '🎨 Vision-Personalized Cartoons', badge: 'NEW', badgeColor: '#5E5CE6' },
      { text: '🖼️ Upload Custom Images for Generation', badge: 'NEW', badgeColor: '#FF9500' },
      { text: '🚀 Generate Anything (Beyond Cartoons)', badge: 'NEW', badgeColor: '#FF9500' },
      { text: '📝 GPT-4o Summaries (4 styles)', badge: 'NEW', badgeColor: '#5E5CE6' },
      { text: '💬 Smart Comment Suggestions', badge: 'NEW', badgeColor: '#5E5CE6' },
      { text: '🌍 Cultural Translation (11 SA languages)', badge: 'NEW', badgeColor: '#5E5CE6' },
      '20 Vision-enhanced generations/month (HD quality)',
      'Custom prompts - unlimited creativity',
      'Premium Crown badge',
      '5 exclusive Premium themes',
      'Advanced color controls',
      'Early access to features',
      'Market listing priority',
      'Profile analytics dashboard',
      'Priority email support (24h)',
    ],
    limits: {
      postsPerDay: -1,
      statusesPerDay: -1,
      customThemes: true,
      premiumThemes: true,
      goldThemes: true,
      customTypography: true,
      dreamyScroll: true,
      aiFeatures: true,
      threadSummarization: true,
      commentSuggestions: true,
      translation: true,
      titleGeneration: true,
      semanticSearch: true,
      qualityScoring: true,
      premiumBadge: false, // Gold has its own badge
      goldBadge: true,
      prioritySupport: true,
      earlyAccess: true,
      marketListingsActive: -1,
      marketListingDuration: 60,
      marketListingImages: 10,
      avatarChoices: 50,
      profileAnalytics: true,
      verifiedCheckmark: true,
      advancedColorControls: true,
      cartoonAvatarsMonthly: 20,
      cartoonAvatarsLifetime: null,
      customCartoonPrompts: true, // GOLD EXCLUSIVE
      customImageUpload: true, // GOLD EXCLUSIVE - Upload custom images for generation
      unlimitedGeneration: true, // GOLD EXCLUSIVE - Generate anything (not limited to cartoons)
      // GPT-4o Features (Gold Exclusive)
      gpt4oComposer: true, // AI Post Composer with GPT-4o
      gpt4oSummarization: true, // 4 summary styles
      gpt4oVisionCartoons: true, // Vision-personalized cartoons
      gpt4oCommentSuggestions: true, // Enhanced comment suggestions
      gpt4oCulturalTranslation: true, // 11 SA languages with cultural context
      artworkDownloadsPerDay: -1, // GOLD EXCLUSIVE - Unlimited downloads
      eventsPerMonth: 15,
      // AI Feature Daily Limits (Gold - Generous limits)
      aiSummarizationsPerDay: 50, // 50 summaries per day with GPT-4o
      aiPostImprovementsPerDay: 30, // 30 post improvements per day with GPT-4o
      aiTitleGenerationsPerDay: 50, // 50 title generations per day
    },
  },
  GOLD: {
    id: 'ultimate',
    name: 'Gold',
    price: 249.99,
    currency: 'ZAR',
    interval: 'month',
    yearlyPrice: 2499,
    yearlySavings: 'save 17% (2 months free)',
    description: 'Ultimate power user experience with 3x limits',
    popular: false,
    features: [
      'Everything in Premium',
      'Unlimited events',
      { text: '🚀 3x All AI Limits', badge: 'ULTIMATE', badgeColor: '#FFD700' },
      { text: '⚡ 60 Vision Cartoons/month', badge: 'ULTIMATE', badgeColor: '#FFD700' },
      { text: '🎯 150 GPT-4o Summaries/day', badge: 'ULTIMATE', badgeColor: '#FFD700' },
      { text: '✍️ 90 Post Improvements/day', badge: 'ULTIMATE', badgeColor: '#FFD700' },
      { text: '📊 Advanced Analytics Dashboard', badge: 'NEW', badgeColor: '#5E5CE6' },
      { text: '💎 Exclusive Gold Crown Badge', badge: 'VIP', badgeColor: '#FFD700' },
      { text: '🎨 Unlimited Custom Themes', badge: 'ULTIMATE', badgeColor: '#FFD700' },
      '100 avatar choices (vs 50 in Premium)',
      '90-day market listing duration',
      '20 images per market listing',
      'Priority marketplace positioning',
      'Early beta feature access',
      'Email support (faster priority)',
    ],
    limits: {
      postsPerDay: -1,
      statusesPerDay: -1,
      customThemes: true,
      premiumThemes: true,
      goldThemes: true,
      ultimateThemes: true,
      customTypography: true,
      dreamyScroll: true,
      aiFeatures: true,
      threadSummarization: true,
      commentSuggestions: true,
      translation: true,
      titleGeneration: true,
      semanticSearch: true,
      qualityScoring: true,
      premiumBadge: false,
      goldBadge: false,
      ultimateBadge: true,
      prioritySupport: true,
      earlyAccess: true,
      marketListingsActive: -1,
      marketListingDuration: 90,
      marketListingImages: 20,
      avatarChoices: 100,
      profileAnalytics: true,
      advancedAnalytics: true,
      verifiedCheckmark: true,
      advancedColorControls: true,
      cartoonAvatarsMonthly: 60, // 3x Premium's 20
      cartoonAvatarsLifetime: null,
      customCartoonPrompts: true,
      customImageUpload: true,
      unlimitedGeneration: true,
      apiAccess: true, // ULTIMATE EXCLUSIVE
      whiteLabel: true, // ULTIMATE EXCLUSIVE
      customBranding: true, // ULTIMATE EXCLUSIVE
      dedicatedManager: true, // ULTIMATE EXCLUSIVE
      // GPT-4o Features
      gpt4oComposer: true,
      gpt4oSummarization: true,
      gpt4oVisionCartoons: true,
      gpt4oCommentSuggestions: true,
      gpt4oCulturalTranslation: true,
      artworkDownloadsPerDay: -1,
      eventsPerMonth: -1, // Unlimited events
      // AI Feature Daily Limits (Ultimate - 3x Premium limits)
      aiSummarizationsPerDay: 150, // 3x Premium's 50
      aiPostImprovementsPerDay: 90, // 3x Premium's 30
      aiTitleGenerationsPerDay: 150, // 3x Premium's 50
    },
  },
};

/**
 * Get plan by ID
 */
export function getPlanById(planId) {
  return Object.values(SUBSCRIPTION_PLANS).find(plan => plan.id === planId);
}

/**
 * Get user's current plan limits
 */
export function getPlanLimits(planId) {
  const plan = getPlanById(planId);
  return plan?.limits || SUBSCRIPTION_PLANS.BASIC.limits;
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(planId, featureName) {
  const limits = getPlanLimits(planId);
  return Boolean(limits[featureName]);
}

/**
 * Check if user can perform action based on plan
 * @param {string} planId - User's subscription plan ID
 * @param {string} action - Action/feature to check access for
 * @param {boolean} isAdmin - Whether the user is an admin (bypasses all checks)
 * @returns {boolean} - True if user has access, false otherwise
 */
export function canUserPerformAction(planId, action, isAdmin = false) {
  // Admin users have access to all features for testing
  if (isAdmin) {
    return true;
  }

  const limits = getPlanLimits(planId);

  switch (action) {
    case 'post':
      return limits.postsPerDay === -1; // unlimited
    case 'status':
      return limits.statusesPerDay === -1;
    case 'customThemes':
      return limits.customThemes;
    case 'premiumThemes':
      return limits.premiumThemes;
    case 'goldThemes':
      return limits.goldThemes;
    case 'customTypography':
      return limits.customTypography;
    case 'dreamyScroll':
      return limits.dreamyScroll;
    case 'aiFeatures':
      return limits.aiFeatures;
    case 'threadSummarization':
      return limits.threadSummarization;
    case 'commentSuggestions':
      return limits.commentSuggestions;
    case 'translation':
      return limits.translation;
    case 'advancedColorControls':
      return limits.advancedColorControls;
    default:
      return false;
  }
}

/**
 * Get required plan for a feature
 * Returns 'basic', 'premium', 'gold', or 'ultimate'
 */
export function getRequiredPlan(featureName) {
  // Ultimate-exclusive features (new Gold tier)
  const ultimateFeatures = ['ultimateBadge', 'ultimateThemes', 'apiAccess', 'whiteLabel', 'customBranding', 'dedicatedManager', 'advancedAnalytics'];
  if (ultimateFeatures.includes(featureName)) {
    return 'ultimate';
  }

  // Gold-exclusive features (now Premium tier)
  const goldFeatures = ['goldThemes', 'goldBadge', 'earlyAccess', 'verifiedCheckmark', 'advancedColorControls', 'customCartoonPrompts'];
  if (goldFeatures.includes(featureName)) {
    return 'gold';
  }

  // Premium features (now Go tier)
  const premiumFeatures = [
    'premiumThemes',
    'customTypography',
    'dreamyScroll',
    'threadSummarization',
    'commentSuggestions',
    'translation',
    'titleGeneration',
    'semanticSearch',
    'qualityScoring',
    'premiumBadge',
  ];
  if (premiumFeatures.includes(featureName)) {
    return 'premium';
  }

  // Basic features
  return 'basic';
}

/**
 * Get plan display info
 */
export function getPlanInfo(planId) {
  const plan = getPlanById(planId);
  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    formattedPrice: formatPrice(plan),
    badge: plan.id === 'ultimate' ? '💎' : plan.id === 'gold' ? '👑' : plan.id === 'premium' ? '⭐' : null,
  };
}

/**
 * Format price for display
 */
export function formatPrice(plan) {
  if (plan.price === 0) {
    return 'Free';
  }
  return `R${plan.price.toFixed(2)}/${plan.interval}`;
}
