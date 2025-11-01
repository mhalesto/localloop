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
      'Comment on any post',
      'Basic themes',
      'Community access',
      'Standard support',
    ],
    limits: {
      postsPerDay: 5,
      customThemes: false,
      aiFeatures: false,
      premiumBadge: false,
      prioritySupport: false,
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
      'Unlimited posts',
      'Exclusive themes',
      'AI-powered features',
      'Premium badge',
      'Priority support',
      'Ad-free experience',
    ],
    limits: {
      postsPerDay: -1, // unlimited
      customThemes: true,
      aiFeatures: true,
      premiumBadge: true,
      prioritySupport: true,
    },
    savings: null,
  },
  GOLD: {
    id: 'gold',
    name: 'Gold',
    price: 499.99,
    currency: 'ZAR',
    interval: 'year',
    description: 'Best value for power users',
    features: [
      'Everything in Premium',
      'Early access to features',
      'Exclusive Gold badge',
      'Custom profile themes',
      'VIP support',
      '2 months free',
    ],
    limits: {
      postsPerDay: -1, // unlimited
      customThemes: true,
      aiFeatures: true,
      premiumBadge: true,
      prioritySupport: true,
      earlyAccess: true,
      goldBadge: true,
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
 * Check if user can perform action based on plan
 */
export function canUserPerformAction(planId, action) {
  const limits = getPlanLimits(planId);

  switch (action) {
    case 'post':
      return limits.postsPerDay === -1; // unlimited
    case 'customThemes':
      return limits.customThemes;
    case 'aiFeatures':
      return limits.aiFeatures;
    default:
      return false;
  }
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
