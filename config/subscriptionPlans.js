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
    },
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 49.99,
    currency: 'ZAR',
    interval: 'month',
    yearlyPrice: 499,
    yearlySavings: 'save almost 20%',
    popular: true,
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
    },
    savings: null,
  },
  GOLD: {
    id: 'gold',
    name: 'Gold',
    price: 149.99,
    currency: 'ZAR',
    interval: 'month',
    yearlyPrice: 1499,
    yearlySavings: 'save 20% (2 months)',
    description: 'GPT-4o powered AI + VIP experience',
    popular: true,
    features: [
      'Everything in Premium',
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
      'Gold Crown badge',
      '5 exclusive Gold themes',
      'Advanced color controls',
      'Early access to features',
      'Market listing priority',
      'Profile analytics dashboard',
      'VIP support (2h)',
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
 * Returns 'basic', 'premium', or 'gold'
 */
export function getRequiredPlan(featureName) {
  // Gold-exclusive features
  const goldFeatures = ['goldThemes', 'goldBadge', 'earlyAccess', 'verifiedCheckmark', 'advancedColorControls', 'customCartoonPrompts'];
  if (goldFeatures.includes(featureName)) {
    return 'gold';
  }

  // Premium features
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
    badge: plan.id === 'gold' ? '👑' : plan.id === 'premium' ? '⭐' : null,
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
