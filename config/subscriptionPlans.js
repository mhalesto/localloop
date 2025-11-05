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
      'Unlimited comments & replies',
      '5 basic accent themes',
      'Free AI features',
      'Standard support (48h)',
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
    },
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 49.99,
    currency: 'ZAR',
    interval: 'month',
    popular: true,
    description: 'Perfect for active community members',
    features: [
      'Unlimited posts & statuses',
      '15+ premium gradient themes',
      'Custom typography controls',
      'AI thread summaries',
      'Smart comment suggestions',
      'Translation (11 languages)',
      'Premium badge',
      'Ad-free experience',
      'Priority support (12h)',
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
    },
    savings: null,
  },
  GOLD: {
    id: 'gold',
    name: 'Gold',
    price: 499.99,
    currency: 'ZAR',
    interval: 'year',
    description: 'Ultimate VIP experience',
    features: [
      'Everything in Premium',
      'Gold Crown badge',
      '5 exclusive Gold themes',
      'Advanced color controls',
      'Early access to features',
      'Market listing priority',
      'Profile analytics dashboard',
      'VIP support (2h)',
      'Save 2 months',
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
    },
    savings: 'Save R100/year',
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
 */
export function canUserPerformAction(planId, action) {
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
  const goldFeatures = ['goldThemes', 'goldBadge', 'earlyAccess', 'verifiedCheckmark', 'advancedColorControls'];
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
